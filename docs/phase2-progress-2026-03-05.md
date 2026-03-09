# Phase 2 Progress (2026-03-05)

> Historical snapshot from March 5, 2026. This document reflects migration status at that time and is not the current architecture source of truth. See `docs/architecture.md`.

## Completed

- Introduced `@stellar-ramps/core` scaffold under `packages/core`.
- Split core concerns into dedicated modules:
  - `anchor.ts`
  - `types.ts`
  - `rails.ts`
  - `capabilities.ts`
  - `errors.ts`
  - `status.ts`
- Added whitepaper-aligned state model types (`OnRampState`, `OffRampState`, `KycVerificationStatus`) plus mappers from current legacy statuses.
- Added capability manifest schema (`ProviderCapabilitiesManifest`, corridor model).
- Kept backward compatibility by bridging `src/lib/anchors/types.ts` to core exports.
- Migrated runtime and test imports from `$lib/anchors/types` to `@stellar-ramps/core`.
- Added package-level core tests:
  - `packages/core/src/status.test.ts`
  - `vitest.core.config.ts`
  - `pnpm test:core`

## Verification

- `pnpm check`: pass
- `pnpm test:unit`: pass (636 tests)
- `pnpm test:core`: pass (19 tests)

## Outstanding For Full Phase 2 Completion

- Introduce explicit status normalization in provider adapters (beyond type-level mapping helpers).
