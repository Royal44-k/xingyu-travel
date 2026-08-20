import { expect, test } from '@playwright/test';

const unexpectedConsoleMessages = (page: import('@playwright/test').Page) => {
  const messages: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      messages.push(`console.error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      messages.push(`http ${response.status()}: ${response.url()}`);
    }
  });
  return messages;
};

test.use({ viewport: { width: 1440, height: 1024 } });

test('guide to guarded alternative plan through the public UI', async ({ page }) => {
  const errors = unexpectedConsoleMessages(page);

  await page.goto('/');
  await page.getByRole('tab', { name: '机票' }).click();
  await page.getByRole('textbox', { name: '到达地' }).fill('大理');
  await page.getByLabel('出发日期').fill('2026-09-18');
  await page.getByLabel('返程日期').fill('2026-09-22');
  await page.getByLabel('乘机人').selectOption('3');
  const quoteStream = page.waitForResponse((response) => response.url().includes('/api/v1/comparison/searches/') && response.url().endsWith('/events'));
  await page.getByRole('button', { name: '开始规划' }).click();

  await expect(page).toHaveURL(/\/compare\?/);
  const submittedSearch = Object.fromEntries(new URL(page.url()).searchParams);
  expect(submittedSearch).toEqual({
    kind: 'flight',
    destination: '大理',
    from: '2026-09-18',
    to: '2026-09-22',
    travelers: '3',
  });
  expect((await quoteStream).status()).toBe(200);
  await expect(page.getByText('大理 · 沙箱演示报价', { exact: true })).toBeVisible();
  await expect(page.getByText('¥1,010 含税总价')).toBeVisible();

  await page.getByRole('link', { name: '灵感广场' }).click();
  await page.getByRole('link', { name: '把大理留给慢下来的人：5 天洱海与白族村落路线', exact: true }).click();
  await page.getByRole('button', { name: '转为行程' }).click();
  await page.getByRole('button', { name: '确认并保存行程' }).click();
  await page.getByRole('switch', { name: '行程守护演示' }).click();
  await page.getByLabel('我明确同意开启本地守护演示').check();
  await page.getByRole('button', { name: '确认开启' }).click();
  await expect(page.getByRole('switch', { name: '行程守护演示' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '发布搭子意愿' }).click();
  await expect(page.getByRole('status')).toContainText('搭子意愿已保存到本浏览器');
  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '寻找搭子' }).click();
  await expect(page.getByText('已读取本地匹配意愿', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '发布匹配意愿' })).toHaveCount(0);
  await expect(page.getByTestId('partner-card-user-muyu').getByLabel('匹配分 92')).toBeVisible();
  await page.getByRole('button', { name: '愿意认识木雨' }).click();
  await page.getByRole('button', { name: '模拟对方同意（沙箱）' }).click();
  await page.getByRole('link', { name: '进入聊天' }).click();
  await expect(page.getByText(/其他敏感信息/)).toBeVisible();

  await page.getByRole('link', { name: /行程守护/ }).click();
  await expect(page.getByRole('heading', { name: '备选方案' })).toBeVisible();
  const planA = page.getByRole('button', { name: '选择 Plan A：调整苍山徒步为古城慢游方案' });
  await expect(planA).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('status')).toHaveCount(0);
  await planA.click();
  await expect(planA).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status')).toHaveText('已选择 Plan A：调整苍山徒步为古城慢游；方案已保存到本浏览器的旅行决策，未创建订单');
  expect(errors).toEqual([]);
});
