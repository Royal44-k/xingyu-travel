import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { ProfileHub } from '@/features/profile/profile-hub';
import {
  type FavoriteOfferSnapshot,
  useLibraryStore,
  useLibraryStoreHydration,
} from '@/stores/library-store';
import { usePartnerStore, usePartnerStoreHydration } from '@/stores/partner-store';
import { useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';
import { createTripStore, useTripStore, useTripStoreHydration } from '@/stores/trip-store';

const expiredOffer: FavoriteOfferSnapshot = {
  key: '["演示航司","flight-expired"]',
  provider: '演示航司',
  productKind: 'flight',
  destination: '大理',
  totalPrice: 1260,
  currency: 'CNY',
  policySummary: '可退款｜含行李',
  observedAt: '2026-08-18T02:00:00.000Z',
  expiresAt: '2026-08-18T02:15:00.000Z',
  search: {
    kind: 'flight',
    destination: '大理',
    origin: '上海',
    from: '2026-09-18',
    to: '2026-09-22',
    travelers: 3,
  },
};

const hotelOffer: FavoriteOfferSnapshot = {
  key: '["演示酒店","hotel-current"]',
  provider: '演示酒店',
  productKind: 'hotel',
  destination: '桂林',
  totalPrice: 880,
  currency: 'CNY',
  policySummary: '可退款｜不含行李',
  observedAt: '2026-08-19T04:00:00.000Z',
  expiresAt: '2026-08-19T04:15:00.000Z',
};

beforeEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
  window.history.replaceState({}, '', '/profile');
  useProfileStore.setState({ personalizedFeed: true, interestTags: ['山野', '慢旅行'] });
  useLibraryStore.setState({ likedPostSlugs: [], favoriteOffers: {}, priceAlerts: {} });
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  usePartnerStore.setState({ intents: {}, matches: {}, visibleMatchIds: [], blockedCandidateIds: [] });
  useProfileStoreHydration.setState({ hydrated: true, hydrationError: false });
  useLibraryStoreHydration.setState({ hydrated: true, hydrationError: false });
  useTripStoreHydration.setState({ hydrated: true, hydrationError: false });
  usePartnerStoreHydration.setState({ hydrated: true, hydrationError: false });
});

describe('ProfileHub', () => {
  it('shows liked guides, trips, and offer validity from their owning stores', async () => {
    const user = userEvent.setup();
    seedAcceptedTrip();
    useLibraryStore.setState({
      likedPostSlugs: ['dali-slow-5d'],
      favoriteOffers: { [expiredOffer.key]: expiredOffer },
    });

    render(<ProfileHub initialTab="overview" />);

    expect(screen.getByText('1 个行程')).toBeInTheDocument();
    expect(screen.getByText('1 篇喜欢')).toBeInTheDocument();
    expect(screen.getByText('1 条收藏报价')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '喜欢' }));
    expect(screen.getByRole('link', { name: /把大理留给慢下来的人/ })).toHaveAttribute(
      'href',
      '/square/dali-slow-5d',
    );
    await user.click(screen.getByRole('tab', { name: '收藏报价' }));
    expect(screen.getByText('报价可能已变化')).toBeInTheDocument();
    expect(screen.getByText(/数据时间/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '重新比价' })).toHaveAttribute(
      'href',
      '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&origin=%E4%B8%8A%E6%B5%B7&from=2026-09-18&to=2026-09-22&travelers=3',
    );
  });

  it('uses semantic query-driven tabs, normalizes invalid tabs, and preserves browser history', async () => {
    const user = userEvent.setup();
    render(<ProfileHub initialTab="unknown" />);

    const tablist = screen.getByRole('tablist', { name: '个人中心内容' });
    expect(tablist).toBeInTheDocument();
    for (const tab of screen.getAllByRole('tab')) {
      expect(document.getElementById(tab.getAttribute('aria-controls') ?? '')).not.toBeNull();
    }
    expect(screen.getByRole('tab', { name: '概览' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: '概览' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '我的行程' }));
    expect(window.location.search).toBe('?tab=trips');
    expect(screen.getByRole('tabpanel', { name: '我的行程' })).toBeInTheDocument();

    window.history.pushState({}, '', '/profile?tab=likes');
    fireEvent(window, new PopStateEvent('popstate'));
    expect(screen.getByRole('tab', { name: '喜欢' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: '喜欢' })).toBeInTheDocument();
  });

  it('opens local overview summaries in their matching query tab', async () => {
    const user = userEvent.setup();
    render(<ProfileHub initialTab="overview" />);

    await user.click(screen.getByText('喜欢的攻略'));
    expect(screen.getByRole('tab', { name: '喜欢' })).toHaveAttribute('aria-selected', 'true');
    expect(window.location.search).toBe('?tab=likes');
    expect(screen.getByRole('tabpanel', { name: '喜欢' })).toHaveFocus();
  });

  it('supports arrow, Home, and End navigation with a roving tab stop', async () => {
    const user = userEvent.setup();
    render(<ProfileHub initialTab="overview" />);

    const overview = screen.getByRole('tab', { name: '概览' });
    overview.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: '我的行程' })).toHaveFocus();
    expect(window.location.search).toBe('?tab=trips');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: '兴趣偏好' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(overview).toHaveFocus();
  });

  it('keeps combined hydration neutral and identifies each failed domain explicitly', () => {
    useLibraryStoreHydration.setState({ hydrated: false, hydrationError: false });
    const view = render(<ProfileHub initialTab="overview" />);

    expect(screen.getByRole('status')).toHaveTextContent('正在整理当前浏览器里的旅行资料');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();

    useLibraryStoreHydration.setState({ hydrated: true, hydrationError: true });
    view.rerender(<ProfileHub initialTab="overview" />);
    expect(screen.getByRole('alert')).toHaveTextContent('喜欢与收藏资料暂时无法读取');
    expect(screen.getByRole('tablist', { name: '个人中心内容' })).toBeInTheDocument();
    expect(screen.queryByText('行程资料暂时无法读取')).not.toBeInTheDocument();
  });

  it('lets each owning store deliberately reset and recover its failed hydration domain', async () => {
    const user = userEvent.setup();
    seedAcceptedTrip();
    usePartnerStore.setState({ blockedCandidateIds: ['candidate-a'] });
    useTripStoreHydration.setState({ hydrated: true, hydrationError: true });
    usePartnerStoreHydration.setState({ hydrated: true, hydrationError: true });

    render(<ProfileHub initialTab="overview" />);

    await user.click(screen.getByRole('button', { name: '重置行程' }));
    expect(useTripStore.getState().trips).toEqual({});
    expect(useTripStoreHydration.getState().hydrationError).toBe(false);

    await user.click(screen.getByRole('button', { name: '重置搭子与安全' }));
    expect(usePartnerStore.getState().blockedCandidateIds).toEqual([]);
    expect(usePartnerStoreHydration.getState().hydrationError).toBe(false);
  });

  it('keeps unavailable likes removable and provides useful empty states', async () => {
    const user = userEvent.setup();
    useLibraryStore.setState({ likedPostSlugs: ['withdrawn-guide'] });
    render(<ProfileHub initialTab="likes" />);

    expect(screen.getByText('内容已不可用')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '移除不可用喜欢 withdrawn-guide' }));
    expect(screen.getByText('喜欢的攻略会保存在这里')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '去灵感广场' })).toHaveAttribute('href', '/square');

    await user.click(screen.getByRole('tab', { name: '收藏报价' }));
    expect(screen.getByText('收藏的报价会保存在这里')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '开始比价' })).toHaveAttribute('href', '/compare');

    await user.click(screen.getByRole('tab', { name: '我的行程' }));
    expect(screen.getByText('还没有保存的行程')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '从攻略创建' })).toHaveAttribute('href', '/square');
  });

  it('filters saved offers by product kind and explains the local-only alert boundary', async () => {
    const user = userEvent.setup();
    useLibraryStore.setState({
      favoriteOffers: { [expiredOffer.key]: expiredOffer, [hotelOffer.key]: hotelOffer },
      priceAlerts: {
        [hotelOffer.key]: { offerKey: hotelOffer.key, enabled: true, createdAt: '2026-08-19T04:01:00.000Z' },
      },
    });
    render(<ProfileHub initialTab="offers" />);

    expect(screen.getByText('大理')).toBeInTheDocument();
    expect(screen.getByText('桂林')).toBeInTheDocument();
    expect(screen.getByText('已保存提醒设置；本演示不会在关闭页面后推送')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '酒店 1' }));
    expect(screen.queryByText('大理')).not.toBeInTheDocument();
    expect(screen.getByText('桂林')).toBeInTheDocument();
  });

  it('transitions a live offer to stale exactly at its expiry boundary without polling', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01T00:00:00.000Z'));
    const boundaryOffer = {
      ...hotelOffer,
      observedAt: '2098-12-31T23:45:01.000Z',
      expiresAt: '2099-01-01T00:00:01.000Z',
    };
    useLibraryStore.setState({ favoriteOffers: { [boundaryOffer.key]: boundaryOffer } });

    render(<ProfileHub initialTab="offers" />);
    expect(screen.getByText(/有效至/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('报价可能已变化')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('re-evaluates offer expiry when the offers panel remounts after time passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2099-01-01T00:00:00.000Z'));
    const boundaryOffer = {
      ...hotelOffer,
      observedAt: '2098-12-31T23:45:01.000Z',
      expiresAt: '2099-01-01T00:00:01.000Z',
    };
    useLibraryStore.setState({ favoriteOffers: { [boundaryOffer.key]: boundaryOffer } });
    const view = render(<ProfileHub initialTab="offers" />);
    expect(screen.getByText(/有效至/)).toBeInTheDocument();

    view.unmount();
    act(() => vi.advanceTimersByTime(2000));
    render(<ProfileHub initialTab="offers" />);

    expect(screen.getByText('报价可能已变化')).toBeInTheDocument();
  });

  it('summarizes partner and guardian safety state without turning it into a guarantee', async () => {
    const user = userEvent.setup();
    const trip = seedAcceptedTrip();
    useTripStore.setState({
      trips: { [trip.id]: { ...trip, status: 'guarded', guardianEnabled: true } },
      guardianPlans: { [trip.id]: { id: 'plan-a', title: '标准守护方案' } },
    });

    render(<ProfileHub initialTab="safety" />);

    expect(screen.getByText('1 个守护中行程')).toBeInTheDocument();
    expect(screen.getByText(/不构成身份、安全或紧急响应担保/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '继续寻找搭子' })).toHaveAttribute('href', '/partners');
    await user.click(screen.getByRole('tab', { name: '兴趣偏好' }));
    expect(screen.getByRole('heading', { name: '推荐与兴趣偏好' })).toBeInTheDocument();
  });

  it('does not expose a false missed-check-in count when partner hydration failed', () => {
    const trip = seedAcceptedTrip();
    useTripStore.setState({
      trips: { [trip.id]: { ...trip, status: 'guarded', guardianEnabled: true } },
    });
    usePartnerStoreHydration.setState({ hydrated: true, hydrationError: true });

    render(<ProfileHub initialTab="safety" />);

    expect(screen.getByText('1 个守护中行程')).toBeInTheDocument();
    expect(screen.getByText('搭子安全状态暂不可用')).toBeInTheDocument();
    expect(screen.queryByText(/个错过签到状态/)).not.toBeInTheDocument();
  });
});

function seedAcceptedTrip() {
  const trip = createTripStore().getState().savePostAsTrip(extractTripDraft(postsBySlug['dali-slow-5d']));
  useTripStore.setState({ trips: { [trip.id]: trip } });
  return trip;
}
