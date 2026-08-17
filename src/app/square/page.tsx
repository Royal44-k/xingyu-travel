'use client';

import { useEffect } from 'react';
import { SiteHeader } from '@/components/site-header';
import { orderPosts, type FeedMode } from '@/data/posts';
import { FeedControls } from '@/features/square/feed-controls';
import { PostCard } from '@/features/square/post-card';
import styles from '@/features/square/square.module.css';
import { hydrateProfileStore, useProfileStore } from '@/stores/profile-store';

export default function SquarePage() {
  const personalizedFeed = useProfileStore((state) => state.personalizedFeed);
  const interestTags = useProfileStore((state) => state.interestTags);
  const setPersonalizedFeed = useProfileStore((state) => state.setPersonalizedFeed);
  const clearInterestTags = useProfileStore((state) => state.clearInterestTags);
  const mode: FeedMode = personalizedFeed && interestTags.length > 0 ? 'recommended' : 'chronological';
  const posts = orderPosts(mode, interestTags);

  useEffect(() => {
    void hydrateProfileStore();
  }, []);

  return (
    <>
      <SiteHeader activePath="/square" />
      <main className={styles.squarePage}>
        <header className={styles.hero}><p>GUIDE SQUARE</p><h1>在别人的路书里，找到自己的出发理由。</h1><span>真实的旅行片段，整理成可继续编辑的本地行程草稿。</span></header>
        <section aria-labelledby="feed-title" className={styles.feedSection}>
          <div className={styles.feedHeading}><div><p>编辑精选</p><h2 id="feed-title">旅行者正在分享</h2></div><FeedControls interestTags={interestTags} mode={mode} onClearInterestTags={clearInterestTags} onModeChange={(nextMode) => setPersonalizedFeed(nextMode === 'recommended')} /></div>
          <div className={styles.masonry}>{posts.map((post) => <PostCard key={post.slug} post={post} />)}</div>
        </section>
      </main>
    </>
  );
}
