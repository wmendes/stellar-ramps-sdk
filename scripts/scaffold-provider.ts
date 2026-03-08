import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { defaultIO, argValue } from './lib/index.js';

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
    'src/index.ts': `export { ${displayName.replace(/\s+/g, '')}Client } from './client.js';\nexport { ${manifestConst} } from './manifest.js';\n`,
    'src/client.ts': `import type { Anchor, AnchorCapabilities, TokenInfo } from '@stellar-ramps/core';\nimport { ${manifestConst} } from './manifest.js';\n\nexport class ${displayName.replace(/\s+/g, '')}Client implements Anchor {\n  readonly name = '${name}';\n  readonly displayName = '${displayName}';\n  readonly manifest = ${manifestConst};\n  readonly capabilities: AnchorCapabilities = {};\n  readonly supportedTokens: readonly TokenInfo[] = [];\n  readonly supportedCurrencies: readonly string[] = [];\n  readonly supportedRails: readonly string[] = [];\n\n  async createCustomer(): Promise<any> { throw new Error('Not implemented'); }\n  async getCustomer(): Promise<any> { throw new Error('Not implemented'); }\n  async getQuote(): Promise<any> { throw new Error('Not implemented'); }\n  async createOnRamp(): Promise<any> { throw new Error('Not implemented'); }\n  async getOnRampTransaction(): Promise<any> { throw new Error('Not implemented'); }\n  async registerFiatAccount(): Promise<any> { throw new Error('Not implemented'); }\n  async getFiatAccounts(): Promise<any> { throw new Error('Not implemented'); }\n  async createOffRamp(): Promise<any> { throw new Error('Not implemented'); }\n  async getOffRampTransaction(): Promise<any> { throw new Error('Not implemented'); }\n  async getKycStatus(): Promise<any> { throw new Error('Not implemented'); }\n}\n`,
    'src/manifest.ts': `import type { ProviderCapabilitiesManifest } from '@stellar-ramps/core';\n\nexport const ${manifestConst}: ProviderCapabilitiesManifest = {\n  name: '${name}',\n  displayName: '${displayName}',\n  kycFlow: 'none',\n  corridors: [],\n};\n`,
    'src/types.ts': `// Provider-specific API request/response types go here.\n`,
  };
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  // Check if 'provider' is in the args
  if (!args.includes('provider')) {
    defaultIO.error('Only scaffold target supported currently: provider');
    return 1;
  }

  const name = argValue(args, '--name');
  const displayName = argValue(args, '--display-name') ?? name;
  const baseDir = resolve(argValue(args, '--dir') ?? 'providers');

  if (!name) {
    defaultIO.error('Missing required flag: --name <provider-name>');
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

  defaultIO.log(`Scaffolded provider at ${target}`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    defaultIO.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
