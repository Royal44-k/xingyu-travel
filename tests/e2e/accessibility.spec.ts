import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const runtimeErrors = new WeakMap<import('@playwright/test').Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`);
  });
});

test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});

const publicRoutes = [
  '/',
  '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
  '/square',
  '/partners',
  '/assistant',
  '/guardian/dali-slow-5d',
] as const;

for (const route of publicRoutes) {
  test(`has no critical or serious axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
  });
}

test('search main path and search tabs work from the keyboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const flightTab = page.getByRole('tab', { name: '机票' });
  await flightTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '酒店' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(flightTab).toHaveAttribute('aria-selected', 'true');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('textbox', { name: '到达地' })).toBeFocused();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('大理');
  await page.getByRole('button', { name: '开始规划' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/compare\?/);
});

test('filter dialog traps focus, closes with Escape, and restores its trigger', async ({ page }) => {
  await page.goto('/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2');
  const trigger = page.getByRole('button', { name: '筛选条件' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '筛选条件' });
  await expect(dialog).toBeVisible();
  const first = page.getByRole('button', { name: '关闭筛选' });
  const last = page.getByRole('button', { name: '应用筛选' });
  await expect(first).toBeFocused();
  await last.focus();
  await page.keyboard.press('Tab');
  await expect(first).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(last).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('external quote confirmation remains in the local demo', async ({ page }) => {
  await page.goto('/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2');
  await page.getByRole('button', { name: /查看 .*演示报价/ }).first().click();
  await expect(page.getByRole('dialog', { name: '前往外部供应商' })).toBeVisible();
  await page.getByRole('button', { name: /确认前往外部页面/ }).click();
  await expect(page).toHaveURL(/\/compare\?/);
});

test('reduced motion removes smooth scrolling and motion transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  const duration = await page.getByRole('tabpanel').evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
  expect(duration).toBeLessThanOrEqual(0.00001);
});
