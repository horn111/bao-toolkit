# B20 implementation status

Updated: 2026-09-29.

## Checkout and scope

Started on clean `main` at `af96772c3d38265f84686dacda2ca2827e7a9944`.
No open pull requests or local B20 branches existed at the initial inspection.
The owner approved pushing this slice on `feat/b20-inspection` for review before
the replay increment. No package release or production deployment is included.

This slice implements the handoff's immediate assignment, P0 and P1, plus
inspection-only offline validation and RPC rechecking. It does not mark the
entire P1–P4 Foundation complete.

## Implemented

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

## Validation

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

## Completion states and next increment

- **Code completion:** P0/P1 inspection slice complete; full Foundation incomplete.
- **Live qualification:** not performed; needs an explicitly configured endpoint,
  a real observation, and a recorded chain/block/capability context.
- **External validation:** not performed; no pilot subject or acceptance evidence.

Next useful increment is P2: bounded transaction/receipt/header collection,
source-pinned factory-event decoding, direct-call versus event-only evidence,
existing ERC-8021 decoder reuse, explicit denominators, and replay policies.
P3 then adds the transaction broken/fixed example and replay rechecks; P4 adds
the static public report pages and pilot kit. Neither transaction replay nor a
public B20 page is advertised as available by this slice.

## PR CI dependency repair

PR #21 hit an existing undici 6.28.0 production audit finding. The follow-up pins
`@actions/http-client>undici` to 6.28.1, regenerates the lockfile and Action bundle,
and passes `pnpm audit --prod` plus the nine-package release-candidate smoke.
The advisory is https://github.com/advisories/GHSA-3wwx-pv8p-q78v.
