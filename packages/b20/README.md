# @base-attribution-os/b20

Source-pinned B20 token inspection and receipt-aware attribution replay for Base
Attribution OS. Inspect a token, analyze an explicitly supplied transaction set,
and validate or recheck the resulting evidence. Application readiness remains
untested.

```ts
import { classifyB20Address, parseB20Report } from "@base-attribution-os/b20";
import { createB20HttpTransport, inspectB20Token } from "@base-attribution-os/b20/rpc";

const candidate = classifyB20Address(tokenAddress, 84532);
const report = await inspectB20Token(
  { address: tokenAddress, chainId: 84532, block: "finalized" },
  createB20HttpTransport({ url: process.env.BASE_RPC_URL! }),
);
parseB20Report(report); // Internal consistency only, not independent RPC verification.
```

The root entry point performs no network or filesystem operations. RPC acquisition
requires the `/rpc` entry point and an explicit transport. No wallet, signing,
transaction submission, provider discovery, or metadata URL fetching is included.

## Evidence boundaries

- Only the exact source prefix is a candidate. Asset and Stablecoin use address
  byte 10; other variant values remain unsupported.
- Confirmation requires a canonical 32-byte boolean from the factory initialization
  query. A prefix, token name, or empty return cannot confirm initialization.
- The source profile covers Base chain IDs 8453 and 84532 as inspection targets.
  Neither deployment nor activation heights have been qualified. Successful RPC
  responses describe the selected endpoint and block, not universal chain support.
- State queries use EIP-1898 with `requireCanonical: true`. End-of-block state is
  not transaction-time state. The collector rechecks the header after the call.
  Providers without hash-pinned calls receive an unavailable result; there is no
  silent fallback to a block number or `latest`.
- `acquisition` records a producer claim. `validateB20ReportOffline` marks a claimed
  RPC artifact as imported in the current validation. Synthetic evidence stays
  synthetic, including when separately compared with RPC observations.
- `readiness` is always `not-tested`. An observational pass is not certification.

## Public API

Pure: `B20_PROFILE`, `initializationAbi`, `initializationCalldata`,
`classifyB20Address`, `parseB20InspectionCapture`, `createB20InspectionReport`,
`parseB20Report`, `validateB20ReportOffline`, `MAX_B20_ARTIFACT_BYTES`.

RPC: `createB20HttpTransport`, `inspectB20Token`, `recheckB20Report`,
`B20RpcError`, `B20_RPC_METHODS`, and their request/transport types.

`recheckB20Report` returns a separate validation artifact. It compares the original
block and exact initialization evidence. Unavailable reads are inconclusive;
changed evidence is conflicting. It never rewrites the source report.

The transport permits `eth_chainId`, `eth_getBlockByNumber`, `eth_call`,
`eth_getTransactionByHash`, and `eth_getTransactionReceipt`.
It uses individual requests, validates response IDs, defaults to 64 KiB responses
(configurable up to 1 MiB for replay),
and applies a 10-second timeout per request (configurable to at most 30 seconds).
It makes no retries or batches. Provider URLs, messages, and error data are never
included in report diagnostics; numeric RPC error codes may be retained.

The package uses viem 2.56.0 for ABI encoding and Keccak. viem is an external
runtime dependency, not bundled into BAO. Attribution-only core and adapters do
not depend on this package. The CLI does depend on it.

## Replay API

Pure: `parseB20ReplayInput`, `parseB20ReplayCapture`, `createB20ReplayReport`,
`parseB20ReplayReport`, `validateB20ReplayReportOffline`, `B20_REPLAY_PROFILE`,
`B20_REPLAY_LIMITS`, `b20TokenAbi`, and `b20FactoryAbi`.

RPC: `collectB20TransactionEvidence`, `replayB20Transactions`,
`recheckB20ReplayReport`. Strict attribution requires current-run RPC collection;
the pure analyzer cannot grant that authority from serialized claims.

Replay uses core's existing ERC-8021 decoder. Reports distinguish direct calls,
factory creation and event-only observations, preserve unavailable rows, and
keep amounts as decimal strings. Reverted calls with only end-of-block
initialization remain unresolved at transaction time. See the repository's
[replay guide](https://github.com/horn111/base-attribution-os/blob/main/docs/b20/replay.md)
for scope, resource limits and the synthetic broken/fixed demo.
