import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "../../_components/site-header";
import { CopyCommand } from "../../_components/copy-command";

export const metadata: Metadata = {
  title: "B20 replay guide | BAO",
  description:
    "Reproduce synthetic reports, collect explicit transaction hashes, and recheck historical evidence.",
};

export default function B20GuidePage() {
  return (
    <main id="main-content" tabIndex={-1} className="app-container b20-surface">
      <SiteHeader current="b20" />
      <Link className="b20-back" href="/b20">
        B20 examples and reports
      </Link>
      <header className="b20-intro">
        <h1>Reproduce a B20 finding</h1>
        <p>
          Use the same CLI for an offline example and an explicitly supplied transaction sample. The
          package is an unreleased candidate; install a maintainer-provided tarball or build the
          checkout.
        </p>
      </header>
      <section className="b20-section b20-guide">
        <h2>Start with the offline example</h2>
        <p>
          Download the <a href="/b20/reports/direct-broken/capture">before capture</a> and{" "}
          <a href="/b20/reports/direct-fixed/capture">after capture</a>.
        </p>
        <CopyCommand
          command={`bao b20 replay --input b20-direct-broken.capture.json --chain-id 84532 --expect bc_example --offline\nbao b20 replay --input b20-direct-fixed.capture.json --chain-id 84532 --expect bc_example --offline`}
        />
        <p>
          The direct attribution result changes from 0/1 to 1/1. Both receipts are synthetic. Token
          existence and native execution require network evidence.
        </p>
      </section>
      <section className="b20-section b20-guide">
        <h2>Collect an explicit sample</h2>
        <p>
          Set <code>BASE_RPC_URL</code> locally, then provide transaction hashes from your
          integration. Keep keys and provider credentials outside reports and repository files.
        </p>
        <CopyCommand
          command={`bao b20 replay --hashes <TX_HASH_A>,<TX_HASH_B> --chain-id 84532 --expect <YOUR_BUILDER_CODE> --rpc-url-env BASE_RPC_URL --format json --output replay.json\nbao b20 verify --input replay.json --rpc-url-env BASE_RPC_URL --format json --output recheck.json`}
        />
        <p>
          The collector checks the endpoint chain and joins transactions, receipts, block headers,
          and token reads. Rechecking preserves the original block context. Replace angle-bracket
          placeholders before running these commands.
        </p>
      </section>
      <section className="b20-section b20-guide">
        <h2>Choose the policy for your task</h2>
        <p>
          <code>observe</code> reports consistent partial evidence. <code>strict-attribution</code>{" "}
          requires an expected code, current-run RPC collection, resolved required evidence,
          expected attribution on all supplied hashes, and at least one eligible direct B20
          operation.
        </p>
        <p>
          A strict attribution pass concerns the declared sample. Application compatibility and
          native-runtime qualification remain separate checks. An offline artifact cannot grant a
          fresh RPC pass.
        </p>
      </section>
      <section className="b20-section" id="pilot">
        <h2>Technical pilot kit</h2>
        <p>
          Provide a public repository or minimal transaction-building snippet, your chain ID,
          expected Builder Code, selected hashes, and the reason you selected them. Include the
          generated report and recheck output, or describe the RPC limitation.
        </p>
        <p>
          Supported direct operations are transfer, transferFrom, approve, transferWithMemo, and
          transferFromWithMemo. Canonical factory creation and receipt-only events have separate
          findings. Router and smart-wallet nested application attribution is unresolved.
        </p>
        <p>
          Use the existing BAO viem helper on the same encoded transfer. Keep token, recipient, and
          raw amount unchanged. A useful pilot records the omission, corrected payload, and
          maintainer reproduction independently.
        </p>
        <p>
          Do not include private keys, seed phrases, customer data, or RPC credentials. Agree which
          public artifacts the maintainer may publish before registering an integration report.
        </p>
      </section>
      <footer className="b20-footer">
        Collection limits: 100 supplied hashes, 200 logs per transaction, 32 token candidates, and a
        4 MiB artifact. Recorded network observations do not qualify an integration. No external
        pilot has been recorded.
      </footer>
    </main>
  );
}
