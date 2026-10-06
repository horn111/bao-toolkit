import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { auditSource } from "./doctor-audit";

const doctorPath = new URL("./doctor.tsx", import.meta.url);

describe("Attribution Doctor browser preview", () => {
  it.each(["", "const broken = ;", "export const value = 1;"])(
    "does not report coverage for a snippet without supported paths: %s",
    (source) => {
      expect(auditSource(source, "wagmi", "bc_abc123", "strict")).toMatchObject({
        ok: false,
        coverage: null,
        protected: 0,
        paths: [],
        inputIssue: "no-paths",
      });
    },
  );

  it("requires an expected code even in local reporting", () => {
    expect(
      auditSource('wallet.sendTransaction({ data: "0x" });', "wagmi", "", "local"),
    ).toMatchObject({ ok: false, coverage: null, inputIssue: "builder-code-required" });
  });

  it("binds evidence to each call instead of protecting the whole file", () => {
    const source =
      'wallet.sendTransaction(withViemDataSuffix(request, "bc_abc123"));\nwallet.sendTransaction(request);';
    const result = auditSource(source, "agent", "bc_abc123", "ci");
    expect(result).toMatchObject({ ok: false, coverage: 50, protected: 1, inputIssue: null });
    expect(result.paths.map((entry) => entry.status)).toEqual(["protected", "missing"]);
  });

  it("keeps local reporting and strict unresolved policy distinct", () => {
    const source = "wallet.sendTransaction(withViemDataSuffix(request, configuredCode));";
    expect(auditSource(source, "agent", "bc_abc123", "local").ok).toBe(true);
    expect(auditSource(source, "agent", "bc_abc123", "strict").ok).toBe(false);
  });

  it("recognizes a corrected request and a mismatched code", () => {
    const source = 'wallet.sendTransaction(withViemDataSuffix(request, "bc_abc123"));';
    expect(auditSource(source, "agent", "bc_abc123", "strict")).toMatchObject({
      ok: true,
      coverage: 100,
      protected: 1,
    });
    expect(auditSource(source, "agent", "bc_other", "strict").paths[0].status).toBe("wrong-code");
  });

  it("generates a least-privilege immutable full-project workflow", async () => {
    const source = await readFile(doctorPath, "utf8");

    expect(source).toContain("permissions:");
    expect(source).toContain("contents: read");
    expect(source).toContain("github-action@v0.7.0");
    expect(source).toContain("profile: strict");
    expect(source).toContain('changed-only: "false"');
    expect(source).not.toContain("github-action@main");
  });
});
