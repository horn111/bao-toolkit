# B20 implementation status

Updated: 2026-09-29.

## Checkout and scope

Started on clean `main` at `af96772c3d38265f84686dacda2ca2827e7a9944`.
No open pull requests or local B20 branches existed at the initial inspection.
The owner approved pushing this slice on `feat/b20-inspection` for review before
the replay increment. No package release or production deployment is included.

P0/P1 is pushed in draft PR #21 (`feat/b20-inspection`, commit `75fb942`), with
all PR checks passing. The next local increment on `feat/b20-replay` adds P2
transaction replay and the offline broken/fixed example and replay recheck from
P3. The entire P1–P4 Foundation is not complete.

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

All committed chain-shaped evidence is synthetic. No RPC endpoint or real token
was provided for live qualification. Native execution and an external integrator
pilot remain untested. This is not a B20 Ready certificate.

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

## Completion states and next increment

- **Code completion:** P0/P1 and P2 implemented; full Foundation incomplete.
- **Live qualification:** not performed; needs an explicitly configured endpoint,
  a real observation, and a recorded chain/block/capability context.
- **External validation:** not performed; no pilot subject or acceptance evidence.

The synthetic broken/fixed replay example and historical recheck are available
locally. Remaining Foundation work includes native execution qualification,
static public report pages, and the pilot kit. No public B20 report page or
external validation is claimed.

## PR CI dependency repair

PR #21 hit an existing undici 6.28.0 production audit finding. The follow-up pins
`@actions/http-client>undici` to 6.28.1, regenerates the lockfile and Action bundle,
and passes `pnpm audit --prod` plus the nine-package release-candidate smoke.
The advisory is https://github.com/advisories/GHSA-3wwx-pv8p-q78v.
