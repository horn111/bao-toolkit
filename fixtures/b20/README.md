# B20 inspection fixtures

Every capture and report under `synthetic/` is fabricated test data. The addresses,
block numbers, and hashes do not identify verified network observations. Do not
link them to explorers or describe them as live transactions.

Regenerate the fixtures and source-lock record with:

```sh
pnpm exec tsx scripts/generate-b20-fixtures.ts
```

Run an offline inspection through the public CLI after building:

```sh
node packages/cli/dist/index.js b20 inspect --input fixtures/b20/synthetic/asset-initialized.capture.json --chain-id 84532 --offline --format json
node packages/cli/dist/index.js b20 verify --input fixtures/b20/synthetic/asset-initialized.report.json --offline --format json
```

Fixtures cover initialized Asset/Stablecoin responses, false initialization,
prefix-only evidence, an ordinary address, an unknown variant, unavailable
history, an empty return, and conflicting block headers. The current format is
inspection-only. Receipt and attribution captures live in `synthetic/replay/`;
regenerate them with `pnpm exec tsx scripts/generate-b20-replay-fixtures.ts`.
The fixed transfer uses BAO's suffix helper and the same token, recipient and
amount as the broken capture. Both receipts remain synthetic.

`protocol-lock.json` records the official source commit, normalized source hashes,
minimal ABI digest, exact prefix, factory address, and unresolved activation
status. Source identity does not authenticate the synthetic captures.
