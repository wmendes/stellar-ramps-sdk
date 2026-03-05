import { describe, expect, it } from 'vitest';
import { runConformanceSuite } from '@stellar-ramps/testing';
import { EtherfuseClient } from './client';
import { etherfuseManifest } from './manifest';

describe('etherfuse conformance', () => {
  it('passes baseline conformance checks', async () => {
    const result = await runConformanceSuite(() => ({
      adapter: new EtherfuseClient({
        apiKey: 'test-key',
        baseUrl: 'https://api.example.org',
      }),
      manifest: etherfuseManifest,
    }), {
      onRampLifecycle: ['CREATED', 'QUOTED', 'PENDING_PAYMENT', 'PENDING_TOKENS', 'COMPLETED'],
      offRampLifecycle: ['CREATED', 'QUOTED', 'PENDING_TOKENS', 'TOKENS_RECEIVED', 'PENDING_SETTLEMENT', 'COMPLETED'],
    });

    expect(result.passed).toBe(true);
  });
});
