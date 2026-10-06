# Attribution Doctor

Attribution Doctor audits supported transaction paths before they ship. It uses
the TypeScript AST to identify call sites, connect them to Builder Code evidence,
and produce terminal, JSON, or SARIF reports.

## Start

```bash
bao init --builder-code bc_abc123
bao doctor
```

`init` creates `bao.config.json` and reports supported call sites, findings, and
the exact selected scope. It does not rewrite application code.

From a v0.7 source build, preview a policy and optional pinned CI workflow:

```bash
bao init --builder-code bc_abc123 --include src,app --workflow --dry-run
bao init --builder-code bc_abc123 --include src,app --workflow
```

The preview writes nothing and includes both proposed files. With no `--include`,
init selects existing `src`, `app`, `pages`, `lib`, `packages`, and `apps`
directories, or `**/*` when none exist. Review that scope for your application.
An existing config blocks creation unless `--force` is supplied. Existing
`.github/workflows/bao-attribution.yml` always blocks workflow creation, even with
`--force`. Other workflows are left in place; check for duplicate checks yourself.
The generated workflow pins the verified v0.6.1 Action and requires a non-empty
strict scan. Review policy and workflow changes as part of code review.

`doctor` reports every supported path:

```text
BAO Attribution Doctor

Frameworks: smart-wallet, wagmi, x402
Coverage: 3/4 paths protected (75%)

+ wagmi    app/mint.tsx:18 sendTransaction [protected]
+ x402     src/pay.ts:9 x402Client [protected]
! wallet   src/batch.ts:22 sendCalls [missing] BAO005
  Use capability-aware middleware or negotiate wallet_getCapabilities first.
```

## Supported paths

- Privy embedded-wallet transactions and project-level `dataSuffix` config.
- Wagmi and Viem transaction calls and client configuration.
- ethers signers and BAO attribution wrappers.
- raw `eth_sendTransaction` RPC calls.
- Capability-aware EIP-5792 `sendCalls` and `wallet_sendCalls` paths.
- ERC-4337 `eth_sendUserOperation` and BAO UserOperation middleware.
- x402 buyer and seller Builder Code extensions.
- agent transaction tools that send Base transactions.

## Output formats

```bash
bao doctor --format human
bao doctor --format json
bao doctor --format sarif --output bao.sarif
```

Human output is optimized for local work. JSON is the stable automation surface.
SARIF can be uploaded to GitHub Code Scanning.

An empty scope is **not measured**, not evidence of complete protection. Check
include/exclude patterns, supported syntax, and any changed-only filter. CLI
summaries and Action summaries omit the percentage when no paths are found.
For compatibility, JSON `summary.coverage` and the Action `coverage` output retain
the numeric value `100` for an empty scope. Always check `summary.total` or the
Action `transaction-paths` output before interpreting coverage.

The CLI retains its no-findings success exit code. The Action retains its stricter
policy: with `fail-on-missing: true`, an empty scope fails, including an empty
changed-only scan. `fail-on-missing: false` permits reporting without enforcement.

## Compatibility

`bao scan-repo` remains available for existing workflows. It now delegates to
the Doctor engine and maps the richer report back to the original finding shape.

## Static-analysis boundary

Doctor does not execute application code. Environment-driven attribution is
reported as `unresolved`: a warning in `ci`, and an error in `strict`. This is
deliberate; the scanner reports what it can prove instead of treating any helper
name in the same file as complete coverage.

Locally implemented helpers, including suffix aliases and local
`Attribution.toDataSuffix` objects, produce `BAO003` rather than `protected`.
The scanner follows supported local declarations and lexical scopes; it does not
evaluate helper bodies. Known helper names in standalone snippets remain supported
without imports for compatibility. A protected result is a static pattern match,
not proof of a helper's runtime behavior or a substitute for transaction replay.
