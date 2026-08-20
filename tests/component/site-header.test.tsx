import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SiteHeader } from '@/components/site-header';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { createTripStore, useTripStore, useTripStoreHydration } from '@/stores/trip-store';

beforeEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStoreHydration.setState({ hydrated: true, hydrationError: false });
});

it('renders usable primary navigation with the homepage marked current', () => {
  render(<SiteHeader activePath="/" />);

  expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '行屿 XINGYU' })).toHaveAttribute(
    'href',
    '/',
  );
  expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('link', { name: '真实比价' })).toHaveAttribute(
    'href',
    '/compare',
  );
  expect(screen.getByRole('link', { name: '灵感广场' })).toHaveAttribute(
    'href',
    '/square',
  );
  expect(screen.getByRole('link', { name: '寻找搭子' })).toHaveAttribute(
    'href',
    '/partners',
  );
  expect(screen.getByRole('link', { name: '旅行助手' })).toHaveAttribute(
    'href',
    '/assistant',
  );
  expect(screen.getByRole('link', { name: '行程守护' })).toHaveAttribute(
    'href',
    '/trips?intent=guardian',
  );
  expect(screen.getByRole('link', { name: '我的行程' })).toHaveAttribute(
    'href',
    '/trips',
  );
  expect(screen.getByRole('link', { name: '个人中心' })).toHaveAttribute(
    'href',
    '/profile',
  );
});

it('marks only the matching route as current', () => {
  render(<SiteHeader activePath="/partners" />);

  expect(screen.getByRole('link', { name: '寻找搭子' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(screen.getByRole('link', { name: '首页' })).not.toHaveAttribute(
    'aria-current',
  );
});

describe('contextual guardian navigation', () => {
  it('keeps the guardian destination neutral until local trips finish hydrating', () => {
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });

    render(<SiteHeader variant="solid" />);

    expect(screen.queryByRole('link', { name: '行程守护' })).not.toBeInTheDocument();
    expect(screen.getByText('行程守护')).toHaveAttribute('aria-disabled', 'true');
  });

  it('links to the canonical source slug of the most recent supported guarded trip', () => {
    const store = createTripStore();
    const trip = store.getState().savePostAsTrip(extractTripDraft(postsBySlug['dali-slow-5d']));
    store.getState().enableGuardian(trip.id, true);
    useTripStore.setState({ trips: store.getState().trips });

    render(<SiteHeader variant="solid" />);

    expect(screen.getByRole('link', { name: '行程守护' })).toHaveAttribute(
      'href',
      '/guardian/dali-slow-5d',
    );
  });
});

it('closes the one mobile menu with Escape and restores focus to its trigger', async () => {
  const user = userEvent.setup();
  render(<SiteHeader variant="solid" />);

  const trigger = screen.getByRole('button', { name: '打开导航' });
  await user.click(trigger);
  const guardianLink = screen.getByRole('link', { name: '行程守护' });
  guardianLink.focus();
  await user.keyboard('{Escape}');

  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getAllByRole('navigation', { name: '主导航' })).toHaveLength(1);
});
