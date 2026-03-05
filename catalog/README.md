# Provider Catalog

This folder contains the machine-readable provider catalog aligned with the Stellar Ramps SDK whitepaper.

Files:
- `catalog.json`: current catalog entries for extracted provider packages
- `schema.json`: JSON Schema for catalog validation

Current providers:
- `@stellar-ramps/etherfuse`
- `@stellar-ramps/alfredpay`
- `@stellar-ramps/blindpay`

Status values:
- `active`
- `sandbox_only`
- `deprecated`
- `community_preview`

The catalog should be updated whenever provider manifests, onboarding details, status, or maintained versions change.

Related docs:
- `docs/assertions.md` (claim/evidence mapping)
- `docs/platform-status.md` (dated implementation status)
- `docs/cli-reference.md` (validation command usage)
