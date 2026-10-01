import { describe, expect, it } from "vitest";
import { createDataSuffix } from "@base-attribution-os/core";
import {
  activityQuery,
  formatEth,
  normalizeActivityRows,
  parseActivityImport,
  summarizeActivity,
  type ActivityDataset,
} from "./activity";

const code = "bc_test";
const hash = "0x" + "1".repeat(64);
const wallet = "0x" + "2".repeat(40);
const recipient = "0x" + "3".repeat(40);
const now = "2026-10-01T12:00:00.000Z";
const row = {
  tx_hash: hash,
  chain_id: 8453,
  block_time: "2026-10-01 09:00:00 UTC",
  sender: wallet,
  recipient,
  success: true,
  codes_array: [code],
  fee_wei: "1000000000000000",
};

function dataset(rows: unknown[]): ActivityDataset {
  return parseActivityImport(JSON.stringify(rows), code, 8453, now);
}

describe("app activity calculations", () => {
  it("separates networks and uses only known execution outcomes in the success rate", () => {
    const summary = summarizeActivity(
      dataset([
        row,
        { ...row, tx_hash: "0x" + "4".repeat(64), success: false },
        { ...row, tx_hash: "0x" + "5".repeat(64), success: "unknown", sender: undefined },
        { ...row, tx_hash: "0x" + "6".repeat(64), chain_id: 84532 },
      ]),
      7,
      8453,
    );
    expect(summary).toMatchObject({
      total: 3,
      successful: 1,
      reverted: 1,
      statusKnown: 2,
      successRate: 50,
      activeWallets: 1,
      walletDataMissing: true,
    });
    expect(summary.daily.at(-1)).toMatchObject({ operations: 3, wallets: 1 });
  });

  it("uses UTC calendar boundaries and keeps undated evidence out of the chart", () => {
    const summary = summarizeActivity(
      dataset([
        row,
        { ...row, tx_hash: "0x" + "4".repeat(64), block_time: "2026-09-25T00:00:00Z" },
        { ...row, tx_hash: "0x" + "5".repeat(64), block_time: "2026-09-24T23:59:59Z" },
        { ...row, tx_hash: "0x" + "6".repeat(64), block_time: "2026-10-01T12:00:01Z" },
        { ...row, tx_hash: "0x" + "7".repeat(64), block_time: undefined },
      ]),
      7,
      8453,
    );
    expect(summary.periodStart).toBe("2026-09-25T00:00:00.000Z");
    expect(summary.total).toBe(3);
    expect(summary.undated).toBe(1);
    expect(summary.daily.reduce((sum, day) => sum + day.operations, 0)).toBe(2);
  });

  it("counts UserOperations once without charging every operation the bundler's fee", () => {
    const summary = summarizeActivity(
      dataset([
        row,
        {
          ...row,
          user_op_hash: "0x" + "a".repeat(64),
          user_op_sender: wallet,
          actual_gas_cost: "100",
        },
        {
          ...row,
          user_op_hash: "0x" + "b".repeat(64),
          user_op_sender: wallet,
          actual_gas_cost: "200",
        },
      ]),
      30,
      8453,
    );
    expect(summary).toMatchObject({
      total: 2,
      transactions: 1,
      userOperations: 2,
      activeWallets: 1,
      repeatWallets: 1,
      feeWei: "300",
    });
  });

  it("does not substitute bundler fields for missing UserOperation fields", () => {
    const operation = normalizeActivityRows(
      [
        {
          ...row,
          fee_wei: undefined,
          success: undefined,
          receipt_status: "0x1",
          gas_used: "100",
          gas_price: "100",
          l1_fee: "20",
          user_op_hash: "0x" + "a".repeat(64),
        },
      ],
      code,
      8453,
    )[0];
    expect(operation).toMatchObject({
      wallet: null,
      success: null,
      feeWei: null,
    });
    const summary = summarizeActivity(dataset([operation]), 7, 8453);
    expect(summary).toMatchObject({ activeWallets: null, successRate: null, feeWei: null });
  });

  it("deduplicates identical rows and rejects conflicting evidence", () => {
    expect(normalizeActivityRows([row, row], code, 8453)).toHaveLength(1);
    expect(() => normalizeActivityRows([row, { ...row, success: false }], code, 8453)).toThrow(
      "Conflicting rows",
    );
  });

  it("decodes raw calldata instead of trusting a supplied Builder Code column", () => {
    const decoded = normalizeActivityRows(
      [
        {
          ...row,
          codes_array: ["bc_forged"],
          calldata: createDataSuffix({ codes: [code] }),
        },
      ],
      code,
      8453,
    )[0];
    expect(decoded).toMatchObject({ codes: [code], attribution: "decoded" });
    const missing = normalizeActivityRows([{ ...row, calldata: "0x1234" }], code, 8453)[0];
    expect(missing.codes).toEqual([]);
    expect(summarizeActivity(dataset([missing]), 7, 8453)).toMatchObject({ total: 0, omitted: 1 });
  });

  it("keeps fee sums exact and refuses incomplete gas calculations", () => {
    const operations = normalizeActivityRows(
      [
        { ...row, fee_wei: "9007199254740993" },
        {
          ...row,
          tx_hash: "0x" + "4".repeat(64),
          fee_wei: undefined,
          gas_used: "3",
          gas_price: "5",
          l1_fee: "2",
        },
        {
          ...row,
          tx_hash: "0x" + "5".repeat(64),
          fee_wei: undefined,
          gas_used: "3",
          gas_price: "5",
        },
      ],
      code,
      8453,
    );
    const summary = summarizeActivity(dataset(operations), 7, 8453);
    expect(summary.feeWei).toBe("9007199254741010");
    expect(summary.feeRows).toBe(2);
    expect(formatEth("1")).toBe("<0.000001");
    expect(formatEth(null)).toBe("Unavailable");
  });

  it("reads Dune JSON and quoted CSV exports", () => {
    expect(
      parseActivityImport(JSON.stringify({ result: { rows: [row] } }), code, 8453, now).operations,
    ).toHaveLength(1);
    const csv =
      "tx_hash,chain_id,codes_array,success,block_time\r\n" +
      hash +
      ',8453,"[""bc_test""]",true,2026-10-01 09:00:00 UTC';
    expect(parseActivityImport(csv, code, 8453, now).operations[0]).toMatchObject({
      codes: [code],
      success: true,
      timestamp: "2026-10-01T09:00:00.000Z",
    });
    expect(() => parseActivityImport("tx_hash,chain_id\n" + hash, code, 8453, now)).toThrow(
      "different number",
    );
    expect(() => parseActivityImport("", code, 8453, now)).toThrow("empty");
    expect(
      normalizeActivityRows([{ ...row, block_time: "2026-10-01 09:00:00" }], code, 8453)[0]
        .timestamp,
    ).toBe("2026-10-01T09:00:00.000Z");
  });

  it("reimports exported operations without losing their fees or historical window", () => {
    const original = dataset([
      {
        ...row,
        user_op_hash: "0x" + "a".repeat(64),
        user_op_sender: wallet,
        actual_gas_cost: "9007199254740993",
      },
    ]);
    const restored = parseActivityImport(
      JSON.stringify(original),
      code,
      8453,
      "2026-11-01T00:00:00Z",
    );
    expect(restored.operations).toEqual(original.operations);
    expect(restored.rangeEnd).toBe(now);
    expect(restored.complete).toBe(false);
  });

  it("validates query choices and rejects hashes that cannot form explorer links", () => {
    expect(activityQuery(new URLSearchParams({ code, days: "90", network: "84532" }))).toEqual({
      builderCode: code,
      days: 90,
      network: 84532,
    });
    const invalidQueries: Record<string, string>[] = [
      { code: "" },
      { code, days: "365" },
      { code, network: "1" },
    ];
    for (const params of invalidQueries) {
      expect(() => activityQuery(new URLSearchParams(params))).toThrow();
    }
    expect(() =>
      normalizeActivityRows([{ ...row, tx_hash: "javascript:alert(1)" }], code, 8453),
    ).toThrow("transaction hash");
  });
});
