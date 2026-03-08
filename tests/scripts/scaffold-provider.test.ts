import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execAsync = promisify(exec);

describe('scaffold-provider script', () => {
  it('scaffolds a provider package skeleton', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-scaffold-'));

    await execAsync(
      `tsx scripts/scaffold-provider.ts provider --name demo-provider --display-name "Demo Provider" --dir ${dir}`,
    );

    const manifestPath = join(dir, 'demo-provider', 'src', 'manifest.ts');
    const manifestContent = await readFile(manifestPath, 'utf8');
    expect(manifestContent).toContain("name: 'demo-provider'");
    expect(manifestContent).toContain("displayName: 'Demo Provider'");
  });

  it('uses default display name when not provided', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ramps-scaffold-'));

    await execAsync(`tsx scripts/scaffold-provider.ts provider --name test-provider --dir ${dir}`);

    const manifestPath = join(dir, 'test-provider', 'src', 'manifest.ts');
    const manifestContent = await readFile(manifestPath, 'utf8');
    expect(manifestContent).toContain("name: 'test-provider'");
  });

  it('reports error when --name flag is missing', async () => {
    await expect(execAsync('tsx scripts/scaffold-provider.ts provider')).rejects.toThrow();
  });

  it('reports error for unsupported scaffold target', async () => {
    await expect(execAsync('tsx scripts/scaffold-provider.ts unknown --name test')).rejects.toThrow();
  });
});
