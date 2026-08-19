'use client';

import { Sparkle } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { InterestTagPicker } from '@/features/profile/interest-tag-picker';
import {
  hydrateProfileStore,
  useProfileStore,
  useProfileStoreHydration,
} from '@/stores/profile-store';

export function PreferenceSettings() {
  const personalizedFeed = useProfileStore((state) => state.personalizedFeed);
  const interestTags = useProfileStore((state) => state.interestTags);
  const setPersonalizedFeed = useProfileStore((state) => state.setPersonalizedFeed);
  const addInterestTag = useProfileStore((state) => state.addInterestTag);
  const removeInterestTag = useProfileStore((state) => state.removeInterestTag);
  const clearInterestTags = useProfileStore((state) => state.clearInterestTags);
  const resetProfilePreferences = useProfileStore((state) => state.resetProfilePreferences);
  const hydrated = useProfileStoreHydration((state) => state.hydrated);
  const hydrationError = useProfileStoreHydration((state) => state.hydrationError);
  const canPersonalize = interestTags.length > 0;

  useEffect(() => {
    void hydrateProfileStore();
  }, []);

  if (!hydrated) return <p aria-live="polite">正在读取浏览器本地偏好…</p>;

  return (
    <section aria-labelledby="preference-title" className="preferenceSettings">
      <p>RECOMMENDATION SETTINGS</p>
      <h2 id="preference-title">推荐与兴趣偏好</h2>
      <p>仅保存在当前浏览器，用于决定攻略广场的排序方式。</p>
      {hydrationError ? (
        <div role="status">
          <p>本地偏好无法安全读取，已关闭个性化推荐并保留原始浏览器数据。</p>
          <button onClick={() => { resetProfilePreferences(); useProfileStoreHydration.setState({ hydrationError: false }); }} type="button">重置演示偏好</button>
        </div>
      ) : null}
      <div className="preferenceSwitchRow">
        <span>个性化推荐</span>
        <button
          aria-checked={personalizedFeed && canPersonalize}
          aria-describedby={canPersonalize ? undefined : 'personalization-disabled'}
          aria-label="个性化推荐"
          disabled={!canPersonalize}
          onClick={() => setPersonalizedFeed(!personalizedFeed)}
          role="switch"
          type="button"
        >
          <Sparkle aria-hidden size={17} weight="fill" />
          {personalizedFeed && canPersonalize ? '已开启' : '已关闭'}
        </button>
      </div>
      {!canPersonalize ? (
        <p id="personalization-disabled">兴趣标签已清除；添加兴趣后才可重新开启个性化推荐。</p>
      ) : null}
      <InterestTagPicker
        interestTags={interestTags}
        onAddInterestTag={addInterestTag}
        onClearInterestTags={clearInterestTags}
        onRemoveInterestTag={removeInterestTag}
      />
      <p role="status">{personalizedFeed && canPersonalize ? '当前使用个性化推荐排序' : '当前使用按时间排序'}</p>
    </section>
  );
}
