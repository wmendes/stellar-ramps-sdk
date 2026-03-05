# Baseline Report (2026-03-05)

## Backup Artifacts

- Git tag: `pre-monorepo-refactor-2026-03-05`
- Tarball snapshot: `backups/stellar-ramps-sdk-pre-monorepo-refactor-2026-03-05.tar.gz`

## Commands Run

1. `pnpm install`
- Result: success

2. `pnpm test:run`
- Result: failed
- Summary:
  - Passed: 636
  - Failed: 10
  - Skipped: 8
  - Failed suite: `tests/anchors/sep/sep.integration.test.ts`
  - Root cause: external DNS/network access to `testanchor.stellar.org` (`ENOTFOUND`)

3. `pnpm check` (without `.env`)
- Result: failed
- Root cause: `$env/static/private` and `$env/static/public` exports missing

4. `pnpm check` (with `.env` from `.env.example`)
- Result: success (0 errors, 0 warnings)

5. `pnpm build` (with `.env` from `.env.example`)
- Result: failed
- Root cause: invalid/empty `SEP1_SIGNING_KEY_SECRET` value consumed at module initialization (`Keypair.fromSecret`)

## Notes

- Baseline failures are pre-existing and environment-dependent.
- Refactor should preserve this baseline until explicit behavior fixes are planned.
