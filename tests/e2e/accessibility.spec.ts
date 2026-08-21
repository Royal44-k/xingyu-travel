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

type Page = import('@playwright/test').Page;

async function createDaliTripThroughUi(page: Page) {
  await page.goto('/square/dali-slow-5d');
  const convert = page.getByRole('button', { name: '转为行程' });
  await expect(convert).toBeEnabled();
  await convert.click();
  await page.getByRole('button', { name: '确认并保存行程' }).click();
  await expect(page).toHaveURL(/\/trips\/dali-slow-5d$/);
  await expect(page.getByRole('region', { name: '行程设置' })).toBeVisible();
}

const publicRoutes: readonly {
  route: string;
  prepare?: (page: Page) => Promise<void>;
  ready: (page: Page) => Promise<void>;
}[] = [
  { route: '/', ready: async (page) => { await expect(page.getByRole('region', { name: '目的地旅行取景窗' })).toBeVisible(); } },
  { route: '/square', ready: async (page) => { await expect(page.getByRole('button', { name: '查看兴趣偏好' })).toBeVisible(); } },
  { route: '/square/dali-slow-5d', ready: async (page) => { await expect(page.getByRole('region', { name: /攻略图片画廊/ })).toBeVisible(); } },
  { route: '/profile', ready: async (page) => { await expect(page.getByRole('heading', { name: '你好，行屿旅人' })).toBeVisible(); } },
  { route: '/trips', prepare: createDaliTripThroughUi, ready: async (page) => { await expect(page.getByRole('heading', { name: '我的行程' })).toBeVisible(); } },
  { route: '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2', ready: async (page) => { await expect(page.getByText('¥1,010 含税总价')).toBeVisible(); } },
];

test('publishes a dedicated 行屿 favicon instead of the former travel photograph', async ({ page }) => {
  await page.goto('/');
  const iconHrefs = await page.locator('link[rel~="icon"]').evaluateAll((links) =>
    links.map((link) => (link as HTMLLinkElement).href));

  expect(iconHrefs).not.toEqual(expect.arrayContaining([
    expect.stringContaining('guardian-rainy-mountain'),
  ]));
  expect(iconHrefs.some((href) => /favicon\.ico|\/icon/.test(href))).toBe(true);

  const favicon = await page.request.get('/favicon.ico');
  expect(favicon.status()).toBe(200);
  expect(favicon.headers()['content-type']).toContain('image/x-icon');
  expect((await favicon.body()).length).toBeGreaterThan(1_000);
});

for (const { route, prepare, ready } of publicRoutes) {
  test(`has no critical or serious axe violations on ${route}`, async ({ page }) => {
    if (prepare) await prepare(page);
    await page.goto(route);
    await ready(page);
    await page.evaluate(() => document.fonts.ready);
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

test('destination carousel pauses while keyboard focus remains inside', async ({ page }) => {
  await page.goto('/');
  const carousel = page.getByRole('region', { name: '目的地旅行取景窗' });
  await carousel.focus();
  await expect(carousel).toBeFocused();
  const position = page.getByRole('status', { name: '目的地位置' });
  const initialPosition = await position.textContent();
  await page.waitForTimeout(6_200);
  await expect(position).toHaveText(initialPosition ?? '');
  await page.keyboard.press('End');
  await expect(page.getByRole('button', { name: '查看厦门' })).toHaveAttribute('aria-pressed', 'true');
});

test('guide gallery supports keyboard focus and positional navigation', async ({ page }) => {
  await page.goto('/square/dali-slow-5d');
  const gallery = page.getByRole('region', { name: /攻略图片画廊/ });
  await gallery.focus();
  await expect(gallery).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('status', { name: '图片位置' })).toHaveText('4 / 4');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('status', { name: '图片位置' })).toHaveText('3 / 4');
});

test('profile tabs use arrow keys and move focus with the active tab', async ({ page }) => {
  await page.goto('/profile');
  const overview = page.getByRole('tab', { name: '概览' });
  await overview.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '我的行程' })).toBeFocused();
  await expect(page.getByRole('tab', { name: '我的行程' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: '兴趣偏好' })).toBeFocused();
});

test('trip conversion dialog closes with Escape and restores its trigger', async ({ page }) => {
  await page.goto('/square/dali-slow-5d');
  const trigger = page.getByRole('button', { name: '转为行程' });
  await expect(trigger).toBeEnabled();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '确认行程草稿' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
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

test('reduced motion removes autoplay, parallax, smooth scrolling, and motion transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  const viewport = page.getByTestId('destination-film-viewport');
  await expect(viewport).toHaveAttribute('data-parallax', 'disabled');
  const position = page.getByRole('status', { name: '目的地位置' });
  const initialPosition = await position.textContent();
  await page.waitForTimeout(6_200);
  await expect(position).toHaveText(initialPosition ?? '');
  await expect(viewport).toHaveCSS('transform', 'none');
  const duration = await page.getByRole('tabpanel').evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
  expect(duration).toBeLessThanOrEqual(0.00001);
});
