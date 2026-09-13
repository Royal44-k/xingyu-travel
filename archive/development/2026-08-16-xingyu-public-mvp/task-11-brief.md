## Task 11: 完整旅程 E2E、响应式与可访问性

**Files:**
- Create: `tests/e2e/core-journey.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Modify: `playwright.config.ts`
- Modify: affected CSS Modules and components from Tasks 4–10

**Interfaces:**
- Consumes: 所有公共页面和主链路。
- Produces: 可重复的桌面、移动端和可访问性验收。

- [ ] **Step 1: 写完整旅程失败测试**

```ts
test('guide to guarded alternative plan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: '机票' }).click();
  await page.getByLabel('目的地').fill('大理');
  await page.getByRole('button', { name: '开始规划' }).click();
  await expect(page.getByText('含税总价')).toBeVisible();
  await page.goto('/square/dali-slow-5d');
  await page.getByRole('button', { name: '转为行程' }).click();
  await page.getByRole('button', { name: '确认行程草稿' }).click();
  await page.getByRole('button', { name: '发布搭子意愿' }).click();
  await page.getByRole('button', { name: '愿意认识木雨' }).click();
  await page.getByRole('link', { name: '进入聊天' }).click();
  await page.goto('/guardian/dali-slow-5d');
  await expect(page.getByRole('heading', { name: '备选方案' })).toBeVisible();
});
```

- [ ] **Step 2: 运行 E2E 确认真实失败点**

Run: `pnpm exec playwright install chromium && pnpm test:e2e tests/e2e/core-journey.spec.ts`

Expected: 初次运行暴露路由、选择器或状态衔接缺口；逐个记录而不是批量猜测。

- [ ] **Step 3: 修复主链路并添加移动端断言**

```ts
test.use({ viewport: { width: 390, height: 844 } });
test('mobile navigation and search have no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
  expect(width.body).toBeLessThanOrEqual(width.viewport);
  await page.getByRole('button', { name: '打开导航' }).click();
  await expect(page.getByRole('link', { name: '真实比价' })).toBeVisible();
});
```

- [ ] **Step 4: 添加 axe 和 reduced-motion 验证**

```ts
import AxeBuilder from '@axe-core/playwright';
test('home has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([]);
});
```

- [ ] **Step 5: 运行完整工程验证并提交**

Run: `pnpm verify && pnpm test:e2e`

Expected: 全部 PASS，浏览器控制台无未处理错误。

```powershell
git add tests/e2e src
git commit -m "test: verify the complete xingyu travel journey"
```
