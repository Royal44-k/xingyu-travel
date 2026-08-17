import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { PreferenceSettings } from '@/features/profile/preference-settings';
import { useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';

describe('PreferenceSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useProfileStore.setState({
      personalizedFeed: true,
      interestTags: ['山野', '人文', '慢旅行'],
    });
    useProfileStoreHydration.setState({ hydrated: true, hydrationError: false });
  });

  it('clears interest labels and disables personalized recommendations', async () => {
    const user = userEvent.setup();
    render(<PreferenceSettings />);

    await user.click(screen.getByRole('switch', { name: '个性化推荐' }));
    await user.click(screen.getByRole('button', { name: '清除兴趣标签' }));

    expect(screen.getByText('当前使用按时间排序')).toBeInTheDocument();
    expect(useProfileStore.getState().personalizedFeed).toBe(false);
    expect(useProfileStore.getState().interestTags).toEqual([]);
  });

  it('keeps recommendation disabled when no interests remain', async () => {
    const user = userEvent.setup();
    useProfileStore.setState({ personalizedFeed: false, interestTags: [] });
    render(<PreferenceSettings />);

    const control = screen.getByRole('switch', { name: '个性化推荐' });
    expect(control).toBeDisabled();
    await user.click(control);
    expect(useProfileStore.getState().personalizedFeed).toBe(false);
  });
});
