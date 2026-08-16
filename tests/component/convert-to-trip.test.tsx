import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { postsBySlug } from '@/data/posts';
import { useTripStore } from '@/domain/trips/trip-store';
import { ConvertToTrip } from '@/features/square/convert-to-trip';
import { TripDraftHandoff } from '@/features/trips/trip-draft-handoff';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const dali = postsBySlug['dali-slow-5d'];

beforeEach(() => {
  window.localStorage.clear();
  useTripStore.setState({ drafts: {} });
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

    expect(useTripStore.getState().drafts['dali-slow-5d']).toMatchObject({ destination: '大理', days: 5 });
    expect(navigate).toHaveBeenCalledWith('/trips/dali-slow-5d');
  });
});

describe('TripDraftHandoff', () => {
  it('recovers gracefully with a link to the source guide when no local draft exists', () => {
    render(<TripDraftHandoff slug="dali-slow-5d" />);

    expect(screen.getByText('未找到本地行程草稿')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回原攻略' })).toHaveAttribute('href', '/square/dali-slow-5d');
  });
});
