---
"@base-attribution-os/scanner": patch
"@base-attribution-os/cli": patch
"@base-attribution-os/github-action": patch
---

Reject locally implemented attribution helpers passed through suffix aliases or
namespace objects instead of reporting their calls as protected. Apply the same
check to project configuration evidence and preserve trusted imported helpers.
Show empty Doctor scopes as unmeasured in CLI and Action summaries while retaining
the numeric coverage output and existing exit semantics for compatibility.
