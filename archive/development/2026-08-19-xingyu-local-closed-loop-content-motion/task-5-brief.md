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

