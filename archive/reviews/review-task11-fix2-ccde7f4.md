# Commits
ccde7f4 test: cover hydrated mobile trip workbench

# Diff stat
 .../2026-08-16-xingyu-public-mvp/task-11-report.md | 25 ++++++++
 tests/e2e/responsive.spec.ts                       | 71 ++++++++++++++--------
 2 files changed, 69 insertions(+), 27 deletions(-)

# Full diff
diff --git a/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md
index a25bc61..ecdc4a2 100644
--- a/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md
+++ b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md
@@ -86,10 +86,35 @@ This round reviewed the committed Task 11 baseline at `b7023ff` and preserved it
 | dialog focus mutation RED / restored GREEN | 1 failed at last-to-first wrap / 1 passed (4.2s) |
 | complete accessibility spec | 10 passed (18.7s) |
 | three Task 11 specs together, one worker | 18 passed (33.5s) |
 | `pnpm test:e2e` | 18 passed (21.3s), exit 0 |
 | focused partner component | 7 passed |
 | focused partner domain unit | 45 passed |
 | final `pnpm test` | 29 files / 215 tests passed (61.31s) |
 | final `pnpm verify` | exit 0: eslint, typecheck, 29 files / 215 tests, and Next production build completed |
 
 `next-env.d.ts` was verified byte-for-byte against the HEAD blob after Next dev rewrote its generated route reference; the generated change was excluded. Final status contains only this fix round's source, test, and report files.
+
+## Fix round 2 — hydrated mobile trip workbench
+
+This surgical round reviewed baseline `59a6f62` and changed no production code. The responsive trip case now proves the real hydrated `TripWorkbench`, rather than treating the clean-context recovery page as sufficient coverage.
+
+### Strict RED to GREEN
+
+- RED: the trip route's readiness assertion was first changed to require the workbench-only `大理慢行计划` heading and `行程设置` region. With no setup, the isolated case failed because a clean browser context rendered `未找到本地行程草稿`; terminal result was 1 failed (6.6s).
+- GREEN: the table case gained a typed `prepare` callback that stays in the same Playwright page/context and uses only public UI: `/square/dali-slow-5d` → `转为行程` → `确认并保存草稿` → `/trips/dali-slow-5d`. It does not inject local storage or call `page.evaluate` to create state. The isolated case then passed (1 passed, 5.7s).
+- After the real workbench is visible, the shared readiness helper waits for the route-specific UI, document completion, loaded fonts, and completed lazy images, and proves header hydration with a menu open/close round trip. The final assertion measures `scrollWidth <= innerWidth` at 390×844 with the mobile menu both closed and open.
+- Existing `console.error`, `pageerror`, and HTTP `>=400` guards remain active throughout the UI preparation and both layout states.
+
+### Fresh terminal evidence
+
+| Command / scope | Terminal result |
+| --- | --- |
+| trip responsive case before UI preparation | 1 failed (6.6s): workbench-only heading absent on the recovery page |
+| trip responsive case after real UI preparation | 1 passed (5.7s) |
+| `responsive.spec.ts --workers=1 --reporter=list` | 7 passed (15.1s) |
+| core, responsive, and accessibility specs together, one worker | 18 passed (37.4s) |
+| `pnpm test:e2e` | 18 passed (23.6s), exit 0 |
+| `pnpm test` | 29 files / 215 tests passed (87.50s), exit 0 |
+| final `pnpm verify` | exit 0: eslint, typecheck, 29 files / 215 tests passed (88.91s), and Next production build completed |
+
+The first sandboxed `pnpm verify` attempt had already passed lint, typecheck, and all 215 Vitest checks, but its build could not connect to Google Fonts for the configured Noto families. Re-running the unchanged command in a network-enabled build context completed successfully. Playwright emitted only the environmental `NO_COLOR`/`FORCE_COLOR` warning; no application runtime guard fired.
diff --git a/tests/e2e/responsive.spec.ts b/tests/e2e/responsive.spec.ts
index d3ba6ac..3f54ca3 100644
--- a/tests/e2e/responsive.spec.ts
+++ b/tests/e2e/responsive.spec.ts
@@ -1,13 +1,18 @@
 import { expect, test } from '@playwright/test';
 
 type Page = import('@playwright/test').Page;
+type ResponsiveCase = {
+  route: string;
+  prepare?: (page: Page) => Promise<void>;
+  ready: (page: Page) => Promise<void>;
+};
 
 const runtimeErrors = new WeakMap<import('@playwright/test').Page, string[]>();
 
 test.beforeEach(async ({ page }) => {
   const errors: string[] = [];
   runtimeErrors.set(page, errors);
   page.on('console', (message) => {
     if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
   });
   page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
@@ -59,54 +64,66 @@ async function expectNoHorizontalOverflow(page: Page) {
   expect(Math.max(width.body, width.document)).toBeLessThanOrEqual(width.viewport);
 }
 
 async function expectClosedAndOpenLayoutsFit(page: Page) {
   await expectNoHorizontalOverflow(page);
   await page.getByRole('button', { name: '打开导航' }).click();
   await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '真实比价' })).toBeVisible();
   await expectNoHorizontalOverflow(page);
 }
 
+const responsiveCases: ResponsiveCase[] = [
+  {
+    route: '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
+    ready: async (page) => { await expect(page.getByText('¥1,010 含税总价')).toBeVisible(); },
+  },
+  {
+    route: '/square',
+    ready: async (page) => { await expect(page.getByRole('button', { name: '查看兴趣偏好' })).toBeVisible(); },
+  },
+  {
+    route: '/trips/dali-slow-5d',
+    prepare: async (page) => {
+      await page.goto('/square/dali-slow-5d', { waitUntil: 'commit' });
+      await page.getByRole('button', { name: '转为行程' }).click();
+      await page.getByRole('button', { name: '确认并保存草稿' }).click();
+      await expect(page).toHaveURL(/\/trips\/dali-slow-5d$/);
+    },
+    ready: async (page) => {
+      await expect(page.getByRole('heading', { name: '大理慢行计划' })).toBeVisible();
+      await expect(page.getByRole('region', { name: '行程设置' })).toBeVisible();
+    },
+  },
+  {
+    route: '/partners',
+    ready: async (page) => { await expect(page.getByRole('button', { name: '发布匹配意愿' })).toBeVisible(); },
+  },
+  {
+    route: '/assistant',
+    ready: async (page) => { await expect(page.getByLabel('你的问题')).toBeVisible(); },
+  },
+  {
+    route: '/guardian/dali-slow-5d',
+    ready: async (page) => { await expect(page.getByRole('button', { name: /选择 Plan A/ })).toBeVisible(); },
+  },
+];
+
 test.describe('mobile public MVP', () => {
   test.use({ viewport: { width: 390, height: 844 } });
 
   test('mobile navigation is available without horizontal overflow', async ({ page }) => {
     await page.goto('/', { waitUntil: 'commit' });
     await waitForResponsiveReady(page, async () => {
       await expect(page.getByRole('button', { name: '开始规划' })).toBeVisible();
     });
     await expectClosedAndOpenLayoutsFit(page);
   });
 
-  for (const { route, ready } of [
-    {
-      route: '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
-      ready: async (page: Page) => { await expect(page.getByText('¥1,010 含税总价')).toBeVisible(); },
-    },
-    {
-      route: '/square',
-      ready: async (page: Page) => { await expect(page.getByRole('button', { name: '查看兴趣偏好' })).toBeVisible(); },
-    },
-    {
-      route: '/trips/dali-slow-5d',
-      ready: async (page: Page) => { await expect(page.getByRole('heading', { name: '未找到本地行程草稿' })).toBeVisible(); },
-    },
-    {
-      route: '/partners',
-      ready: async (page: Page) => { await expect(page.getByRole('button', { name: '发布匹配意愿' })).toBeVisible(); },
-    },
-    {
-      route: '/assistant',
-      ready: async (page: Page) => { await expect(page.getByLabel('你的问题')).toBeVisible(); },
-    },
-    {
-      route: '/guardian/dali-slow-5d',
-      ready: async (page: Page) => { await expect(page.getByRole('button', { name: /选择 Plan A/ })).toBeVisible(); },
-    },
-  ] as const) {
+  for (const { route, prepare, ready } of responsiveCases) {
     test(`does not horizontally overflow on ${route}`, async ({ page }) => {
-      await page.goto(route, { waitUntil: 'commit' });
+      if (prepare) await prepare(page);
+      else await page.goto(route, { waitUntil: 'commit' });
       await waitForResponsiveReady(page, () => ready(page));
       await expectClosedAndOpenLayoutsFit(page);
     });
   }
 });
