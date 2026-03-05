import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { validateProviderManifest, type ProviderCapabilitiesManifest } from '@stellar-ramps/core';
import { runConformanceCommand } from '@stellar-ramps/testing';
import { EtherfuseClient, etherfuseManifest } from '@stellar-ramps/etherfuse';
import { AlfredPayClient, alfredpayManifest } from '@stellar-ramps/alfredpay';
import { BlindPayClient, blindpayManifest } from '@stellar-ramps/blindpay';

export interface CliIO {
  log: (msg: string) => void;
  error: (msg: string) => void;
}

const defaultIo: CliIO = {
  log: (msg) => console.log(msg),
  error: (msg) => console.error(msg),
};

function argValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

async function cmdValidateManifest(args: string[], io: CliIO): Promise<number> {
  const file = argValue(args, '--file');
  if (!file) {
    io.error('Missing required flag: --file <path-to-manifest.json>');
    return 1;
  }

  const raw = await readFile(resolve(file), 'utf8');
  const manifest = JSON.parse(raw) as ProviderCapabilitiesManifest;
  const result = validateProviderManifest(manifest);

  if (!result.valid) {
    io.error('Manifest invalid:');
    for (const issue of result.issues) {
      io.error(`- ${issue.field}: ${issue.message}`);
    }
    return 1;
  }

  io.log(`Manifest valid for provider: ${manifest.name}`);
  return 0;
}

async function cmdValidateCatalog(args: string[], io: CliIO): Promise<number> {
  const schemaPath = resolve(argValue(args, '--schema') ?? 'catalog/schema.json');
  const catalogPath = resolve(argValue(args, '--catalog') ?? 'catalog/catalog.json');

  const [schemaRaw, catalogRaw] = await Promise.all([
    readFile(schemaPath, 'utf8'),
    readFile(catalogPath, 'utf8'),
  ]);
  const schema = JSON.parse(schemaRaw);
  const catalog = JSON.parse(catalogRaw);

  const schemaVersion: string = typeof schema?.$schema === 'string' ? schema.$schema : '';
  const useDraft2020 = schemaVersion.includes('2020-12');
  const ajv = useDraft2020
    ? new Ajv2020({ allErrors: true, strict: false })
    : new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(catalog);

  if (!valid) {
    io.error('Catalog invalid:');
    for (const error of validate.errors ?? []) {
      io.error(`- ${error.instancePath || '/'}: ${error.message ?? 'invalid'}`);
    }
    return 1;
  }

  io.log(`Catalog valid: ${catalogPath}`);
  return 0;
}

async function cmdTest(args: string[], io: CliIO): Promise<number> {
  const { code } = await runConformanceCommand(args, {
    io,
    providerResolver: (provider) => {
      if (provider === 'etherfuse') {
        return {
          adapter: new EtherfuseClient({ apiKey: 'test-key', baseUrl: 'https://api.example.org' }),
          manifest: etherfuseManifest,
        };
      }
      if (provider === 'alfredpay') {
        return {
          adapter: new AlfredPayClient({
            apiKey: 'test-key',
            apiSecret: 'test-secret',
            baseUrl: 'https://api.example.org',
          }),
          manifest: alfredpayManifest,
        };
      }
      if (provider === 'blindpay') {
        return {
          adapter: new BlindPayClient({
            apiKey: 'test-key',
            instanceId: 'inst-1',
            baseUrl: 'https://api.example.org',
          }),
          manifest: blindpayManifest,
        };
      }
      return null;
    },
  });
  return code;
}

function scaffoldTemplate(name: string, displayName: string): Record<string, string> {
  const manifestConst = `${name.replace(/[-_](.)/g, (_, c: string) => c.toUpperCase())}Manifest`;

  return {
    'package.json': JSON.stringify(
      {
        name: `@stellar-ramps/${name}`,
        version: '0.1.0',
        private: true,
        type: 'module',
        exports: { '.': './src/index.ts' },
        dependencies: {
          '@stellar-ramps/core': 'workspace:*',
        },
      },
      null,
      2,
    ),
    'tsconfig.json': JSON.stringify(
      {
        extends: '../../tsconfig.base.json',
        compilerOptions: {
          module: 'ESNext',
          target: 'ES2022',
          rootDir: 'src',
          outDir: 'dist',
        },
        include: ['src/**/*.ts'],
      },
      null,
      2,
    ),
    'src/index.ts': `export { ${displayName.replace(/\s+/g, '')}Client } from './client';\nexport { ${manifestConst} } from './manifest';\n`,
    'src/client.ts': `import type { Anchor, AnchorCapabilities, TokenInfo } from '@stellar-ramps/core';\nimport { ${manifestConst} } from './manifest';\n\nexport class ${displayName.replace(/\s+/g, '')}Client implements Anchor {\n  readonly name = '${name}';\n  readonly displayName = '${displayName}';\n  readonly manifest = ${manifestConst};\n  readonly capabilities: AnchorCapabilities = {};\n  readonly supportedTokens: readonly TokenInfo[] = [];\n  readonly supportedCurrencies: readonly string[] = [];\n  readonly supportedRails: readonly string[] = [];\n\n  async createCustomer(): Promise<any> { throw new Error('Not implemented'); }\n  async getCustomer(): Promise<any> { throw new Error('Not implemented'); }\n  async getQuote(): Promise<any> { throw new Error('Not implemented'); }\n  async createOnRamp(): Promise<any> { throw new Error('Not implemented'); }\n  async getOnRampTransaction(): Promise<any> { throw new Error('Not implemented'); }\n  async registerFiatAccount(): Promise<any> { throw new Error('Not implemented'); }\n  async getFiatAccounts(): Promise<any> { throw new Error('Not implemented'); }\n  async createOffRamp(): Promise<any> { throw new Error('Not implemented'); }\n  async getOffRampTransaction(): Promise<any> { throw new Error('Not implemented'); }\n  async getKycStatus(): Promise<any> { throw new Error('Not implemented'); }\n}\n`,
    'src/manifest.ts': `import type { ProviderCapabilitiesManifest } from '@stellar-ramps/core';\n\nexport const ${manifestConst}: ProviderCapabilitiesManifest = {\n  name: '${name}',\n  displayName: '${displayName}',\n  kycFlow: 'none',\n  corridors: [],\n};\n`,
    'src/types.ts': `// Provider-specific API request/response types go here.\n`,
  };
}

async function cmdScaffold(args: string[], io: CliIO): Promise<number> {
  const kind = args[0];
  if (kind !== 'provider') {
    io.error('Only scaffold target supported currently: provider');
    return 1;
  }

  const name = argValue(args, '--name');
  const displayName = argValue(args, '--display-name') ?? name;
  const baseDir = resolve(argValue(args, '--dir') ?? 'providers');

  if (!name) {
    io.error('Missing required flag: --name <provider-name>');
    return 1;
  }

  const target = join(baseDir, name);
  const files = scaffoldTemplate(name, displayName ?? name);

  await mkdir(join(target, 'src'), { recursive: true });

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(target, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  }

  io.log(`Scaffolded provider at ${target}`);
  return 0;
}

export async function runCli(argv: string[], io: CliIO = defaultIo): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === 'help' || command === '--help') {
    io.log('Usage: stellar-ramps <validate-manifest|validate-catalog|test|scaffold> [args]');
    return 0;
  }

  if (command === 'validate-manifest') return cmdValidateManifest(rest, io);
  if (command === 'validate-catalog') return cmdValidateCatalog(rest, io);
  if (command === 'test') return cmdTest(rest, io);
  if (command === 'scaffold') return cmdScaffold(rest, io);

  io.error(`Unknown command: ${command}`);
  return 1;
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || fileURLToPath(import.meta.url)).href;
if (isMain) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
