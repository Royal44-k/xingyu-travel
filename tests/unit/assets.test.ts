import { stat } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { brandAssets } from '@/data/assets';

it('ships every visible branded image as a real local asset', async () => {
  for (const asset of Object.values(brandAssets)) {
    const info = await stat(`public${asset.src}`);

    expect(info.size).toBeGreaterThan(20_000);
    expect(asset.alt.length).toBeGreaterThan(6);
  }
});
