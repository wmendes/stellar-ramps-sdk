# Platform Status

> Historical snapshot from March 5, 2026. This document reflects migration status at that time and is not the current architecture source of truth. See `docs/architecture.md`.

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
| 7 | Complete | Development scripts implemented and tested (migrated from CLI package) | `scripts/*`, `tests/scripts/*`, `docs/phase7-progress-2026-03-05.md` |

## Verification Snapshot (March 5, 2026)

Commands executed:

```bash
pnpm test:packages
pnpm test:unit
pnpm check
```

Observed outputs:
- `pnpm test:packages`: 8 files, 41 tests passed
- `pnpm test:scripts`: 4 files, 14 tests passed
- `pnpm test:unit`: 14 files, 636 tests passed
- `pnpm check`: 0 errors, 0 warnings

## CI Baseline

Defined in `.github/workflows/ci.yml`:
- checkout + Node/pnpm setup
- `pnpm install --frozen-lockfile`
- catalog/schema validation via `pnpm ramps:validate-catalog`
- `pnpm test:packages`
- `pnpm test:scripts`
- `pnpm check`

## Known Production Gaps

- Generic SEP fiat account registration/listing is intentionally unsupported at adapter level and returns `UNSUPPORTED_OPERATION` with 501.
- Conformance suite baseline exists; provider-specific deep behavior probes are still expanding.
