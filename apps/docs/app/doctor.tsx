"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { SiteHeader } from "./_components/site-header";
import {
  auditSource,
  profiles,
  type AuditResult,
  type Family,
  type Profile,
  type Variant,
} from "./doctor-audit";

interface Example {
  id: string;
  label: string;
  file: string;
  family: Family;
  broken: string;
  fixed: string;
}

const examples: Example[] = [
  {
    id: "wagmi",
    label: "Wagmi app",
    file: "app/send-button.tsx",
    family: "wagmi",
    broken: `import { useSendTransaction } from "wagmi";

export function SendButton() {
  const { sendTransaction } = useSendTransaction();
  return <button onClick={() => sendTransaction({ to, data: "0x" })}>Send</button>;
}`,
    fixed: `import { useSendTransaction } from "wagmi";
import { useAttributionSuffix } from "@base-attribution-os/wagmi";

export function SendButton() {
  const { sendTransaction } = useSendTransaction();
  const dataSuffix = useAttributionSuffix("bc_abc123");
  return <button onClick={() => sendTransaction({ to, data: "0x", dataSuffix })}>Send</button>;
}`,
  },
  {
    id: "privy",
    label: "Privy wallet",
    file: "src/privy-send.ts",
    family: "privy",
    broken: `import { usePrivy } from "@privy-io/react-auth";

export async function send(wallet) {
  return wallet.sendTransaction({ to, data: "0x" });
}`,
    fixed: `import { dataSuffix } from "@privy-io/react-auth";
import { createDataSuffix } from "@base-attribution-os/core";

export const config = {
  plugins: [dataSuffix(createDataSuffix({ codes: ["bc_abc123"] }))],
};

export async function send(wallet) {
  return wallet.sendTransaction({ to, data: "0x" });
}`,
  },
  {
    id: "smart-wallet",
    label: "Smart wallet",
    file: "src/send-calls.ts",
    family: "wallet",
    broken: `export async function batch(wallet) {
  return wallet.sendCalls({ calls: [{ to, data: "0x" }] });
}`,
    fixed: `import { sendAttributedCalls } from "@base-attribution-os/wallet";

export async function batch(provider, account) {
  return sendAttributedCalls(provider, {
    chainId: "0x2105",
    from: account,
    calls: [{ to, data: "0x" }],
  }, {
    codes: ["bc_abc123"],
  });
}`,
  },
  {
    id: "raw-rpc",
    label: "Raw RPC",
    file: "src/legacy-send.ts",
    family: "rpc",
    broken: `await window.ethereum.request({
  method: "eth_sendTransaction",
  params: [{ from, to, data: "0x" }],
});`,
    fixed: `import { appendDataSuffix } from "@base-attribution-os/core";

await window.ethereum.request({
  method: "eth_sendTransaction",
  params: [{ from, to, data: appendDataSuffix("0x", { codes: ["bc_abc123"] }) }],
});`,
  },
  {
    id: "x402",
    label: "x402 buyer",
    file: "src/paid-fetch.ts",
    family: "x402",
    broken: `import { x402Client } from "@x402/fetch";

export const client = new x402Client();`,
    fixed: `import { x402Client } from "@x402/fetch";
import { BuilderCodeClientExtension } from "@x402/extensions/builder-code";

export const client = new x402Client();
client.registerExtension(new BuilderCodeClientExtension("bc_abc123"));`,
  },
  {
    id: "agent",
    label: "Agent tool",
    file: "src/agent-tool.ts",
    family: "agent",
    broken: `export const transactionTool = {
  execute: async ({ wallet, transaction }) => wallet.sendTransaction(transaction),
};`,
    fixed: `import { withViemDataSuffix } from "@base-attribution-os/viem";

export const transactionTool = {
  execute: async ({ wallet, transaction }) =>
    wallet.sendTransaction(withViemDataSuffix(transaction, "bc_abc123")),
};`,
  },
];

export default function DoctorPage() {
  const [builderCode, setBuilderCode] = useState("bc_abc123");
  const [profile, setProfile] = useState<Profile>("ci");
  const [variant, setVariant] = useState<Variant>("broken");
  const [activeExample, setActiveExample] = useState(examples[0]);
  const [source, setSource] = useState(examples[0].broken);
  const [copied, setCopied] = useState<string>();
  const [copyError, setCopyError] = useState("");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    [],
  );
  const result = useMemo(
    () => auditSource(source, activeExample.family, builderCode.trim(), profile),
    [activeExample.family, builderCode, profile, source],
  );
  const actionYaml = useMemo(() => createActionYaml(builderCode.trim()), [builderCode]);
  const lineNumbers = source.split(/\r?\n/).map((_, index) => index + 1);
  const summary =
    result.inputIssue === "builder-code-required"
      ? "Add your expected Builder Code to check attribution."
      : result.inputIssue === "no-paths"
        ? "No supported transaction paths found. Coverage is not measured."
        : `${result.protected} of ${result.paths.length} paths protected. ${profile === "local" ? "Local reporting" : `${profile} policy`}: ${result.ok ? "complete" : "action required"}.`;
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAnnouncement(summary), 350);
    return () => clearTimeout(timer);
  }, [summary]);

  function selectExample(example: Example): void {
    setActiveExample(example);
    setVariant("broken");
    setSource(example.broken);
  }

  function selectVariant(next: Variant): void {
    setVariant(next);
    setSource(activeExample[next]);
  }

  function copyText(label: string, value: string): void {
    setCopyError("");
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(label);
        if (copyTimer.current) clearTimeout(copyTimer.current);
        copyTimer.current = setTimeout(() => setCopied(undefined), 1200);
      })
      .catch(() => setCopyError("Copy failed. Select the code and copy it manually."));
  }

  return (
    <main id="main-content" tabIndex={-1} className="app-container">
      <SiteHeader current="doctor" />
      <p className="copy-error" role="status">
        {copyError}
      </p>

      <section className="hero">
        <div className="hero-meta">
          <h1>Attribution Doctor</h1>
        </div>
        <div className="hero-controls">
          <p className="lede">
            Audit transaction paths across Base apps, wallets, x402 routes, and agents before they
            reach production.
          </p>
          <code className="hero-command">bao scan-repo --profile strict</code>
        </div>
      </section>

      <section
        className={`coverage-strip ${result.coverage === null ? "coverage-unmeasured" : ""}`}
        aria-label="Attribution coverage"
      >
        <div>
          <p className="coverage-value">
            {result.protected}/{result.paths.length} paths protected
          </p>
        </div>
        <div className="coverage-track" aria-hidden="true">
          <span style={{ width: `${result.coverage ?? 0}%` }} />
        </div>
        <strong>{result.coverage === null ? "—" : `${result.coverage}%`}</strong>
      </section>

      <div className="bento-grid doctor-grid">
        <aside className="bento-card input-card">
          <div className="card-header">
            <h2>Project fixture</h2>
          </div>
          <div className="form-stack">
            <label className="form-group">
              <span className="form-label">Builder Code</span>
              <input
                className="text-input"
                required
                aria-invalid={builderCode.trim().length === 0}
                aria-describedby="builder-code-hint"
                spellCheck={false}
                value={builderCode}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setBuilderCode(event.target.value)
                }
              />
              <span id="builder-code-hint" className="field-hint">
                {builderCode.trim()
                  ? "The code this snippet should contain."
                  : "Enter your expected Builder Code, or restore the example below."}
              </span>
            </label>
            <SegmentedControl
              label="Profile"
              options={Object.keys(profiles) as Profile[]}
              value={profile}
              onChange={setProfile}
            />
            <p className="field-hint">{profiles[profile].intent}</p>
            <SegmentedControl
              label="State"
              options={["broken", "fixed"]}
              value={variant}
              onChange={selectVariant}
            />
            <label className="form-group mobile-fixture-select">
              <span className="form-label">Fixture</span>
              <select
                className="text-input"
                value={activeExample.id}
                onChange={(event) =>
                  selectExample(examples.find((example) => example.id === event.target.value)!)
                }
              >
                {examples.map((example) => (
                  <option key={example.id} value={example.id}>
                    {example.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-group desktop-fixture-list">
              <span className="form-label">Fixture</span>
              <div className="option-list">
                {examples.map((example) => (
                  <button
                    key={example.id}
                    className={`option-item ${example.id === activeExample.id ? "active" : ""}`}
                    type="button"
                    aria-pressed={example.id === activeExample.id}
                    onClick={() => selectExample(example)}
                  >
                    <span className="option-item-name">{example.label}</span>
                    <span className="finding-family">{example.family}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="doctor-feedback">
              <p>{summary}</p>
              <a className="text-action" href="#audit-result">
                View findings
              </a>
            </div>
          </div>
        </aside>

        <section className="bento-card editor-card">
          <div className="editor-header">
            <div className="editor-header-title">
              <h2>{activeExample.file}</h2>
            </div>
            <CopyButton copied={copied === "code"} onClick={() => copyText("code", source)} />
          </div>
          <div className="editor-container">
            <div className="line-numbers" aria-hidden="true">
              {lineNumbers.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
            <textarea
              aria-label="Transaction source"
              className="code-textarea"
              spellCheck={false}
              value={source}
              onChange={(event) => setSource(event.target.value)}
            />
          </div>
        </section>

        <AuditResultPanel
          profile={profile}
          result={result}
          onRestore={() => {
            setBuilderCode("bc_abc123");
            selectVariant(variant);
          }}
        />
      </div>
      <p className="sr-only" role="status" aria-atomic="true">
        {announcement}
      </p>

      <section className="bento-card output-card">
        <div className="output-header">
          <div className="editor-header-title">
            <h2>validate-attribution.yml</h2>
          </div>
          <CopyButton copied={copied === "action"} onClick={() => copyText("action", actionYaml)} />
        </div>
        <div className="output-code-container">
          <pre>
            <code>{actionYaml}</code>
          </pre>
        </div>
      </section>
    </main>
  );
}

function SegmentedControl<T extends string>(props: {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="form-group">
      <span className="form-label">{props.label}</span>
      <div
        className={`segmented-control segments-${props.options.length}`}
        role="group"
        aria-label={props.label}
      >
        {props.options.map((option) => (
          <button
            key={option}
            className={`segment-button ${props.value === option ? "active" : ""}`}
            type="button"
            aria-pressed={props.value === option}
            onClick={() => props.onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function AuditResultPanel(props: { profile: Profile; result: AuditResult; onRestore: () => void }) {
  const unmeasured = props.result.inputIssue !== null;
  const review =
    !unmeasured && props.profile === "local" && props.result.protected < props.result.paths.length;
  const title =
    props.result.inputIssue === "builder-code-required"
      ? "Add a Builder Code"
      : props.result.inputIssue === "no-paths"
        ? "No supported paths found"
        : review
          ? "Local report complete"
          : props.result.ok
            ? "Fixture check passed"
            : "Action required";
  const badge = unmeasured
    ? "not measured"
    : review
      ? "review findings"
      : props.result.ok
        ? "passing"
        : "failing";
  return (
    <section className="bento-card result-panel" id="audit-result" tabIndex={-1}>
      <div className="card-header result-heading">
        <div>
          <h2>{title}</h2>
        </div>
        <div
          className={`status-badge ${unmeasured || review ? "unresolved" : props.result.ok ? "passing" : "failing"}`}
        >
          <span className="status-dot" />
          <span>{badge}</span>
        </div>
      </div>
      <p className="field-hint">
        This browser preview checks one illustrative snippet. Use the full-project strict CLI or
        packed Action for merge and release decisions.
      </p>
      <div className="metrics-row doctor-metrics">
        <Metric label="profile" value={props.profile} />
        <Metric label="paths" value={props.result.paths.length} />
        <Metric label="protected" value={props.result.protected} />
        <Metric
          label="coverage"
          value={props.result.coverage === null ? "—" : `${props.result.coverage}%`}
        />
      </div>
      {unmeasured ? (
        <div className="doctor-empty">
          <p>
            {props.result.inputIssue === "builder-code-required"
              ? "Enter the Builder Code your project should use. The example code is bc_abc123."
              : "This snippet has no calls supported by the selected fixture. Check the fixture and source, or restore the example. The preview does not validate TypeScript syntax."}
          </p>
          <button type="button" className="text-action" onClick={props.onRestore}>
            Restore example
          </button>
        </div>
      ) : null}
      {!unmeasured ? (
        <div className="analysis-block">
          <p className="findings-title">Transaction paths</p>
          <div className="findings-container">
            {props.result.paths.map((entry) => (
              <article
                className={`finding-card path-${entry.status}`}
                key={`${entry.marker}-${entry.line}`}
              >
                <div className="finding-info">
                  <span className="finding-reason">
                    {entry.ruleId ? `${entry.ruleId} · ` : ""}
                    {entry.status}
                  </span>
                  <span className="finding-meta">
                    line {entry.line} near {entry.marker}
                  </span>
                  {entry.suggestion ? (
                    <span className="finding-suggestion">{entry.suggestion}</span>
                  ) : null}
                </div>
                <span className="finding-family">{entry.family}</span>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric(props: { label: string; value: number | string }) {
  return (
    <div className="metric-item">
      <p className="metric-label">{props.label}</p>
      <p className="metric-value">{props.value}</p>
    </div>
  );
}

function CopyButton(props: { copied: boolean; onClick: () => void }) {
  return (
    <button className="copy-btn" type="button" onClick={props.onClick}>
      <CopyIcon />
      <span>{props.copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function createActionYaml(builderCode: string): string {
  const quotedBuilderCode = JSON.stringify(builderCode || "bc_abc123");
  return `name: Attribution Doctor

on:
  pull_request:

permissions:
  contents: read

jobs:
  attribution:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
        with:
          fetch-depth: 0
      - uses: horn111/base-attribution-os/packages/github-action@v0.5.0
        with:
          builder-code: ${quotedBuilderCode}
          profile: strict
          changed-only: "false"
          fail-on-missing: "true"`;
}

function CopyIcon() {
  return (
    <svg aria-hidden="true" height="14" viewBox="0 0 24 24" width="14">
      <rect height="13" rx="2" ry="2" width="13" x="9" y="9" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
