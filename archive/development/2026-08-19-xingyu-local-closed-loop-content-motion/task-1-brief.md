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

