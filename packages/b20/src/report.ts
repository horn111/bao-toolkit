import { keccak256, toBytes } from "viem/utils";
import { B20_PROFILE, classifyB20Address, initializationCalldata } from "./protocol.js";
import type {
  B20InspectionCapture,
  B20InspectionReport,
  BlockReference,
  InitializationEvidence,
  ReadResult,
  TokenClassification,
} from "./types.js";
import { canonicalJson, chain, decimal, hex, object, oneOf, timestamp } from "./validation.js";

export const MAX_B20_ARTIFACT_BYTES = 64 * 1024;

export function parseBlockSelection(value: unknown): string {
  if (value === "latest" || value === "safe" || value === "finalized") return value;
  return decimal(value, "block (decimal number, latest, safe, or finalized)");
}

export function parseBlockReference(value: unknown): BlockReference {
  const block = object(value, ["number", "hash", "timestamp", "statePosition"], "block");
  return {
    number: decimal(block.number, "block number"),
    hash: hex(block.hash, 32, "block hash"),
    timestamp: decimal(block.timestamp, "block timestamp"),
    statePosition: oneOf(block.statePosition, ["end-of-block"], "state position"),
  };
}

function parseRead(value: unknown): ReadResult {
  const read = object(value, ["status", "data", "reason", "rpcCode"], "initialization result");
  if (read.status === "returned") {
    object(read, ["status", "data"], "returned result");
    return { status: "returned", data: hex(read.data, undefined, "return data") };
  }
  object(read, ["status", "reason", "rpcCode"], "failed result");
  oneOf(read.status, ["failed"], "read status");
  if (
    read.rpcCode !== null &&
    (typeof read.rpcCode !== "number" || !Number.isSafeInteger(read.rpcCode))
  ) {
    throw new Error("B20_INVALID_INPUT: invalid RPC error code");
  }
  return {
    status: "failed",
    reason: oneOf(
      read.reason,
      [
        "rpc-error",
        "unsupported-method",
        "unavailable-history",
        "invalid-response",
        "transport-error",
      ],
      "failure reason",
    ),
    rpcCode: read.rpcCode as number | null,
  };
}

export function parseB20InspectionCapture(value: unknown): B20InspectionCapture {
  const capture = object(
    value,
    [
      "kind",
      "schemaVersion",
      "chainId",
      "address",
      "protocolProfileId",
      "protocolSourceDigest",
      "acquisition",
      "capturedAt",
      "requestedBlock",
      "chainResponse",
      "block",
      "blockAfter",
      "initialization",
    ],
    "capture",
  );
  if (
    capture.kind !== "bao.b20-inspection-capture" ||
    capture.schemaVersion !== 1 ||
    capture.protocolProfileId !== B20_PROFILE.id ||
    capture.protocolSourceDigest !== B20_PROFILE.sourceDigest
  ) {
    throw new Error("B20_INVALID_INPUT: unsupported capture schema or protocol profile");
  }
  const chainId = chain(capture.chainId);
  const address = hex(capture.address, 20, "address");
  const block = parseBlockReference(capture.block);
  const blockAfter = parseBlockReference(capture.blockAfter);
  const requestedBlock = parseBlockSelection(capture.requestedBlock);
  const chainResponse = parseRpcQuantity(capture.chainResponse);
  if (BigInt(chainResponse) !== BigInt(chainId))
    throw new Error("B20_CHAIN_MISMATCH: endpoint chain differs from requested chain");
  if (/^\d/.test(requestedBlock) && requestedBlock !== block.number)
    throw new Error("B20_BLOCK_MISMATCH: requested block differs from evidence");
  if (blockAfter.number !== block.number)
    throw new Error("B20_BLOCK_MISMATCH: recheck must reference the original block number");
  let initialization: InitializationEvidence | null = null;
  if (capture.initialization !== null) {
    const item = object(
      capture.initialization,
      ["id", "method", "request", "result"],
      "initialization",
    );
    const request = object(item.request, ["to", "data", "block"], "call request");
    const stateBlock = object(request.block, ["blockHash", "requireCanonical"], "state block");
    const to = hex(request.to, 20, "factory address");
    const data = hex(request.data, undefined, "call data");
    const blockHash = hex(stateBlock.blockHash, 32, "state block hash");
    if (
      item.id !== "initialization" ||
      item.method !== "eth_call" ||
      to !== B20_PROFILE.factory ||
      data !== initializationCalldata(address) ||
      blockHash !== block.hash ||
      stateBlock.requireCanonical !== true ||
      classifyB20Address(address, chainId).classification !== "prefix-candidate"
    ) {
      throw new Error(
        "B20_EVIDENCE_MISMATCH: initialization request does not match token, profile, or block",
      );
    }
    initialization = {
      id: "initialization",
      method: "eth_call",
      request: { to, data, block: { blockHash, requireCanonical: true } },
      result: parseRead(item.result),
    };
  }
  return {
    kind: "bao.b20-inspection-capture",
    schemaVersion: 1,
    chainId,
    address,
    protocolProfileId: B20_PROFILE.id,
    protocolSourceDigest: B20_PROFILE.sourceDigest,
    acquisition: oneOf(capture.acquisition, ["rpc", "imported", "synthetic"], "acquisition"),
    capturedAt: timestamp(capture.capturedAt),
    requestedBlock,
    chainResponse,
    block,
    blockAfter,
    initialization,
  };
}

/** JSON-RPC quantities are not byte strings and may contain an odd number of nibbles. */
export function parseRpcQuantity(value: unknown): `0x${string}` {
  if (typeof value !== "string" || !/^0x(?:0|[1-9a-fA-F][a-fA-F0-9]{0,63})$/.test(value)) {
    throw new Error("B20_INVALID_RESPONSE: invalid RPC quantity");
  }
  return value.toLowerCase() as `0x${string}`;
}

export function createB20InspectionReport(
  value: unknown,
  generatedAt?: string,
): B20InspectionReport {
  const evidence = parseB20InspectionCapture(value);
  const candidate = classifyB20Address(evidence.address, evidence.chainId);
  let classification: TokenClassification = candidate.classification;
  const diagnostics: string[] = ["B20_RUNTIME_NOT_QUALIFIED"];
  const read = evidence.initialization?.result;
  if (read?.status === "returned") {
    if (/^0x0{63}[01]$/.test(read.data))
      classification = read.data.endsWith("1") ? "confirmed-initialized" : "not-initialized";
    else {
      classification = "unavailable";
      diagnostics.push("B20_INVALID_RETURN");
    }
  } else if (read?.status === "failed") {
    classification = read.reason === "unsupported-method" ? "unsupported" : "unavailable";
    diagnostics.push(`B20_${read.reason.replaceAll("-", "_").toUpperCase()}`);
  } else if (classification === "prefix-candidate")
    diagnostics.push("B20_INITIALIZATION_NOT_OBSERVED");
  if (candidate.classification === "unsupported")
    diagnostics.push("B20_UNSUPPORTED_CHAIN_OR_VARIANT");
  const conflicting = canonicalJson(evidence.block) !== canonicalJson(evidence.blockAfter);
  if (conflicting) {
    classification = "conflict";
    diagnostics.push("B20_BLOCK_CHANGED");
  }
  const partial = ["prefix-candidate", "unsupported", "unavailable", "conflict"].includes(
    classification,
  );
  return {
    kind: "bao.b20-report",
    schemaVersion: 1,
    mode: "inspect",
    producer: { name: "@base-attribution-os/b20", version: "0.1.0" },
    generatedAt: timestamp(generatedAt ?? evidence.capturedAt),
    chainId: evidence.chainId,
    protocolProfileId: B20_PROFILE.id,
    protocolSourceDigest: B20_PROFILE.sourceDigest,
    evidenceDigest: keccak256(toBytes(canonicalJson(evidence))),
    evidence,
    token: {
      address: candidate.address,
      variant: candidate.variant,
      classification,
      confirmation:
        classification === "confirmed-initialized" || classification === "not-initialized"
          ? "factory-query"
          : "none",
      evidenceIds: evidence.initialization ? ["initialization"] : [],
    },
    consistency: conflicting ? "conflicting" : "consistent",
    runStatus: partial ? "partial" : "complete",
    readiness: "not-tested",
    runtimeQualification: "not-qualified",
    policy: { name: "observe", decision: conflicting ? "fail" : "pass" },
    diagnostics,
    limitations: [
      "Classification describes supplied evidence under the pinned source profile. The profile has no qualified deployment or activation-height registry.",
      "State is end-of-block, not transaction-time state. Application readiness and attribution are not tested by inspection.",
      "Acquisition is the producer's claim. Offline validation does not independently confirm RPC data or chain consensus.",
      "The evidence digest detects content changes; it is not an authenticity signature.",
      "Only hash-pinned state queries are supported. No fallback to latest or number-pinned state.",
    ],
  };
}

export function parseB20Report(value: unknown): B20InspectionReport {
  const report = object(
    value,
    [
      "kind",
      "schemaVersion",
      "mode",
      "producer",
      "generatedAt",
      "chainId",
      "protocolProfileId",
      "protocolSourceDigest",
      "evidenceDigest",
      "evidence",
      "token",
      "consistency",
      "runStatus",
      "readiness",
      "runtimeQualification",
      "policy",
      "diagnostics",
      "limitations",
    ],
    "report",
  );
  const serialized = JSON.stringify(value);
  if (toBytes(serialized).length > MAX_B20_ARTIFACT_BYTES)
    throw new Error("B20_INPUT_LIMIT: report exceeds 64 KiB");
  const expected = createB20InspectionReport(report.evidence, timestamp(report.generatedAt));
  if (canonicalJson(expected) !== canonicalJson(value))
    throw new Error("B20_DERIVATION_MISMATCH: report differs from recomputed evidence");
  return expected;
}

export function validateB20ReportOffline(value: unknown) {
  const report = parseB20Report(value);
  return {
    kind: "bao.b20-validation" as const,
    schemaVersion: 1 as const,
    mode: "offline" as const,
    networkRecheck: "not-performed" as const,
    acquisition:
      report.evidence.acquisition === "synthetic" ? ("synthetic" as const) : ("imported" as const),
    producerAcquisitionClaim: report.evidence.acquisition,
    evidenceDigest: report.evidenceDigest,
    consistency: report.consistency,
    valid: report.consistency === "consistent",
    readiness: "not-tested" as const,
    message:
      report.consistency === "consistent"
        ? "Internally consistent; network recheck not performed."
        : "Artifact records conflicting blocks; network recheck not performed.",
  };
}
