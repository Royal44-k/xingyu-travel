import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postsBySlug } from '@/data/posts';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { useTripStore } from '@/domain/trips/trip-store';
import { ConvertToTrip } from '@/features/square/convert-to-trip';
import { TripDraftHandoff } from '@/features/trips/trip-draft-handoff';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const dali = postsBySlug['dali-slow-5d'];

beforeEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ drafts: {}, hydrated: true });
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
});

describe('TripDraftHandoff', () => {
  it('recovers gracefully with a link to the source guide when no local draft exists', () => {
    render(<TripDraftHandoff slug="dali-slow-5d" />);

    expect(screen.getByText('未找到本地行程草稿')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回原攻略' })).toHaveAttribute('href', '/square/dali-slow-5d');
  });

  it('shows a neutral state until hydration completes, then hands off every saved item', () => {
    useTripStore.setState({ drafts: { 'dali-slow-5d': extractTripDraft(dali) }, hydrated: false });
    render(<TripDraftHandoff hydrate={() => undefined} slug="dali-slow-5d" />);

    expect(screen.getByText('正在读取本地草稿…')).toBeInTheDocument();
    expect(screen.queryByText('未找到本地行程草稿')).not.toBeInTheDocument();

    act(() => useTripStore.setState({ hydrated: true }));

    expect(screen.getByRole('heading', { name: /大理 · 5 天行程草稿已保存/ })).toBeInTheDocument();
    expect(screen.getByText('¥5,200')).toBeInTheDocument();
    for (const item of dali.itinerary) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(item.location)).length).toBeGreaterThan(0);
      expect(screen.getByText(new RegExp(item.description))).toBeInTheDocument();
    }
    expect(screen.queryByText('未找到本地行程草稿')).not.toBeInTheDocument();
  });
});
