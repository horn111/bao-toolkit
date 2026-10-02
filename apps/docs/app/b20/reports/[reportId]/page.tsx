import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { B20_REPLAY_PROFILE } from "@base-attribution-os/b20";
import { SiteHeader } from "../../../_components/site-header";
import { CopyCommand } from "../../../_components/copy-command";
import {
  chainLabel,
  coverageLabel,
  getB20Report,
  publishedB20Reports,
  transactionExplorer,
} from "../../registry";

type Props = { params: Promise<{ reportId: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return publishedB20Reports.map(({ id }) => ({ reportId: id }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = getB20Report((await params).reportId);
  return {
    title: entry ? `${entry.title} | Bao Toolkit B20` : "B20 report not found",
    description: entry?.description,
  };
}

const labels: Record<string, string> = {
  "confirmed-initialized": "Initialized B20 token",
  "prefix-candidate": "Prefix candidate; initialization unresolved",
  "unsupported-variant": "Unsupported variant",
  "not-initialized": "Not initialized at this block",
  "not-b20": "Not a B20 address",
  unsupported: "Unsupported initialization check",
  unavailable: "Initialization evidence unavailable",
  conflict: "Conflicting token evidence",
  "direct-token-call": "Direct token call",
  "direct-factory-call": "Direct factory call",
  "receipt-event-only": "Receipt event only",
  "unsupported-call-scope": "Unsupported call scope",
  "no-b20-evidence": "No B20 evidence",
  "missing-attribution": "Expected code missing",
  "wrong-builder-code": "Different Builder Code",
  "invalid-attribution": "Invalid attribution suffix",
  attributed: "Expected code found",
};

export default async function B20ReportPage({ params }: Props) {
  const entry = getB20Report((await params).reportId);
  if (!entry) notFound();
  const { report } = entry;
  const synthetic = report.evidence.acquisition === "synthetic";
  const blocks = [
    ...new Set(
      report.evidence.transactions.flatMap((row) => (row.block ? [row.block.number] : [])),
    ),
  ];
  return (
    <main id="main-content" tabIndex={-1} className="app-container b20-surface">
      <SiteHeader current="b20" />
      <Link className="b20-back" href="/b20">
        All B20 reports
      </Link>
      <header className="b20-intro">
        <h1>{entry.title}</h1>
        <p>{entry.description}</p>
      </header>
      <nav className="b20-report-navigation" aria-label="Report sections">
        <a href="#findings-title">Summary</a>
        <a href="#transactions-title">Transactions ({report.transactions.length})</a>
        <a href="#artifact-title">Reproduce</a>
        <a href="#limits-title">Limitations</a>
        <a href={`/b20/reports/${entry.id}/export`}>Report JSON</a>
        <a href={`/b20/reports/${entry.id}/capture`}>Capture JSON</a>
      </nav>
      <section className="b20-context" aria-label="Report scope and provenance">
        <div className="b20-section-heading">
          <h2>{synthetic ? "Synthetic evidence" : "Recorded evidence"}</h2>
          <span className="b20-tag">{chainLabel(report.chainId)}</span>
        </div>
        <p>
          {synthetic
            ? "Modeled transactions and receipts demonstrate the analyzer. These hashes are not claims of existing network transactions."
            : `The producer claims ${report.evidence.acquisition} acquisition. This page validates the artifact internally; it has not independently rechecked the chain evidence.`}
        </p>
        <p>
          <strong>Application readiness: Not tested.</strong> Runtime qualification: Not qualified.
        </p>
        <details className="b20-details">
          <summary>Capture time, blocks, and selection</summary>
          <dl className="b20-facts b20-context-facts">
            <div>
              <dt>Supplied scope</dt>
              <dd>
                {report.coverage.supplied} supplied hashes · {report.coverage.unique} unique
              </dd>
            </div>
            <div>
              <dt>{synthetic ? "Modeled block" : "Observation block"}</dt>
              <dd>{blocks.length ? blocks.join(", ") : "Unavailable"}</dd>
            </div>
            <div>
              <dt>Capture time (UTC)</dt>
              <dd>
                <time dateTime={report.evidence.capturedAt}>{report.evidence.capturedAt}</time>
              </dd>
            </div>
            <div>
              <dt>Selection</dt>
              <dd>{report.evidence.input.selection.description}</dd>
            </div>
          </dl>
        </details>
      </section>

      <section className="b20-section" aria-labelledby="findings-title">
        <h2 id="findings-title">Read each result separately</h2>
        <dl className="b20-findings">
          <div>
            <dt>B20 evidence</dt>
            <dd>
              {report.coverage.supportedDirectCalls} eligible direct calls ·{" "}
              {report.coverage.factoryObservations} factory observations ·{" "}
              {report.coverage.eventOnly} event-only transactions
            </dd>
          </div>
          <div>
            <dt>Expected Builder Code</dt>
            <dd>
              <code>{report.expectedCode ?? "Not configured"}</code>
            </dd>
          </div>
          <div>
            <dt>All input attribution</dt>
            <dd>{coverageLabel(report.coverage.inputAttribution)}</dd>
          </div>
          <div>
            <dt>Supported direct-call attribution</dt>
            <dd>{coverageLabel(report.coverage.directAttribution)}</dd>
          </div>
          <div>
            <dt>Execution</dt>
            <dd>
              {report.coverage.successful} successful · {report.coverage.reverted} reverted ·{" "}
              {report.coverage.pending} pending · {report.coverage.unavailable} unavailable
            </dd>
          </div>
          <div>
            <dt>Unresolved evidence</dt>
            <dd>
              {report.coverage.unknown} transactions · run {report.runStatus}
            </dd>
          </div>
          <div>
            <dt>Application readiness</dt>
            <dd>Not tested</dd>
          </div>
          <div>
            <dt>Runtime qualification</dt>
            <dd>Not qualified</dd>
          </div>
        </dl>
        <p className="b20-note">
          Coverage applies to the supplied hashes. A zero denominator means “Not measured.” The
          producer’s {report.policy.name} decision is {report.policy.decision}; this page has not
          evaluated strict policy with fresh RPC evidence.
        </p>
      </section>

      <section className="b20-section" aria-labelledby="transactions-title">
        <h2 id="transactions-title">Transaction evidence</h2>
        <nav className="b20-transaction-index" aria-label="Transaction index">
          {report.transactions.map((tx, index) => (
            <a href={`#tx-${tx.hash}`} key={tx.hash}>
              {index + 1}. {tx.hash.slice(0, 10)}…{tx.hash.slice(-8)}
              <span>{labels[tx.relation] ?? tx.relation}</span>
            </a>
          ))}
        </nav>
        {report.transactions.map((tx, index) => {
          const capture = report.evidence.transactions.find((row) => row.hash === tx.hash)!;
          const explorer = transactionExplorer(report, tx.hash);
          return (
            <details
              className="b20-transaction"
              key={tx.hash}
              id={`tx-${tx.hash}`}
              open={index === 0}
            >
              <summary className="b20-transaction-summary">
                <h3>{labels[tx.relation] ?? tx.relation}</h3>
                <code>
                  {tx.hash.slice(0, 10)}…{tx.hash.slice(-8)}
                </code>
                <span>
                  {tx.execution} ·{" "}
                  {report.expectedCode
                    ? (labels[tx.attribution.status] ?? tx.attribution.status)
                    : "Expected code not configured"}
                </span>
                <span className="b20-expand-label">Details</span>
              </summary>
              <div className="b20-transaction-body">
                {explorer ? (
                  <a
                    className="b20-hash"
                    href={explorer}
                    rel="noreferrer"
                    target="_blank"
                    aria-label={`Inspect transaction ${tx.hash} on ${chainLabel(report.chainId)} explorer (opens in new tab)`}
                  >
                    {tx.hash}
                  </a>
                ) : (
                  <code className="b20-hash">{tx.hash}</code>
                )}
                <dl className="b20-facts">
                  <div>
                    <dt>Attribution · top-level transaction</dt>
                    <dd>
                      {report.expectedCode
                        ? (labels[tx.attribution.status] ?? tx.attribution.status)
                        : "Expected code not configured"}{" "}
                      · <code>{tx.attribution.codes.join(", ") || "No decoded code"}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Execution</dt>
                    <dd>{tx.execution}</dd>
                  </div>
                  <div>
                    <dt>Direct coverage</dt>
                    <dd>
                      {tx.directCoverageEligible
                        ? "Included"
                        : "Excluded: required direct-call scope or evidence is unresolved"}
                    </dd>
                  </div>
                  {tx.operation && (
                    <>
                      <div>
                        <dt>Method</dt>
                        <dd>
                          <code>{tx.operation.method}</code>
                        </dd>
                      </div>
                      <div>
                        <dt>Recipient / spender</dt>
                        <dd>
                          <code>{tx.operation.to}</code>
                        </dd>
                      </div>
                      <div>
                        <dt>Raw amount</dt>
                        <dd>
                          <code>{tx.operation.amount}</code> · token base units
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
                {tx.relation === "receipt-event-only" && (
                  <p className="b20-note">
                    The receipt includes a B20 event. Attribution for the responsible nested
                    application is not established.
                  </p>
                )}
                {tx.diagnostics.length > 0 && (
                  <div className="b20-diagnostics">
                    <h4>Diagnostics</h4>
                    <ul>
                      {tx.diagnostics.map((code) => (
                        <li key={code}>
                          <code>{code}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <h4>Token findings</h4>
                {tx.tokens.length ? (
                  <ul className="b20-token-list">
                    {tx.tokens.map((token) => (
                      <li key={token.address}>
                        <code>{token.address}</code>
                        <span>
                          {labels[token.classification] ?? token.classification} ·{" "}
                          {token.confirmation}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No confirmed token findings in this transaction.</p>
                )}
                {tx.events.length > 0 && (
                  <details className="b20-details">
                    <summary>Decoded receipt events ({tx.events.length})</summary>
                    <pre>
                      <code>{JSON.stringify(tx.events, null, 2)}</code>
                    </pre>
                  </details>
                )}
                <details className="b20-details">
                  <summary>Supporting transaction, receipt, block, and token reads</summary>
                  <pre>
                    <code>{JSON.stringify(capture, null, 2)}</code>
                  </pre>
                </details>
              </div>
            </details>
          );
        })}
      </section>

      <section className="b20-section b20-guide" aria-labelledby="artifact-title">
        <h2 id="artifact-title">Download and reproduce this report</h2>
        <div className="b20-actions">
          <a className="b20-action" href={`/b20/reports/${entry.id}/export`}>
            Download report JSON
          </a>
          <a className="b20-action" href={`/b20/reports/${entry.id}/capture`}>
            Download capture JSON
          </a>
        </div>
        <CopyCommand
          command={`bao b20 verify --input b20-${entry.id}.report.json --offline\nbao b20 replay --input b20-${entry.id}.capture.json --chain-id ${report.chainId}${report.expectedCode ? ` --expect ${report.expectedCode}` : ""} --offline`}
        />
        <p>
          Offline validation checks internal consistency. Imported acquisition and policy remain
          producer claims. <Link href="/b20/guide">Read the collection and recheck guide.</Link>
        </p>
        <dl className="b20-facts">
          <div>
            <dt>Protocol profile</dt>
            <dd>
              <code>{report.protocolProfileId}</code>
            </dd>
          </div>
          <div>
            <dt>Evidence digest</dt>
            <dd>
              <code>{report.evidenceDigest}</code>
            </dd>
          </div>
          <div>
            <dt>Pinned source</dt>
            <dd>
              <a href={`https://github.com/base/base-std/tree/${B20_REPLAY_PROFILE.source.commit}`}>
                base/base-std source
              </a>
            </dd>
          </div>
        </dl>
      </section>
      <section className="b20-section" aria-labelledby="limits-title">
        <h2 id="limits-title">Scope and limitations</h2>
        <ul className="b20-limitations">
          {report.limitations.map((limitation) => (
            <li key={limitation}>{limitation}</li>
          ))}
        </ul>
      </section>
      <footer className="b20-footer">
        Independent Bao Toolkit report · discovery and attribution in the supplied scope ·
        application readiness not tested.
      </footer>
    </main>
  );
}
