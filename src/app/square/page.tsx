'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { orderPosts, type FeedMode } from '@/data/posts';
import { FeedControls } from '@/features/square/feed-controls';
import { PostCard } from '@/features/square/post-card';
import styles from '@/features/square/square.module.css';
import {
  hydrateProfileStore,
  useProfileStore,
  useProfileStoreHydration,
} from '@/stores/profile-store';

export default function SquarePage() {
  const personalizedFeed = useProfileStore((state) => state.personalizedFeed);
  const interestTags = useProfileStore((state) => state.interestTags);
  const setPersonalizedFeed = useProfileStore((state) => state.setPersonalizedFeed);
  const clearInterestTags = useProfileStore((state) => state.clearInterestTags);
  const hydrated = useProfileStoreHydration((state) => state.hydrated);
  const hydrationError = useProfileStoreHydration((state) => state.hydrationError);
  const mode: FeedMode = personalizedFeed && interestTags.length > 0 ? 'recommended' : 'chronological';
  const posts = orderPosts(mode, interestTags);

  useEffect(() => {
    void hydrateProfileStore();
  }, []);

  return (
    <>
        <SiteHeader activePath="/square" variant="solid" />
      <main className={styles.squarePage}>
        <header className={styles.hero}><p>GUIDE SQUARE</p><h1>在别人的路书里，找到自己的出发理由。</h1><span>真实的旅行片段，整理成可继续编辑的本地行程草稿。</span></header>
        <section aria-labelledby="feed-title" className={styles.feedSection}>
          <div className={styles.feedHeading}><div><p>编辑精选</p><h2 id="feed-title">旅行者正在分享</h2></div>{hydrated ? <FeedControls interestTags={interestTags} mode={mode} onClearInterestTags={clearInterestTags} onModeChange={(nextMode) => setPersonalizedFeed(nextMode === 'recommended')} /> : null}</div>
          {!hydrated ? (
            <p className={styles.loading} role="status">正在读取浏览器本地偏好，暂不展示排序与推荐结果。</p>
          ) : (
            <>
              {hydrationError ? <p className={styles.recommendationHint} role="status">本地偏好无法安全读取，当前按时间排序；可前往 <Link href="/profile">演示账户</Link> 重置偏好。</p> : null}
              <div className={styles.masonry}>{posts.map((post) => <PostCard key={post.slug} post={post} />)}</div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
