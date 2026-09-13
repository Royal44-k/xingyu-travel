## Task 7: 行程工作台与同行决策室

**Files:**
- Create: `src/stores/trip-store.ts`
- Modify existing: `src/app/trips/[slug]/page.tsx` (the repository already has this dynamic route; Next.js cannot also create sibling `[id]`)
- Create: `src/features/trips/trip-workbench.tsx`
- Create: `src/features/trips/itinerary-editor.tsx`
- Create: `src/features/trips/decision-room.tsx`
- Create: `src/features/trips/trips.module.css`
- Create: `tests/unit/trip-store.test.ts`
- Create: `tests/component/trip-workbench.test.tsx`

**Interfaces:**
- Produces: `useTripStore`，支持 `acceptDraft`、`updateItem`、`reorderItem`、`vote`、`enableGuardian`。
- Persists: 仅将非敏感演示状态写入 `localStorage` key `xingyu-demo-v1`。
- Compatibility ruling: expand the existing `/trips/[slug]` handoff route from Task 6 and ingest its hydrated browser-local draft; do not create a conflicting second dynamic folder.

- [ ] **Step 1: 写状态转移失败测试**

```ts
it('accepts a reviewed draft and enables guardian only after consent', () => {
  const store = createTripStore();
  store.getState().acceptDraft(daliDraft);
  expect(store.getState().trips[daliDraft.id].status).toBe('active');
  store.getState().enableGuardian(daliDraft.id, true);
  expect(store.getState().trips[daliDraft.id].guardianEnabled).toBe(true);
});
```

- [ ] **Step 2: 实现 store 与显式状态机**

```ts
const allowedTransitions: Record<TripStatus, TripStatus[]> = {
  review: ['active', 'discarded'], active: ['guarded', 'archived'], guarded: ['active', 'archived'], discarded: [], archived: [],
};
export function transitionTrip(status: TripStatus, next: TripStatus): TripStatus {
  if (!allowedTransitions[status].includes(next)) throw new Error(`TRIP_INVALID_TRANSITION:${status}:${next}`);
  return next;
}
```

- [ ] **Step 3: 实现行程编辑与决策室**

工作台必须支持改日期/预算、重新排序五个节点、标记备选、三位演示成员投票、预算合计、进入比价、发布搭子意愿和守护授权。位置只到城市/景点，不出现实时坐标。

- [ ] **Step 4: 验证和提交**

Run: `pnpm vitest run tests/unit/trip-store.test.ts tests/component/trip-workbench.test.tsx`

Expected: PASS。

```powershell
git add src/app/trips src/features/trips src/stores/trip-store.ts tests
git commit -m "feat: add itinerary workbench and decision room"
```
