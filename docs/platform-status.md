# Platform Status

Last verified: **March 5, 2026**.

## Migration Phase Status

| Phase | Status | Summary | Evidence |
| --- | --- | --- | --- |
| 0 | Complete | Backup tag/tar and baseline report established | `docs/baseline-report-2026-03-05.md` |
| 1 | Complete | Workspace layout and monorepo scaffolding in place | `pnpm-workspace.yaml`, `docs/refactor-plan.md` |
| 2 | Complete | `@stellar-ramps/core` extracted and consumed | `packages/core/*`, `docs/phase2-progress-2026-03-05.md` |
| 3 | Complete | Provider packages extracted (`etherfuse`, `alfredpay`, `blindpay`) | `providers/*`, `docs/phase3-progress-2026-03-05.md` |
| 4 | Complete (scope-defined) | `@stellar-ramps/sep` extracted with operational `SepAnchor` | `packages/sep/*`, `docs/phase4-progress-2026-03-05.md` |
| 5 | In progress | Conformance framework and shared command entrypoint implemented; deeper probes pending | `packages/testing/*`, `docs/phase5-progress-2026-03-05.md` |
| 6 | In progress | Catalog artifacts present and covered by CI gate; policy documentation depth pending | `catalog/*`, `.github/workflows/ci.yml`, `docs/phase6-progress-2026-03-05.md` |
| 7 | In progress | CLI command surface implemented and tested; distribution packaging pending | `packages/cli/*`, `docs/phase7-progress-2026-03-05.md` |

## Verification Snapshot (March 5, 2026)

Commands executed:

```bash
pnpm test:packages
pnpm test:unit
pnpm check
```

Observed outputs:
- `pnpm test:packages`: 9 files, 49 tests passed
- `pnpm test:unit`: 14 files, 636 tests passed
- `pnpm check`: 0 errors, 0 warnings

## CI Baseline

Defined in `.github/workflows/ci.yml`:
- checkout + Node/pnpm setup
- `pnpm install --frozen-lockfile`
- catalog/schema validation coverage via CLI package tests
- `pnpm test:packages`
- `pnpm check`

## Known Production Gaps

- Generic SEP fiat account registration/listing is intentionally unsupported at adapter level and returns `UNSUPPORTED_OPERATION` with 501.
- CLI command surface exists but distributable executable packaging is not finalized.
- Conformance suite baseline exists; provider-specific deep behavior probes are still expanding.
