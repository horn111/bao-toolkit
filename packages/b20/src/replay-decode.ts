import {
  decodeAbiParameters,
  decodeEventLog,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  parseAbiParameters,
} from "viem/utils";
import { decodeAttributionFromCalldata, validateBuilderCodes } from "@base-attribution-os/core";
import { classifyB20Address } from "./protocol.js";
import { b20FactoryAbi, b20TokenAbi, B20_REPLAY_PROFILE } from "./replay-protocol.js";
import type {
  B20LogEvidence,
  B20ObservedEvent,
  B20Operation,
  B20TransactionCapture,
  B20TransactionEvidence,
} from "./replay-types.js";
import type { Hex } from "./validation.js";

const factoryData = parseAbiParameters(
  "string name, string symbol, uint8 decimals, bytes variantEventParams",
);
const stablecoinData = parseAbiParameters("(uint8 version, string currency)");
const amountData = parseAbiParameters("uint256 amount");
const topicAddress = (address: string): Hex =>
  `0x${address.slice(2).toLowerCase().padStart(64, "0")}`;

/** Strict ABI round-trips reject malformed padding, overlapping offsets and trailing payload. */
export function decodeB20FactoryEvent(
  log: B20LogEvidence,
  chainId: number,
): B20ObservedEvent | null {
  if (
    log.address !== B20_REPLAY_PROFILE.factory ||
    log.topics[0] !== B20_REPLAY_PROFILE.creationTopic
  )
    return null;
  try {
    const { args } = decodeEventLog({
      abi: b20FactoryAbi,
      eventName: "B20Created",
      topics: log.topics as [Hex, ...Hex[]],
      data: log.data,
      strict: true,
    });
    const token = args.token.toLowerCase() as Hex;
    const candidate = classifyB20Address(token, chainId);
    if (
      log.topics.length !== 3 ||
      log.topics[1] !== topicAddress(token) ||
      log.topics[2] !== `0x${BigInt(args.variant).toString(16).padStart(64, "0")}` ||
      candidate.classification !== "prefix-candidate" ||
      (candidate.variant === "asset" ? args.variant !== 0 : args.variant !== 1)
    )
      return null;
    if (
      args.name.length < 1 ||
      args.symbol.length < 1 ||
      args.name.length > 256 ||
      args.symbol.length > 256 ||
      args.decimals < 6 ||
      args.decimals > 18
    )
      return null;
    if (
      encodeAbiParameters(factoryData, [
        args.name,
        args.symbol,
        args.decimals,
        args.variantEventParams,
      ]) !== log.data
    )
      return null;
    let currency: string | null = null;
    if (args.variant === 0) {
      if (args.variantEventParams !== "0x") return null;
    } else {
      const [identity] = decodeAbiParameters(stablecoinData, args.variantEventParams);
      if (
        identity.version !== 1 ||
        !/^[A-Z]{1,64}$/.test(identity.currency) ||
        args.decimals !== 6 ||
        encodeAbiParameters(stablecoinData, [identity]) !== args.variantEventParams
      )
        return null;
      currency = identity.currency;
    }
    return {
      token,
      logIndex: log.logIndex,
      event: "B20Created",
      from: null,
      to: null,
      amount: null,
      memo: null,
      metadata: { name: args.name, symbol: args.symbol, decimals: args.decimals, currency },
    };
  } catch {
    return null;
  }
}

export function decodeB20TokenEvent(log: B20LogEvidence): B20ObservedEvent | null {
  try {
    const decoded = decodeEventLog({
      abi: b20TokenAbi,
      topics: log.topics as [Hex, ...Hex[]],
      data: log.data,
      strict: true,
    });
    const base = { token: log.address, logIndex: log.logIndex, metadata: null };
    if (decoded.eventName === "Memo") {
      if (
        log.topics.length !== 3 ||
        log.data !== "0x" ||
        log.topics[1] !== topicAddress(decoded.args.caller) ||
        log.topics[2] !== decoded.args.memo
      )
        return null;
      return {
        ...base,
        event: "Memo",
        from: decoded.args.caller.toLowerCase() as Hex,
        to: null,
        amount: null,
        memo: decoded.args.memo,
      };
    }
    const from = (
      decoded.eventName === "Transfer" ? decoded.args.from : decoded.args.owner
    ).toLowerCase() as Hex;
    const to = (
      decoded.eventName === "Transfer" ? decoded.args.to : decoded.args.spender
    ).toLowerCase() as Hex;
    if (
      log.topics.length !== 3 ||
      log.topics[1] !== topicAddress(from) ||
      log.topics[2] !== topicAddress(to) ||
      log.data !== encodeAbiParameters(amountData, [decoded.args.amount])
    )
      return null;
    return {
      ...base,
      event: decoded.eventName,
      from,
      to,
      amount: decoded.args.amount.toString(),
      memo: null,
    };
  } catch {
    return null;
  }
}

export function decodeB20Operation(tx: B20TransactionEvidence): B20Operation | null {
  try {
    const attribution = decodeAttributionFromCalldata(tx.input);
    const body =
      attribution && validateBuilderCodes(attribution.codes).length === 0
        ? attribution.transactionData
        : tx.input;
    const decoded = decodeFunctionData({ abi: b20TokenAbi, data: body });
    // Fixed-argument methods permit trailing attribution bytes, as the EVM ABI does.
    const encoded = encodeFunctionData({ abi: b20TokenAbi, ...decoded }).toLowerCase();
    if (!body.startsWith(encoded)) return null;
    const args = decoded.args;
    if (
      decoded.functionName === "transferFrom" ||
      decoded.functionName === "transferFromWithMemo"
    ) {
      return {
        method: decoded.functionName,
        from: String(args[0]).toLowerCase() as Hex,
        to: String(args[1]).toLowerCase() as Hex,
        amount: String(args[2]),
        memo: decoded.functionName === "transferFromWithMemo" ? (String(args[3]) as Hex) : null,
      };
    }
    return {
      method: decoded.functionName,
      from: tx.from,
      to: String(args[0]).toLowerCase() as Hex,
      amount: String(args[1]),
      memo: decoded.functionName === "transferWithMemo" ? (String(args[2]) as Hex) : null,
    };
  } catch {
    return null;
  }
}

export function isDirectB20Creation(tx: B20TransactionEvidence): boolean {
  if (tx.to !== B20_REPLAY_PROFILE.factory) return false;
  try {
    const attribution = decodeAttributionFromCalldata(tx.input);
    const body =
      attribution && validateBuilderCodes(attribution.codes).length === 0
        ? attribution.transactionData
        : tx.input;
    const decoded = decodeFunctionData({ abi: b20FactoryAbi, data: body });
    return (
      decoded.functionName === "createB20" &&
      body.startsWith(encodeFunctionData({ abi: b20FactoryAbi, ...decoded }).toLowerCase())
    );
  } catch {
    return false;
  }
}

/** Candidate discovery does not confer initialization or receipt validity. */
export function b20CandidateAddresses(capture: B20TransactionCapture, chainId: number): Hex[] {
  const addresses = new Set<Hex>();
  const add = (address: Hex | null | undefined) => {
    if (
      address &&
      address !== B20_REPLAY_PROFILE.factory &&
      classifyB20Address(address, chainId).classification !== "not-b20"
    )
      addresses.add(address);
  };
  add(capture.transaction?.to);
  for (const log of capture.receipt?.logs ?? []) {
    if ((B20_REPLAY_PROFILE.tokenTopics as readonly string[]).includes(log.topics[0]))
      add(log.address);
    add(decodeB20FactoryEvent(log, chainId)?.token);
  }
  return [...addresses].sort();
}
