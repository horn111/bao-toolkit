import { pageMetadata } from "../seo";
import Link from "next/link";
import { Workspace } from "../dashboard/workspace";
import { CopyCommand } from "../_components/copy-command";
import "./workspace.css";
import {
  b20PublicationSummary,
  getB20Report,
  publishedB20Reports,
  coverageLabel,
} from "./registry";

export const metadata = pageMetadata(
  "/b20",
  "B20 Token Evidence & Builder Code Attribution",
  "Inspect B20 token evidence on Base, compare Builder Code attribution fixes, and reproduce synthetic reports alongside recorded transaction observations.",
);

export default function B20Page() {
  return (
    <Workspace active="b20" className="b20-surface workspace-tool">
      <header className="b20-intro">
        <h1>B20 Discovery &amp; Attribution</h1>
        <p>
          A B20 transfer can succeed without your Builder Code. Compare the same transfer before and
          after an attribution fix, then inspect the evidence.
        </p>
      </header>
      <section className="b20-comparison" aria-labelledby="comparison-title">
        <div className="b20-section-heading">
          <h2 id="comparison-title">Same transfer. One missing code.</h2>
          <span className="b20-tag">Synthetic example</span>
        </div>
        <p>
          The token, recipient, raw amount, and modeled execution stay the same. The corrected
          request uses <code>withAttributionSuffix</code> from BAO Toolkit’s viem adapter.
        </p>
        <div className="b20-mobile-outcomes" aria-label="Direct attribution before and after">
          {(["direct-broken", "direct-fixed"] as const).map((id, index) => {
            const metric = getB20Report(id)!.report.coverage.directAttribution;
            return (
              <div key={id}>
                <strong className={index === 0 ? "b20-review" : "b20-found"}>
                  {index === 0 ? "Before" : "After"}: {metric.numerator}/{metric.denominator}
                </strong>
                <Link href={`/b20/reports/${id}`}>
                  {index === 0 ? "Before report" : "After report"}
                </Link>
              </div>
            );
          })}
        </div>
        <div className="b20-comparison-columns">
          {(["direct-broken", "direct-fixed"] as const).map((id, index) => {
            const entry = getB20Report(id)!;
            const tx = entry.report.transactions[0];
            return (
              <article className="b20-comparison-case" key={id}>
                <h3>{index === 0 ? "Before: code missing" : "After: code found"}</h3>
                <dl className="b20-facts">
                  <div>
                    <dt>Expected code</dt>
                    <dd>
                      <code>{entry.report.expectedCode}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>Direct attribution</dt>
                    <dd className={index === 0 ? "b20-review" : "b20-found"}>
                      {coverageLabel(entry.report.coverage.directAttribution)}
                    </dd>
                  </div>
                  <div>
                    <dt>Token evidence</dt>
                    <dd>Initialized B20 Asset · modeled factory query</dd>
                  </div>
                  <div>
                    <dt>Execution</dt>
                    <dd>
                      {tx.execution === "success" ? "Successful synthetic receipt" : tx.execution}
                    </dd>
                  </div>
                  <div>
                    <dt>Application readiness</dt>
                    <dd>Not tested</dd>
                  </div>
                </dl>
                <Link className="b20-action" href={`/b20/reports/${id}`}>
                  Inspect {index === 0 ? "missing-code" : "corrected"} report
                </Link>
              </article>
            );
          })}
        </div>
        <p className="b20-note">
          These receipts demonstrate the analyzer. This before/after transfer has not been tested on
          a native B20 runtime.
        </p>
      </section>

      <section className="b20-section" aria-labelledby="reports-title">
        <h2 id="reports-title">Reports you can reproduce</h2>
        <p>
          {b20PublicationSummary.synthetic} synthetic examples · {b20PublicationSummary.recorded}{" "}
          recorded network reports. Synthetic examples remain separate from the attribution
          Observatory’s totals.
        </p>
        <div className="b20-report-list">
          {publishedB20Reports.map((entry) => (
            <article key={entry.id}>
              <div>
                <h3>
                  <Link href={`/b20/reports/${entry.id}`}>{entry.title}</Link>
                </h3>
                <p>{entry.description}</p>
              </div>
              <div>
                <span className="b20-tag">
                  {entry.report.evidence.acquisition === "synthetic"
                    ? "Synthetic"
                    : "Recorded snapshot"}
                </span>
                <span className="b20-list-coverage">
                  Direct attribution: {coverageLabel(entry.report.coverage.directAttribution)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="b20-section b20-guide" aria-labelledby="reproduce-title">
        <h2 id="reproduce-title">Run the comparison locally</h2>
        <p>
          Download a report’s capture, then run the candidate CLI. Offline validation checks
          internal consistency; a network recheck requires an explicit RPC endpoint.
        </p>
        <CopyCommand
          command={`bao b20 replay --input b20-direct-broken.capture.json --chain-id 84532 --expect bc_example --offline\nbao b20 replay --input b20-direct-fixed.capture.json --chain-id 84532 --expect bc_example --offline`}
        />
        <div className="b20-actions">
          <a className="b20-action" href="/b20/reports/direct-broken/capture">
            Download before capture
          </a>
          <a className="b20-action" href="/b20/reports/direct-fixed/capture">
            Download after capture
          </a>
        </div>
        <p>
          Start with the <Link href="/b20/guide">CLI guide</Link> or{" "}
          <Link href="/b20/guide#pilot">technical pilot kit</Link>. The B20 package is an unreleased
          candidate.
        </p>
      </section>
      <footer className="b20-footer">
        BAO Toolkit is an independent project. These reports describe discovery and attribution in a
        supplied sample; application readiness remains not tested.
      </footer>
    </Workspace>
  );
}
