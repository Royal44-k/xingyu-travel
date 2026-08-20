'use client';

import {
  ArrowRight,
  CheckCircle,
  Compass,
  Heart,
  ShieldCheck,
  Sparkle,
  UsersThree,
  Wallet,
} from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { postsBySlug, type TravelPost } from '@/data/posts';
import {
  hydrateLibraryStore,
  useLibraryStore,
  useLibraryStoreHydration,
} from '@/stores/library-store';
import {
  hydrateWorkbenchTripStore,
  selectTripRecords,
  useTripStore,
  useTripStoreHydration,
} from '@/stores/trip-store';
import styles from './featured-destinations.module.css';

const themeGuides = [
  { theme: '海岛', note: '在海风和雨林之间，把一天留出阴影。', post: postsBySlug['sanya-bay-rainforest-5d'] },
  { theme: '城市', note: '沿街区和水岸慢走，读一座城的日常。', post: postsBySlug['shanghai-urban-walk-3d'] },
  { theme: '山野', note: '给海拔、天气和返程多留一点余地。', post: postsBySlug['sichuan-autumn-road'] },
  { theme: '人文', note: '从城墙、梧桐到夜色，把故事走进路里。', post: postsBySlug['nanjing-wall-qinhuai-4d'] },
] as const;

const acceptedStatuses = new Set(['active', 'guarded', 'archived']);
const subscribeToClientReady = () => () => {};
const getClientReady = () => true;
const getServerReady = () => false;

export function HomeStorySections() {
  const clientReady = useSyncExternalStore(
    subscribeToClientReady,
    getClientReady,
    getServerReady,
  );
  const likedPostSlugs = useLibraryStore((state) => state.likedPostSlugs);
  const libraryHydrated = useLibraryStoreHydration((state) => state.hydrated);
  const libraryHydrationError = useLibraryStoreHydration((state) => state.hydrationError);
  const trips = useTripStore(selectTripRecords);
  const tripHydrated = useTripStoreHydration((state) => state.hydrated);
  const tripHydrationError = useTripStoreHydration((state) => state.hydrationError);

  useEffect(() => {
    void Promise.all([hydrateLibraryStore(), hydrateWorkbenchTripStore()]);
  }, []);

  const recentTrip = useMemo(() => Object.values(trips)
    .filter((trip) => acceptedStatuses.has(trip.status))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0], [trips]);
  const likedPost = useMemo(() => [...likedPostSlugs].reverse()
    .map((slug) => postsBySlug[slug])
    .find((post): post is TravelPost => Boolean(post)), [likedPostSlugs]);
  const hydrationReady = clientReady && libraryHydrated && tripHydrated;
  const hydrationFailed = libraryHydrationError || tripHydrationError;

  return (
    <>
      <section aria-labelledby="guide-themes-title" className={styles.guideThemes}>
        <div className={styles.storyHeading}>
          <p>GUIDES FOR REAL DAYS</p>
          <h2 id="guide-themes-title">按想过的日子，选择一篇攻略</h2>
          <span>四种旅行气质，来自八篇完整的国内目的地路线。</span>
        </div>
        <div className={styles.themeGrid}>
          {themeGuides.map(({ note, post, theme }) => (
            <article className={styles.themeCard} key={theme}>
              <div className={styles.themeImage}>
                <Image alt={post.media[1].alt} fill sizes="(max-width: 680px) 100vw, 25vw" src={post.media[1].src} />
              </div>
              <div>
                <p>{post.destination} · {post.days} 天</p>
                <h3>{theme}</h3>
                <span>{note}</span>
                <Link href={`/square/${post.slug}`}>读{post.destination}攻略 <ArrowRight aria-hidden size={17} /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="price-story-title" className={styles.proofSection}>
        <div className={styles.proofCopy}>
          <Wallet aria-hidden size={29} weight="light" />
          <p>TRUE TOTAL PRICE</p>
          <h2 id="price-story-title">只比较最后要付的总价</h2>
          <span>同一条件下对齐税费、行李、取消政策和数据时间。收藏的是当前快照，不是永久承诺。</span>
          <ul>
            <li><CheckCircle aria-hidden size={17} />含税总价先对齐</li>
            <li><CheckCircle aria-hidden size={17} />规则与更新时间可见</li>
            <li><CheckCircle aria-hidden size={17} />离站前再次确认价格</li>
          </ul>
          <Link href="/compare">开始一次真实比价 <ArrowRight aria-hidden size={18} /></Link>
        </div>
        <div className={styles.proofImage}>
          <Image alt={postsBySlug['hangzhou-lake-tea-4d'].media[2].alt} fill sizes="(max-width: 760px) 100vw, 50vw" src={postsBySlug['hangzhou-lake-tea-4d'].media[2].src} />
        </div>
      </section>

      <section aria-labelledby="guide-to-trip-title" className={styles.tripStory}>
        <div className={styles.tripStoryImage}>
          <Image alt={postsBySlug['dali-slow-5d'].media[2].alt} fill sizes="(max-width: 760px) 100vw, 50vw" src={postsBySlug['dali-slow-5d'].media[2].src} />
        </div>
        <div className={styles.tripStoryCopy}>
          <Compass aria-hidden size={29} weight="light" />
          <p>GUIDE TO YOUR TRIP</p>
          <h2 id="guide-to-trip-title">一篇攻略，可以继续变成自己的行程</h2>
          <span>从大理五日路线出发，保留地点与节奏，再改日期、预算、同行人数和每天安排。</span>
          <dl>
            <div><dt>攻略</dt><dd>洱海、喜洲、双廊的真实路线骨架</dd></div>
            <div><dt>行程</dt><dd>保存到当前浏览器，回来还能继续编辑</dd></div>
          </dl>
          <Link href="/square/dali-slow-5d">从大理攻略开始 <ArrowRight aria-hidden size={18} /></Link>
        </div>
      </section>

      <section aria-labelledby="assistant-guardian-title" className={styles.safetyStory}>
        <div className={styles.safetyStoryHeading}>
          <Sparkle aria-hidden size={28} weight="light" />
          <p>WHEN PLANS CHANGE</p>
          <h2 id="assistant-guardian-title">变化发生时，先把选择说清楚</h2>
          <span>AI 可以整理替代方案，行程守护可以记录同意后的计划；二者都不会替你完成紧急处置。</span>
        </div>
        <div className={styles.scenarioGrid}>
          <article>
            <strong>“返程航班取消，明早前要离开。”</strong>
            <p>旅行助手先确认时间、人数和可接受的转场范围，再给出铁路、改签与多住一晚的选项。</p>
            <Link href="/assistant">打开旅行助手 <ArrowRight aria-hidden size={17} /></Link>
          </article>
          <article>
            <ShieldCheck aria-hidden size={25} weight="light" />
            <strong>守护从明确同意开始</strong>
            <p>只在已保存行程里启用，记录本地演示状态；现实危险始终优先联系当地警方、急救和官方服务。</p>
            <Link href="/trips">从我的行程进入守护 <ArrowRight aria-hidden size={17} /></Link>
          </article>
        </div>
      </section>

      <section aria-labelledby="partner-boundary-title" className={styles.partnerStory}>
        <UsersThree aria-hidden size={30} weight="light" />
        <div>
          <p>TRAVEL TOGETHER, WITH BOUNDARIES</p>
          <h2 id="partner-boundary-title">同行是选择，不是安全担保</h2>
          <span>匹配分数、身份状态和可信联系人都只用于当前浏览器中的沙箱演示。先在公开场所见面，不提交敏感证件。</span>
        </div>
        <Link href="/partners">了解可信搭子边界 <ArrowRight aria-hidden size={18} /></Link>
      </section>

      <section aria-labelledby="local-shelf-title" className={styles.localShelf}>
        <div className={styles.storyHeading}>
          <p>CONTINUE WHERE YOU LEFT OFF</p>
          <h2 id="local-shelf-title">继续当前浏览器里的旅程</h2>
          <span>只显示在这台设备上保存的行程与喜欢。</span>
        </div>
        {!hydrationReady ? (
          <div aria-label="本地旅行资料状态" className={styles.localState} role="status">
            <Compass aria-hidden size={24} />
            <p>正在整理当前浏览器里的旅行资料…</p>
          </div>
        ) : hydrationFailed ? (
          <div aria-label="本地旅行资料状态" className={styles.localState} role="status">
            <ShieldCheck aria-hidden size={24} />
            <p>本地资料暂时无法安全读取，原始数据没有被覆盖。</p>
          </div>
        ) : recentTrip || likedPost ? (
          <div className={styles.localGrid}>
            {recentTrip ? (
              <article>
                <span>最近行程 · {recentTrip.destination}</span>
                <h3>{recentTrip.title}</h3>
                <p>{recentTrip.items.length} 天 · ¥{recentTrip.budget.toLocaleString('zh-CN')} 预算</p>
                <Link href={`/trips/${recentTrip.sourcePostSlug}`}>继续{recentTrip.title} <ArrowRight aria-hidden size={17} /></Link>
              </article>
            ) : null}
            {likedPost ? (
              <article>
                <Heart aria-hidden size={21} weight="fill" />
                <span>最近喜欢 · {likedPost.destination}</span>
                <h3>{likedPost.title}</h3>
                <p>{likedPost.excerpt}</p>
                <Link href={`/square/${likedPost.slug}`}>再读{likedPost.title} <ArrowRight aria-hidden size={17} /></Link>
              </article>
            ) : null}
          </div>
        ) : (
          <div className={styles.localState}>
            <p>还没有本地旅程。先读一篇攻略，或做一次比价。</p>
            <div><Link href="/square">去灵感广场</Link><Link href="/compare">开始比价</Link></div>
          </div>
        )}
      </section>

      <footer className={styles.homeFooter}>
        <p>行屿公开演示</p>
        <span>不提供真实预订、支付、身份核验、后台推送或紧急响应；离站服务以第三方最终页面为准。</span>
      </footer>
    </>
  );
}
