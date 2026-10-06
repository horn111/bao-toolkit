import { offlineWallet, recipient } from "../src/transport.js";

export async function sendBrokenTransfer() {
  const { wallet, sent } = offlineWallet();
  await wallet.sendTransaction({ to: recipient, value: 0n, data: "0x1234" });
  return sent[0];
}
