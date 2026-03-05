import { describe, expect, it } from 'vitest';
import type { Anchor, ProviderCapabilitiesManifest } from '@stellar-ramps/core';
import { runConformanceSuite } from './conformance';

function createMockAdapter(): Anchor {
  return {
    name: 'mock',
    displayName: 'Mock Provider',
    capabilities: {},
    supportedTokens: [],
    supportedCurrencies: ['USD'],
    supportedRails: ['bank_transfer'],
    async createCustomer() {
      throw new Error('not implemented');
    },
    async getCustomer() {
      return null;
    },
    async getQuote() {
      throw new Error('not implemented');
    },
    async createOnRamp() {
      throw new Error('not implemented');
    },
    async getOnRampTransaction() {
      return null;
    },
    async registerFiatAccount() {
      throw new Error('not implemented');
    },
    async getFiatAccounts() {
      return [];
    },
    async createOffRamp() {
      throw new Error('not implemented');
    },
    async getOffRampTransaction() {
      return null;
    },
    async getKycStatus() {
      return 'not_started';
    },
  };
}

const validManifest: ProviderCapabilitiesManifest = {
  name: 'mock',
  displayName: 'Mock Provider',
  kycFlow: 'none',
  corridors: [
    {
      country: 'US',
      currency: 'USD',
      rail: 'bank_transfer',
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          description: 'Stablecoin',
        },
      ],
      directions: ['on_ramp', 'off_ramp'],
    },
  ],
};

describe('runConformanceSuite', () => {
  it('passes for valid adapter + manifest shape', async () => {
    const result = await runConformanceSuite(() => ({
      adapter: createMockAdapter(),
      manifest: validManifest,
    }));

    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('fails for invalid manifest', async () => {
    const result = await runConformanceSuite(() => ({
      adapter: createMockAdapter(),
      manifest: {
        ...validManifest,
        corridors: [{ ...validManifest.corridors[0], country: 'USA' }],
      },
    }));

    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.code === 'MANIFEST_INVALID')).toBe(true);
  });

  it('fails for invalid lifecycle transitions', async () => {
    const result = await runConformanceSuite(
      () => ({
        adapter: createMockAdapter(),
        manifest: validManifest,
      }),
      {
        onRampLifecycle: ['CREATED', 'COMPLETED'],
      },
    );

    expect(result.passed).toBe(false);
    expect(result.issues.some((i) => i.code === 'INVALID_ONRAMP_TRANSITION')).toBe(true);
  });
});
