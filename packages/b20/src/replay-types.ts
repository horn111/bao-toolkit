import type { AttributionReplayStatus } from "@base-attribution-os/core";
import type {
  Acquisition,
  B20InspectionCapture,
  BlockReference,
  TokenClassification,
} from "./types.js";
import type { Hex } from "./validation.js";

export interface B20Selection {
  mode: "explicit-hashes" | "application-export" | "builder-code-filtered" | "sample";
  description: string;
  completeness: "unknown" | "producer-declared";
}
export interface B20ReplayInput {
  kind: "bao.b20-input";
  schemaVersion: 1;
  chainId: number;
  selection: B20Selection;
  transactions: { hash: Hex }[];
}
export interface B20TransactionEvidence {
  hash: Hex;
  from: Hex;
  to: Hex | null;
  input: Hex;
  blockHash: Hex | null;
  blockNumber: string | null;
  transactionIndex: string | null;
}
export interface B20LogEvidence {
  address: Hex;
  topics: Hex[];
  data: Hex;
  logIndex: string;
  removed: boolean;
  transactionHash: Hex;
  transactionIndex: string;
  blockHash: Hex;
  blockNumber: string;
}
export interface B20ReceiptEvidence {
  transactionHash: Hex;
  transactionIndex: string;
  blockHash: Hex;
  blockNumber: string;
  status: "success" | "reverted";
  logs: B20LogEvidence[];
}
export interface B20TransactionCapture {
  hash: Hex;
  transaction: B20TransactionEvidence | null;
  receipt: B20ReceiptEvidence | null;
  block: BlockReference | null;
  blockAfter: BlockReference | null;
  tokens: B20InspectionCapture[];
  error: "B20_RPC_UNAVAILABLE" | "B20_LIMIT_EXCEEDED" | "B20_PENDING" | null;
}
export interface B20ReplayCapture {
  kind: "bao.b20-replay-capture";
  schemaVersion: 1;
  input: B20ReplayInput;
  protocolProfileId: string;
  protocolSourceDigest: Hex;
  acquisition: Acquisition;
  capturedAt: string;
  chainResponse: Hex;
  transactions: B20TransactionCapture[];
}
export interface B20ObservedEvent {
  token: Hex;
  logIndex: string;
  event: "Transfer" | "Approval" | "Memo" | "B20Created";
  from: Hex | null;
  to: Hex | null;
  amount: string | null;
  memo: Hex | null;
  metadata: { name: string; symbol: string; decimals: number; currency: string | null } | null;
}
export interface B20Operation {
  method: "transfer" | "transferFrom" | "approve" | "transferWithMemo" | "transferFromWithMemo";
  from: Hex;
  to: Hex;
  amount: string;
  memo: Hex | null;
}
export interface B20ReplayTransaction {
  hash: Hex;
  execution: "success" | "reverted" | "pending" | "unavailable";
  consistency: "consistent" | "conflicting";
  relation:
    | "direct-token-call"
    | "direct-factory-call"
    | "receipt-event-only"
    | "unsupported-call-scope"
    | "no-b20-evidence"
    | "unavailable";
  tokens: {
    address: Hex;
    classification: TokenClassification;
    confirmation: "factory-query" | "creation-event" | "none";
  }[];
  operation: B20Operation | null;
  events: B20ObservedEvent[];
  attribution: {
    scope: "top-level-transaction";
    status: AttributionReplayStatus;
    codes: string[];
    expectedMatch: boolean | null;
  };
  directCoverageEligible: boolean;
  diagnostics: string[];
}
export interface B20ReplayOptions {
  expectedCode?: string;
  policy?: "observe" | "strict-attribution";
  generatedAt?: string;
}
export interface B20ReplayReport {
  kind: "bao.b20-report";
  schemaVersion: 1;
  mode: "replay";
  producer: { name: "@base-attribution-os/b20"; version: "0.1.0" };
  chainId: number;
  protocolProfileId: string;
  protocolSourceDigest: Hex;
  generatedAt: string;
  expectedCode: string | null;
  evidenceDigest: Hex;
  evidence: B20ReplayCapture;
  transactions: B20ReplayTransaction[];
  coverage: {
    supplied: number;
    unique: number;
    resolved: number;
    unavailable: number;
    supportedDirectCalls: number;
    factoryObservations: number;
    eventOnly: number;
    unknown: number;
    attributed: number;
    missing: number;
    wrongCode: number;
    invalid: number;
    successful: number;
    reverted: number;
    pending: number;
    inputAttribution: { numerator: number; denominator: number; percent: number | null };
    directAttribution: { numerator: number; denominator: number; percent: number | null };
  };
  runStatus: "complete" | "partial" | "failed";
  consistency: "consistent" | "conflicting";
  readiness: "not-tested";
  runtimeQualification: "not-qualified";
  policy: { name: "observe" | "strict-attribution"; decision: "pass" | "fail" };
  limitations: string[];
}
