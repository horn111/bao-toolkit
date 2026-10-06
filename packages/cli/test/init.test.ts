import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initCommand } from "../src/commands/init.js";
import { doctorCommand } from "../src/commands/doctor.js";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function project() {
  const root = await mkdtemp(path.join(tmpdir(), "bao-init-"));
  roots.push(root);
  await mkdir(path.join(root, "src"));
  await writeFile(path.join(root, "src/send.ts"), 'wallet.sendTransaction({ data: "0x" });');
  return root;
}

describe("init preview and workflow", () => {
  it("previews exact files and reports findings without writing anything", async () => {
    const root = await project();
    const result = await initCommand({
      path: root,
      builderCode: "bc_abc123",
      dryRun: true,
      workflow: true,
    });
    expect(await readdir(root)).toEqual(["src"]);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("[missing]");
    expect(result.message).toContain("Scope: src");
    expect(result.message).toContain("# v0.6.1");
    expect(result.data).toMatchObject({ scope: { checkedFiles: 1 }, transactionPaths: 1 });
  });

  it("uses the same scope in init and Doctor, including root-level projects", async () => {
    const root = await project();
    await rm(path.join(root, "src"), { recursive: true });
    await writeFile(path.join(root, "send.ts"), 'wallet.sendTransaction({ data: "0x" });');
    const result = await initCommand({ path: root, builderCode: "bc_abc123", workflow: true });
    const doctor = await doctorCommand({ path: root });
    expect(result.data).toMatchObject({ scope: { include: ["**/*"], checkedFiles: 1 } });
    expect(doctor.data).toMatchObject({ checkedFiles: 1, summary: { total: 1, missing: 1 } });
    const workflow = await readFile(
      path.join(root, ".github/workflows/bao-attribution.yml"),
      "utf8",
    );
    expect(workflow).toContain('fail-on-missing: "true"');
    expect(workflow).not.toContain("pull_request_target");
  });

  it("never overwrites a workflow, even with force, and does not change the config on conflict", async () => {
    const root = await project();
    await initCommand({ path: root, builderCode: "bc_abc123", workflow: true });
    const config = await readFile(path.join(root, "bao.config.json"), "utf8");
    const workflow = path.join(root, ".github/workflows/bao-attribution.yml");
    await writeFile(workflow, "existing workflow\n");
    await expect(
      initCommand({ path: root, builderCode: "bc_other", workflow: true, force: true }),
    ).rejects.toThrow("Existing files preserved");
    expect(await readFile(workflow, "utf8")).toBe("existing workflow\n");
    expect(await readFile(path.join(root, "bao.config.json"), "utf8")).toBe(config);
    const preview = await initCommand({
      path: root,
      builderCode: "bc_other",
      workflow: true,
      dryRun: true,
      force: true,
    });
    expect(preview.ok).toBe(false);
  });

  it("preserves an existing config without force and accepts an explicit scope", async () => {
    const root = await project();
    await initCommand({ path: root, builderCode: "bc_abc123", include: ["src"] });
    await expect(initCommand({ path: root, builderCode: "bc_other" })).rejects.toThrow(
      "Existing files preserved",
    );
    await initCommand({ path: root, builderCode: "bc_other", force: true, include: ["src"] });
    expect(JSON.parse(await readFile(path.join(root, "bao.config.json"), "utf8"))).toMatchObject({
      builderCodes: ["bc_other"],
    });
  });

  it("rejects invalid codes and out-of-root scope before writing", async () => {
    const root = await project();
    await expect(initCommand({ path: root, builderCode: "bad code" })).rejects.toThrow();
    await expect(
      initCommand({ path: root, builderCode: "bc_abc123", include: ["../outside"] }),
    ).rejects.toThrow("inside");
    expect(await readdir(root)).toEqual(["src"]);
  });

  it("refuses workflow directory junctions instead of writing outside the project", async () => {
    const root = await project();
    const outside = await project();
    await symlink(
      outside,
      path.join(root, ".github"),
      process.platform === "win32" ? "junction" : "dir",
    );
    await expect(
      initCommand({ path: root, builderCode: "bc_abc123", workflow: true }),
    ).rejects.toThrow("symlink");
    expect(await readdir(outside)).toEqual(["src"]);
  });
});
