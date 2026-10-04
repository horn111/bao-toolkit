# B20 implementation status

Updated: 2026-09-30.

Historical implementation record. B20 0.2.0 and CLI 0.5.0 shipped on 2026-10-04
as part of [BAO Toolkit v0.6.0](../releases/v0.6.0.md). The candidate and deployment
statuses below describe the September checkout. Runtime qualification and external
integrator validation remain incomplete.

## Checkout and scope

Started on clean `main` at `af96772c3d38265f84686dacda2ca2827e7a9944`.
No open pull requests or local B20 branches existed at the initial inspection.
The owner approved pushing this slice on `feat/b20-inspection` for review before
the replay increment. No package release or production deployment is included.

P0/P1 is pushed in draft PR #21 (`feat/b20-inspection`, commit `75fb942`), with
all PR checks passing. The local `feat/b20-replay` branch contains P2 replay
(`db5dbe1`) and the P3/P4 client example, static reports, and pilot kit
(`8fcf557`). P0–P4 are code-complete as a release candidate. Q1 adds bounded
public network observations with historical rechecks. Integration qualification
and external validation remain incomplete; no release or deployment is claimed.

## P0/P1 implementation

- `packages/b20`: separate pure API and explicit read-only `/rpc` subpath.
- Exact 10-byte prefix, Asset/Stablecoin variant byte, unknown-variant handling,
  strict factory boolean decoding, and source/ABI identities.
- `bao b20 inspect`: explicit chain, resolved block, EIP-1898 state read,
  post-read header comparison, and human/JSON/Markdown output.
- `bao b20 verify`: recomputed offline validation or explicit RPC recheck at
  the original block. Imported claims never become current-run RPC evidence.
- Bounded input/HTTP response sizes, request-ID checks, deadlines, sanitized
  provider errors, write-method rejection, and immutable output files.
- Nine synthetic capture/report pairs and a reproducible source-lock generator.
- ESM/CJS packed imports, explicit RPC import, offline CLI inspection and
  verification in the existing clean-consumer release smoke.
- CLI Changeset and a proposed release brief; no package versions were bumped.

`core`, Attribution Proof Set v1, legacy attribution commands, scanner, Action
inputs/defaults, and existing site routes/totals retain their contracts. The
inspection implementation left the Action bundle unchanged. A follow-up CI repair pins the existing HTTP client dependency to undici 6.28.1 and rebuilds that bundle for GHSA-3wwx-pv8p-q78v. Existing attribution-only core/adapters
do not depend on B20. The CLI gains B20 and its external viem 2.56.0 dependency.

## Protocol and trust boundary

Canonical source: `base/base-std` commit
`150532313c10a410fd81d74d5f1ca0df43865822`. Paths, normalized source SHA-256
hashes, and the minimal ABI digest are in
[`fixtures/b20/protocol-lock.json`](../../fixtures/b20/protocol-lock.json).

The source profile targets chain IDs 8453 and 84532, but deployment activation
heights remain unknown. The collector checks the actual endpoint chain and
records each initialization response at its block. It does not infer deployment
qualification from reference code, successful mocks, or the documentation's
hardfork labels. Every report retains `runtimeQualification: not-qualified`
and `readiness: not-tested`.

P0–P4 used synthetic chain-shaped evidence. Q1 records the first actual mainnet
and Sepolia observations through explicitly configured public endpoints; see
[live-observations.md](live-observations.md). Controlled native transfer
comparison and an external integrator pilot remain untested. No B20 Ready
certificate is claimed.

## P0/P1 validation

Environment: Node 24.14.0, pnpm 9.15.4.

Before changes: lint and formatting passed; typecheck passed; 181 tests passed
in 18 files. Initial sandbox runs of typecheck/tests encountered filesystem
permission errors in Turbo/Vitest caches. Retrying outside the sandbox passed.

After implementation:

| Command                          | Result                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `pnpm lint`                      | Passed.                                                                                          |
| `pnpm format`                    | Passed.                                                                                          |
| `pnpm typecheck`                 | Passed, 21 tasks.                                                                                |
| `pnpm test`                      | Passed, 258 tests in 21 files (77 new B20/CLI tests).                                            |
| `pnpm build`                     | Passed, 14 tasks; existing example tasks warn that they produce no declared output files.        |
| `pnpm verify:release-candidate`  | Passed for all nine packages, including B20 ESM/CJS/API/CLI and legacy SDK/scanner/Action smoke. |
| `pnpm size`                      | Passed: B20 61.03/64 KiB, CLI 47.70/48 KiB; all existing budgets pass.                           |
| `pnpm exec changeset status`     | CLI minor and dependent Action patch projected; no version mutation.                             |
| Built CLI offline inspect/verify | Passed against the synthetic Asset fixture.                                                      |

## P2 replay increment

- Explicit hash input with selection provenance and stable denominators.
- Bounded read-only collection of transactions, receipts, headers, and token
  initialization evidence; shared token reads are cached by block hash.
- Source-pinned factory creation and token event decoding, plus five direct
  token operations checked against receipt participants, amounts, and memos.
- Existing ERC-8021 decoding and attribution reports reused from `core`.
- Separate input and eligible direct-call coverage; unknown and unsupported
  scopes remain visible. Strict policy requires current-run RPC evidence.
- Offline report recomputation, historical RPC rechecking, five deterministic
  replay fixture pairs, input/report-envelope schemas, and installed CLI smoke.

The replay profile is recorded in `fixtures/b20/replay-protocol-lock.json`.
The inspection profile remains unchanged. See [replay.md](replay.md) for the
API, CLI examples, policy semantics, and explicit collection limits.

P2 validation: 294 tests pass in 22 files; lint, formatting, full typecheck,
build, and production dependency audit pass. The
nine-package clean-consumer smoke passes, including installed offline replay
and verification. Changesets projects a B20 minor, CLI minor, and Action patch;
no versions were changed. Replay adds ABI decoders, evidence parsers, and RPC
collection, so combined B20 ESM/CJS and CLI budgets become 176 KiB and 56 KiB.
Measured sizes are 173.40 KiB and 52.50 KiB. Built CLI examples confirm 0/1
direct attribution before the suffix fix and 1/1 afterward; offline verification
confirms internal consistency while retaining synthetic provenance.

## P3/P4 client example and public reports

- `examples/viem-basic/src/b20-transfer.ts` constructs the broken and fixed
  payloads using the existing `withAttributionSuffix` adapter. The fixture
  generator uses that same client path; token, method, recipient, and raw amount
  remain unchanged. The helper prepares requests without broadcasting.
- The existing docs app adds `/b20`, `/b20/guide`, and five statically registered
  report pages. The opening comparison shows direct attribution moving from
  0/1 to 1/1 under explicitly synthetic receipt evidence.
- Registry admission parses and recomputes each artifact. Report and capture
  downloads return the exact selected evidence. Unknown IDs return 404.
- Provenance, discovery, attribution, execution, unresolved evidence, runtime
  qualification, and application readiness remain separate. Synthetic hashes
  have no explorer links. At the P3/P4 checkpoint the B20 registry contained five
  synthetic reports and zero recorded reports; Q1 adds recorded snapshots below.
  The legacy Observatory registry and totals are unchanged.
- [pilot-kit.md](pilot-kit.md), the B20 integration issue template, and the
  proposed release brief describe candidate installation, sample selection,
  collection, rechecking, correction, and external acceptance evidence.

P3/P4 validation:

| Check                           | Result                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`, `pnpm format`      | Passed.                                                                                                                                                                                                                                     |
| `pnpm typecheck`                | Passed, 21 tasks.                                                                                                                                                                                                                           |
| `pnpm test`                     | Passed, 301 tests in 23 files.                                                                                                                                                                                                              |
| `pnpm build`                    | Passed, 14 tasks, including all static B20 page/export/capture paths. The existing no-output warning for the viem example remains.                                                                                                          |
| `pnpm verify:release-candidate` | Passed for all nine packages. Installed CLI replay reproduces 0/1 and 1/1; the installed viem helper corrects the missing suffix without changing the operation. Legacy SDK/scanner/Action smoke passes.                                    |
| `pnpm size`                     | Passed; B20 173.40/176 KiB and CLI 52.50/56 KiB, with existing package budgets passing.                                                                                                                                                     |
| Production site                 | Nine pages return 200; all five downloaded report/capture pairs match their registered artifacts, pass CLI offline verification, and reproduce through CLI replay. Unknown report, export, and capture routes return 404.                   |
| Browser behavior                | Report navigation, evidence disclosures, and a JSON download work. The downloaded report passes built CLI offline verification.                                                                                                             |
| Responsive UI                   | Desktop 1440×900 and mobile 390×844 captures reviewed in two bounded rounds. Both outcomes and report links fit the mobile opening screen; document width remains within the viewport, including a 320 px check. Final finish review: ship. |

The exact six-tarball `package.json` in the pilot kit also installs offline in a
clean consumer with pnpm 9.15.4 and reproduces both downloaded captures through
the installed CLI. The finish review's verdict pass scored its three material
fixes resolved: mobile comparison visibility, neutral synthetic hashes, and
readiness in the report's opening context.

The original docs identity, wordmark, typography, and shared navigation remain
in use. Temporary design briefs, screenshots, and review notes are ignored.
P3/P4's new chain-shaped evidence was synthetic. These checks establish the
candidate's analyzer, publication, and install behavior, not native B20 execution.

## Q1 public network observations

The owner selected a public example on 2026-09-30. Read-only discovery used the
official Base and Sepolia endpoints, a concrete finalized block, and at most
1000 factory-event blocks per network. Token-event discovery was limited to the
first three mainnet creations and 12 selected hashes. No Builder Code filter
selected the sample.

- Base mainnet: six selected transactions, three factory creation observations,
  five event-only transactions, and one direct `approve` with a successful
  receipt and `bc_4raffiaj` in calldata.
- Base Sepolia: two wrapper transactions with canonical Asset and Stablecoin
  creation events and observed top-level `bc_xw5u611f`. Nested attribution stays
  unresolved and receives no direct coverage.
- Both CLI replay runs completed; offline validation passed and both historical
  RPC rechecks returned `matched`, `valid: true` at the original blocks.
- No expected Builder Code was configured. Attribution percentages remain
  unmeasured; observed code presence does not establish an integration's policy.
- Inputs, captures, reports, selection queries, offline results, and rechecks
  are preserved in `fixtures/b20/recorded/2026-09-30/`. The static registry now
  contains five synthetic reports and two recorded snapshots.

These observations establish scoped network evidence. Saved artifacts and static
pages retain the producer's RPC claim; offline consumption does not become a
current network check. The native before/after transfer and external pilot remain
untested. See [live-observations.md](live-observations.md) for reproduction and
the limits of the same-provider historical rechecks.

Q1 validation: 306 tests pass in 23 files; lint, formatting, all 21 typecheck
tasks, and all 14 build tasks pass. The nine-package clean-consumer smoke passes,
including offline validation and imported replay of both recorded samples.
Both production report pages return 200. Their report and capture exports match
the registered artifacts exactly and reproduce through the built CLI offline.
Browser checks confirm the five-synthetic/two-recorded registry, network-specific
explorer links, recorded provenance, unmeasured attribution, and the mainnet
Approval disclosure. The mainnet report fits 1440×900 and 390×844 viewports
without horizontal overflow; readiness remains visible in its mobile opening
context. The viewport override was reset after verification.

## Completion states and next increment

- **Code completion:** P0–P4 implemented and validated as a local release candidate.
- **Live qualification:** bounded collection and historical rechecks completed
  for eight public transactions. Full integration and native transfer comparison
  remain unqualified.
- **External validation:** not performed; no pilot subject or acceptance evidence.

Q1's network observation step is complete for the recorded sample. External
usefulness requires a named integration, an independently supplied attribution
policy, and maintainer reproduction. Controlled native transfer comparison
requires a suitable B20 environment and a separately authorized execution path.
The static public-report surface is implemented locally; it is not deployed.
P5's scoped B20 Ready comparison awaits a concrete integration subject.

## PR CI dependency repair

PR #21 hit an existing undici 6.28.0 production audit finding. The follow-up pins
`@actions/http-client>undici` to 6.28.1, regenerates the lockfile and Action bundle,
and passes `pnpm audit --prod` plus the nine-package release-candidate smoke.
The advisory is https://github.com/advisories/GHSA-3wwx-pv8p-q78v.
