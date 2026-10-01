import { mkdir, open, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MAX_B20_ARTIFACT_BYTES,
  createB20InspectionReport,
  parseB20InspectionCapture,
  parseB20Report,
  validateB20ReportOffline,
  type B20InspectionReport,
  B20_REPLAY_LIMITS,
  createB20ReplayReport,
  parseB20ReplayInput,
  parseB20ReplayCapture,
  validateB20ReplayReportOffline,
  type B20ReplayReport,
  type B20ReplayOptions,
} from "@base-attribution-os/b20";
import {
  createB20HttpTransport,
  inspectB20Token,
  recheckB20Report,
  replayB20Transactions,
  recheckB20ReplayReport,
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
  "hashes",
  "expect",
  "policy",
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

export async function readB20Artifact(
  input: string,
  maximum: number = MAX_B20_ARTIFACT_BYTES,
): Promise<unknown> {
  const file = await open(input, "r");
  try {
    const bytes = Buffer.alloc(maximum + 1);
    let count = 0;
    while (count < bytes.length) {
      const { bytesRead } = await file.read(bytes, count, bytes.length - count, null);
      if (bytesRead === 0) break;
      count += bytesRead;
    }
    if (count > maximum) throw new CliError("B20_INPUT_LIMIT: input exceeds artifact size limit");
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
  if (action !== "inspect" && action !== "verify" && action !== "replay")
    throw new CliError(
      "B20_INVALID_INPUT: available commands: b20 inspect, b20 replay, b20 verify",
    );
  if (Object.keys(options).some((key) => !flags.includes(key)))
    throw new CliError("B20_INVALID_INPUT: unknown option");
  if (action !== "replay" && (options.hashes || options.expect || options.policy))
    throw new CliError("B20_INVALID_INPUT: hashes, expect and policy belong to replay");
  if (action === "replay" && (options.address || options.block))
    throw new CliError("B20_INVALID_INPUT: replay obtains addresses and blocks from transactions");
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
    return createB20HttpTransport({
      url,
      maxResponseBytes: action === "inspect" ? 64 * 1024 : 1024 * 1024,
    });
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
  } else if (action === "replay") {
    const chainText = required(options["chain-id"], "--chain-id");
    const chainId = Number(chainText);
    if (!/^[1-9][0-9]*$/.test(chainText) || !Number.isSafeInteger(chainId))
      throw new CliError("B20_INVALID_INPUT: invalid --chain-id");
    if (Boolean(options.input) === Boolean(options.hashes))
      throw new CliError("B20_INVALID_INPUT: choose exactly one of --input or --hashes");
    if (offline && options.hashes)
      throw new CliError("B20_INVALID_INPUT: offline replay requires captured evidence");
    if (options.policy && !["observe", "strict-attribution"].includes(options.policy))
      throw new CliError("B20_INVALID_INPUT: unknown policy");
    const replayOptions: B20ReplayOptions = {
      expectedCode: options.expect,
      policy: options.policy as B20ReplayOptions["policy"],
    };
    let report: B20ReplayReport;
    if (offline) {
      const capture = parseB20ReplayCapture(
        await readB20Artifact(options.input, B20_REPLAY_LIMITS.artifactBytes),
      );
      if (capture.input.chainId !== chainId)
        throw new CliError("B20_CHAIN_MISMATCH: capture differs from --chain-id");
      const acquisition = capture.acquisition === "synthetic" ? "synthetic" : "imported";
      report = createB20ReplayReport(
        {
          ...capture,
          acquisition,
          transactions: capture.transactions.map((row) => ({
            ...row,
            tokens: row.tokens.map((token) => ({ ...token, acquisition })),
          })),
        },
        replayOptions,
      );
    } else {
      const input = options.input
        ? parseB20ReplayInput(await readB20Artifact(options.input, B20_REPLAY_LIMITS.artifactBytes))
        : parseB20ReplayInput({
            kind: "bao.b20-input",
            schemaVersion: 1,
            chainId,
            selection: {
              mode: "explicit-hashes",
              description: "Explicitly supplied transaction hashes; no completeness claim.",
              completeness: "unknown",
            },
            transactions: options.hashes.split(",").map((hash) => ({ hash: hash.trim() })),
          });
      if (input.chainId !== chainId)
        throw new CliError("B20_CHAIN_MISMATCH: input differs from --chain-id");
      report = await replayB20Transactions(input, getTransport(), replayOptions);
    }
    data = report;
    ok = report.policy.decision === "pass";
    message = formatB20Replay(report, format === "markdown");
  } else {
    const value = await readB20Artifact(
      required(options.input, "--input"),
      B20_REPLAY_LIMITS.artifactBytes,
    );
    const replay = value && typeof value === "object" && "mode" in value && value.mode === "replay";
    const result = replay
      ? offline
        ? validateB20ReplayReportOffline(value)
        : await recheckB20ReplayReport(value, getTransport())
      : offline
        ? validateB20ReportOffline(parseB20Report(value))
        : await recheckB20Report(parseB20Report(value), getTransport());
    data = result;
    ok = result.valid;
    message = `${result.message}\nValid: ${result.valid}\nApplication readiness: not-tested\n`;
  }
  const rendered = format === "json" ? `${JSON.stringify(data, null, 2)}\n` : message;
  if (Buffer.byteLength(rendered, "utf8") > B20_REPLAY_LIMITS.artifactBytes)
    throw new CliError("B20_INPUT_LIMIT: serialized output exceeds 4 MiB");
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

export function formatB20Replay(report: B20ReplayReport, markdown = false): string {
  const metric = (value: B20ReplayReport["coverage"]["directAttribution"]) =>
    value.percent === null
      ? "not measured"
      : `${value.numerator}/${value.denominator} (${value.percent}%)`;
  const lines = [
    markdown ? "## B20 Discovery & Attribution" : "B20 Discovery & Attribution",
    `Chain: ${report.chainId}`,
    `Evidence: ${report.evidence.acquisition} (producer claim)`,
    `Input: ${report.coverage.supplied} supplied, ${report.coverage.unique} unique`,
    `Input attribution: ${metric(report.coverage.inputAttribution)}`,
    `Supported direct-call attribution: ${metric(report.coverage.directAttribution)}`,
    `Unknown/pending: ${report.coverage.unknown}`,
    `Execution: ${report.coverage.successful} successful, ${report.coverage.reverted} reverted, ${report.coverage.pending} pending`,
    `Run: ${report.runStatus}`,
    `Policy: ${report.policy.name} ${report.policy.decision}`,
    "Runtime qualification: not-qualified",
    "Application readiness: not-tested",
    "",
    ...report.transactions.map(
      (tx) =>
        `${tx.hash}: ${tx.relation}; ${tx.execution}; attribution ${tx.attribution.status}; ${tx.diagnostics.join(", ")}`,
    ),
    "",
    ...report.limitations,
  ];
  return `${lines.join("\n")}\n`;
}
