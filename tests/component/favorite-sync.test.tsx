import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FavoriteButton } from '@/features/library/favorite-button';
import SquarePostPage from '@/app/square/[slug]/page';
import {
  useLibraryStore,
  useLibraryStoreHydration,
} from '@/stores/library-store';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(() => {
  window.localStorage.clear();
  useLibraryStore.setState({
    likedPostSlugs: [],
    favoriteOffers: {},
    priceAlerts: {},
  });
  useLibraryStoreHydration.setState({ hydrated: true, hydrationError: false });
});

describe('FavoriteButton', () => {
  it('exposes the shared persisted favorite action on the guide detail route', async () => {
    const user = userEvent.setup();
    render(await SquarePostPage({ params: Promise.resolve({ slug: 'sanya-bay-rainforest-5d' }) }));

    await user.click(screen.getByRole('button', { name: /喜欢 三亚 5 日/ }));

    expect(useLibraryStore.getState().likedPostSlugs).toContain('sanya-bay-rainforest-5d');
    expect(screen.getByRole('button', { name: /喜欢 三亚 5 日/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps a guide liked after remount and exposes the same state to another button', async () => {
    const user = userEvent.setup();
    render(
      <>
        <FavoriteButton label="大理攻略" slug="dali-slow-5d" />
        <FavoriteButton label="大理详情" slug="dali-slow-5d" />
      </>,
    );

    await user.click(screen.getByRole('button', { name: '喜欢 大理攻略' }));

    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('已喜欢 大理攻略');
    cleanup();
    await useLibraryStore.persist.rehydrate();
    render(<FavoriteButton label="大理攻略" slug="dali-slow-5d" />);
    expect(screen.getByRole('button', { pressed: true })).toBeInTheDocument();
  });

  it('holds a saved guide action disabled until hydration finishes without showing an actionable false state', async () => {
    let releaseHydration: (() => void) | undefined;
    const pendingHydration = new Promise<void>((resolve) => { releaseHydration = resolve; });
    const rehydrate = vi.spyOn(useLibraryStore.persist, 'rehydrate').mockImplementation(async () => {
      await pendingHydration;
      useLibraryStore.setState({ likedPostSlugs: ['dali-slow-5d'] });
    });
    useLibraryStoreHydration.setState({ hydrated: false, hydrationError: false });

    render(<FavoriteButton label="大理攻略" slug="dali-slow-5d" />);

    expect(screen.getByRole('button', { name: '喜欢 大理攻略' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('正在读取本地喜欢状态');

    await act(async () => { releaseHydration?.(); });

    expect(await screen.findByRole('button', { pressed: true })).toBeEnabled();
    rehydrate.mockRestore();
  });

  it('fails closed with a visible explanation associated with the disabled favorite control', () => {
    useLibraryStoreHydration.setState({ hydrated: true, hydrationError: true });

    render(<FavoriteButton label="大理攻略" slug="dali-slow-5d" />);

    const favorite = screen.getByRole('button', { name: '喜欢 大理攻略' });
    const explanation = screen.getByRole('alert');
    expect(favorite).toBeDisabled();
    expect(explanation).toBeVisible();
    expect(explanation).toHaveTextContent('本地喜欢暂不可用');
    expect(favorite).toHaveAccessibleDescription('本地喜欢暂不可用');
  });
});
