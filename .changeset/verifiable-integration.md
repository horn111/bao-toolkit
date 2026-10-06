---
"@base-attribution-os/cli": minor
"@base-attribution-os/core": patch
---

Add initialization previews, scope-aware diagnostics, and optional pinned CI
workflow generation that preserves existing workflows. Add `bao pilot-report`
to record a strict source audit, tool versions, Git state, and optional supplied
Proof Set and CI references with explicit evidence limits.

Fix Proof Set JSON round-trips for unverified reports whose optional explorer
URL is absent. Continue rejecting mismatched derived fields and explicit nulls.
Align repository metadata with bao-toolkit for npm provenance on this train.
