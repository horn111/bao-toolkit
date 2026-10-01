import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const code = "bc_test";
const hash = "0x" + "1".repeat(64);
const row = { tx_hash: hash, chain_id: 8453, codes_array: [code], success: true };
const clock = new Date("2026-10-01T12:00:00.000Z");

function completed(rows: unknown[] = [row], total = rows.length, age = 0) {
  const endedAt = new Date(clock.getTime() - age).toISOString();
  return Response.json({
    state: "QUERY_STATE_COMPLETED",
    execution_started_at: endedAt,
    execution_ended_at: endedAt,
    result: { rows, metadata: { total_row_count: total } },
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(clock);
  vi.stubEnv("DUNE_API_KEY", "private-test-key");
  vi.stubEnv("DUNE_ACTIVITY_QUERY_ID", "123");
  vi.stubEnv("DUNE_ACTIVITY_INCLUDES_USEROPS", "false");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("activity data source", () => {
  it("enriches only published proofs and preserves unknown UserOperation senders", async () => {
    const { publishedActivity } = await import("./activity-source");
    const bao = publishedActivity("bc_vwmzy653")!;
    expect(bao).toMatchObject({ source: "published", complete: false });
    expect(bao.operations).toHaveLength(1);
    expect(bao.operations[0]).toMatchObject({
      attribution: "decoded",
      success: true,
      timestamp: "2026-07-01T17:08:45.000Z",
    });
    expect(bao.rangeEnd).toBe("2026-07-01T17:08:45.000Z");
    expect(publishedActivity("bc_unknown")).toBeNull();
    const smartWallet = publishedActivity("bc_4pe6m33m")!.operations.find((operation) =>
      operation.hash.startsWith("0x534565"),
    );
    expect(smartWallet?.wallet).toBeNull();
  });
  it("keeps configuration errors distinct from zero activity", async () => {
    vi.stubEnv("DUNE_API_KEY", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { loadDuneActivity } = await import("./activity-source");
    expect((await loadDuneActivity(code, 8453)).state).toBe("unconfigured");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("scopes every result lookup by code, network and period without executing on reads", async () => {
    const fetcher = vi.fn().mockResolvedValue(completed());
    vi.stubGlobal("fetch", fetcher);
    const { loadDuneActivity } = await import("./activity-source");
    const result = await loadDuneActivity(code, 8453);
    expect(result.state).toBe("ready");
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("params.builder_code")).toBe(code);
    expect(url.searchParams.get("params.chain_id")).toBe("8453");
    expect(url.searchParams.get("params.days")).toBe("90");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain("private-test-key");
    if (result.state === "ready") expect(result.dataset.complete).toBe(false);
  });

  it("polls the newly started execution instead of returning a stale previous result", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(completed([row], 1, 3_600_000))
      .mockResolvedValueOnce(Response.json({ execution_id: "execution-new" }))
      .mockResolvedValueOnce(completed());
    vi.stubGlobal("fetch", fetcher);
    const { loadDuneActivity } = await import("./activity-source");
    expect((await loadDuneActivity(code, 8453, true)).state).toBe("pending");
    expect(fetcher.mock.calls[1][1].method).toBe("POST");
    expect(JSON.parse(fetcher.mock.calls[1][1].body).query_parameters).toEqual({
      builder_code: code,
      chain_id: 8453,
      days: 90,
    });
    expect((await loadDuneActivity(code, 8453)).state).toBe("ready");
    expect(String(fetcher.mock.calls[2][0])).toContain("/execution/execution-new/results");
  });

  it("rejects partial results and unrelated codes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(completed([row], 2))
      .mockResolvedValueOnce(completed([{ ...row, codes_array: ["bc_other"] }]));
    vi.stubGlobal("fetch", fetcher);
    const { loadDuneActivity } = await import("./activity-source");
    expect((await loadDuneActivity(code, 8453)).state).toBe("error");
    expect((await loadDuneActivity(code, 8453)).state).toBe("error");
  });

  it("reserves query slots before concurrent execution requests can spend credits", async () => {
    const executions: Array<(value: Response) => void> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: unknown, options?: { method?: string }) => {
        if (options?.method === "POST") {
          return new Promise<Response>((resolve) => executions.push(resolve));
        }
        return Promise.resolve(new Response(null, { status: 404 }));
      }),
    );
    const { loadDuneActivity } = await import("./activity-source");
    const requests = Array.from({ length: 5 }, (_, index) =>
      loadDuneActivity("bc_test_" + index, 8453, true),
    );
    await vi.waitFor(() => expect(executions).toHaveLength(4));
    executions.forEach((resolve, index) =>
      resolve(Response.json({ execution_id: "run_" + index })),
    );
    const results = await Promise.all(requests);
    expect(results.filter((result) => result.state === "pending")).toHaveLength(4);
    expect(results.filter((result) => result.state === "error")).toHaveLength(1);
  });

  it("does not execute a query for page reads, provider errors or Sepolia", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response("private-provider-error", { status: 401 }));
    vi.stubGlobal("fetch", fetcher);
    const { loadDuneActivity } = await import("./activity-source");
    expect((await loadDuneActivity(code, 8453)).state).toBe("pending");
    const failed = await loadDuneActivity(code, 8453, true);
    expect(failed.state).toBe("error");
    expect(JSON.stringify(failed)).not.toContain("private-provider-error");
    expect((await loadDuneActivity(code, 84532, true)).state).toBe("error");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed and cross-origin requests before reaching the provider", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const { GET, POST } = await import("./activity/route");
    const invalid = await GET(new Request("https://bao.test/dashboard/activity?code=bad%20code"));
    expect(invalid.status).toBe(400);
    const foreign = await POST(
      new Request("https://bao.test/dashboard/activity?code=" + code, {
        method: "POST",
        headers: { origin: "https://foreign.test" },
      }),
    );
    expect(foreign.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
