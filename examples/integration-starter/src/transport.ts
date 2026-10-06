import {
  createWalletClient,
  custom,
  type CustomTransport,
  type Hex,
  type JsonRpcAccount,
  type WalletClient,
} from "viem";
import { baseSepolia } from "viem/chains";

export const recipient = "0x2222222222222222222222222222222222222222" as const;

/** Records RPC requests locally. It cannot sign, send, or fetch anything. */
export function offlineWallet(): {
  wallet: WalletClient<CustomTransport, typeof baseSepolia, JsonRpcAccount>;
  sent: Array<{ to: string; data?: Hex }>;
} {
  const sent: Array<{ to: string; data?: Hex }> = [];
  const wallet = createWalletClient({
    account: "0x1111111111111111111111111111111111111111",
    chain: baseSepolia,
    transport: custom(
      {
        async request({ method, params }) {
          if (method === "eth_chainId") return "0x14a34";
          if (method === "eth_sendTransaction") {
            const [transaction] = params as [{ to: string; data?: Hex }];
            sent.push(transaction);
            // A local placeholder, never a transaction receipt or onchain proof.
            return `0x${"ab".repeat(32)}`;
          }
          throw new Error(`Offline transport does not support ${method}`);
        },
      },
      { retryCount: 0 },
    ),
  });
  return { wallet, sent };
}
