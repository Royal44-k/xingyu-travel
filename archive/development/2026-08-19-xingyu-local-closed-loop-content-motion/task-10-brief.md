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

