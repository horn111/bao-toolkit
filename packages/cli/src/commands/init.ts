import { promises as fs } from "node:fs";
import path from "node:path";
import {
  analyzeProject,
  CONFIG_SCHEMA_URL,
  DEFAULT_CONFIG_FILE,
  normalizeProfile,
  type BaoConfig,
  type ScanProfile,
} from "@base-attribution-os/scanner";
import { validateBuilderCodes } from "@base-attribution-os/core";
import { CliError, type CommandResult } from "../output.js";
import { formatDoctorReport } from "./doctor.js";

export interface InitOptions {
  path: string;
  builderCode: string;
  force?: boolean;
  profile?: ScanProfile | string;
  dryRun?: boolean;
  workflow?: boolean;
  include?: string[];
}

const WORKFLOW_FILE = ".github/workflows/bao-attribution.yml";
// Keep this on a published, verified Action until the next train is released.
const ACTION_REF = "a08087852b8fa80013051028f54f01b428e8a138";

export async function initCommand(options: InitOptions): Promise<CommandResult> {
  const root = path.resolve(options.path);
  if (!(await fs.stat(root)).isDirectory()) throw new CliError("--path must be a directory.");
  const errors = validateBuilderCodes([options.builderCode]);
  if (errors.length) throw new CliError(errors.join("; "));
  const profile = normalizeProfile(options.profile);
  const include = (options.include ?? (await defaultScope(root))).map((entry) =>
    entry === "." || entry === "./" ? "**/*" : entry,
  );
  if (!include.length || include.some((entry) => !entry.trim())) {
    throw new CliError("--include requires at least one relative path.");
  }
  for (const entry of include) {
    if (path.isAbsolute(entry) || entry.replaceAll("\\", "/").split("/").includes("..")) {
      throw new CliError("--include paths must stay inside the project root.");
    }
  }
  const config: BaoConfig = {
    $schema: CONFIG_SCHEMA_URL,
    builderCodes: [options.builderCode],
    profile,
    include,
    exclude: ["**/*.test.*", "**/*.spec.*", "**/generated/**"],
  };
  const files = [
    { path: DEFAULT_CONFIG_FILE, content: `${JSON.stringify(config, null, 2)}\n` },
    ...(options.workflow ? [{ path: WORKFLOW_FILE, content: workflowTemplate() }] : []),
  ];
  const conflicts: string[] = [];
  for (const file of files) {
    await assertSafeTarget(root, file.path);
    const exists = await fs.lstat(path.join(root, file.path)).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return false;
        throw error;
      },
    );
    if (exists && (file.path !== DEFAULT_CONFIG_FILE || !options.force)) conflicts.push(file.path);
  }
  const report = await analyzeProject({ root, ...config });
  const preview = [
    options.dryRun ? "BAO initialization preview (no files written)" : "BAO initialization",
    `Scope: ${include.join(", ")}`,
    `Excluded: ${config.exclude!.join(", ")}`,
    `Files checked: ${report.checkedFiles}`,
    formatDoctorReport(report),
    ...files.map((file) => `\n--- ${file.path}\n${file.content.trimEnd()}`),
  ];
  if (conflicts.length) {
    preview.push(
      `\nExisting files preserved: ${conflicts.join(", ")}. --force replaces only bao.config.json; choose or update workflows manually.`,
    );
  }
  if (!options.dryRun && conflicts.length) throw new CliError(preview.join("\n"));
  if (!options.dryRun) {
    // Check workflow creation before replacing a config, even with --force.
    const created: string[] = [];
    try {
      for (const file of [...files].reverse()) {
        await assertSafeTarget(root, file.path);
        const target = path.join(root, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        const replace = file.path === DEFAULT_CONFIG_FILE && options.force;
        await fs.writeFile(target, file.content, { encoding: "utf8", flag: replace ? "w" : "wx" });
        if (!replace) created.push(target);
      }
    } catch (error) {
      await Promise.all(created.map((target) => fs.unlink(target)));
      throw error;
    }
  }
  return {
    ok: conflicts.length === 0,
    message: options.dryRun
      ? preview.join("\n")
      : `Created ${files.map((file) => file.path).join(", ")}.\nScope: ${include.join(", ")}\n${formatDoctorReport(report)}\n\nReview findings, then run bao doctor --profile strict.`,
    data: {
      config: path.join(root, DEFAULT_CONFIG_FILE),
      frameworks: report.frameworks,
      transactionPaths: report.summary.total,
      dryRun: options.dryRun ?? false,
      scope: { include, exclude: config.exclude, checkedFiles: report.checkedFiles },
      files,
      conflicts,
      report,
    },
  };
}

async function defaultScope(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const names = new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const scopes = ["src", "app", "pages", "lib", "packages", "apps"].filter((name) =>
    names.has(name),
  );
  return scopes.length ? scopes : ["**/*"];
}

async function assertSafeTarget(root: string, relative: string): Promise<void> {
  let current = root;
  for (const part of relative.split("/")) {
    current = path.join(current, part);
    const info = await fs.lstat(current).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
      return undefined;
    });
    if (info?.isSymbolicLink())
      throw new CliError(`Refusing to write through a symlink: ${relative}`);
  }
}

function workflowTemplate(): string {
  return `name: BAO attribution

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  attribution:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
        with:
          persist-credentials: false
      - uses: horn111/bao-toolkit/packages/github-action@${ACTION_REF} # v0.6.1
        with:
          config: bao.config.json
          profile: strict
          fail-on-missing: "true"
`;
}
