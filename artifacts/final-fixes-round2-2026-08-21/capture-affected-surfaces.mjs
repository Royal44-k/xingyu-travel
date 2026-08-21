import { chromium, expect as baseExpect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const expect = baseExpect.configure({ timeout: 30_000 });
const root = process.cwd();
const outputDir = path.join(root, 'artifacts', 'final-fixes-round2-2026-08-21');
const baseURL = 'http://127.0.0.1:4173';
const viewport = { width: 1440, height: 1024 };
const evidence = [];
const runtimeErrors = [];
const runtimeWarnings = [];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

function observe(page, label) {
  page.on('console', (message) => {
    const value = `${label} console.${message.type()}: ${message.text()}`;
    if (message.type() === 'error') runtimeErrors.push(value);
    if (message.type() === 'warning') runtimeWarnings.push(value);
  });
  page.on('pageerror', (error) => runtimeErrors.push(`${label} pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().endsWith('/api/v1/assistant')) {
      runtimeErrors.push(`${label} http ${response.status()}: ${response.url()}`);
    }
  });
}

async function newPage(label) {
  const context = await browser.newContext({ deviceScaleFactor: 1, reducedMotion: 'no-preference', viewport });
  const page = await context.newPage();
  observe(page, label);
  return { context, page };
}

async function ready(page) {
  await page.locator('main').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.readyState === 'complete' && document.fonts.status === 'loaded');
  await page.waitForFunction(() => [...document.images].filter((image) => {
    const rect = image.getBoundingClientRect();
    return rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  }).every((image) => image.complete && image.naturalWidth > 0));
}

async function record(page, name, route, state) {
  await ready(page);
  await page.evaluate(() => scrollTo(0, 0));
  const output = path.join(outputDir, `${name}.png`);
  await page.screenshot({ animations: 'disabled', fullPage: true, path: output });
  const metrics = await page.evaluate(() => ({
    cssViewport: { width: innerWidth, height: innerHeight },
    density: devicePixelRatio,
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
  }));
  evidence.push({ name, route, state, output: path.relative(root, output).replaceAll('\\', '/'), ...metrics });
}

async function createDaliTrip(page) {
  await page.goto(`${baseURL}/square/dali-slow-5d`, { waitUntil: 'commit' });
  await expect(page.getByRole('button', { name: '转为行程' })).toBeEnabled();
  await page.getByRole('button', { name: '转为行程' }).click();
  await page.getByRole('button', { name: '确认并保存行程' }).click();
  await expect(page).toHaveURL(/\/trips\/dali-slow-5d$/);
}

async function rejectTripPersistence(page) {
  await page.evaluate(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === 'xingyu-demo-v1') throw new DOMException('QUOTA_EXCEEDED', 'QuotaExceededError');
      return originalSetItem.call(this, key, value);
    };
  });
}

{
  const { context, page } = await newPage('assistant-latest-request-failure');
  await page.route('**/api/v1/assistant', async (route, request) => {
    const payload = request.postDataJSON();
    if (payload.question === '请为我的行程给出规划建议。') {
      await route.fulfill({
        body: JSON.stringify({ error: { message: '最新请求暂时失败，请稍后重试。' } }),
        contentType: 'application/json',
        status: 200,
      });
      return;
    }
    await route.continue();
  });
  await page.goto(`${baseURL}/assistant`, { waitUntil: 'commit' });
  await expect(page.getByText('当前为通用旅行咨询')).toBeVisible();
  await page.getByRole('button', { name: '人身安全' }).click();
  await expect(page.getByRole('region', { name: '旅行助手回答' })).toBeVisible();
  await page.getByRole('button', { name: '规划建议' }).click();
  await expect(page.getByRole('alert').filter({ hasText: '最新请求暂时失败' })).toContainText('最新请求暂时失败');
  await expect(page.getByRole('region', { name: '旅行助手回答' })).toHaveCount(0);
  await record(page, 'assistant-latest-request-failure', '/assistant', '最新请求失败：旧 Plan A/B/C 与保存控件已失效');
  await context.close();
}

{
  const { context, page } = await newPage('assistant-plan-persistence-error');
  await createDaliTrip(page);
  await page.goto(`${baseURL}/assistant?tripId=draft-dali-slow-5d`, { waitUntil: 'commit' });
  await page.getByRole('button', { name: '人身安全' }).click();
  const select = page.getByRole('button', { name: /选择.*公安机关方案/ });
  await expect(select).toBeVisible();
  await rejectTripPersistence(page);
  await select.click();
  await expect(page.getByRole('alert').filter({ hasText: '方案未能保存到本地行程' })).toContainText('方案未能保存到本地行程');
  await expect(page.getByText('方案已保存到本浏览器的旅行决策，未创建订单')).toHaveCount(0);
  await record(page, 'assistant-plan-persistence-error', '/assistant?tripId=draft-dali-slow-5d', '浏览器写入失败：不显示虚假成功，并提供重试建议');
  await context.close();
}

{
  const { context, page } = await newPage('workbench-second-write-error');
  await createDaliTrip(page);
  await rejectTripPersistence(page);
  const publish = page.getByRole('button', { name: '发布搭子意愿' });
  await expect(publish).toBeVisible();
  await publish.click();
  await expect(page.getByRole('alert').filter({ hasText: '搭子意愿未能保存' })).toContainText('搭子意愿未能保存');
  await expect(page.getByRole('button', { name: '发布搭子意愿' })).toBeEnabled();
  await publish.scrollIntoViewIfNeeded();
  await record(page, 'workbench-second-write-error', '/trips/dali-slow-5d', '行程标记写入失败：搭子意愿已补偿，允许安全重试');
  await context.close();
}

async function dataUrl(file) {
  const buffer = await readFile(file);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

const sourceHome = await dataUrl(path.join(root, 'docs', 'design', 'selected-homepage-option-1.png'));
const sourceHub = await dataUrl(path.join(root, 'docs', 'design', 'xingyu-content-hub-target.png'));
const captures = await Promise.all(evidence.map(async (item) => ({
  ...item,
  src: await dataUrl(path.join(root, item.output)),
})));
const boardContext = await browser.newContext({ viewport: { width: 1920, height: 2500 }, deviceScaleFactor: 1 });
const boardPage = await boardContext.newPage();
await boardPage.setContent(`<!doctype html><style>
  *{box-sizing:border-box}body{margin:0;padding:24px;background:#10100f;color:#f4f0e8;font:20px Arial,sans-serif}
  h1{margin:0 0 18px;font:34px Georgia,serif}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px}
  .card{padding:12px;border:1px solid #b79a68;background:#191918}.card strong{display:block;margin-bottom:9px;color:#d8c79b}
  img{display:block;width:100%;height:640px;object-fit:contain;background:#0b0b0a}.card p{margin:9px 0 0;color:#c8c0b4;font-size:16px;line-height:1.5}
  .wide{grid-column:1/-1}
</style><h1>行屿第二轮修复 · 同输入 Design QA</h1>
<section class="grid"><article class="card"><strong>SOURCE · homepage visual truth</strong><img src="${sourceHome}"></article><article class="card"><strong>SOURCE · content-hub visual truth</strong><img src="${sourceHub}"></article></section>
<section class="grid">${captures.map((item, index) => `<article class="card ${index === captures.length - 1 ? 'wide' : ''}"><strong>IMPLEMENTATION · ${item.name}</strong><img src="${item.src}"><p>${item.state} · Chrome 1440×1024 CSS px @1x</p></article>`).join('')}</section>`);
await boardPage.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
await boardPage.screenshot({ fullPage: true, path: path.join(outputDir, 'comparison-affected-surfaces.png') });
await boardContext.close();

await writeFile(path.join(outputDir, 'local-design-qa.json'), `${JSON.stringify({
  browser: 'Google Chrome via Playwright channel=chrome',
  sourceVisualTruth: [
    'docs/design/selected-homepage-option-1.png',
    'docs/design/xingyu-content-hub-target.png',
  ],
  evidence,
  runtimeErrors,
  runtimeWarnings,
  result: runtimeErrors.length === 0 && runtimeWarnings.length === 0 ? 'passed' : 'failed',
}, null, 2)}\n`);

await browser.close();
if (runtimeErrors.length > 0 || runtimeWarnings.length > 0) {
  throw new Error([...runtimeErrors, ...runtimeWarnings].join('\n'));
}
console.log(JSON.stringify({ captures: evidence.length, runtimeErrors, runtimeWarnings }));
