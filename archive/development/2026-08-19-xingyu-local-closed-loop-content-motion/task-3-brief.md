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

