import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createAttributionProofSet,
  createAttributionReplayReport,
  createDataSuffix,
} from "@base-attribution-os/core";
import { pilotReportCommand, type PilotReport } from "../src/commands/pilot-report.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function project(
  source = "import { Attribution } from 'ox/erc8021'; wallet.sendTransaction({ dataSuffix: Attribution.toDataSuffix({ codes: ['bc_abc123'] }) });",
) {
  const root = await mkdtemp(path.join(tmpdir(), "bao-pilot-"));
  roots.push(root);
  await writeFile(path.join(root, "send.ts"), source);
  await writeFile(
    path.join(root, "bao.config.json"),
    JSON.stringify({ builderCodes: ["bc_abc123"], include: ["send.ts"] }),
  );
  return root;
}
function proof(builderCode = "bc_abc123") {
  return createAttributionProofSet(
    [
      createAttributionReplayReport(
        [
          {
            hash: `0x${"12".repeat(32)}`,
            calldata: createDataSuffix({ codes: [builderCode] }),
            verified: false,
          },
        ],
        { builderCode, chainId: 84532 },
      ),
    ],
    { title: "Offline sample", builderCode },
  );
}

describe("technical pilot summary", () => {
  it("records source scope and tool versions without implying CI, chain, or external verification", async () => {
    const root = await project();
    const result = await pilotReportCommand({ path: root });
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({
      schemaVersion: 1,
      builderCode: "bc_abc123",
      git: null,
      transactions: null,
      ci: null,
      source: {
        status: "protected",
        profile: "strict",
        scope: { include: ["send.ts"] },
        checkedFiles: 1,
        coverage: 100,
      },
    });
    expect((result.data as PilotReport).versions.node).toBe(process.version);
    expect((result.data as PilotReport).limitations.join(" ")).toContain(
      "does not establish independent adoption",
    );
    expect(result.message).not.toContain(root.replaceAll("\\", "\\\\"));
  });

  it("fails an empty scope with an explicit null measurement in this new contract", async () => {
    const root = await project("export const noTransactions = true;");
    const result = await pilotReportCommand({ path: root, format: "markdown" });
    expect(result.ok).toBe(false);
    expect(result.data).toMatchObject({ source: { status: "unmeasured", coverage: null } });
    expect((result.data as PilotReport).source.summary).not.toHaveProperty("coverage");
    expect(result.message).toContain("Coverage: not measured");
    expect(result.message).not.toContain("100%");
  });

  it("does not treat disabled rule severity as protected evidence", async () => {
    const root = await project("wallet.sendTransaction({ data: '0x' });");
    await writeFile(
      path.join(root, "bao.config.json"),
      JSON.stringify({
        builderCodes: ["bc_abc123"],
        include: ["send.ts"],
        rules: { "missing-attribution": "off" },
      }),
    );
    const result = await pilotReportCommand({ path: root });
    expect(result.ok).toBe(false);
    expect(result.data).toMatchObject({
      source: { status: "findings", summary: { missing: 1, errors: 0 } },
    });
  });

  it("checks supplied Proof Sets, keeping transaction evidence separate from source coverage", async () => {
    const root = await project();
    await writeFile(path.join(root, "proof.json"), JSON.stringify(proof()));
    const result = await pilotReportCommand({
      path: root,
      proofSet: "proof.json",
      ciRun: "https://github.com/example/app/actions/runs/123",
    });
    expect(result.ok).toBe(false);
    expect(result.data).toMatchObject({
      transactions: {
        source: "supplied-proof-set",
        currentRpcCheck: false,
        summary: { total: 1, verified: 0 },
      },
      ci: { verification: "caller-supplied" },
      source: { summary: { total: 1 } },
    });
    expect(result.message).not.toContain("calldata");
  });

  it("rejects mismatched or tampered proof evidence before creating an output", async () => {
    const root = await project();
    await writeFile(path.join(root, "proof.json"), JSON.stringify(proof("bc_other")));
    await expect(
      pilotReportCommand({ path: root, proofSet: "proof.json", output: "report.json" }),
    ).rejects.toThrow("does not match");
    const invalid = proof();
    invalid.summary.attributed = 99;
    await writeFile(path.join(root, "proof.json"), JSON.stringify(invalid));
    await expect(
      pilotReportCommand({ path: root, proofSet: "proof.json", output: "report.json" }),
    ).rejects.toThrow();
    await expect(readFile(path.join(root, "report.json"))).rejects.toThrow();
  });

  it("writes a failing report for review and never overwrites an earlier artifact", async () => {
    const root = await project("wallet.sendTransaction({ data: '0x' });");
    const result = await pilotReportCommand({ path: root, output: "before.json" });
    expect(result.ok).toBe(false);
    const original = await readFile(path.join(root, "before.json"), "utf8");
    await expect(pilotReportCommand({ path: root, output: "before.json" })).rejects.toThrow();
    expect(await readFile(path.join(root, "before.json"), "utf8")).toBe(original);
  });

  it("records clean and modified Git state and rejects credential-bearing CI references", async () => {
    const root = await project();
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, windowsHide: true, stdio: "pipe" });
    git("init");
    git("add", "send.ts", "bao.config.json");
    git(
      "-c",
      "user.name=BAO Test",
      "-c",
      "user.email=test@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      "fixture",
    );
    const clean = await pilotReportCommand({ path: root });
    expect(clean.data).toMatchObject({
      git: { commit: git("rev-parse", "HEAD").toString().trim(), dirty: false },
    });
    await writeFile(path.join(root, "untracked.txt"), "changed");
    expect((await pilotReportCommand({ path: root })).data).toMatchObject({ git: { dirty: true } });
    await expect(
      pilotReportCommand({
        path: root,
        ciRun: "https://token@github.com/example/app/actions/runs/123",
      }),
    ).rejects.toThrow("without credentials");
  });

  it("rejects oversized evidence and unsupported output formats", async () => {
    const root = await project();
    await writeFile(path.join(root, "large.json"), " ".repeat(2 * 1024 * 1024 + 1));
    await expect(pilotReportCommand({ path: root, proofSet: "large.json" })).rejects.toThrow(
      "2 MiB",
    );
    await expect(pilotReportCommand({ path: root, format: "html" })).rejects.toThrow("Unsupported");
  });
});
