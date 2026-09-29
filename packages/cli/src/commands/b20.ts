import { mkdir, open, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MAX_B20_ARTIFACT_BYTES,
  createB20InspectionReport,
  parseB20InspectionCapture,
  parseB20Report,
  validateB20ReportOffline,
  type B20InspectionReport,
} from "@base-attribution-os/b20";
import {
  createB20HttpTransport,
  inspectB20Token,
  recheckB20Report,
} from "@base-attribution-os/b20/rpc";
import { CliError, required } from "../output.js";

const flags = [
  "address",
  "chain-id",
  "block",
  "rpc-url-env",
  "format",
  "output",
  "input",
  "offline",
  "json",
];

/** Tight parsing only for the new namespace; legacy option handling remains unchanged. */
export function validateB20Arguments(args: string[]): void {
  const seen = new Set<string>();
  for (let index = 1; index < args.length; index++) {
    const key = args[index].slice(2);
    if (!args[index].startsWith("--") || !flags.includes(key) || seen.has(key))
      throw new CliError("B20_INVALID_INPUT: unknown, positional, or duplicate option");
    seen.add(key);
    if (key === "offline" || key === "json") continue;
    if (!args[index + 1] || args[index + 1].startsWith("--"))
      throw new CliError(`B20_INVALID_INPUT: --${key} requires a value`);
    index++;
  }
}

export async function readB20Artifact(input: string): Promise<unknown> {
  const file = await open(input, "r");
  try {
    const bytes = Buffer.alloc(MAX_B20_ARTIFACT_BYTES + 1);
    let count = 0;
    while (count < bytes.length) {
      const { bytesRead } = await file.read(bytes, count, bytes.length - count, null);
      if (bytesRead === 0) break;
      count += bytesRead;
    }
    if (count > MAX_B20_ARTIFACT_BYTES) throw new CliError("B20_INPUT_LIMIT: input exceeds 64 KiB");
    try {
      return JSON.parse(bytes.subarray(0, count).toString("utf8"));
    } catch {
      throw new CliError("B20_INVALID_INPUT: expected a JSON artifact");
    }
  } finally {
    await file.close();
  }
}

export function formatB20Inspection(report: B20InspectionReport, markdown = false): string {
  const label = markdown ? "## B20 token inspection\n\n" : "B20 token inspection\n";
  return `${label}Token: ${report.token.address}\n\nClassification: ${report.token.classification}\nVariant: ${report.token.variant}\nConfirmation: ${report.token.confirmation}\nChain: ${report.chainId}\nBlock: ${report.evidence.block.number} (${report.evidence.block.hash})\nState: end-of-block\nEvidence: ${report.evidence.acquisition} (producer claim)\nConsistency: ${report.consistency}\nRuntime qualification: ${report.runtimeQualification}\nApplication readiness: ${report.readiness}\nRun: ${report.runStatus}\nObserve policy: ${report.policy.decision}\n\nDiagnostics: ${report.diagnostics.join(", ")}\n\n${report.limitations.join("\n\n")}\n`;
}

export async function b20Command(action: string | undefined, options: Record<string, string>) {
  if (action !== "inspect" && action !== "verify")
    throw new CliError("B20_INVALID_INPUT: available commands: b20 inspect, b20 verify");
  if (Object.keys(options).some((key) => !flags.includes(key)))
    throw new CliError("B20_INVALID_INPUT: unknown option");
  const offline = options.offline === "true";
  if (options.offline !== undefined && !offline)
    throw new CliError("B20_INVALID_INPUT: --offline is a boolean flag");
  if (offline && options["rpc-url-env"])
    throw new CliError("B20_INVALID_INPUT: --offline cannot be combined with RPC configuration");
  const format = options.format ?? (options.json === "true" ? "json" : "human");
  if (!["json", "human", "markdown"].includes(format))
    throw new CliError("B20_INVALID_INPUT: --format must be human, json, or markdown");
  if (action === "verify" && (options.address || options["chain-id"] || options.block))
    throw new CliError(
      "B20_INVALID_INPUT: verify uses the source report's address, chain, and block",
    );
  if (options.input && !offline && action === "inspect")
    throw new CliError("B20_INVALID_INPUT: --input inspection requires --offline");
  // Resolve credentials only after flag validation. Never echo their value or provider errors.
  const getTransport = () => {
    const envName = required(options["rpc-url-env"], "--rpc-url-env (or select --offline)");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(envName))
      throw new CliError("B20_INVALID_INPUT: invalid RPC environment variable name");
    const url = process.env[envName];
    if (!url)
      throw new CliError("B20_RPC_NOT_CONFIGURED: the named RPC environment variable is empty");
    return createB20HttpTransport({ url });
  };
  let data: unknown;
  let ok: boolean;
  let message: string;
  if (action === "inspect") {
    const chainText = required(options["chain-id"], "--chain-id");
    const chainId = Number(chainText);
    if (!/^[1-9][0-9]*$/.test(chainText) || !Number.isSafeInteger(chainId))
      throw new CliError("B20_INVALID_INPUT: invalid --chain-id");
    let report: B20InspectionReport;
    if (offline) {
      const capture = parseB20InspectionCapture(
        await readB20Artifact(required(options.input, "--input")),
      );
      if (
        capture.chainId !== chainId ||
        (options.address && capture.address !== options.address.toLowerCase()) ||
        (options.block && options.block !== capture.requestedBlock)
      ) {
        throw new CliError("B20_EVIDENCE_MISMATCH: offline input differs from requested context");
      }
      report = createB20InspectionReport({
        ...capture,
        acquisition: capture.acquisition === "synthetic" ? "synthetic" : "imported",
      });
    } else {
      report = await inspectB20Token(
        { address: required(options.address, "--address"), chainId, block: options.block },
        getTransport(),
      );
    }
    data = report;
    ok = report.policy.decision === "pass";
    message = formatB20Inspection(report, format === "markdown");
  } else {
    const report = parseB20Report(await readB20Artifact(required(options.input, "--input")));
    const result = offline
      ? validateB20ReportOffline(report)
      : await recheckB20Report(report, getTransport());
    data = result;
    ok = result.valid;
    message = `${result.message}\nValid: ${result.valid}\nApplication readiness: not-tested\n`;
  }
  const rendered = format === "json" ? `${JSON.stringify(data, null, 2)}\n` : message;
  if (options.output) {
    const output = path.resolve(options.output);
    await mkdir(path.dirname(output), { recursive: true });
    // Exclusive creation also protects input aliases, symlinks, hard links, and old reports.
    try {
      await writeFile(output, rendered, { encoding: "utf8", flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST")
        throw new CliError(
          "B20_OUTPUT_EXISTS: choose a new output file; reports are immutable snapshots",
        );
      throw new CliError("B20_OUTPUT_FAILED: could not write output file");
    }
  }
  return { ok, data, message: rendered };
}
