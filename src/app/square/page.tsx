'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { orderPosts, posts as allPosts, type FeedMode } from '@/data/posts';
import {
  DestinationFilters,
  type DestinationFilterValues,
} from '@/features/square/destination-filters';
import { FeedControls } from '@/features/square/feed-controls';
import { PostCard } from '@/features/square/post-card';
import styles from '@/features/square/square.module.css';
import {
  hydrateProfileStore,
  useProfileStore,
  useProfileStoreHydration,
} from '@/stores/profile-store';

export default function SquarePage() {
  const [filters, setFilters] = useState<DestinationFilterValues>({
    query: '',
    destination: '',
    theme: '',
    maxDays: null,
  });
  const personalizedFeed = useProfileStore((state) => state.personalizedFeed);
  const interestTags = useProfileStore((state) => state.interestTags);
  const setPersonalizedFeed = useProfileStore((state) => state.setPersonalizedFeed);
  const clearInterestTags = useProfileStore((state) => state.clearInterestTags);
  const hydrated = useProfileStoreHydration((state) => state.hydrated);
  const hydrationError = useProfileStoreHydration((state) => state.hydrationError);
  const mode: FeedMode = personalizedFeed && interestTags.length > 0 ? 'recommended' : 'chronological';
  const orderedPosts = orderPosts(mode, interestTags);
  const normalizedQuery = filters.query.trim().toLocaleLowerCase('zh-CN');
  const posts = orderedPosts.filter((post) => {
    if (filters.destination && post.destination !== filters.destination) return false;
    if (filters.theme && !post.tags.includes(filters.theme)) return false;
    if (filters.maxDays && post.days > filters.maxDays) return false;
    if (!normalizedQuery) return true;

    const searchableText = [
      post.title,
      post.excerpt,
      post.destination,
      ...post.tags,
      ...post.locations.map((location) => location.name),
    ].join(' ').toLocaleLowerCase('zh-CN');
    return searchableText.includes(normalizedQuery);
  });
  const destinations = allPosts.map((post) => post.destination);
  const themes = ['海岛', '城市漫游', '山水', '人文历史', '慢旅行', '自驾'] as const;

  function clearFilters() {
    setFilters({ query: '', destination: '', theme: '', maxDays: null });
  }

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
              <DestinationFilters destinations={destinations} onChange={setFilters} onClear={clearFilters} themes={themes} values={filters} />
              {posts.length > 0 ? (
                <div className={styles.masonry}>{posts.map((post) => <PostCard key={post.slug} post={post} />)}</div>
              ) : (
                <div className={styles.emptyGuides} role="status">
                  <h3>没有找到符合条件的攻略</h3>
                  <p>换一个城市、主题或天数，也可以清除筛选重新浏览全部路线。</p>
                  <button onClick={clearFilters} type="button">重新浏览全部攻略</button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </>
  );
}
