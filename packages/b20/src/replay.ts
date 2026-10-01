import {
  createAttributionReplayReport,
  decodeAttributionFromCalldata,
  validateBuilderCodes,
} from "@base-attribution-os/core";
import { keccak256, toBytes } from "viem/utils";
import { classifyB20Address } from "./protocol.js";
import { createB20InspectionReport } from "./report.js";
import {
  b20CandidateAddresses,
  decodeB20FactoryEvent,
  decodeB20Operation,
  decodeB20TokenEvent,
  isDirectB20Creation,
} from "./replay-decode.js";
import { B20_REPLAY_PROFILE } from "./replay-protocol.js";
import { B20_REPLAY_LIMITS, parseB20ReplayCapture } from "./replay-validate.js";
import type {
  B20ReplayCapture,
  B20ReplayOptions,
  B20ReplayReport,
  B20ReplayTransaction,
  B20TransactionCapture,
} from "./replay-types.js";
import { canonicalJson, object, oneOf, timestamp } from "./validation.js";

export function transactionContextConflicts(row: B20TransactionCapture, chainId: number): boolean {
  const tx = row.transaction,
    receipt = row.receipt,
    block = row.block;
  if (!tx) return Boolean(receipt || block || row.blockAfter || row.tokens.length);
  if (row.hash !== tx.hash) return true;
  if (!tx.blockHash) return Boolean(receipt || block || row.blockAfter || row.tokens.length);
  if (
    receipt &&
    (receipt.transactionHash !== tx.hash ||
      receipt.blockHash !== tx.blockHash ||
      receipt.blockNumber !== tx.blockNumber ||
      receipt.transactionIndex !== tx.transactionIndex)
  )
    return true;
  if (block && (block.hash !== tx.blockHash || block.number !== tx.blockNumber)) return true;
  if (row.blockAfter && (!block || canonicalJson(row.blockAfter) !== canonicalJson(block)))
    return true;
  if (receipt?.status === "reverted" && receipt.logs.length) return true;
  if (
    receipt?.logs.some(
      (log) =>
        log.removed ||
        log.transactionHash !== tx.hash ||
        log.transactionIndex !== tx.transactionIndex ||
        log.blockHash !== tx.blockHash ||
        log.blockNumber !== tx.blockNumber,
    )
  )
    return true;
  const candidates = b20CandidateAddresses(row, chainId);
  return row.tokens.some(
    (token) =>
      !block ||
      canonicalJson(token.block) !== canonicalJson(block) ||
      canonicalJson(token.blockAfter) !== canonicalJson(block) ||
      !candidates.includes(token.address),
  );
}

function analyze(
  row: B20TransactionCapture,
  capture: B20ReplayCapture,
  expectedCode: string | null,
  creations: Map<string, bigint>,
): B20ReplayTransaction {
  const tx = row.transaction;
  let guessedCode = "bc_unconfigured";
  try {
    guessedCode = tx
      ? (decodeAttributionFromCalldata(tx.input)?.codes[0] ?? guessedCode)
      : guessedCode;
  } catch {
    /* Keep the core decoder's malformed-attribution finding. */
  }
  if (validateBuilderCodes([guessedCode]).length) guessedCode = "bc_unconfigured";
  const attribution = createAttributionReplayReport(
    [{ hash: row.hash, ...(tx ? { calldata: tx.input } : {}) }],
    {
      builderCode: expectedCode ?? guessedCode,
      chainId: capture.input.chainId,
      generatedAt: capture.capturedAt,
    },
  ).transactions[0];
  const conflict = transactionContextConflicts(row, capture.input.chainId);
  const mined = Boolean(tx?.blockHash && row.receipt && row.block && row.blockAfter && !row.error);
  const result: B20ReplayTransaction = {
    hash: row.hash,
    execution:
      tx?.blockHash === null ? "pending" : mined && !conflict ? row.receipt!.status : "unavailable",
    consistency: conflict ? "conflicting" : "consistent",
    relation: "unavailable",
    tokens: [],
    operation: null,
    events: [],
    attribution: {
      scope: "top-level-transaction",
      status: attribution.status,
      codes: attribution.codes,
      expectedMatch: expectedCode ? attribution.status === "attributed" : null,
    },
    directCoverageEligible: false,
    diagnostics: row.error ? [row.error] : [],
  };
  if (conflict) result.diagnostics.push("B20_CONTEXT_CONFLICT");
  if (!mined || conflict || !tx) return result;
  result.relation = "no-b20-evidence";
  const creationEvents =
    row.receipt!.status === "success"
      ? row.receipt!.logs.flatMap((log) => {
          const event = decodeB20FactoryEvent(log, capture.input.chainId);
          return event ? [event] : [];
        })
      : [];
  for (const address of b20CandidateAddresses(row, capture.input.chainId)) {
    const evidence = row.tokens.find((token) => token.address === address);
    const inspection = evidence ? createB20InspectionReport(evidence) : null;
    let classification =
      inspection?.token.classification ??
      classifyB20Address(address, capture.input.chainId).classification;
    let confirmation: B20ReplayTransaction["tokens"][number]["confirmation"] =
      inspection?.token.confirmation ?? "none";
    if (creationEvents.some((event) => event.token === address)) {
      if (classification === "not-initialized" || classification === "conflict") {
        classification = "conflict";
        result.consistency = "conflicting";
        result.diagnostics.push("B20_CREATION_QUERY_CONFLICT");
      } else {
        classification = "confirmed-initialized";
        confirmation = "creation-event";
      }
    }
    result.tokens.push({ address, classification, confirmation });
  }
  const confirmed = new Set(
    result.tokens
      .filter((token) => token.classification === "confirmed-initialized")
      .map((token) => token.address),
  );
  if (row.receipt!.status === "success") {
    result.events = row.receipt!.logs.flatMap((log) => {
      const creation = creationEvents.find((event) => event.logIndex === log.logIndex);
      if (creation) return [creation];
      if (!confirmed.has(log.address)) return [];
      const event = decodeB20TokenEvent(log);
      if (!event && (B20_REPLAY_PROFILE.tokenTopics as readonly string[]).includes(log.topics[0]))
        result.diagnostics.push("B20_MALFORMED_EVENT");
      return event ? [event] : [];
    });
  }
  for (const log of row.receipt!.logs) {
    if (
      log.topics[0] === B20_REPLAY_PROFILE.creationTopic &&
      !creationEvents.some((event) => event.logIndex === log.logIndex)
    )
      result.diagnostics.push(
        log.address === B20_REPLAY_PROFILE.factory
          ? "B20_UNSUPPORTED_CREATION_EVENT"
          : "B20_UNTRUSTED_FACTORY_EMITTER",
      );
  }
  if (tx.to === B20_REPLAY_PROFILE.factory) {
    result.relation = isDirectB20Creation(tx) ? "direct-factory-call" : "unsupported-call-scope";
  } else if (tx.to && confirmed.has(tx.to)) {
    result.operation = decodeB20Operation(tx);
    result.relation = result.operation ? "direct-token-call" : "unsupported-call-scope";
    if (!result.operation) result.diagnostics.push("B20_OPERATION_NOT_DECODED");
    else {
      const op = result.operation;
      const matchingEvent = result.events.some(
        (event) =>
          event.token === tx.to &&
          event.event === (op.method === "approve" ? "Approval" : "Transfer") &&
          event.from === op.from &&
          event.to === op.to &&
          event.amount === op.amount,
      );
      const matchingMemo =
        op.memo === null ||
        result.events.some(
          (event) =>
            event.token === tx.to &&
            event.event === "Memo" &&
            event.from === tx.from &&
            event.memo === op.memo,
        );
      const creationIndex = creations.get(`${tx.blockHash}:${tx.to}`);
      const createdEarlier =
        creationIndex !== undefined && creationIndex < BigInt(tx.transactionIndex!);
      const createdLater =
        creationIndex !== undefined && creationIndex > BigInt(tx.transactionIndex!);
      if (createdLater || (result.execution === "reverted" && !createdEarlier))
        result.diagnostics.push("B20_TRANSACTION_TIME_INITIALIZATION_UNRESOLVED");
      else if (result.execution === "success" && (!matchingEvent || !matchingMemo))
        result.diagnostics.push("B20_OPERATION_EVENT_MISMATCH");
      else result.directCoverageEligible = true;
    }
  } else if (result.events.length) result.relation = "receipt-event-only";
  else if (result.tokens.length) result.relation = "unsupported-call-scope";
  if (result.relation === "receipt-event-only")
    result.diagnostics.push("B20_NESTED_ATTRIBUTION_NOT_ESTABLISHED");
  if (result.consistency === "conflicting") {
    result.directCoverageEligible = false;
    result.events = [];
  }
  result.diagnostics = [...new Set(result.diagnostics)].sort();
  return result;
}

export function validateReplayOptions(options: B20ReplayOptions) {
  object(options, ["expectedCode", "policy", "generatedAt"], "replay options");
  const expectedCode = options.expectedCode ?? null;
  if (
    expectedCode !== null &&
    (typeof expectedCode !== "string" || validateBuilderCodes([expectedCode]).length)
  )
    throw new Error("B20_INVALID_INPUT: invalid expected Builder Code");
  const policy = oneOf(options.policy ?? "observe", ["observe", "strict-attribution"], "policy");
  if (policy === "strict-attribution" && expectedCode === null)
    throw new Error("B20_INVALID_INPUT: strict-attribution requires an expected Builder Code");
  return { expectedCode, policy };
}

/** Internal derivation shared with the RPC orchestrator. Not a public acquisition capability. */
export function deriveB20ReplayReport(
  value: unknown,
  options: B20ReplayOptions,
  currentRunRpc = false,
): B20ReplayReport {
  const { expectedCode, policy } = validateReplayOptions(options);
  const evidence = parseB20ReplayCapture(value);
  const creations = new Map<string, bigint>();
  for (const row of evidence.transactions) {
    if (
      row.error ||
      !row.block ||
      !row.blockAfter ||
      row.receipt?.status !== "success" ||
      transactionContextConflicts(row, evidence.input.chainId)
    )
      continue;
    for (const log of row.receipt.logs) {
      const event = decodeB20FactoryEvent(log, evidence.input.chainId);
      if (!event) continue;
      const key = `${row.block.hash}:${event.token}`;
      const index = BigInt(row.receipt.transactionIndex);
      if (creations.has(key) && creations.get(key) !== index)
        throw new Error("B20_EVIDENCE_MISMATCH: conflicting creation transactions");
      creations.set(key, index);
    }
  }
  const transactions = evidence.transactions.map((row) =>
    analyze(row, evidence, expectedCode, creations),
  );
  const count = (predicate: (row: B20ReplayTransaction) => boolean) =>
    transactions.filter(predicate).length;
  const unknownRow = (row: B20ReplayTransaction) =>
    row.relation === "unsupported-call-scope" ||
    row.execution === "unavailable" ||
    row.execution === "pending" ||
    row.consistency === "conflicting" ||
    row.tokens.some(
      (token) =>
        !["confirmed-initialized", "not-initialized", "not-b20"].includes(token.classification),
    ) ||
    row.diagnostics.some((code) =>
      [
        "B20_OPERATION_EVENT_MISMATCH",
        "B20_TRANSACTION_TIME_INITIALIZATION_UNRESOLVED",
        "B20_UNSUPPORTED_CREATION_EVENT",
        "B20_MALFORMED_EVENT",
        "B20_OPERATION_NOT_DECODED",
      ].includes(code),
    );
  const attributed = count((row) => row.attribution.expectedMatch === true);
  const direct = count((row) => row.directCoverageEligible);
  const directAttributed = count(
    (row) => row.directCoverageEligible && row.attribution.expectedMatch === true,
  );
  const resolved = count((row) => row.execution === "success" || row.execution === "reverted");
  const unknown = count(unknownRow);
  const consistency = transactions.some((row) => row.consistency === "conflicting")
    ? "conflicting"
    : "consistent";
  const runStatus = evidence.transactions.every((row) => row.transaction === null)
    ? "failed"
    : unknown > 0
      ? "partial"
      : "complete";
  const strictPass =
    currentRunRpc &&
    evidence.acquisition === "rpc" &&
    runStatus === "complete" &&
    direct > 0 &&
    attributed === transactions.length &&
    consistency === "consistent";
  const metric = (numerator: number, denominator: number) => ({
    numerator,
    denominator,
    percent:
      expectedCode === null || denominator === 0
        ? null
        : Math.round((numerator / denominator) * 10000) / 100,
  });
  const report: B20ReplayReport = {
    kind: "bao.b20-report",
    schemaVersion: 1,
    mode: "replay",
    producer: { name: "@base-attribution-os/b20", version: "0.1.0" },
    chainId: evidence.input.chainId,
    protocolProfileId: B20_REPLAY_PROFILE.id,
    protocolSourceDigest: B20_REPLAY_PROFILE.sourceDigest,
    generatedAt: timestamp(options.generatedAt ?? evidence.capturedAt),
    expectedCode,
    evidenceDigest: keccak256(toBytes(canonicalJson(evidence))),
    evidence,
    transactions,
    coverage: {
      supplied: evidence.input.transactions.length,
      unique: transactions.length,
      resolved,
      unavailable: count((row) => row.execution === "unavailable"),
      supportedDirectCalls: direct,
      factoryObservations: count(
        (row) =>
          row.relation === "direct-factory-call" ||
          row.events.some((event) => event.event === "B20Created"),
      ),
      eventOnly: count((row) => row.relation === "receipt-event-only"),
      unknown,
      attributed,
      missing: count((row) => row.attribution.status === "missing-attribution"),
      wrongCode: count((row) => row.attribution.status === "wrong-builder-code"),
      invalid: count((row) => row.attribution.status === "invalid-attribution"),
      successful: count((row) => row.execution === "success"),
      reverted: count((row) => row.execution === "reverted"),
      pending: count((row) => row.execution === "pending"),
      inputAttribution: metric(attributed, transactions.length),
      directAttribution: metric(directAttributed, direct),
    },
    runStatus,
    consistency,
    readiness: "not-tested",
    runtimeQualification: "not-qualified",
    policy: {
      name: policy,
      decision: (
        policy === "observe" ? runStatus !== "failed" && consistency === "consistent" : strictPass
      )
        ? "pass"
        : "fail",
    },
    limitations: [
      "Coverage describes only the explicitly supplied transaction set; producer-declared completeness is not independently established.",
      "Builder-Code-filtered selection cannot measure omitted attribution outside the supplied set.",
      "Token reads describe end-of-block state. Reverted calls without earlier creation evidence remain unresolved at transaction time.",
      "Receipt events in routers or batches do not establish attribution for a nested application or UserOperation.",
      "Acquisition and policy in an imported artifact are producer claims. Offline validation cannot grant current-run RPC authority.",
      "Application readiness, deployment activation, consensus proofs, ownership, and reward eligibility are not tested.",
    ],
  };
  if (toBytes(canonicalJson(report)).length > B20_REPLAY_LIMITS.artifactBytes)
    throw new Error("B20_INPUT_LIMIT: report exceeds 4 MiB");
  return report;
}

/** Pure analysis never grants a strict current-run RPC pass from serialized evidence. */
export function createB20ReplayReport(
  value: unknown,
  options: B20ReplayOptions = {},
): B20ReplayReport {
  return deriveB20ReplayReport(value, options, false);
}
export function parseB20ReplayReport(value: unknown): B20ReplayReport {
  const report = object(
    value,
    [
      "kind",
      "schemaVersion",
      "mode",
      "producer",
      "chainId",
      "protocolProfileId",
      "protocolSourceDigest",
      "generatedAt",
      "expectedCode",
      "evidenceDigest",
      "evidence",
      "transactions",
      "coverage",
      "runStatus",
      "consistency",
      "readiness",
      "runtimeQualification",
      "policy",
      "limitations",
    ],
    "replay report",
  );
  const policy = object(report.policy, ["name", "decision"], "policy");
  const name = oneOf(policy.name, ["observe", "strict-attribution"], "policy name");
  const decision = oneOf(policy.decision, ["pass", "fail"], "policy decision");
  // Recompute consistency of a producer's claim. This does not authenticate its acquisition.
  const expected = deriveB20ReplayReport(
    report.evidence,
    {
      ...(report.expectedCode === null ? {} : { expectedCode: report.expectedCode as string }),
      policy: name,
      generatedAt: timestamp(report.generatedAt),
    },
    name === "strict-attribution" && decision === "pass",
  );
  if (canonicalJson(expected) !== canonicalJson(value))
    throw new Error("B20_DERIVATION_MISMATCH: replay report differs from recomputed evidence");
  return expected;
}
export function validateB20ReplayReportOffline(value: unknown) {
  const report = parseB20ReplayReport(value);
  return {
    kind: "bao.b20-validation" as const,
    schemaVersion: 1 as const,
    mode: "offline" as const,
    networkRecheck: "not-performed" as const,
    acquisition: report.evidence.acquisition === "synthetic" ? "synthetic" : "imported",
    producerAcquisitionClaim: report.evidence.acquisition,
    producerPolicyClaim: report.policy,
    currentRunStrictPolicy: "not-evaluated" as const,
    valid: report.consistency === "consistent",
    evidenceDigest: report.evidenceDigest,
    message:
      report.consistency === "consistent"
        ? "Internally consistent; network recheck not performed."
        : "Conflicting evidence; network recheck not performed.",
    readiness: "not-tested" as const,
  };
}
