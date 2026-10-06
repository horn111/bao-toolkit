import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import {
  parseAttributionProofSet,
  type AttributionProofSetSummary,
} from "@base-attribution-os/core";
import {
  analyzeProject,
  loadBaoConfig,
  type AttributionReport,
  type BaoConfig,
} from "@base-attribution-os/scanner";
import cliPackage from "../../package.json";
import scannerPackage from "../../../scanner/package.json";
import corePackage from "../../../core/package.json";
import { CliError, type CommandResult } from "../output.js";

const execFile = promisify(execFileCallback);
const MAX_INPUT_BYTES = 2 * 1024 * 1024;

export interface PilotReportOptions {
  path: string;
  builderCode?: string;
  config?: string;
  proofSet?: string;
  ciRun?: string;
  output?: string;
  format?: "json" | "markdown" | string;
}

export interface PilotReport {
  schemaVersion: 1;
  generatedAt: string;
  builderCode: string;
  versions: { cli: string; scanner: string; core: string; node: string };
  git: { commit: string; dirty: boolean } | null;
  source: {
    status: "protected" | "findings" | "unmeasured";
    scope: { include: string[]; exclude: string[]; workspace: BaoConfig["workspace"] | null };
    profile: "strict";
    rules: BaoConfig["rules"] | null;
    baseline: string | null;
    checkedFiles: number;
    summary: Omit<AttributionReport["summary"], "coverage">;
    coverage: number | null;
    paths: Array<
      Pick<
        AttributionReport["transactionPaths"][number],
        "file" | "line" | "marker" | "family" | "status" | "ruleId" | "message"
      >
    >;
  };
  transactions: {
    source: "supplied-proof-set";
    sha256: string;
    summary: AttributionProofSetSummary;
    currentRpcCheck: false;
  } | null;
  ci: { url: string; verification: "caller-supplied" } | null;
  limitations: string[];
}

export async function pilotReportCommand(options: PilotReportOptions): Promise<CommandResult> {
  const format = options.format ?? "json";
  if (format !== "json" && format !== "markdown")
    throw new CliError(`Unsupported pilot-report format: ${format}`);
  const root = path.resolve(options.path);
  const loaded = await loadBaoConfig(root, options.config);
  const config = loaded?.config;
  const codes = options.builderCode ? [options.builderCode] : config?.builderCodes;
  if (codes?.length !== 1)
    throw new CliError(
      "pilot-report requires exactly one Builder Code; use --builder-code or a single-code config.",
    );
  const builderCode = codes[0];
  const ci = options.ciRun
    ? { url: validateCiRun(options.ciRun), verification: "caller-supplied" as const }
    : null;
  let transactions: PilotReport["transactions"] = null;
  let transactionOk = true;
  if (options.proofSet) {
    const target = path.resolve(root, options.proofSet);
    const handle = await fs.open(target, "r");
    let bytes: Buffer;
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_INPUT_BYTES)
        throw new CliError("Proof Set input must be a file no larger than 2 MiB.");
      // Bound the read even if a writer grows the file after stat.
      const buffer = Buffer.alloc(MAX_INPUT_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const result = await handle.read(buffer, length, buffer.length - length, null);
        if (!result.bytesRead) break;
        length += result.bytesRead;
      }
      if (length > MAX_INPUT_BYTES) throw new CliError("Proof Set input exceeds 2 MiB.");
      bytes = buffer.subarray(0, length);
    } finally {
      await handle.close();
    }
    const proof = parseAttributionProofSet(JSON.parse(bytes.toString("utf8")));
    if (proof.builderCode !== builderCode)
      throw new CliError("Proof Set Builder Code does not match the source audit.");
    transactionOk = proof.ok;
    transactions = {
      source: "supplied-proof-set",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      summary: proof.summary,
      currentRpcCheck: false,
    };
  }
  const report = await analyzeProject({
    root,
    builderCodes: [builderCode],
    profile: "strict",
    include: config?.include,
    exclude: config?.exclude,
    rules: config?.rules,
    baseline: config?.baseline,
    workspace: config?.workspace,
  });
  const status =
    report.summary.total === 0
      ? "unmeasured"
      : report.summary.protected === report.summary.total
        ? "protected"
        : "findings";
  const { coverage, ...summary } = report.summary;
  const data: PilotReport = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    builderCode,
    versions: {
      cli: cliPackage.version,
      scanner: scannerPackage.version,
      core: corePackage.version,
      node: process.version,
    },
    git: await gitState(root),
    source: {
      status,
      scope: {
        include: config?.include ?? ["**/*"],
        exclude: config?.exclude ?? [],
        workspace: config?.workspace ?? null,
      },
      profile: "strict",
      rules: config?.rules ?? null,
      baseline: config?.baseline ?? null,
      checkedFiles: report.checkedFiles,
      summary,
      coverage: report.summary.total === 0 ? null : coverage,
      paths: report.transactionPaths.map(
        ({ file, line, marker, family, status, ruleId, message }) => ({
          file,
          line,
          marker,
          family,
          status,
          ruleId,
          message,
        }),
      ),
    },
    transactions,
    ci,
    limitations: [
      "Source coverage describes supported call sites in the selected scope; it does not prove runtime behavior.",
      "Proof Set input is checked for internal consistency, not re-fetched from RPC. Stored verification claims come from the supplied artifact.",
      "Source findings and transaction samples are separate evidence; no mapping between a call site and a transaction is inferred.",
      "A supplied CI link is a reference, not verification of that run or its commit.",
      "This local report does not establish independent adoption or external pilot acceptance.",
    ],
  };
  const rendered = format === "json" ? JSON.stringify(data, null, 2) : formatPilotReport(data);
  if (options.output) {
    const target = path.resolve(root, options.output);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, `${rendered}\n`, { encoding: "utf8", flag: "wx" });
  }
  return {
    ok: status === "protected" && transactionOk,
    message: options.output
      ? `Pilot report written to ${options.output}. Source: ${status}.`
      : rendered,
    data,
  };
}

function validateCiRun(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CliError("--ci-run must be a GitHub Actions run URL.");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+$/.test(url.pathname)
  ) {
    throw new CliError(
      "--ci-run must be a GitHub Actions run URL without credentials or query parameters.",
    );
  }
  return url.href;
}

async function gitState(root: string): Promise<PilotReport["git"]> {
  try {
    const [commit, status] = await Promise.allSettled([
      execFile("git", ["rev-parse", "HEAD"], { cwd: root, timeout: 5000, windowsHide: true }),
      execFile("git", ["status", "--porcelain", "--untracked-files=normal"], {
        cwd: root,
        timeout: 5000,
        windowsHide: true,
      }),
    ]);
    if (commit.status !== "fulfilled" || status.status !== "fulfilled") return null;
    return { commit: commit.value.stdout.trim(), dirty: status.value.stdout.length > 0 };
  } catch {
    return null;
  }
}

export function formatPilotReport(report: PilotReport): string {
  const safe = (value: string) => value.replace(/[\r\n\t|`<>]/g, " ");
  return [
    "# BAO technical pilot report",
    "",
    `Builder Code: ${report.builderCode}`,
    `Generated: ${report.generatedAt}`,
    `Commit: ${report.git ? `${report.git.commit} (${report.git.dirty ? "working tree has changes" : "clean"})` : "unavailable"}`,
    `Versions: CLI ${report.versions.cli}; scanner ${report.versions.scanner}; core ${report.versions.core}; Node ${report.versions.node}`,
    "",
    "## Source audit",
    "",
    `Status: ${report.source.status}. Files checked: ${report.source.checkedFiles}.`,
    `Scope: ${report.source.scope.include.map(safe).join(", ")}; excludes: ${report.source.scope.exclude.map(safe).join(", ") || "none configured"}.`,
    report.source.coverage === null
      ? "Coverage: not measured."
      : `Coverage: ${report.source.summary.protected}/${report.source.summary.total} supported paths (${report.source.coverage}%).`,
    ...report.source.paths.map(
      (entry) =>
        `- ${safe(entry.file)}:${entry.line} ${entry.marker}: ${entry.status}${entry.ruleId ? ` (${entry.ruleId})` : ""}`,
    ),
    "",
    "## Transaction sample",
    "",
    report.transactions
      ? `Supplied Proof Set: ${report.transactions.summary.attributed}/${report.transactions.summary.total} transactions attributed. SHA-256: ${report.transactions.sha256}. No current RPC check.`
      : "No transaction evidence supplied.",
    "",
    "## CI reference",
    "",
    report.ci
      ? `${report.ci.url} (caller-supplied; run and commit not verified)`
      : "No CI run supplied.",
    "",
    "## Evidence limits",
    "",
    ...report.limitations.map((entry) => `- ${entry}`),
  ].join("\n");
}
