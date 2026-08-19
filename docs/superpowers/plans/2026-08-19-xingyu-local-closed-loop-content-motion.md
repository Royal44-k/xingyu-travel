# Xingyu Local Closed Loop, Content, and Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-local, refresh-safe travel workspace in which interests, liked guides, saved offers, alerts, converted trips, and guardian decisions remain discoverable, while expanding the site to eight complete Chinese destination guides with cinematic but accessible motion.

**Architecture:** Keep domain ownership separated: `profile-store` owns recommendation preferences, a new `library-store` owns liked posts and offer snapshots, and `trip-store` v2 is the sole source for accepted trips. Pages consume selectors and typed actions rather than `localStorage`; all stores hydrate explicitly, validate with Zod, migrate forward, and fail closed without overwriting malformed bytes. The visual implementation follows the approved homepage and content-hub targets, using one signature destination-film interaction and restrained motion elsewhere.

**Tech Stack:** Node.js 24+, Next.js 16 App Router, React 19, TypeScript 6, Zustand 5, Zod 4, Motion 13, CSS Modules, Phosphor Icons, Vitest/Testing Library, Playwright with local Chrome, Vercel Production.

**Spec:** `docs/superpowers/specs/2026-08-18-xingyu-local-closed-loop-content-motion-design.md`

## Global Constraints

- Preserve the public sandbox boundary: no real booking, payment, background alert delivery, identity verification, emergency dispatch, or cross-device sync.
- Persist only browser-local demo data; components must not call `localStorage` directly.
- Keep `profile-store`, `library-store`, `trip-store`, and `partner-store` as separate domain owners.
- Every persisted schema uses an explicit version, strict Zod parsing, `skipHydration`, a deterministic migration, and fail-closed recovery that does not overwrite malformed bytes.
- Use collision-safe `offerIdentity` for offer keys and canonical `trip.id` for trip record keys.
- Eight complete guides are required: Dali, Guilin, West Sichuan, Sanya, Hangzhou, Nanjing, Shanghai, and Guizhou; each guide has at least four independent 3:2 destination images and itinerary length equal to `days`.
- Generate destination photography through the built-in ImageGen tool one asset per prompt; no scraped images, sprite sheets, brand imagery, watermarks, visible text, logos, or recognizable faces.
- Keep the approved visual tokens: `#10100F`, `#F4F0E8`, `#B79A68`, `#26312B`, `#4D6B63`, and `#A94032`; retain Noto Serif SC and Noto Sans SC.
- Spend visual emphasis on the destination-film carousel; other glow and motion remain state-driven and restrained.
- Support keyboard, touch, visible focus, `prefers-reduced-motion`, 390px mobile reflow, and pause-on-hover/focus/page-hidden carousel behavior.
- Use `apply_patch` for source and document edits; do not replace existing user changes or broad-reset the worktree.
- Each task follows RED → minimal GREEN → focused regression → full relevant regression → review → commit.
- Before claiming completion run `pnpm lint`, `pnpm typecheck`, full Vitest, `pnpm test:e2e`, `pnpm build`, local-Chrome Design QA, and Vercel Production verification.

## File and Responsibility Map

### New domain/data files

- `src/data/interest-tags.ts`: curated interest categories, defaults, tag normalization constraints.
- `src/data/destination-assets.ts`: typed destination asset registry with exact paths, dimensions, alt text, and shot identity.
- `src/stores/library-store.ts`: liked post slugs, favorite offer snapshots, price alerts, hydration state, migrations, selectors/actions.

### New shared and feature components

- `src/components/hydration-boundary.tsx`: combines readiness/error state without reading store internals.
- `src/features/library/favorite-button.tsx`: shared post favorite button with ARIA and state motion.
- `src/features/profile/interest-tag-picker.tsx`: preset/custom tag management.
- `src/features/profile/profile-hub.tsx`: query-driven personal-center tabs and cross-domain summaries.
- `src/features/profile/profile.module.css`: profile hub, tabs, cards, and states.
- `src/features/trips/trip-collection.tsx`: canonical trip list, filters, cards, and empty/error states.
- `src/app/trips/page.tsx`: “My Trips” route shell.
- `src/features/square/destination-filters.tsx`: guide search and destination/theme/day filters.
- `src/features/square/guide-gallery.tsx`: equal-ratio gallery carousel and thumbnails.
- `src/features/home/destination-film-carousel.tsx`: signature destination carousel.
- `src/features/home/home-story-sections.tsx`: guide, comparison, AI, partner, guardian, and local-library sections.

### Existing files with focused changes

- `src/stores/profile-store.ts`: v2 interest actions/migration.
- `src/stores/trip-store.ts`: v2 timestamps, cover image, canonical `savePostAsTrip`, legacy draft import.
- `src/domain/trips/trip-store.ts`: compatibility-only legacy reader; no new feature writes.
- `src/features/profile/preference-settings.tsx`: compose `InterestTagPicker` and recommendation controls.
- `src/features/square/post-card.tsx`: shared favorite action and richer metadata.
- `src/features/square/convert-to-trip.tsx`: save directly to canonical trip store.
- `src/features/comparison/comparison-client.tsx`: library-backed favorites and alerts.
- `src/features/comparison/offer-row.tsx`: typed favorite callback and saved state.
- `src/features/home/featured-destinations.tsx`: replace two-card strip with signature carousel composition.
- `src/features/home/featured-destinations.module.css`, `src/features/home/hero.module.css`, `src/features/square/square.module.css`, `src/app/globals.css`: approved tokens, layout, motion, reduced-motion behavior.
- `src/components/site-header.tsx` and `.module.css`: assistant, profile, `/trips`, and contextual guardian navigation.
- `src/data/posts.ts`, `src/data/assets.ts`: eight complete guides and registry consumption.
- `src/app/page.tsx`, `src/app/square/page.tsx`, `src/app/square/[slug]/page.tsx`, `src/app/profile/page.tsx`, `src/app/sitemap.ts`: page composition and route discovery.

### New and expanded tests

- `tests/unit/profile-preferences.test.ts`
- `tests/unit/library-store.test.ts`
- `tests/unit/content-invariants.test.ts`
- `tests/component/interest-tag-picker.test.tsx`
- `tests/component/favorite-sync.test.tsx`
- `tests/component/trip-collection.test.tsx`
- `tests/component/guide-gallery.test.tsx`
- `tests/component/destination-film-carousel.test.tsx`
- `tests/component/profile-hub.test.tsx`
- `tests/e2e/local-library.spec.ts`
- Expand existing comparison, conversion, trip, header, core journey, accessibility, and responsive tests.

---

### Task 1: Profile Preferences v2 and Recoverable Interest Management

**Files:**
- Create: `src/data/interest-tags.ts`
- Create: `src/features/profile/interest-tag-picker.tsx`
- Create: `tests/unit/profile-preferences.test.ts`
- Create: `tests/component/interest-tag-picker.test.tsx`
- Modify: `src/stores/profile-store.ts`
- Modify: `src/features/profile/preference-settings.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/component/preference-settings.test.tsx`

**Interfaces:**
- Produces: `normalizeInterestTag(raw: string): string`, `INTEREST_CATEGORIES`, `addInterestTag`, `removeInterestTag`, `replaceInterestTags`, and `ProfilePreferences` v2.
- Consumes: current Zustand persistence and `useProfileStoreHydration` fail-closed conventions.

- [ ] **Step 1: Write failing store tests for normalization, add/remove, limits, v1 migration, and malformed bytes**

```ts
it('normalizes, de-duplicates, and restores interests after clearing', async () => {
  const store = createProfileStore();
  await store.persist.rehydrate();
  store.getState().clearInterestTags();
  store.getState().addInterestTag('  #海岛  ');
  store.getState().addInterestTag('海岛');
  expect(store.getState().interestTags).toEqual(['海岛']);
  expect(store.getState().personalizedFeed).toBe(false);
});

it('migrates version one preferences to version two', async () => {
  localStorage.setItem('xingyu-profile-demo-v1', JSON.stringify({
    state: { personalizedFeed: true, interestTags: ['山野'] }, version: 1,
  }));
  const store = createProfileStore();
  await store.persist.rehydrate();
  expect(store.getState().interestTags).toEqual(['山野']);
  expect(JSON.parse(localStorage.getItem('xingyu-profile-demo-v1')!).version).toBe(2);
});
```

- [ ] **Step 2: Run the new unit test and capture RED**

Run: `pnpm test tests/unit/profile-preferences.test.ts`

Expected: FAIL because v2 actions and `normalizeInterestTag` do not exist.

- [ ] **Step 3: Implement the curated taxonomy and strict v2 actions**

```ts
export const INTEREST_CATEGORIES = [
  { id: 'style', label: '旅行方式', tags: ['慢旅行', '自驾', '亲子', '独自出发', '周末'] },
  { id: 'nature', label: '自然景观', tags: ['海岛', '山水', '雪山', '轻徒步'] },
  { id: 'culture', label: '城市人文', tags: ['古镇', '城市漫游', '人文历史', '摄影', '美食'] },
  { id: 'safety', label: '安全与同行', tags: ['雨天出行', '安全'] },
] as const;

export function normalizeInterestTag(raw: string) {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ');
}
```

Enforce 2–12 visible characters, maximum 12 tags, case-insensitive duplicate prevention, and stable errors `PROFILE_TAG_INVALID` / `PROFILE_TAG_LIMIT`.

- [ ] **Step 4: Run unit GREEN and the existing profile persistence regression**

Run: `pnpm test tests/unit/profile-preferences.test.ts tests/component/preference-settings.test.tsx`

Expected: PASS; malformed bytes remain unchanged until explicit reset.

- [ ] **Step 5: Write the failing `InterestTagPicker` behavior tests**

```tsx
it('keeps the tag library available after clear and can add a custom tag', async () => {
  render(<PreferenceSettings />);
  await user.click(screen.getByRole('button', { name: '清除全部兴趣' }));
  await user.click(screen.getByRole('button', { name: '确认清除' }));
  await user.click(screen.getByRole('button', { name: '海岛' }));
  await user.type(screen.getByLabelText('自定义兴趣'), '博物馆{Enter}');
  expect(useProfileStore.getState().interestTags).toEqual(['海岛', '博物馆']);
});
```

- [ ] **Step 6: Implement picker, confirmation, inline validation, selected-state semantics, and styles**

Use `aria-pressed`, a visible check icon, `aria-live` status, and keep the taxonomy visible in the empty state. Do not automatically re-enable recommendations after the first tag is added.

- [ ] **Step 7: Run focused GREEN, lint, and typecheck**

Run: `pnpm test tests/unit/profile-preferences.test.ts tests/component/interest-tag-picker.test.tsx tests/component/preference-settings.test.tsx && pnpm lint && pnpm typecheck`

- [ ] **Step 8: Commit Task 1**

```bash
git add src/data/interest-tags.ts src/stores/profile-store.ts src/features/profile/interest-tag-picker.tsx src/features/profile/preference-settings.tsx src/app/globals.css tests/unit/profile-preferences.test.ts tests/component/interest-tag-picker.test.tsx tests/component/preference-settings.test.tsx
git commit -m "feat: restore editable travel interests"
```

### Task 2: Library Store for Liked Guides, Favorite Offers, and Local Alerts

**Files:**
- Create: `src/stores/library-store.ts`
- Create: `tests/unit/library-store.test.ts`
- Consume: `src/domain/comparison/offer-identity.ts`

**Interfaces:**
- Produces: `FavoriteOfferSnapshot`, `PriceAlert`, `LibraryStoreState`, `hydrateLibraryStore()`, `useLibraryStore`, and `useLibraryStoreHydration`.
- Consumes: `offerIdentity(offer): string` and normalized `NormalizedOffer` fields.

- [ ] **Step 1: Write failing tests for liked slugs, collision-safe offers, alert dependency, persistence, and malformed bytes**

```ts
it('persists a liked post and a normalized offer snapshot', async () => {
  const store = createLibraryStore();
  await store.persist.rehydrate();
  store.getState().togglePostLike('sanya-coast-rainforest');
  store.getState().saveOffer(makeOffer({ id: 'same:id', provider: 'a:b' }));
  expect(store.getState().likedPostSlugs).toEqual(['sanya-coast-rainforest']);
  expect(Object.keys(store.getState().favoriteOffers)).toHaveLength(1);
});

it('removing a favorite offer also disables its local alert', () => {
  const store = createLibraryStore();
  const offer = makeOffer();
  store.getState().saveOffer(offer);
  store.getState().setPriceAlert(offerIdentity(offer), true);
  store.getState().removeOffer(offerIdentity(offer));
  expect(store.getState().priceAlerts).toEqual({});
});
```

- [ ] **Step 2: Run unit RED**

Run: `pnpm test tests/unit/library-store.test.ts`

Expected: FAIL because `library-store` does not exist.

- [ ] **Step 3: Implement strict schemas and actions**

```ts
import type { ComparisonProductKind, NormalizedOffer } from '@/domain/comparison/types';

export interface FavoriteOfferSnapshot {
  key: string;
  provider: string;
  productKind: ComparisonProductKind;
  destination: string;
  totalPrice: number;
  currency: 'CNY';
  policySummary: string;
  observedAt: string;
  expiresAt: string;
  deepLink?: string;
}
```

Persist under `xingyu-library-demo-v1`, version 1. Accept only finite non-negative prices, valid ISO timestamps, maximum 500 liked slugs and 200 offer snapshots, and no unknown keys.

- [ ] **Step 4: Run unit GREEN and typecheck**

Run: `pnpm test tests/unit/library-store.test.ts && pnpm typecheck`

- [ ] **Step 5: Commit Task 2**

```bash
git add src/stores/library-store.ts tests/unit/library-store.test.ts
git commit -m "feat: persist local travel library"
```

### Task 3: Shared Favorite Interactions and Comparison Integration

**Files:**
- Create: `src/features/library/favorite-button.tsx`
- Create: `src/features/library/library.module.css`
- Create: `tests/component/favorite-sync.test.tsx`
- Modify: `src/features/square/post-card.tsx`
- Modify: `src/features/comparison/comparison-client.tsx`
- Modify: `src/features/comparison/offer-row.tsx`
- Modify: `tests/component/comparison-client.test.tsx`

**Interfaces:**
- Produces: `FavoriteButton({ slug, label })` and library-backed offer callbacks.
- Consumes: Task 2 `useLibraryStore`, `hydrateLibraryStore`, and `offerIdentity`.

- [ ] **Step 1: Write failing cross-component persistence tests**

```tsx
it('keeps a guide liked after remount and exposes the same state to another button', async () => {
  render(<><FavoriteButton slug="dali-slow-5d" label="大理攻略" /><FavoriteButton slug="dali-slow-5d" label="大理详情" /></>);
  await user.click(screen.getByRole('button', { name: '喜欢 大理攻略' }));
  expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2);
  cleanup();
  await useLibraryStore.persist.rehydrate();
  render(<FavoriteButton slug="dali-slow-5d" label="大理攻略" />);
  expect(screen.getByRole('button', { pressed: true })).toBeInTheDocument();
});
```

Add comparison regressions proving favorite and alert state survive component remount and that removing the favorite clears its alert only after user confirmation.

- [ ] **Step 2: Run component RED**

Run: `pnpm test tests/component/favorite-sync.test.tsx tests/component/comparison-client.test.tsx`

Expected: FAIL because current favorite state is component-local.

- [ ] **Step 3: Implement `FavoriteButton` and replace local post state**

Use one 160ms heart fill transition, one success bounce, `aria-pressed`, visible focus, and an `aria-live` message. Respect reduced motion by removing scale keyframes.

- [ ] **Step 4: Replace comparison-local favorites and alerts with library actions**

Keep selection-for-comparison state local; only favorites and alert preferences move to the library store. Show the exact notice: “已保存提醒设置；本演示不会在关闭页面后推送”。

- [ ] **Step 5: Run focused GREEN and regression**

Run: `pnpm test tests/component/favorite-sync.test.tsx tests/component/comparison-client.test.tsx tests/unit/library-store.test.ts`

- [ ] **Step 6: Commit Task 3**

```bash
git add src/features/library src/features/square/post-card.tsx src/features/comparison/comparison-client.tsx src/features/comparison/offer-row.tsx tests/component/favorite-sync.test.tsx tests/component/comparison-client.test.tsx
git commit -m "feat: connect guide and offer favorites"
```

### Task 4: Canonical Trip Store v2 and the My Trips Route

**Files:**
- Create: `src/features/trips/trip-collection.tsx`
- Create: `src/app/trips/page.tsx`
- Create: `tests/component/trip-collection.test.tsx`
- Modify: `src/stores/trip-store.ts`
- Modify: `src/domain/trips/trip-store.ts`
- Modify: `src/features/square/convert-to-trip.tsx`
- Modify: `src/features/trips/trip-workbench.tsx`
- Modify: `src/features/trips/trips.module.css`
- Modify: `tests/unit/trip-store.test.ts`
- Modify: `tests/component/convert-to-trip.test.tsx`
- Modify: `tests/component/trip-workbench.test.tsx`

**Interfaces:**
- Produces: `savePostAsTrip(draft: TripDraft, coverImage?: string): WorkbenchTrip`, timestamps, cover image, `TripCollection`.
- Consumes: existing canonical `getTrip` semantics, `extractTripDraft`, and legacy draft key `xingyu-demo-trip-drafts`.

- [ ] **Step 1: Write failing v2 migration and idempotent-save tests**

```ts
it('saves a converted guide once and returns the canonical trip on repeat', () => {
  const store = createTripStore();
  const first = store.getState().savePostAsTrip(daliDraft, '/assets/destinations/dali/01.png');
  const second = store.getState().savePostAsTrip({ ...daliDraft, id: 'replacement' });
  expect(second.id).toBe(first.id);
  expect(Object.keys(store.getState().trips)).toEqual([first.id]);
});

it('migrates v1 trips with stable timestamps and imports legacy drafts once', async () => {
  seedV1TripAndLegacyDraft();
  const store = createTripStore();
  await store.persist.rehydrate();
  expect(Object.values(store.getState().trips)).toHaveLength(2);
  expect(Object.values(store.getState().trips).every((trip) => trip.updatedAt)).toBe(true);
});
```

- [ ] **Step 2: Run unit RED**

Run: `pnpm test tests/unit/trip-store.test.ts`

Expected: FAIL because v2 fields and `savePostAsTrip` are absent.

- [ ] **Step 3: Implement v2 schema, v1 migration, and non-destructive legacy import**

Add `createdAt`, `updatedAt`, and optional `coverImage`. Keep old draft bytes untouched. Set deterministic migration timestamps from stable post publication data or `2026-08-18T00:00:00.000Z`, never `Date.now()` inside migration.

- [ ] **Step 4: Run unit GREEN and persistence regression**

Run: `pnpm test tests/unit/trip-store.test.ts`

- [ ] **Step 5: Write failing component tests for conversion and `/trips` discovery**

```tsx
it('shows a newly converted guide in My Trips immediately', async () => {
  render(<ConvertToTrip post={postsBySlug['dali-slow-5d']} />);
  await confirmConversion(user);
  render(<TripCollection />);
  expect(screen.getByRole('link', { name: /继续规划大理慢行计划/ })).toHaveAttribute('href', '/trips/dali-slow-5d');
});
```

- [ ] **Step 6: Implement direct canonical conversion, collection cards, filters, and empty/error states**

The collection sorts by `updatedAt` descending and filters `active/guarded/archived`. Empty state actions link to `/square` and `/compare`; no route uses `/trips/demo`.

- [ ] **Step 7: Run focused GREEN, header-independent route build, and typecheck**

Run: `pnpm test tests/component/convert-to-trip.test.tsx tests/component/trip-collection.test.tsx tests/component/trip-workbench.test.tsx && pnpm typecheck && pnpm build`

- [ ] **Step 8: Commit Task 4**

```bash
git add src/stores/trip-store.ts src/domain/trips/trip-store.ts src/features/square/convert-to-trip.tsx src/features/trips src/app/trips tests/unit/trip-store.test.ts tests/component/convert-to-trip.test.tsx tests/component/trip-collection.test.tsx tests/component/trip-workbench.test.tsx
git commit -m "feat: add canonical my trips collection"
```

### Task 5: Profile Hub and Cross-Domain Summaries

**Files:**
- Create: `src/components/hydration-boundary.tsx`
- Create: `src/features/profile/profile-hub.tsx`
- Create: `src/features/profile/profile.module.css`
- Create: `tests/component/profile-hub.test.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `ProfileHub({ initialTab })`, `ProfileTab`, and `HydrationBoundary`.
- Consumes: Tasks 1–4 selectors from profile, library, trip, and partner stores without copying domain records.

- [ ] **Step 1: Write failing tab, summary, empty, expired-offer, and hydration tests**

```tsx
it('shows liked guides, trips, and offer validity from their owning stores', async () => {
  seedLikedPost('dali-slow-5d');
  seedTrip(daliDraft);
  seedExpiredOffer();
  render(<ProfileHub initialTab="overview" />);
  expect(screen.getByText('1 个行程')).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: '喜欢' }));
  expect(screen.getByRole('link', { name: /把大理留给慢下来的人/ })).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: '收藏报价' }));
  expect(screen.getByText('报价可能已变化')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run component RED**

Run: `pnpm test tests/component/profile-hub.test.tsx`

Expected: FAIL because `ProfileHub` does not exist.

- [ ] **Step 3: Implement query-driven tabs and domain selectors**

Accepted tabs are `overview`, `trips`, `likes`, `offers`, `safety`, and `preferences`; invalid `?tab=` values render `overview`. Use semantic `tablist/tab/tabpanel`, preserve browser history, and keep content available without animation.

- [ ] **Step 4: Implement approved editorial layout and responsive states**

Use the dark editorial header from `docs/design/xingyu-content-hub-target.png`, but exact labels and counts come from stores. Keep the existing demo identity and safety disclosure.

- [ ] **Step 5: Run focused GREEN, semantic tab regressions, and typecheck**

Run: `pnpm test tests/component/profile-hub.test.tsx tests/component/preference-settings.test.tsx tests/component/favorite-sync.test.tsx && pnpm typecheck`

- [ ] **Step 6: Commit Task 5**

```bash
git add src/components/hydration-boundary.tsx src/features/profile src/app/profile/page.tsx src/app/globals.css tests/component/profile-hub.test.tsx
git commit -m "feat: build the local travel profile hub"
```

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

### Task 7: Square Discovery, Filters, Favorites, and Equal-Ratio Guide Gallery

**Files:**
- Create: `src/features/square/destination-filters.tsx`
- Create: `src/features/square/guide-gallery.tsx`
- Create: `tests/component/guide-gallery.test.tsx`
- Modify: `src/app/square/page.tsx`
- Modify: `src/app/square/[slug]/page.tsx`
- Modify: `src/features/square/post-card.tsx`
- Modify: `src/features/square/square.module.css`
- Modify: `tests/component/square-feed.test.tsx`

**Interfaces:**
- Produces: `DestinationFilters`, `GuideGallery`.
- Consumes: Task 1 preferences, Task 3 favorites, Task 6 posts/assets.

- [ ] **Step 1: Write failing filter and gallery behavior tests**

```tsx
it('filters by destination, theme, and maximum days without losing chronological mode', async () => {
  render(<SquarePage />);
  await user.selectOptions(screen.getByLabelText('目的地'), '三亚');
  await user.click(screen.getByRole('button', { name: '海岛' }));
  expect(screen.getByRole('link', { name: /三亚/ })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /川西/ })).not.toBeInTheDocument();
});

it('supports arrows, thumbnails, Home and End across four equal-ratio images', async () => {
  render(<GuideGallery images={postsBySlug['sanya-coast-rainforest'].media} title="三亚" />);
  await user.keyboard('{End}');
  expect(screen.getByText('4 / 4')).toBeInTheDocument();
  await user.keyboard('{Home}');
  expect(screen.getByText('1 / 4')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run component RED**

Run: `pnpm test tests/component/square-feed.test.tsx tests/component/guide-gallery.test.tsx`

- [ ] **Step 3: Implement search/filter state with valid empty states**

Filters are browser-session UI state, not persisted preferences. Search title, excerpt, destination, tags, and location names; “clear filters” restores the current feed mode.

- [ ] **Step 4: Implement gallery controls, touch drag, loading geometry, and reduced motion**

Every display frame uses `aspect-ratio: 3 / 2`. Thumbnail buttons expose selected state; autoplay is not used on detail pages. Failed images retain the frame and show alt/retry without substituting another destination.

- [ ] **Step 5: Apply approved hover/selected treatment and route-level favorite state**

Limit image scale to 1.035 and lift to 8px; only hovered/selected cards receive sand edge glow. Use `FavoriteButton` on cards and details.

- [ ] **Step 6: Run focused GREEN, mobile component regression, and typecheck**

Run: `pnpm test tests/component/square-feed.test.tsx tests/component/guide-gallery.test.tsx tests/component/favorite-sync.test.tsx && pnpm typecheck`

- [ ] **Step 7: Commit Task 7**

```bash
git add src/app/square src/features/square tests/component/square-feed.test.tsx tests/component/guide-gallery.test.tsx
git commit -m "feat: enrich guide discovery and galleries"
```

### Task 8: Signature Destination Film and Rich Home Story

**Files:**
- Create: `src/features/home/destination-film-carousel.tsx`
- Create: `src/features/home/home-story-sections.tsx`
- Create: `tests/component/destination-film-carousel.test.tsx`
- Modify: `src/features/home/featured-destinations.tsx`
- Modify: `src/features/home/featured-destinations.module.css`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/component/home-shell.test.tsx`

**Interfaces:**
- Produces: `DestinationFilmCarousel({ destinations, intervalMs?: number })` and `HomeStorySections`.
- Consumes: Task 6 destination registry/posts and existing Hero/SearchComposer.

- [ ] **Step 1: Write failing timing, pause, keyboard, and reduced-motion tests**

```tsx
it('advances every six seconds and pauses while focus remains inside', () => {
  vi.useFakeTimers();
  render(<DestinationFilmCarousel destinations={destinations} intervalMs={6000} />);
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.getByText('2 / 12')).toBeInTheDocument();
  screen.getByRole('link', { name: /杭州/ }).focus();
  act(() => vi.advanceTimersByTime(12000));
  expect(screen.getByText('2 / 12')).toBeInTheDocument();
});
```

Add tests for hover, pointer drag, arrow/Home/End, `visibilitychange`, and reduced motion disabling autoplay/parallax.

- [ ] **Step 2: Run component RED**

Run: `pnpm test tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx`

- [ ] **Step 3: Implement the signature carousel with Motion and DOM-native controls**

Current city is enlarged, adjacent cards remain partially visible, and route metadata is real text. Do not use CSS drawings, handcrafted SVGs, or fake map lines. Use Phosphor arrows and accessible pagination.

- [ ] **Step 4: Implement the home narrative modules**

Compose: destination film, four guide themes, true-price explanation, guide-to-trip example, AI/guardian scenario, trusted-partner boundary, and local recent-trip/liked content when hydrated. Every CTA routes to an existing page.

- [ ] **Step 5: Self-critique against the approved visual targets**

Remove decorative numbering where content is not sequential, keep one signature interaction, and ensure the dark editorial sections do not become a generic black-dashboard theme.

- [ ] **Step 6: Run focused GREEN, reduced-motion regression, lint, and typecheck**

Run: `pnpm test tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx tests/component/search-composer.test.tsx && pnpm lint && pnpm typecheck`

- [ ] **Step 7: Commit Task 8**

```bash
git add src/features/home src/app/page.tsx src/app/globals.css tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx
git commit -m "feat: add cinematic destination discovery"
```

### Task 9: Navigation, Contextual Guardian, and Discoverable AI/Profile Routes

**Files:**
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/site-header.module.css`
- Modify: `src/app/guardian/[tripId]/page.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `tests/component/site-header.test.tsx`
- Modify: `tests/component/risk-timeline.test.tsx`

**Interfaces:**
- Produces: data-driven `/trips`, `/profile`, `/assistant`, and contextual guardian navigation.
- Consumes: trip hydration/selectors and existing guardian known-trip guard.

- [ ] **Step 1: Write failing desktop/mobile navigation and guardian fallback tests**

```tsx
it('never links My Trips to a fixed demo slug', () => {
  render(<SiteHeader variant="solid" />);
  expect(screen.getByRole('link', { name: '我的行程' })).toHaveAttribute('href', '/trips');
  expect(screen.getByRole('link', { name: '旅行助手' })).toHaveAttribute('href', '/assistant');
  expect(screen.getByRole('link', { name: '个人中心' })).toHaveAttribute('href', '/profile');
});
```

- [ ] **Step 2: Run component RED**

Run: `pnpm test tests/component/site-header.test.tsx tests/component/risk-timeline.test.tsx`

- [ ] **Step 3: Implement route discovery and contextual guardian behavior**

If no guarded trip exists, guardian navigation points to `/trips?intent=guardian` and the collection explains how to enable it. If one exists, link to its `sourcePostSlug`. Do not render unknown guardian IDs.

- [ ] **Step 4: Preserve mobile focus, Escape, and open/closed overflow behavior**

Add an explicit personal-center affordance while keeping menu labels readable at 390px. Reuse existing mobile menu state; do not add a second menu system.

- [ ] **Step 5: Run focused GREEN and build route inventory**

Run: `pnpm test tests/component/site-header.test.tsx tests/component/risk-timeline.test.tsx && pnpm build`

- [ ] **Step 6: Commit Task 9**

```bash
git add src/components/site-header.tsx src/components/site-header.module.css src/app/guardian src/app/sitemap.ts tests/component/site-header.test.tsx tests/component/risk-timeline.test.tsx
git commit -m "fix: connect navigation to real local journeys"
```

### Task 10: Browser-Level Closed-Loop Acceptance

**Files:**
- Create: `tests/e2e/local-library.spec.ts`
- Modify: `tests/e2e/core-journey.spec.ts`
- Modify: `tests/e2e/accessibility.spec.ts`
- Modify: `tests/e2e/responsive.spec.ts`

**Interfaces:**
- Consumes: all prior tasks through public routes and browser storage.
- Produces: deterministic E2E evidence for local persistence, navigation, motion fallback, accessibility, and no runtime errors.

- [ ] **Step 1: Write the four failing closed-loop E2E stories**

```ts
test('interest clear → re-add → recommendation survives reload', async ({ page }) => {
  await page.goto('/profile?tab=preferences');
  await page.getByRole('button', { name: '清除全部兴趣' }).click();
  await page.getByRole('button', { name: '确认清除' }).click();
  await page.getByRole('button', { name: '海岛' }).click();
  await page.getByRole('button', { name: '城市漫游' }).click();
  await page.getByRole('switch', { name: '个性化推荐' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '海岛' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('switch', { name: '个性化推荐' })).toHaveAttribute('aria-checked', 'true');
});

test('like guide → reload → profile likes → unlike', async ({ page }) => {
  await page.goto('/square');
  const favorite = page.getByRole('button', { name: /喜欢.*大理/ }).first();
  await favorite.click();
  await page.reload();
  await expect(page.getByRole('button', { name: /喜欢.*大理/ }).first()).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/profile?tab=likes');
  await expect(page.getByRole('link', { name: /把大理留给慢下来的人/ })).toBeVisible();
  await page.getByRole('button', { name: /取消喜欢.*大理/ }).click();
  await expect(page.getByText('喜欢的攻略会保存在这里')).toBeVisible();
});

test('guide conversion → My Trips → workbench → compare', async ({ page }) => {
  await page.goto('/square/dali-slow-5d');
  await page.getByRole('button', { name: '转为行程' }).click();
  await page.getByRole('button', { name: '确认并保存到我的行程' }).click();
  await page.getByRole('link', { name: '查看行程' }).click();
  await expect(page.getByRole('heading', { name: '大理慢行计划' })).toBeVisible();
  await page.getByRole('link', { name: '我的行程' }).click();
  await expect(page).toHaveURL(/\/trips$/);
  await page.getByRole('link', { name: /继续规划大理慢行计划/ }).click();
  await page.getByRole('link', { name: /进入比价/ }).click();
  await expect(page).toHaveURL(/\/compare\?/);
});

test('favorite offer + alert → profile → re-search → remove', async ({ page }) => {
  await page.goto('/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-09-18&to=2026-09-22&travelers=3');
  await page.getByRole('button', { name: /^收藏 .*报价$/ }).first().click();
  await page.getByRole('switch', { name: '降价提醒' }).click();
  await expect(page.getByText('已保存提醒设置；本演示不会在关闭页面后推送')).toBeVisible();
  await page.goto('/profile?tab=offers');
  await expect(page.getByText(/数据时间|报价可能已变化/).first()).toBeVisible();
  await page.getByRole('link', { name: '重新比价' }).first().click();
  await expect(page).toHaveURL(/\/compare\?/);
});
```

Every test uses the real UI in one browser context and asserts no console errors, page errors, or HTTP responses ≥400.

- [ ] **Step 2: Run E2E RED before any test-only workaround**

Run: `pnpm test:e2e -- --grep "local closed loop"`

Expected: FAIL on the first missing or inconsistent public behavior; keep that evidence in the implementation report.

- [ ] **Step 3: Fix only genuine integration gaps exposed by E2E**

Do not seed Zustand through `page.evaluate`, inject localStorage, relax assertions, or bypass loading states. Use actual UI setup helpers shared within the spec file.

- [ ] **Step 4: Extend responsive coverage**

At 390×844, validate `/`, `/square`, one detail route, `/profile`, `/trips`, `/compare`, `/partners`, `/assistant`, and one guardian route after route-specific readiness, fonts, and images. Measure horizontal overflow with navigation closed and open.

- [ ] **Step 5: Extend accessibility and motion coverage**

Run Axe on home, square, detail, profile, trips, and compare; assert no critical/serious violations. Exercise carousel focus pause, gallery focus, tabs, dialogs, Escape restore, and `reducedMotion: 'reduce'` with no autoplay/parallax.

- [ ] **Step 6: Run all three E2E specs and then the exact full command**

Run: `pnpm test:e2e -- tests/e2e/local-library.spec.ts tests/e2e/core-journey.spec.ts tests/e2e/responsive.spec.ts tests/e2e/accessibility.spec.ts`

Run: `pnpm test:e2e`

Expected: all tests pass in the locally installed Chrome channel.

- [ ] **Step 7: Commit Task 10**

```bash
git add tests/e2e/local-library.spec.ts tests/e2e/core-journey.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/responsive.spec.ts
git commit -m "test: verify the complete local travel library"
```

### Task 11: Full Regression, Product Design QA, and Production Deployment

**Files:**
- Modify: `design-qa.md`
- Create: `artifacts/design-qa-2026-08-19/` screenshots and comparison boards
- Create: `docs/reports/2026-08-19-xingyu-closed-loop.md`
- Modify: production source/tests only when a Design QA P0/P1/P2 finding has a regression test and verified fix.

**Interfaces:**
- Consumes: approved source visuals, rendered local implementation, full test suite, existing Vercel project.
- Produces: `design-qa.md` with `final result: passed`, verified Vercel Production URL, and rollback-ready commit history.

- [ ] **Step 1: Run complete local verification from a clean worktree**

Run: `pnpm lint`

Run: `pnpm typecheck`

Run: `pnpm test -- --maxWorkers=1 --reporter=dot`

Run: `pnpm test:e2e`

Run: `pnpm build`

Record exact file/test counts, elapsed time, warnings, and exit codes. A detached or truncated process without terminal evidence is not a pass.

- [ ] **Step 2: Read the Design QA rubric and capture normalized evidence in local Chrome**

Read: `C:/Users/lenovo/.codex/plugins/cache/openai-curated-remote/product-design/0.1.52/skills/design-qa/references/qa-rubric.md`

Capture 1440×1024 and 390×844 implementation screenshots after route-specific readiness, fonts loaded, and visible images complete. Capture hover, focus, selected, empty, expired, and hydration-error states where relevant.

- [ ] **Step 3: Build same-input visual comparison boards**

Combine `docs/design/selected-homepage-option-1.png` with the homepage implementation and `docs/design/xingyu-content-hub-target.png` with square/detail/profile implementations. Record source pixels, implementation pixels, CSS viewport, and density normalization in `design-qa.md`.

- [ ] **Step 4: Review the five required fidelity surfaces**

Evaluate fonts/typography, spacing/layout rhythm, colors/tokens, image quality/asset fidelity, and copy/content. Also verify icons, states, touch/keyboard, responsiveness, and accessibility.

- [ ] **Step 5: Iterate every P0/P1/P2 finding through RED → fix → recapture → compare**

Keep `final result: blocked` until no actionable P0/P1/P2 remains. Each iteration records the earlier finding, exact fix, post-fix screenshot, and comparison evidence. Commit each production fix with its regression test before continuing to the next finding.

- [ ] **Step 6: Commit the verified implementation and QA evidence**

```bash
git add design-qa.md artifacts/design-qa-2026-08-19 docs/reports/2026-08-19-xingyu-closed-loop.md
git commit -m "docs: record xingyu design qa and release evidence"
```

- [ ] **Step 7: Deploy a Vercel Preview and verify it before Production**

Use the Vercel deployment skill/CLI linked to the existing `xingyu-travel` project. Verify build status READY, routes, assets, local-storage flows, security headers, console, and no authentication prompt on the candidate Production URL.

- [ ] **Step 8: Promote the verified deployment to Production**

Confirm Production remains public while SSO protects Preview only. Do not alter team-wide authentication settings or unrelated projects.

- [ ] **Step 9: Verify the public handoff URL in a fresh unauthenticated browser context**

Open `https://xingyu-travel.vercel.app`, complete the four closed-loop stories, verify assets and image optimization, and confirm no console/page/HTTP errors. Record the final deployment ID and commit hash in the final report.

- [ ] **Step 10: Final status and rollback record**

Ensure `git status --short` is clean, identify the last known-good Production deployment, and include rollback instructions without executing a rollback.

## Plan Self-Review

- **Spec coverage:** Tasks 1–5 cover local state and personal hub; Tasks 6–9 cover content, imagery, motion, guide experience, home, and navigation; Tasks 10–11 cover all acceptance, Design QA, and Vercel requirements.
- **Type consistency:** `ProfilePreferences`, `LibraryStoreState`, `FavoriteOfferSnapshot`, `savePostAsTrip`, `TripCollection`, `FavoriteButton`, `GuideGallery`, and `DestinationFilmCarousel` are defined before their consumers.
- **Safety:** No task adds real account, payment, booking, background push, or sensitive-data collection. External booking confirmation and emergency boundaries remain regression-tested.
- **Visual integrity:** Every generated photo is a real project asset with a per-image prompt and inspection record; no CSS art, placeholder, sprite crop, scraped brand photography, or unreviewed asset is permitted.
- **No placeholders:** Each task names exact files, interfaces, test assertions, commands, expected RED/GREEN results, and commit scope.
