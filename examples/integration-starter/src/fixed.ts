import { Attribution } from "ox/erc8021";
import { offlineWallet, recipient } from "./transport.js";

export async function sendFixedTransfer() {
  const { wallet, sent } = offlineWallet();
  await wallet.sendTransaction({
    to: recipient,
    value: 0n,
    data: "0x1234",
    dataSuffix: Attribution.toDataSuffix({ codes: ["bc_abc123"] }),
  });
  return sent[0];
}
