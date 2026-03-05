import type { ProviderCapabilitiesManifest } from '@stellar-ramps/core';

export const etherfuseManifest: ProviderCapabilitiesManifest = {
  name: 'etherfuse',
  displayName: 'Etherfuse',
  kycFlow: 'iframe',
  corridors: [
    {
      country: 'MX',
      currency: 'MXN',
      rail: 'spei',
      tokens: [
        {
          symbol: 'CETES',
          name: 'Etherfuse CETES',
          issuer: 'GC3CW7EDYRTWQ635VDIGY6S4ZUF5L6TQ7AA4MWS7LEQDBLUSZXV7UPS4',
          description: 'Tokenized Mexican treasury certificates.',
        },
      ],
      directions: ['on_ramp', 'off_ramp'],
    },
  ],
  onboarding: {
    type: 'self_service',
    portalUrl: 'https://devnet.etherfuse.com/ramp',
  },
};
