import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { PreferenceSettings } from '@/features/profile/preference-settings';
import { createProfileStore, useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';

describe('PreferenceSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useProfileStore.setState({
      personalizedFeed: true,
      interestTags: ['山野', '人文', '慢旅行'],
    });
    useProfileStoreHydration.setState({ hydrated: true, hydrationError: false });
  });

  it('fails closed for malformed browser persistence without overwriting it until an explicit reset', async () => {
    const malformed = JSON.stringify({
      state: {
        demoProfile: { age: 26, identityVerified: true, riskStatus: 'clear' },
        personalizedFeed: true,
        interestTags: 'not-a-list',
      },
      version: 1,
    });
    window.localStorage.setItem('xingyu-profile-demo-v1', malformed);
    let hydrationError: unknown;
    const store = createProfileStore({ onHydrationError: (error) => { hydrationError = error; } });

    await store.persist.rehydrate();

    expect(store.getState().personalizedFeed).toBe(false);
    expect(store.getState().interestTags).toEqual([]);
    expect(hydrationError).toBeInstanceOf(Error);
    expect(window.localStorage.getItem('xingyu-profile-demo-v1')).toBe(malformed);

    store.getState().resetProfilePreferences();
    expect(store.getState().personalizedFeed).toBe(true);
    expect(store.getState().interestTags).toEqual(['山野', '人文', '慢旅行']);
    expect(window.localStorage.getItem('xingyu-profile-demo-v1')).not.toBe(malformed);
  });

  it('clears interest labels and disables personalized recommendations after confirmation', async () => {
    const user = userEvent.setup();
    render(<PreferenceSettings />);

    await user.click(screen.getByRole('switch', { name: '个性化推荐' }));
    await user.click(screen.getByRole('button', { name: '清除全部兴趣' }));
    await user.click(screen.getByRole('button', { name: '确认清除' }));

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
