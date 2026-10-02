import Link from "next/link";
import {
  featuredProof,
  getPublishedProofTransactions,
  publishedProofSets,
  observatorySummary,
  shortHash,
} from "../proof-data";
import { b20PublicationSummary, publishedB20Reports } from "../b20/registry";
import { ArrowIcon } from "./site-icons";
import { SourceExample } from "./source-example";
import { CopyCommand } from "./copy-command";
import { PixelConstruction } from "./pixel-construction";

export function HomeSections() {
  const example = getPublishedProofTransactions(featuredProof)[0];
  return (
    <div className="home-content">
      <section id="product" className="product-intro">
        <div className="product-intro-visual">
          <h2>
            From your app.
            <br />
            <span>To the evidence.</span>
          </h2>
          <PixelConstruction variant="workshop" />
        </div>
        <div>
          <p className="section-deck">
            Bao Toolkit is the developer toolkit for building, auditing, and verifying transaction
            paths on Base.
          </p>
          <p>
            Add Builder Code attribution to your client. Catch gaps in source code. Inspect native
            token evidence. Keep a report you can reproduce.
          </p>
          <ol className="product-flow">
            <li>
              <Link href="/docs/attribution">Integrate</Link>
              <span>Add the code where your app builds a transaction.</span>
            </li>
            <li>
              <Link href="/docs/ci">Audit and enforce</Link>
              <span>Keep the same attribution policy in your app and CI.</span>
            </li>
            <li>
              <Link href="/docs/transaction-proofs">Verify and retain</Link>
              <span>Check submitted hashes and save the evidence.</span>
            </li>
          </ol>
          <Link className="text-action" href="/docs/quickstart">
            Meet your new toolkit <ArrowIcon />
          </Link>
        </div>
      </section>

      <section id="attribution" className="product-chapter attribution-chapter">
        <div className="chapter-copy">
          <h2>
            Attribution that
            <br />
            travels with your app.
          </h2>
          <p>
            Builder Code attribution can disappear in a refactor without breaking the transaction.
            Bao Toolkit gives your team a repeatable control over that path.
          </p>
          <p>
            Use typed helpers with viem, wagmi, or ethers. For smart wallets, negotiate capabilities
            before sending a batch and apply attribution to the final UserOperation calldata.
          </p>
          <div className="integration-names" aria-label="Integration guides">
            <Link href="/docs/attribution#viem">viem</Link>
            <Link href="/docs/attribution#wagmi">wagmi</Link>
            <Link href="/docs/attribution#ethers">ethers</Link>
            <Link href="/smart-wallets">Smart wallets</Link>
            <Link href="/docs/attribution#other-paths">Privy · x402 · agents</Link>
          </div>
          <Link className="text-action" href="/docs/attribution">
            Choose your integration <ArrowIcon />
          </Link>
        </div>
        <SourceExample />
      </section>

      <section id="source-audits" className="product-chapter audit-chapter">
        <div className="audit-output">
          <div className="output-caption">Illustrative Doctor output · local source analysis</div>
          <pre>
            <code>{`$ bao doctor

Frameworks: smart-wallet, wagmi, x402
Coverage: 2/3 paths protected (67%)

+ wagmi   app/mint.tsx:18  protected
+ x402    src/pay.ts:9    protected
! wallet  src/batch.ts:22 missing BAO005

  Negotiate wallet_getCapabilities
  before wallet_sendCalls.`}</code>
          </pre>
          <div className="audit-output-note">Find the path. Read the finding. Fix the request.</div>
        </div>
        <div className="chapter-copy">
          <h2>
            Catch the gap.
            <br />
            Before the merge.
          </h2>
          <p>
            Attribution Doctor connects supported TypeScript call sites to Builder Code evidence.
            Read findings in your terminal, inspect JSON, or send SARIF into Code Scanning.
          </p>
          <p>
            Keep a project policy in <code>bao.config.json</code> and run it in CI. Static analysis
            reports unresolved configuration explicitly; it does not execute your app.
          </p>
          <div className="chapter-actions">
            <Link className="text-action" href="/doctor">
              Open Attribution Doctor <ArrowIcon />
            </Link>
            <Link className="text-action" href="/docs/source-audits">
              Set up your first audit <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <section id="b20" className="b20-product-chapter">
        <div className="b20-product-heading">
          <h2>
            Native tokens.
            <br />
            Evidence attached.
          </h2>
          <span className="candidate-tag">B20 · Unreleased candidate</span>
        </div>
        <div className="b20-product-body">
          <div>
            <p className="section-deck">
              A successful token call can still omit your Builder Code.
            </p>
            <p>
              Bao Toolkit inspects B20 initialization, canonical creation events, direct calldata
              attribution, and receipt comparisons as separate evidence. A router event does not
              establish attribution for the nested app.
            </p>
            <Link className="text-action" href="/b20">
              See the transfer before and after <ArrowIcon />
            </Link>
            <p className="scope-note">
              Candidate tooling. The transfer example uses synthetic receipts. Native runtime
              qualification and application readiness remain untested.
            </p>
          </div>
          <div className="b20-outcomes">
            <div>
              <span>Before · synthetic transfer</span>
              <strong>Code missing</strong>
              <Link href="/b20/reports/direct-broken">
                Inspect the missing-code report <ArrowIcon />
              </Link>
            </div>
            <div>
              <span>After · corrected request</span>
              <strong>Code found</strong>
              <Link href="/b20/reports/direct-fixed">
                Inspect the corrected report <ArrowIcon />
              </Link>
            </div>
            <p>Same token, recipient, and raw amount. One attribution fix.</p>
          </div>
        </div>
      </section>

      <section id="evidence" className="evidence-chapter">
        <div id="transaction-proofs" className="evidence-intro">
          <h2>
            Proof you can
            <br />
            open and reproduce.
          </h2>
          <p>
            Follow a selected transaction sample from calldata to a replay report and a Proof Set.
            Check the hashes, networks, acquisition context, and limits yourself.
          </p>
          <Link className="text-action" href="/observatory">
            Explore the Observatory <ArrowIcon />
          </Link>
          <div className="evidence-architecture">
            <PixelConstruction variant="tower" />
          </div>
        </div>
        <div className="evidence-ledger">
          <div className="evidence-example">
            <h3>Inside the Bao Toolkit snapshot</h3>
            <p>
              Published transaction evidence · {example.network}. This snapshot is separate from the
              illustrative source examples above.
            </p>
            <dl>
              <div>
                <dt>Transaction</dt>
                <dd>
                  <a href={example.transaction.explorerUrl}>
                    {shortHash(example.transaction.hash)} <ArrowIcon />
                  </a>
                </dd>
              </div>
              <div>
                <dt>Decoded Builder Code</dt>
                <dd>
                  <code>{example.transaction.codes.join(", ")}</code>
                </dd>
              </div>
              <div>
                <dt>What was checked</dt>
                <dd>
                  {example.transaction.verified
                    ? "Calldata acquired over RPC; expected code decoded."
                    : "Recorded calldata decoded; RPC verification unavailable."}
                </dd>
              </div>
              <div>
                <dt>What you can retain</dt>
                <dd>
                  The replay input and the published manifest. Neither proves complete project
                  coverage.
                </dd>
              </div>
            </dl>
            <Link className="text-action" href={`/proof/${featuredProof.builderCode}`}>
              Open and reproduce this snapshot <ArrowIcon />
            </Link>
          </div>
          <h3>Published attribution Proof Sets</h3>
          <p>
            {observatorySummary.proofSets} registered snapshots · {observatorySummary.verified}{" "}
            verified transaction entries. These are the published sample’s totals, not network-wide
            analytics.
          </p>
          {publishedProofSets.map((proof) => (
            <Link
              className="evidence-row"
              key={proof.builderCode}
              href={`/proof/${proof.builderCode}`}
            >
              <div>
                <strong>{proof.title}</strong>
                <code>{proof.builderCode}</code>
              </div>
              <span>{proof.summary.networks.map((n) => n.network).join(" · ")}</span>
              <ArrowIcon />
            </Link>
          ))}
          <h3 className="recorded-heading">Recorded B20 observations</h3>
          <p>
            {b20PublicationSummary.recorded} public network snapshots. Recorded observations stay
            separate from synthetic examples and attribution Observatory totals.
          </p>
          {publishedB20Reports
            .filter((e) => e.report.evidence.acquisition !== "synthetic")
            .map((entry) => (
              <Link className="evidence-row" key={entry.id} href={`/b20/reports/${entry.id}`}>
                <div>
                  <strong>{entry.title}</strong>
                  <span>{entry.description}</span>
                </div>
                <ArrowIcon />
              </Link>
            ))}
        </div>
      </section>

      <section className="start-chapter">
        <h2>
          Your code.
          <br />
          Your next step.
        </h2>
        <div>
          <p>
            Start with the released attribution adapters and CLI. B20 uses the separate candidate
            pilot workflow.
          </p>
          <CopyCommand command="pnpm add @base-attribution-os/viem" />
          <CopyCommand command="pnpm add -D @base-attribution-os/cli" />
          <Link className="primary-action" href="/docs/quickstart">
            Start building <ArrowIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}
