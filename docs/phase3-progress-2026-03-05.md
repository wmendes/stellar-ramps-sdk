# Phase 3 Progress (2026-03-05)

> Historical snapshot from March 5, 2026. This document reflects migration status at that time and is not the current architecture source of truth. See `docs/architecture.md`.

## Completed

- Extracted provider package: `@stellar-ramps/etherfuse` under `providers/etherfuse`.
- Extracted provider package: `@stellar-ramps/alfredpay` under `providers/alfredpay`.
- Extracted provider package: `@stellar-ramps/blindpay` under `providers/blindpay`.
- Added package metadata and TS config for all extracted providers.
- Moved provider implementations into package-local `src/client.ts` and `src/types.ts`.
- Added static capabilities export per provider:
  - `providers/etherfuse/src/manifest.ts` (`etherfuseManifest`)
  - `providers/alfredpay/src/manifest.ts` (`alfredpayManifest`)
  - `providers/blindpay/src/manifest.ts` (`blindpayManifest`)
- Updated extracted clients to use `@stellar-ramps/core` directly.
- Kept app compatibility by turning legacy app paths into re-export bridges:
  - `src/lib/anchors/etherfuse/*`
  - `src/lib/anchors/alfredpay/*`
  - `src/lib/anchors/blindpay/*`

## Verification

- `pnpm check`: pass
- `pnpm test:unit`: pass (636 tests)
- `pnpm --filter @stellar-ramps/etherfuse exec tsc -p tsconfig.json --noEmit`: pass
- `pnpm test:core`: pass (19 tests)
- `pnpm --filter @stellar-ramps/alfredpay exec tsc -p tsconfig.json --noEmit`: pass
- `pnpm --filter @stellar-ramps/blindpay exec tsc -p tsconfig.json --noEmit`: pass

## Next

- Extract SEP modules into `packages/sep` and introduce a package-level `SepAnchor`.
