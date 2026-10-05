import type { ActivityWork, ActivityWorkReply, ActivityWorkResult } from "./activity-processing";

type ActivityWorker = Pick<
  Worker,
  "postMessage" | "terminate" | "onmessage" | "onerror" | "onmessageerror"
>;

export function runActivityWork(
  work: ActivityWork,
  signal: AbortSignal,
  createWorker: () => ActivityWorker = () =>
    new Worker(new URL("./activity-worker.ts", import.meta.url), { type: "module" }),
): Promise<ActivityWorkResult> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Activity processing cancelled.", "AbortError"));
      return;
    }
    let worker: ActivityWorker;
    let settled = false;
    function finish(error?: Error, result?: ActivityWorkResult) {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", cancel);
      if (worker) {
        worker.onmessage = worker.onerror = worker.onmessageerror = null;
        worker.terminate();
      }
      if (error) reject(error);
      else resolve(result!);
    }
    function cancel() {
      finish(new DOMException("Activity processing cancelled.", "AbortError"));
    }
    try {
      worker = createWorker();
      signal.addEventListener("abort", cancel, { once: true });
      worker.onmessage = (event: MessageEvent<ActivityWorkReply>) => {
        const reply = event.data;
        if (reply.ok) finish(undefined, reply.result);
        else finish(new Error(reply.error));
      };
      worker.onerror = worker.onmessageerror = () =>
        finish(
          new Error("Activity processing could not finish. Retry the import in this browser."),
        );
      worker.postMessage(work);
    } catch {
      finish(
        new Error(
          "This browser could not start activity processing. Retry in a browser with Web Worker support.",
        ),
      );
    }
  });
}
