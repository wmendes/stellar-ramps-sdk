# Scripts Reference

Last verified: **March 7, 2026**.

Implementation source: `/scripts/*.ts`.

## Usage

Run any development script using the `ramps:` npm script prefix:

```bash
pnpm ramps:<command> -- [arguments]
```

Available scripts:
- `ramps:test` - Run conformance tests against providers
- `ramps:validate-manifest` - Validate provider capability manifest
- `ramps:validate-catalog` - Validate catalog schema
- `ramps:scaffold` - Generate provider boilerplate

### Examples

```bash
# Test a built-in provider
pnpm ramps:test -- --provider etherfuse

# Test a custom provider module
pnpm ramps:test -- --module ./providers/etherfuse/src/index.ts

# Validate a manifest
pnpm ramps:validate-manifest -- --file providers/etherfuse/manifest.json

# Validate catalog
pnpm ramps:validate-catalog

# Scaffold a new provider
pnpm ramps:scaffold -- provider --name my-provider --display-name "My Provider"
```

**Note:** The `--` separator is required when passing arguments to npm scripts.

## Script Surface

The following scripts are available in the `/scripts` directory:
- `validate-manifest.ts`
- `validate-catalog.ts`
- `test-conformance.ts`
- `scaffold-provider.ts`

## `validate-manifest`

Validate a provider capability manifest using `@stellar-ramps/core` validation rules.

**Script:** `scripts/validate-manifest.ts`

Usage:

```bash
pnpm ramps:validate-manifest -- --file ./manifest.json
```

Behavior:
- Requires `--file`.
- Returns exit code `0` when valid.
- Returns exit code `1` and prints field-level issues when invalid.

## `validate-catalog`

Validate catalog data against a JSON schema.

**Script:** `scripts/validate-catalog.ts`

Usage:

```bash
pnpm ramps:validate-catalog -- --schema catalog/schema.json --catalog catalog/catalog.json
```

Defaults when flags omitted:
- schema: `catalog/schema.json`
- catalog: `catalog/catalog.json`

Behavior:
- Automatically uses Ajv draft-2020 mode when schema declares `2020-12`.
- Returns `0` when valid; `1` with detailed path messages when invalid.

## `test`

Run provider conformance checks using `@stellar-ramps/testing` command runner.

**Script:** `scripts/test-conformance.ts`

### Built-in provider mode

```bash
pnpm ramps:test -- --provider etherfuse
pnpm ramps:test -- --provider alfredpay
pnpm ramps:test -- --provider blindpay
```

### Dynamic module mode

```bash
pnpm ramps:test -- --module ./my-provider.mjs
```

Optional dynamic module flags:
- `--factory <name>` (default: `createConformanceContext`)
- `--adapter-export <name>` (default: `adapter`)
- `--manifest-export <name>` (default: `manifest`)

Examples:

```bash
pnpm ramps:test -- --module ./my-provider.mjs --adapter-export adapterImpl --manifest-export manifestImpl
```

Behavior:
- Exactly one of `--provider` or `--module` is required.
- On failure, prints structured diagnostics.
- In CI (`CI=true`), emits compact `::error::` summary line.

## `scaffold provider`

Generate a provider package skeleton.

**Script:** `scripts/scaffold-provider.ts`

Usage:

```bash
pnpm ramps:scaffold -- provider --name demo-provider
```

Optional flags:
- `--display-name <name>`
- `--dir <path>` (default: `providers`)

Generated files include:
- `package.json`
- `tsconfig.json`
- `src/index.ts`
- `src/client.ts`
- `src/manifest.ts`
- `src/types.ts`

## Exit Codes

- `0`: success
- `1`: validation/conformance/usage error

## Test Coverage

Script behavior is covered in `/tests/scripts/*.test.ts`, including:
- manifest validation
- catalog validation
- built-in provider conformance
- dynamic module conformance
- custom export-name handling
- module contract diagnostics
- scaffold generation
