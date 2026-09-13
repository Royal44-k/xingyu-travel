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

