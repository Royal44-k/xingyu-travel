import { readFile, stat } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { posts } from '@/data/posts';

const requiredDestinations = ['大理', '桂林', '川西', '三亚', '杭州', '南京', '上海', '贵州'] as const;
const assetDirectories = ['dali', 'guilin', 'sichuan', 'sanya', 'hangzhou', 'nanjing', 'shanghai', 'guizhou'] as const;

function readPngDimensions(bytes: Buffer) {
  const pngSignature = '89504e470d0a1a0a';
  expect(bytes.subarray(0, 8).toString('hex')).toBe(pngSignature);

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

it('ships eight complete destination guides with four independent images each', () => {
  const destinations = posts.map((post) => post.destination);

  for (const destination of requiredDestinations) expect(destinations).toContain(destination);
  for (const post of posts.filter((item) => requiredDestinations.includes(item.destination as (typeof requiredDestinations)[number]))) {
    expect(post.days).toBeGreaterThanOrEqual(3);
    expect(post.days).toBeLessThanOrEqual(6);
    expect(post.media.length).toBeGreaterThanOrEqual(4);
    expect(new Set(post.media.map((asset) => asset.src)).size).toBe(post.media.length);
    expect(post.itinerary).toHaveLength(post.days);
    expect(post.locations.length).toBeGreaterThanOrEqual(2);
    expect(post.tags.length).toBeGreaterThanOrEqual(2);
    expect(post.budget).toBeGreaterThan(0);
    expect(post.ai.generated || post.ai.rewritten).toBe(true);
  }
});

it('starts the Sanya guide at dawn only after a clearly stated prior-night arrival', () => {
  const sanya = posts.find((post) => post.slug === 'sanya-bay-rainforest-5d');

  expect(sanya?.itinerary[0]).toMatchObject({ day: 1, title: '亚龙湾黎明' });
  expect(sanya?.itinerary[0].description).toMatch(/前一晚.*抵达/);
});

it('ships all 32 independent destination PNGs at the registered 3:2 source size', async () => {
  const expectedPaths = assetDirectories.flatMap((destination) =>
    ['01', '02', '03', '04'].map((shot) => `public/assets/destinations/${destination}/${shot}.png`),
  );

  expect(expectedPaths).toHaveLength(32);
  for (const path of expectedPaths) {
    const info = await stat(path);
    const bytes = await readFile(path);

    expect(info.size).toBeGreaterThan(20_000);
    expect(readPngDimensions(bytes)).toEqual({ width: 1536, height: 1024 });
  }
});
