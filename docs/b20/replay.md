# B20 transaction replay

`bao b20 replay` joins explicitly supplied transaction hashes with receipts,
block headers, and token initialization evidence. It decodes the existing
ERC-8021 suffix at the top-level transaction and keeps attribution separate from
execution success and application readiness.

## Offline broken/fixed demonstration

After building the workspace:

```sh
node packages/cli/dist/index.js b20 replay --input fixtures/b20/synthetic/replay/direct-broken.capture.json --chain-id 84532 --expect bc_example --offline
node packages/cli/dist/index.js b20 replay --input fixtures/b20/synthetic/replay/direct-fixed.capture.json --chain-id 84532 --expect bc_example --offline
node packages/cli/dist/index.js b20 verify --input fixtures/b20/synthetic/replay/direct-fixed.report.json --offline
```

Both captures describe the same token, recipient, and amount. The fixture
generator calls BAO's `appendDataSuffix` to construct the fixed calldata.
The client example in `examples/viem-basic/src/b20-transfer.ts` prepares the same
transfer through the existing `withAttributionSuffix` adapter. The generator
uses that example to construct both payloads. The broken report shows missing attribution and 0/1 direct-call coverage;
the fixed report shows the expected code and 1/1 coverage. These are synthetic
receipts, not native execution or an external pilot.

Regenerate with `pnpm exec tsx scripts/generate-b20-replay-fixtures.ts`.

## Explicit RPC collection

```sh
bao b20 replay --hashes "$TX_HASH_A,$TX_HASH_B" --chain-id 84532 --expect bc_example --rpc-url-env BASE_RPC_URL --format json --output replay.json
bao b20 verify --input replay.json --rpc-url-env BASE_RPC_URL --format json --output replay-recheck.json
```

On PowerShell use `$env:TX_HASH_A` and `$env:TX_HASH_B`. Configure the endpoint
through the named environment variable. A JSON hash input may replace `--hashes`:

```json
{
  "kind": "bao.b20-input",
  "schemaVersion": 1,
  "chainId": 84532,
  "selection": {
    "mode": "application-export",
    "description": "Transactions supplied by the integration for this sample.",
    "completeness": "unknown"
  },
  "transactions": [{ "hash": "0x1111111111111111111111111111111111111111111111111111111111111111" }]
}
```

Replace the example hash with a real supplied transaction before RPC use.
The collector validates the endpoint chain, fetches transaction/receipt/header
evidence, and pins token calls to each containing block hash. It makes sequential
requests and caches identical token reads within a chain/block. It does not
scan the network or fetch URLs found in token metadata.

## Supported evidence

- Direct `transfer`, `transferFrom`, `approve`, `transferWithMemo`, and
  `transferFromWithMemo`, with participant/amount and memo-event comparison.
- Canonical `B20Created` events, including indexed fields and Stablecoin event
  version 1. Creation metadata remains separate from later state.
- Receipt-only Transfer/Approval/Memo observations from confirmed token emitters.
  Router/batch events do not receive direct-call attribution credit.
- Failed or pending calls, missing receipts, unknown variants, malformed events,
  conflicting blocks, and unavailable initialization remain explicit.

End-of-block initialization does not establish transaction-time initialization
for an earlier reverted call. This increment counts a reverted attempt in direct
coverage only when valid earlier creation evidence in the supplied same-block
set establishes the token. Otherwise it marks that scope unresolved. It does
not trace nested calls or simulate a historical revert against current state.

## Coverage and policy

Input attribution uses all unique supplied hashes as its denominator, including
unavailable rows. Supported direct-call coverage uses only confirmed direct
operations with sufficient receipt/context evidence. Factory calls, event-only
observations, and unresolved operations have separate counters. Zero eligible
scope or an absent expected code means `not measured`.

`observe` accepts consistent partial reports. Whole-run acquisition failure and
conflicting context return a failure. `strict-attribution` requires `--expect`,
current-run RPC collection, resolved mandatory evidence, expected attribution in
every supplied transaction, and at least one supported direct B20 call. A strict
pass concerns attribution in the declared scope, not application compatibility.

The pure `createB20ReplayReport` API cannot grant a strict RPC pass. Use
`replayB20Transactions` for that policy. An offline validator can verify the
consistency of a producer's policy claim, but labels current-run strict policy
`not-evaluated` and network recheck `not-performed`.

Public APIs: `parseB20ReplayInput`, `parseB20ReplayCapture`,
`createB20ReplayReport`, `parseB20ReplayReport`, `validateB20ReplayReportOffline`;
RPC APIs: `collectB20TransactionEvidence`, `replayB20Transactions`, and
`recheckB20ReplayReport`. Inspection APIs and their source profile remain valid.

## Bounds and reproducibility

This increment supports at most 100 supplied hashes (including duplicates),
32 candidates per transaction, 200 receipt logs, 128 KiB of calldata/log data
per field, a 1 MiB HTTP response, and a 4 MiB artifact. These conservative
application limits keep the first replay collector suitable for explicit samples;
they are not protocol limits. Limit failures do not shrink a successful denominator.

Addresses and hashes normalize to lowercase; integer amounts and block numbers
use decimal strings. The parser joins transaction/receipt/log/header identities,
rejects contradictory duplicates, and recomputes derived results and digests.
It checks shared token reads across transactions at the same block.

The JSON schemas in `schemas/` describe the input and report envelope for editors
and interchange. The report schema alone does not validate nested evidence or
derived metrics. Use `parseB20ReplayReport` for the complete runtime validation.
No schema or digest authenticates a producer's chain observation.
