import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  replayFixture,
  addCreation,
  TOKEN,
  RECIPIENT,
  AMOUNT,
} from "../packages/b20/test/replay-fixture.js";
import { prepareB20TransferPair } from "../examples/viem-basic/src/b20-transfer.js";
import { createB20ReplayReport } from "../packages/b20/src/replay.js";
import { B20_REPLAY_PROFILE } from "../packages/b20/src/replay-protocol.js";
import type { B20ReplayCapture } from "../packages/b20/src/replay-types.js";

const directory = path.resolve("fixtures/b20/synthetic/replay");
mkdirSync(directory, { recursive: true });
function write(name: string, capture: B20ReplayCapture) {
  writeFileSync(
    path.join(directory, `${name}.capture.json`),
    `${JSON.stringify(capture, null, 2)}\n`,
  );
  writeFileSync(
    path.join(directory, `${name}.report.json`),
    `${JSON.stringify(createB20ReplayReport(capture, { expectedCode: "bc_example" }), null, 2)}\n`,
  );
}
const pair = prepareB20TransferPair(TOKEN, RECIPIENT, AMOUNT, "bc_example");
const fixedCapture = replayFixture();
fixedCapture.transactions[0].transaction!.input = pair.fixed.data;
write("direct-fixed", fixedCapture);
const brokenCapture = replayFixture(false);
brokenCapture.transactions[0].transaction!.input = pair.broken.data;
write("direct-broken", brokenCapture);
const factory = replayFixture();
addCreation(factory);
write("factory-and-transfer", factory);
const reverted = replayFixture();
reverted.transactions[0].receipt!.status = "reverted";
reverted.transactions[0].receipt!.logs = [];
write("reverted-unresolved", reverted);
const eventOnly = replayFixture();
eventOnly.transactions[0].transaction!.to = "0x4444444444444444444444444444444444444444";
write("router-event-only", eventOnly);
writeFileSync(
  path.resolve("fixtures/b20/replay-protocol-lock.json"),
  `${JSON.stringify(B20_REPLAY_PROFILE, null, 2)}\n`,
);
