import { encodeFunctionData, keccak256, toBytes, toFunctionSelector } from "viem/utils";
import { canonicalJson, chain, hex } from "./validation.js";

/** Curated from IB20Factory.sol at the source commit below. No upcoming methods. */
export const initializationAbi = [
  {
    type: "function",
    name: "isB20Initialized",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const source = {
  repository: "https://github.com/base/base-std",
  commit: "150532313c10a410fd81d74d5f1ca0df43865822",
  hashEncoding: "sha256 of UTF-8 source normalized to LF with final newline",
  files: [
    {
      path: "src/interfaces/IB20Factory.sol",
      sha256: "15209e20f635cae06c306b368e4487d0315e02cbedf953c72de4ed9a806dab1f",
    },
    {
      path: "src/StdPrecompiles.sol",
      sha256: "b51fda6154c32ef99f26fa56495a265585fbd656eb849f37dfc243f505126a9b",
    },
    {
      path: "test/lib/mocks/MockB20Factory.sol",
      sha256: "5e104c7b74ed625b0eac9dbe5474f68c935d0e6b1c187ae0447c9ce497916a1d",
    },
    {
      path: "CHANGELOG.md",
      sha256: "a3521cc289d4385243c1c99343bef28fae17babf24fc3b733416d89e21eabe13",
    },
  ],
} as const;

export const B20_PROFILE = {
  id: "base-std-1505323-inspect-v1",
  source,
  sourceDigest: keccak256(toBytes(canonicalJson(source))),
  abiDigest: keccak256(toBytes(canonicalJson(initializationAbi))),
  factory: "0xb20f000000000000000000000000000000000000" as const,
  prefix: "0xb2000000000000000000",
  variantByte: 10,
  chains: [8453, 84532] as const,
  initializationSelector: toFunctionSelector("isB20Initialized(address)"),
  runtimeQualification: "not-qualified" as const,
  // Source references are not an activation-height registry. Capability is observed per call.
  activationBlocks: null,
} as const;

export type B20Variant = "asset" | "stablecoin" | "unknown";
export type AddressClassification = "prefix-candidate" | "not-b20" | "unsupported";

export function classifyB20Address(
  value: unknown,
  chainId: number,
): {
  address: `0x${string}`;
  variant: B20Variant;
  classification: AddressClassification;
} {
  const address = hex(value, 20, "address");
  chain(chainId);
  if (!(B20_PROFILE.chains as readonly number[]).includes(chainId)) {
    return { address, variant: "unknown", classification: "unsupported" };
  }
  if (!address.startsWith(B20_PROFILE.prefix)) {
    return { address, variant: "unknown", classification: "not-b20" };
  }
  const variantByte = address.slice(22, 24);
  const variant = variantByte === "00" ? "asset" : variantByte === "01" ? "stablecoin" : "unknown";
  return {
    address,
    variant,
    classification: variant === "unknown" ? "unsupported" : "prefix-candidate",
  };
}

export function initializationCalldata(address: unknown): `0x${string}` {
  return encodeFunctionData({
    abi: initializationAbi,
    functionName: "isB20Initialized",
    args: [hex(address, 20, "address")],
  });
}
