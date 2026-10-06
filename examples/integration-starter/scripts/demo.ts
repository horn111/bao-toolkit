import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { doctorCommand } from "@base-attribution-os/cli";
import { validateAttribution } from "@base-attribution-os/core";
import { sendBrokenTransfer } from "../fixtures/broken.js";
import { sendFixedTransfer } from "../src/fixed.js";

const root = fileURLToPath(new URL("..", import.meta.url));
for (const [name, send, config, expected] of [
  ["broken", sendBrokenTransfer, "bao.broken.json", false],
  ["fixed", sendFixedTransfer, "bao.config.json", true],
] as const) {
  const report = await doctorCommand({ path: root, config, profile: "strict" });
  const transaction = await send();
  const calldata = validateAttribution({ calldata: transaction.data ?? "0x", expect: "bc_abc123" });
  assert.equal(report.ok, expected, `${name}: unexpected Doctor result`);
  assert.equal(calldata.ok, expected, `${name}: unexpected outgoing calldata`);
  console.log(
    `${name}: Doctor ${report.ok ? "passes" : "fails"}; captured calldata ${calldata.ok ? "contains" : "omits"} bc_abc123`,
  );
}
console.log("Offline reproduction passed. No RPC connection, keys, funds, or onchain evidence.");
