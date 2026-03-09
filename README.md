# Stellar Ramps SDK Platform

TypeScript platform for building Stellar fiat on-ramp and off-ramp integrations with provider adapters, SEP interoperability, conformance testing, and catalog metadata.

Status verified on **March 5, 2026**.

## Production Readiness Snapshot

| Capability | Status | Evidence |
| --- | --- | --- |
| Core SDK contract (`Anchor`, shared types, status/capability helpers) | Implemented | `packages/core/src/index.ts`, `packages/core/src/types.ts` |
| Provider packages (`etherfuse`, `alfredpay`, `blindpay`, `transfero`) | Implemented | `providers/*/src/index.ts` |
| SEP adapter package (`@stellar-ramps/sep`) | Implemented with known limits | `packages/sep/src/index.ts`, `packages/sep/src/adapter.ts` |
| Conformance framework (`@stellar-ramps/testing`) | Implemented | `packages/testing/src/conformance.ts`, `packages/testing/src/command.ts` |
| Development scripts (`validate-manifest`, `validate-catalog`, `test`, `scaffold`) | Implemented | `scripts/*.ts` |
| Catalog schema + catalog artifact | Implemented | `catalog/schema.json`, `catalog/catalog.json` |
| CI baseline checks (`catalog`, package tests, app checks) | Implemented | `.github/workflows/ci.yml` |

Detailed evidence map: `docs/assertions.md`.
Architecture source of truth: `docs/architecture.md`.
Scripts deep reference: `docs/cli-reference.md`.

## What This Repository Contains

```text
stellar-ramps-sdk/
  packages/
    core/                # @stellar-ramps/core
    sep/                 # @stellar-ramps/sep
    testing/             # @stellar-ramps/testing
  providers/
    etherfuse/           # @stellar-ramps/etherfuse
    alfredpay/           # @stellar-ramps/alfredpay
    blindpay/            # @stellar-ramps/blindpay
    transfero/           # @stellar-ramps/transfero
  scripts/               # Development scripts (validate, test, scaffold)
  catalog/
    schema.json
    catalog.json
  src/                   # SvelteKit app and compatibility bridge layer
  docs/
    platform-status.md
    assertions.md
    cli-reference.md
```

## Package Surface

| Package | Role | Public Entry |
| --- | --- | --- |
| `@stellar-ramps/core` | Common interface, domain types, status helpers, capability validation, typed errors | `packages/core/src/index.ts` |
| `@stellar-ramps/sep` | SEP-1/6/10/12/24/31/38 modules + `SepAnchor` adapter | `packages/sep/src/index.ts` |
| `@stellar-ramps/testing` | Provider conformance suite and reusable conformance command runner | `packages/testing/src/index.ts` |
| `@stellar-ramps/etherfuse` | Etherfuse adapter + manifest | `providers/etherfuse/src/index.ts` |
| `@stellar-ramps/alfredpay` | AlfredPay adapter + manifest | `providers/alfredpay/src/index.ts` |
| `@stellar-ramps/blindpay` | BlindPay adapter + manifest | `providers/blindpay/src/index.ts` |
| `@stellar-ramps/transfero` | Transfero adapter + manifest | `providers/transfero/src/index.ts` |

## Verified Quality Gates

Latest local verification run date: **March 5, 2026**.

```bash
pnpm test:packages
pnpm test:unit
pnpm check
```

Observed results on March 5, 2026:
- `pnpm test:packages`: 9 files, 49 tests, all passing
- `pnpm test:unit`: 14 files, 636 tests, all passing
- `pnpm check`: 0 errors, 0 warnings

CI executes core validation gates in `.github/workflows/ci.yml`:
- install with frozen lockfile
- catalog/schema validation coverage
- package test suite
- Svelte app type/check gate

## Quickstart

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Recommended validation before changes:

```bash
pnpm test:packages
pnpm test:unit
pnpm check
```

## Integration Example (Package Imports)

```ts
import type { Anchor, Quote } from '@stellar-ramps/core';
import { SepAnchor } from '@stellar-ramps/sep';
import { EtherfuseClient } from '@stellar-ramps/etherfuse';
```

## Development Scripts

Run development scripts using the `ramps:` npm script prefix:

```bash
pnpm ramps:<command> -- [args]
```

Available scripts:
- `ramps:test` - Run conformance tests against providers
- `ramps:validate-manifest` - Validate provider capability manifest
- `ramps:validate-catalog` - Validate catalog against schema
- `ramps:scaffold` - Generate provider boilerplate

Examples:

```bash
pnpm ramps:test -- --provider etherfuse
pnpm ramps:validate-manifest -- --file manifest.json
pnpm ramps:scaffold -- provider --name my-provider
```

Full script reference: `docs/cli-reference.md`.

## Catalog

Catalog artifacts:
- `catalog/schema.json`
- `catalog/catalog.json`

Catalog usage and lifecycle guidance: `catalog/README.md`.

## Current Limitations (Explicit)

- `SepAnchor` does not implement a universal fiat account flow and returns `UNSUPPORTED_OPERATION` (HTTP 501) for:
  - `registerFiatAccount`
  - `getFiatAccounts`
- Migration phases 5-7 remain open for deeper conformance coverage and additional documentation hardening.

## Environment Variables

```env
# AlfredPay
ALFREDPAY_API_KEY=""
ALFREDPAY_API_SECRET=""
ALFREDPAY_BASE_URL="https://penny-api-restricted-dev.alfredpay.io/api/v1/third-party-service/penny"

# Etherfuse
ETHERFUSE_API_KEY=""
ETHERFUSE_BASE_URL="https://api.sand.etherfuse.com"

# BlindPay
BLINDPAY_API_KEY=""
BLINDPAY_INSTANCE_ID=""
BLINDPAY_BASE_URL="https://api.blindpay.com"

# Transfero
TRANSFERO_CLIENT_ID=""
TRANSFERO_CLIENT_SECRET=""
TRANSFERO_SCOPE=""
TRANSFERO_API_URL="https://sandbox-api-baasic.transfero.com"
TRANSFERO_API_VERSION=""
TRANSFERO_DEFAULT_TAX_ID=""
TRANSFERO_DEFAULT_TAX_ID_COUNTRY="BRA"
TRANSFERO_DEFAULT_NAME=""
TRANSFERO_DEFAULT_EMAIL=""

# Webhooks
ALFREDPAY_WEBHOOK_SECRET=""

# Stellar
PUBLIC_STELLAR_NETWORK="testnet"
PUBLIC_USDC_ISSUER="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
SEP1_SIGNING_KEY_SECRET=""
```

## Additional Documentation

- `docs/architecture.md` (canonical architecture and integration direction)
- `docs/assertions.md`
- `docs/cli-reference.md`
- `docs/platform-status.md` (historical migration snapshot)
- `docs/refactor-plan.md` (historical planning record)
- `docs/phase2-progress-2026-03-05.md` (historical migration log)
- `docs/phase3-progress-2026-03-05.md` (historical migration log)
- `docs/phase4-progress-2026-03-05.md` (historical migration log)
- `docs/phase5-progress-2026-03-05.md` (historical migration log)
- `docs/phase6-progress-2026-03-05.md` (historical migration log)
- `docs/phase7-progress-2026-03-05.md` (historical migration log)
- `Stellar Ramp Whitepaper.md`

## License

Apache-2.0
