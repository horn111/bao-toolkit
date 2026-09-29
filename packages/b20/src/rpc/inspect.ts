import { B20_PROFILE, classifyB20Address, initializationCalldata } from "../protocol.js";
import {
  createB20InspectionReport,
  parseB20Report,
  parseBlockSelection,
  parseRpcQuantity,
} from "../report.js";
import type { B20InspectionCapture, BlockReference, ReadResult } from "../types.js";
import { canonicalJson, chain, hex, object, timestamp } from "../validation.js";
import { B20RpcError, type B20Transport, type B20RpcMethod } from "./transport.js";

export interface InspectB20Request {
  address: string;
  chainId: number;
  block?: string;
  capturedAt?: string;
}

async function request(transport: B20Transport, method: B20RpcMethod, params: readonly unknown[]) {
  try {
    return await transport.request(method, params);
  } catch (error) {
    throw error instanceof B20RpcError ? error : new B20RpcError("transport-error");
  }
}

function header(value: unknown): BlockReference {
  // RPC headers contain additional fields. Export only the fields used by the analyzer.
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new B20RpcError("invalid-response");
  const block = value as Record<string, unknown>;
  try {
    return {
      number: BigInt(parseRpcQuantity(block.number)).toString(),
      hash: hex(block.hash, 32, "block hash"),
      timestamp: BigInt(parseRpcQuantity(block.timestamp)).toString(),
      statePosition: "end-of-block",
    };
  } catch {
    throw new B20RpcError("invalid-response");
  }
}

export async function inspectB20Token(input: InspectB20Request, transport: B20Transport) {
  object(input, ["address", "chainId", "block", "capturedAt"], "inspect request");
  const chainId = chain(input.chainId);
  const candidate = classifyB20Address(input.address, chainId);
  const selected = parseBlockSelection(input.block ?? "finalized");
  // Validate caller-supplied timestamps before any network access.
  const capturedAt = timestamp(input.capturedAt ?? new Date().toISOString());
  const chainResponse = parseRpcQuantity(await request(transport, "eth_chainId", []));
  if (BigInt(chainResponse) !== BigInt(chainId))
    throw new Error("B20_CHAIN_MISMATCH: configured endpoint does not match --chain-id");
  const blockParam = /^\d/.test(selected) ? `0x${BigInt(selected).toString(16)}` : selected;
  const block = header(await request(transport, "eth_getBlockByNumber", [blockParam, false]));
  if (/^\d/.test(selected) && block.number !== selected)
    throw new Error("B20_BLOCK_MISMATCH: endpoint returned another block");
  let initialization: B20InspectionCapture["initialization"] = null;
  if (candidate.classification === "prefix-candidate") {
    const call = {
      to: B20_PROFILE.factory,
      data: initializationCalldata(candidate.address),
      block: { blockHash: block.hash, requireCanonical: true as const },
    };
    let result: ReadResult;
    try {
      const response = await request(transport, "eth_call", [
        { to: call.to, data: call.data },
        call.block,
      ]);
      try {
        result = { status: "returned", data: hex(response, undefined, "initialization return") };
      } catch {
        result = { status: "failed", reason: "invalid-response", rpcCode: null };
      }
    } catch (error) {
      const failure = error instanceof B20RpcError ? error : new B20RpcError("transport-error");
      result = { status: "failed", reason: failure.reason, rpcCode: failure.rpcCode };
    }
    initialization = { id: "initialization", method: "eth_call", request: call, result };
  }
  const blockAfter = header(
    await request(transport, "eth_getBlockByNumber", [
      `0x${BigInt(block.number).toString(16)}`,
      false,
    ]),
  );
  const capture: B20InspectionCapture = {
    kind: "bao.b20-inspection-capture",
    schemaVersion: 1,
    chainId,
    address: candidate.address,
    protocolProfileId: B20_PROFILE.id,
    protocolSourceDigest: B20_PROFILE.sourceDigest,
    acquisition: "rpc",
    capturedAt,
    requestedBlock: selected,
    chainResponse,
    block,
    blockAfter,
    initialization,
  };
  return createB20InspectionReport(capture);
}

/** Rechecks immutable context; produces a new result and never changes the input artifact. */
export async function recheckB20Report(value: unknown, transport: B20Transport) {
  const report = parseB20Report(value);
  const current = await inspectB20Token(
    { address: report.token.address, chainId: report.chainId, block: report.evidence.block.number },
    transport,
  );
  const sameBlock = canonicalJson(current.evidence.block) === canonicalJson(report.evidence.block);
  const sameRead =
    canonicalJson(current.evidence.initialization) ===
    canonicalJson(report.evidence.initialization);
  const resolved = !["prefix-candidate", "unavailable", "unsupported", "conflict"].includes(
    current.token.classification,
  );
  const conflicting =
    report.consistency === "conflicting" || current.consistency === "conflicting" || !sameBlock;
  const status = conflicting
    ? "conflict"
    : !resolved
      ? "inconclusive"
      : !sameRead
        ? "conflict"
        : report.evidence.acquisition === "synthetic"
          ? "synthetic-source"
          : "matched";
  return {
    kind: "bao.b20-validation" as const,
    schemaVersion: 1 as const,
    mode: "rpc-recheck" as const,
    sourceEvidenceDigest: report.evidenceDigest,
    sourceAcquisition: report.evidence.acquisition,
    status,
    valid: status === "matched",
    readiness: "not-tested" as const,
    currentObservation: current,
    message:
      report.evidence.acquisition === "synthetic"
        ? "Synthetic source remains synthetic. RPC observation is separate."
        : "RPC recheck compares the original block and initialization response; it is not consensus verification.",
  };
}
