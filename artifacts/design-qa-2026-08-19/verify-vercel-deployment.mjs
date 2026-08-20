import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, expect as baseExpect } from '@playwright/test';

const expect = baseExpect.configure({ timeout: 30_000 });

const targetUrl = process.env.XINGYU_TARGET_URL;
const usePreviewBypass = process.env.XINGYU_PREVIEW_BYPASS === '1';
const resultName = process.env.XINGYU_RESULT_NAME ?? 'vercel-verification.json';
const artifactDir = new URL('.', import.meta.url);

if (!targetUrl) throw new Error('XINGYU_TARGET_URL is required');

const normalizedTarget = new URL(targetUrl);
const result = {
  targetUrl: normalizedTarget.origin,
  mode: usePreviewBypass ? 'protected-preview' : 'public-production',
  browser: 'Google Chrome (Playwright channel: chrome)',
  startedAt: new Date().toISOString(),
  unauthenticated: null,
  routes: [],
  assets: [],
  securityHeaders: {},
  loops: [],
  runtimeErrors: [],
  runtimeWarnings: [],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function getPreviewBypassSecret() {
  const appData = process.env.APPDATA;
  if (!appData) throw new Error('APPDATA is unavailable');

  const authPath = [
    join(appData, 'xdg.data', 'com.vercel.cli', 'auth.json'),
    join(appData, 'com.vercel.cli', 'auth.json'),
  ].find((candidate) => existsSync(candidate));
  assert(authPath, 'Vercel CLI auth.json unavailable');
  const auth = JSON.parse(readFileSync(authPath, 'utf8'));
  assert(typeof auth.token === 'string' && auth.token.length > 0, 'Vercel CLI token unavailable');

  const projectId = 'prj_IeyWF8pZrE35C9Sp6eJWHcFpIiCl';
  const teamId = 'team_GXUbEGjD0inFlQqufnaKsSVQ';
  const response = await fetch(
    `https://api.vercel.com/v1/projects/${projectId}/protection-bypass?teamId=${teamId}`,
    {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${auth.token}`,
        'content-type': 'application/json',
      },
      body: '{}',
    },
  );
  assert(response.ok, `Vercel bypass API returned ${response.status}`);
  const payload = await response.json();
  const protectionBypass = payload.protectionBypass;
  assert(protectionBypass && typeof protectionBypass === 'object', 'No protection bypass map returned');
  const secret = Object.keys(protectionBypass).find(
    (candidate) => protectionBypass[candidate]?.scope === 'automation-bypass',
  );
  assert(secret, 'No automation bypass token returned');
  return secret;
}

function monitorPage(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      result.runtimeErrors.push(`${label}: console.error: ${message.text()}`);
    } else if (message.type() === 'warning') {
      result.runtimeWarnings.push(`${label}: console.warn: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    result.runtimeErrors.push(`${label}: pageerror: ${error.message}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      result.runtimeErrors.push(`${label}: http ${response.status()}: ${response.url()}`);
    }
  });
}

async function waitForReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0
        && rect.height > 0
        && rect.bottom > 0
        && rect.right > 0
        && rect.top < window.innerHeight
        && rect.left < window.innerWidth;
    }).every((image) => image.naturalWidth > 0),
    undefined,
    { timeout: 60_000 },
  );
}

async function newContext(browser, extraHTTPHeaders = {}) {
  return browser.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 1,
    extraHTTPHeaders,
  });
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  let extraHTTPHeaders = {};
  if (usePreviewBypass) {
    const unauthContext = await newContext(browser);
    const unauthPage = await unauthContext.newPage();
    unauthPage.setDefaultTimeout(15_000);
    const unauthResponse = await unauthPage.goto(normalizedTarget.origin, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    const redirected = new URL(unauthPage.url());
    assert(redirected.hostname === 'vercel.com' && redirected.pathname === '/login', 'Preview did not require Vercel SSO');
    result.unauthenticated = {
      status: unauthResponse?.status() ?? null,
      finalOrigin: redirected.origin,
      finalPath: redirected.pathname,
      result: 'expected Preview SSO login',
    };
    await unauthContext.close();

    const bypassSecret = await getPreviewBypassSecret();
    extraHTTPHeaders = {
      'x-vercel-protection-bypass': bypassSecret,
      'x-vercel-set-bypass-cookie': 'true',
    };
  } else {
    result.unauthenticated = {
      result: 'fresh context; no credentials or bypass headers supplied',
    };
  }

  const routeCases = [
    ['/', '首页'],
    ['/square', '灵感广场'],
    ['/square/dali-slow-5d', '攻略详情'],
    ['/profile', '个人中心'],
    ['/trips', '我的行程'],
    ['/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&origin=%E4%B8%8A%E6%B5%B7&from=2026-09-18&to=2026-09-22&travelers=3', '统一比价'],
    ['/partners', '旅游搭子'],
    ['/assistant', 'AI 旅行助手'],
    ['/guardian/dali-slow-5d', '行程守护'],
  ];

  const smokeContext = await newContext(browser, extraHTTPHeaders);
  for (const [route, label] of routeCases) {
    const page = await smokeContext.newPage();
    page.setDefaultTimeout(30_000);
    monitorPage(page, `route ${route}`);
    const response = await page.goto(new URL(route, normalizedTarget.origin).href, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    assert(response?.status() === 200, `${route} returned ${response?.status()}`);
    assert(new URL(page.url()).hostname === normalizedTarget.hostname, `${route} escaped deployment host`);
    await waitForReady(page);
    await expect(page.locator('main')).toBeVisible();
    result.routes.push({ route, label, status: response.status(), finalPath: new URL(page.url()).pathname });
    console.log(JSON.stringify({ stage: 'route', route, status: response.status() }));
    if (route === '/') {
      result.securityHeaders = {
        'x-content-type-options': response.headers()['x-content-type-options'],
        'referrer-policy': response.headers()['referrer-policy'],
        'permissions-policy': response.headers()['permissions-policy'],
        'x-frame-options': response.headers()['x-frame-options'],
      };
    }
    await page.close();
  }
  await smokeContext.close();

  assert(result.securityHeaders['x-content-type-options'] === 'nosniff', 'Missing nosniff');
  assert(result.securityHeaders['referrer-policy'] === 'strict-origin-when-cross-origin', 'Wrong referrer policy');
  assert(result.securityHeaders['permissions-policy'] === 'camera=(), microphone=(), geolocation=()', 'Wrong permissions policy');
  assert(result.securityHeaders['x-frame-options'] === 'SAMEORIGIN', 'Wrong frame policy');

  const assetCases = [
    '/assets/destinations/dali/01.png',
    '/_next/image?url=%2Fassets%2Fdestinations%2Fdali%2F01.png&w=1080&q=75',
  ];
  const assetContext = await newContext(browser, extraHTTPHeaders);
  const assetPage = await assetContext.newPage();
  monitorPage(assetPage, 'asset verification');
  await assetPage.goto(normalizedTarget.origin, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  for (const asset of assetCases) {
    const assetResult = await assetPage.evaluate(async (path) => {
      const response = await fetch(path, { cache: 'no-store' });
      const body = await response.arrayBuffer();
      return {
        status: response.status,
        contentType: response.headers.get('content-type'),
        byteLength: body.byteLength,
      };
    }, asset);
    assert(assetResult.status === 200, `${asset} returned ${assetResult.status}`);
    assert(assetResult.contentType?.startsWith('image/'), `${asset} is not an image`);
    assert(assetResult.byteLength > 0, `${asset} returned an empty body`);
    result.assets.push({
      path: asset,
      status: assetResult.status,
      contentType: assetResult.contentType,
      byteLength: assetResult.byteLength,
    });
    console.log(JSON.stringify({ stage: 'asset', path: asset, status: assetResult.status }));
  }
  await assetPage.close();
  await assetContext.close();

  async function runLoop(name, callback) {
    const context = await newContext(browser, extraHTTPHeaders);
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    monitorPage(page, `loop ${name}`);
    await callback(page);
    result.loops.push({ name, result: 'passed' });
    console.log(JSON.stringify({ stage: 'loop', name, result: 'passed' }));
    await context.close();
  }

  async function navigate(page, path) {
    const response = await page.goto(new URL(path, normalizedTarget.origin).href, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    assert(response?.status() === 200, `${path} returned ${response?.status()}`);
  }

  async function clickAndWaitForUrl(page, locator, url) {
    await Promise.all([
      page.waitForURL(url, { waitUntil: 'domcontentloaded', timeout: 60_000 }),
      locator.click(),
    ]);
  }

  await runLoop('interest clear -> re-add -> recommendation survives reload', async (page) => {
    await navigate(page, '/profile?tab=preferences');
    await expect(page.getByRole('heading', { name: '推荐与兴趣偏好' })).toBeVisible();
    await page.getByRole('button', { name: '清除全部兴趣' }).click();
    await page.getByRole('button', { name: '确认清除' }).click();
    await expect(page.getByRole('switch', { name: '个性化推荐' })).toBeDisabled();
    await page.getByRole('button', { name: '海岛', exact: true }).click();
    await page.getByRole('button', { name: '城市漫游', exact: true }).click();
    const recommendation = page.getByRole('switch', { name: '个性化推荐' });
    await expect(recommendation).toBeEnabled();
    await recommendation.click();
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('button', { name: '海岛', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '城市漫游', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(recommendation).toHaveAttribute('aria-checked', 'true');
  });

  await runLoop('like guide -> reload -> profile likes -> unlike', async (page) => {
    const title = '把大理留给慢下来的人：5 天洱海与白族村落路线';
    await navigate(page, '/square');
    const favorite = page.getByRole('button', { name: `喜欢 ${title}` });
    await expect(favorite).toBeEnabled();
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page.getByRole('button', { name: `喜欢 ${title}` })).toHaveAttribute('aria-pressed', 'true');
    await navigate(page, '/profile?tab=likes');
    await clickAndWaitForUrl(
      page,
      page.getByRole('link', { name: title, exact: true }),
      /\/square\/dali-slow-5d$/,
    );
    const detailFavorite = page.getByRole('button', { name: `喜欢 ${title}` });
    await expect(detailFavorite).toHaveAttribute('aria-pressed', 'true');
    await detailFavorite.click();
    await navigate(page, '/profile?tab=likes');
    await expect(page.getByRole('heading', { name: '喜欢的攻略会保存在这里' })).toBeVisible();
  });

  await runLoop('guide conversion -> My Trips -> workbench -> compare', async (page) => {
    await navigate(page, '/square/dali-slow-5d');
    const convert = page.getByRole('button', { name: '转为行程' });
    await expect(convert).toBeEnabled();
    await convert.click();
    await expect(page.getByRole('dialog', { name: '确认行程草稿' })).toBeVisible();
    await clickAndWaitForUrl(
      page,
      page.getByRole('button', { name: '确认并保存行程' }),
      /\/trips\/dali-slow-5d$/,
    );
    await clickAndWaitForUrl(page, page.getByRole('link', { name: '我的行程' }), /\/trips$/);
    await clickAndWaitForUrl(
      page,
      page.getByRole('link', { name: '继续规划大理慢行计划' }),
      /\/trips\/dali-slow-5d$/,
    );
    await expect(page.getByRole('region', { name: '行程设置' })).toBeVisible();
    await clickAndWaitForUrl(page, page.getByRole('link', { name: '进入比价' }), /\/compare\?/);
    await expect(page.getByText('大理 · 沙箱演示报价', { exact: true })).toBeVisible();
  });

  await runLoop('favorite offer + alert -> profile -> re-search -> remove confirmation', async (page) => {
    const offerTitle = '上海至大理演示航班 B';
    const provider = '星屿沙箱演示航班';
    await navigate(page, '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&origin=%E4%B8%8A%E6%B5%B7&from=2026-09-18&to=2026-09-22&travelers=3');
    const offer = page.getByTestId('offer-row').filter({
      has: page.getByRole('heading', { name: offerTitle, exact: true }),
    });
    await expect(offer.getByText('¥1,010 含税总价')).toBeVisible();
    const favorite = offer.getByRole('button', { name: `收藏 ${provider} 报价` });
    await expect(favorite).toBeEnabled();
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');
    const alert = page.getByRole('switch', { name: '降价提醒' });
    await expect(alert).toBeEnabled();
    await alert.click();
    await navigate(page, '/profile?tab=offers');
    const savedOffer = page.locator('article').filter({ hasText: `机票 · ${provider}` }).filter({ hasText: '¥ 1,010' });
    await clickAndWaitForUrl(page, savedOffer.getByRole('link', { name: '重新比价' }), /\/compare\?/);
    const reSearchedOffer = page.getByTestId('offer-row').filter({
      has: page.getByRole('heading', { name: offerTitle, exact: true }),
    });
    const savedFavorite = reSearchedOffer.getByRole('button', { name: `收藏 ${provider} 报价` });
    await expect(savedFavorite).toHaveAttribute('aria-pressed', 'true');
    await savedFavorite.click();
    await expect(page.getByRole('dialog', { name: '移除收藏报价' })).toBeVisible();
    await page.getByRole('button', { name: '确认移除并关闭提醒' }).click();
    await expect(savedFavorite).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('switch', { name: '降价提醒' })).toBeDisabled();
    await navigate(page, '/profile?tab=offers');
    await expect(page.getByRole('heading', { name: '收藏的报价会保存在这里' })).toBeVisible();
  });

  assert(result.runtimeErrors.length === 0, `Runtime errors: ${result.runtimeErrors.join(' | ')}`);
  result.completedAt = new Date().toISOString();
  result.result = 'passed';
  writeFileSync(new URL(resultName, artifactDir), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({
    result: result.result,
    targetUrl: result.targetUrl,
    mode: result.mode,
    routeCount: result.routes.length,
    assetCount: result.assets.length,
    loopCount: result.loops.length,
    runtimeErrors: result.runtimeErrors.length,
    runtimeWarnings: result.runtimeWarnings.length,
  }));
} finally {
  await browser.close();
}
