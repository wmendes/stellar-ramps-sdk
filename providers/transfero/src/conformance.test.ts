import { describe, expect, it } from 'vitest';
import { runConformanceSuite } from '@stellar-ramps/testing';
import { TransferoClient } from './client';
import { transferoManifest } from './manifest';

describe('transfero conformance', () => {
  it('passes baseline conformance checks', async () => {
    const result = await runConformanceSuite(() => ({
      adapter: new TransferoClient({
        clientId: 'test-client',
        clientSecret: 'test-secret',
        scope: 'api',
        baseUrl: 'https://api.example.org',
        defaultTaxId: '00000000000',
        defaultTaxIdCountry: 'BRA',
        defaultName: 'Test User',
        defaultEmail: 'test@example.org',
      }),
      manifest: transferoManifest,
    }), {
      onRampLifecycle: ['CREATED', 'QUOTED', 'PENDING_PAYMENT', 'PENDING_TOKENS', 'COMPLETED'],
      offRampLifecycle: ['CREATED', 'QUOTED', 'PENDING_TOKENS', 'TOKENS_RECEIVED', 'PENDING_SETTLEMENT', 'COMPLETED'],
    });

    expect(result.passed).toBe(true);
  });
});
