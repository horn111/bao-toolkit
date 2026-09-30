import { describe, expect, it } from "vitest";
import {
  createB20ReplayReport,
  parseB20ReplayCapture,
  parseB20ReplayReport,
} from "@base-attribution-os/b20";
import { prepareB20TransferPair } from "../../../../examples/viem-basic/src/b20-transfer";
import {
  b20ArtifactResponse,
  b20PublicationSummary,
  getB20Report,
  publishedB20Reports,
  registerB20Report,
  transactionExplorer,
} from "./registry";
import { observatorySummary } from "../proof-data";
import { GET as exportReport } from "./reports/[reportId]/export/route";
import { GET as exportCapture } from "./reports/[reportId]/capture/route";

describe("static B20 publication", () => {
  it("validates every artifact and keeps synthetic counts outside the real Observatory", () => {
    expect(b20PublicationSummary).toEqual({ synthetic: 5, recorded: 0 });
    for (const entry of publishedB20Reports) {
      expect(parseB20ReplayReport(entry.report)).toEqual(entry.report);
      expect(transactionExplorer(entry.report, entry.report.transactions[0].hash)).toBeNull();
      expect(entry.report.readiness).toBe("not-tested");
    }
    expect(observatorySummary.proofSets).toBe(2);
  });
  it("rejects a tampered artifact and unknown IDs without a fallback report", () => {
    const report = structuredClone(getB20Report("direct-fixed")!.report);
    report.coverage.attributed = 99;
    expect(() => registerB20Report("bad-report", "Bad", "Bad", report)).toThrow(
      "B20_DERIVATION_MISMATCH",
    );
    expect(b20ArtifactResponse("constructor", "report").status).toBe(404);
    expect(b20ArtifactResponse("../direct-fixed", "capture").status).toBe(404);
  });
  it.each(["direct-broken", "direct-fixed", "reverted-unresolved", "router-event-only"])(
    "exports the exact selected report and reproducible capture for %s",
    async (id) => {
      const request = new Request(`https://example.test/b20/reports/${id}/export`);
      const response = await exportReport(request, { params: Promise.resolve({ reportId: id }) });
      const artifact = await response.json();
      expect(artifact).toEqual(getB20Report(id)!.report);
      expect(response.headers.get("Content-Disposition")).toContain(`b20-${id}.report.json`);
      const captured = await exportCapture(request, { params: Promise.resolve({ reportId: id }) });
      const capture = parseB20ReplayCapture(await captured.json());
      expect(createB20ReplayReport(capture, { expectedCode: artifact.expectedCode })).toEqual(
        artifact,
      );
    },
  );
  it("builds unchanged transfer semantics from the actual viem example", () => {
    const before = getB20Report("direct-broken")!.report;
    const after = getB20Report("direct-fixed")!.report;
    const tx = after.evidence.transactions[0].transaction!;
    const operation = after.transactions[0].operation!;
    const pair = prepareB20TransferPair(
      tx.to!,
      operation.to,
      BigInt(operation.amount),
      "bc_example",
    );
    expect(pair.broken.to).toEqual(pair.fixed.to);
    expect(pair.broken.data).toEqual(before.evidence.transactions[0].transaction!.input);
    expect(pair.fixed.data).toEqual(tx.input);
    expect(before.transactions[0].operation).toEqual(after.transactions[0].operation);
    expect(before.coverage.directAttribution).toEqual({ numerator: 0, denominator: 1, percent: 0 });
    expect(after.coverage.directAttribution).toEqual({
      numerator: 1,
      denominator: 1,
      percent: 100,
    });
  });
});
