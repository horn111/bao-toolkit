# B20 technical pilot kit

BAO finds a missing or wrong Builder Code in explicitly supplied B20 transaction
evidence. Use a report to identify a supported direct-call path, reproduce its
attribution result, and check a corrected payload with the existing BAO adapter.

## Candidate installation

The B20 package is unreleased. Use maintainer-provided tarballs for B20, core,
the BAO viem adapter, CLI, scanner, and wallet, with dependency overrides pointing
to the same tarballs. Scanner and wallet are existing CLI dependencies. The
repository's `pnpm verify:release-candidate` tests this installation in a clean
temporary consumer. Do not assume an npm release exists.

For a pilot outside the monorepo, put those six tarballs in `packs/` and use
the following `package.json`. The filenames below are local names for the
maintainer's supplied candidates; they are not npm package names.

```json
{
  "name": "bao-b20-pilot",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@9.15.4",
  "dependencies": {
    "@base-attribution-os/core": "file:./packs/bao-core.tgz",
    "@base-attribution-os/b20": "file:./packs/bao-b20.tgz",
    "@base-attribution-os/viem": "file:./packs/bao-viem.tgz",
    "@base-attribution-os/cli": "file:./packs/bao-cli.tgz",
    "@base-attribution-os/scanner": "file:./packs/bao-scanner.tgz",
    "@base-attribution-os/wallet": "file:./packs/bao-wallet.tgz",
    "viem": "2.56.0"
  },
  "pnpm": {
    "overrides": {
      "@base-attribution-os/core": "file:./packs/bao-core.tgz",
      "@base-attribution-os/b20": "file:./packs/bao-b20.tgz",
      "@base-attribution-os/viem": "file:./packs/bao-viem.tgz",
      "@base-attribution-os/cli": "file:./packs/bao-cli.tgz",
      "@base-attribution-os/scanner": "file:./packs/bao-scanner.tgz",
      "@base-attribution-os/wallet": "file:./packs/bao-wallet.tgz"
    }
  }
}
```

Run `pnpm install` with pnpm 9.15.4, download a capture from its report page,
then reproduce it through the installed CLI:

```sh
pnpm exec bao b20 replay --input b20-direct-broken.capture.json --chain-id 84532 --expect bc_example --offline
```

In a checkout, install with the pinned pnpm, run `pnpm build`, and run the CLI as
`node packages/cli/dist/index.js`. The package smoke verifies all nine public
packages; users of a candidate tarball do not need the development monorepo.

## One-command offline demonstration

After building the checkout:

```sh
node packages/cli/dist/index.js b20 replay --input fixtures/b20/synthetic/replay/direct-broken.capture.json --chain-id 84532 --expect bc_example --offline
```

Replace `direct-broken` with `direct-fixed` to see direct attribution move from
0/1 to 1/1. The token, transfer method, recipient, and raw amount stay the same.
The generator constructs both payloads from
`examples/viem-basic/src/b20-transfer.ts` using `withAttributionSuffix`.
Receipts are synthetic; native execution remains untested.

The candidate site at `/b20` provides the same example. Each registered report
at `/b20/reports/<reportId>` provides its full JSON and capture downloads.

## Collect and recheck a real sample

Set `BASE_RPC_URL` in your local environment without putting credentials in
commands, reports, commits, or issues. Use the [input example](replay.md) to record
why you selected the hashes. Collect the full selected sample, including missing
attribution; filtering by Builder Code alone hides omissions.

```sh
bao b20 replay --input transactions.json --chain-id 84532 --expect YOUR_BUILDER_CODE --rpc-url-env BASE_RPC_URL --format json --output replay.json
bao b20 verify --input replay.json --rpc-url-env BASE_RPC_URL --format json --output recheck.json
```

Replace `YOUR_BUILDER_CODE` with your registered code. Output paths must be new;
the CLI rejects overwriting an existing artifact. Offline verification checks
internal consistency. RPC rechecking reacquires the original block context and
reports conflicts or unavailable evidence without substituting `latest`.

## Supported scope and fix

Direct `transfer`, `transferFrom`, `approve`, `transferWithMemo`, and
`transferFromWithMemo` calls receive separate receipt comparisons. Canonical
factory creation and event-only token evidence have distinct findings. Router,
batch, and UserOperation nested application attribution remain unresolved.

```ts
import { withAttributionSuffix } from "@base-attribution-os/viem";

const correctedRequest = withAttributionSuffix(encodedTransferRequest, {
  codes: [yourBuilderCode],
});
```

Preserve the transfer's token, recipient, and raw amount. Analyze the corrected
payload; a useful fix does not edit the report to match a different code.
The helper prepares calldata. Broadcasting and native execution require a
separately configured and authorized integration.

## Information for a maintainer

Use the B20 integration issue template with:

- public repository or minimal transaction-building snippet;
- explicit chain ID, expected Builder Code, and sample-selection description;
- public transaction hashes or a labeled synthetic reproduction;
- report JSON, diagnostics, and recheck result or the exact acquisition limitation;
- expected and observed behavior, client/wallet stack, and versions;
- which sanitized artifacts you permit the maintainer to register publicly.

Exclude private keys, seed phrases, provider credentials, and customer data.
Confirm permission for public sample registration before publishing an
integration's evidence. No external pilot or accepted integration fix has been
recorded for this increment.

## Acceptance record

Keep the implementation result, live network qualification, and external
maintainer reproduction separate. Record the integration/version, selected
hashes, chain/block/profile, report digest, capture time, finding, correction,
and who reproduced the result. A synthetic demo establishes analyzer behavior;
an external maintainer's actual reproduction establishes external usefulness.
