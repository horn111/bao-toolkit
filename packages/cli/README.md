# `@base-attribution-os/cli`

Command-line validation for Base Builder Code attribution in source code, calldata, transactions, and UserOperations.

```bash
pnpm add -D @base-attribution-os/cli
pnpm exec bao init --builder-code bc_example
pnpm exec bao scan-repo --config bao.config.json --profile strict
pnpm exec bao doctor
pnpm exec bao proof-set --builder-code bc_example --title "Example project" --input proof-a.json,proof-b.json
```

`bao proof-set` validates and combines replay JSON into a deterministic manifest. Use
`--format markdown` for a calldata-free public summary. Run `pnpm exec bao --help`
for the full command list.

## B20 inspection and replay (unreleased)

```bash
bao b20 inspect --address "$TOKEN_ADDRESS" --chain-id 84532 --block finalized --rpc-url-env BASE_RPC_URL --format json --output inspection.json
bao b20 verify --input inspection.json --offline
bao b20 verify --input inspection.json --rpc-url-env BASE_RPC_URL
bao b20 replay --hashes "$TX_HASH" --chain-id 84532 --expect bc_example --rpc-url-env BASE_RPC_URL
```

Set the RPC endpoint through the named environment variable. Inspection is
read-only; the default block is `finalized`. Offline verification checks internal
consistency only. An explicit RPC recheck uses the original block. Output files
must be new paths so historical artifacts cannot be overwritten. Replay accepts
captured evidence with `--input ... --offline`; strict attribution requires a
current RPC run. Application readiness remains untested.

[B20 guide](https://github.com/horn111/base-attribution-os/blob/main/docs/b20/overview.md)

[CLI documentation](https://github.com/horn111/base-attribution-os#quickstart) · [Issues](https://github.com/horn111/base-attribution-os/issues)
