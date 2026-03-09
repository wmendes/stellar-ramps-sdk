# Architecture Overview

This repository follows a package-first architecture.

## Source of Truth

- `packages/core`: shared SDK contract, domain types, status/capability helpers.
- `packages/sep`: SEP modules and `SepAnchor` adapter.
- `packages/testing`: conformance suite and reusable command runner.
- `providers/*`: provider-specific client implementations and capability manifests.

## Application and Compatibility Layers

- `src/*`: SvelteKit app used as a demo/reference implementation.
- `src/lib/server/*`: app-specific wiring (environment-driven factory, route handlers).
- `src/lib/anchors/*`: compatibility bridge and re-export layer used by app flows and copy/paste integration paths.

## Integration Direction

Prefer package imports for new integrations:

```ts
import type { Anchor } from '@stellar-ramps/core';
import { SepAnchor } from '@stellar-ramps/sep';
import { TransferoClient } from '@stellar-ramps/transfero';
```

Use `src/lib/anchors/*` only when consuming the embedded SvelteKit app layer or legacy copy workflows.

## Documentation Policy

- Active architecture and integration guidance should align with this document.
- Migration-phase artifacts in `docs/phase*-progress-2026-03-05.md`, `docs/platform-status.md`, and `docs/refactor-plan.md` are historical snapshots.
