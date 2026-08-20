import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { posts } from '@/data/posts';
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
  it('searches guide titles, excerpts, destinations, tags, and location names', async () => {
    const user = userEvent.setup();
    render(<SquarePage />);

    const search = screen.getByRole('searchbox', { name: '搜索攻略' });
    for (const [query, expectedTitle] of [
      ['外滩蓝调', /上海 3 日/],
      ['完整转场日', /贵州 6 日/],
      ['三亚', /三亚 5 日/],
      ['海岛', /三亚 5 日/],
      ['蜈支洲岛', /三亚 5 日/],
    ] as const) {
      await user.clear(search);
      await user.type(search, query);
      expect(screen.getByRole('heading', { name: expectedTitle })).toBeInTheDocument();
    }
  });

  it('combines theme and maximum-day filters with each constraint independently active', async () => {
    const user = userEvent.setup();
    render(<SquarePage />);

    await user.click(screen.getByRole('button', { name: '山水' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '最多天数' }), '5');

    expect(screen.getByRole('heading', { name: /桂林 4 日/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /上海 3 日/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /贵州 6 日/ })).not.toBeInTheDocument();
  });

  it('offers only numeric maximum-day thresholds that exclude at least one current guide', () => {
    render(<SquarePage />);

    const options = screen.getByRole('combobox', { name: '最多天数' }).querySelectorAll('option');
    const thresholds = Array.from(options)
      .filter((option) => option.value !== '')
      .map((option) => Number(option.value));

    expect(thresholds).toEqual([3, 4, 5]);
    for (const threshold of thresholds) {
      expect(posts.some((post) => post.days > threshold)).toBe(true);
    }
  });

  it('clears only session filters while preserving chronological mode and interests', async () => {
    useProfileStore.setState({ personalizedFeed: false, interestTags: ['海岛', '慢旅行'] });
    const user = userEvent.setup();
    render(<SquarePage />);

    await user.type(screen.getByRole('searchbox', { name: '搜索攻略' }), '三亚');
    await user.click(screen.getByRole('button', { name: '海岛' }));
    await user.click(screen.getByRole('button', { name: '清除筛选' }));

    expect(screen.getByRole('button', { name: '按时间排序' })).toHaveAttribute('aria-pressed', 'true');
    expect(useProfileStore.getState().interestTags).toEqual(['海岛', '慢旅行']);
    expect(screen.getByRole('heading', { name: /川西 6 日/ })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: '搜索攻略' })).toHaveValue('');
  });

  it('offers a clear recovery action when no guide matches', async () => {
    const user = userEvent.setup();
    render(<SquarePage />);

    await user.type(screen.getByRole('searchbox', { name: '搜索攻略' }), '不存在的目的地');

    expect(screen.getByRole('status')).toHaveTextContent('没有找到符合条件的攻略');
    await user.click(screen.getByRole('button', { name: '重新浏览全部攻略' }));
    expect(screen.getByRole('heading', { name: /三亚 5 日/ })).toBeInTheDocument();
  });

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

  it('holds neutral while preference hydration is pending, then shows the saved chronological feed once', async () => {
    let releaseHydration: (() => void) | undefined;
    const pendingHydration = new Promise<void>((resolve) => { releaseHydration = resolve; });
    const rehydrate = vi.spyOn(useProfileStore.persist, 'rehydrate').mockImplementation(async () => {
      await pendingHydration;
      useProfileStore.setState({ personalizedFeed: false, interestTags: ['慢旅行'] });
    });
    useProfileStoreHydration.setState({ hydrated: false, hydrationError: false });

    render(<SquarePage />);

    expect(screen.getByRole('status')).toHaveTextContent('正在读取浏览器本地偏好');
    expect(screen.queryByRole('button', { name: '为你推荐' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '按时间排序' })).not.toBeInTheDocument();

    await act(async () => { releaseHydration?.(); });

    expect(await screen.findByRole('button', { name: '按时间排序' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '为你推荐' })).toHaveAttribute('aria-pressed', 'false');
    rehydrate.mockRestore();
  });
});
