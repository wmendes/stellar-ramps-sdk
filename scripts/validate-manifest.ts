import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateProviderManifest, type ProviderCapabilitiesManifest } from '../packages/core/src/index.js';
import { defaultIO, argValue } from './lib/index.js';

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const file = argValue(args, '--file');

  if (!file) {
    defaultIO.error('Missing required flag: --file <path-to-manifest.json>');
    return 1;
  }

  const raw = await readFile(resolve(file), 'utf8');
  const manifest = JSON.parse(raw) as ProviderCapabilitiesManifest;
  const result = validateProviderManifest(manifest);

  if (!result.valid) {
    defaultIO.error('Manifest invalid:');
    for (const issue of result.issues) {
      defaultIO.error(`- ${issue.field}: ${issue.message}`);
    }
    return 1;
  }

  defaultIO.log(`Manifest valid for provider: ${manifest.name}`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    defaultIO.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
