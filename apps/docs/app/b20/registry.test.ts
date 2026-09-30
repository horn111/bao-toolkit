import { describe, expect, it } from "vitest";
import {
  createB20ReplayReport,
  parseB20ReplayCapture,
  parseB20ReplayReport,
  validateB20ReplayReportOffline,
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
    expect(b20PublicationSummary).toEqual({ synthetic: 5, recorded: 2 });
    for (const entry of publishedB20Reports) {
      expect(parseB20ReplayReport(entry.report)).toEqual(entry.report);
      const hash = entry.report.transactions[0].hash;
      const explorer = transactionExplorer(entry.report, hash);
      if (entry.report.evidence.acquisition === "synthetic") expect(explorer).toBeNull();
      else
        expect(explorer).toBe(
          `${entry.report.chainId === 8453 ? "https://basescan.org" : "https://sepolia.basescan.org"}/tx/${hash}`,
        );
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
  it.each(publishedB20Reports.map((entry) => entry.id))(
    "exports the exact selected report and reproducible capture for %s",
    async (id) => {
      const request = new Request(`https://example.test/b20/reports/${id}/export`);
      const response = await exportReport(request, { params: Promise.resolve({ reportId: id }) });
      const artifact = await response.json();
      expect(artifact).toEqual(getB20Report(id)!.report);
      expect(response.headers.get("Content-Disposition")).toContain(`b20-${id}.report.json`);
      const captured = await exportCapture(request, { params: Promise.resolve({ reportId: id }) });
      const capture = parseB20ReplayCapture(await captured.json());
      expect(
        createB20ReplayReport(capture, { expectedCode: artifact.expectedCode ?? undefined }),
      ).toEqual(artifact);
    },
  );
  it("preserves recorded acquisition as a producer claim during offline validation", () => {
    for (const id of ["mainnet-2026-09-30", "sepolia-2026-09-30"]) {
      const report = getB20Report(id)!.report;
      expect(report.expectedCode).toBeNull();
      expect(report.coverage.inputAttribution.percent).toBeNull();
      expect(report.coverage.directAttribution.percent).toBeNull();
      expect(validateB20ReplayReportOffline(report)).toMatchObject({
        valid: true,
        acquisition: "imported",
        producerAcquisitionClaim: "rpc",
        networkRecheck: "not-performed",
        currentRunStrictPolicy: "not-evaluated",
      });
      expect(transactionExplorer(report, `0x${"99".repeat(32)}`)).toBeNull();
    }
  });
  it("recognizes the recorded approval while keeping router observations out of direct coverage", () => {
    const mainnet = getB20Report("mainnet-2026-09-30")!.report;
    const direct = mainnet.transactions.filter((tx) => tx.directCoverageEligible);
    expect(direct).toHaveLength(1);
    expect(direct[0]).toMatchObject({
      hash: "0x0416cd7fa5e45139371fbc74912624524d7cfca7f5390467fd621b74488a0c21",
      relation: "direct-token-call",
      execution: "success",
      operation: { method: "approve" },
      attribution: { codes: ["bc_4raffiaj"], expectedMatch: null },
    });
    for (const tx of mainnet.transactions.filter((tx) => !tx.directCoverageEligible)) {
      expect(tx.relation).toBe("receipt-event-only");
      expect(tx.diagnostics).toContain("B20_NESTED_ATTRIBUTION_NOT_ESTABLISHED");
    }
    const sepolia = getB20Report("sepolia-2026-09-30")!.report;
    expect(sepolia.coverage).toMatchObject({ factoryObservations: 2, supportedDirectCalls: 0 });
  });
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
