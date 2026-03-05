# CLI Reference

Last verified: **March 5, 2026**.

Implementation source: `packages/cli/src/index.ts`.

## Command Surface

`runCli(argv, io?)` supports the following top-level commands:
- `validate-manifest`
- `validate-catalog`
- `test`
- `scaffold`

## `validate-manifest`

Validate a provider capability manifest using `@stellar-ramps/core` validation rules.

Usage:

```bash
runCli(['validate-manifest', '--file', './manifest.json'])
```

Behavior:
- Requires `--file`.
- Returns exit code `0` when valid.
- Returns exit code `1` and prints field-level issues when invalid.

## `validate-catalog`

Validate catalog data against a JSON schema.

Usage:

```bash
runCli(['validate-catalog', '--schema', 'catalog/schema.json', '--catalog', 'catalog/catalog.json'])
```

Defaults when flags omitted:
- schema: `catalog/schema.json`
- catalog: `catalog/catalog.json`

Behavior:
- Automatically uses Ajv draft-2020 mode when schema declares `2020-12`.
- Returns `0` when valid; `1` with detailed path messages when invalid.

## `test`

Run provider conformance checks using `@stellar-ramps/testing` command runner.

### Built-in provider mode

```bash
runCli(['test', '--provider', 'etherfuse'])
runCli(['test', '--provider', 'alfredpay'])
runCli(['test', '--provider', 'blindpay'])
```

### Dynamic module mode

```bash
runCli(['test', '--module', './my-provider.mjs'])
```

Optional dynamic module flags:
- `--factory <name>` (default: `createConformanceContext`)
- `--adapter-export <name>` (default: `adapter`)
- `--manifest-export <name>` (default: `manifest`)

Examples:

```bash
runCli([
  'test',
  '--module',
  './my-provider.mjs',
  '--adapter-export',
  'adapterImpl',
  '--manifest-export',
  'manifestImpl'
])
```

Behavior:
- Exactly one of `--provider` or `--module` is required.
- On failure, prints structured diagnostics.
- In CI (`CI=true`), emits compact `::error::` summary line.

## `scaffold provider`

Generate a provider package skeleton.

Usage:

```bash
runCli(['scaffold', 'provider', '--name', 'demo-provider'])
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

CLI behavior is covered in `packages/cli/src/index.test.ts`, including:
- manifest validation
- catalog validation
- built-in provider conformance
- dynamic module conformance
- custom export-name handling
- module contract diagnostics
- scaffold generation
