# Pilot Integration Guide

BAO Toolkit pilots are small attribution-readiness checks for Base
builders. The goal is to prove that Builder Code attribution survives real
transaction paths before deploy.

## Reproduce the local regression first

Start with the [runnable integration starter](../examples/integration-starter/README.md).
It executes a broken and fixed viem transfer against an in-memory transport and
checks that Doctor agrees with the outgoing calldata. It needs no keys or funds.
The [compatibility matrix](compatibility.md) lists the exact versions and limits.

## Try the released CLI on your project

Install CLI 0.6.0 from the v0.7.0 release in your application, then preview its
policy and optional CI workflow:

```bash
pnpm add -D @base-attribution-os/cli@0.6.0
pnpm exec bao init --builder-code bc_yourcode --workflow --dry-run
pnpm exec bao init --builder-code bc_yourcode --workflow
pnpm exec bao doctor --profile strict
```

Review the scope in the preview. Add `--include src,app` or your actual relative
source paths when necessary. No supported paths means no measurement. Init
returns success when file creation succeeds, even if its diagnostic scan finds
issues; use Doctor for enforcement. An existing workflow is never replaced.

## Record before and after

Run `pnpm exec bao pilot-report` with the installed CLI before the fix, then again after it,
using different output paths outside your repository or in an ignored directory:

```bash
pnpm exec bao pilot-report --output /private/pilot/before.json
pnpm exec bao pilot-report --output /private/pilot/after.json
pnpm exec bao pilot-report --format markdown --output /private/pilot/summary.md
```

Reports include the expected code, tool versions, Git commit and dirty state,
scope, and per-path source findings. A clean commit identifies checked-in state;
a dirty working tree requires preserving the corresponding diff separately.
Compare the same scope and code, and record which findings the integrating team
confirmed. The command writes a failing report before exiting 1. It exits 1 for
findings, an empty scope, or a supplied Proof Set whose own verification fails.
It never overwrites an existing output.

If you have a real transaction sample, create a report with the existing
[replay and Proof Set workflow](attribution-proof-loop.md), then attach it:

```bash
pnpm exec bao pilot-report --proof-set /private/pilot/proof-set.json --ci-run https://github.com/OWNER/REPO/actions/runs/123 --output /private/pilot/with-evidence.json
```

Proof Sets are checked for internal consistency and hashed. This command does
not contact RPC, verify the CI run, or infer that a source call produced a
particular transaction. Source coverage and sampled transaction coverage remain
separate. Preserve the supplied Proof Set beside the summary. Its stored RPC
verification claims are not a fresh network check.

## Request a technical pilot

Open an [integration request](https://github.com/horn111/bao-toolkit/issues/new?template=integration_request.yml)
with a minimal public reproduction, exact client versions, and the result you
expected. Share only reports you intend to make public. Confirm whether the
team reproduced the finding, accepted the fix, and retained the CI check.
Current reference examples and automated tests do not establish external adoption.

## Good pilot candidates

- x402 buyer or seller flows that should carry Builder Code extensions.
- viem, wagmi, or ethers app flows that append an ERC-8021 suffix.
- Smart wallet `sendCalls` or batched transaction flows.
- Agent tools that can trigger Base transactions.

## What to provide

Open an integration request with:

- repository or minimal fixture link;
- expected Builder Code, or a placeholder if it cannot be public;
- transaction family: `x402`, `viem`, `wagmi`, `ethers`, `wallet`, or `agent`;
- files or folders where transaction code lives;
- preferred profile: `local`, `ci`, or `strict`.

Do not include private keys, secrets, customer data, or production-only RPC
credentials.

## What BAO checks

- whether candidate transaction paths are detected;
- whether the expected Builder Code or suffix is present when `strict` is used;
- whether official x402 Builder Code helpers stay in buyer or seller paths;
- whether a GitHub Action config can fail a pull request before deploy.

## Pilot output

A useful pilot should produce at least one public artifact:

- fixture repo or PR;
- scanner output showing pass/fail behavior;
- GitHub Action YAML;
- short note describing what attribution regression BAO would catch.

## Near-term pilot targets

- one app or dApp transaction flow;
- one x402 payment flow;
- one wallet or agent flow.
