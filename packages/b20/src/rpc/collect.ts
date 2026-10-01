import { B20_REPLAY_PROFILE } from "../replay-protocol.js";
import { b20CandidateAddresses } from "../replay-decode.js";
import { deriveB20ReplayReport, parseB20ReplayReport, validateReplayOptions } from "../replay.js";
import {
  B20_REPLAY_LIMITS,
  boundedArray,
  parseB20ReplayInput,
  parseReceipt,
  parseTransaction,
} from "../replay-validate.js";
import { parseRpcQuantity } from "../report.js";
import type { B20ReplayCapture, B20ReplayOptions, B20TransactionCapture } from "../replay-types.js";
import type { B20InspectionCapture, BlockReference } from "../types.js";
import { canonicalJson, hex, timestamp } from "../validation.js";
import { B20RpcError, type B20Transport, type B20RpcMethod } from "./transport.js";
import { inspectB20Token } from "./inspect.js";

const quantity = (value: unknown) => BigInt(parseRpcQuantity(value)).toString();
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new B20RpcError("invalid-response");
  return value as Record<string, unknown>;
}
function header(value: unknown): BlockReference {
  const block = record(value);
  return {
    number: quantity(block.number),
    hash: hex(block.hash, 32, "block hash"),
    timestamp: quantity(block.timestamp),
    statePosition: "end-of-block",
  };
}
function transaction(value: unknown) {
  const tx = record(value);
  return parseTransaction({
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    input: tx.input,
    blockHash: tx.blockHash,
    blockNumber: tx.blockNumber === null ? null : quantity(tx.blockNumber),
    transactionIndex: tx.transactionIndex === null ? null : quantity(tx.transactionIndex),
  });
}
function receipt(value: unknown) {
  const result = record(value);
  if (result.status !== "0x0" && result.status !== "0x1") throw new B20RpcError("invalid-response");
  return parseReceipt({
    transactionHash: result.transactionHash,
    transactionIndex: quantity(result.transactionIndex),
    blockHash: result.blockHash,
    blockNumber: quantity(result.blockNumber),
    status: result.status === "0x1" ? "success" : "reverted",
    logs: boundedArray(result.logs, B20_REPLAY_LIMITS.logsPerTransaction, "receipt logs").map(
      (value) => {
        const log = record(value);
        return {
          address: log.address,
          topics: log.topics,
          data: log.data,
          logIndex: quantity(log.logIndex),
          removed: log.removed,
          transactionHash: log.transactionHash,
          transactionIndex: quantity(log.transactionIndex),
          blockHash: log.blockHash,
          blockNumber: quantity(log.blockNumber),
        };
      },
    ),
  });
}
async function request(transport: B20Transport, method: B20RpcMethod, params: readonly unknown[]) {
  try {
    return await transport.request(method, params);
  } catch (error) {
    throw error instanceof B20RpcError ? error : new B20RpcError("transport-error");
  }
}

/** Sequential, bounded acquisition. Cache token reads only within the same chain and block hash. */
async function collect(
  value: unknown,
  transport: B20Transport,
  original?: B20ReplayCapture,
): Promise<B20ReplayCapture> {
  const input = parseB20ReplayInput(value);
  const capturedAt = timestamp(new Date().toISOString());
  const chainResponse = parseRpcQuantity(await request(transport, "eth_chainId", []));
  if (BigInt(chainResponse) !== BigInt(input.chainId))
    throw new Error("B20_CHAIN_MISMATCH: configured endpoint differs from replay chain");
  const tokens = new Map<string, B20InspectionCapture>();
  const transactions: B20TransactionCapture[] = [];
  for (const hash of new Set(input.transactions.map((tx) => tx.hash))) {
    const row: B20TransactionCapture = {
      hash,
      transaction: null,
      receipt: null,
      block: null,
      blockAfter: null,
      tokens: [],
      error: null,
    };
    try {
      const value = await request(transport, "eth_getTransactionByHash", [hash]);
      if (value === null) throw new B20RpcError("invalid-response");
      row.transaction = transaction(value);
      if (row.transaction.hash !== hash) throw new B20RpcError("invalid-response");
      const previous = original?.transactions.find((tx) => tx.hash === hash);
      if (
        previous?.block &&
        (row.transaction.blockHash !== previous.block.hash ||
          row.transaction.blockNumber !== previous.block.number)
      ) {
        row.block = previous.block;
        row.blockAfter = header(
          await request(transport, "eth_getBlockByNumber", [
            `0x${BigInt(previous.block.number).toString(16)}`,
            false,
          ]),
        );
        transactions.push(row);
        continue;
      }
      if (row.transaction.blockHash === null) {
        row.error = "B20_PENDING";
        transactions.push(row);
        continue;
      }
      const receiptValue = await request(transport, "eth_getTransactionReceipt", [hash]);
      if (receiptValue === null) throw new B20RpcError("invalid-response");
      row.receipt = receipt(receiptValue);
      const number = `0x${BigInt(row.transaction.blockNumber!).toString(16)}`;
      row.block = header(await request(transport, "eth_getBlockByNumber", [number, false]));
      const candidates = b20CandidateAddresses(row, input.chainId);
      if (candidates.length > B20_REPLAY_LIMITS.candidatesPerTransaction) {
        row.error = "B20_LIMIT_EXCEEDED";
        transactions.push(row);
        continue;
      }
      for (const address of candidates) {
        const key = `${input.chainId}:${row.block.hash}:${address}`;
        let evidence = tokens.get(key);
        if (!evidence) {
          evidence = (
            await inspectB20Token(
              { address, chainId: input.chainId, block: row.transaction.blockNumber! },
              transport,
            )
          ).evidence;
          tokens.set(key, evidence);
        }
        row.tokens.push(evidence);
      }
      row.blockAfter = header(await request(transport, "eth_getBlockByNumber", [number, false]));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("B20_CHAIN_MISMATCH")) throw error;
      row.error =
        error instanceof Error && error.message.startsWith("B20_INPUT_LIMIT")
          ? "B20_LIMIT_EXCEEDED"
          : "B20_RPC_UNAVAILABLE";
    }
    transactions.push(row);
  }
  return {
    kind: "bao.b20-replay-capture",
    schemaVersion: 1,
    input,
    protocolProfileId: B20_REPLAY_PROFILE.id,
    protocolSourceDigest: B20_REPLAY_PROFILE.sourceDigest,
    acquisition: "rpc",
    capturedAt,
    chainResponse,
    transactions,
  };
}

export async function collectB20TransactionEvidence(
  value: unknown,
  transport: B20Transport,
): Promise<B20ReplayCapture> {
  return collect(value, transport);
}

export async function replayB20Transactions(
  input: unknown,
  transport: B20Transport,
  options: B20ReplayOptions = {},
) {
  // Validate policy before acquiring data; an invalid strict request must not start RPC work.
  validateReplayOptions(options);
  const capture = await collectB20TransactionEvidence(input, transport);
  // The caller cannot supply a capture or an acquisition boolean to this RPC orchestrator.
  return deriveB20ReplayReport(capture, options, true);
}

export async function recheckB20ReplayReport(value: unknown, transport: B20Transport) {
  const source = parseB20ReplayReport(value);
  const current = deriveB20ReplayReport(
    await collect(source.evidence.input, transport, source.evidence),
    { expectedCode: source.expectedCode ?? undefined, policy: source.policy.name },
    true,
  );
  const comparable = (capture: B20ReplayCapture) =>
    capture.transactions.map((row) => ({
      ...row,
      tokens: row.tokens.map(
        ({
          capturedAt: _capturedAt,
          acquisition: _acquisition,
          requestedBlock: _requestedBlock,
          ...token
        }) => token,
      ),
    }));
  const matches =
    canonicalJson(comparable(source.evidence)) === canonicalJson(comparable(current.evidence));
  const status =
    current.consistency === "conflicting"
      ? "conflict"
      : current.runStatus !== "complete"
        ? "inconclusive"
        : !matches
          ? "conflict"
          : source.evidence.acquisition === "synthetic"
            ? "synthetic-source"
            : "matched";
  return {
    kind: "bao.b20-validation" as const,
    schemaVersion: 1 as const,
    mode: "rpc-recheck" as const,
    status,
    valid: status === "matched",
    sourceEvidenceDigest: source.evidenceDigest,
    sourceAcquisition: source.evidence.acquisition,
    currentObservation: current,
    readiness: "not-tested" as const,
    message:
      "Reacquired transaction evidence must match the original block identities. Synthetic source evidence remains synthetic.",
  };
}
