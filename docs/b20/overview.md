# B20 Discovery & Attribution: inspection foundation

BAO can inspect an explicitly supplied B20 candidate and preserve the initialization
response at a concrete block. The current increment covers inspection and report
verification. B20 transaction replay and attribution comparison are the next step.
Existing attribution commands and Proof Set v1 are unchanged.

## Offline demonstration

```sh
pnpm build
node packages/cli/dist/index.js b20 inspect --input fixtures/b20/synthetic/asset-initialized.capture.json --chain-id 84532 --offline --format json
node packages/cli/dist/index.js b20 verify --input fixtures/b20/synthetic/asset-initialized.report.json --offline
```

This demo uses synthetic evidence and makes no network requests. The result is
`confirmed-initialized` under the supplied evidence, `synthetic` acquisition,
`not-qualified` runtime support, and `not-tested` application readiness.

## Read-only RPC inspection

Configure an endpoint through a local environment variable or a CI secret. Do
not put its value into command history or a committed file. Supply your actual
token address as `TOKEN_ADDRESS`:

```sh
bao b20 inspect --address "$TOKEN_ADDRESS" --chain-id 84532 --block finalized --rpc-url-env BASE_RPC_URL --format json --output b20-inspection.json
bao b20 verify --input b20-inspection.json --offline
bao b20 verify --input b20-inspection.json --rpc-url-env BASE_RPC_URL --format json --output b20-recheck.json
```

On PowerShell, use `$env:TOKEN_ADDRESS` instead of `$TOKEN_ADDRESS`. `--block`
accepts canonical decimal numbers, `finalized`, `safe`, or `latest`; the default
is `finalized`. Every tag resolves to a concrete header before the state read.
The tool never silently selects another tag or provider.

Reports are immutable snapshots: `--output` must name a new file. This also
prevents verification from overwriting its source through an alias or symlink.
Without `--output`, JSON output contains only the artifact. Formats are `human`,
`json`, and `markdown`.

The default `observe` policy permits internally consistent partial reports, such
as an unavailable initialization read. Block conflicts, invalid input, chain
mismatches, and failed acquisition of chain/header context return nonzero.
Offline verification returns success for internal consistency, not a live check.
Online verification succeeds only for matching, resolved, non-synthetic evidence.

## What the result means

| Classification          | Evidence meaning                                               |
| ----------------------- | -------------------------------------------------------------- |
| `prefix-candidate`      | Exact source prefix and known variant; no initialization read. |
| `confirmed-initialized` | Factory query returned a canonical true at the stated block.   |
| `not-initialized`       | Factory query returned a canonical false at the stated block.  |
| `not-b20`               | Address is outside the selected source profile's prefix.       |
| `unsupported`           | Unknown chain/variant, or RPC method explicitly unsupported.   |
| `unavailable`           | State acquisition failed or return data could not be decoded.  |
| `conflict`              | The block header changed during acquisition.                   |

Classification describes evidence, and acquisition describes its origin.
Neither establishes application compatibility, ownership, issuer identity,
Builder Code attribution, safety, or Base endorsement. BAO is independent of
Base and Coinbase.

The parser rejects unknown fields, wrong source identities, mismatched call
targets/arguments/blocks, and derived values that disagree with raw evidence.
It recomputes the Keccak evidence digest from recursively sorted JSON object
keys; capture time and provenance belong to that digest, report generation time
does not. A digest is not an authenticity signature.

## Protocol profile and remaining qualification

The [source lock](../../fixtures/b20/protocol-lock.json) pins
[`base/base-std` at `1505323`](https://github.com/base/base-std/tree/150532313c10a410fd81d74d5f1ca0df43865822).
The factory address comes from `src/StdPrecompiles.sol`. The initialization ABI
comes from `src/interfaces/IB20Factory.sol`; the exact 10-byte prefix and variant
offset come from the reference factory implementation. The profile implements
only this source surface, not upcoming multiplier, seizure, or migration behavior.

The source changelog says Cobalt has not activated. It does not establish
mainnet/Sepolia activation heights for this inspector. All reports therefore
retain `runtimeQualification: not-qualified`. No live network observation or
external pilot is included in this increment. Provide an explicit endpoint and
real candidate to qualify a particular observation; no wallet or funds are needed.

## Diagnostics

Reports emit `B20_RUNTIME_NOT_QUALIFIED`, `B20_INITIALIZATION_NOT_OBSERVED`,
`B20_UNSUPPORTED_CHAIN_OR_VARIANT`, `B20_INVALID_RETURN`, `B20_BLOCK_CHANGED`,
and the typed read failures `B20_RPC_ERROR`, `B20_UNSUPPORTED_METHOD`,
`B20_UNAVAILABLE_HISTORY`, `B20_INVALID_RESPONSE`, `B20_TRANSPORT_ERROR`.

Validation/command errors include `B20_INVALID_INPUT`, `B20_CHAIN_MISMATCH`,
`B20_BLOCK_MISMATCH`, `B20_EVIDENCE_MISMATCH`, `B20_DERIVATION_MISMATCH`,
`B20_INPUT_LIMIT`, `B20_INVALID_RPC_URL`, `B20_RPC_NOT_CONFIGURED`,
`B20_METHOD_DENIED`, `B20_OUTPUT_EXISTS`, and `B20_OUTPUT_FAILED`.
