import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

describe('validate-catalog script', () => {
  it('validates catalog against schema', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-catalog-'));
    const schemaPath = join(dir, 'schema.json');
    const catalogPath = join(dir, 'catalog.json');

    await writeFile(
      schemaPath,
      JSON.stringify(
        {
          type: 'object',
          required: ['version'],
          properties: {
            version: { type: 'string' },
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    await writeFile(catalogPath, JSON.stringify({ version: '0.1.0' }, null, 2), 'utf8');

    const { stdout } = await execAsync(
      `tsx scripts/validate-catalog.ts --schema ${schemaPath} --catalog ${catalogPath}`,
    );
    expect(stdout).toContain('Catalog valid');
  });

  it('validates repository catalog against repository schema', async () => {
    const { stdout } = await execAsync(
      'tsx scripts/validate-catalog.ts --schema catalog/schema.json --catalog catalog/catalog.json',
    );
    expect(stdout).toContain('Catalog valid');
  });

  it('reports errors for invalid catalog', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-catalog-'));
    const schemaPath = join(dir, 'schema.json');
    const catalogPath = join(dir, 'catalog.json');

    await writeFile(
      schemaPath,
      JSON.stringify(
        {
          type: 'object',
          required: ['version'],
          properties: {
            version: { type: 'string' },
          },
        },
        null,
        2,
      ),
      'utf8',
    );
    // Missing required 'version' field
    await writeFile(catalogPath, JSON.stringify({}, null, 2), 'utf8');

    await expect(
      execAsync(`tsx scripts/validate-catalog.ts --schema ${schemaPath} --catalog ${catalogPath}`),
    ).rejects.toThrow();
  });
});
