import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { TripCollection } from '@/features/trips/trip-collection';
import { createTripStore, useTripStore, useTripStoreHydration } from '@/stores/trip-store';

beforeEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStoreHydration.setState({ hydrated: true, hydrationError: false });
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
});

describe('TripCollection', () => {
  it('sorts by updated time, summarizes counts, and links cards to real trip routes', () => {
    seedTrips();
    render(<TripCollection />);

    expect(screen.getByText('3 个行程 · 当前显示 3 个')).toBeInTheDocument();
    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByRole('heading', { name: '川西慢行计划' })).toBeInTheDocument();
    expect(within(cards[1]).getByRole('heading', { name: '桂林慢行计划' })).toBeInTheDocument();
    expect(within(cards[2]).getByRole('heading', { name: '大理慢行计划' })).toBeInTheDocument();
    expect(within(cards[0]).getByRole('link', { name: /继续规划川西慢行计划/ })).toHaveAttribute(
      'href',
      '/trips/sichuan-autumn-road',
    );
    expect(screen.queryByRole('link', { name: /demo/i })).not.toBeInTheDocument();
  });

  it('filters active, guarded and archived trips without copying derived state', async () => {
    const user = userEvent.setup();
    seedTrips();
    render(<TripCollection />);

    await user.click(screen.getByRole('button', { name: '守护中 1' }));
    expect(screen.getByRole('heading', { name: '大理慢行计划' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '川西慢行计划' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '已归档 1' }));
    expect(screen.getByRole('heading', { name: '桂林慢行计划' })).toBeInTheDocument();
    expect(screen.getByText('3 个行程 · 当前显示 1 个')).toBeInTheDocument();
  });

  it('keeps a stable loading state until hydration finishes', () => {
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    render(<TripCollection />);

    expect(screen.getByRole('heading', { name: '正在读取我的行程…' })).toBeInTheDocument();
    expect(screen.queryByText('还没有保存的行程')).not.toBeInTheDocument();
  });

  it('shows a recovery state after hydration validation fails', () => {
    useTripStoreHydration.setState({ hydrated: true, hydrationError: true });
    render(<TripCollection />);

    expect(screen.getByRole('heading', { name: '本地行程暂时无法读取' })).toBeInTheDocument();
    expect(screen.getByText(/浏览器中的原数据没有被覆盖/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '去灵感广场' })).toHaveAttribute('href', '/square');
  });

  it('directs an empty collection toward guides and comparison', () => {
    render(<TripCollection />);

    expect(screen.getByRole('heading', { name: '还没有保存的行程' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '去灵感广场' })).toHaveAttribute('href', '/square');
    expect(screen.getByRole('link', { name: '先做一次比价' })).toHaveAttribute('href', '/compare');
  });

  it('explains how to create and enable guardian when guardian intent opens an empty collection', () => {
    render(<TripCollection intent="guardian" />);

    expect(screen.getByRole('heading', { name: '开启守护前，先创建行程' })).toBeInTheDocument();
    expect(screen.getByText(/进入行程工作台后，可在“共同决策”中确认并开启本地守护演示/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '从攻略创建行程' })).toHaveAttribute('href', '/square');
  });

  it('offers the most recent active trip as the guardian setup destination', () => {
    seedTrips();
    render(<TripCollection intent="guardian" />);

    const setup = screen.getByRole('region', { name: '开启行程守护' });
    expect(within(setup).getByText(/行程守护不会自动开启/)).toBeInTheDocument();
    expect(within(setup).getByRole('link', { name: '前往川西慢行计划开启守护' })).toHaveAttribute(
      'href',
      '/trips/sichuan-autumn-road',
    );
  });
});

function seedTrips() {
  const store = createTripStore();
  const dali = store.getState().savePostAsTrip(extractTripDraft(postsBySlug['dali-slow-5d']));
  const sichuan = store.getState().savePostAsTrip(extractTripDraft(postsBySlug['sichuan-autumn-road']));
  const guilin = store.getState().savePostAsTrip(extractTripDraft(postsBySlug['guilin-river-morning']));
  useTripStore.setState({
    trips: {
      [dali.id]: { ...dali, status: 'guarded', guardianEnabled: true, updatedAt: '2026-08-19T09:00:00.000Z' },
      [sichuan.id]: { ...sichuan, status: 'active', updatedAt: '2026-08-19T11:00:00.000Z' },
      [guilin.id]: { ...guilin, status: 'archived', updatedAt: '2026-08-19T10:00:00.000Z' },
    },
  });
}
