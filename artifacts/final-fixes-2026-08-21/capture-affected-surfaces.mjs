import { chromium, expect as baseExpect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const expect = baseExpect.configure({ timeout: 30_000 });
const root = process.cwd();
const outputDir = path.join(root, 'artifacts', 'final-fixes-2026-08-21');
const baseURL = 'http://127.0.0.1:4173';
const desktop = { width: 1440, height: 1024 };
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
    if (response.status() >= 400) runtimeErrors.push(`${label} http ${response.status()}: ${response.url()}`);
  });
}

async function ready(page) {
  await page.locator('main').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.readyState === 'complete' && document.fonts.status === 'loaded');
  await page.waitForFunction(() => [...document.images]
    .filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    })
    .every((image) => image.complete && image.naturalWidth > 0));
  await page.waitForFunction(() => document.getAnimations()
    .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
    .every((animation) => animation.playState !== 'running'), null, { timeout: 5_000 }).catch(() => undefined);
}

async function newPage(label, initScript) {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    viewport: desktop,
  });
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  observe(page, label);
  return { context, page };
}

async function record(page, name, route, state, options = {}) {
  await ready(page);
  if (options.fullPage) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => scrollY === 0);
  }
  const output = path.join(outputDir, `${name}.png`);
  await page.screenshot({ animations: 'disabled', fullPage: options.fullPage ?? false, path: output });
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
  await expect(page.getByRole('dialog', { name: '确认行程草稿' })).toBeVisible();
  await page.getByRole('button', { name: '确认并保存行程' }).click();
  await expect(page).toHaveURL(/\/trips\/dali-slow-5d$/);
  await expect(page.getByRole('heading', { name: '大理慢行计划' })).toBeVisible();
}

{
  const { context, page } = await newPage('homepage-beijing-cta');
  await page.goto(baseURL, { waitUntil: 'commit' });
  await expect(page.getByRole('button', { name: '查看北京' })).toBeVisible();
  await page.getByRole('button', { name: '查看北京' }).click();
  const cta = page.getByRole('link', { name: '比价北京行程' });
  await expect(cta).toHaveAttribute('href', '/compare?kind=hotel&destination=%E5%8C%97%E4%BA%AC');
  await cta.scrollIntoViewIfNeeded();
  await record(page, 'homepage-beijing-cta', '/', '北京取景窗选中，真实比价 CTA 可见');
  await context.close();
}

{
  const { context, page } = await newPage('assistant-fresh-no-trip');
  await page.goto(`${baseURL}/assistant`, { waitUntil: 'commit' });
  await expect(page.getByText('当前为通用旅行咨询')).toBeVisible();
  await page.getByRole('button', { name: '人身安全' }).click();
  await expect(page.getByRole('region', { name: '旅行助手回答' })).toBeVisible();
  await expect(page.getByText('这些建议不会保存到行程；你可以直接参考并自行决定下一步。')).toBeVisible();
  await expect(page.getByRole('button', { name: /选择.+方案/ })).toHaveCount(0);
  await record(page, 'assistant-fresh-no-trip', '/assistant', '全新浏览器：通用咨询、Plan A/B/C 只读', { fullPage: true });
  await context.close();
}

{
  const { context, page } = await newPage('assistant-hydration-error', () => {
    localStorage.setItem('xingyu-demo-v1', '{malformed-trip-store');
  });
  await page.goto(`${baseURL}/assistant?tripId=dali-slow-5d`, { waitUntil: 'commit' });
  await expect(page.getByRole('alert').filter({ hasText: '本地行程无法安全读取' })).toContainText('本地行程无法安全读取');
  await expect(page.getByRole('link', { name: '从攻略创建行程' })).toBeVisible();
  await record(page, 'assistant-hydration-error', '/assistant?tripId=dali-slow-5d', '行程存储损坏：失败关闭、保留恢复入口');
  await context.close();
}

{
  const { context, page } = await newPage('assistant-existing-trip-saved');
  await createDaliTrip(page);
  await page.goto(`${baseURL}/assistant?tripId=draft-dali-slow-5d`, { waitUntil: 'commit' });
  await expect(page.getByText('已关联本地行程')).toBeVisible();
  await page.getByRole('button', { name: '人身安全' }).click();
  const select = page.getByRole('button', { name: '选择立即联系公安机关方案' });
  await expect(select).toBeVisible();
  await select.click();
  await expect(select).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toContainText('方案已保存到本浏览器的旅行决策');
  await record(page, 'assistant-existing-trip-saved', '/assistant?tripId=draft-dali-slow-5d', '真实本地行程：用户选择后才显示保存成功', { fullPage: true });
  await context.close();
}

{
  const { context, page } = await newPage('workbench-partner-hydration-error');
  await createDaliTrip(page);
  await page.evaluate(() => localStorage.setItem('xingyu-partner-demo-v1', '{malformed-partner-store'));
  await page.reload({ waitUntil: 'commit' });
  const publish = page.getByRole('button', { name: '发布搭子意愿' });
  await expect(publish).toBeDisabled();
  await expect(page.getByRole('alert').filter({ hasText: '搭子意愿存储无法安全读取' })).toContainText('搭子意愿存储无法安全读取');
  await publish.scrollIntoViewIfNeeded();
  await record(page, 'workbench-partner-hydration-error', '/trips/dali-slow-5d', '搭子存储损坏：发布停用且解释原因');
  await context.close();
}

async function dataUrl(file) {
  const buffer = await readFile(file);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function createBoard() {
  const sourceHome = await dataUrl(path.join(root, 'docs', 'design', 'selected-homepage-option-1.png'));
  const sourceHub = await dataUrl(path.join(root, 'docs', 'design', 'xingyu-content-hub-target.png'));
  const captures = await Promise.all(evidence.map(async (item) => ({
    ...item,
    src: await dataUrl(path.join(root, item.output)),
  })));
  const context = await browser.newContext({ viewport: { width: 1920, height: 2600 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><style>
    *{box-sizing:border-box}body{margin:0;padding:24px;background:#10100f;color:#f4f0e8;font:20px Arial,sans-serif}
    h1{margin:0 0 18px;font:34px Georgia,serif}.truth,.states{display:grid;grid-template-columns:1fr 1fr;gap:18px}
    .truth{margin-bottom:24px}.card{padding:12px;border:1px solid #b79a68;background:#191918}.card strong{display:block;margin-bottom:9px;color:#d8c79b}
    .truth img{display:block;width:100%;height:520px;object-fit:contain;background:#0b0b0a}.states img{display:block;width:100%;height:610px;object-fit:contain;background:#0b0b0a}
    .card p{margin:9px 0 0;color:#c8c0b4;font-size:16px;line-height:1.5}.wide{grid-column:1/-1}
  </style><h1>行屿最终修复 · 同输入 Design QA</h1>
  <section class="truth"><article class="card"><strong>SOURCE · homepage visual truth</strong><img src="${sourceHome}"></article><article class="card"><strong>SOURCE · content-hub visual truth</strong><img src="${sourceHub}"></article></section>
  <section class="states">${captures.map((item, index) => `<article class="card ${index === captures.length - 1 ? 'wide' : ''}"><strong>IMPLEMENTATION · ${item.name}</strong><img src="${item.src}"><p>${item.state} · Chrome 1440×1024 CSS px @1x</p></article>`).join('')}</section>`);
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  const output = path.join(outputDir, 'comparison-affected-surfaces.png');
  await page.screenshot({ fullPage: true, path: output });
  await context.close();
}

await createBoard();
await writeFile(path.join(outputDir, 'local-design-qa.json'), `${JSON.stringify({
  browser: 'Google Chrome via Playwright channel=chrome',
  sourceVisualTruth: [
    'docs/design/selected-homepage-option-1.png',
    'docs/design/xingyu-content-hub-target.png',
  ],
  evidence,
  runtimeErrors,
  runtimeWarnings,
  result: runtimeErrors.length === 0 ? 'passed' : 'failed',
}, null, 2)}\n`);

await browser.close();

if (runtimeErrors.length > 0) throw new Error(runtimeErrors.join('\n'));
console.log(JSON.stringify({ captures: evidence.length, runtimeErrors, runtimeWarnings }));
