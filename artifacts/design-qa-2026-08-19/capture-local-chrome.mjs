import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputDir = path.join(root, 'artifacts', 'design-qa-2026-08-19');
const baseURL = 'http://127.0.0.1:4173';
const sourceHome = path.join(root, 'docs', 'design', 'selected-homepage-option-1.png');
const sourceHub = path.join(root, 'docs', 'design', 'xingyu-content-hub-target.png');
const evidence = [];
const runtimeErrors = [];
const runtimeWarnings = [];

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

async function waitForVisualReady(page, ready) {
  await page.locator('main').waitFor({ state: 'visible' });
  await ready();
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

async function newPage(viewport, label, initScript) {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
    viewport,
  });
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  observe(page, label);
  return { context, page };
}

async function capture({ name, viewport, route, ready, action, initScript }) {
  const { context, page } = await newPage(viewport, name, initScript);
  await page.goto(`${baseURL}${route}`, { waitUntil: 'commit' });
  await waitForVisualReady(page, () => ready(page));
  if (action) {
    await action(page);
    await waitForVisualReady(page, async () => undefined);
  }
  const output = path.join(outputDir, `${name}.png`);
  await page.screenshot({ animations: 'disabled', path: output });
  const metrics = await page.evaluate(() => ({
    cssViewport: { width: innerWidth, height: innerHeight },
    density: devicePixelRatio,
    documentWidth: document.documentElement.scrollWidth,
    focused: document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent?.trim().slice(0, 80) || null,
    visibleImages: [...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    }).map((image) => ({ alt: image.alt, complete: image.complete, naturalWidth: image.naturalWidth })),
  }));
  evidence.push({ name, route, output: path.relative(root, output).replaceAll('\\', '/'), ...metrics });
  await context.close();
}

const desktop = { width: 1440, height: 1024 };
const mobile = { width: 390, height: 844 };

async function waitForHomeReady(page) {
  await page.getByRole('button', { name: '开始规划' }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const title = document.querySelector('#hero-title');
    const animatedCopy = title?.parentElement;
    return animatedCopy && Number.parseFloat(getComputedStyle(animatedCopy).opacity) >= 0.99;
  });
}

await capture({
  name: 'home-desktop-1440x1024', viewport: desktop, route: '/',
  ready: waitForHomeReady,
});
await capture({
  name: 'home-mobile-390x844', viewport: mobile, route: '/',
  ready: waitForHomeReady,
});
await capture({
  name: 'home-focus-selected-desktop', viewport: desktop, route: '/',
  ready: async (page) => {
    await waitForHomeReady(page);
    await page.getByRole('region', { name: '目的地旅行取景窗' }).waitFor({ state: 'visible' });
  },
  action: async (page) => {
    const carousel = page.getByRole('region', { name: '目的地旅行取景窗' });
    await carousel.focus();
    await page.getByRole('button', { name: '查看杭州' }).click();
    await page.getByRole('link', { name: '打开杭州攻略' }).waitFor({ state: 'visible' });
  },
});

await capture({
  name: 'square-desktop-1440x1024', viewport: desktop, route: '/square',
  ready: (page) => page.getByRole('button', { name: '查看兴趣偏好' }).waitFor({ state: 'visible' }),
});
await capture({
  name: 'square-mobile-390x844', viewport: mobile, route: '/square',
  ready: (page) => page.getByRole('button', { name: '查看兴趣偏好' }).waitFor({ state: 'visible' }),
});
await capture({
  name: 'square-hover-desktop', viewport: desktop, route: '/square',
  ready: (page) => page.getByRole('button', { name: '查看兴趣偏好' }).waitFor({ state: 'visible' }),
  action: async (page) => page.locator('article').first().hover(),
});
await capture({
  name: 'square-liked-selected-desktop', viewport: desktop, route: '/square',
  ready: (page) => page.getByRole('button', { name: '查看兴趣偏好' }).waitFor({ state: 'visible' }),
  action: async (page) => {
    const favorite = page.getByRole('button', { name: /喜欢 把大理留给慢下来的人/ });
    await favorite.click();
    await favorite.waitFor({ state: 'visible' });
    if (await favorite.getAttribute('aria-pressed') !== 'true') throw new Error('Guide favorite did not enter selected state');
  },
});

await capture({
  name: 'detail-desktop-1440x1024', viewport: desktop, route: '/square/dali-slow-5d',
  ready: (page) => page.getByRole('region', { name: /攻略图片画廊/ }).waitFor({ state: 'visible' }),
});
await capture({
  name: 'detail-mobile-390x844', viewport: mobile, route: '/square/dali-slow-5d',
  ready: (page) => page.getByRole('region', { name: /攻略图片画廊/ }).waitFor({ state: 'visible' }),
});
await capture({
  name: 'detail-gallery-focus-desktop', viewport: desktop, route: '/square/dali-slow-5d',
  ready: (page) => page.getByRole('region', { name: /攻略图片画廊/ }).waitFor({ state: 'visible' }),
  action: async (page) => page.getByRole('region', { name: /攻略图片画廊/ }).focus(),
});

await capture({
  name: 'profile-desktop-1440x1024', viewport: desktop, route: '/profile',
  ready: (page) => page.getByRole('heading', { name: '你好，行屿旅人' }).waitFor({ state: 'visible' }),
});
await capture({
  name: 'profile-mobile-390x844', viewport: mobile, route: '/profile',
  ready: (page) => page.getByRole('heading', { name: '你好，行屿旅人' }).waitFor({ state: 'visible' }),
});
await capture({
  name: 'profile-empty-likes-desktop', viewport: desktop, route: '/profile?tab=likes',
  ready: (page) => page.getByRole('heading', { name: '喜欢的攻略会保存在这里' }).waitFor({ state: 'visible' }),
});

{
  const { context, page } = await newPage(desktop, 'profile-expired-offer-desktop');
  await page.goto(`${baseURL}/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&origin=%E4%B8%8A%E6%B5%B7&from=2026-09-18&to=2026-09-22&travelers=3`, { waitUntil: 'commit' });
  await waitForVisualReady(page, () => page.getByRole('heading', { name: '上海至大理演示航班 B', exact: true }).waitFor({ state: 'visible' }));
  const offer = page.getByTestId('offer-row').filter({ has: page.getByRole('heading', { name: '上海至大理演示航班 B', exact: true }) });
  await offer.getByRole('button', { name: '收藏 星屿沙箱演示航班 报价' }).click();
  await page.getByRole('switch', { name: '降价提醒' }).click();
  await page.evaluate(() => {
    const key = 'xingyu-library-demo-v1';
    const envelope = JSON.parse(localStorage.getItem(key));
    for (const offer of Object.values(envelope.state.favoriteOffers)) {
      offer.observedAt = '2025-01-01T00:00:00.000Z';
      offer.expiresAt = '2025-01-01T00:15:00.000Z';
    }
    localStorage.setItem(key, JSON.stringify(envelope));
  });
  await page.goto(`${baseURL}/profile?tab=offers`, { waitUntil: 'commit' });
  await waitForVisualReady(page, () => page.getByText('报价可能已变化').waitFor({ state: 'visible' }));
  const output = path.join(outputDir, 'profile-expired-offer-desktop.png');
  await page.screenshot({ animations: 'disabled', path: output });
  evidence.push({ name: 'profile-expired-offer-desktop', route: '/profile?tab=offers', output: path.relative(root, output).replaceAll('\\', '/'), cssViewport: desktop, density: 1, state: 'expired saved offer + local alert' });
  await context.close();
}

await capture({
  name: 'profile-hydration-error-desktop', viewport: desktop, route: '/profile',
  initScript: () => localStorage.setItem('xingyu-library-demo-v1', '{malformed'),
  ready: (page) => page.getByRole('alert').getByText('部分本地资料未能安全读取').waitFor({ state: 'visible' }),
});

async function dataUrl(file) {
  const buffer = await readFile(file);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

async function imageDimensions(file) {
  const context = await browser.newContext({ viewport: { width: 800, height: 600 } });
  const page = await context.newPage();
  const dimensions = await page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, await dataUrl(file));
  await context.close();
  return dimensions;
}

const sourceDimensions = {
  homepage: await imageDimensions(sourceHome),
  contentHub: await imageDimensions(sourceHub),
};

async function createBoard(name, html, viewport) {
  const context = await browser.newContext({ deviceScaleFactor: 1, viewport });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
  const output = path.join(outputDir, `${name}.png`);
  await page.screenshot({ fullPage: true, path: output });
  await context.close();
  return output;
}

const homeSourceData = await dataUrl(sourceHome);
const hubSourceData = await dataUrl(sourceHub);
const homeDesktopData = await dataUrl(path.join(outputDir, 'home-desktop-1440x1024.png'));
const squareDesktopData = await dataUrl(path.join(outputDir, 'square-desktop-1440x1024.png'));
const detailDesktopData = await dataUrl(path.join(outputDir, 'detail-desktop-1440x1024.png'));
const profileDesktopData = await dataUrl(path.join(outputDir, 'profile-desktop-1440x1024.png'));

await createBoard('comparison-home-full', `<!doctype html><style>
  *{box-sizing:border-box}body{margin:0;background:#10100f;color:#f4f0e8;font:24px Arial,sans-serif}.labels,.pair{display:grid;grid-template-columns:1440px 1440px;gap:16px;padding:0 16px}.labels{height:56px;align-items:center}.pair img{display:block;width:1440px;height:1024px;object-fit:fill}.meta{padding:18px 16px;color:#b79a68}
</style><div class="labels"><strong>SOURCE · selected homepage</strong><strong>IMPLEMENTATION · Chrome 1440×1024 @1x</strong></div><div class="pair"><img src="${homeSourceData}"><img src="${homeDesktopData}"></div><div class="meta">Same input · source normalized from ${sourceDimensions.homepage.width}×${sourceDimensions.homepage.height} to 1440×1024; implementation captured at 1440×1024 CSS px, deviceScaleFactor 1.</div>`, { width: 2928, height: 1200 });

await createBoard('comparison-home-focus', `<!doctype html><style>
  *{box-sizing:border-box}body{margin:0;background:#10100f;color:#f4f0e8;font:23px Arial,sans-serif}.labels,.pair{display:grid;grid-template-columns:1440px 1440px;gap:16px;padding:0 16px}.labels{height:56px;align-items:center}.crop{width:1440px;height:760px;overflow:hidden}.crop img{display:block;width:1440px;height:1024px;object-fit:fill}
</style><div class="labels"><strong>SOURCE FOCUS · navigation, hero, search</strong><strong>IMPLEMENTATION FOCUS · same CSS width and top state</strong></div><div class="pair"><div class="crop"><img src="${homeSourceData}"></div><div class="crop"><img src="${homeDesktopData}"></div></div>`, { width: 2928, height: 840 });

await createBoard('comparison-content-hub-full', `<!doctype html><style>
  *{box-sizing:border-box}body{margin:0;background:#10100f;color:#f4f0e8;font:22px Arial,sans-serif}.source{padding:16px}.source img{display:block;width:2700px;height:auto}.label{padding:12px 16px;color:#b79a68}.implementations{display:grid;grid-template-columns:repeat(3,900px);gap:12px;padding:0 16px 20px}.card img{display:block;width:900px;height:640px;object-fit:fill}.card strong{display:block;padding:10px 0}
</style><div class="label">SOURCE · content hub triptych · ${sourceDimensions.contentHub.width}×${sourceDimensions.contentHub.height}</div><div class="source"><img src="${hubSourceData}"></div><div class="label">IMPLEMENTATION · local Chrome top-viewport captures normalized to 900×640 for one-input comparison</div><div class="implementations"><div class="card"><strong>Square</strong><img src="${squareDesktopData}"></div><div class="card"><strong>Guide detail</strong><img src="${detailDesktopData}"></div><div class="card"><strong>Profile</strong><img src="${profileDesktopData}"></div></div>`, { width: 2744, height: 2400 });

await createBoard('comparison-content-hub-focus', `<!doctype html><style>
  *{box-sizing:border-box}body{margin:0;background:#10100f;color:#f4f0e8;font:22px Arial,sans-serif}.row{display:grid;grid-template-columns:900px 900px;gap:18px;padding:18px;border-bottom:1px solid #b79a68}.label{grid-column:1/-1;color:#b79a68}.crop{position:relative;width:900px;height:640px;overflow:hidden}.sourceImg{position:absolute;top:0;width:2700px;height:auto}.sourceSquare{left:0}.sourceDetail{left:-900px}.sourceProfile{left:-1800px}.implementation{display:block;width:900px;height:640px;object-fit:fill}
</style>
<div class="row"><div class="label">Square · source panel vs implementation top viewport</div><div class="crop"><img class="sourceImg sourceSquare" src="${hubSourceData}"></div><img class="implementation" src="${squareDesktopData}"></div>
<div class="row"><div class="label">Guide detail · source panel vs implementation top viewport</div><div class="crop"><img class="sourceImg sourceDetail" src="${hubSourceData}"></div><img class="implementation" src="${detailDesktopData}"></div>
<div class="row"><div class="label">Profile · source panel vs implementation top viewport</div><div class="crop"><img class="sourceImg sourceProfile" src="${hubSourceData}"></div><img class="implementation" src="${profileDesktopData}"></div>`, { width: 1854, height: 2100 });

const stateFiles = [
  ['Hover · Square card', 'square-hover-desktop.png'],
  ['Selected · liked guide', 'square-liked-selected-desktop.png'],
  ['Focus · guide gallery', 'detail-gallery-focus-desktop.png'],
  ['Empty · profile likes', 'profile-empty-likes-desktop.png'],
  ['Expired · saved offer', 'profile-expired-offer-desktop.png'],
  ['Error · hydration', 'profile-hydration-error-desktop.png'],
];
const stateData = await Promise.all(stateFiles.map(async ([label, file]) => [label, await dataUrl(path.join(outputDir, file))]));
await createBoard('comparison-interaction-states', `<!doctype html><style>
  *{box-sizing:border-box}body{margin:0;background:#10100f;color:#f4f0e8;font:22px Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(2,720px);gap:18px;padding:18px}.card{border:1px solid #b79a68;padding:10px}.card strong{display:block;padding:4px 2px 10px}.card img{display:block;width:700px;height:498px;object-fit:fill}
</style><div class="grid">${stateData.map(([label, src]) => `<div class="card"><strong>${label}</strong><img src="${src}"></div>`).join('')}</div>`, { width: 1500, height: 1700 });

const mobileData = await Promise.all([
  ['Home', 'home-mobile-390x844.png'],
  ['Square', 'square-mobile-390x844.png'],
  ['Guide detail', 'detail-mobile-390x844.png'],
  ['Profile', 'profile-mobile-390x844.png'],
].map(async ([label, file]) => [label, await dataUrl(path.join(outputDir, file))]));
await createBoard('comparison-mobile-responsiveness', `<!doctype html><style>
  *{box-sizing:border-box}body{margin:0;background:#10100f;color:#f4f0e8;font:20px Arial,sans-serif}.grid{display:grid;grid-template-columns:repeat(4,390px);gap:14px;padding:14px}.card strong{display:block;padding:0 0 8px}.card img{display:block;width:390px;height:844px}
</style><div class="grid">${mobileData.map(([label, src]) => `<div class="card"><strong>${label} · 390×844 @1x</strong><img src="${src}"></div>`).join('')}</div>`, { width: 1630, height: 900 });

await writeFile(path.join(outputDir, 'capture-manifest.json'), `${JSON.stringify({
  browser: 'Google Chrome via Playwright channel=chrome',
  sourceDimensions,
  evidence,
  runtimeErrors,
  runtimeWarnings,
}, null, 2)}\n`);

await browser.close();

if (runtimeErrors.length > 0) {
  console.error(JSON.stringify({ runtimeErrors, runtimeWarnings }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ captures: evidence.length, sourceDimensions, runtimeErrors, runtimeWarnings }, null, 2));
