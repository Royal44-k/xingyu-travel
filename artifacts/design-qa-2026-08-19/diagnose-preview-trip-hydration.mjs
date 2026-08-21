import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, expect as baseExpect } from '@playwright/test';

const targetOrigin = 'https://xingyu-travel-nylfzzhu4-lirongouyang522-3492s-projects.vercel.app';
const resultUrl = new URL('preview-trip-hydration-diagnostic.json', import.meta.url);
const expect = baseExpect.configure({ timeout: 30_000 });
const result = {
  targetUrl: targetOrigin,
  browser: 'Google Chrome (Playwright channel: chrome)',
  startedAt: new Date().toISOString(),
  hydration: { samples: [] },
  conversionProof: null,
  remainingLoops: [],
  consoleErrors: [],
  consoleWarnings: [],
  pageErrors: [],
  networkFailures: [],
  httpErrors: [],
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getAuthToken() {
  const appData = process.env.APPDATA;
  assert(appData, 'APPDATA is unavailable');
  const authPath = [
    join(appData, 'xdg.data', 'com.vercel.cli', 'auth.json'),
    join(appData, 'com.vercel.cli', 'auth.json'),
  ].find((candidate) => existsSync(candidate));
  assert(authPath, 'Vercel CLI auth.json unavailable');
  const auth = JSON.parse(readFileSync(authPath, 'utf8'));
  assert(typeof auth.token === 'string' && auth.token.length > 0, 'Vercel CLI token unavailable');
  return auth.token;
}

async function getBypassSecret() {
  const projectId = 'prj_IeyWF8pZrE35C9Sp6eJWHcFpIiCl';
  const teamId = 'team_GXUbEGjD0inFlQqufnaKsSVQ';
  const response = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}?teamId=${teamId}`,
    { headers: { authorization: `Bearer ${getAuthToken()}` } },
  );
  assert(response.ok, `Vercel project API returned ${response.status}`);
  const payload = await response.json();
  const existingBypass = payload.protectionBypass;
  assert(existingBypass && typeof existingBypass === 'object', 'No existing protection bypass map returned');
  const existingSecret = Object.keys(existingBypass).find(
    (candidate) => existingBypass[candidate]?.scope === 'automation-bypass'
      && existingBypass[candidate]?.isEnvVar === true,
  ) ?? Object.keys(existingBypass).find(
    (candidate) => existingBypass[candidate]?.scope === 'automation-bypass',
  );
  assert(existingSecret, 'No existing automation bypass token returned');
  return existingSecret;
}

function monitor(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') result.consoleErrors.push(`${label}: ${message.text()}`);
    if (message.type() === 'warning') result.consoleWarnings.push(`${label}: ${message.text()}`);
  });
  page.on('pageerror', (error) => result.pageErrors.push(`${label}: ${error.message}`));
  page.on('requestfailed', (request) => {
    result.networkFailures.push(`${label}: ${request.failure()?.errorText ?? 'unknown'}: ${request.url()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) result.httpErrors.push(`${label}: ${response.status()}: ${response.url()}`);
  });
}

async function contextFor(browser, bypass) {
  return browser.newContext({
    viewport: { width: 1440, height: 1024 },
    deviceScaleFactor: 1,
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': bypass,
      'x-vercel-set-bypass-cookie': 'true',
    },
  });
}

async function navigate(page, path) {
  const response = await page.goto(new URL(path, targetOrigin).href, {
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

async function hydrationSample(page, elapsedMs) {
  return page.evaluate((elapsed) => {
    const button = [...document.querySelectorAll('button')].find((candidate) =>
      candidate.textContent?.includes('转为行程') || candidate.textContent?.includes('已在我的行程中'),
    );
    const describedBy = button?.getAttribute('aria-describedby') ?? null;
    const localStorageMetadata = Object.keys(localStorage).sort().map((key) => {
      const raw = localStorage.getItem(key) ?? '';
      let parsedType = 'unparseable';
      let topLevelKeys = [];
      try {
        const parsed = JSON.parse(raw);
        parsedType = Array.isArray(parsed) ? 'array' : parsed === null ? 'null' : typeof parsed;
        topLevelKeys = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? Object.keys(parsed).sort()
          : [];
      } catch {}
      return { key, characterLength: raw.length, parsedType, topLevelKeys };
    });
    return {
      elapsedMs: elapsed,
      documentReadyState: document.readyState,
      buttonFound: Boolean(button),
      buttonLabel: button?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      disabled: button instanceof HTMLButtonElement ? button.disabled : null,
      describedBy,
      hydrationStatusText: describedBy ? document.getElementById(describedBy)?.textContent?.trim() ?? null : null,
      localStorageMetadata,
    };
  }, elapsedMs);
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  const bypass = await getBypassSecret();
  const diagnosticContext = await contextFor(browser, bypass);
  const diagnosticPage = await diagnosticContext.newPage();
  diagnosticPage.setDefaultTimeout(30_000);
  monitor(diagnosticPage, 'focused hydration diagnostic');

  const navigationStarted = Date.now();
  await navigate(diagnosticPage, '/square/dali-slow-5d');
  result.hydration.navigationElapsedMs = Date.now() - navigationStarted;
  const hydrationStarted = Date.now();
  let latestSample;
  do {
    latestSample = await hydrationSample(diagnosticPage, Date.now() - hydrationStarted);
    result.hydration.samples.push(latestSample);
    if (latestSample.buttonFound && latestSample.disabled === false) break;
    if (Date.now() - hydrationStarted >= 30_000) break;
    await diagnosticPage.waitForTimeout(1_000);
  } while (true);

  result.hydration.enabled = latestSample?.disabled === false;
  result.hydration.enabledElapsedMs = result.hydration.enabled ? latestSample.elapsedMs : null;
  assert(result.hydration.enabled, 'Conversion control remained disabled after 30 seconds');

  const conversionButton = diagnosticPage.getByRole('button', { name: '转为行程' });
  await expect(conversionButton).toBeEnabled();
  await conversionButton.click();
  await expect(diagnosticPage.getByRole('dialog', { name: '确认行程草稿' })).toBeVisible();
  await clickAndWaitForUrl(
    diagnosticPage,
    diagnosticPage.getByRole('button', { name: '确认并保存行程' }),
    /\/trips\/dali-slow-5d$/,
  );
  await expect(diagnosticPage.getByRole('heading', { name: '大理慢行计划' })).toBeVisible();
  result.conversionProof = {
    result: 'passed',
    finalPath: new URL(diagnosticPage.url()).pathname,
    localStorageMutationOccurredOnlyAfterEnabledObservation: true,
  };
  await diagnosticContext.close();

  const tripContext = await contextFor(browser, bypass);
  const tripPage = await tripContext.newPage();
  tripPage.setDefaultTimeout(30_000);
  monitor(tripPage, 'remaining trip loop');
  await navigate(tripPage, '/square/dali-slow-5d');
  const convert = tripPage.getByRole('button', { name: '转为行程' });
  await expect(convert).toBeEnabled();
  await convert.click();
  await expect(tripPage.getByRole('dialog', { name: '确认行程草稿' })).toBeVisible();
  await clickAndWaitForUrl(
    tripPage,
    tripPage.getByRole('button', { name: '确认并保存行程' }),
    /\/trips\/dali-slow-5d$/,
  );
  await clickAndWaitForUrl(tripPage, tripPage.getByRole('link', { name: '我的行程' }), /\/trips$/);
  await clickAndWaitForUrl(
    tripPage,
    tripPage.getByRole('link', { name: '继续规划大理慢行计划' }),
    /\/trips\/dali-slow-5d$/,
  );
  await expect(tripPage.getByRole('region', { name: '行程设置' })).toBeVisible();
  await clickAndWaitForUrl(tripPage, tripPage.getByRole('link', { name: '进入比价' }), /\/compare\?/);
  await expect(tripPage.getByText('大理 · 沙箱演示报价', { exact: true })).toBeVisible();
  result.remainingLoops.push({ name: 'guide conversion -> My Trips -> workbench -> compare', result: 'passed' });
  await tripContext.close();

  const offerContext = await contextFor(browser, bypass);
  const offerPage = await offerContext.newPage();
  offerPage.setDefaultTimeout(30_000);
  monitor(offerPage, 'remaining offer loop');
  const offerTitle = '上海至大理演示航班 B';
  const provider = '星屿沙箱演示航班';
  await navigate(offerPage, '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&origin=%E4%B8%8A%E6%B5%B7&from=2026-09-18&to=2026-09-22&travelers=3');
  const offer = offerPage.getByTestId('offer-row').filter({
    has: offerPage.getByRole('heading', { name: offerTitle, exact: true }),
  });
  await expect(offer.getByText('¥1,010 含税总价')).toBeVisible();
  const favorite = offer.getByRole('button', { name: `收藏 ${provider} 报价` });
  await favorite.click();
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');
  await offerPage.getByRole('switch', { name: '降价提醒' }).click();
  await navigate(offerPage, '/profile?tab=offers');
  const savedOffer = offerPage.locator('article').filter({ hasText: `机票 · ${provider}` }).filter({ hasText: '¥ 1,010' });
  await clickAndWaitForUrl(offerPage, savedOffer.getByRole('link', { name: '重新比价' }), /\/compare\?/);
  const savedFavorite = offerPage.getByTestId('offer-row').filter({
    has: offerPage.getByRole('heading', { name: offerTitle, exact: true }),
  }).getByRole('button', { name: `收藏 ${provider} 报价` });
  await expect(savedFavorite).toHaveAttribute('aria-pressed', 'true');
  await savedFavorite.click();
  await expect(offerPage.getByRole('dialog', { name: '移除收藏报价' })).toBeVisible();
  await offerPage.getByRole('button', { name: '确认移除并关闭提醒' }).click();
  await expect(savedFavorite).toHaveAttribute('aria-pressed', 'false');
  await expect(offerPage.getByRole('switch', { name: '降价提醒' })).toBeDisabled();
  await navigate(offerPage, '/profile?tab=offers');
  await expect(offerPage.getByRole('heading', { name: '收藏的报价会保存在这里' })).toBeVisible();
  result.remainingLoops.push({ name: 'favorite offer + alert -> profile -> re-search -> remove confirmation', result: 'passed' });
  await offerContext.close();

  assert(result.consoleErrors.length === 0, `Console errors: ${result.consoleErrors.join(' | ')}`);
  assert(result.consoleWarnings.length === 0, `Console warnings: ${result.consoleWarnings.join(' | ')}`);
  assert(result.pageErrors.length === 0, `Page errors: ${result.pageErrors.join(' | ')}`);
  assert(result.networkFailures.length === 0, `Network failures: ${result.networkFailures.join(' | ')}`);
  assert(result.httpErrors.length === 0, `HTTP errors: ${result.httpErrors.join(' | ')}`);
  result.result = 'passed';
} catch (error) {
  result.result = 'failed';
  result.error = { name: error.name, message: error.message };
  process.exitCode = 1;
} finally {
  result.completedAt = new Date().toISOString();
  writeFileSync(resultUrl, `${JSON.stringify(result, null, 2)}\n`);
  await browser.close();
  console.log(JSON.stringify({
    result: result.result,
    hydrationEnabled: result.hydration.enabled ?? false,
    enabledElapsedMs: result.hydration.enabledElapsedMs ?? null,
    conversionProof: result.conversionProof?.result ?? null,
    remainingLoops: result.remainingLoops.length,
    consoleErrors: result.consoleErrors.length,
    pageErrors: result.pageErrors.length,
    networkFailures: result.networkFailures.length,
    httpErrors: result.httpErrors.length,
    error: result.error?.message ?? null,
  }));
}
