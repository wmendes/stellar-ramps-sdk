import { describe, expect, it } from 'vitest';
import { runConformanceSuite } from '@stellar-ramps/testing';
import { AlfredPayClient } from './client';
import { alfredpayManifest } from './manifest';

describe('alfredpay conformance', () => {
  it('passes baseline conformance checks', async () => {
    const result = await runConformanceSuite(() => ({
      adapter: new AlfredPayClient({
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        baseUrl: 'https://api.example.org',
      }),
      manifest: alfredpayManifest,
    }), {
      onRampLifecycle: ['CREATED', 'QUOTED', 'PENDING_PAYMENT', 'PENDING_TOKENS', 'COMPLETED'],
      offRampLifecycle: ['CREATED', 'QUOTED', 'PENDING_TOKENS', 'TOKENS_RECEIVED', 'PENDING_SETTLEMENT', 'COMPLETED'],
    });

    expect(result.passed).toBe(true);
  });
});
