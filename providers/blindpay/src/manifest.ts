import type { ProviderCapabilitiesManifest } from '@stellar-ramps/core';

export const blindpayManifest: ProviderCapabilitiesManifest = {
  name: 'blindpay',
  displayName: 'BlindPay',
  kycFlow: 'redirect',
  corridors: [
    {
      country: 'MX',
      currency: 'MXN',
      rail: 'spei',
      tokens: [
        {
          symbol: 'USDB',
          name: 'BlindPay USD',
          issuer: 'GBWXJPZL5ADAH7T5BP3DBW2V2DFT3URN2VXN2MG26OM4CTOJSDDSPYAN',
          description: 'BlindPay development stablecoin for simulated payouts.',
        },
      ],
      directions: ['on_ramp', 'off_ramp'],
    },
  ],
  onboarding: {
    type: 'self_service',
    portalUrl: 'https://app.blindpay.com',
  },
};
