/**
 * Compatibility bridge during monorepo migration.
 *
 * Canonical core types now live in `@stellar-ramps/core`.
 * Existing app/provider imports from `$lib/anchors/types` continue to work
 * while migration is in progress.
 */

export * from '@stellar-ramps/core';
