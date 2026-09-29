import { parseAbi, keccak256, toBytes, toEventSelector } from "viem/utils";
import { B20_PROFILE } from "./protocol.js";
import { canonicalJson } from "./validation.js";

export const b20TokenAbi = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferWithMemo(address to, uint256 amount, bytes32 memo) returns (bool)",
  "function transferFromWithMemo(address from, address to, uint256 amount, bytes32 memo) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 amount)",
  "event Approval(address indexed owner, address indexed spender, uint256 amount)",
  "event Memo(address indexed caller, bytes32 indexed memo)",
]);
export const b20FactoryAbi = parseAbi([
  "function createB20(uint8 variant, bytes32 salt, bytes params, bytes[] initCalls) payable returns (address token)",
  "event B20Created(address indexed token, uint8 indexed variant, string name, string symbol, uint8 decimals, bytes variantEventParams)",
]);
const source = {
  inspectionSourceDigest: B20_PROFILE.sourceDigest,
  repository: B20_PROFILE.source.repository,
  commit: B20_PROFILE.source.commit,
  tokenInterface: {
    path: "src/interfaces/IB20.sol",
    sha256: "949d7708e3b8c73e9f5188e16ea4477e7ca59e5acd0a54881119ccf6b9806f6a",
  },
  abiDigest: keccak256(toBytes(canonicalJson({ token: b20TokenAbi, factory: b20FactoryAbi }))),
};
export const B20_REPLAY_PROFILE = {
  id: "base-std-1505323-replay-v1",
  source,
  sourceDigest: keccak256(toBytes(canonicalJson(source))),
  factory: B20_PROFILE.factory,
  creationTopic: toEventSelector(b20FactoryAbi[1]),
  tokenTopics: b20TokenAbi
    .filter((entry) => entry.type === "event")
    .map((entry) => toEventSelector(entry)),
} as const;
