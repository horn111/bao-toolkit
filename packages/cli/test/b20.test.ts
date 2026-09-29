import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { b20Command, validateB20Arguments } from "../src/commands/b20.js";

const input = fileURLToPath(
  new URL("../../../fixtures/b20/synthetic/asset-initialized.capture.json", import.meta.url),
);
const sourceReport = input.replace(".capture.json", ".report.json");
afterEach(() => vi.unstubAllGlobals());

describe("B20 CLI", () => {
  it("runs offline with no network and does not elevate producer RPC claims", async () => {
    const fetcher = vi.fn(() => {
      throw new Error("network forbidden");
    });
    vi.stubGlobal("fetch", fetcher);
    const result = await b20Command("inspect", {
      input,
      "chain-id": "84532",
      offline: "true",
      format: "json",
    });
    expect(result.ok).toBe(true);
    expect(JSON.parse(result.message)).toMatchObject({
      token: { classification: "confirmed-initialized" },
      evidence: { acquisition: "synthetic" },
      readiness: "not-tested",
    });
    const validated = await b20Command("verify", {
      input: sourceReport,
      offline: "true",
      format: "json",
    });
    expect(validated.data).toMatchObject({
      networkRecheck: "not-performed",
      acquisition: "synthetic",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("writes the actual JSON artifact and rejects overwrites", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "bao-b20-cli-"));
    const output = path.join(dir, "report.json");
    const options = { input, output, "chain-id": "84532", offline: "true", format: "json" };
    const result = await b20Command("inspect", options);
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result.data);
    await expect(b20Command("inspect", options)).rejects.toThrow("B20_OUTPUT_EXISTS");
    await expect(b20Command("verify", { input: output, output, offline: "true" })).rejects.toThrow(
      "B20_OUTPUT_EXISTS",
    );
    expect(JSON.parse(await readFile(output, "utf8"))).toEqual(result.data);
  });
  it.each([
    { input, offline: "true", "chain-id": "84532", "rpc-url-env": "BASE_RPC_URL" },
    { input, offline: "true", "chain-id": "8453" },
    {
      input,
      offline: "true",
      "chain-id": "84532",
      address: "0x1111111111111111111111111111111111111111",
    },
    { input, offline: "true", "chain-id": "84532", block: "latest" },
    { input, offline: "true", "chain-id": "1.5" },
    { input, "chain-id": "84532" },
  ])("rejects contradictory inspect options", async (options) => {
    const supplied = Object.fromEntries(
      Object.entries(options).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
    await expect(b20Command("inspect", supplied)).rejects.toThrow();
  });
  it.each([
    ["inspect", "--address"],
    ["inspect", "--block", "123", "--block", "456"],
    ["inspect", "--rpc-url", "secret"],
    ["inspect", "--offline", "false"],
    ["inspect", "junk"],
  ])("rejects bad command-line arguments", (...args) => {
    expect(() => validateB20Arguments(args)).toThrow("B20_INVALID_INPUT");
  });
  it("requires explicit verify mode and refuses context overrides", async () => {
    await expect(b20Command("verify", { input: sourceReport })).rejects.toThrow("--rpc-url-env");
    await expect(
      b20Command("verify", { input: sourceReport, offline: "true", block: "latest" }),
    ).rejects.toThrow("source report");
  });
  it("bounds artifact reads and rejects malformed JSON", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "bao-b20-limits-"));
    const oversized = path.join(dir, "oversized.json");
    await writeFile(oversized, "a".repeat(65537));
    await expect(b20Command("verify", { input: oversized, offline: "true" })).rejects.toThrow(
      "B20_INPUT_LIMIT",
    );
    const malformed = path.join(dir, "malformed.json");
    await writeFile(malformed, "{secret");
    await expect(b20Command("verify", { input: malformed, offline: "true" })).rejects.toThrow(
      "B20_INVALID_INPUT",
    );
  });
  it("shows limitations and scope in human and Markdown output", async () => {
    const result = await b20Command("inspect", {
      input,
      "chain-id": "84532",
      offline: "true",
      format: "markdown",
    });
    expect(result.message).toContain("Application readiness: not-tested");
    expect(result.message).toContain("Evidence: synthetic");
    expect(result.message).toContain("end-of-block");
  });
});
