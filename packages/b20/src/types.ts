import type { B20Variant } from "./protocol.js";
import type { Hex } from "./validation.js";

export type Acquisition = "rpc" | "imported" | "synthetic";
export type TokenClassification =
  | "confirmed-initialized"
  | "prefix-candidate"
  | "not-initialized"
  | "not-b20"
  | "unsupported"
  | "unavailable"
  | "conflict";
export type BlockSelection = "latest" | "safe" | "finalized" | string;
export interface BlockReference {
  number: string;
  hash: Hex;
  timestamp: string;
  statePosition: "end-of-block";
}
export type ReadFailure =
  | "rpc-error"
  | "unsupported-method"
  | "unavailable-history"
  | "invalid-response"
  | "transport-error";
export type ReadResult =
  | { status: "returned"; data: Hex }
  | { status: "failed"; reason: ReadFailure; rpcCode: number | null };
export interface InitializationEvidence {
  id: "initialization";
  method: "eth_call";
  request: { to: Hex; data: Hex; block: { blockHash: Hex; requireCanonical: true } };
  result: ReadResult;
}
export interface B20InspectionCapture {
  kind: "bao.b20-inspection-capture";
  schemaVersion: 1;
  chainId: number;
  address: Hex;
  protocolProfileId: string;
  protocolSourceDigest: Hex;
  acquisition: Acquisition;
  capturedAt: string;
  requestedBlock: BlockSelection;
  chainResponse: Hex;
  block: BlockReference;
  blockAfter: BlockReference;
  initialization: InitializationEvidence | null;
}
export interface B20InspectionReport {
  kind: "bao.b20-report";
  schemaVersion: 1;
  mode: "inspect";
  producer: { name: "@base-attribution-os/b20"; version: "0.1.0" };
  generatedAt: string;
  chainId: number;
  protocolProfileId: string;
  protocolSourceDigest: Hex;
  evidenceDigest: Hex;
  evidence: B20InspectionCapture;
  token: {
    address: Hex;
    variant: B20Variant;
    classification: TokenClassification;
    confirmation: "factory-query" | "none";
    evidenceIds: string[];
  };
  consistency: "consistent" | "conflicting";
  runStatus: "complete" | "partial";
  readiness: "not-tested";
  runtimeQualification: "not-qualified";
  policy: { name: "observe"; decision: "pass" | "fail" };
  diagnostics: string[];
  limitations: string[];
}
