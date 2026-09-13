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

