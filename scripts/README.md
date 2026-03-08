# Development Scripts

This directory contains standalone TypeScript scripts for development and build tasks. All scripts are invoked via npm scripts using the `ramps:` prefix.

## Available Scripts

### validate-manifest.ts

Validates a provider capability manifest using `@stellar-ramps/core`.

**Usage:**
```bash
pnpm ramps:validate-manifest -- --file <path-to-manifest.json>
```

**Example:**
```bash
pnpm ramps:validate-manifest -- --file providers/etherfuse/src/manifest.ts
```

### validate-catalog.ts

Validates the anchor catalog against its JSON schema using Ajv.

**Usage:**
```bash
pnpm ramps:validate-catalog [-- --schema <path>] [-- --catalog <path>]
```

**Defaults:**
- `--schema`: `catalog/schema.json`
- `--catalog`: `catalog/catalog.json`

**Example:**
```bash
pnpm ramps:validate-catalog
pnpm ramps:validate-catalog -- --schema custom-schema.json --catalog custom-catalog.json
```

### test-conformance.ts

Runs conformance tests via `@stellar-ramps/testing`.

**Usage:**
```bash
# Test a built-in provider
pnpm ramps:test -- --provider <provider-name>

# Test a custom module
pnpm ramps:test -- --module <path-to-module.mjs>
```

**Examples:**
```bash
pnpm ramps:test -- --provider etherfuse
pnpm ramps:test -- --provider alfredpay
pnpm ramps:test -- --module ./custom-provider.mjs
```

### scaffold-provider.ts

Generates a new provider package skeleton.

**Usage:**
```bash
pnpm ramps:scaffold -- provider --name <provider-name> [--display-name <name>] [--dir <directory>]
```

**Options:**
- `--name` (required): Provider name (kebab-case)
- `--display-name` (optional): Display name (defaults to name)
- `--dir` (optional): Base directory (defaults to `providers`)

**Example:**
```bash
pnpm ramps:scaffold -- provider --name demo-provider --display-name "Demo Provider"
```

**Generated files:**
```
providers/demo-provider/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── client.ts
    ├── manifest.ts
    └── types.ts
```

## Shared Utilities

The `/scripts/lib/` directory contains shared utilities:

- **io.ts** - I/O interface for logging and error output
- **args.ts** - Argument parsing helper
- **index.ts** - Re-exports all utilities

## Adding New Scripts

To add a new script:

1. Create a new `.ts` file in `/scripts/`
2. Import shared utilities from `./lib/index.js`
3. Parse `process.argv.slice(2)` for arguments
4. Return exit code via `process.exit(code)`
5. Add npm script to root `package.json`:
   ```json
   {
     "scripts": {
       "ramps:new-script": "tsx scripts/new-script.ts"
     }
   }
   ```
6. Add tests in `/tests/scripts/new-script.test.ts`
7. Update this README with usage instructions

## Development Patterns

### Error Handling

All scripts follow this pattern:

```typescript
import { defaultIO } from './lib/index.js';

async function main(): Promise<number> {
  // Script logic here
  // Return 0 for success, 1 for failure
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    defaultIO.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
```

### Argument Parsing

Use the `argValue` helper for simple flag parsing:

```typescript
import { argValue } from './lib/index.js';

const args = process.argv.slice(2);
const file = argValue(args, '--file');
const provider = argValue(args, '--provider');
```

### I/O

Use the `defaultIO` interface for all output:

```typescript
import { defaultIO } from './lib/index.js';

defaultIO.log('Success message');
defaultIO.error('Error message');
```

## Testing

All scripts have corresponding test files in `/tests/scripts/`:

```bash
pnpm test:scripts
```

Tests use Vitest and follow the same patterns as the original CLI tests.
