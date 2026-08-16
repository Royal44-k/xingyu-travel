import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { NormalizedOffer, QuoteEvent } from '@/domain/comparison/types';
import { ComparisonClient } from '@/features/comparison/comparison-client';

const initialSearch = {
  destination: '大理',
  kind: 'flight',
  origin: '上海',
  from: '2026-08-22',
  to: '2026-08-27',
  travelers: 2,
} as const;

const offers: NormalizedOffer[] = [
  {
    id: 'offer-1',
    provider: '云程旅行',
    kind: 'flight',
    title: '上海至大理 MU演示航班',
    origin: '上海',
    destination: '大理',
    basePrice: 860,
    taxes: 120,
    mandatoryFees: 40,
    totalPrice: 1020,
    currency: 'CNY',
    priceExplanation: '基础价 ¥860 · 税费 ¥120 · 必付费用 ¥40',
    baggageIncluded: true,
    refundable: false,
    updatedAt: '2026-08-16T09:00:00+08:00',
    demoMode: true,
    providerVerified: true,
    includedBenefits: ['托运行李'],
  },
  {
    id: 'offer-2',
    provider: '山海出行',
    kind: 'flight',
    title: '上海至大理 HO演示航班',
    origin: '上海',
    destination: '大理',
    basePrice: 900,
    taxes: 80,
    mandatoryFees: 0,
    totalPrice: 980,
    currency: 'CNY',
    priceExplanation: '基础价 ¥900 · 税费 ¥80 · 必付费用 ¥0',
    baggageIncluded: false,
    refundable: true,
    updatedAt: '2026-08-16T11:30:00+08:00',
    demoMode: true,
    providerVerified: false,
    includedBenefits: [],
  },
  {
    id: 'offer-3',
    provider: '远岫旅行',
    kind: 'flight',
    title: '上海至大理 3U演示航班',
    origin: '上海',
    destination: '大理',
    basePrice: 980,
    taxes: 70,
    mandatoryFees: 0,
    totalPrice: 1050,
    currency: 'CNY',
    priceExplanation: '基础价 ¥980 · 税费 ¥70 · 必付费用 ¥0',
    baggageIncluded: true,
    refundable: true,
    updatedAt: '2026-08-16T11:45:00+08:00',
    demoMode: true,
    providerVerified: true,
    includedBenefits: ['托运行李'],
  },
  {
    id: 'offer-4',
    provider: '栖云假期',
    kind: 'flight',
    title: '上海至大理 CA演示航班',
    origin: '上海',
    destination: '大理',
    basePrice: 1010,
    taxes: 90,
    mandatoryFees: 0,
    totalPrice: 1100,
    currency: 'CNY',
    priceExplanation: '基础价 ¥1010 · 税费 ¥90 · 必付费用 ¥0',
    baggageIncluded: true,
    refundable: false,
    updatedAt: '2026-08-16T11:50:00+08:00',
    demoMode: true,
    providerVerified: true,
    includedBenefits: ['托运行李'],
  },
];

function streamEvents(events: QuoteEvent[]): AsyncIterable<QuoteEvent> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) yield event;
    },
  };
}

describe('ComparisonClient incremental results', () => {
  it('keeps earlier offers, deduplicates repeated provider/id pairs, and retains results after degradation', async () => {
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents([
          { type: 'offer', payload: offers[0] },
          { type: 'offer', payload: offers[0] },
          { type: 'offer', payload: offers[1] },
          {
            type: 'degraded',
            payload: { unavailableProviders: 1, message: '1 家供应商暂未响应' },
          },
          { type: 'complete', payload: { offerCount: 2 } },
        ])}
      />,
    );

    expect(await screen.findByText('¥1,020 含税总价')).toBeInTheDocument();
    expect(await screen.findByText('¥980 含税总价')).toBeInTheDocument();
    expect(screen.getAllByTestId('offer-row')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('1 家供应商暂未响应');
    expect(screen.getByText('基础价 ¥860 · 税费 ¥120 · 必付费用 ¥40')).toBeInTheDocument();
    expect(screen.getByText('报价较早，请在确认前复核')).toBeInTheDocument();
    expect(screen.getByText('2026-08-16 09:00 更新')).toBeInTheDocument();
    expect(screen.getAllByText(/供应商可信度/)).toHaveLength(2);
  });

  it('sorts, opens filters and price calendar, and changes the active product tab', async () => {
    const user = userEvent.setup();
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents(offers.slice(0, 2).map((payload) => ({ type: 'offer', payload })))}
      />,
    );
    await screen.findByText('¥1,020 含税总价');

    await user.selectOptions(screen.getByLabelText('报价排序'), 'price-desc');
    const rows = screen.getAllByTestId('offer-row');
    expect(within(rows[0]).getByText('¥1,020 含税总价')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '筛选条件' }));
    expect(screen.getByRole('dialog', { name: '筛选条件' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '仅看可退改' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭筛选' }));

    await user.click(screen.getByRole('button', { name: '价格日历' }));
    expect(screen.getByRole('region', { name: '价格日历' })).toHaveTextContent('8月22日');

    await user.click(screen.getByRole('tab', { name: '酒店' }));
    expect(screen.getByRole('tab', { name: '酒店' })).toHaveAttribute('aria-selected', 'true');
  });

  it('expands conditions, favorites, toggles alerts, and limits comparison selection to three', async () => {
    const user = userEvent.setup();
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents(offers.map((payload) => ({ type: 'offer', payload })))}
      />,
    );
    await screen.findByText('¥1,020 含税总价');

    await user.click(screen.getByRole('button', { name: '查看 云程旅行 报价条件' }));
    expect(screen.getByText('含 1 件托运行李')).toBeInTheDocument();
    expect(screen.getByText('不可免费退改')).toBeInTheDocument();

    const favorite = screen.getByRole('button', { name: '收藏 云程旅行 报价' });
    await user.click(favorite);
    expect(favorite).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('switch', { name: '降价提醒' }));
    expect(screen.getByRole('switch', { name: '降价提醒' })).toHaveAttribute('aria-checked', 'true');

    const compareChecks = screen.getAllByRole('checkbox', { name: /加入同屏对比/ });
    await user.click(compareChecks[0]);
    await user.click(compareChecks[1]);
    await user.click(compareChecks[2]);
    expect(compareChecks[3]).toBeDisabled();
    expect(screen.getByText('已选择 3/3 项')).toBeInTheDocument();
  });

  it('requires an explicit sandbox confirmation and never presents booking or payment as completed', async () => {
    const user = userEvent.setup();
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents([{ type: 'offer', payload: offers[0] }])}
      />,
    );
    await screen.findByText('¥1,020 含税总价');

    await user.click(screen.getByRole('button', { name: '查看 云程旅行 演示报价' }));
    const dialog = screen.getByRole('dialog', { name: '沙箱演示确认' });
    expect(dialog).toHaveTextContent('沙箱 / Demo');
    expect(dialog).toHaveTextContent('不会预订、出票或付款');
    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: '我知道了' }));
    expect(screen.queryByRole('dialog', { name: '沙箱演示确认' })).not.toBeInTheDocument();
  });

  it('shows a stable empty result after a zero-offer stream completes', async () => {
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents([{ type: 'complete', payload: { offerCount: 0 } }])}
      />,
    );

    expect(await screen.findByText('暂无可用的沙箱报价')).toBeInTheDocument();
    expect(screen.queryByText('正在接收沙箱报价…')).not.toBeInTheDocument();
  });

  it('filters real rows by refundability, included benefit, and verified supplier', async () => {
    const user = userEvent.setup();
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents([
          ...offers.slice(0, 3).map((payload) => ({ type: 'offer' as const, payload })),
          { type: 'complete', payload: { offerCount: 3 } },
        ])}
      />,
    );
    await screen.findByText('上海至大理 MU演示航班');

    await user.click(screen.getByRole('button', { name: '筛选条件' }));
    await user.click(screen.getByRole('checkbox', { name: '仅看可退改' }));
    await user.click(screen.getByRole('checkbox', { name: '仅看含权益' }));
    await user.click(screen.getByRole('checkbox', { name: '仅看已验证供应商' }));
    await user.click(screen.getByRole('button', { name: '应用筛选' }));

    expect(screen.getAllByTestId('offer-row')).toHaveLength(1);
    expect(screen.getByText('远岫旅行')).toBeInTheDocument();
    expect(screen.queryByText('山海出行')).not.toBeInTheDocument();
  });

  it('keeps favorites and compare selection independent for providers sharing a local id', async () => {
    const user = userEvent.setup();
    const sharedIdOffers = [
      { ...offers[0], id: 'shared-local-id' },
      { ...offers[1], id: 'shared-local-id' },
    ];
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents(sharedIdOffers.map((payload) => ({ type: 'offer', payload })))}
      />,
    );
    await screen.findByText('云程旅行');

    const firstFavorite = screen.getByRole('button', { name: '收藏 云程旅行 报价' });
    const secondFavorite = screen.getByRole('button', { name: '收藏 山海出行 报价' });
    await user.click(firstFavorite);
    expect(firstFavorite).toHaveAttribute('aria-pressed', 'true');
    expect(secondFavorite).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('checkbox', { name: '加入同屏对比：云程旅行' }));
    await user.click(screen.getByRole('checkbox', { name: '加入同屏对比：山海出行' }));
    expect(screen.getByText('已选择 2/3 项')).toBeInTheDocument();
  });

  it('opens a real accessible comparison table for selected offers and closes it', async () => {
    const user = userEvent.setup();
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents(offers.slice(0, 2).map((payload) => ({ type: 'offer', payload })))}
      />,
    );
    await screen.findByText('云程旅行');
    await user.click(screen.getByRole('checkbox', { name: '加入同屏对比：云程旅行' }));
    await user.click(screen.getByRole('checkbox', { name: '加入同屏对比：山海出行' }));
    await user.click(screen.getByRole('button', { name: '查看同屏差异' }));

    const dialog = screen.getByRole('dialog', { name: '报价同屏对比' });
    const table = within(dialog).getByRole('table', { name: '已选报价差异' });
    expect(table).toHaveTextContent('云程旅行');
    expect(table).toHaveTextContent('山海出行');
    expect(table).toHaveTextContent('含税总价');
    expect(table).toHaveTextContent('行李与权益');
    expect(table).toHaveTextContent('退改条件');
    await user.click(within(dialog).getByRole('button', { name: '关闭同屏对比' }));
    expect(screen.queryByRole('dialog', { name: '报价同屏对比' })).not.toBeInTheDocument();
  });

  it('traps filter focus, closes on Escape, and restores focus to its trigger', async () => {
    const user = userEvent.setup();
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents([{ type: 'complete', payload: { offerCount: 0 } }])}
      />,
    );
    const trigger = screen.getByRole('button', { name: '筛选条件' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '筛选条件' });
    const close = within(dialog).getByRole('button', { name: '关闭筛选' });
    const apply = within(dialog).getByRole('button', { name: '应用筛选' });

    expect(close).toHaveFocus();
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(apply).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '筛选条件' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('traps outbound focus, closes on Escape, and restores focus to the quote trigger', async () => {
    const user = userEvent.setup();
    render(
      <ComparisonClient
        initialSearch={initialSearch}
        now="2026-08-16T12:30:00+08:00"
        stream={streamEvents([{ type: 'offer', payload: offers[0] }])}
      />,
    );
    await screen.findByText('云程旅行');
    const trigger = screen.getByRole('button', { name: '查看 云程旅行 演示报价' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '沙箱演示确认' });
    const close = within(dialog).getByRole('button', { name: '我知道了' });

    expect(close).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '沙箱演示确认' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
