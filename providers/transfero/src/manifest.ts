import type { ProviderCapabilitiesManifest } from '@stellar-ramps/core';

export const transferoManifest: ProviderCapabilitiesManifest = {
  name: 'transfero',
  displayName: 'Transfero',
  kycFlow: 'none',
  corridors: [
    {
      country: 'BR',
      currency: 'BRL',
      rail: 'pix',
      tokens: [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
          description: 'A fully-reserved stablecoin pegged 1:1 to the US Dollar.',
        },
      ],
      directions: ['on_ramp', 'off_ramp'],
    },
  ],
  onboarding: {
    type: 'partnership',
    portalUrl: 'https://docs.transfero.com',
  },
};
