"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ACTIVITY_DAYS,
  explorerLink,
  formatEth,
  summarizeActivity,
  validBuilderCode,
  type ActivityDataset,
  type ActivityDays,
  type ActivityNetwork,
} from "./activity";
import type { ActivityResult } from "./activity-source";
import type { ActivitySummary } from "./activity-processing";
import { runActivityWork } from "./activity-worker-client";

const number = new Intl.NumberFormat("en-US");
const date = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const shortDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const shorten = (value: string) => value.slice(0, 8) + "…" + value.slice(-6);
type Example = { code: string; title: string; network: ActivityNetwork; dataset: ActivityDataset };
type Props = {
  initialCode: string;
  initialDays: ActivityDays;
  initialNetwork: ActivityNetwork;
  initialDataset: ActivityDataset | null;
  initialMessage: string;
  configured: boolean;
  examples: Example[];
};

export function ActivityDashboard(props: Props) {
  const [codeInput, setCodeInput] = useState(props.initialCode);
  const [code, setCode] = useState(props.initialCode);
  const [days, setDays] = useState(props.initialDays);
  const [network, setNetwork] = useState(props.initialNetwork);
  const [dataset, setDataset] = useState(props.initialDataset);
  const [message, setMessage] = useState(props.initialMessage);
  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [summaryCache, setSummaryCache] = useState<{
    dataset: ActivityDataset;
    days: ActivityDays;
    network: ActivityNetwork;
    summary: ActivitySummary;
  } | null>(null);
  const [shareStatus, setShareStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [resultsStatus, setResultsStatus] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [plotMetric, setPlotMetric] = useState<"operations" | "wallets">("operations");
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chart = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      request.current?.abort();
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);
  const cachedSummary =
    summaryCache?.dataset === dataset &&
    summaryCache.days === days &&
    summaryCache.network === network
      ? summaryCache.summary
      : null;
  const summary = useMemo(
    () =>
      dataset?.source === "import"
        ? cachedSummary
        : dataset
          ? summarizeActivity(dataset, days, network)
          : null,
    [dataset, days, network, cachedSummary],
  );
  useEffect(() => {
    setSummaryError("");
    if (!dataset || dataset.source !== "import" || cachedSummary) {
      setSummarizing(false);
      return;
    }
    const controller = new AbortController();
    setSummarizing(true);
    void runActivityWork({ kind: "summary", dataset, days, network }, controller.signal)
      .then(({ summary }) => {
        if (!controller.signal.aborted) {
          setSummaryError("");
          setSummaryCache({ dataset, days, network, summary });
        }
      })
      .catch((problem: unknown) => {
        if (!controller.signal.aborted)
          setSummaryError(
            problem instanceof Error
              ? problem.message
              : "Activity could not be calculated. Retry the import.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setSummarizing(false);
      });
    return () => controller.abort();
  }, [dataset, days, network, cachedSummary]);
  const filtered = useMemo(
    () =>
      summary?.rows.filter((row) => {
        const term = debouncedSearch.trim().toLowerCase();
        return (
          (!selectedDay || row.timestamp?.slice(0, 10) === selectedDay) &&
          (outcome === "all" ||
            (outcome === "success" && row.success === true) ||
            (outcome === "reverted" && row.success === false) ||
            (outcome === "unknown" && row.success === null)) &&
          (!term ||
            [row.hash, row.userOperationHash, row.wallet, row.recipient].some((value) =>
              value?.includes(term),
            ))
        );
      }) ?? [],
    [summary, debouncedSearch, selectedDay, outcome],
  );
  const visible = filtered.slice(page * 10, page * 10 + 10);
  const attributionCounts = useMemo(
    () => ({
      decoded: summary?.rows.filter((row) => row.attribution === "decoded").length,
      reported: summary?.rows.filter((row) => row.attribution === "reported").length,
    }),
    [summary],
  );
  useEffect(() => {
    if (search !== debouncedSearch) return;
    setResultsStatus(
      loading || importing || summarizing
        ? "Processing activity."
        : `${number.format(filtered.length)} operations match. ${filtered.length ? `Showing ${number.format(page * 10 + 1)} to ${number.format(Math.min((page + 1) * 10, filtered.length))}.` : "No operations to show."} ${days} day period, ${network === 8453 ? "Base mainnet" : "Base Sepolia"}. ${selectedDay ? `Selected day ${selectedDay}.` : "All days."} ${outcome === "all" ? "All results." : `Result filter: ${outcome}.`} ${debouncedSearch ? `Search: ${debouncedSearch}.` : ""}`,
    );
  }, [
    filtered.length,
    page,
    loading,
    importing,
    summarizing,
    search,
    debouncedSearch,
    days,
    network,
    selectedDay,
    outcome,
  ]);
  const chosen = summary?.daily.find((day) => day.date === selectedDay);
  const peak = Math.max(1, ...(summary?.daily.map((day) => day[plotMetric]) ?? []));
  const sample = dataset?.source === "published";
  const sourceLabel =
    dataset?.source === "dune"
      ? dataset.includesUserOperations
        ? "Indexed activity"
        : "Indexed transactions"
      : dataset?.source === "import"
        ? "Imported data"
        : dataset
          ? "Published sample"
          : "Awaiting data";

  function syncUrl(
    nextCode: string,
    nextDays: ActivityDays,
    nextNetwork: ActivityNetwork,
    source: string,
  ) {
    const url = new URL(window.location.href);
    url.search = new URLSearchParams({
      code: nextCode,
      days: String(nextDays),
      network: String(nextNetwork),
      source,
    }).toString();
    window.history.replaceState(null, "", url);
    setShareStatus("");
  }
  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setOutcome("all");
    setPage(0);
    setSelectedDay(null);
  }
  function stopLookup() {
    request.current?.abort();
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setLoading(false);
    setImporting(false);
    setImportStatus("");
  }
  async function loadHistory(nextCode: string, nextNetwork: ActivityNetwork) {
    if (!validBuilderCode(nextCode)) {
      setError("Enter a valid Builder Code, for example bc_abc123.");
      return;
    }
    stopLookup();
    const controller = new AbortController();
    request.current = controller;
    setCode(nextCode);
    setCodeInput(nextCode);
    setNetwork(nextNetwork);
    setDataset(null);
    setError("");
    resetFilters();
    setLoading(true);
    setMessage("Finding activity for " + nextCode + ".");
    syncUrl(nextCode, days, nextNetwork, "dune");
    let attempts = 0;
    async function fetchResult(execute: boolean) {
      try {
        const query = new URLSearchParams({
          code: nextCode,
          network: String(nextNetwork),
          days: "90",
        });
        const response = await fetch("/dashboard/activity?" + query, {
          method: execute ? "POST" : "GET",
          signal: controller.signal,
        });
        const result = (await response.json()) as ActivityResult;
        if (controller.signal.aborted) return;
        if (result.state === "ready") {
          setDataset(result.dataset);
          setMessage("");
          setLoading(false);
        } else if (result.state === "pending" && attempts++ < 18) {
          setMessage(result.message);
          timer.current = setTimeout(() => {
            void fetchResult(false);
          }, result.retryAfter * 1000);
        } else {
          setLoading(false);
          setMessage(
            result.state === "pending"
              ? "The history query is still running. Retry the lookup shortly, or import an export."
              : result.message,
          );
          if (result.state === "error") setError(result.message);
        }
      } catch {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError("The lookup could not finish. Retry or import a Dune export.");
        setMessage("");
      }
    }
    await fetchResult(true);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void loadHistory(codeInput.trim(), network);
  }
  function useExample(example: Example) {
    stopLookup();
    setCode(example.code);
    setCodeInput(example.code);
    setNetwork(example.network);
    setDataset(example.dataset);
    setMessage("");
    setError("");
    resetFilters();
    syncUrl(example.code, days, example.network, "published");
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    stopLookup();
    const nextCode = codeInput.trim();
    if (!validBuilderCode(nextCode)) {
      setError("Enter the Builder Code for this export before importing.");
      event.target.value = "";
      return;
    }
    setError("");
    const controller = new AbortController();
    request.current = controller;
    const importNetwork = network;
    setImporting(true);
    setImportStatus("Processing import in this browser. Your file is not uploaded.");
    try {
      if (file.size > 10_000_000) throw new Error("Choose a CSV or JSON file smaller than 10 MB.");
      const { dataset: imported, summary: importedSummary } = await runActivityWork(
        { kind: "import", file, builderCode: nextCode, network: importNetwork, days },
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setCode(nextCode);
      setDataset(imported);
      setSummaryCache({
        dataset: imported,
        days,
        network: importNetwork,
        summary: importedSummary,
      });
      setImportStatus("Import complete. Your file stays in this browser session.");
      setMessage("");
      resetFilters();
      syncUrl(nextCode, days, importNetwork, "import");
    } catch (problem) {
      if (!controller.signal.aborted) {
        setError(problem instanceof Error ? problem.message : "This export could not be read.");
        setImportStatus("Import could not finish. Your previous data is unchanged.");
      }
    } finally {
      if (!controller.signal.aborted) setImporting(false);
    }
  }
  function changeDays(value: ActivityDays) {
    if (importing) {
      stopLookup();
      setImportStatus("Import cancelled. Import the file again for the selected period.");
    }
    setDays(value);
    setSelectedDay(null);
    setPage(0);
    syncUrl(code, value, network, dataset?.source ?? "dune");
  }
  function changeNetwork(value: ActivityNetwork) {
    if (dataset?.source === "dune") {
      void loadHistory(code, value);
      return;
    }
    stopLookup();
    setNetwork(value);
    setSelectedDay(null);
    setPage(0);
    syncUrl(code, days, value, dataset?.source ?? "dune");
  }
  function selectDay(value: string) {
    setSelectedDay((current) => (current === value ? null : value));
    setPage(0);
  }
  function chartKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const total = summary?.daily.length ?? 0;
    const next =
      event.key === "ArrowRight"
        ? Math.min(total - 1, index + 1)
        : event.key === "ArrowLeft"
          ? Math.max(0, index - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? total - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    (chart.current?.children[next] as HTMLButtonElement | undefined)?.focus();
    setSelectedDay(summary!.daily[next].date);
    setPage(0);
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus(
        dataset?.source === "import"
          ? "Selection link copied. Import the same file to reopen this data."
          : "Dashboard link copied.",
      );
    } catch {
      setShareStatus("Copy the page address to share this selection.");
    }
  }
  function exportData() {
    if (!dataset || !summary) return;
    const body = JSON.stringify(
      {
        builderCode: code,
        title: dataset.title,
        source: dataset.source,
        updatedAt: dataset.updatedAt,
        rangeStart: summary.periodStart,
        rangeEnd: summary.periodEnd,
        complete: dataset.complete,
        includesUserOperations: dataset.includesUserOperations,
        scope: sample
          ? "Published proof sample only."
          : "Activity found with this Builder Code in the supplied source.",
        operations: summary.rows,
      },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "bao-" + code + "-" + network + "-" + days + "d.json";
    document.body.append(link);
    link.click();
    link.remove();
    // Let the browser consume the blob before releasing its URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <div className="activity-dashboard">
      <header className="activity-heading">
        <div>
          <h1>App activity</h1>
          <p>A clearer view of what your app puts onchain.</p>
        </div>
        <Link href="/dashboard/evidence" className="activity-text-link">
          Attribution evidence <Icon name="arrow" />
        </Link>
      </header>
      <section className="activity-source-window" aria-labelledby="activity-source-title">
        <h2 className="activity-window-title" id="activity-source-title">
          <Icon name="contract" /> Data source
        </h2>
        <form className="activity-lookup" onSubmit={submit}>
          <label className="activity-code-field">
            <span>Builder Code</span>
            <span className="activity-code-input">
              <span aria-hidden="true">bc /</span>
              <input
                value={codeInput}
                onChange={(event) => {
                  if (importing) stopLookup();
                  setCodeInput(event.target.value);
                  setError("");
                }}
                placeholder="bc_abc123"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={255}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "activity-error" : undefined}
              />
            </span>
          </label>
          <label className="activity-network-field">
            <span>Network</span>
            <select
              value={network}
              onChange={(event) => changeNetwork(Number(event.target.value) as ActivityNetwork)}
            >
              <option value={8453}>Base mainnet</option>
              <option value={84532}>Base Sepolia</option>
            </select>
          </label>
          <button type="submit" className="activity-button activity-primary" disabled={loading}>
            {loading ? "Loading activity" : "Load activity"} <Icon name="arrow" />
          </button>
        </form>
        <div className="activity-lookup-under">
          <div className="activity-examples">
            <span>Published examples</span>
            {props.examples.map((example) => (
              <button
                key={example.code}
                onClick={() => useExample(example)}
                aria-pressed={sample && code === example.code}
              >
                {example.title} <Icon name="arrow" />
              </button>
            ))}
          </div>
          <button className="activity-text-link" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" /> Import CSV / JSON
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.json,application/json,text/csv"
            onChange={(event) => {
              void importFile(event);
            }}
            className="activity-file-input"
            aria-label="Import an activity export"
            tabIndex={-1}
          />
        </div>
      </section>
      <div className="activity-share-status" role="status" aria-live="polite" aria-atomic="true">
        {importStatus}
        {importing ? (
          <button
            className="activity-button"
            onClick={() => {
              stopLookup();
              setImportStatus("Import cancelled. Your previous data is unchanged.");
            }}
          >
            Cancel import
          </button>
        ) : null}
        {summarizing ? " Updating activity totals in this browser." : null}
      </div>
      {error ? (
        <p className="activity-error" role="alert" id="activity-error">
          {error}
        </p>
      ) : null}
      {summaryError ? (
        <p className="activity-error" role="alert" id="activity-summary-error">
          {summaryError}
        </p>
      ) : null}
      <section
        className="activity-results"
        aria-label="App activity results"
        aria-describedby={summaryError ? "activity-summary-error" : undefined}
        aria-busy={loading || importing || summarizing}
      >
        <div className="activity-context">
          <div className="activity-project">
            <span className="activity-project-mark" aria-hidden="true">
              <Icon name="blocks" />
            </span>
            <div>
              <h2>
                {sample
                  ? (props.examples.find((example) => example.code === code)?.title ??
                    dataset?.title)
                  : (dataset?.title ?? (code || "Your application"))}
              </h2>
              <code>{code || "Enter your Builder Code"}</code>
            </div>
            <span
              className={
                "activity-source " + (sample || network === 84532 ? "activity-source-sample" : "")
              }
            >
              <span aria-hidden="true" />
              {sourceLabel}
            </span>
          </div>
          <div className="activity-period" role="group" aria-label="Activity period">
            {ACTIVITY_DAYS.map((value) => (
              <button key={value} onClick={() => changeDays(value)} aria-pressed={days === value}>
                {value}D
              </button>
            ))}
          </div>
        </div>
        {dataset ? (
          <div className="activity-provenance">
            <p>
              {sample
                ? "A recorded proof sample. Counts describe these published operations only."
                : dataset.source === "import"
                  ? "Counts describe the imported rows. The file stays in this browser session."
                  : dataset.includesUserOperations
                    ? "Activity indexed with this Builder Code, including UserOperations."
                    : "Ordinary transactions indexed with this Builder Code. UserOperations are outside this source."}
            </p>
            <span>
              {sample ? "Snapshot" : "Updated"}{" "}
              <time dateTime={dataset.updatedAt}>{date.format(new Date(dataset.updatedAt))}</time>
            </span>
          </div>
        ) : (
          <div className="activity-source-message" role="status">
            <Icon name={loading ? "blocks" : "search"} />
            <div>
              <strong>{loading ? "Looking up your app" : "Explore your onchain activity"}</strong>
              <p>
                {message ||
                  (props.configured
                    ? "Enter a Builder Code to load its indexed history, or import an export."
                    : "Import a Dune export to explore your app, or open a published example.")}
              </p>
            </div>
            {loading ? (
              <button className="activity-text-link" onClick={stopLookup}>
                Cancel lookup
              </button>
            ) : null}
          </div>
        )}
        <div className={"activity-overview" + (loading ? " activity-loading" : "")}>
          <dl className="activity-metrics">
            <Metric
              variant="total"
              label={sample ? "Operations in sample" : "Attributed operations"}
              value={summary ? number.format(summary.total) : "—"}
              detail={
                summary
                  ? number.format(summary.transactions) +
                    " transactions · " +
                    number.format(summary.userOperations) +
                    " user ops"
                  : "Transactions and user operations"
              }
            />
            <Metric
              variant="wallets"
              label="Active wallets"
              value={
                summary && summary.activeWallets !== null
                  ? number.format(summary.activeWallets)
                  : "—"
              }
              detail={
                summary?.walletDataMissing
                  ? "Known wallets on successful operations"
                  : "Wallets with a successful operation"
              }
            />
            <Metric
              variant="success"
              ratio={summary?.successRate ?? null}
              label="Successful operations"
              value={summary?.statusKnown ? summary.successRate!.toFixed(1) + "%" : "—"}
              detail={
                summary
                  ? number.format(summary.statusKnown) + " operations with a recorded status"
                  : "Based on recorded execution status"
              }
            />
            <Metric
              variant="gas"
              label="Recorded gas cost"
              value={summary && summary.feeWei !== null ? formatEth(summary.feeWei) : "—"}
              unit={summary && summary.feeWei !== null ? "ETH" : undefined}
              detail={
                summary
                  ? number.format(summary.feeRows) + " operations with fee data"
                  : "Network fees, when available"
              }
            />
          </dl>
          <div className="activity-analysis">
            <section
              className="activity-chart-panel"
              id="activity"
              aria-labelledby="activity-chart-title"
            >
              <div className="activity-panel-heading">
                <div>
                  <h2 id="activity-chart-title">
                    <Icon name="blocks" /> Activity over time
                  </h2>
                  <p>
                    {summary
                      ? shortDate.format(new Date(summary.periodStart)) +
                        " – " +
                        shortDate.format(new Date(summary.periodEnd)) +
                        " · UTC"
                      : "Daily onchain activity"}
                  </p>
                </div>
                <div className="activity-chart-toggle" role="group" aria-label="Chart metric">
                  <button
                    aria-pressed={plotMetric === "operations"}
                    onClick={() => setPlotMetric("operations")}
                  >
                    Operations
                  </button>
                  <button
                    aria-pressed={plotMetric === "wallets"}
                    onClick={() => setPlotMetric("wallets")}
                  >
                    Wallets
                  </button>
                </div>
              </div>
              <label className="activity-day-picker">
                <span>Inspect day · UTC</span>
                <select
                  value={selectedDay ?? ""}
                  disabled={!summary || !summary.daily.some((day) => day.operations > 0)}
                  onChange={(event) => {
                    setSelectedDay(event.target.value || null);
                    setPage(0);
                  }}
                >
                  <option value="">All days</option>
                  {summary?.daily.map((day) => (
                    <option key={day.date} value={day.date}>
                      {date.format(new Date(day.date))} · {number.format(day.operations)}{" "}
                      {day.operations === 1 ? "operation" : "operations"}
                    </option>
                  ))}
                </select>
              </label>
              {summary && summary.daily.some((day) => day[plotMetric] > 0) ? (
                <div className="activity-plot">
                  <div className="activity-y-axis" aria-hidden="true">
                    <span>{number.format(peak)}</span>
                    <span>0</span>
                  </div>
                  <div
                    className="activity-bars"
                    ref={chart}
                    role="group"
                    aria-label="Daily activity. Use arrow keys to inspect days."
                  >
                    {summary.daily.map((day, index) => (
                      <button
                        key={day.date}
                        className="activity-bar"
                        aria-pressed={selectedDay === day.date}
                        aria-label={
                          day.date +
                          ": " +
                          day.operations +
                          " operations, " +
                          day.wallets +
                          " active wallets"
                        }
                        title={
                          shortDate.format(new Date(day.date)) +
                          " · " +
                          day[plotMetric] +
                          " " +
                          plotMetric
                        }
                        tabIndex={
                          selectedDay
                            ? selectedDay === day.date
                              ? 0
                              : -1
                            : index === summary.daily.length - 1
                              ? 0
                              : -1
                        }
                        onClick={() => selectDay(day.date)}
                        onKeyDown={(event) => chartKey(event, index)}
                      >
                        <span style={{ height: (day[plotMetric] / peak) * 100 + "%" }} />
                      </button>
                    ))}
                  </div>
                  <div className="activity-x-axis" aria-hidden="true">
                    {[0, Math.floor((days - 1) / 2), days - 1].map((index) => (
                      <span key={index}>
                        {shortDate.format(new Date(summary.daily[index].date))}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={"activity-plot-empty" + (loading ? " activity-loading" : "")}>
                  <span className="activity-empty-pixels" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <strong>
                    {loading
                      ? "Preparing daily activity"
                      : summary?.undated
                        ? "Dates are not recorded in this sample"
                        : plotMetric === "wallets" && summary?.walletDataMissing
                          ? "Wallet activity needs sender and status data"
                          : summary
                            ? "No dated activity in this period"
                            : "Your app's activity will appear here"}
                  </strong>
                  <p>
                    {summary?.undated
                      ? "The operations are listed below. Import timestamps to plot them by day."
                      : summary
                        ? "Try another period, network or data source."
                        : "Choose a Builder Code or import an export to begin."}
                  </p>
                </div>
              )}
              <div className="activity-chart-caption" role="status">
                {chosen ? (
                  <>
                    <span>{shortDate.format(new Date(chosen.date))}</span>
                    <b>{chosen.operations} operations</b>
                    <span>{chosen.wallets} active wallets</span>
                    <button
                      onClick={() => {
                        setSelectedDay(null);
                        setPage(0);
                      }}
                    >
                      Clear day filter <Icon name="close" />
                    </button>
                  </>
                ) : (
                  <>
                    <span>
                      <i className="activity-key" />{" "}
                      {plotMetric === "operations" ? "Attributed operations" : "Active wallets"}
                    </span>
                    <span>
                      {summary?.undated
                        ? summary.undated + " operations have no recorded date"
                        : "All operations in the selected period"}
                    </span>
                  </>
                )}
              </div>
            </section>
            <section className="activity-outcomes" aria-labelledby="activity-outcomes-title">
              <h2 className="activity-window-title" id="activity-outcomes-title">
                <Icon name="blocks" /> Execution results
              </h2>
              <p>What happened onchain.</p>
              <div className="activity-outcome-track" aria-hidden="true">
                <span style={{ flex: summary?.successful ?? 0 }} />
                <span style={{ flex: summary?.reverted ?? 0 }} />
                <span style={{ flex: summary ? summary.total - summary.statusKnown : 1 }} />
              </div>
              <dl>
                <Outcome label="Successful" value={summary?.successful} kind="good" />
                <Outcome label="Reverted" value={summary?.reverted} kind="failed" />
                <Outcome
                  label="Status unavailable"
                  value={summary ? summary.total - summary.statusKnown : undefined}
                  kind="unknown"
                />
              </dl>
              <div className="activity-wallet-note">
                <Icon name="wallet" />
                <div>
                  <strong>
                    {summary && !summary.walletDataMissing ? summary.repeatWallets : "—"} repeat
                    wallets
                  </strong>
                  <p>
                    At least two successful operations in this view. Wallets are addresses, not
                    people.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div className="activity-secondary">
          <section className="activity-destinations" aria-labelledby="activity-destinations-title">
            <div className="activity-panel-heading">
              <div>
                <h2 id="activity-destinations-title">
                  <Icon name="contract" /> Where activity goes
                </h2>
                <p>Recorded destination addresses.</p>
              </div>
              <span className="activity-count">
                {summary ? summary.contracts.length : "—"} addresses
              </span>
            </div>
            {summary?.contracts.length ? (
              <ol>
                {summary.contracts.slice(0, 5).map((item) => (
                  <li key={item.address}>
                    <a
                      href={
                        (network === 84532
                          ? "https://sepolia.basescan.org"
                          : "https://basescan.org") +
                        "/address/" +
                        item.address
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      title={item.address}
                    >
                      <Icon name="contract" />
                      <code>{shorten(item.address)}</code>
                      <Icon name="arrow" />
                    </a>
                    <span className="activity-destination-bar" aria-hidden="true">
                      <i style={{ width: (item.operations / summary.total) * 100 + "%" }} />
                    </span>
                    <b>{number.format(item.operations)}</b>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="activity-inline-empty">
                Destination data will appear when the source includes recipient addresses.
              </p>
            )}
          </section>
          <section
            className="activity-attribution"
            id="attribution"
            aria-labelledby="activity-attribution-title"
          >
            <h2 className="activity-window-title" id="activity-attribution-title">
              <Icon name="link" /> Follow the attribution
            </h2>
            <p>Inspect the operations carrying your code, then check the paths that create them.</p>
            <dl>
              <div>
                <dt>Code decoded from calldata</dt>
                <dd>{attributionCounts.decoded ?? "—"}</dd>
              </div>
              <div>
                <dt>Code reported by the source</dt>
                <dd>{attributionCounts.reported ?? "—"}</dd>
              </div>
            </dl>
            <Link
              href={
                "/dashboard/evidence?project=" + encodeURIComponent(code) + "&network=" + network
              }
              className="activity-text-link"
            >
              Open attribution evidence <Icon name="arrow" />
            </Link>
            <p className="activity-fine-print">
              Lookup by code cannot reveal operations where the code is missing. Source audits check
              supported paths before release.
            </p>
          </section>
        </div>
        <section
          className="activity-ledger"
          id="operations"
          aria-labelledby="activity-ledger-title"
        >
          <div className="activity-panel-heading">
            <div>
              <h2 id="activity-ledger-title">
                <Icon name="contract" /> Operations
              </h2>
              <p>Open a transaction to inspect the onchain record.</p>
            </div>
            <div className="activity-ledger-actions">
              <button className="activity-button" onClick={share}>
                <Icon name="link" /> Share
              </button>
              <button className="activity-button" onClick={exportData} disabled={!dataset}>
                <Icon name="download" /> Export JSON
              </button>
            </div>
          </div>
          {shareStatus ? (
            <p className="activity-share-status" role="status">
              {shareStatus}
            </p>
          ) : null}
          <div className="activity-ledger-tools">
            <label className="activity-search">
              <Icon name="search" />
              <input
                aria-label="Search operations"
                placeholder="Search hash or wallet"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
            </label>
            <label className="activity-outcome-filter">
              <span>Result</span>
              <select
                value={outcome}
                onChange={(event) => {
                  setOutcome(event.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All results</option>
                <option value="success">Successful</option>
                <option value="reverted">Reverted</option>
                <option value="unknown">Status unavailable</option>
              </select>
            </label>
            <span className="activity-row-count">
              {number.format(filtered.length)} operations
              {selectedDay ? " · " + shortDate.format(new Date(selectedDay)) : ""}
            </span>
          </div>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {resultsStatus}
          </p>
          <div
            className="activity-table-scroll"
            role="region"
            aria-label="Operations table"
            tabIndex={0}
          >
            <table className="activity-table">
              <thead>
                <tr>
                  <th scope="col">Transaction</th>
                  <th scope="col">Wallet</th>
                  <th scope="col">Time · UTC</th>
                  <th scope="col">Result</th>
                  <th scope="col">Gas · ETH</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <a
                        href={explorerLink(row)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={row.hash}
                      >
                        <code>{shorten(row.hash)}</code>
                        <Icon name="arrow" />
                      </a>
                      <span className="activity-operation-kind">
                        {row.kind === "user-operation"
                          ? "UserOperation · " + shorten(row.userOperationHash!)
                          : "Transaction"}
                      </span>
                    </td>
                    <td>
                      {row.wallet ? (
                        <code title={row.wallet}>{shorten(row.wallet)}</code>
                      ) : (
                        <span className="activity-unavailable">Not recorded</span>
                      )}
                    </td>
                    <td>
                      {row.timestamp ? (
                        <time dateTime={row.timestamp}>
                          {shortDate.format(new Date(row.timestamp))}
                          <span>{time.format(new Date(row.timestamp))}</span>
                        </time>
                      ) : (
                        <span className="activity-unavailable">Not recorded</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={
                          "activity-result-label " +
                          (row.success === true
                            ? "is-good"
                            : row.success === false
                              ? "is-failed"
                              : "is-unknown")
                        }
                      >
                        <i aria-hidden="true" />
                        {row.success === true
                          ? "Successful"
                          : row.success === false
                            ? "Reverted"
                            : "Unavailable"}
                      </span>
                    </td>
                    <td className="activity-fee">
                      {row.feeWei === null ? (
                        <span className="activity-unavailable">Not recorded</span>
                      ) : (
                        formatEth(row.feeWei)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!visible.length ? (
            <div className="activity-ledger-empty">
              <Icon name="search" />
              <strong>
                {dataset ? "No operations match this view" : "Ready for your first lookup"}
              </strong>
              <p>
                {dataset
                  ? "Change the period, network or filters to explore other records."
                  : "Load indexed history, import an export or choose a published example."}
              </p>
              {dataset && (search || outcome !== "all" || selectedDay) ? (
                <button className="activity-text-link" onClick={resetFilters}>
                  Clear table filters <Icon name="arrow" />
                </button>
              ) : null}
            </div>
          ) : null}
          <footer className="activity-ledger-footer">
            <span>
              {filtered.length
                ? number.format(page * 10 + 1) +
                  "–" +
                  number.format(Math.min((page + 1) * 10, filtered.length)) +
                  " of " +
                  number.format(filtered.length)
                : "0 visible operations"}
            </span>
            <div>
              <button
                className="activity-button"
                disabled={page === 0 || search !== debouncedSearch}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="activity-button"
                disabled={(page + 1) * 10 >= filtered.length || search !== debouncedSearch}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </footer>
        </section>
        <details className="activity-method">
          <summary>
            How to read these numbers <Icon name="plus" />
          </summary>
          <div>
            <p>
              Periods use UTC dates and end at the source's observation time. Published samples can
              be historical. Operations without timestamps remain in the table and total, but are
              excluded from the daily chart.
            </p>
            <p>
              Active wallets require a sender and a successful execution. ERC-4337 activity uses the
              UserOperation sender. A bundler transaction is not counted again when its operations
              are supplied.
            </p>
            <p>
              Gas totals include only recorded fees. Ordinary transaction fees need both L1 and
              execution costs; UserOperations use their reported actual gas cost. They measure
              network costs, not app revenue.
            </p>
            <p>
              These counts describe activity found with the selected code. They do not measure all
              app traffic, missing attribution, visits or marketing funnels. Imported and indexed
              rows are not independently RPC verified by this dashboard.
            </p>
            {summary?.omitted ? (
              <p>
                {summary.omitted} supplied rows without the selected Builder Code are excluded from
                this view.
              </p>
            ) : null}
          </div>
        </details>
      </section>
    </div>
  );
}

function Metric({
  variant,
  ratio,
  label,
  value,
  detail,
  unit,
}: {
  variant: "total" | "wallets" | "success" | "gas";
  ratio?: number | null;
  label: string;
  value: string;
  detail: string;
  unit?: string;
}) {
  return (
    <div className={"activity-metric activity-metric-" + variant}>
      <dt>
        <Icon name={variant === "wallets" ? "wallet" : variant === "gas" ? "contract" : "blocks"} />
        {label}
      </dt>
      <dd>
        <span className="activity-metric-value" data-long={value.length > 5}>
          {value}
          {unit ? <small>{unit}</small> : null}
        </span>
        {variant === "success" ? (
          <span className="activity-ratio" aria-hidden="true">
            {Array.from({ length: 20 }, (_, index) => (
              <i
                key={index}
                data-filled={
                  ratio !== null &&
                  ratio !== undefined &&
                  index < Math.round(Math.min(100, Math.max(0, ratio)) / 5)
                }
              />
            ))}
          </span>
        ) : null}
        <p>{detail}</p>
      </dd>
    </div>
  );
}
function Outcome({ label, value, kind }: { label: string; value?: number; kind: string }) {
  return (
    <div>
      <dt>
        <i className={"activity-key " + kind} aria-hidden="true" />
        {label}
      </dt>
      <dd>{value === undefined ? "—" : number.format(value)}</dd>
    </div>
  );
}
function Icon({
  name,
}: {
  name:
    | "arrow"
    | "upload"
    | "download"
    | "search"
    | "blocks"
    | "wallet"
    | "contract"
    | "close"
    | "link"
    | "plus";
}) {
  const paths = {
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    upload: <path d="M12 17V3m-5 5 5-5 5 5M4 15v6h16v-6" />,
    download: <path d="M12 3v14m-5-5 5 5 5-5M4 17v4h16v-4" />,
    search: <path d="M4 3h10l3 3v10l-3 3H4l-3-3V6zM17 17l5 5" />,
    blocks: <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" />,
    wallet: <path d="M3 5h16v4H3V5zm0 4h18v12H3zm12 4h6v4h-6z" />,
    contract: <path d="M5 2h10l5 5v15H5zM15 2v6h5M8 12h8m-8 4h6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    link: <path d="m9 15 6-6M8 16l-2 2-4-4 7-7 4 4m-2-3 2-2 4 4-7 7-4-4" />,
    plus: <path d="M4 12h16M12 4v16" />,
  };
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
