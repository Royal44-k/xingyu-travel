import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const targetUrl = process.env.XINGYU_TARGET_URL;
const usePreviewBypass = process.env.XINGYU_PREVIEW_BYPASS === '1';
const resultName = process.env.XINGYU_ICON_RESULT_NAME ?? 'brand-icon-verification.json';
const artifactDir = new URL('.', import.meta.url);

if (!targetUrl) throw new Error('XINGYU_TARGET_URL is required');

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
  const response = await fetch(
    'https://api.vercel.com/v9/projects/prj_IeyWF8pZrE35C9Sp6eJWHcFpIiCl?teamId=team_GXUbEGjD0inFlQqufnaKsSVQ',
    { headers: { authorization: `Bearer ${auth.token}` } },
  );
  assert(response.ok, `Vercel project API returned ${response.status}`);
  const project = await response.json();
  const bypassMap = project.protectionBypass;
  const secret = bypassMap && Object.keys(bypassMap).find(
    (candidate) => bypassMap[candidate]?.scope === 'automation-bypass'
      && bypassMap[candidate]?.isEnvVar === true,
  );
  assert(secret, 'No existing automation bypass token returned');
  return secret;
}

function pngDimensions(bytes) {
  assert(bytes.length > 24, 'PNG response is too small');
  assert(Buffer.from(bytes.subarray(0, 8)).toString('hex') === '89504e470d0a1a0a', 'Invalid PNG signature');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const runtimeIssues = [];

try {
  const extraHTTPHeaders = usePreviewBypass
    ? { 'x-vercel-protection-bypass': await getPreviewBypassSecret() }
    : {};
  const context = await browser.newContext({ extraHTTPHeaders });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      runtimeIssues.push(`console.${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => runtimeIssues.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400) runtimeIssues.push(`http ${response.status()}: ${response.url()}`);
  });

  const response = await page.goto(new URL('/', targetUrl).href, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  assert(response?.status() === 200, `Homepage status was ${response?.status()}`);
  const iconHrefs = await page.locator('link[rel~="icon"]').evaluateAll((links) =>
    links.map((link) => link.href));
  assert(iconHrefs.length > 0, 'No icon link was published');
  assert(!iconHrefs.some((href) => href.includes('guardian-rainy-mountain')), 'Old travel photograph is still published as an icon');

  const pngAssets = [
    ['/icon.png', 512, 512],
    ['/apple-icon.png', 180, 180],
    ['/icon-192.png', 192, 192],
    ['/icon-512.png', 512, 512],
  ];
  const fetchedAssets = await page.evaluate(async (paths) => Promise.all(paths.map(async (path) => {
    const response = await fetch(path);
    return {
      path,
      status: response.status,
      contentType: response.headers.get('content-type'),
      bytes: [...new Uint8Array(await response.arrayBuffer())],
    };
  })), [...pngAssets.map(([path]) => path), '/favicon.ico']);
  const assets = [];
  for (const [path, expectedWidth, expectedHeight] of pngAssets) {
    const fetched = fetchedAssets.find((entry) => entry.path === path);
    assert(fetched, `${path} was not fetched`);
    const bytes = Uint8Array.from(fetched.bytes);
    const dimensions = pngDimensions(bytes);
    assert(fetched.status === 200, `${path} returned ${fetched.status}`);
    assert(dimensions.width === expectedWidth && dimensions.height === expectedHeight, `${path} dimensions were ${dimensions.width}x${dimensions.height}`);
    assets.push({ path, status: fetched.status, contentType: fetched.contentType, byteLength: bytes.length, ...dimensions });
  }

  const fetchedFavicon = fetchedAssets.find((entry) => entry.path === '/favicon.ico');
  assert(fetchedFavicon, '/favicon.ico was not fetched');
  const faviconBytes = Uint8Array.from(fetchedFavicon.bytes);
  assert(fetchedFavicon.status === 200, `/favicon.ico returned ${fetchedFavicon.status}`);
  assert(Buffer.from(faviconBytes.subarray(0, 4)).toString('hex') === '00000100', 'Invalid ICO signature');
  assets.push({ path: '/favicon.ico', status: fetchedFavicon.status, contentType: fetchedFavicon.contentType, byteLength: faviconBytes.length });

  const manifestResult = await page.evaluate(async () => {
    const response = await fetch('/manifest.webmanifest');
    return { status: response.status, body: await response.json() };
  });
  assert(manifestResult.status === 200, `Manifest returned ${manifestResult.status}`);
  const manifest = manifestResult.body;
  assert(JSON.stringify(manifest.icons) === JSON.stringify([
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
  ]), 'Manifest icon declarations are incorrect');
  assert(runtimeIssues.length === 0, `Runtime issues: ${runtimeIssues.join(' | ')}`);

  const result = {
    result: 'passed',
    targetUrl: new URL(targetUrl).origin,
    mode: usePreviewBypass ? 'protected-preview' : 'public-production',
    iconHrefs,
    assets,
    manifestIcons: manifest.icons,
    runtimeIssues,
  };
  writeFileSync(
    fileURLToPath(new URL(resultName, artifactDir)),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify(result));
  await context.close();
} finally {
  await browser.close();
}
