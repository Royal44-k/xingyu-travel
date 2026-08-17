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

test.describe('mobile public MVP', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('mobile navigation is available without horizontal overflow', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '打开导航' })).toBeVisible();
    await page.getByRole('button', { name: '打开导航' }).click();
    await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '真实比价' })).toBeVisible();

    const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
    expect(width.body).toBeLessThanOrEqual(width.viewport);
  });

  for (const route of [
    '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
    '/square',
    '/trips/dali-slow-5d',
    '/partners',
    '/assistant',
    '/guardian/dali-slow-5d',
  ]) {
    test(`does not horizontally overflow on ${route}`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
      expect(width.body).toBeLessThanOrEqual(width.viewport);
    });
  }
});
