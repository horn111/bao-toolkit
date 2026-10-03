import type { Metadata } from "next";
import Link from "next/link";
import { Workspace } from "../../dashboard/workspace";
import "../../dashboard/reference-workspace.css";
import { CheckIcon } from "../../_components/site-icons";
import { CopyCommand } from "../../_components/copy-command";
import {
  getPublishedProof,
  getPublishedProofTransactions,
  getProofReportDownloads,
  shortHash,
} from "../../proof-data";

type ProofPageProps = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: ProofPageProps): Promise<Metadata> {
  const { code } = await params;
  const proof = getPublishedProof(code);
  return {
    title: proof ? `${proof.title} proof set · ${code}` : `Proof · ${code}`,
    description: proof
      ? `${proof.summary.verified} verified Base transactions carry ${code} across ${proof.summary.reports} replay reports.`
      : `Publish an Attribution Proof Set for ${code}.`,
  };
}

export default async function ProofPage({ params }: ProofPageProps) {
  const { code } = await params;
  const proof = getPublishedProof(code);
  const networks = proof?.summary.networks.map((entry) => entry.network).join(" · ");

  return (
    <Workspace active="proofs" className="workspace-tool proof-workspace">
      <section className="hero proof-hero">
        <div className="hero-meta">
          <h1>{code}</h1>
          <p className="scope-note">Attribution Proof Set{networks ? ` · ${networks}` : ""}</p>
        </div>
        <div className="hero-controls">
          <p className="lede">
            {proof
              ? "This published snapshot contains replay reports backed by decoded ERC-8021 calldata and explorer-verifiable transactions. Download the inputs to reproduce its manifest."
              : "No public BAO Toolkit proof set has been published for this Builder Code yet. Generate replay reports, then combine them into a static manifest."}
          </p>
          <Link className="hero-command command-link" href="/observatory">
            View Observatory
          </Link>
        </div>
      </section>

      {proof ? <VerifiedProof code={code} proof={proof} /> : <EmptyProof />}
    </Workspace>
  );
}

function VerifiedProof(props: {
  code: string;
  proof: NonNullable<ReturnType<typeof getPublishedProof>>;
}) {
  const transactions = getPublishedProofTransactions(props.proof);
  const downloads = getProofReportDownloads(props.proof);
  return (
    <>
      <section className="proof-verdict">
        <div className="proof-seal" aria-hidden="true">
          <CheckIcon />
        </div>
        <div>
          <h2>Expected Builder Code verified</h2>
          <p>
            {props.proof.summary.attributed} of {props.proof.summary.total} unique{" "}
            {props.proof.summary.total === 1 ? "transaction contains" : "transactions contain"}{" "}
            <code>{props.code}</code>; {props.proof.summary.verified}{" "}
            {props.proof.summary.verified === 1 ? "is" : "are"} RPC verified in this snapshot.
          </p>
        </div>
        <strong>{props.proof.summary.coverage}%</strong>
      </section>

      <div className="observatory-grid">
        <section className="bento-card">
          <div className="card-header">
            <h2>{props.proof.title}</h2>
          </div>
          {props.proof.title === "Base Attribution OS" ? (
            <p className="scope-note">Historical manifest title. The product is now BAO Toolkit.</p>
          ) : null}
          <dl className="proof-manifest">
            <div>
              <dt>Builder Code</dt>
              <dd>{props.proof.builderCode}</dd>
            </div>
            <div>
              <dt>Networks</dt>
              <dd>{props.proof.summary.networks.map((entry) => entry.network).join(", ")}</dd>
            </div>
            <div>
              <dt>Replay reports</dt>
              <dd>{props.proof.summary.reports}</dd>
            </div>
            <div>
              <dt>Generated</dt>
              <dd>{new Date(props.proof.generatedAt).toISOString().slice(0, 10)}</dd>
            </div>
          </dl>
        </section>

        <section className="bento-card replay-card">
          <div className="card-header">
            <h2>Build the same manifest</h2>
          </div>
          <p>
            Save these inputs in one directory, then run the command there. It rebuilds the recorded
            manifest offline; it does not recheck the chain.
          </p>
          <div className="proof-downloads">
            {downloads.map((download, index) => (
              <a className="text-action" href={download.href} key={download.href}>
                Download replay report {index + 1}
              </a>
            ))}
            <a className="text-action" href={`/proof/${props.code}/export`}>
              Download published manifest
            </a>
          </div>
          <CopyCommand
            className="command-multiline"
            command={`bao proof-set --builder-code ${props.code} --title "${props.proof.title}" --input ${downloads.map((entry) => entry.name).join(",")} --output proof-set.json`}
          />
        </section>
      </div>

      <section className="bento-card transaction-card proof-progress-card">
        <div className="output-header">
          <div className="editor-header-title">
            <h2>Proof Set progress</h2>
          </div>
          <span className="ledger-count">
            {props.proof.reports.length} {props.proof.reports.length === 1 ? "report" : "reports"}
          </span>
        </div>
        <div className="table-scroll">
          <table className="proof-table">
            <thead>
              <tr>
                <th>Generated</th>
                <th>Network</th>
                <th>Attributed</th>
                <th>RPC verified</th>
                <th>Coverage</th>
              </tr>
            </thead>
            <tbody>
              {props.proof.reports.map((report) => (
                <tr key={`${report.chainId}:${report.generatedAt}`}>
                  <td>{new Date(report.generatedAt).toISOString().slice(0, 10)}</td>
                  <td>{report.network}</td>
                  <td>
                    {report.attributed}/{report.total}
                  </td>
                  <td>
                    {report.verified}/{report.total}
                  </td>
                  <td>{report.coverage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bento-card transaction-card proof-detail-card">
        <div className="output-header">
          <div className="editor-header-title">
            <h2>Deduplicated ledger</h2>
          </div>
          <span className="status-badge passing compact-badge">verified</span>
        </div>
        <div className="proof-transactions">
          {transactions.map(({ chainId, network, transaction }) => (
            <article key={`${chainId}:${transaction.hash}`}>
              <div>
                <p className="transaction-label">Transaction hash</p>
                {transaction.explorerUrl ? (
                  <a href={transaction.explorerUrl}>{shortHash(transaction.hash)}</a>
                ) : (
                  <code>{shortHash(transaction.hash)}</code>
                )}
              </div>
              <div>
                <p className="transaction-label">Network · source</p>
                <span>{network}</span>
                {transaction.source ? <small>{transaction.source}</small> : null}
              </div>
              <div>
                <p className="transaction-label">Decoded codes</p>
                <code>{transaction.codes.join(", ")}</code>
              </div>
              <div>
                <p className="transaction-label">Result</p>
                <span className="table-status">{transaction.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function EmptyProof() {
  return (
    <section className="bento-card empty-proof">
      <div className="empty-proof-mark">?</div>
      <div>
        <h2>Create the first manifest</h2>
        <p>
          Generate JSON replay reports from a Dune export or public RPC, then combine them into a
          bounded Proof Set manifest.
        </p>
      </div>
      <p className="scope-note">
        Command template: replace bc_your_code and the input filename with your registered code and
        replay report.
      </p>
      <CopyCommand
        className="command-multiline"
        command={
          'bao proof-set --builder-code bc_your_code --title "Example project" --input replay.json --output proof-set.json'
        }
      />
      <Link className="text-action" href="/docs/transaction-proofs">
        Create a replay report
      </Link>
    </section>
  );
}
