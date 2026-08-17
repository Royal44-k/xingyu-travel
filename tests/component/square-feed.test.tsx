import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedControls } from '@/features/square/feed-controls';
import SquarePage from '@/app/square/page';
import { useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';

beforeEach(() => {
  window.localStorage.clear();
  useProfileStore.setState({
    personalizedFeed: true,
    interestTags: ['山野', '人文', '慢旅行'],
  });
  useProfileStoreHydration.setState({ hydrated: true, hydrationError: false });
});

describe('FeedControls', () => {
  it('lets users switch off recommendations', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<FeedControls mode="recommended" onModeChange={change} />);

    await user.click(screen.getByRole('button', { name: '按时间排序' }));

    expect(change).toHaveBeenCalledWith('chronological');
  });

  it('lets users inspect and clear their demo interest tags', async () => {
    const user = userEvent.setup();
    const clear = vi.fn();
    render(
      <FeedControls
        mode="recommended"
        interestTags={['慢旅行', '咖啡']}
        onClearInterestTags={clear}
        onModeChange={() => undefined}
      />,
    );

    await user.click(screen.getByRole('button', { name: '查看兴趣偏好' }));
    expect(screen.getByText('慢旅行')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '清除兴趣偏好' }));
    expect(clear).toHaveBeenCalledOnce();
  });

  it('states that personalization is off when chronological mode is active, even when tags exist', async () => {
    const user = userEvent.setup();
    render(
      <FeedControls
        mode="chronological"
        interestTags={['慢旅行']}
        onModeChange={() => undefined}
      />,
    );

    expect(screen.getByRole('button', { name: '按时间排序' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: '查看兴趣偏好' }));
    expect(screen.getByText('个性化推荐已关闭，当前按时间排序。')).toBeInTheDocument();
  });

  it('clears interests by moving the square feed into chronological mode', async () => {
    const user = userEvent.setup();
    render(<SquarePage />);

    await user.click(screen.getByRole('button', { name: '查看兴趣偏好' }));
    await user.click(screen.getByRole('button', { name: '清除兴趣偏好' }));

    expect(screen.getByRole('button', { name: '按时间排序' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '为你推荐' })).toBeDisabled();
    expect(screen.getByText('个性化推荐已关闭，当前按时间排序。')).toBeInTheDocument();
  });

  it('does not re-enable recommendations after all interests are cleared', async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(<FeedControls interestTags={[]} mode="chronological" onModeChange={change} />);

    const recommendation = screen.getByRole('button', { name: '为你推荐' });
    expect(recommendation).toBeDisabled();
    expect(recommendation).toHaveAccessibleDescription('兴趣偏好已清空；以后添加兴趣偏好后可重新开启推荐。');
    await user.click(recommendation);
    expect(change).not.toHaveBeenCalledWith('recommended');
  });

  it('uses the profile preference as the only source for chronological ordering', () => {
    useProfileStore.setState({ personalizedFeed: false, interestTags: ['慢旅行'] });
    render(<SquarePage />);

    expect(screen.getByRole('button', { name: '按时间排序' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '为你推荐' })).toHaveAttribute('aria-pressed', 'false');
  });
});
