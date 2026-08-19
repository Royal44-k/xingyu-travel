import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { PreferenceSettings } from '@/features/profile/preference-settings';
import { useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';

describe('InterestTagPicker', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useProfileStore.setState({
      personalizedFeed: true,
      interestTags: ['山野', '人文', '慢旅行'],
    });
    useProfileStoreHydration.setState({ hydrated: true, hydrationError: false });
  });

  it('keeps the tag library available after clear and can add a custom tag', async () => {
    const user = userEvent.setup();
    render(<PreferenceSettings />);

    await user.click(screen.getByRole('button', { name: '清除全部兴趣' }));
    await user.click(screen.getByRole('button', { name: '确认清除' }));
    await user.click(screen.getByRole('button', { name: '海岛' }));
    await user.type(screen.getByLabelText('自定义兴趣'), '博物馆{Enter}');

    expect(useProfileStore.getState().interestTags).toEqual(['海岛', '博物馆']);
    expect(screen.getByRole('button', { name: '海岛' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('removes a selected custom tag and explains invalid custom input inline', async () => {
    const user = userEvent.setup();
    render(<PreferenceSettings />);

    await user.type(screen.getByLabelText('自定义兴趣'), '博物馆{Enter}');
    await user.click(screen.getByRole('button', { name: '移除 博物馆' }));
    await user.type(screen.getByLabelText('自定义兴趣'), '旅{Enter}');

    expect(useProfileStore.getState().interestTags).not.toContain('博物馆');
    expect(screen.getByRole('alert')).toHaveTextContent('兴趣标签需为 2–12 个可见字符');
  });
});
