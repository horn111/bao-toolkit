import { describe, expect, it, vi } from "vitest";
import { processActivity, type ActivityWork, type ActivityWorkReply } from "./activity-processing";
import { runActivityWork } from "./activity-worker-client";

function file(rows = 1) {
  return new Blob([
    JSON.stringify(
      Array.from({ length: rows }, (_, i) => ({
        tx_hash: "0x" + i.toString(16).padStart(64, "0"),
        chain_id: i % 2 ? 84532 : 8453,
        codes_array: ["bc_test"],
        success: true,
      })),
    ),
  ]);
}
const work = (): ActivityWork => ({
  kind: "import",
  file: file(),
  builderCode: "bc_test",
  days: 30,
  network: 8453,
});

function fakeWorker() {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: null as Worker["onmessage"],
    onerror: null as Worker["onerror"],
    onmessageerror: null as Worker["onmessageerror"],
  };
}

describe("activity background processing", () => {
  it("normalizes imports and calculates initial totals before returning", async () => {
    const result = await processActivity({ ...work(), file: file(20_000) } as ActivityWork);
    expect(result.dataset.operations).toHaveLength(20_000);
    expect(result.summary.total).toBe(10_000);
    expect(result.summary.successful).toBe(10_000);
    const otherNetwork = await processActivity({
      kind: "summary",
      dataset: result.dataset,
      days: 7,
      network: 84532,
    });
    expect(otherNetwork.summary.total).toBe(10_000);
    expect(otherNetwork.summary.daily).toHaveLength(7);
  });

  it("retains file size, row count and format validation", async () => {
    await expect(
      processActivity({ ...work(), file: new Blob([new Uint8Array(10_000_001)]) } as ActivityWork),
    ).rejects.toThrow("10 MB");
    await expect(
      processActivity({ ...work(), file: file(20_001) } as ActivityWork),
    ).rejects.toThrow("20,000");
    await expect(
      processActivity({ ...work(), file: new Blob(["{invalid JSON"]) } as ActivityWork),
    ).rejects.toThrow();
  });

  it("terminates on cancellation and ignores queued completion after a source change", async () => {
    const controller = new AbortController();
    const worker = fakeWorker();
    const job = runActivityWork(work(), controller.signal, () => worker);
    const staleCompletion = worker.onmessage!;
    const rejection = expect(job).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    const reply: ActivityWorkReply = { ok: true, result: await processActivity(work()) };
    staleCompletion.call(worker as unknown as Worker, { data: reply } as MessageEvent);
    await rejection;
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.onmessage).toBeNull();
  });

  it("keeps a replacement import independent from the cancelled worker", async () => {
    const first = fakeWorker();
    const second = fakeWorker();
    const controller = new AbortController();
    const stale = runActivityWork(work(), controller.signal, () => first);
    const rejection = expect(stale).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    const active = runActivityWork(work(), new AbortController().signal, () => second);
    const result = await processActivity(work());
    second.onmessage!.call(
      second as unknown as Worker,
      { data: { ok: true, result } } as MessageEvent,
    );
    await rejection;
    await expect(active).resolves.toEqual(result);
    expect(second.terminate).toHaveBeenCalledTimes(1);
  });

  it("cleans up successful and failed jobs, and does not start an already cancelled one", async () => {
    const worker = fakeWorker();
    const controller = new AbortController();
    const job = runActivityWork(work(), controller.signal, () => worker);
    worker.onmessage!.call(
      worker as unknown as Worker,
      { data: { ok: false, error: "Invalid CSV" } } as MessageEvent,
    );
    await expect(job).rejects.toThrow("Invalid CSV");
    controller.abort();
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    const create = vi.fn(fakeWorker);
    await expect(runActivityWork(work(), controller.signal, create)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(create).not.toHaveBeenCalled();
  });
});
