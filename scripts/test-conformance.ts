import { runConformanceCommand } from '../packages/testing/src/index.js';
import { EtherfuseClient, etherfuseManifest } from '../providers/etherfuse/src/index.js';
import { AlfredPayClient, alfredpayManifest } from '../providers/alfredpay/src/index.js';
import { BlindPayClient, blindpayManifest } from '../providers/blindpay/src/index.js';
import { defaultIO } from './lib/index.js';

async function main(): Promise<number> {
  const args = process.argv.slice(2);

  const { code } = await runConformanceCommand(args, {
    io: defaultIO,
    providerResolver: (provider) => {
      if (provider === 'etherfuse') {
        return {
          adapter: new EtherfuseClient({
            apiKey: 'test-key',
            baseUrl: 'https://api.example.org',
          }),
          manifest: etherfuseManifest,
        };
      }
      if (provider === 'alfredpay') {
        return {
          adapter: new AlfredPayClient({
            apiKey: 'test-key',
            apiSecret: 'test-secret',
            baseUrl: 'https://api.example.org',
          }),
          manifest: alfredpayManifest,
        };
      }
      if (provider === 'blindpay') {
        return {
          adapter: new BlindPayClient({
            apiKey: 'test-key',
            instanceId: 'inst-1',
            baseUrl: 'https://api.example.org',
          }),
          manifest: blindpayManifest,
        };
      }
      return null;
    },
  });

  return code;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    defaultIO.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
