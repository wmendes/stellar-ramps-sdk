import { describe, expect, it } from 'vitest';
import { runConformanceSuite } from '@stellar-ramps/testing';
import { BlindPayClient } from './client';
import { blindpayManifest } from './manifest';

describe('blindpay conformance', () => {
  it('passes baseline conformance checks', async () => {
    const result = await runConformanceSuite(() => ({
      adapter: new BlindPayClient({
        apiKey: 'test-key',
        instanceId: 'inst-1',
        baseUrl: 'https://api.example.org',
      }),
      manifest: blindpayManifest,
    }), {
      onRampLifecycle: ['CREATED', 'QUOTED', 'PENDING_PAYMENT', 'PENDING_TOKENS', 'COMPLETED'],
      offRampLifecycle: ['CREATED', 'QUOTED', 'PENDING_TOKENS', 'TOKENS_RECEIVED', 'PENDING_SETTLEMENT', 'COMPLETED'],
    });

    expect(result.passed).toBe(true);
  });
});
