# App activity and attribution dashboards

The docs app serves Builder Code activity at `/dashboard` and the existing
source audits and proof statistics at `/dashboard/evidence`. Both use the site's
pixel typography and teal palette.

## Activity view

Enter a Builder Code, choose Base mainnet or Sepolia, and inspect a 7, 30 or 90
day window. The view provides daily operations and successful active wallets,
execution outcomes, recorded network fees, destination addresses, and a
searchable operation ledger. Selecting a chart day filters the ledger. Its
filters do not change the summary metrics or the JSON export.

The initial BAO example and Stack the Bag example contain published proof
samples, not complete app histories. `proofs/activity-samples.json` records public
RPC transaction/receipt/block metadata for the allowlisted proofs. Historical
Sepolia block timestamps were unavailable when this snapshot was collected.
Missing timestamps and UserOperation senders stay unknown. Published sample
windows end at the latest recorded operation, or the proof manifest date when
no operation is dated. The snapshot label records the metadata collection date.

CSV and JSON imports stay in browser memory. JSON accepts an array, a Dune
`result.rows` object, or a dashboard export with `operations`. CSV accepts quoted
fields. Imports are limited to 10 MB and 20,000 rows and never imply complete
coverage. A shared import link preserves the code, network and period; recipients
must import the same file to reopen its data.

## Connect indexed history

1. Save `dune/builder-code-activity.sql` as a Dune query. Add parameters
   `builder_code` (text), `chain_id` (number, default 8453), and `days`
   (number, default 90). Run it in Dune and verify the columns and selected code.
2. Copy `apps/docs/.env.example` to `apps/docs/.env.local` and set
   `DUNE_API_KEY` and `DUNE_ACTIVITY_QUERY_ID`. Use server environment variables
   in hosting. Never prefix the key with `NEXT_PUBLIC_` or commit it.
3. Restart the docs app. A lookup fetches matching cached results or deliberately
   starts a query and polls that execution. Page loads and polling do not execute
   SQL. Completed results are cached for 15 minutes per server instance.

The supplied query indexes ordinary Base mainnet transactions. Sepolia remains
available through imports and published evidence. The query has not been
executed against a configured Dune account in this workspace. Its raw columns
follow Dune's [Base transactions schema](https://dune.com/data/base.transactions).
Incomplete or oversized API results, provider failures and missing configuration
produce explicit states rather than zero activity.

For ERC-4337, extend the query with one row per UserOperation. Supply
`user_op_hash`, its transaction hash, `user_op_sender`, `user_op_success`,
`user_op_calldata` and `actual_gas_cost` in wei. The dashboard deduplicates
operations and excludes their parent transaction containers. Set
`DUNE_ACTIVITY_INCLUDES_USEROPS=true` only after validating that collection
covers those operations. Bundler senders, receipt statuses and transaction fees
are not substituted for missing UserOperation fields.

Periods use UTC calendar dates through the source's observation time. Undated
operations remain in totals and the ledger, but do not enter the daily chart.
Wallet counts describe addresses with successful recorded operations, not
people. Fees use exact integer wei: transaction execution cost plus L1 fee, or
the reported UserOperation actual gas cost. Unknown fields remain unavailable.
Raw calldata overrides supplied attribution columns; otherwise the UI labels
attribution as reported. Imported and indexed rows are not automatically RPC
verified. Activity found with a code cannot measure missing attribution,
offchain visits, funnels, app revenue, or TVL.

## Attribution evidence view

The main question is whether Builder Code attribution survives the application's
transaction paths and releases.
BAO adds supported-source-path audits, CI enforcement, and reusable onchain
evidence. Base provides automatic attribution inside Base App; outside it,
builders can integrate directly without BAO. See the
[official app integration guide](https://docs.base.org/specifications/builder-codes/for-app-developers).

The evidence view uses the canonical manifests in `proofs/sets/`.
It defaults to Stack the Bag and also supports BAO's own published evidence.
Project and network selections are encoded in the share URL. Search and the
review filter apply only to the transaction table; summary metrics and the JSON
export describe the full selected project/network sample.

### What evidence measures

- Published transactions: unique chain ID and transaction hash pairs.
- RPC-verified evidence: records marked verified in the published proof set.
- Builder Code found: records decoded with the expected Builder Code.
- Coverage: verified and attributed records divided by all selected records.
- Needs review: any selected record that is not both verified and attributed.

Empty selections display no percentage. Missing, invalid, unavailable,
differently attributed, and unverified records remain in the denominator.
Testnet records are labeled and can be excluded with the Base mainnet filter.
The snapshot date comes from the manifest, not the browser's current time.

These are sample statistics, not full-project analytics. RPC verification does
not certify contract security, deployment readiness, or successful game actions.
The dashboard never infers revenue, unique players, social referrals, season
membership, or daily activity from the published sample.

### Update the public evidence

The source-audit section uses an allowlisted snapshot in `proofs/audits/`,
registered by Builder Code in `apps/docs/app/dashboard/registry.ts`. Regenerate it
from a local project with:

```bash
pnpm exec tsx scripts/export-dashboard-audit.ts --path <project> --builder-code bc_abc123 --output proofs/audits/bc_abc123.json
```

This runs a strict source audit without rewriting the application, disabling
rules, or applying a findings baseline. Only aggregate counts, framework
families, date, and revision metadata are exported. It omits paths, source text,
and raw findings. Review the public snapshot before publication. Its findings
describe a local source audit, not a hosted CI run. The source audit is project
wide and does not change with the onchain network filter.

Use the existing replay and proof-set workflow described in
[Attribution Proof Loop](attribution-proof-loop.md). Replace the project's
canonical manifest in `proofs/sets/` with the new public proof set, then rebuild
and redeploy the docs app. An additional project must be explicitly registered
in `apps/docs/app/proof-data.ts`.

The evidence view does not run runtime RPC requests or background ingestion.
Its client receives metadata only; calldata remains in the canonical proof
sets and existing proof pages. The JSON export contains public metadata for
the selected sample and includes its scope and snapshot date.

## Connect Stack the Bag seasons

The currently published game sample contains two historical Base Sepolia
transactions. It does not establish that the current game release has been
deployed. Keep season metrics in the explicit not-connected state until there
is an active deployment and a complete collection process.

A season feed needs:

1. The current chain ID, contract address, and deployment block.
2. The season ID mapping used by the game. Its collectible contract emits
   `ClaimConsumed` with indexed player and season ID fields.
3. An index of those events through a recorded, confirmed block. Deduplicate
   events by chain ID, transaction hash, and log index. Count transactions and
   claim events separately: a batch can emit multiple claims.
4. Attribution verification for the corresponding transaction path. For smart
   wallets, inspect the relevant UserOperation calldata, not an unrelated
   operation in the same EntryPoint transaction.
5. A public snapshot with the scanned block range, update timestamp, season
   membership, completeness state, and errors. Retain unattributed activity in
   the denominator and never render a failed or partial scan as an empty season.

Use the event's player for participating wallets; the transaction sender can be
a bundler. Wallet counts are not counts of people. Game sessions and offchain
play require an explicitly defined game data source. An onchain Builder Code
alone cannot identify which X post brought a player to the game.
