import {
  parseB20ReplayReport,
  validateB20ReplayReportOffline,
  type B20ReplayReport,
} from "@base-attribution-os/b20";
import broken from "../../../../fixtures/b20/synthetic/replay/direct-broken.report.json";
import fixed from "../../../../fixtures/b20/synthetic/replay/direct-fixed.report.json";
import factory from "../../../../fixtures/b20/synthetic/replay/factory-and-transfer.report.json";
import reverted from "../../../../fixtures/b20/synthetic/replay/reverted-unresolved.report.json";
import router from "../../../../fixtures/b20/synthetic/replay/router-event-only.report.json";

export interface PublishedB20Report {
  id: string;
  title: string;
  description: string;
  report: B20ReplayReport;
}

export function registerB20Report(
  id: string,
  title: string,
  description: string,
  artifact: unknown,
): PublishedB20Report {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 80)
    throw new Error("Invalid B20 report ID");
  const report = parseB20ReplayReport(artifact);
  if (!validateB20ReplayReportOffline(report).valid)
    throw new Error("Conflicting B20 artifact cannot enter the public registry");
  return { id, title, description, report };
}

export const publishedB20Reports = [
  registerB20Report(
    "direct-broken",
    "Transfer with missing attribution",
    "A successful transfer omits the expected Builder Code.",
    broken,
  ),
  registerB20Report(
    "direct-fixed",
    "The same transfer with attribution",
    "The existing BAO viem helper preserves the expected code.",
    fixed,
  ),
  registerB20Report(
    "factory-and-transfer",
    "Creation followed by a transfer",
    "Canonical factory evidence and a direct transfer in the supplied set.",
    factory,
  ),
  registerB20Report(
    "reverted-unresolved",
    "Reverted call with unresolved initialization",
    "End-of-block token state cannot establish initialization before a reverted call.",
    reverted,
  ),
  registerB20Report(
    "router-event-only",
    "Token event inside a router",
    "Receipt evidence does not establish attribution for the nested application.",
    router,
  ),
];

export function getB20Report(id: string) {
  return publishedB20Reports.find((entry) => entry.id === id);
}

export const b20PublicationSummary = {
  synthetic: publishedB20Reports.filter(
    (entry) => entry.report.evidence.acquisition === "synthetic",
  ).length,
  recorded: publishedB20Reports.filter((entry) => entry.report.evidence.acquisition !== "synthetic")
    .length,
};

export function coverageLabel(metric: B20ReplayReport["coverage"]["directAttribution"]) {
  return metric.percent === null
    ? "Not measured"
    : `${metric.numerator}/${metric.denominator} (${metric.percent}%)`;
}

export function chainLabel(chainId: number) {
  return chainId === 8453
    ? "Base mainnet"
    : chainId === 84532
      ? "Base Sepolia"
      : `Chain ${chainId}`;
}

/** Construct links from validated identities; synthetic hashes never become explorer links. */
export function transactionExplorer(report: B20ReplayReport, hash: string): string | null {
  if (
    report.evidence.acquisition === "synthetic" ||
    !report.transactions.some((tx) => tx.hash === hash)
  )
    return null;
  const base =
    report.chainId === 8453
      ? "https://basescan.org"
      : report.chainId === 84532
        ? "https://sepolia.basescan.org"
        : null;
  return base ? `${base}/tx/${hash}` : null;
}

export function b20ArtifactResponse(id: string, kind: "report" | "capture") {
  const entry = getB20Report(id);
  if (!entry)
    return Response.json({ error: "No registered B20 report with this ID." }, { status: 404 });
  return new Response(
    `${JSON.stringify(kind === "report" ? entry.report : entry.report.evidence, null, 2)}\n`,
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="b20-${id}.${kind}.json"`,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
