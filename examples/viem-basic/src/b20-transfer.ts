import { encodeFunctionData, parseAbi, type Address } from "viem";
import { withAttributionSuffix } from "@base-attribution-os/viem";

const transferAbi = parseAbi(["function transfer(address to, uint256 amount) returns (bool)"]);

/** Prepare requests only. Token existence and native execution need separate evidence. */
export function prepareB20TransferPair(
  token: Address,
  recipient: Address,
  amount: bigint,
  builderCode: string,
) {
  const broken = {
    to: token,
    data: encodeFunctionData({
      abi: transferAbi,
      functionName: "transfer",
      args: [recipient, amount],
    }),
  };
  const fixed = withAttributionSuffix(broken, { codes: [builderCode] });
  return { broken, fixed };
}
