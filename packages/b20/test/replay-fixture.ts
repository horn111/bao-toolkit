import { readFileSync } from "node:fs";
import { appendDataSuffix } from "@base-attribution-os/core";
import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  parseAbiParameters,
} from "viem/utils";
import { b20FactoryAbi, b20TokenAbi, B20_REPLAY_PROFILE } from "../src/replay-protocol.js";
import { initializationCalldata } from "../src/protocol.js";
import type { B20InspectionCapture } from "../src/types.js";
import type {
  B20ReplayCapture,
  B20LogEvidence,
  B20TransactionCapture,
} from "../src/replay-types.js";
import type { Hex } from "../src/validation.js";

export const TOKEN = "0xb200000000000000000000111111111111111111" as const;
export const SENDER = "0x2222222222222222222222222222222222222222" as const;
export const RECIPIENT = "0x3333333333333333333333333333333333333333" as const;
export const AMOUNT = (1n << 96n) + 1n;
export const TX = `0x${"11".repeat(32)}` as Hex;
export const TX2 = `0x${"22".repeat(32)}` as Hex;
export const inspection = (): B20InspectionCapture =>
  JSON.parse(
    readFileSync(
      new URL("../../../fixtures/b20/synthetic/asset-initialized.capture.json", import.meta.url),
      "utf8",
    ),
  );

export function replayFixture(attributed = true): B20ReplayCapture {
  const token = inspection();
  const input = encodeFunctionData({
    abi: b20TokenAbi,
    functionName: "transfer",
    args: [RECIPIENT, AMOUNT],
  });
  const row: B20TransactionCapture = {
    hash: TX,
    transaction: {
      hash: TX,
      from: SENDER,
      to: TOKEN,
      input: attributed ? appendDataSuffix(input, { codes: ["bc_example"] }) : input,
      blockHash: token.block.hash,
      blockNumber: token.block.number,
      transactionIndex: "1",
    },
    receipt: {
      transactionHash: TX,
      transactionIndex: "1",
      blockHash: token.block.hash,
      blockNumber: token.block.number,
      status: "success",
      logs: [],
    },
    block: token.block,
    blockAfter: token.blockAfter,
    tokens: [token],
    error: null,
  };
  row.receipt!.logs.push({
    address: TOKEN,
    topics: encodeEventTopics({
      abi: b20TokenAbi,
      eventName: "Transfer",
      args: { from: SENDER, to: RECIPIENT },
    }) as Hex[],
    data: encodeAbiParameters(parseAbiParameters("uint256"), [AMOUNT]),
    logIndex: "0",
    removed: false,
    transactionHash: TX,
    transactionIndex: "1",
    blockHash: token.block.hash,
    blockNumber: token.block.number,
  });
  return {
    kind: "bao.b20-replay-capture",
    schemaVersion: 1,
    input: {
      kind: "bao.b20-input",
      schemaVersion: 1,
      chainId: 84532,
      selection: {
        mode: "sample",
        description: "Synthetic direct transfer fixture; no network observation.",
        completeness: "unknown",
      },
      transactions: [{ hash: TX }],
    },
    protocolProfileId: B20_REPLAY_PROFILE.id,
    protocolSourceDigest: B20_REPLAY_PROFILE.sourceDigest,
    acquisition: "synthetic",
    capturedAt: token.capturedAt,
    chainResponse: token.chainResponse,
    transactions: [row],
  };
}
export function addCreation(capture: B20ReplayCapture, index = "0", stablecoin = false) {
  const row = structuredClone(capture.transactions[0]);
  row.hash = TX2;
  row.transaction!.hash = TX2;
  row.receipt!.transactionHash = TX2;
  row.transaction!.transactionIndex = index;
  row.receipt!.transactionIndex = index;
  row.receipt!.status = "success";
  row.transaction!.to = B20_REPLAY_PROFILE.factory;
  row.transaction!.input = appendDataSuffix(
    encodeFunctionData({
      abi: b20FactoryAbi,
      functionName: "createB20",
      args: [stablecoin ? 1 : 0, `0x${"0".repeat(64)}`, "0x", []],
    }),
    { codes: ["bc_example"] },
  );
  const tokenAddress = stablecoin ? ("0xb200000000000000000001111111111111111111" as Hex) : TOKEN;
  row.tokens[0].address = tokenAddress;
  row.tokens[0].initialization!.request.data = initializationCalldata(tokenAddress);
  const variantEventParams = stablecoin
    ? encodeAbiParameters(parseAbiParameters("(uint8 version, string currency)"), [
        { version: 1, currency: "USD" },
      ])
    : "0x";
  const log: B20LogEvidence = {
    address: B20_REPLAY_PROFILE.factory,
    topics: encodeEventTopics({
      abi: b20FactoryAbi,
      eventName: "B20Created",
      args: { token: tokenAddress, variant: stablecoin ? 1 : 0 },
    }) as Hex[],
    data: encodeAbiParameters(parseAbiParameters("string,string,uint8,bytes"), [
      "Synthetic Token",
      "SYN",
      stablecoin ? 6 : 18,
      variantEventParams,
    ]),
    logIndex: BigInt(index) < 1n ? "0" : "10",
    removed: false,
    transactionHash: TX2,
    transactionIndex: index,
    blockHash: row.block!.hash,
    blockNumber: row.block!.number,
  };
  row.receipt!.logs = [log];
  if (BigInt(index) < 1n)
    for (const existing of capture.transactions[0].receipt!.logs)
      existing.logIndex = (BigInt(existing.logIndex) + 1n).toString();
  capture.input.transactions.push({ hash: TX2 });
  capture.transactions.push(row);
  return row;
}
