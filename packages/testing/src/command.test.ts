import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runConformanceCommand } from './command';

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

describe('runConformanceCommand', () => {
  it('fails with a clear module diagnostic when exports are missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-testing-'));
    const file = join(dir, 'bad-provider.mjs');
    await writeFile(file, 'export const nope = 1;\n', 'utf8');

    const { io, err } = collectIO();
    const result = await runConformanceCommand(['--module', file], { io });

    expect(result.code).toBe(1);
    expect(err.some((line) => line.includes('Invalid conformance module'))).toBe(true);
  });

  it('supports custom export names for module mode', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-testing-'));
    const file = join(dir, 'custom-provider.mjs');
    await writeFile(
      file,
      `export const myAdapter = {\n` +
        `  name: 'custom',\n` +
        `  displayName: 'Custom Provider',\n` +
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
        `export const myManifest = {\n` +
        `  name: 'custom', displayName: 'Custom Provider', kycFlow: 'none',\n` +
        `  corridors: [{ country: 'US', currency: 'USD', rail: 'bank_transfer', tokens: [{ symbol: 'USDC', name: 'USD Coin', description: 'Stablecoin' }], directions: ['on_ramp'] }]\n` +
        `};\n`,
      'utf8',
    );

    const { io, out } = collectIO();
    const result = await runConformanceCommand(
      ['--module', file, '--adapter-export', 'myAdapter', '--manifest-export', 'myManifest'],
      { io },
    );

    expect(result.code).toBe(0);
    expect(out.some((line) => line.includes('Conformance passed'))).toBe(true);
  });
});
