import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from './index';

function collectIO() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: {
      log: (msg: string) => out.push(msg),
      error: (msg: string) => err.push(msg),
    },
    out,
    err,
  };
}

describe('cli', () => {
  it('validates a correct manifest file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-cli-'));
    const file = join(dir, 'manifest.json');

    const manifest = {
      name: 'test-provider',
      displayName: 'Test Provider',
      kycFlow: 'none',
      corridors: [
        {
          country: 'MX',
          currency: 'MXN',
          rail: 'spei',
          tokens: [{ symbol: 'USDC', name: 'USD Coin', description: 'Stablecoin' }],
          directions: ['on_ramp'],
        },
      ],
    };

    await writeFile(file, JSON.stringify(manifest, null, 2), 'utf8');

    const { io } = collectIO();
    const code = await runCli(['validate-manifest', '--file', file], io);
    expect(code).toBe(0);
  });

  it('runs baseline conformance for a built-in provider', async () => {
    const { io } = collectIO();
    const code = await runCli(['test', '--provider', 'etherfuse'], io);
    expect(code).toBe(0);
  });

  it('runs conformance from a custom module path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-module-'));
    const file = join(dir, 'custom-provider.mjs');

    await writeFile(
      file,
      `export function createConformanceContext() {\n` +
        `  return {\n` +
        `    adapter: {\n` +
        `      name: 'custom',\n` +
        `      displayName: 'Custom Provider',\n` +
        `      capabilities: {},\n` +
        `      supportedTokens: [],\n` +
        `      supportedCurrencies: ['USD'],\n` +
        `      supportedRails: ['bank_transfer'],\n` +
        `      async createCustomer(){ throw new Error('ni'); },\n` +
        `      async getCustomer(){ return null; },\n` +
        `      async getQuote(){ throw new Error('ni'); },\n` +
        `      async createOnRamp(){ throw new Error('ni'); },\n` +
        `      async getOnRampTransaction(){ return null; },\n` +
        `      async registerFiatAccount(){ throw new Error('ni'); },\n` +
        `      async getFiatAccounts(){ return []; },\n` +
        `      async createOffRamp(){ throw new Error('ni'); },\n` +
        `      async getOffRampTransaction(){ return null; },\n` +
        `      async getKycStatus(){ return 'not_started'; }\n` +
        `    },\n` +
        `    manifest: {\n` +
        `      name: 'custom', displayName: 'Custom Provider', kycFlow: 'none',\n` +
        `      corridors: [{ country: 'US', currency: 'USD', rail: 'bank_transfer', tokens: [{ symbol: 'USDC', name: 'USD Coin', description: 'Stablecoin' }], directions: ['on_ramp'] }]\n` +
        `    }\n` +
        `  };\n` +
        `}\n`,
      'utf8',
    );

    const { io } = collectIO();
    const code = await runCli(['test', '--module', file], io);
    expect(code).toBe(0);
  });

  it('supports custom module export names in test command', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-module-'));
    const file = join(dir, 'custom-provider-exports.mjs');

    await writeFile(
      file,
      `export const adapterImpl = {\n` +
        `  name: 'custom-exports',\n` +
        `  displayName: 'Custom Export Provider',\n` +
        `  capabilities: {},\n` +
        `  supportedTokens: [],\n` +
        `  supportedCurrencies: ['USD'],\n` +
        `  supportedRails: ['bank_transfer'],\n` +
        `  async createCustomer(){ throw new Error('ni'); },\n` +
        `  async getCustomer(){ return null; },\n` +
        `  async getQuote(){ throw new Error('ni'); },\n` +
        `  async createOnRamp(){ throw new Error('ni'); },\n` +
        `  async getOnRampTransaction(){ return null; },\n` +
        `  async registerFiatAccount(){ throw new Error('ni'); },\n` +
        `  async getFiatAccounts(){ return []; },\n` +
        `  async createOffRamp(){ throw new Error('ni'); },\n` +
        `  async getOffRampTransaction(){ return null; },\n` +
        `  async getKycStatus(){ return 'not_started'; }\n` +
        `};\n` +
        `export const manifestImpl = {\n` +
        `  name: 'custom-exports', displayName: 'Custom Export Provider', kycFlow: 'none',\n` +
        `  corridors: [{ country: 'US', currency: 'USD', rail: 'bank_transfer', tokens: [{ symbol: 'USDC', name: 'USD Coin', description: 'Stablecoin' }], directions: ['on_ramp'] }]\n` +
        `};\n`,
      'utf8',
    );

    const { io } = collectIO();
    const code = await runCli(
      [
        'test',
        '--module',
        file,
        '--adapter-export',
        'adapterImpl',
        '--manifest-export',
        'manifestImpl',
      ],
      io,
    );
    expect(code).toBe(0);
  });

  it('reports module contract diagnostics for missing exports', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-module-'));
    const file = join(dir, 'broken-provider.mjs');
    await writeFile(file, 'export const nope = 1;\n', 'utf8');

    const { io, err } = collectIO();
    const code = await runCli(['test', '--module', file], io);

    expect(code).toBe(1);
    expect(err.some((line) => line.includes('Invalid conformance module'))).toBe(true);
  });

  it('validates catalog against schema', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-catalog-'));
    const schemaPath = join(dir, 'schema.json');
    const catalogPath = join(dir, 'catalog.json');

    await writeFile(
      schemaPath,
      JSON.stringify(
        {
          type: 'object',
          required: ['version'],
          properties: {
            version: { type: 'string' },
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    await writeFile(catalogPath, JSON.stringify({ version: '0.1.0' }, null, 2), 'utf8');

    const { io } = collectIO();
    const code = await runCli(
      ['validate-catalog', '--schema', schemaPath, '--catalog', catalogPath],
      io,
    );
    expect(code).toBe(0);
  });

  it('validates repository catalog against repository schema', async () => {
    const { io } = collectIO();
    const code = await runCli(
      ['validate-catalog', '--schema', 'catalog/schema.json', '--catalog', 'catalog/catalog.json'],
      io,
    );
    expect(code).toBe(0);
  });

  it('scaffolds a provider package skeleton', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-scaffold-'));
    const { io } = collectIO();

    const code = await runCli(
      ['scaffold', 'provider', '--name', 'demo-provider', '--display-name', 'Demo Provider', '--dir', dir],
      io,
    );

    expect(code).toBe(0);

    const manifestPath = join(dir, 'demo-provider', 'src', 'manifest.ts');
    const manifestContent = await readFile(manifestPath, 'utf8');
    expect(manifestContent).toContain("name: 'demo-provider'");
  });
});
