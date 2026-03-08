import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

describe('test-conformance script', () => {
  it('runs baseline conformance for a built-in provider', async () => {
    const { stdout } = await execAsync('tsx scripts/test-conformance.ts --provider etherfuse');
    expect(stdout).toBeTruthy();
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

    const { stdout } = await execAsync(`tsx scripts/test-conformance.ts --module ${file}`);
    expect(stdout).toBeTruthy();
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

    const { stdout } = await execAsync(
      `tsx scripts/test-conformance.ts --module ${file} --adapter-export adapterImpl --manifest-export manifestImpl`,
    );
    expect(stdout).toBeTruthy();
  });

  it('reports module contract diagnostics for missing exports', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-module-'));
    const file = join(dir, 'broken-provider.mjs');
    await writeFile(file, 'export const nope = 1;\n', 'utf8');

    await expect(execAsync(`tsx scripts/test-conformance.ts --module ${file}`)).rejects.toThrow();
  });
});
