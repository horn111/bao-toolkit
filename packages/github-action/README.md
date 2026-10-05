# BAO Toolkit GitHub Action

Scan pull requests for Base transaction paths that are missing the expected Builder Code attribution.

```yaml
- uses: horn111/bao-toolkit/packages/github-action@v0.6.0
  with:
    builder-code: bc_example
    profile: strict
```

The action can scan dependency-aware changed files, resolve bounded monorepo evidence, apply a baseline, emit SARIF, and expose coverage metrics as outputs. Most users should consume the repository action shown above rather than install this package from npm.

[GitHub Action documentation](https://github.com/horn111/bao-toolkit/blob/main/docs/ci-validation.md) · [Issues](https://github.com/horn111/bao-toolkit/issues)

Empty scopes show coverage as unmeasured in the summary. The numeric `coverage`
output remains `100` for compatibility; check `transaction-paths` before using it.
With `fail-on-missing: true`, an empty scope fails, including changed-only scans.
