import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { keccak256, toBytes, toFunctionSelector } from "viem/utils";
import {
  B20_PROFILE,
  classifyB20Address,
  createB20InspectionReport,
  initializationAbi,
  initializationCalldata,
  parseB20InspectionCapture,
  parseB20Report,
  validateB20ReportOffline,
  type B20InspectionCapture,
} from "../src/index.js";
import { canonicalJson } from "../src/validation.js";
import {
  B20RpcError,
  inspectB20Token,
  recheckB20Report,
  type B20Transport,
} from "../src/rpc/index.js";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../../fixtures/b20/synthetic/asset-initialized.capture.json", import.meta.url),
    "utf8",
  ),
);
const capture = (): B20InspectionCapture => structuredClone(fixture);
const header = (value = capture().block) => ({
  number: `0x${BigInt(value.number).toString(16)}`,
  hash: value.hash,
  timestamp: `0x${BigInt(value.timestamp).toString(16)}`,
});
function mockTransport(): B20Transport & { request: ReturnType<typeof vi.fn> } {
  return {
    request: vi.fn(async (method) => {
      if (method === "eth_chainId") return "0x14a34";
      if (method === "eth_getBlockByNumber") return header();
      if (method === "eth_call") return `0x${"0".repeat(63)}1`;
      throw new Error("unexpected request");
    }),
  };
}

describe("source-pinned classification", () => {
  it("locks selectors and source/ABI identities", () => {
    expect(B20_PROFILE.initializationSelector).toBe(toFunctionSelector(initializationAbi[0]));
    expect(B20_PROFILE.abiDigest).toBe(keccak256(toBytes(canonicalJson(initializationAbi))));
    expect(initializationCalldata(capture().address)).toHaveLength(74);
    expect(B20_PROFILE.source.commit).toHaveLength(40);
  });
  it.each([
    ["0xb200000000000000000000111111111111111111", "asset", "prefix-candidate"],
    ["0xb200000000000000000001111111111111111111", "stablecoin", "prefix-candidate"],
    ["0xb200000000000000000002111111111111111111", "unknown", "unsupported"],
    ["0xb201000000000000000000111111111111111111", "unknown", "not-b20"],
    [B20_PROFILE.factory, "unknown", "not-b20"],
  ])("classifies %s", (address, variant, classification) => {
    expect(classifyB20Address(address.toUpperCase().replace("0X", "0x"), 84532)).toEqual({
      address,
      variant,
      classification,
    });
  });
  it.each(["0xb2", "0x" + "0".repeat(41), "0x" + "z".repeat(40), null])(
    "rejects malformed addresses",
    (value) => {
      expect(() => classifyB20Address(value, 84532)).toThrow("B20_INVALID_INPUT");
    },
  );
  it("does not apply a Base rule to an unsupported chain", () => {
    expect(classifyB20Address(capture().address, 1).classification).toBe("unsupported");
  });
});

describe("inspection artifacts", () => {
  it.each([
    ["asset-initialized", "confirmed-initialized"],
    ["stablecoin-initialized", "confirmed-initialized"],
    ["not-initialized", "not-initialized"],
    ["prefix-only", "prefix-candidate"],
    ["ordinary-address", "not-b20"],
    ["unknown-variant", "unsupported"],
    ["history-unavailable", "unavailable"],
    ["empty-return", "unavailable"],
    ["block-conflict", "conflict"],
  ])("recomputes the %s fixture", (name, classification) => {
    const value = JSON.parse(
      readFileSync(
        new URL(`../../../fixtures/b20/synthetic/${name}.report.json`, import.meta.url),
        "utf8",
      ),
    );
    expect(parseB20Report(value).token.classification).toBe(classification);
    expect(value.readiness).toBe("not-tested");
  });
  it.each(["0x01", `0x${"0".repeat(63)}2`, `0x${"0".repeat(128)}`])(
    "rejects noncanonical bool %s",
    (data) => {
      const value = capture();
      value.initialization!.result = { status: "returned", data: data as `0x${string}` };
      expect(createB20InspectionReport(value).token.classification).toBe("unavailable");
    },
  );
  it("retains acquisition without elevating producer claims", () => {
    const report = createB20InspectionReport({ ...capture(), acquisition: "rpc" });
    expect(validateB20ReportOffline(report)).toMatchObject({
      acquisition: "imported",
      producerAcquisitionClaim: "rpc",
      networkRecheck: "not-performed",
    });
    expect(validateB20ReportOffline(createB20InspectionReport(capture())).acquisition).toBe(
      "synthetic",
    );
  });
  it.each(["verified", "rpcUrl", "unexpected"])("rejects unknown report field %s", (key) => {
    expect(() =>
      parseB20Report({ ...createB20InspectionReport(capture()), [key]: true }),
    ).toThrow();
  });
  it("rejects fabricated summaries, readiness, policy and source identities", () => {
    const report = createB20InspectionReport(capture());
    for (const patch of [
      { readiness: "pass" },
      { schemaVersion: 2 },
      { token: { ...report.token, classification: "not-b20" } },
      { policy: { name: "strict-attribution", decision: "pass" } },
      { protocolSourceDigest: "0x00" },
    ]) {
      expect(() => parseB20Report({ ...report, ...patch })).toThrow();
    }
  });
  it("rejects mismatched requests, state block, chain and hidden provider fields", () => {
    const edits = [
      (x: B20InspectionCapture) => {
        x.initialization!.request.to = x.address;
      },
      (x: B20InspectionCapture) => {
        x.initialization!.request.block.blockHash = `0x${"cd".repeat(32)}`;
      },
      (x: B20InspectionCapture) => {
        x.chainResponse = "0x1";
      },
      (x: B20InspectionCapture) => {
        x.requestedBlock = "124";
      },
      (x: B20InspectionCapture) => {
        Object.assign(x.initialization!.result, { message: "secret" });
      },
    ];
    for (const edit of edits) {
      const value = capture();
      edit(value);
      expect(() => parseB20InspectionCapture(value)).toThrow();
    }
  });
  it("separates unavailable, unsupported, and a false return", () => {
    for (const [reason, expected] of [
      ["unsupported-method", "unsupported"],
      ["rpc-error", "unavailable"],
      ["transport-error", "unavailable"],
    ] as const) {
      const value = capture();
      value.initialization!.result = { status: "failed", reason, rpcCode: -32601 };
      expect(createB20InspectionReport(value).token.classification).toBe(expected);
    }
  });
  it("keeps block integers exact and timestamp outside the evidence digest", () => {
    const value = capture();
    value.block.number = "9007199254740993";
    value.blockAfter.number = value.block.number;
    value.requestedBlock = value.block.number;
    const first = createB20InspectionReport(value);
    const next = createB20InspectionReport(value, "2026-09-30T12:00:00.000Z");
    expect(parseB20Report(first).evidence.block.number).toBe("9007199254740993");
    expect(first.evidenceDigest).toBe(next.evidenceDigest);
    expect(first).toEqual(createB20InspectionReport(value));
  });
  it("rejects noncanonical decimals, timestamps and missing capture fields", () => {
    expect(() =>
      createB20InspectionReport({ ...capture(), capturedAt: "2026-02-30T12:00:00.000Z" }),
    ).toThrow();
    expect(() => createB20InspectionReport({ ...capture(), requestedBlock: "0123" })).toThrow();
    expect(() => createB20InspectionReport({ ...capture(), initialization: undefined })).toThrow();
  });
});

describe("read-only historical acquisition", () => {
  it("pins the state request to the resolved hash and rechecks that height", async () => {
    const transport = mockTransport();
    const report = await inspectB20Token({ address: capture().address, chainId: 84532 }, transport);
    expect(report.token.classification).toBe("confirmed-initialized");
    expect(transport.request.mock.calls).toEqual([
      ["eth_chainId", []],
      ["eth_getBlockByNumber", ["finalized", false]],
      [
        "eth_call",
        [
          { to: B20_PROFILE.factory, data: initializationCalldata(capture().address) },
          { blockHash: capture().block.hash, requireCanonical: true },
        ],
      ],
      ["eth_getBlockByNumber", ["0x7b", false]],
    ]);
  });
  it("stops immediately on a wrong chain", async () => {
    const transport = mockTransport();
    transport.request.mockResolvedValue("0x1");
    await expect(
      inspectB20Token({ address: capture().address, chainId: 84532 }, transport),
    ).rejects.toThrow("B20_CHAIN_MISMATCH");
    expect(transport.request).toHaveBeenCalledTimes(1);
  });
  it("does not probe unknown variants or unsupported chains", async () => {
    const transport = mockTransport();
    await inspectB20Token(
      { address: "0xb200000000000000000002111111111111111111", chainId: 84532 },
      transport,
    );
    expect(transport.request.mock.calls.some(([method]) => method === "eth_call")).toBe(false);
  });
  it("does not substitute latest when finalized is unavailable", async () => {
    const transport = mockTransport();
    transport.request.mockResolvedValueOnce("0x14a34").mockResolvedValueOnce(null);
    await expect(
      inspectB20Token({ address: capture().address, chainId: 84532 }, transport),
    ).rejects.toThrow();
    expect(transport.request).toHaveBeenCalledTimes(2);
  });
  it("keeps pruned history and hash-selector failures inconclusive without fallback", async () => {
    for (const reason of ["unavailable-history", "rpc-error"] as const) {
      const transport = mockTransport();
      transport.request
        .mockResolvedValueOnce("0x14a34")
        .mockResolvedValueOnce(header())
        .mockRejectedValueOnce(new B20RpcError(reason, -32000));
      const report = await inspectB20Token(
        { address: capture().address, chainId: 84532, block: "123" },
        transport,
      );
      expect(report.token.classification).toBe("unavailable");
      expect(transport.request).toHaveBeenCalledTimes(4);
    }
  });
  it("records reorgs as conflicts", async () => {
    const transport = mockTransport();
    transport.request
      .mockResolvedValueOnce("0x14a34")
      .mockResolvedValueOnce(header())
      .mockResolvedValueOnce(`0x${"0".repeat(63)}1`)
      .mockResolvedValueOnce(header({ ...capture().block, hash: `0x${"cd".repeat(32)}` }));
    const result = await inspectB20Token({ address: capture().address, chainId: 84532 }, transport);
    expect(result).toMatchObject({
      consistency: "conflicting",
      policy: { decision: "fail" },
      token: { classification: "conflict" },
    });
  });
  it("sanitizes errors thrown by custom transports", async () => {
    const transport = mockTransport();
    transport.request
      .mockResolvedValueOnce("0x14a34")
      .mockResolvedValueOnce(header())
      .mockRejectedValueOnce(new Error("https://private.example/secret"));
    const result = await inspectB20Token({ address: capture().address, chainId: 84532 }, transport);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(result.token.classification).toBe("unavailable");
  });
  it("rechecks original blocks and preserves source provenance", async () => {
    const report = createB20InspectionReport({ ...capture(), acquisition: "rpc" });
    const transport = mockTransport();
    const result = await recheckB20Report(report, transport);
    expect(result).toMatchObject({ valid: true, status: "matched" });
    expect(transport.request.mock.calls[1]).toEqual(["eth_getBlockByNumber", ["0x7b", false]]);
    expect(
      (await recheckB20Report(createB20InspectionReport(capture()), mockTransport())).valid,
    ).toBe(false);
    expect(report).toEqual(createB20InspectionReport({ ...capture(), acquisition: "rpc" }));
  });

  it("does not call a failed historical recheck an evidence conflict", async () => {
    const report = createB20InspectionReport({ ...capture(), acquisition: "rpc" });
    const transport = mockTransport();
    transport.request
      .mockResolvedValueOnce("0x14a34")
      .mockResolvedValueOnce(header())
      .mockRejectedValueOnce(new B20RpcError("unavailable-history", -32000));
    expect(await recheckB20Report(report, transport)).toMatchObject({
      valid: false,
      status: "inconclusive",
    });
  });

  it("detects a changed initialization result during recheck", async () => {
    const report = createB20InspectionReport({ ...capture(), acquisition: "rpc" });
    const transport = mockTransport();
    transport.request
      .mockResolvedValueOnce("0x14a34")
      .mockResolvedValueOnce(header())
      .mockResolvedValueOnce(`0x${"0".repeat(64)}`);
    expect(await recheckB20Report(report, transport)).toMatchObject({
      valid: false,
      status: "conflict",
    });
  });
});
