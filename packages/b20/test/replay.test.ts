import { describe, expect, it, vi } from "vitest";
import { appendDataSuffix, ERC8021_SUFFIX } from "@base-attribution-os/core";
import {
  encodeFunctionData,
  encodeAbiParameters,
  encodeEventTopics,
  parseAbiParameters,
} from "viem/utils";
import {
  createB20ReplayReport,
  parseB20ReplayReport,
  validateB20ReplayReportOffline,
} from "../src/replay.js";
import {
  parseB20ReplayCapture,
  parseB20ReplayInput,
  B20_REPLAY_LIMITS,
} from "../src/replay-validate.js";
import { b20TokenAbi } from "../src/replay-protocol.js";
import { replayB20Transactions, recheckB20ReplayReport } from "../src/rpc/collect.js";
import type { B20Transport } from "../src/rpc/index.js";
import type { Hex } from "../src/validation.js";
import {
  replayFixture,
  addCreation,
  SENDER,
  RECIPIENT,
  AMOUNT,
  TX,
  TX2,
} from "./replay-fixture.js";

const report = (capture = replayFixture()) =>
  createB20ReplayReport(capture, { expectedCode: "bc_example" });
const quantity = (n: string) => `0x${BigInt(n).toString(16)}`;
function rpcTransport(
  capture = replayFixture(),
): B20Transport & { request: ReturnType<typeof vi.fn> } {
  return {
    request: vi.fn(async (method, params: unknown[]) => {
      const row =
        capture.transactions.find((row) => row.hash === params[0]) ?? capture.transactions[0];
      if (method === "eth_chainId") return capture.chainResponse;
      if (method === "eth_getTransactionByHash")
        return row.transaction
          ? {
              ...row.transaction,
              blockNumber:
                row.transaction.blockNumber === null ? null : quantity(row.transaction.blockNumber),
              transactionIndex:
                row.transaction.transactionIndex === null
                  ? null
                  : quantity(row.transaction.transactionIndex),
            }
          : null;
      if (method === "eth_getTransactionReceipt")
        return row.receipt
          ? {
              ...row.receipt,
              status: row.receipt.status === "success" ? "0x1" : "0x0",
              blockNumber: quantity(row.receipt.blockNumber),
              transactionIndex: quantity(row.receipt.transactionIndex),
              logs: row.receipt.logs.map((log) => ({
                ...log,
                blockNumber: quantity(log.blockNumber),
                transactionIndex: quantity(log.transactionIndex),
                logIndex: quantity(log.logIndex),
              })),
            }
          : null;
      if (method === "eth_getBlockByNumber")
        return {
          ...row.block!,
          number: quantity(row.block!.number),
          timestamp: quantity(row.block!.timestamp),
        };
      if (method === "eth_call") return `0x${"0".repeat(63)}1`;
      throw new Error("Unexpected request");
    }),
  };
}

describe("B20 replay evidence", () => {
  it("finds the missing suffix and preserves the same transfer after fixing it", () => {
    const broken = report(replayFixture(false)),
      fixed = report();
    expect(broken.transactions[0].attribution.status).toBe("missing-attribution");
    expect(fixed.transactions[0].attribution.status).toBe("attributed");
    expect(broken.transactions[0].operation).toEqual(fixed.transactions[0].operation);
    expect(fixed.transactions[0].operation!.amount).toBe(AMOUNT.toString());
    expect(fixed.coverage.directAttribution).toEqual({
      numerator: 1,
      denominator: 1,
      percent: 100,
    });
    expect(broken.coverage.directAttribution).toEqual({ numerator: 0, denominator: 1, percent: 0 });
    expect(parseB20ReplayReport(fixed)).toEqual(fixed);
  });
  it.each([
    [["bc_wrong"], "wrong-builder-code"],
    [["bc_other", "bc_example"], "attributed"],
  ] as const)("reuses existing multi-code attribution semantics", (codes, status) => {
    const capture = replayFixture(false);
    capture.transactions[0].transaction!.input = appendDataSuffix(
      capture.transactions[0].transaction!.input,
      { codes: [...codes] },
    );
    expect(report(capture).transactions[0].attribution.status).toBe(status);
  });
  it("keeps malformed attribution separate from valid receipt evidence", () => {
    const capture = replayFixture(false);
    capture.transactions[0].transaction!.input += `00ff${ERC8021_SUFFIX.slice(2)}`;
    const result = report(capture);
    expect(result.transactions[0].attribution.status).toBe("invalid-attribution");
    expect(result.transactions[0].events).toHaveLength(1);
  });
  it("does not measure expected-code coverage when no expectation was supplied", () => {
    const result = createB20ReplayReport(replayFixture());
    expect(result.transactions[0].attribution.codes).toEqual(["bc_example"]);
    expect(result.coverage.directAttribution.percent).toBeNull();
  });
  it("deduplicates hashes but preserves the supplied denominator metadata", () => {
    const capture = replayFixture();
    capture.input.transactions.push({ hash: TX });
    capture.transactions.push(structuredClone(capture.transactions[0]));
    expect(report(capture).coverage).toMatchObject({ supplied: 2, unique: 1 });
  });
  it("rejects conflicting duplicate transactions and logs", () => {
    const capture = replayFixture();
    const other = structuredClone(capture.transactions[0]);
    other.transaction!.input = "0x";
    capture.transactions.push(other);
    expect(() => report(capture)).toThrow("conflicting duplicate transaction");
    const logs = replayFixture();
    logs.transactions[0].receipt!.logs.push({
      ...logs.transactions[0].receipt!.logs[0],
      data: "0x",
    });
    expect(() => report(logs)).toThrow("conflicting duplicate log");
  });
  it("rejects contradictory state reads shared by two transactions", () => {
    const capture = replayFixture();
    const creation = addCreation(capture);
    creation.tokens[0].initialization!.result = { status: "returned", data: `0x${"0".repeat(64)}` };
    expect(() => report(capture)).toThrow("conflicting reads");
  });
  it.each(["removed", "block", "receipt", "reverted-logs", "token-block"])(
    "does not confirm inconsistent %s evidence",
    (mutation) => {
      const capture = replayFixture();
      const row = capture.transactions[0];
      if (mutation === "removed") row.receipt!.logs[0].removed = true;
      if (mutation === "block") row.blockAfter!.hash = `0x${"cc".repeat(32)}`;
      if (mutation === "receipt") row.receipt!.transactionHash = TX2;
      if (mutation === "reverted-logs") row.receipt!.status = "reverted";
      if (mutation === "token-block") row.tokens[0].block.timestamp = "1";
      const result = report(capture);
      expect(result.consistency).toBe("conflicting");
      expect(result.policy.decision).toBe("fail");
      expect(result.coverage.supportedDirectCalls).toBe(0);
    },
  );
  it("observes router events without assigning nested attribution", () => {
    const capture = replayFixture();
    capture.transactions[0].transaction!.to = RECIPIENT;
    const result = report(capture);
    expect(result.transactions[0].relation).toBe("receipt-event-only");
    expect(result.coverage.directAttribution.percent).toBeNull();
    expect(result.coverage.eventOnly).toBe(1);
  });
  it("keeps ordinary ERC-20 events out of B20 counts", () => {
    const capture = replayFixture();
    const row = capture.transactions[0];
    row.transaction!.to = RECIPIENT;
    row.receipt!.logs[0].address = RECIPIENT;
    row.tokens = [];
    expect(report(capture).transactions[0].relation).toBe("no-b20-evidence");
  });
  it("shows unknown operations and event mismatches", () => {
    const capture = replayFixture();
    capture.transactions[0].transaction!.input = "0x12345678";
    expect(report(capture).transactions[0].diagnostics).toContain("B20_OPERATION_NOT_DECODED");
    const wrong = replayFixture();
    wrong.transactions[0].receipt!.logs[0].data = encodeAbiParameters(
      parseAbiParameters("uint256"),
      [0n],
    );
    expect(report(wrong).transactions[0].diagnostics).toContain("B20_OPERATION_EVENT_MISMATCH");
  });
  it("requires a supported initialization or creation rule", () => {
    const capture = replayFixture();
    capture.transactions[0].tokens = [];
    expect(report(capture).coverage).toMatchObject({ supportedDirectCalls: 0, unknown: 1 });
  });
  it("recognizes Asset and versioned Stablecoin creation events", () => {
    for (const stablecoin of [false, true]) {
      const capture = replayFixture();
      const row = addCreation(capture, "0", stablecoin);
      row.tokens = [];
      const result = report(capture).transactions.find((tx) => tx.hash === TX2)!;
      expect(result.events[0]).toMatchObject({
        event: "B20Created",
        metadata: { currency: stablecoin ? "USD" : null },
      });
      expect(result.tokens[0].confirmation).toBe("creation-event");
    }
  });
  it("refuses wrong factory emitters and malformed creation payloads", () => {
    for (const wrongEmitter of [true, false]) {
      const capture = replayFixture();
      const row = addCreation(capture);
      row.tokens = [];
      if (wrongEmitter) row.receipt!.logs[0].address = RECIPIENT;
      else row.receipt!.logs[0].data = "0x";
      expect(report(capture).transactions.find((tx) => tx.hash === TX2)!.events).toHaveLength(0);
    }
  });
  it("reports creation/query contradictions", () => {
    const capture = replayFixture();
    const row = addCreation(capture);
    capture.input.transactions = [{ hash: TX2 }];
    capture.transactions = [row];
    row.tokens[0].initialization!.result = { status: "returned", data: `0x${"0".repeat(64)}` };
    expect(report(capture).transactions[0].tokens[0].classification).toBe("conflict");
  });
  it("does not infer initialization at an earlier reverted transaction from later state", () => {
    const capture = replayFixture();
    const row = capture.transactions[0];
    row.receipt!.status = "reverted";
    row.receipt!.logs = [];
    expect(report(capture).coverage).toMatchObject({
      reverted: 1,
      supportedDirectCalls: 0,
      unknown: 1,
    });
    addCreation(capture, "2");
    expect(report(capture).transactions[0].directCoverageEligible).toBe(false);
    const earlier = replayFixture();
    earlier.transactions[0].receipt!.status = "reverted";
    earlier.transactions[0].receipt!.logs = [];
    addCreation(earlier, "0");
    expect(report(earlier).coverage).toMatchObject({ reverted: 1, supportedDirectCalls: 1 });
  });
  it("retains unavailable and pending rows in input coverage", () => {
    const capture = replayFixture();
    capture.input.transactions.push({ hash: TX2 });
    capture.transactions.push({
      hash: TX2,
      transaction: null,
      receipt: null,
      block: null,
      blockAfter: null,
      tokens: [],
      error: "B20_RPC_UNAVAILABLE",
    });
    expect(report(capture).coverage).toMatchObject({
      unique: 2,
      unavailable: 1,
      inputAttribution: { denominator: 2, numerator: 1 },
    });
    capture.transactions.pop();
    expect(() => report(capture)).toThrow("preserve every supplied hash");
  });
  it.each(["approve", "transferFrom", "transferWithMemo", "transferFromWithMemo"] as const)(
    "decodes %s with receipt comparison",
    (method) => {
      const capture = replayFixture();
      const row = capture.transactions[0];
      const memo = `0x${"44".repeat(32)}` as Hex;
      const args =
        method === "approve"
          ? ([RECIPIENT, AMOUNT] as const)
          : method === "transferFrom"
            ? ([SENDER, RECIPIENT, AMOUNT] as const)
            : method === "transferWithMemo"
              ? ([RECIPIENT, AMOUNT, memo] as const)
              : ([SENDER, RECIPIENT, AMOUNT, memo] as const);
      row.transaction!.input = encodeFunctionData({ abi: b20TokenAbi, functionName: method, args });
      if (method === "approve")
        row.receipt!.logs[0].topics = encodeEventTopics({
          abi: b20TokenAbi,
          eventName: "Approval",
          args: { owner: SENDER, spender: RECIPIENT },
        }) as Hex[];
      if (method.endsWith("Memo"))
        row.receipt!.logs.push({
          ...row.receipt!.logs[0],
          logIndex: "1",
          topics: encodeEventTopics({
            abi: b20TokenAbi,
            eventName: "Memo",
            args: { caller: SENDER, memo },
          }) as Hex[],
          data: "0x",
        });
      expect(report(capture).transactions[0]).toMatchObject({
        directCoverageEligible: true,
        operation: { method, amount: AMOUNT.toString() },
      });
    },
  );
});

describe("replay trust and RPC orchestration", () => {
  it("cannot grant strict policy from imported claims", async () => {
    const capture = replayFixture();
    capture.acquisition = "rpc";
    capture.transactions[0].tokens[0].acquisition = "rpc";
    expect(
      createB20ReplayReport(capture, { expectedCode: "bc_example", policy: "strict-attribution" })
        .policy.decision,
    ).toBe("fail");
    const live = await replayB20Transactions(capture.input, rpcTransport(), {
      expectedCode: "bc_example",
      policy: "strict-attribution",
    });
    expect(live.policy.decision).toBe("pass");
    expect(validateB20ReplayReportOffline(live)).toMatchObject({
      valid: true,
      acquisition: "imported",
      currentRunStrictPolicy: "not-evaluated",
      networkRecheck: "not-performed",
    });
  });
  it("blocks strict policy for missing attribution, unresolved rows and empty direct scope", async () => {
    for (const scenario of ["missing", "event-only", "unavailable"]) {
      const capture = replayFixture(scenario !== "missing");
      if (scenario === "event-only") capture.transactions[0].transaction!.to = RECIPIENT;
      if (scenario === "unavailable") capture.transactions[0].receipt = null;
      const result = await replayB20Transactions(capture.input, rpcTransport(capture), {
        expectedCode: "bc_example",
        policy: "strict-attribution",
      });
      expect(result.policy.decision).toBe("fail");
    }
  });
  it("keeps an unsupported factory call unresolved beside a valid direct call", async () => {
    const capture = replayFixture();
    const factory = addCreation(capture);
    factory.transaction!.input = appendDataSuffix("0x12345678", { codes: ["bc_example"] });
    factory.receipt!.logs = [];
    factory.tokens = [];
    const result = await replayB20Transactions(capture.input, rpcTransport(capture), {
      expectedCode: "bc_example",
      policy: "strict-attribution",
    });
    expect(result.coverage).toMatchObject({ supportedDirectCalls: 1, attributed: 2, unknown: 1 });
    expect(result.runStatus).toBe("partial");
    expect(result.policy.decision).toBe("fail");
  });
  it("rejects tampered counters, provenance fields and policy input", () => {
    const value = report();
    expect(() =>
      parseB20ReplayReport({ ...value, coverage: { ...value.coverage, unique: 0 } }),
    ).toThrow("B20_DERIVATION_MISMATCH");
    expect(() => parseB20ReplayCapture({ ...replayFixture(), verified: true })).toThrow();
    expect(() =>
      createB20ReplayReport(replayFixture(), { policy: "strict-attribution" }),
    ).toThrow();
    expect(() =>
      parseB20ReplayInput({
        ...replayFixture().input,
        transactions: Array.from({ length: B20_REPLAY_LIMITS.transactions + 1 }, () => ({
          hash: TX,
        })),
      }),
    ).toThrow("B20_INPUT_LIMIT");
  });
  it("checks the endpoint chain before acquiring transactions", async () => {
    const transport = rpcTransport();
    transport.request.mockResolvedValue("0x1");
    await expect(replayB20Transactions(replayFixture().input, transport)).rejects.toThrow(
      "B20_CHAIN_MISMATCH",
    );
    expect(transport.request).toHaveBeenCalledTimes(1);
  });
  it("pins token state to the containing block and caches duplicate reads", async () => {
    const capture = replayFixture();
    addCreation(capture);
    const transport = rpcTransport(capture);
    await replayB20Transactions(capture.input, transport);
    expect(transport.request.mock.calls.filter(([method]) => method === "eth_call")).toHaveLength(
      1,
    );
    expect(
      transport.request.mock.calls.filter(([method]) => method === "eth_call")[0][1][1],
    ).toEqual({ blockHash: capture.transactions[0].block!.hash, requireCanonical: true });
  });
  it("rechecks historical identities and keeps synthetic provenance separate", async () => {
    const source = await replayB20Transactions(replayFixture().input, rpcTransport());
    expect(await recheckB20ReplayReport(source, rpcTransport())).toMatchObject({
      status: "matched",
      valid: true,
    });
    expect(await recheckB20ReplayReport(report(), rpcTransport())).toMatchObject({
      status: "synthetic-source",
      valid: false,
    });
  });
  it("detects a moved transaction without reading token state at a replacement block", async () => {
    const source = await replayB20Transactions(replayFixture().input, rpcTransport());
    const changed = replayFixture();
    changed.transactions[0].transaction!.blockHash = `0x${"aa".repeat(32)}`;
    const transport = rpcTransport(changed);
    expect(await recheckB20ReplayReport(source, transport)).toMatchObject({
      status: "conflict",
      valid: false,
    });
    expect(transport.request.mock.calls.some(([method]) => method === "eth_call")).toBe(false);
  });
});
