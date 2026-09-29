import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  B20_PROFILE,
  createB20InspectionReport,
  initializationCalldata,
  type B20InspectionCapture,
} from "../packages/b20/src/index.js";

const root = path.resolve("fixtures/b20");
mkdirSync(path.join(root, "synthetic"), { recursive: true });
const address = "0xb200000000000000000000111111111111111111";
const block = {
  number: "123",
  hash: `0x${"ab".repeat(32)}` as const,
  timestamp: "1790683200",
  statePosition: "end-of-block" as const,
};
const base: B20InspectionCapture = {
  kind: "bao.b20-inspection-capture",
  schemaVersion: 1,
  chainId: 84532,
  address,
  protocolProfileId: B20_PROFILE.id,
  protocolSourceDigest: B20_PROFILE.sourceDigest,
  acquisition: "synthetic",
  capturedAt: "2026-09-29T12:00:00.000Z",
  requestedBlock: "123",
  chainResponse: "0x14a34",
  block,
  blockAfter: block,
  initialization: {
    id: "initialization",
    method: "eth_call",
    request: {
      to: B20_PROFILE.factory,
      data: initializationCalldata(address),
      block: { blockHash: block.hash, requireCanonical: true },
    },
    result: { status: "returned", data: `0x${"0".repeat(63)}1` },
  },
};
function save(name: string, capture: B20InspectionCapture) {
  const report = createB20InspectionReport(capture);
  writeFileSync(
    path.join(root, "synthetic", `${name}.capture.json`),
    `${JSON.stringify(capture, null, 2)}\n`,
  );
  writeFileSync(
    path.join(root, "synthetic", `${name}.report.json`),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}
save("asset-initialized", base);
const stablecoin = structuredClone(base);
stablecoin.address = "0xb200000000000000000001222222222222222222";
stablecoin.initialization!.request.data = initializationCalldata(stablecoin.address);
save("stablecoin-initialized", stablecoin);
const uninitialized = structuredClone(base);
uninitialized.initialization!.result = { status: "returned", data: `0x${"0".repeat(64)}` };
save("not-initialized", uninitialized);
save("prefix-only", { ...base, initialization: null });
save("ordinary-address", {
  ...base,
  address: "0x1111111111111111111111111111111111111111",
  initialization: null,
});
save("unknown-variant", {
  ...base,
  address: "0xb200000000000000000002111111111111111111",
  initialization: null,
});
const unavailable = structuredClone(base);
unavailable.initialization!.result = {
  status: "failed",
  reason: "unavailable-history",
  rpcCode: -32000,
};
save("history-unavailable", unavailable);
const malformed = structuredClone(base);
malformed.initialization!.result = { status: "returned", data: "0x" };
save("empty-return", malformed);
save("block-conflict", { ...base, blockAfter: { ...block, hash: `0x${"cd".repeat(32)}` } });
writeFileSync(path.join(root, "protocol-lock.json"), `${JSON.stringify(B20_PROFILE, null, 2)}\n`);
