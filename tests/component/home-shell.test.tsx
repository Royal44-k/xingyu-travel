import { act, render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import HomePage from '@/app/page';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { useLibraryStore, useLibraryStoreHydration } from '@/stores/library-store';
import { createTripStore, useTripStore, useTripStoreHydration } from '@/stores/trip-store';

beforeEach(() => {
  window.localStorage.clear();
  useLibraryStore.setState({ likedPostSlugs: [], favoriteOffers: {}, priceAlerts: {} });
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useLibraryStoreHydration.setState({ hydrated: true, hydrationError: false });
  useTripStoreHydration.setState({ hydrated: true, hydrationError: false });
});

it('renders the Xingyu brand promise', () => {
  render(<HomePage />);

  expect(
    screen.getByRole('heading', {
      name: '把远方，变成一段安心抵达的旅程',
    }),
  ).toBeInTheDocument();
});

it('keeps the site banner outside the main content landmark', () => {
  render(<HomePage />);

  const banner = screen.getByRole('banner');
  const main = screen.getByRole('main');

  expect(main).not.toContainElement(banner);
});

it('tells the complete home story with four guide themes and valid product routes', () => {
  render(<HomePage />);

  expect(screen.getByRole('region', { name: '目的地旅行取景窗' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '按想过的日子，选择一篇攻略' })).toBeInTheDocument();
  for (const theme of ['海岛', '城市', '山野', '人文']) {
    expect(screen.getByRole('heading', { name: theme })).toBeInTheDocument();
  }
  expect(screen.getByRole('heading', { name: '只比较最后要付的总价' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '开始一次真实比价' })).toHaveAttribute('href', '/compare');
  expect(screen.getByRole('heading', { name: '一篇攻略，可以继续变成自己的行程' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '从大理攻略开始' })).toHaveAttribute('href', '/square/dali-slow-5d');
  expect(screen.getByRole('heading', { name: '变化发生时，先把选择说清楚' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '打开旅行助手' })).toHaveAttribute('href', '/assistant');
  expect(screen.getByRole('heading', { name: '同行是选择，不是安全担保' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '了解可信搭子边界' })).toHaveAttribute('href', '/partners');
});

it('keeps local home content neutral until both stores hydrate, then reveals recent data', () => {
  const post = postsBySlug['dali-slow-5d'];
  const trip = createTripStore().getState().savePostAsTrip(extractTripDraft(post), post.media[0].src);
  useTripStore.setState({ trips: { [trip.id]: trip } });
  useLibraryStore.setState({ likedPostSlugs: [post.slug] });
  useLibraryStoreHydration.setState({ hydrated: false, hydrationError: false });
  useTripStoreHydration.setState({ hydrated: false, hydrationError: false });

  const view = render(<HomePage />);

  expect(screen.getByRole('status', { name: '本地旅行资料状态' })).toHaveTextContent('正在整理当前浏览器里的旅行资料');
  expect(screen.queryByRole('heading', { name: trip.title })).not.toBeInTheDocument();

  act(() => {
    useLibraryStoreHydration.setState({ hydrated: true });
    useTripStoreHydration.setState({ hydrated: true });
  });
  view.rerender(<HomePage />);

  expect(screen.getByRole('heading', { name: trip.title })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: `继续${trip.title}` })).toHaveAttribute(
    'href',
    `/trips/${trip.sourcePostSlug}`,
  );
  expect(screen.getByRole('link', { name: `再读${post.title}` })).toHaveAttribute(
    'href',
    `/square/${post.slug}`,
  );
});
