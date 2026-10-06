# @base-attribution-os/core

## 0.4.1

### Patch Changes

- 9e36be9: Add initialization previews, scope-aware diagnostics, and optional pinned CI
  workflow generation that preserves existing workflows. Add `bao pilot-report`
  to record a strict source audit, tool versions, Git state, and optional supplied
  Proof Set and CI references with explicit evidence limits.

  Fix Proof Set JSON round-trips for unverified reports whose optional explorer
  URL is absent. Continue rejecting mismatched derived fields and explicit nulls.
  Align repository metadata with bao-toolkit for npm provenance on this train.

## 0.4.0

### Minor Changes

- a9fe1ee: Add canonical multi-report Proof Sets, strict manifest parsing, deterministic aggregation, and the `bao proof-set` command with JSON and calldata-free Markdown output.

## 0.3.1

### Patch Changes

- 61f0b9f: Reject malformed ERC-8021 code lists and require transaction-linked attribution evidence in strict repository scans.

## 0.3.0

### Minor Changes

- a9c6951: Harden attribution before the next public release: enforce the Base Builder Code
  format, require a chain ID for custom registries, preserve adapter prototype and
  method context, validate scanner configuration, stabilize baselines, respect
  rule severity in SARIF, and verify the packed GitHub Action in release smoke
  tests.

## 0.2.0

### Minor Changes

- 731d226: Add Attribution Proof Loop reports, Dune JSON and CSV replay, batched RPC
  transaction fetching, Markdown proof output, and the `bao replay` and
  `bao proof` commands.

## 0.1.0

### Minor Changes

- Publish the first public Base Attribution OS release with ERC-8021 SDK helpers,
  Attribution Doctor, CLI validation, and GitHub Action enforcement.
