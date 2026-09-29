import { parseB20InspectionCapture, parseBlockReference, parseRpcQuantity } from "./report.js";
import { B20_REPLAY_PROFILE } from "./replay-protocol.js";
import type {
  B20LogEvidence,
  B20ReceiptEvidence,
  B20ReplayCapture,
  B20ReplayInput,
  B20Selection,
  B20TransactionCapture,
  B20TransactionEvidence,
} from "./replay-types.js";
import {
  canonicalJson,
  chain,
  decimal,
  hex,
  object,
  oneOf,
  timestamp,
  type Hex,
} from "./validation.js";

export const B20_REPLAY_LIMITS = {
  transactions: 100,
  candidatesPerTransaction: 32,
  logsPerTransaction: 200,
  calldataBytes: 128 * 1024,
  artifactBytes: 4 * 1024 * 1024,
} as const;

export function boundedArray(value: unknown, maximum: number, name: string): unknown[] {
  if (!Array.isArray(value) || value.length > maximum)
    throw new Error(`B20_INPUT_LIMIT: invalid ${name} array`);
  return value;
}
export function replayHex(value: unknown): Hex {
  if (
    typeof value !== "string" ||
    value.length > B20_REPLAY_LIMITS.calldataBytes * 2 + 2 ||
    !/^0x(?:[a-fA-F0-9]{2})*$/.test(value)
  )
    throw new Error("B20_INVALID_INPUT: invalid or oversized calldata/log data");
  return value.toLowerCase() as Hex;
}
export function parseSelection(value: unknown): B20Selection {
  const selection = object(value, ["mode", "description", "completeness"], "selection");
  if (
    typeof selection.description !== "string" ||
    selection.description.length < 1 ||
    selection.description.length > 500 ||
    [...selection.description].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    throw new Error(
      "B20_INVALID_INPUT: selection description must contain 1–500 printable characters",
    );
  return {
    mode: oneOf(
      selection.mode,
      ["explicit-hashes", "application-export", "builder-code-filtered", "sample"],
      "selection mode",
    ),
    description: selection.description,
    completeness: oneOf(selection.completeness, ["unknown", "producer-declared"], "completeness"),
  };
}
export function parseB20ReplayInput(value: unknown): B20ReplayInput {
  const input = object(
    value,
    ["kind", "schemaVersion", "chainId", "selection", "transactions"],
    "replay input",
  );
  if (input.kind !== "bao.b20-input" || input.schemaVersion !== 1)
    throw new Error("B20_INVALID_INPUT: unsupported replay input schema");
  const transactions = boundedArray(
    input.transactions,
    B20_REPLAY_LIMITS.transactions,
    "transactions",
  ).map((entry) => ({
    hash: hex(object(entry, ["hash"], "transaction input").hash, 32, "transaction hash"),
  }));
  if (!transactions.length) throw new Error("B20_INVALID_INPUT: supply at least one transaction");
  transactions.sort((a, b) => a.hash.localeCompare(b.hash));
  return {
    kind: "bao.b20-input",
    schemaVersion: 1,
    chainId: chain(input.chainId),
    selection: parseSelection(input.selection),
    transactions,
  };
}
export function parseTransaction(value: unknown): B20TransactionEvidence {
  const tx = object(
    value,
    ["hash", "from", "to", "input", "blockHash", "blockNumber", "transactionIndex"],
    "transaction",
  );
  const pending = tx.blockHash === null;
  if (pending !== (tx.blockNumber === null) || pending !== (tx.transactionIndex === null))
    throw new Error("B20_EVIDENCE_MISMATCH: mixed pending/mined transaction context");
  return {
    hash: hex(tx.hash, 32, "transaction hash"),
    from: hex(tx.from, 20, "sender"),
    to: tx.to === null ? null : hex(tx.to, 20, "destination"),
    input: replayHex(tx.input),
    blockHash: pending ? null : hex(tx.blockHash, 32, "block hash"),
    blockNumber: pending ? null : decimal(tx.blockNumber, "block number"),
    transactionIndex: pending ? null : decimal(tx.transactionIndex, "transaction index"),
  };
}
export function parseLog(value: unknown): B20LogEvidence {
  const log = object(
    value,
    [
      "address",
      "topics",
      "data",
      "logIndex",
      "removed",
      "transactionHash",
      "transactionIndex",
      "blockHash",
      "blockNumber",
    ],
    "log",
  );
  if (typeof log.removed !== "boolean")
    throw new Error("B20_INVALID_INPUT: removed must be boolean");
  return {
    address: hex(log.address, 20, "emitter"),
    topics: boundedArray(log.topics, 4, "topics").map((topic) => hex(topic, 32, "topic")),
    data: replayHex(log.data),
    logIndex: decimal(log.logIndex, "log index"),
    removed: log.removed,
    transactionHash: hex(log.transactionHash, 32, "log transaction hash"),
    transactionIndex: decimal(log.transactionIndex, "log transaction index"),
    blockHash: hex(log.blockHash, 32, "log block hash"),
    blockNumber: decimal(log.blockNumber, "log block number"),
  };
}
export function parseReceipt(value: unknown): B20ReceiptEvidence {
  const receipt = object(
    value,
    ["transactionHash", "transactionIndex", "blockHash", "blockNumber", "status", "logs"],
    "receipt",
  );
  const byIndex = new Map<string, B20LogEvidence>();
  for (const item of boundedArray(receipt.logs, B20_REPLAY_LIMITS.logsPerTransaction, "logs")) {
    const log = parseLog(item);
    if (
      byIndex.has(log.logIndex) &&
      canonicalJson(byIndex.get(log.logIndex)) !== canonicalJson(log)
    )
      throw new Error("B20_EVIDENCE_MISMATCH: conflicting duplicate log");
    byIndex.set(log.logIndex, log);
  }
  return {
    transactionHash: hex(receipt.transactionHash, 32, "receipt hash"),
    transactionIndex: decimal(receipt.transactionIndex, "receipt index"),
    blockHash: hex(receipt.blockHash, 32, "receipt block hash"),
    blockNumber: decimal(receipt.blockNumber, "receipt block number"),
    status: oneOf(receipt.status, ["success", "reverted"], "receipt status"),
    logs: [...byIndex.values()].sort((a, b) => (BigInt(a.logIndex) < BigInt(b.logIndex) ? -1 : 1)),
  };
}
export function parseTransactionCapture(value: unknown): B20TransactionCapture {
  const capture = object(
    value,
    ["hash", "transaction", "receipt", "block", "blockAfter", "tokens", "error"],
    "transaction capture",
  );
  const tokens = boundedArray(
    capture.tokens,
    B20_REPLAY_LIMITS.candidatesPerTransaction,
    "tokens",
  ).map(parseB20InspectionCapture);
  const unique = new Map<string, (typeof tokens)[number]>();
  for (const token of tokens) {
    if (
      unique.has(token.address) &&
      canonicalJson(unique.get(token.address)) !== canonicalJson(token)
    )
      throw new Error("B20_EVIDENCE_MISMATCH: conflicting token reads");
    unique.set(token.address, token);
  }
  return {
    hash: hex(capture.hash, 32, "capture hash"),
    transaction: capture.transaction === null ? null : parseTransaction(capture.transaction),
    receipt: capture.receipt === null ? null : parseReceipt(capture.receipt),
    block: capture.block === null ? null : parseBlockReference(capture.block),
    blockAfter: capture.blockAfter === null ? null : parseBlockReference(capture.blockAfter),
    tokens: [...unique.values()].sort((a, b) => a.address.localeCompare(b.address)),
    error:
      capture.error === null
        ? null
        : oneOf(
            capture.error,
            ["B20_RPC_UNAVAILABLE", "B20_LIMIT_EXCEEDED", "B20_PENDING"] as const,
            "capture error",
          ),
  };
}
export function parseB20ReplayCapture(value: unknown): B20ReplayCapture {
  const capture = object(
    value,
    [
      "kind",
      "schemaVersion",
      "input",
      "protocolProfileId",
      "protocolSourceDigest",
      "acquisition",
      "capturedAt",
      "chainResponse",
      "transactions",
    ],
    "replay capture",
  );
  if (
    capture.kind !== "bao.b20-replay-capture" ||
    capture.schemaVersion !== 1 ||
    capture.protocolProfileId !== B20_REPLAY_PROFILE.id ||
    capture.protocolSourceDigest !== B20_REPLAY_PROFILE.sourceDigest
  )
    throw new Error("B20_INVALID_INPUT: unsupported replay capture/profile");
  const input = parseB20ReplayInput(capture.input);
  const chainResponse = parseRpcQuantity(capture.chainResponse);
  if (BigInt(chainResponse) !== BigInt(input.chainId))
    throw new Error("B20_CHAIN_MISMATCH: replay endpoint chain differs");
  const acquisition = oneOf(capture.acquisition, ["rpc", "synthetic", "imported"], "acquisition");
  const transactions = new Map<string, B20TransactionCapture>();
  for (const item of boundedArray(
    capture.transactions,
    B20_REPLAY_LIMITS.transactions,
    "captures",
  )) {
    const tx = parseTransactionCapture(item);
    for (const token of tx.tokens) {
      if (token.chainId !== input.chainId || token.acquisition !== acquisition)
        throw new Error("B20_EVIDENCE_MISMATCH: token provenance/chain differs");
    }
    if (transactions.has(tx.hash) && canonicalJson(transactions.get(tx.hash)) !== canonicalJson(tx))
      throw new Error("B20_EVIDENCE_MISMATCH: conflicting duplicate transaction");
    transactions.set(tx.hash, tx);
  }
  const hashes = new Set(input.transactions.map((tx) => tx.hash));
  if (hashes.size !== transactions.size || [...hashes].some((hash) => !transactions.has(hash)))
    throw new Error(
      "B20_EVIDENCE_MISMATCH: preserve every supplied hash, including unavailable rows",
    );
  const headers = new Map<string, string>();
  const reads = new Map<string, string>();
  for (const row of transactions.values()) {
    if (row.block) {
      const existing = headers.get(row.block.number);
      if (existing && existing !== canonicalJson(row.block))
        throw new Error("B20_EVIDENCE_MISMATCH: conflicting headers for the same height");
      headers.set(row.block.number, canonicalJson(row.block));
    }
    for (const token of row.tokens) {
      const key = `${token.block.hash}:${token.address}`;
      const observation = canonicalJson({
        block: token.block,
        blockAfter: token.blockAfter,
        initialization: token.initialization,
      });
      if (reads.has(key) && reads.get(key) !== observation)
        throw new Error("B20_EVIDENCE_MISMATCH: conflicting reads for the same token and block");
      reads.set(key, observation);
    }
  }
  const result: B20ReplayCapture = {
    kind: "bao.b20-replay-capture",
    schemaVersion: 1,
    input,
    protocolProfileId: B20_REPLAY_PROFILE.id,
    protocolSourceDigest: B20_REPLAY_PROFILE.sourceDigest,
    acquisition,
    capturedAt: timestamp(capture.capturedAt),
    chainResponse,
    transactions: [...transactions.values()].sort((a, b) => a.hash.localeCompare(b.hash)),
  };
  if (
    new globalThis.TextEncoder().encode(canonicalJson(result)).length >
    B20_REPLAY_LIMITS.artifactBytes
  )
    throw new Error("B20_INPUT_LIMIT: replay capture exceeds 4 MiB");
  return result;
}
