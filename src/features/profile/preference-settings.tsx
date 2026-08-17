'use client';

import { Sparkle, X } from '@phosphor-icons/react';
import { useEffect } from 'react';
import {
  hydrateProfileStore,
  useProfileStore,
  useProfileStoreHydration,
} from '@/stores/profile-store';

export function PreferenceSettings() {
  const personalizedFeed = useProfileStore((state) => state.personalizedFeed);
  const interestTags = useProfileStore((state) => state.interestTags);
  const setPersonalizedFeed = useProfileStore((state) => state.setPersonalizedFeed);
  const clearInterestTags = useProfileStore((state) => state.clearInterestTags);
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
        <p role="status">本地偏好无法安全读取，已使用默认演示设置。</p>
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
      <div aria-label="当前兴趣标签" className="preferenceTags">
        {interestTags.length ? interestTags.map((tag) => <span key={tag}>#{tag}</span>) : <span>尚无兴趣标签</span>}
      </div>
      <button className="preferenceClear" disabled={!interestTags.length} onClick={clearInterestTags} type="button">
        <X aria-hidden size={16} /> 清除兴趣标签
      </button>
      <p role="status">{personalizedFeed && canPersonalize ? '当前使用个性化推荐排序' : '当前使用按时间排序'}</p>
    </section>
  );
}
