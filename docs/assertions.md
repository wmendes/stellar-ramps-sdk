# Assertions and Evidence Map

Last verified: **March 5, 2026**.

This document maps platform assertions to concrete repository evidence and verification commands.

## Assertion Matrix

| Assertion | Evidence | Verification |
| --- | --- | --- |
| Core package exports shared SDK contract/types | `packages/core/src/index.ts`, `packages/core/src/types.ts`, `packages/core/src/status.ts` | `pnpm test:packages` |
| SEP package exports SEP modules and `SepAnchor` | `packages/sep/src/index.ts` | `pnpm test:packages` |
| SEP adapter intentionally rejects generic fiat-account operations with typed 501 errors | `packages/sep/src/adapter.ts` (`registerFiatAccount`, `getFiatAccounts`) | `pnpm test:packages` (`packages/sep/src/adapter.test.ts`) |
| Provider packages are independently exposed with client + manifest exports | `providers/etherfuse/src/index.ts`, `providers/alfredpay/src/index.ts`, `providers/blindpay/src/index.ts` | `pnpm test:packages` (provider conformance tests) |
| Conformance framework exists and is reusable from testing package | `packages/testing/src/conformance.ts`, `packages/testing/src/command.ts`, `packages/testing/src/index.ts` | `pnpm test:packages` (`packages/testing/src/*.test.ts`) |
| CLI supports manifest/catalog validation, conformance execution, and provider scaffolding | `packages/cli/src/index.ts` | `pnpm test:packages` (`packages/cli/src/index.test.ts`) |
| Catalog schema and catalog artifact exist and are validated in tests/CI | `catalog/schema.json`, `catalog/catalog.json`, `.github/workflows/ci.yml` | `pnpm test:packages` and CI workflow |
| Workspace is configured for root, apps, packages, providers | `pnpm-workspace.yaml` | `pnpm install`, workspace package tests |
| App-level type checks are enforced | root `package.json` (`check` script), `.github/workflows/ci.yml` | `pnpm check` |

## Verification Commands and Results

Run date: **March 5, 2026**.

```bash
pnpm test:packages
pnpm test:unit
pnpm check
```

Observed outcomes:
- `pnpm test:packages`: 9 files, 49 tests passed
- `pnpm test:unit`: 14 files, 636 tests passed
- `pnpm check`: 0 errors, 0 warnings

## Claim Policy

- All "implemented" claims in `README.md` must point to specific files.
- All operational claims must be backed by a runnable command.
- Any incomplete functionality must be marked under explicit limitations.
