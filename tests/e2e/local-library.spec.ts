import { expect, test, type Page } from '@playwright/test';

const runtimeErrors = new WeakMap<Page, string[]>();

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

test.describe('local closed loop', () => {
  test('interest clear -> re-add -> recommendation survives reload', async ({ page }) => {
    await page.goto('/profile?tab=preferences');
    await expect(page.getByRole('heading', { name: '推荐与兴趣偏好' })).toBeVisible();

    await page.getByRole('button', { name: '清除全部兴趣' }).click();
    await page.getByRole('button', { name: '确认清除' }).click();
    await expect(page.getByRole('switch', { name: '个性化推荐' })).toBeDisabled();

    await page.getByRole('button', { name: '海岛', exact: true }).click();
    await page.getByRole('button', { name: '城市漫游', exact: true }).click();
    const recommendation = page.getByRole('switch', { name: '个性化推荐' });
    await expect(recommendation).toBeEnabled();
    await recommendation.click();

    await page.reload();
    await expect(page.getByRole('heading', { name: '推荐与兴趣偏好' })).toBeVisible();
    await expect(page.getByRole('button', { name: '海岛', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: '城市漫游', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('switch', { name: '个性化推荐' })).toHaveAttribute('aria-checked', 'true');
  });

  test('like guide -> reload -> profile likes -> unlike', async ({ page }) => {
    const title = '把大理留给慢下来的人：5 天洱海与白族村落路线';

    await page.goto('/square');
    await expect(page.getByRole('button', { name: '查看兴趣偏好' })).toBeVisible();
    const favorite = page.getByRole('button', { name: `喜欢 ${title}` });
    await expect(favorite).toBeEnabled();
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(page.getByRole('button', { name: '查看兴趣偏好' })).toBeVisible();
    await expect(page.getByRole('button', { name: `喜欢 ${title}` })).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/profile?tab=likes');
    const likedGuide = page.getByRole('link', { name: title, exact: true });
    await expect(likedGuide).toBeVisible();
    await likedGuide.click();
    await expect(page).toHaveURL(/\/square\/dali-slow-5d$/);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    const detailFavorite = page.getByRole('button', { name: `喜欢 ${title}` });
    await expect(detailFavorite).toHaveAttribute('aria-pressed', 'true');
    await detailFavorite.click();

    await page.goto('/profile?tab=likes');
    await expect(page.getByRole('heading', { name: '喜欢的攻略会保存在这里' })).toBeVisible();
  });

  test('guide conversion -> My Trips -> workbench -> compare', async ({ page }) => {
    await page.goto('/square/dali-slow-5d');
    const convert = page.getByRole('button', { name: '转为行程' });
    await expect(convert).toBeEnabled();
    await convert.click();
    await expect(page.getByRole('dialog', { name: '确认行程草稿' })).toBeVisible();
    await page.getByRole('button', { name: '确认并保存行程' }).click();

    await expect(page).toHaveURL(/\/trips\/dali-slow-5d$/);
    await expect(page.getByRole('heading', { name: '大理慢行计划' })).toBeVisible();
    await page.getByRole('link', { name: '我的行程' }).click();
    await expect(page).toHaveURL(/\/trips$/);
    await expect(page.getByRole('heading', { name: '我的行程' })).toBeVisible();

    await page.getByRole('link', { name: '继续规划大理慢行计划' }).click();
    await expect(page.getByRole('region', { name: '行程设置' })).toBeVisible();
    await page.getByRole('link', { name: '进入比价' }).click();
    await expect(page).toHaveURL(/\/compare\?/);
    await expect(page.getByText('大理 · 沙箱演示报价', { exact: true })).toBeVisible();
  });

  test('favorite offer + alert -> profile -> re-search -> remove confirmation', async ({ page }) => {
    const offerTitle = '上海至大理演示航班 B';
    const provider = '星屿沙箱演示航班';
    await page.goto('/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-09-18&to=2026-09-22&travelers=3');
    const offer = page.getByTestId('offer-row').filter({
      has: page.getByRole('heading', { name: offerTitle, exact: true }),
    });
    await expect(offer).toContainText(provider);
    await expect(offer.getByText('¥1,010 含税总价')).toBeVisible();
    const favorite = offer.getByRole('button', { name: `收藏 ${provider} 报价` });
    await expect(favorite).toBeEnabled();
    await favorite.click();
    await expect(favorite).toHaveAttribute('aria-pressed', 'true');

    const alert = page.getByRole('switch', { name: '降价提醒' });
    await expect(alert).toBeEnabled();
    await alert.click();
    await expect(page.getByText('已保存提醒设置；本演示不会在关闭页面后推送')).toBeVisible();

    await page.goto('/profile?tab=offers');
    await expect(page.getByRole('heading', { name: '收藏报价' })).toBeVisible();
    const savedOffer = page.locator('article').filter({ hasText: `机票 · ${provider}` }).filter({ hasText: '¥ 1,010' });
    await expect(savedOffer.getByRole('heading', { name: '大理', exact: true })).toBeVisible();
    await expect(savedOffer.getByText('保存时总价')).toBeVisible();
    await expect(savedOffer.getByText('数据时间')).toBeVisible();
    await expect(savedOffer.getByText('已保存（关闭页面后不会推送）')).toBeVisible();
    await savedOffer.getByRole('link', { name: '重新比价' }).click();

    await expect(page).toHaveURL(/\/compare\?/);
    const reSearchUrl = new URL(page.url());
    expect(reSearchUrl.pathname).toBe('/compare');
    expect(Object.fromEntries(reSearchUrl.searchParams)).toEqual({
      kind: 'flight',
      destination: '大理',
      from: '2026-09-18',
      to: '2026-09-22',
      travelers: '3',
    });

    const reSearchedOffer = page.getByTestId('offer-row').filter({
      has: page.getByRole('heading', { name: offerTitle, exact: true }),
    });
    await expect(reSearchedOffer).toContainText(provider);
    await expect(reSearchedOffer.getByText('¥1,010 含税总价')).toBeVisible();
    const savedFavorite = reSearchedOffer.getByRole('button', { name: `收藏 ${provider} 报价` });
    await expect(savedFavorite).toHaveAttribute('aria-pressed', 'true');
    await savedFavorite.click();
    const confirmation = page.getByRole('dialog', { name: '移除收藏报价' });
    await expect(confirmation).toBeVisible();
    await page.getByRole('button', { name: '确认移除并关闭提醒' }).click();
    await expect(confirmation).toBeHidden();
    await expect(savedFavorite).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('switch', { name: '降价提醒' })).toBeDisabled();

    await page.goto('/profile?tab=offers');
    await expect(page.getByRole('heading', { name: '收藏的报价会保存在这里' })).toBeVisible();
  });
});
