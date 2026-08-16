import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { useTripHydrationStore, useTripStore } from '@/domain/trips/trip-store';
import { ConvertToTrip } from '@/features/square/convert-to-trip';
import { TripDraftHandoff } from '@/features/trips/trip-draft-handoff';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const dali = postsBySlug['dali-slow-5d'];
const sichuan = postsBySlug['sichuan-autumn-road'];
const persistKey = 'xingyu-demo-trip-drafts';

function seedPersistedDrafts(drafts: Record<string, ReturnType<typeof extractTripDraft>>) {
  window.localStorage.setItem(persistKey, JSON.stringify({ state: { drafts }, version: 0 }));
}

beforeEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ drafts: {} });
  useTripHydrationStore.setState({ hydrated: true, hydrationError: false });
});

afterEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ drafts: {} });
  useTripHydrationStore.setState({ hydrated: false, hydrationError: false });
});

describe('ConvertToTrip', () => {
  it('opens a complete review before saving any draft', async () => {
    const user = userEvent.setup();
    render(<ConvertToTrip post={dali} onNavigate={() => undefined} />);
    const trigger = screen.getByRole('button', { name: /转为行程/ });

    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: '确认行程草稿' });
    expect(dialog).toHaveTextContent('大理');
    expect(dialog).toHaveTextContent('5 天');
    expect(dialog).toHaveTextContent('¥5,200');
    expect(within(dialog).getAllByText(/DAY [1-5]/)).toHaveLength(5);
    for (const item of dali.itinerary) {
      expect(dialog).toHaveTextContent(item.title);
      expect(dialog).toHaveTextContent(item.location);
      expect(dialog).toHaveTextContent(item.description);
    }
    expect(useTripStore.getState().drafts).toEqual({});
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

  it('saves only on confirmation and navigates to the exact draft destination', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<ConvertToTrip post={dali} onNavigate={navigate} />);

    await user.click(screen.getByRole('button', { name: /转为行程/ }));
    await user.click(screen.getByRole('button', { name: '确认并保存草稿' }));

    expect(useTripStore.getState().drafts['dali-slow-5d']).toMatchObject({
      destination: '大理',
      days: 5,
      items: dali.itinerary.map((item, index) => ({ ...item, id: `dali-slow-5d-${index + 1}` })),
    });
    expect(navigate).toHaveBeenCalledWith('/trips/dali-slow-5d');
  });

  it('rehydrates before conversion and preserves seeded drafts in memory and localStorage', async () => {
    const user = userEvent.setup();
    const existing = extractTripDraft(sichuan);
    useTripStore.setState({ drafts: {} });
    useTripHydrationStore.setState({ hydrated: false, hydrationError: false });
    seedPersistedDrafts({ [existing.sourcePostSlug]: existing });
    render(<ConvertToTrip post={dali} onNavigate={() => undefined} />);

    const trigger = screen.getByRole('button', { name: /转为行程/ });
    expect(trigger).toBeDisabled();
    expect(screen.getByText('正在读取本地草稿…')).toBeInTheDocument();
    await waitFor(() => expect(useTripHydrationStore.getState().hydrated).toBe(true));
    expect(trigger).toBeEnabled();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '确认并保存草稿' }));

    expect(useTripStore.getState().drafts).toMatchObject({
      'sichuan-autumn-road': existing,
      'dali-slow-5d': { destination: '大理', days: 5 },
    });
    const persisted = JSON.parse(window.localStorage.getItem(persistKey) ?? '{}');
    expect(persisted.state.drafts).toMatchObject({
      'sichuan-autumn-road': existing,
      'dali-slow-5d': { destination: '大理', days: 5 },
    });
  });
});

describe('TripDraftHandoff', () => {
  it('recovers gracefully with a link to the source guide when no local draft exists', () => {
    render(<TripDraftHandoff slug="dali-slow-5d" />);

    expect(screen.getByText('未找到本地行程草稿')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回原攻略' })).toHaveAttribute('href', '/square/dali-slow-5d');
  });

  it('shows a neutral state until actual seeded hydration completes, then hands off every saved item', async () => {
    const persistedDraft = extractTripDraft(dali);
    useTripStore.setState({ drafts: {} });
    useTripHydrationStore.setState({ hydrated: false, hydrationError: false });
    seedPersistedDrafts({ 'dali-slow-5d': persistedDraft });
    render(<TripDraftHandoff slug="dali-slow-5d" />);

    expect(screen.getByText('正在读取本地草稿…')).toBeInTheDocument();
    expect(screen.queryByText('未找到本地行程草稿')).not.toBeInTheDocument();

    await waitFor(() => expect(useTripHydrationStore.getState().hydrated).toBe(true));

    expect(screen.getByRole('heading', { name: /大理 · 5 天行程草稿已保存/ })).toBeInTheDocument();
    expect(screen.getByText('¥5,200')).toBeInTheDocument();
    for (const item of dali.itinerary) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(item.location)).length).toBeGreaterThan(0);
      expect(screen.getByText(new RegExp(item.description))).toBeInTheDocument();
    }
    expect(screen.queryByText('未找到本地行程草稿')).not.toBeInTheDocument();
  });

  it('shows safe recovery copy when persisted draft hydration fails', async () => {
    useTripStore.setState({ drafts: {} });
    useTripHydrationStore.setState({ hydrated: false, hydrationError: false });
    window.localStorage.setItem(persistKey, '{broken');
    render(<TripDraftHandoff slug="dali-slow-5d" />);

    expect(screen.getByText('正在读取本地草稿…')).toBeInTheDocument();
    await waitFor(() => expect(useTripHydrationStore.getState().hydrated).toBe(true));
    expect(screen.getByText('本地草稿暂时无法读取')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回原攻略' })).toHaveAttribute('href', '/square/dali-slow-5d');
    expect(window.localStorage.getItem(persistKey)).toBe('{broken');
  });
});
