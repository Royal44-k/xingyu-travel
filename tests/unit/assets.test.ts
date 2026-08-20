import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { brandAssets, destinationAssets } from '@/data/assets';

const expectedDestinationPaths = [
  '/assets/destinations/dali/01.png',
  '/assets/destinations/dali/02.png',
  '/assets/destinations/dali/03.png',
  '/assets/destinations/dali/04.png',
  '/assets/destinations/guilin/01.png',
  '/assets/destinations/guilin/02.png',
  '/assets/destinations/guilin/03.png',
  '/assets/destinations/guilin/04.png',
  '/assets/destinations/sichuan/01.png',
  '/assets/destinations/sichuan/02.png',
  '/assets/destinations/sichuan/03.png',
  '/assets/destinations/sichuan/04.png',
  '/assets/destinations/sanya/01.png',
  '/assets/destinations/sanya/02.png',
  '/assets/destinations/sanya/03.png',
  '/assets/destinations/sanya/04.png',
  '/assets/destinations/hangzhou/01.png',
  '/assets/destinations/hangzhou/02.png',
  '/assets/destinations/hangzhou/03.png',
  '/assets/destinations/hangzhou/04.png',
  '/assets/destinations/nanjing/01.png',
  '/assets/destinations/nanjing/02.png',
  '/assets/destinations/nanjing/03.png',
  '/assets/destinations/nanjing/04.png',
  '/assets/destinations/shanghai/01.png',
  '/assets/destinations/shanghai/02.png',
  '/assets/destinations/shanghai/03.png',
  '/assets/destinations/shanghai/04.png',
  '/assets/destinations/guizhou/01.png',
  '/assets/destinations/guizhou/02.png',
  '/assets/destinations/guizhou/03.png',
  '/assets/destinations/guizhou/04.png',
];

async function enumerateDestinationPngPaths(root: string, publicRoot: string): Promise<string[]> {
  const pngPaths: string[] = [];

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
        const publicPath = relative(publicRoot, absolutePath).split(/[\\/]/).join('/');
        pngPaths.push(`/${publicPath}`);
      }
    }
  }

  await visit(root);
  return pngPaths.sort();
}

it('ships every visible branded image as a real local asset', async () => {
  for (const asset of Object.values(brandAssets)) {
    const info = await stat(`public${asset.src}`);
    const bytes = await readFile(`public${asset.src}`);

    expect(info.size).toBeGreaterThan(20_000);
    expect(asset.alt.length).toBeGreaterThan(6);
    expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(bytes.readUInt32BE(16)).toBe(asset.width);
    expect(bytes.readUInt32BE(20)).toBe(asset.height);
  }
});

it('registers every destination image with metadata matching the shipped PNG', async () => {
  const registered = Object.values(destinationAssets).flat();
  const registeredPaths = registered.map((asset) => asset.src).sort();
  const expectedPaths = [...expectedDestinationPaths].sort();
  const shippedPaths = await enumerateDestinationPngPaths(
    resolve('public', 'assets', 'destinations'),
    resolve('public'),
  );
  const hashes: string[] = [];

  expect(Object.keys(destinationAssets)).toHaveLength(8);
  expect(registered).toHaveLength(32);
  expect(registeredPaths).toEqual(expectedPaths);
  expect(shippedPaths).toEqual(expectedPaths);
  expect(shippedPaths).toEqual(registeredPaths);

  for (const asset of registered) {
    const bytes = await readFile(`public${asset.src}`);
    hashes.push(createHash('sha256').update(bytes).digest('hex'));

    expect(asset.width).toBe(1536);
    expect(asset.height).toBe(1024);
    expect(asset.alt.length).toBeGreaterThan(6);
    expect(bytes.readUInt32BE(16)).toBe(asset.width);
    expect(bytes.readUInt32BE(20)).toBe(asset.height);
  }

  expect(new Set(hashes).size).toBe(32);
});

it('discovers every nested PNG including an unregistered stale file while ignoring non-PNG files', async () => {
  const publicRoot = await mkdtemp(join(tmpdir(), 'xingyu-destination-assets-'));
  const destinationsRoot = join(publicRoot, 'assets', 'destinations');

  try {
    await mkdir(join(destinationsRoot, 'dali'), { recursive: true });
    await mkdir(join(destinationsRoot, 'guilin'), { recursive: true });
    await mkdir(join(destinationsRoot, 'stale', 'nested'), { recursive: true });
    await writeFile(join(destinationsRoot, 'dali', '01.png'), 'fixture');
    await writeFile(join(destinationsRoot, 'guilin', '02.png'), 'fixture');
    await writeFile(join(destinationsRoot, 'stale', 'nested', '99.png'), 'fixture');
    await writeFile(join(destinationsRoot, 'stale', 'notes.txt'), 'ignored');

    expect(await enumerateDestinationPngPaths(destinationsRoot, publicRoot)).toEqual([
      '/assets/destinations/dali/01.png',
      '/assets/destinations/guilin/02.png',
      '/assets/destinations/stale/nested/99.png',
    ]);
  } finally {
    await rm(publicRoot, { recursive: true, force: true });
  }
});
