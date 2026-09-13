### Task 6: Destination Content Contracts and ImageGen Asset Packs

**Files:**
- Create: `src/data/destination-assets.ts`
- Create: `docs/design/destination-asset-prompts.md`
- Create: `docs/design/asset-provenance.md`
- Create: `tests/unit/content-invariants.test.ts`
- Create: `public/assets/destinations/dali/01.png` through `04.png`
- Create: `public/assets/destinations/guilin/01.png` through `04.png`
- Create: `public/assets/destinations/sichuan/01.png` through `04.png`
- Create: `public/assets/destinations/sanya/01.png` through `04.png`
- Create: `public/assets/destinations/hangzhou/01.png` through `04.png`
- Create: `public/assets/destinations/nanjing/01.png` through `04.png`
- Create: `public/assets/destinations/shanghai/01.png` through `04.png`
- Create: `public/assets/destinations/guizhou/01.png` through `04.png`
- Modify: `src/data/assets.ts`
- Modify: `src/data/posts.ts`
- Modify: `tests/unit/assets.test.ts`

**Interfaces:**
- Produces: `destinationAssets`, eight complete `TravelPost` entries, and an asset provenance record.
- Consumes: built-in ImageGen and existing `PostMedia`, `TravelPost`, `postsBySlug`, and `orderPosts` interfaces.

- [ ] **Step 1: Write failing content and filesystem invariant tests**

```ts
it('ships eight complete destination guides with four independent images each', () => {
  const required = ['大理', '桂林', '川西', '三亚', '杭州', '南京', '上海', '贵州'];
  const destinations = posts.map((post) => post.destination);
  for (const destination of required) expect(destinations).toContain(destination);
  for (const post of posts.filter((item) => required.includes(item.destination))) {
    expect(post.media.length).toBeGreaterThanOrEqual(4);
    expect(new Set(post.media.map((asset) => asset.src)).size).toBe(post.media.length);
    expect(post.itinerary).toHaveLength(post.days);
  }
});
```

Add `fs.stat` and PNG dimension checks for all 32 expected paths.

- [ ] **Step 2: Run invariant RED**

Run: `pnpm test tests/unit/content-invariants.test.ts tests/unit/assets.test.ts`

Expected: FAIL for missing destinations and missing files.

- [ ] **Step 3: Create the exact 32-shot prompt manifest**

Record one `photorealistic-natural` prompt per shot using the shared constraints “1536×1024 landscape, natural editorial travel photography, no text, logo, watermark, recognizable face, over-HDR sky, or disaster imagery”. Required shots:

| Destination | 01 | 02 | 03 | 04 |
|---|---|---|---|---|
| Dali | Bai courtyard morning | Erhai lakeside bicycle path | Xizhou rice fields | Shuanglang sunset |
| Guilin | Li River dawn mist | Yulong River bamboo-raft landscape | Yangshuo karst cycling road | Guilin waterfront dusk |
| West Sichuan | Xinduqiao autumn road | Tagong grassland and snow peaks | Moshi stone landscape | Kangding mountain road |
| Sanya | Yalong Bay dawn | Wuzhizhou clear-water coast | Houhai surf village exterior | Yanoda rainforest trail |
| Hangzhou | West Lake dawn mist | Longjing tea terraces | Lingyin bamboo/stone path | Grand Canal night reflections |
| Nanjing | Ming city wall dawn | Wutong avenue autumn | Qinhuai river night | Sun Yat-sen Mausoleum axis landscape |
| Shanghai | Bund blue-hour promenade | Wukang Road architecture | Suzhou Creek bridges | Lujiazui night skyline |
| Guizhou | Xiaoqikong turquoise water | Xijiang Miao architecture in mist | Jiabang rice terraces | Guiyang mountain-city night |

- [ ] **Step 4: Generate and inspect Dali and Guilin packs**

Issue eight separate built-in ImageGen calls, copy accepted outputs to their exact workspace paths, inspect every image with `view_image`, and record final prompt/dimensions/constraints in the provenance file. Reject duplicated composition, visible text, watermarks, faces, or incorrect geography.

- [ ] **Step 5: Generate and inspect West Sichuan and Sanya packs**

Issue eight separate calls and apply the same acceptance process. Mountain-road scenes must be safe travel scenes, not crashes, landslides, or emergencies.

- [ ] **Step 6: Generate and inspect Hangzhou and Nanjing packs**

Issue eight separate calls. Architectural scenes must avoid fake legible signage and commercial logos.

- [ ] **Step 7: Generate and inspect Shanghai and Guizhou packs**

Issue eight separate calls. Skyline and village scenes must avoid prominent fabricated text and recognizable people.

- [ ] **Step 8: Register actual asset metadata and write all eight complete guides**

Each post gets 3–6 day copy, budget, at least two location cards, exact itinerary length, tags, author, timestamps, and clear AI labeling. Beijing, Xi’an, Chongqing, and Xiamen remain carousel/filter entries that link to valid compare or square URLs, not missing detail pages.

- [ ] **Step 9: Run asset/content GREEN and inspect every registered file**

Run: `pnpm test tests/unit/content-invariants.test.ts tests/unit/assets.test.ts && pnpm typecheck`

Expected: 32 files exist, registry dimensions match actual pixels, eight destinations and itinerary invariants pass.

- [ ] **Step 10: Commit Task 6**

```bash
git add public/assets/destinations src/data/destination-assets.ts src/data/assets.ts src/data/posts.ts docs/design/destination-asset-prompts.md docs/design/asset-provenance.md tests/unit/content-invariants.test.ts tests/unit/assets.test.ts
git commit -m "feat: expand xingyu destination stories"
```

