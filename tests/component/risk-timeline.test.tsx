import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { riskEventsForTrip } from '@/data/risk-events';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { RiskTimeline } from '@/features/guardian/risk-timeline';
import { useTripStore, useTripStoreHydration } from '@/stores/trip-store';

const tripSlug = 'dali-slow-5d';
const draft = extractTripDraft(postsBySlug[tripSlug]);

beforeEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStoreHydration.setState({ hydrated: true, hydrationError: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
});

describe('RiskTimeline', () => {
  it('keeps a neutral state while the local trip store is still hydrating', async () => {
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    let finishHydration: (() => void) | undefined;
    const hydration = new Promise<void>((resolve) => { finishHydration = resolve; });
    vi.spyOn(useTripStore.persist, 'rehydrate').mockReturnValue(hydration);

    render(<RiskTimeline events={riskEventsForTrip(tripSlug)} tripId={tripSlug} />);

    expect(screen.getByRole('heading', { name: '正在读取守护行程…' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /选择 Plan/ })).not.toBeInTheDocument();
    finishHydration?.();
    await waitFor(() => expect(useTripStoreHydration.getState().hydrated).toBe(true));
  });

  it('fails closed with named recovery when persisted trip validation fails', () => {
    seedTrip({ guarded: true });
    useTripStoreHydration.setState({ hydrated: true, hydrationError: true });

    render(<RiskTimeline events={riskEventsForTrip(tripSlug)} tripId={tripSlug} />);

    expect(screen.getByRole('heading', { name: '本地守护行程暂时无法读取' })).toBeInTheDocument();
    expect(screen.getByText(/原始浏览器数据已保留且没有被覆盖/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回我的行程' })).toHaveAttribute(
      'href',
      '/trips?intent=guardian',
    );
    expect(screen.queryByRole('button', { name: /选择 Plan/ })).not.toBeInTheDocument();
  });

  it('does not expose plan actions when the known event has no local trip', () => {
    render(<RiskTimeline events={riskEventsForTrip(tripSlug)} tripId={tripSlug} />);

    expect(screen.getByRole('heading', { name: '当前浏览器没有这条守护行程' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回我的行程' })).toHaveAttribute(
      'href',
      '/trips?intent=guardian',
    );
    expect(screen.queryByRole('button', { name: /选择 Plan/ })).not.toBeInTheDocument();
  });

  it('directs a known but not guardian-enabled trip back to its workbench', () => {
    seedTrip({ guarded: false });

    render(<RiskTimeline events={riskEventsForTrip(tripSlug)} tripId={tripSlug} />);

    expect(screen.getByRole('heading', { name: '这条行程尚未开启守护' })).toBeInTheDocument();
    expect(screen.getByText(/先在行程工作台阅读边界并确认开启/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回行程开启守护' })).toHaveAttribute(
      'href',
      '/trips/dali-slow-5d',
    );
    expect(screen.queryByRole('button', { name: /选择 Plan/ })).not.toBeInTheDocument();
  });

  it('makes demo risk freshness explicit and records a Plan A choice for a hydrated guarded trip', async () => {
    const user = userEvent.setup();
    seedTrip({ guarded: true });
    render(<RiskTimeline events={riskEventsForTrip(tripSlug)} tripId={tripSlug} />);

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

  it('ignores a stale plan click if the canonical trip disappears before the handler runs', async () => {
    const user = userEvent.setup();
    seedTrip({ guarded: true });
    render(
      <div onClickCapture={() => useTripStore.setState({ trips: {} })}>
        <RiskTimeline events={riskEventsForTrip(tripSlug)} tripId={tripSlug} />
      </div>,
    );

    await expect(user.click(screen.getByRole('button', { name: /选择 Plan A/ }))).resolves.toBeUndefined();
    expect(useTripStore.getState().guardianPlans).toEqual({});
  });
});

function seedTrip({ guarded }: { guarded: boolean }) {
  const trip = useTripStore.getState().savePostAsTrip(draft);
  if (guarded) useTripStore.getState().enableGuardian(trip.id, true);
}
