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

  expect(Object.keys(destinationAssets)).toHaveLength(8);
  expect(registered).toHaveLength(32);
  expect(new Set(registered.map((asset) => asset.src)).size).toBe(32);

  for (const asset of registered) {
    const bytes = await readFile(`public${asset.src}`);

    expect(asset.width).toBe(1536);
    expect(asset.height).toBe(1024);
    expect(asset.alt.length).toBeGreaterThan(6);
    expect(bytes.readUInt32BE(16)).toBe(asset.width);
    expect(bytes.readUInt32BE(20)).toBe(asset.height);
  }
});
