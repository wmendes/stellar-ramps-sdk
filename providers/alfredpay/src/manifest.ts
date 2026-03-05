import type { ProviderCapabilitiesManifest } from '@stellar-ramps/core';

export const alfredpayManifest: ProviderCapabilitiesManifest = {
  name: 'alfredpay',
  displayName: 'Alfred Pay',
  kycFlow: 'form',
  corridors: [
    {
      country: 'MX',
      currency: 'MXN',
      rail: 'spei',
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
    type: 'self_service',
    portalUrl: 'https://alfredpay.readme.io',
  },
};
