import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { riskEventsForTrip } from '@/data/risk-events';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { RiskTimeline } from '@/features/guardian/risk-timeline';
import { useTripStore } from '@/stores/trip-store';

beforeEach(() => {
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStore.getState().acceptDraft(extractTripDraft(postsBySlug['dali-slow-5d']));
});

describe('RiskTimeline', () => {
  it('makes demo risk freshness explicit and records a Plan A choice only in local trip decisions', async () => {
    const user = userEvent.setup();
    render(<RiskTimeline events={riskEventsForTrip('dali-slow-5d')} tripId="dali-slow-5d" />);

    const timeline = screen.getByRole('region', { name: '行程守护风险时间线' });
    expect(timeline).toHaveTextContent('固定沙箱事件');
    expect(timeline).toHaveTextContent('2026-08-16T09:00:00+08:00');
    expect(within(timeline).getAllByRole('article', { name: /Plan [ABC]/ })).toHaveLength(3);
    const planA = within(timeline).getByRole('button', { name: '选择 Plan A：调整苍山徒步为古城慢游方案' });
    expect(planA).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    await user.click(planA);
    expect(planA).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('已选择 Plan A：调整苍山徒步为古城慢游；方案已保存到本浏览器的旅行决策，未创建订单');
    expect(useTripStore.getState().guardianPlans['draft-dali-slow-5d']).toEqual({
      id: 'PLAN-A',
      title: '调整苍山徒步为古城慢游',
    });
  });
});
