import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { brandAssets, destinationAssets } from '@/data/assets';

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
  const expectedPaths = [
    'dali',
    'guilin',
    'sichuan',
    'sanya',
    'hangzhou',
    'nanjing',
    'shanghai',
    'guizhou',
  ].flatMap((destination) =>
    ['01', '02', '03', '04'].map((shot) => `/assets/destinations/${destination}/${shot}.png`),
  );
  const hashes: string[] = [];

  expect(Object.keys(destinationAssets)).toHaveLength(8);
  expect(registered).toHaveLength(32);
  expect(registered.map((asset) => asset.src).sort()).toEqual(expectedPaths.sort());

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
