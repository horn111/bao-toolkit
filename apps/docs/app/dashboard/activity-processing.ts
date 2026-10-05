import {
  parseActivityImport,
  summarizeActivity,
  type ActivityDataset,
  type ActivityDays,
  type ActivityNetwork,
} from "./activity";

export type ActivitySummary = ReturnType<typeof summarizeActivity>;
export type ActivityWork = {
  days: ActivityDays;
  network: ActivityNetwork;
} & (
  | { kind: "import"; file: Blob; builderCode: string }
  | { kind: "summary"; dataset: ActivityDataset }
);
export type ActivityWorkResult = { dataset: ActivityDataset; summary: ActivitySummary };
export type ActivityWorkReply =
  { ok: true; result: ActivityWorkResult } | { ok: false; error: string };

// Called only in the worker: reading, decoding, validation and aggregation all stay off the UI thread.
export async function processActivity(work: ActivityWork): Promise<ActivityWorkResult> {
  if (work.kind === "import" && work.file.size > 10_000_000) {
    throw new Error("Choose a CSV or JSON file smaller than 10 MB.");
  }
  const dataset =
    work.kind === "import"
      ? parseActivityImport(await work.file.text(), work.builderCode, work.network)
      : work.dataset;
  return { dataset, summary: summarizeActivity(dataset, work.days, work.network) };
}
