# Reproduce an attribution regression

This example runs real viem request construction against an in-memory transport.
The broken transfer omits attribution; the fixed transfer uses the official
`ox/erc8021` helper. Both send the same recipient, value, and application calldata.
No keys, funds, RPC endpoint, or connected wallet are needed.

From the repository root, using Node 20.11+ and pnpm 9.15.4:

```bash
pnpm install --frozen-lockfile
pnpm --filter @base-attribution-os/integration-starter... build
pnpm --filter @base-attribution-os/integration-starter demo
pnpm verify:integration
```

Expected demo output:

```text
broken: Doctor fails; captured calldata omits bc_abc123
fixed: Doctor passes; captured calldata contains bc_abc123
Offline reproduction passed. No RPC connection, keys, funds, or onchain evidence.
```

## Inspect the source findings

```bash
node packages/cli/dist/index.js doctor --path examples/integration-starter --config bao.broken.json --profile strict
node packages/cli/dist/index.js doctor --path examples/integration-starter --config bao.config.json --profile strict
```

The broken command exits 1; the fixed command exits 0. The two policies deliberately
select different files so the negative control does not make the fixed scope fail.
An application's real CI policy should include all its intended transaction paths.

## Save before and after evidence

```bash
node packages/cli/dist/index.js pilot-report --path examples/integration-starter --config bao.broken.json --output .local/before.json
node packages/cli/dist/index.js pilot-report --path examples/integration-starter --output .local/after.json
```

The first command writes the report and exits 1. Use separate invocations; a shell
`&&` chain would stop before the second command. Review scope, paths, code, commit,
and dirty state when comparing artifacts. No transaction evidence is inferred from
this mock transport. Its placeholder hash must never be submitted as a real proof.

## Bring the pattern to your app

Copy the request-level suffix from `src/fixed.ts` into your actual send path.
Replace `bc_abc123` with your registered Builder Code and keep your own transport,
account, recipient, and transaction data. Run Doctor in the application repository.
For CI preview, pilot summaries, and optional real transaction verification, see
the [technical pilot guide](../../docs/pilot-integration.md).

The [compatibility matrix](../../docs/compatibility.md) describes exact versions
and which boundaries this example tests. It does not qualify a real wallet.
