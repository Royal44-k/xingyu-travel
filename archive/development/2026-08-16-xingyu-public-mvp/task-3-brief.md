## Task 3: 生成并登记品牌影像资产

**Files:**
- Create: `public/assets/hero-dali-dawn.png`
- Create: `public/assets/destination-sichuan.png`
- Create: `public/assets/destination-guilin.png`
- Create: `public/assets/guide-dali-courtyard.png`
- Create: `public/assets/guardian-rainy-mountain.png`
- Create: `src/data/assets.ts`
- Create: `tests/unit/assets.test.ts`
- Create: `public/assets/ASSET-LICENSES.md`

**Interfaces:**
- Produces: `brandAssets` 静态映射，供所有 `next/image` 组件使用。
- Consumes: 选定视觉图和五个明确槽位尺寸。

- [ ] **Step 1: 写资产完整性失败测试**

```ts
// tests/unit/assets.test.ts
import { stat } from 'node:fs/promises';
import { brandAssets } from '@/data/assets';

it('ships every visible branded image as a real local asset', async () => {
  for (const asset of Object.values(brandAssets)) {
    const info = await stat(`public${asset.src}`);
    expect(info.size).toBeGreaterThan(20_000);
    expect(asset.alt.length).toBeGreaterThan(6);
  }
});
```

- [ ] **Step 2: 使用 Image Gen 分别生成五张独立图片**

每次调用只生成一张并保存到上方固定路径。统一艺术指导：真实摄影、暖金晨光、低饱和黑金调、中国目的地、无文字、无 Logo、无水印。

```text
Hero: 2400×1600，大理高山与湖泊日出，河谷形成自然引导线，左侧保留深色负空间供白色标题，摄影写实。
Sichuan: 1600×1000，川西雪山高原与秋草，低机位编辑旅行摄影，人物不可辨识。
Guilin: 1600×1000，桂林喀斯特山水与竹筏暮色，深色前景、暖色天光。
Dali guide: 1400×1000，大理白族院落、植物与石桌，生活化自然光，不出现商业标识。
Guardian: 1600×1000，山路雨幕与远处云层，保持安全距离，无灾难猎奇画面。
```

- [ ] **Step 3: 登记尺寸、alt 和用途**

```ts
// src/data/assets.ts
export const brandAssets = {
  hero: { src: '/assets/hero-dali-dawn.png', width: 2400, height: 1600, alt: '晨光穿过大理群山与湖谷' },
  sichuan: { src: '/assets/destination-sichuan.png', width: 1600, height: 1000, alt: '秋日川西雪山高原' },
  guilin: { src: '/assets/destination-guilin.png', width: 1600, height: 1000, alt: '暮色中的桂林山水' },
  guide: { src: '/assets/guide-dali-courtyard.png', width: 1400, height: 1000, alt: '大理白族院落里的慢旅行片刻' },
  guardian: { src: '/assets/guardian-rainy-mountain.png', width: 1600, height: 1000, alt: '雨幕中的高原山路' },
} as const;
```

- [ ] **Step 4: 验证真实资产并提交**

Run: `pnpm vitest run tests/unit/assets.test.ts`

Expected: PASS。

```powershell
git add public/assets src/data/assets.ts tests/unit/assets.test.ts
git commit -m "feat: add original xingyu destination imagery"
```
