import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

describe('validate-manifest script', () => {
  it('validates a correct manifest file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-validate-manifest-'));
    const file = join(dir, 'manifest.json');

    const manifest = {
      name: 'test-provider',
      displayName: 'Test Provider',
      kycFlow: 'none',
      corridors: [
        {
          country: 'MX',
          currency: 'MXN',
          rail: 'spei',
          tokens: [{ symbol: 'USDC', name: 'USD Coin', description: 'Stablecoin' }],
          directions: ['on_ramp'],
        },
      ],
    };

    await writeFile(file, JSON.stringify(manifest, null, 2), 'utf8');

    const { stdout } = await execAsync(`tsx scripts/validate-manifest.ts --file ${file}`);
    expect(stdout).toContain('Manifest valid for provider: test-provider');
  });

  it('reports errors for invalid manifest', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-validate-manifest-'));
    const file = join(dir, 'invalid.json');

    const invalidManifest = {
      name: 'test-provider',
      // Missing required fields
    };

    await writeFile(file, JSON.stringify(invalidManifest, null, 2), 'utf8');

    await expect(execAsync(`tsx scripts/validate-manifest.ts --file ${file}`)).rejects.toThrow();
  });

  it('reports error when --file flag is missing', async () => {
    await expect(execAsync('tsx scripts/validate-manifest.ts')).rejects.toThrow();
  });
});
