import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const targetUrl = process.env.XINGYU_TARGET_URL;
const usePreviewBypass = process.env.XINGYU_PREVIEW_BYPASS === '1';
const resultName = process.env.XINGYU_LAYOUT_RESULT_NAME ?? 'wide-layout.json';
const screenshotName = process.env.XINGYU_LAYOUT_SCREENSHOT_NAME ?? 'wide-layout.png';
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
  assert(bypassMap && typeof bypassMap === 'object', 'No protection bypass map returned');
  const secret = Object.keys(bypassMap).find(
    (candidate) => bypassMap[candidate]?.scope === 'automation-bypass'
      && bypassMap[candidate]?.isEnvVar === true,
  ) ?? Object.keys(bypassMap).find(
    (candidate) => bypassMap[candidate]?.scope === 'automation-bypass',
  );
  assert(secret, 'No existing automation bypass token returned');
  return secret;
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const runtimeIssues = [];

try {
  const extraHTTPHeaders = usePreviewBypass
    ? { 'x-vercel-protection-bypass': await getPreviewBypassSecret() }
    : {};
  const context = await browser.newContext({
    viewport: { width: 2280, height: 858 },
    deviceScaleFactor: 1,
    extraHTTPHeaders,
  });
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
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const copy = document.getElementById('hero-title')?.parentElement;
    if (!copy) return false;
    const style = getComputedStyle(copy);
    return style.opacity === '1'
      && (style.transform === 'none' || style.transform === 'matrix(1, 0, 0, 1, 0, 0)');
  });
  await page.evaluate(() => window.scrollTo(0, 120));

  const boxes = await page.evaluate(() => {
    const description = [...document.querySelectorAll('p')].find((node) =>
      node.textContent?.includes('真实比价，严选资源，行程守护'));
    const route = document.querySelector('[aria-label="目的地路径：大理至丽江"]');
    const planner = document.querySelector('form[action="/compare"]');
    const hero = document.querySelector('section[aria-labelledby="hero-title"]');
    if (!description || !route || !planner || !hero) return null;
    return {
      description: description.getBoundingClientRect().toJSON(),
      route: route.getBoundingClientRect().toJSON(),
      planner: planner.getBoundingClientRect().toJSON(),
      hero: hero.getBoundingClientRect().toJSON(),
    };
  });
  assert(boxes, 'Required Hero elements were unavailable');

  const result = {
    result: 'passed',
    targetUrl: new URL(targetUrl).origin,
    mode: usePreviewBypass ? 'protected-preview' : 'public-production',
    viewport: { width: 2280, height: 858, deviceScaleFactor: 1 },
    scrollY: 120,
    descriptionToRouteGap: boxes.route.y - (boxes.description.y + boxes.description.height),
    routeToComposerGap: boxes.planner.y - (boxes.route.y + boxes.route.height),
    descriptionToComposerGap: boxes.planner.y - (boxes.description.y + boxes.description.height),
    leftAlignmentDelta: Math.abs(boxes.route.x - boxes.description.x),
    plannerInsideHero: boxes.planner.y + boxes.planner.height <= boxes.hero.y + boxes.hero.height,
    runtimeIssues,
  };

  assert(result.descriptionToRouteGap >= 24, 'Route is too close to or overlaps the description');
  assert(result.routeToComposerGap >= 24, 'Planner is too close to or overlaps the route');
  assert(result.descriptionToComposerGap >= 96, 'Planner does not clear the full description');
  assert(result.leftAlignmentDelta <= 1, 'Route is not aligned with the description');
  assert(result.plannerInsideHero, 'Planner escapes the Hero');
  assert(runtimeIssues.length === 0, `Runtime issues: ${runtimeIssues.join(' | ')}`);

  await page.screenshot({ path: fileURLToPath(new URL(screenshotName, artifactDir)), fullPage: false });
  writeFileSync(fileURLToPath(new URL(resultName, artifactDir)), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result));
  await context.close();
} finally {
  await browser.close();
}
