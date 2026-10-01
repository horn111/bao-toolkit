import { normalizeActivityRows, type ActivityDataset, type ActivityNetwork } from "./activity";
import { dashboardProjects } from "./registry";
import { getPublishedProof, getPublishedProofTransactions } from "../proof-data";
import activitySamples from "../../../../proofs/activity-samples.json";

export type ActivityResult =
  | { state: "ready"; dataset: ActivityDataset }
  | { state: "pending"; message: string; retryAfter: number }
  | { state: "unconfigured" | "error"; message: string };

const MAX_ROWS = 20_000;
const CACHE_MS = 15 * 60_000;
const MAX_CACHE_ENTRIES = 100;
const cache = new Map<string, { expires: number; dataset: ActivityDataset }>();
const pending = new Map<string, { id: string; startedAt: number }>();
const starting = new Set<string>();
const requests = new Map<string, Promise<ActivityResult>>();

export function activitySourceConfigured() {
  return Boolean(
    process.env.DUNE_API_KEY && /^\d+$/.test(process.env.DUNE_ACTIVITY_QUERY_ID ?? ""),
  );
}

export function publishedActivity(code: string): ActivityDataset | null {
  const project = dashboardProjects.find((item) => item.code === code);
  const proof = getPublishedProof(code);
  if (!project || !proof) return null;
  const rows = getPublishedProofTransactions(proof).map(({ chainId, transaction }) => {
    const metadata = activitySamples.rows.find(
      (row) => row.chainId === chainId && row.hash === transaction.hash,
    );
    return {
      ...metadata,
      hash: transaction.hash,
      chainId,
      timestamp: metadata?.timestamp ?? transaction.timestamp,
      // Published ERC-4337 evidence describes a container, not a known user sender.
      wallet: transaction.source?.includes("ERC-4337") ? null : metadata?.wallet,
      codes: transaction.codes,
      calldata: transaction.calldata,
    };
  });
  const operations = normalizeActivityRows(rows, code, 8453);
  const observedEnd = operations
    .map((row) => row.timestamp)
    .filter((value): value is string => value !== null)
    .sort()
    .at(-1);
  return {
    builderCode: code,
    title: project.title,
    source: "published",
    updatedAt: activitySamples.fetchedAt,
    rangeStart: null,
    rangeEnd: observedEnd ?? project.generatedAt,
    complete: false,
    includesUserOperations: false,
    operations,
  };
}

export async function loadDuneActivity(
  builderCode: string,
  network: ActivityNetwork,
  execute = false,
): Promise<ActivityResult> {
  if (!activitySourceConfigured()) {
    return {
      state: "unconfigured",
      message:
        "Indexed history is not connected yet. Import a Dune export or explore published evidence.",
    };
  }
  if (network !== 8453) {
    return {
      state: "error",
      message:
        "Indexed history currently covers Base mainnet. Import Sepolia data to explore testnet activity.",
    };
  }
  const key = network + ":" + builderCode;
  const stored = cache.get(key);
  if (
    stored &&
    stored.expires > Date.now() &&
    (!execute || Date.now() - Date.parse(stored.dataset.updatedAt) < CACHE_MS)
  ) {
    return { state: "ready", dataset: stored.dataset };
  }
  const inFlight = requests.get(key);
  if (inFlight) return inFlight;
  const request = fetchActivity(builderCode, network, key, execute);
  requests.set(key, request);
  try {
    return await request;
  } finally {
    requests.delete(key);
  }
}

async function fetchActivity(
  builderCode: string,
  network: ActivityNetwork,
  key: string,
  execute: boolean,
): Promise<ActivityResult> {
  const queryId = process.env.DUNE_ACTIVITY_QUERY_ID!;
  const headers = {
    "X-Dune-API-Key": process.env.DUNE_API_KEY!,
    "Content-Type": "application/json",
  };
  const parameters = { builder_code: builderCode, chain_id: network, days: 90 };
  const url = new URL("https://api.dune.com/api/v1/query/" + queryId + "/results");
  url.searchParams.set("params.builder_code", builderCode);
  url.searchParams.set("params.chain_id", String(network));
  url.searchParams.set("params.days", "90");
  url.searchParams.set("limit", String(MAX_ROWS));
  const waiting = pending.get(key);
  const resultUrl =
    waiting && Date.now() - waiting.startedAt < 5 * 60_000
      ? "https://api.dune.com/api/v1/execution/" +
        encodeURIComponent(waiting.id) +
        "/results?limit=" +
        MAX_ROWS
      : url;
  try {
    const response = await fetch(resultUrl, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (response.ok) {
      const result = (await response.json()) as {
        state?: string;
        execution_ended_at?: string;
        execution_started_at?: string;
        result?: { rows?: unknown[]; metadata?: { total_row_count?: number; row_count?: number } };
      };
      if (
        ["QUERY_STATE_FAILED", "QUERY_STATE_CANCELLED", "QUERY_STATE_EXPIRED"].includes(
          result.state ?? "",
        )
      ) {
        pending.delete(key);
        return {
          state: "error",
          message: "The history query did not complete. Retry the lookup or import an export.",
        };
      }
      if (result.state === "QUERY_STATE_COMPLETED" && Array.isArray(result.result?.rows)) {
        const rows = result.result.rows;
        const total = result.result.metadata?.total_row_count ?? result.result.metadata?.row_count;
        if (total === undefined || total !== rows.length || total > MAX_ROWS) {
          return {
            state: "error",
            message:
              "This result is incomplete or exceeds 20,000 operations. Import a narrower export; partial results are not shown as full history.",
          };
        }
        const endedAt = Date.parse(result.execution_ended_at ?? "");
        const startedAt = Date.parse(
          result.execution_started_at ?? result.execution_ended_at ?? "",
        );
        if (!Number.isFinite(endedAt) || !Number.isFinite(startedAt)) {
          return {
            state: "error",
            message: "The data source did not report its observation time. Try a fresh export.",
          };
        }
        // Refresh only on a deliberate lookup. Polls and page loads never execute SQL.
        if (!execute || Date.now() - endedAt < CACHE_MS) {
          const end = new Date(startedAt);
          const start = new Date(
            Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) - 89 * 86_400_000,
          );
          const operations = normalizeActivityRows(rows, builderCode, network);
          if (
            operations.some((row) => row.chainId !== network || !row.codes.includes(builderCode))
          ) {
            return {
              state: "error",
              message:
                "The data source returned activity for a different network or Builder Code. Check the query parameters.",
            };
          }
          const includesUserOperations = process.env.DUNE_ACTIVITY_INCLUDES_USEROPS === "true";
          const dataset: ActivityDataset = {
            builderCode,
            title: builderCode,
            source: "dune",
            updatedAt: new Date(endedAt).toISOString(),
            rangeStart: start.toISOString(),
            rangeEnd: end.toISOString(),
            complete: includesUserOperations,
            includesUserOperations,
            operations,
          };
          if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
          cache.set(key, { expires: Date.now() + CACHE_MS, dataset });
          pending.delete(key);
          return { state: "ready", dataset };
        }
      }
    } else if (response.status !== 404) {
      return {
        state: "error",
        message: "The activity source could not be reached. Retry the lookup or import an export.",
      };
    }
    const pendingAt = pending.get(key);
    if (execute && (!pendingAt || Date.now() - pendingAt.startedAt > 5 * 60_000)) {
      const active = [...pending.values()].filter(
        (item) => Date.now() - item.startedAt < 5 * 60_000,
      );
      if (active.length + starting.size >= 4) {
        return {
          state: "error",
          message: "The activity source is busy preparing other lookups. Try again shortly.",
        };
      }
      starting.add(key);
      try {
        const execution = await fetch("https://api.dune.com/api/v1/query/" + queryId + "/execute", {
          method: "POST",
          headers,
          cache: "no-store",
          signal: AbortSignal.timeout(12_000),
          body: JSON.stringify({ query_parameters: parameters, performance: "small" }),
        });
        if (!execution.ok) {
          return {
            state: "error",
            message: "The history query could not start. Try again later or import an export.",
          };
        }
        const started = (await execution.json()) as { execution_id?: unknown };
        if (typeof started.execution_id !== "string") {
          return {
            state: "error",
            message: "The history query did not return an execution. Try again later.",
          };
        }
        if (pending.size >= MAX_CACHE_ENTRIES) pending.delete(pending.keys().next().value!);
        pending.set(key, { id: started.execution_id, startedAt: Date.now() });
      } finally {
        starting.delete(key);
      }
    }
    return {
      state: "pending",
      message: "Preparing the indexed history for this Builder Code.",
      retryAfter: 5,
    };
  } catch {
    return {
      state: "error",
      message: "The lookup timed out or returned unreadable data. Retry or import a Dune export.",
    };
  }
}
