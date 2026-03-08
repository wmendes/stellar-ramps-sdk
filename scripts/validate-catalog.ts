import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { defaultIO, argValue } from './lib/index.js';

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const schemaPath = resolve(argValue(args, '--schema') ?? 'catalog/schema.json');
  const catalogPath = resolve(argValue(args, '--catalog') ?? 'catalog/catalog.json');

  const [schemaRaw, catalogRaw] = await Promise.all([
    readFile(schemaPath, 'utf8'),
    readFile(catalogPath, 'utf8'),
  ]);
  const schema = JSON.parse(schemaRaw);
  const catalog = JSON.parse(catalogRaw);

  const schemaVersion: string = typeof schema?.$schema === 'string' ? schema.$schema : '';
  const useDraft2020 = schemaVersion.includes('2020-12');
  const ajv = useDraft2020
    ? new Ajv2020({ allErrors: true, strict: false })
    : new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(catalog);

  if (!valid) {
    defaultIO.error('Catalog invalid:');
    for (const error of validate.errors ?? []) {
      defaultIO.error(`- ${error.instancePath || '/'}: ${error.message ?? 'invalid'}`);
    }
    return 1;
  }

  defaultIO.log(`Catalog valid: ${catalogPath}`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    defaultIO.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
