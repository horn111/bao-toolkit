# Integration compatibility

The v0.7 integration corpus pins upstream packages so a result can be reproduced.
Run `pnpm verify:integration` after installing and building the workspace. Exact
versions live in `examples/integration-starter/package.json` and are checked
against the installed packages by the test suite.

| Dependency  | Version | Boundary exercised                                                                                                  |
| ----------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| viem        | 2.56.0  | Real `sendTransaction` construction through an offline EIP-1193 transport; broken/fixed calldata and Doctor results |
| ox          | 0.14.34 | Official `Attribution.toDataSuffix` bytes against BAO encoding; expected and wrong codes                            |
| @wagmi/core | 2.22.1  | Real `sendTransaction` action with an explicit offline connector and BAO config suffix                              |
| ethers      | 6.17.0  | Real transaction serialization/signing of BAO-wrapped data; broken control; no broadcast                            |
| BAO wallet  | 0.1.4   | EIP-5792 supported, unsupported, wrong-chain and unavailable capability responses; unsupported batches are not sent |

These checks do not exercise React rendering, wallet connection UI, hardware
wallets, browser extensions, bundlers, paymasters, or live chain inclusion.
The broad peer dependency ranges in the packages are not a claim that every
version in those ranges has been tested.

## Source corpus

`fixtures/compatibility/cases.json` contains 10 maintainer-labeled cases: four
protected patterns, five findings, and one scope without a supported call.
The findings cover missing attribution, a wrong code, local no-op helpers through
aliases and namespaces, and an unresolved runtime code. Each test checks the exact
status, including negative controls; detecting a call is not the same as protecting
it. Existing scanner and wallet suites cover additional workspace and middleware
cases outside this small corpus.

This is a regression corpus, not an independently collected sample or an estimate
of real-world precision. An unrecognized call shape can be absent from a report.
Inspect the supported paths and scope before interpreting coverage.

## Runtime matrix

The CI `integration` job runs the same starter, corpus, init, and pilot-report
checks on Node 20, 22, and 24. All three passed for the versioned v0.7.0 packages
in [CI on the npm publication commit](https://github.com/horn111/bao-toolkit/actions/runs/37453844797).
Local checks validate only the Node version reported by that run. For later
changes, check the matrix on the corresponding commit.

## Adding a compatibility claim

Pin the dependency, add an executable positive and negative control, and name the
actual boundary exercised. For a wallet or provider claim, also record client
versions, chain, capability response, transaction evidence, and reproduction by
the integrating team. Keep those observations separate from offline test results.
