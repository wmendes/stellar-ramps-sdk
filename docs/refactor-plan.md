# Refactor Plan (Whitepaper-Aligned)

Source of truth: `Stellar Ramp Whitepaper.md` (Version 1.0, February 2026).

## Decision: Refactor, Not Rewrite

A full rewrite is not justified right now.

- Reusable assets already exist:
  - Provider adapters: `etherfuse`, `alfredpay`, `blindpay`
  - SEP protocol modules: SEP-1/6/10/12/24/31/38
  - Existing test coverage for providers/config/SEP
- Main gap is packaging and boundaries, not domain behavior.
- Estimated salvageable code: ~65-75%.

Rewrite trigger (fallback): if package extraction reveals incompatible assumptions across >50% of provider methods or status model cannot be reconciled without breaking all consumers.

## Current vs Target

Current state:
- Single SvelteKit app with portable libs under `src/lib/anchors`.
- Runtime config and UI concerns are mixed with SDK concerns.
- No publishable package boundaries.

Target state (whitepaper):
- Monorepo with independent npm packages:
  - `packages/core`
  - `packages/sep`
  - `packages/testing`
  - `packages/cli`
  - `providers/*`
  - optional app/examples consuming packages
- Capability manifest as first-class static export per provider.
- Conformance suite validates interface + state transitions.

## Proposed Repository Shape

```text
stellar-ramps-sdk/
  apps/
    demo-sveltekit/
  packages/
    core/
    sep/
    testing/
    cli/
  providers/
    blindpay/
    etherfuse/
    alfredpay/
  catalog/
    catalog.json
  docs/
    architecture.md
    interface.md
    refactor-plan.md
```

## Phased Migration Plan

## Phase 0: Baseline Safety (0.5 day)

- Create recovery point before structural moves:
  - git tag: `pre-monorepo-refactor-2026-03-05`
  - optional tarball snapshot in `backups/`
- Freeze behavior with a baseline test run report.

Deliverable:
- Reproducible rollback point and baseline report.

## Phase 1: Workspace Scaffolding (1 day)

- Convert root into PNPM workspace (`pnpm-workspace.yaml`) with `apps/*`, `packages/*`, `providers/*`.
- Add shared TS/base lint config at root.
- Keep existing app running during transition (strangler approach).

Deliverable:
- Build passes with new workspace layout, no behavior change.

## Phase 2: Extract `@stellar-ramps/core` (1-2 days)

- Move `src/lib/anchors/types.ts` into `packages/core/src` and split:
  - `anchor.ts` (interface)
  - `types.ts` (Customer/Quote/Transactions)
  - `rails.ts` (payment instruction union)
  - `capabilities.ts` (manifest schema)
  - `errors.ts` (typed errors)
- Normalize status enums to whitepaper state machine names.
- Add migration shims for current status strings where needed.

Deliverable:
- `@stellar-ramps/core` build + tests + exported API docs.

## Phase 3: Extract Provider Packages (2-4 days)

- Move each provider into `providers/<name>`.
- Each provider exports:
  - `<Provider>Client` implementing `Anchor`
  - `capabilities` manifest (static)
- Replace app-local imports with package imports.

Deliverable:
- 3 provider packages compile independently and pass package tests.

## Phase 4: Extract `@stellar-ramps/sep` (1-2 days)

- Move SEP modules into `packages/sep`.
- Implement `SepAnchor` adapter that satisfies `Anchor` contract.

Deliverable:
- Generic SEP adapter usable against SEP-compliant anchors.

## Phase 5: Build `@stellar-ramps/testing` Conformance Suite (2-3 days)

- Convert existing provider tests into contract tests.
- Add validators for:
  - interface completeness
  - capability manifest schema
  - state machine transitions (on/off-ramp)
  - idempotency expectations

Deliverable:
- Any provider package can run a shared conformance command.

## Phase 6: Provider Catalog + Docs (1 day)

- Add `catalog/catalog.json` and schema.
- Populate with existing providers and onboarding metadata.
- Update docs to package-based integration flow.

Deliverable:
- Catalog + docs match whitepaper sections 8/11/12.

## Phase 7: CLI Skeleton (1-2 days)

- Add `packages/cli` minimal commands:
  - scaffold provider
  - validate capabilities
  - run conformance tests

Deliverable:
- End-to-end flow for adding a new provider package.

## Cost and Risk Assessment

Estimated total: 9-15 engineering days.

Top risks:
- Status model mismatch (`pending/processing/...` vs whitepaper state machine).
- Hidden coupling to SvelteKit (`$lib`, `$env`) in current provider wiring.
- Provider-specific fields currently encoded in shared generic types.

Mitigations:
- Preserve compatibility layer in `apps/demo-sveltekit` during migration.
- Introduce explicit adapters/mappers for status normalization.
- Refactor incrementally with package-level tests at each phase.

## Refactor Acceptance Criteria

- All provider packages implement a single `Anchor` contract from `@stellar-ramps/core`.
- Capability manifest exported statically per provider.
- Conformance suite passes for all providers.
- Demo app consumes packages only (no direct `src/lib/anchors` internals).
- Documentation and catalog reflect real package boundaries.

## If Refactor Fails (Fallback Rewrite Path)

If rewrite trigger is hit:
1. Snapshot current repo as historical reference.
2. Keep old app in `apps/legacy-demo` (read-only).
3. Bootstrap new monorepo from empty `packages/*` and port provider logic selectively.

This fallback should be decided no later than end of Phase 2.
