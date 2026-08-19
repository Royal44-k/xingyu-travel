import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { ConvertToTrip } from '@/features/square/convert-to-trip';
import { TripCollection } from '@/features/trips/trip-collection';
import { createTripStore, useTripStore, useTripStoreHydration } from '@/stores/trip-store';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const dali = postsBySlug['dali-slow-5d'];
const sichuan = postsBySlug['sichuan-autumn-road'];

beforeEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStoreHydration.setState({ hydrated: true, hydrationError: false });
});

afterEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
  useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
});

describe('ConvertToTrip', () => {
  it('opens a complete review before saving a canonical trip', async () => {
    const user = userEvent.setup();
    render(<ConvertToTrip post={dali} onNavigate={() => undefined} />);

    await user.click(screen.getByRole('button', { name: /转为行程/ }));

    const dialog = screen.getByRole('dialog', { name: '确认行程草稿' });
    expect(dialog).toHaveTextContent('大理');
    expect(dialog).toHaveTextContent('5 天');
    expect(dialog).toHaveTextContent('¥5,200');
    expect(within(dialog).getAllByText(/DAY [1-5]/)).toHaveLength(5);
    expect(useTripStore.getState().trips).toEqual({});
  });

  it('closes the review with Escape and restores trigger focus', async () => {
    const user = userEvent.setup();
    render(<ConvertToTrip post={dali} onNavigate={() => undefined} />);
    const trigger = screen.getByRole('button', { name: /转为行程/ });
    await user.click(trigger);

    expect(screen.getByRole('button', { name: '关闭行程审核' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: '确认行程草稿' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('saves directly into My Trips and the new guide appears immediately', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(
      <>
        <ConvertToTrip post={dali} onNavigate={navigate} />
        <TripCollection />
      </>,
    );

    await user.click(screen.getByRole('button', { name: /转为行程/ }));
    await user.click(screen.getByRole('button', { name: '确认并保存行程' }));

    const trip = useTripStore.getState().trips['draft-dali-slow-5d'];
    expect(trip).toMatchObject({
      sourcePostSlug: 'dali-slow-5d',
      coverImage: dali.media[0].src,
    });
    expect(screen.getByRole('link', { name: /继续规划大理慢行计划/ })).toHaveAttribute(
      'href',
      '/trips/dali-slow-5d',
    );
    expect(navigate).toHaveBeenCalledWith('/trips/dali-slow-5d');
  });

  it('enters the existing canonical trip on repeat and communicates that it is already saved', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const original = useTripStore.getState().savePostAsTrip(extractTripDraft(dali), dali.media[0].src);
    render(<ConvertToTrip post={dali} onNavigate={navigate} />);

    const trigger = screen.getByRole('button', { name: '已在我的行程中' });
    await user.click(trigger);

    expect(navigate).toHaveBeenCalledWith('/trips/dali-slow-5d');
    expect(Object.values(useTripStore.getState().trips)).toEqual([original]);
    expect(screen.queryByRole('dialog', { name: '确认行程草稿' })).not.toBeInTheDocument();
  });

  it('waits for canonical hydration and keeps persisted trips before conversion', async () => {
    const user = userEvent.setup();
    useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    const persistedStore = createTripStore();
    const source = persistedStore.getState().savePostAsTrip(extractTripDraft(sichuan));
    const persisted = window.localStorage.getItem('xingyu-demo-v1');
    expect(persisted).not.toBeNull();
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    render(<ConvertToTrip post={dali} onNavigate={() => undefined} />);

    const trigger = screen.getByRole('button', { name: /转为行程/ });
    expect(trigger).toBeDisabled();
    expect(screen.getByText('正在读取本地行程…')).toBeInTheDocument();
    await waitFor(() => expect(useTripStoreHydration.getState().hydrated).toBe(true));
    expect(trigger).toBeEnabled();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '确认并保存行程' }));
    expect(useTripStore.getState().trips[source.id]).toEqual(source);
    expect(Object.keys(useTripStore.getState().trips)).toHaveLength(2);
  });

  it('blocks conversion after malformed canonical storage and leaves its bytes untouched', async () => {
    const malformedBytes = '{broken';
    useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    window.localStorage.setItem('xingyu-demo-v1', malformedBytes);
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    render(<ConvertToTrip post={dali} onNavigate={() => undefined} />);

    await waitFor(() => expect(useTripStoreHydration.getState()).toMatchObject({
      hydrated: true,
      hydrationError: true,
    }));
    expect(screen.getByRole('button', { name: /转为行程/ })).toBeDisabled();
    expect(screen.getByText('本地行程暂时无法读取，无法转为行程。浏览器中的数据未被覆盖。')).toBeInTheDocument();
    expect(window.localStorage.getItem('xingyu-demo-v1')).toBe(malformedBytes);
  });
});
