import { expect, test } from '@playwright/test';

type Page = import('@playwright/test').Page;
type ResponsiveCase = {
  route: string;
  prepare?: (page: Page) => Promise<void>;
  ready: (page: Page) => Promise<void>;
};

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

async function waitForResponsiveReady(page: Page, routeReady: () => Promise<void>) {
  await expect(page.locator('main')).toBeVisible();
  await routeReady();

  const images = page.locator('img');
  for (let index = 0; index < await images.count(); index += 1) {
    await images.nth(index).scrollIntoViewIfNeeded();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => page.evaluate(() => ({
    document: document.readyState,
    fonts: document.fonts.status,
    images: [...document.images].every((image) => image.complete),
  })), { timeout: 10_000 }).toEqual({ document: 'complete', fonts: 'loaded', images: true });

  const menu = page.getByRole('button', { name: '打开导航' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await expect(page.getByRole('button', { name: '关闭导航' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: '关闭导航' }).click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
}

async function expectNoHorizontalOverflow(page: Page) {
  const width = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(Math.max(width.body, width.document)).toBeLessThanOrEqual(width.viewport);
}

async function expectClosedAndOpenLayoutsFit(page: Page) {
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: '打开导航' }).click();
  await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '真实比价' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

async function expectDisclosureClearsMainContent(page: Page) {
  const [disclosureBox, contentBox] = await Promise.all([
    page.getByRole('note', { name: '演示环境说明' }).boundingBox(),
    page.locator('body > main > :first-child').first().boundingBox(),
  ]);

  expect(disclosureBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(contentBox!.y).toBeGreaterThanOrEqual(disclosureBox!.y + disclosureBox!.height);
}

async function createDaliTripThroughUi(page: Page, enableGuardian = false) {
  await page.goto('/square/dali-slow-5d', { waitUntil: 'commit' });
  const convert = page.getByRole('button', { name: '转为行程' });
  await expect(convert).toBeEnabled();
  await convert.click();
  await page.getByRole('button', { name: '确认并保存行程' }).click();
  await expect(page).toHaveURL(/\/trips\/dali-slow-5d$/);
  await expect(page.getByRole('region', { name: '行程设置' })).toBeVisible();

  if (!enableGuardian) return;
  await page.getByRole('switch', { name: '行程守护演示' }).click();
  await page.getByLabel('我明确同意开启本地守护演示').check();
  await page.getByRole('button', { name: '确认开启' }).click();
  await expect(page.getByRole('switch', { name: '行程守护演示' })).toHaveAttribute('aria-checked', 'true');
}

const responsiveCases: ResponsiveCase[] = [
  {
    route: '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
    ready: async (page) => { await expect(page.getByText('¥1,010 含税总价')).toBeVisible(); },
  },
  {
    route: '/square',
    ready: async (page) => { await expect(page.getByRole('button', { name: '查看兴趣偏好' })).toBeVisible(); },
  },
  {
    route: '/square/dali-slow-5d',
    ready: async (page) => {
      await expect(page.getByRole('region', { name: /攻略图片画廊/ })).toBeVisible();
    },
  },
  {
    route: '/profile',
    ready: async (page) => { await expect(page.getByRole('heading', { name: '你好，行屿旅人' })).toBeVisible(); },
  },
  {
    route: '/trips',
    prepare: async (page) => { await createDaliTripThroughUi(page); },
    ready: async (page) => { await expect(page.getByRole('heading', { name: '我的行程' })).toBeVisible(); },
  },
  {
    route: '/partners',
    ready: async (page) => { await expect(page.getByRole('button', { name: '发布匹配意愿' })).toBeVisible(); },
  },
  {
    route: '/assistant',
    ready: async (page) => { await expect(page.getByLabel('你的问题')).toBeVisible(); },
  },
  {
    route: '/guardian/dali-slow-5d',
    prepare: async (page) => { await createDaliTripThroughUi(page, true); },
    ready: async (page) => { await expect(page.getByRole('button', { name: /选择 Plan A/ })).toBeVisible(); },
  },
];

test.describe('mobile public MVP', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('mobile navigation is available without horizontal overflow', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await waitForResponsiveReady(page, async () => {
      await expect(page.getByRole('button', { name: '开始规划' })).toBeVisible();
    });
    await expectClosedAndOpenLayoutsFit(page);
  });

  for (const { route, prepare, ready } of responsiveCases) {
    test(`does not horizontally overflow on ${route}`, async ({ page }) => {
      if (prepare) await prepare(page);
      await page.goto(route, { waitUntil: 'commit' });
      await waitForResponsiveReady(page, () => ready(page));
      await expectDisclosureClearsMainContent(page);
      await expectClosedAndOpenLayoutsFit(page);
    });
  }
});

test.describe('desktop design disclosure', () => {
  test.use({ viewport: { width: 1440, height: 1024 } });

  test('keeps the demo disclosure readable outside the fixed navigation', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.getByRole('note', { name: '演示环境说明' })).toBeVisible();

    const [headerBox, disclosureBox] = await Promise.all([
      page.locator('header').boundingBox(),
      page.getByRole('note', { name: '演示环境说明' }).boundingBox(),
    ]);

    expect(headerBox).not.toBeNull();
    expect(disclosureBox).not.toBeNull();
    expect(disclosureBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  });

  test('keeps the planning controls and signature destination film in the first viewport', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForFunction(() => document.fonts.status === 'loaded');

    const [titleBox, composerBox, destinationBox] = await Promise.all([
      page.getByRole('heading', { name: '把远方， 变成一段安心抵达的旅程' }).boundingBox(),
      page.locator('form[action="/compare"]').boundingBox(),
      page.getByRole('region', { name: '目的地旅行取景窗' }).boundingBox(),
    ]);

    expect(titleBox).not.toBeNull();
    expect(composerBox).not.toBeNull();
    expect(destinationBox).not.toBeNull();
    expect.soft(titleBox!.y).toBeLessThanOrEqual(210);
    expect.soft(composerBox!.y).toBeLessThanOrEqual(540);
    expect.soft(destinationBox!.y).toBeLessThanOrEqual(1024);
  });
});
