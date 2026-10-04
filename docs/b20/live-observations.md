# B20 public network observations

Recorded on 2026-09-30 through the built BAO CLI, using the
[official public RPC endpoints](https://docs.base.org/get-started/connect-to-base).
Both samples passed offline validation and a fresh RPC recheck of their original
transaction, receipt, block, and initialization evidence. The rechecks used the
same public endpoint as collection; this is not a comparison between providers.

These are bounded public samples, not an integration's complete transaction
export. No expected Builder Code was supplied. Observed codes are reported, while
attribution percentages remain `Not measured`.

## Recorded samples

| Sample                                                                            | Selection                                                                                                                                                                      | Observed result                                                                                                                 |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| [Base mainnet report](../../fixtures/b20/recorded/2026-09-30/mainnet.report.json) | First three factory creation events in blocks 51995267–51996266, then their token Transfer/Approval/Memo event transactions through the pinned final block; six unique hashes. | Three creation observations, five event-only transactions, and one receipt-matched direct approval. All six receipts succeeded. |
| [Base Sepolia report](../../fixtures/b20/recorded/2026-09-30/sepolia.report.json) | Both factory creation events in blocks 47506060–47507059; two unique hashes.                                                                                                   | Asset and Stablecoin creation inside wrapper calls. Both receipts succeeded; nested application attribution remains unresolved. |

The mainnet approval
[`0x0416cd…a0c21`](https://basescan.org/tx/0x0416cd7fa5e45139371fbc74912624524d7cfca7f5390467fd621b74488a0c21)
targets `0xb200000000000000000000aee79289237d1d7301` at block 51996254.
Its `approve` arguments match the receipt's Approval event, and its top-level
calldata contains `bc_4raffiaj`. This establishes the recorded direct-call
finding; it does not identify an application's intended attribution policy.

The Sepolia calls contain `bc_xw5u611f` at the top level. Their destination is a
wrapper, so BAO retains `B20_NESTED_ATTRIBUTION_NOT_ESTABLISHED` and grants no
direct-call coverage to those observations.

The product site registers these snapshots as `/b20/reports/mainnet-2026-09-30`
and `/b20/reports/sepolia-2026-09-30`. It validates their contents offline and
shows recorded provenance. Visiting the site does not perform a new RPC check.

## Reproduction

After `pnpm build`, validate a saved report without network access:

```sh
node packages/cli/dist/index.js b20 verify --input fixtures/b20/recorded/2026-09-30/mainnet.report.json --offline
```

Replay its capture through the same public analyzer:

```sh
node packages/cli/dist/index.js b20 replay --input fixtures/b20/recorded/2026-09-30/mainnet.capture.json --chain-id 8453 --offline --format json
```

Offline replay imports the evidence and computes a new digest. Its transaction
analysis remains the same, but acquisition becomes `imported`. Offline
validation reports `networkRecheck: not-performed` and
`currentRunStrictPolicy: not-evaluated`.

For a fresh historical recheck on PowerShell, use a new temporary output path:

```powershell
$env:B20_Q1_RPC_URL = 'https://mainnet.base.org'
$b20OutputDir = Join-Path ([System.IO.Path]::GetTempPath()) ('bao-b20-q1-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $b20OutputDir | Out-Null
node packages/cli/dist/index.js b20 verify --input fixtures/b20/recorded/2026-09-30/mainnet.report.json --rpc-url-env B20_Q1_RPC_URL --format json --output (Join-Path $b20OutputDir 'mainnet.recheck.json')
```

For Sepolia, use `https://sepolia.base.org` and `sepolia.report.json`. Rechecking
uses the original block identities; unavailable historical evidence remains
unavailable. It does not substitute `latest`.

Each sample includes its input, capture, report, offline validation, RPC recheck,
and bounded selection queries. Preserve old snapshots when taking a new
observation. The protocol profile remains pinned to `base-std@1505323`.

## Qualification boundary

Live collection and historical rechecking succeeded for these eight transactions.
The recorded approval includes an attribution suffix; the before/after transfer
demo still uses synthetic receipts. No controlled native transfer comparison,
external maintainer reproduction, or accepted integration fix is claimed.

Reports retain `runtimeQualification: not-qualified` and `readiness: not-tested`.
These observations do not establish support for every epoch, method, role,
policy, multiplier, wallet, or router. The next pilot needs a named integration,
its expected Builder Code, a declared sample, and maintainer confirmation.
