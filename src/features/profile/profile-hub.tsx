'use client';

import {
  ArrowRight,
  Compass,
  Heart,
  MapPin,
  ShieldCheck,
  SuitcaseRolling,
  UserCircle,
} from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  type KeyboardEvent,
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { HydrationBoundary, type HydrationDomain } from '@/components/hydration-boundary';
import { postsBySlug } from '@/data/posts';
import { FavoriteButton } from '@/features/library/favorite-button';
import { PreferenceSettings } from '@/features/profile/preference-settings';
import { profileAccessibleColors } from '@/features/profile/profile-colors';
import { TripCollectionCard } from '@/features/trips/trip-collection';
import {
  hydrateLibraryStore,
  type FavoriteOfferSnapshot,
  useLibraryStore,
  useLibraryStoreHydration,
} from '@/stores/library-store';
import {
  hydratePartnerStore,
  usePartnerStore,
  usePartnerStoreHydration,
} from '@/stores/partner-store';
import {
  hydrateProfileStore,
  useProfileStore,
  useProfileStoreHydration,
} from '@/stores/profile-store';
import {
  hydrateWorkbenchTripStore,
  selectAcceptedTripCount,
  selectTripRecords,
  type WorkbenchTrip,
  useTripStore,
  useTripStoreHydration,
} from '@/stores/trip-store';
import styles from './profile.module.css';

export type ProfileTab = 'overview' | 'trips' | 'likes' | 'offers' | 'safety' | 'preferences';

interface ProfileHubProps {
  initialTab?: string;
}

const tabs: readonly { id: ProfileTab; label: string }[] = [
  { id: 'overview', label: '概览' },
  { id: 'trips', label: '我的行程' },
  { id: 'likes', label: '喜欢' },
  { id: 'offers', label: '收藏报价' },
  { id: 'safety', label: '搭子与安全' },
  { id: 'preferences', label: '兴趣偏好' },
];
const acceptedTabs = new Set<ProfileTab>(tabs.map(({ id }) => id));
const acceptedTripStatuses = new Set(['active', 'guarded', 'archived']);
const offerKindLabels = { flight: '机票', hotel: '酒店', ticket: '门票' } as const;
const timestampFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});
const profileColorProperties = {
  '--profile-accent-on-light': profileAccessibleColors.accentOnLight,
  '--profile-focus-on-light': profileAccessibleColors.focusOnLight,
  '--profile-focus-on-dark': profileAccessibleColors.focusOnDark,
} as CSSProperties;

type ClockListener = () => void;

const offerClock = (() => {
  let currentTime = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const subscriptions = new Map<ClockListener, readonly number[]>();

  function scheduleNextBoundary() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    const nextBoundary = [...subscriptions.values()]
      .flat()
      .filter((timestamp) => timestamp > currentTime)
      .reduce((nearest, timestamp) => Math.min(nearest, timestamp), Number.POSITIVE_INFINITY);
    if (!Number.isFinite(nextBoundary)) return;
    timer = setTimeout(refresh, Math.max(0, nextBoundary - currentTime));
  }

  function refresh() {
    const nextTime = Date.now();
    if (nextTime !== currentTime) {
      currentTime = nextTime;
      for (const listener of subscriptions.keys()) listener();
    }
    scheduleNextBoundary();
  }

  return {
    getSnapshot: () => currentTime,
    subscribe(expirationTimes: readonly number[], listener: ClockListener) {
      subscriptions.set(listener, expirationTimes);
      refresh();
      return () => {
        subscriptions.delete(listener);
        scheduleNextBoundary();
      };
    },
  };
})();

function normalizeProfileTab(tab: string | null | undefined): ProfileTab {
  return tab && acceptedTabs.has(tab as ProfileTab) ? tab as ProfileTab : 'overview';
}

export function ProfileHub({ initialTab }: ProfileHubProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => normalizeProfileTab(initialTab));
  const pendingFocus = useRef<{ tab: ProfileTab; target: 'tab' | 'panel' } | null>(null);
  const tabRefs = useRef<Record<ProfileTab, HTMLButtonElement | null>>({
    overview: null, trips: null, likes: null, offers: null, safety: null, preferences: null,
  });
  const panelRefs = useRef<Record<ProfileTab, HTMLElement | null>>({
    overview: null, trips: null, likes: null, offers: null, safety: null, preferences: null,
  });
  const profileHydration = useProfileStoreHydration();
  const libraryHydration = useLibraryStoreHydration();
  const tripHydration = useTripStoreHydration();
  const partnerHydration = usePartnerStoreHydration();
  const resetProfilePreferences = useProfileStore((state) => state.resetProfilePreferences);
  const resetLibrary = useLibraryStore((state) => state.resetLibrary);
  const resetTrips = useTripStore((state) => state.resetTripStore);
  const resetPartner = usePartnerStore((state) => state.resetPartnerStore);

  useEffect(() => {
    void Promise.all([
      hydrateProfileStore(),
      hydrateLibraryStore(),
      hydrateWorkbenchTripStore(),
      hydratePartnerStore(),
    ]);
  }, []);

  useEffect(() => {
    function restoreTabFromHistory() {
      setActiveTab(normalizeProfileTab(new URL(window.location.href).searchParams.get('tab')));
    }
    window.addEventListener('popstate', restoreTabFromHistory);
    return () => window.removeEventListener('popstate', restoreTabFromHistory);
  }, []);

  useLayoutEffect(() => {
    const request = pendingFocus.current;
    if (!request || request.tab !== activeTab) return;
    const target = request.target === 'tab' ? tabRefs.current[activeTab] : panelRefs.current[activeTab];
    pendingFocus.current = null;
    target?.focus();
  }, [activeTab]);

  function selectTab(tab: ProfileTab, focusTarget?: 'tab' | 'panel') {
    if (focusTarget) pendingFocus.current = { tab, target: focusTarget };
    if (tab !== activeTab) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
      setActiveTab(tab);
    } else if (focusTarget === 'tab') {
      tabRefs.current[tab]?.focus();
    } else if (focusTarget === 'panel') {
      panelRefs.current[tab]?.focus();
    }
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = tabs.findIndex(({ id }) => id === activeTab);
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    selectTab(tabs[nextIndex].id, 'tab');
  }

  const domains: HydrationDomain[] = [
    {
      id: 'profile', label: '兴趣偏好', ...profileHydration,
      onReset: () => {
        resetProfilePreferences();
        useProfileStoreHydration.setState({ hydrationError: false });
      },
    },
    {
      id: 'library', label: '喜欢与收藏', ...libraryHydration,
      onReset: () => {
        resetLibrary();
        useLibraryStoreHydration.setState({ hydrationError: false });
      },
    },
    {
      id: 'trips', label: '行程', ...tripHydration,
      onReset: () => {
        resetTrips();
        useTripStoreHydration.setState({ hydrationError: false });
      },
    },
    {
      id: 'partner', label: '搭子与安全', ...partnerHydration,
      onReset: () => {
        resetPartner();
        usePartnerStoreHydration.setState({ hydrationError: false });
      },
    },
  ];

  return (
    <main className={styles.profileHub} style={profileColorProperties}>
      <HydrationBoundary domains={domains} loadingMessage="正在整理当前浏览器里的旅行资料…">
        <ProfileIdentityHeader
          libraryError={libraryHydration.hydrationError}
          partnerError={partnerHydration.hydrationError}
          tripError={tripHydration.hydrationError}
        />
        <div className={styles.tabShell}>
          <div aria-label="个人中心内容" className={styles.tabList} role="tablist">
            {tabs.map(({ id, label }) => (
              <button
                aria-controls={`profile-panel-${id}`}
                aria-selected={activeTab === id}
                id={`profile-tab-${id}`}
                key={id}
                onClick={() => selectTab(id)}
                onKeyDown={handleTabKeyDown}
                ref={(node) => { tabRefs.current[id] = node; }}
                role="tab"
                tabIndex={activeTab === id ? 0 : -1}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          {tabs.map(({ id }) => (
            <section
              aria-labelledby={`profile-tab-${id}`}
              className={styles.tabPanel}
              hidden={activeTab !== id}
              id={`profile-panel-${id}`}
              key={id}
              ref={(node) => { panelRefs.current[id] = node; }}
              role="tabpanel"
              tabIndex={activeTab === id ? 0 : -1}
            >
              {activeTab === id ? (
                <ProfilePanel
                  activeTab={activeTab}
                  libraryError={libraryHydration.hydrationError}
                  onSelectTab={selectTab}
                  partnerError={partnerHydration.hydrationError}
                  tripError={tripHydration.hydrationError}
                />
              ) : null}
            </section>
          ))}
        </div>
      </HydrationBoundary>
    </main>
  );
}

function ProfileIdentityHeader({
  libraryError,
  partnerError,
  tripError,
}: {
  libraryError: boolean;
  partnerError: boolean;
  tripError: boolean;
}) {
  const tripCount = useTripStore(selectAcceptedTripCount);
  const likedCount = useLibraryStore((state) => state.likedPostSlugs.length);
  const offerCount = useLibraryStore((state) => Object.keys(state.favoriteOffers).length);
  const visibleMatches = usePartnerStore((state) => state.visibleMatchIds.length);

  return (
    <header className={styles.identityHeader}>
      <Image
        alt=""
        aria-hidden
        className={styles.identityBackdrop}
        fill
        priority
        sizes="100vw"
        src="/assets/hero-dali-dawn.png"
      />
      <div aria-hidden className={styles.identityShade} />
      <div className={styles.identityContent}>
        <UserCircle aria-hidden size={66} weight="thin" />
        <div className={styles.identityCopy}>
          <p>XINGYU · BROWSER LOCAL</p>
          <h1>你好，行屿旅人</h1>
          <span>愿每一次出发，都收拢成可继续的自由。</span>
        </div>
        <dl className={styles.identityStats}>
          <Stat label="行程" unavailable={tripError} value={tripCount} />
          <Stat label="喜欢" unavailable={libraryError} value={likedCount} />
          <Stat label="收藏报价" unavailable={libraryError} value={offerCount} />
          <Stat label="可见匹配" unavailable={partnerError} value={visibleMatches} />
        </dl>
      </div>
    </header>
  );
}

function Stat({ label, unavailable, value }: { label: string; unavailable: boolean; value: number }) {
  return <div><dt>{label}</dt><dd>{unavailable ? '—' : value}</dd></div>;
}

function ProfilePanel({
  activeTab,
  libraryError,
  onSelectTab,
  partnerError,
  tripError,
}: {
  activeTab: ProfileTab;
  libraryError: boolean;
  onSelectTab: (tab: ProfileTab, focusTarget?: 'tab' | 'panel') => void;
  partnerError: boolean;
  tripError: boolean;
}) {
  if (activeTab === 'overview') {
    return <OverviewPanel libraryError={libraryError} onSelectTab={onSelectTab} partnerError={partnerError} tripError={tripError} />;
  }
  if (activeTab === 'trips') return tripError ? <DomainUnavailable domain="行程" /> : <TripsPanel />;
  if (activeTab === 'likes') return libraryError ? <DomainUnavailable domain="喜欢" /> : <LikesPanel />;
  if (activeTab === 'offers') return libraryError ? <DomainUnavailable domain="收藏报价" /> : <OffersPanel />;
  if (activeTab === 'safety') return <SafetyPanel partnerError={partnerError} tripError={tripError} />;
  return <PreferenceSettings />;
}

function OverviewPanel({
  libraryError,
  onSelectTab,
  partnerError,
  tripError,
}: {
  libraryError: boolean;
  onSelectTab: (tab: ProfileTab, focusTarget?: 'tab' | 'panel') => void;
  partnerError: boolean;
  tripError: boolean;
}) {
  const tripCount = useTripStore(selectAcceptedTripCount);
  const likedCount = useLibraryStore((state) => state.likedPostSlugs.length);
  const offerCount = useLibraryStore((state) => Object.keys(state.favoriteOffers).length);
  const trips = useTripStore(selectTripRecords);
  const recentTrip = useMemo(() => acceptedTrips(trips)[0], [trips]);

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeading}>
        <div><p>LOCAL TRAVEL DESK</p><h2>把下一步留在手边</h2></div>
        <span>所有资料只保存在当前浏览器，不是账户云同步。</span>
      </div>
      <div className={styles.summaryGrid}>
        <SummaryCard
          href="/trips"
          icon={<SuitcaseRolling aria-hidden size={24} />}
          label="我的行程"
          unavailable={tripError}
          value={`${tripCount} 个行程`}
        />
        <SummaryCard
          icon={<Heart aria-hidden size={24} />}
          label="喜欢的攻略"
          onClick={() => onSelectTab('likes', 'panel')}
          unavailable={libraryError}
          value={`${likedCount} 篇喜欢`}
        />
        <SummaryCard
          icon={<Compass aria-hidden size={24} />}
          label="收藏报价"
          onClick={() => onSelectTab('offers', 'panel')}
          unavailable={libraryError}
          value={`${offerCount} 条收藏报价`}
        />
      </div>
      <div className={styles.overviewColumns}>
        <article className={styles.featureCard}>
          <p>最近行程</p>
          {tripError ? <DomainUnavailable domain="行程" compact /> : recentTrip ? (
            <>
              <span><MapPin aria-hidden size={16} />{recentTrip.destination}</span>
              <h3>{recentTrip.title}</h3>
              <p>{recentTrip.startDate} — {recentTrip.endDate} · {recentTrip.items.length} 天</p>
              <Link href={`/trips/${recentTrip.sourcePostSlug}`}>继续规划 <ArrowRight aria-hidden size={16} /></Link>
            </>
          ) : (
            <EmptyState actionHref="/square" actionLabel="从攻略创建" message="接受一篇攻略后，最近行程会出现在这里。" title="还没有保存的行程" />
          )}
        </article>
        <article className={styles.safetyDisclosure}>
          <ShieldCheck aria-hidden size={30} />
          <div>
            <p>演示身份与安全边界</p>
            <h3>26 岁演示旅人 · 状态清晰</h3>
            <span>仅用于展示 18+ 功能与安全流程，不是实名认证、风险担保或紧急响应服务。</span>
            <Link href={partnerError ? '/trips' : '/partners'}>查看搭子与安全边界 <ArrowRight aria-hidden size={16} /></Link>
          </div>
        </article>
      </div>
    </div>
  );
}

function SummaryCard({
  href,
  icon,
  label,
  onClick,
  unavailable,
  value,
}: {
  href?: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  unavailable: boolean;
  value: string;
}) {
  const content = <>{icon}<span>{label}</span><strong>{unavailable ? '暂不可用' : value}</strong><ArrowRight aria-hidden size={18} /></>;
  if (onClick) return <button className={styles.summaryCard} onClick={onClick} type="button">{content}</button>;
  return <Link className={styles.summaryCard} href={href ?? '/'}>{content}</Link>;
}

function TripsPanel() {
  const trips = useTripStore(selectTripRecords);
  const collectionTrips = useMemo(() => acceptedTrips(trips), [trips]);
  if (collectionTrips.length === 0) {
    return (
      <EmptyState
        actionHref="/square"
        actionLabel="从攻略创建"
        message="把一篇攻略接受为行程后，就能从这里继续规划。"
        secondaryHref="/compare"
        secondaryLabel="开始比价"
        title="还没有保存的行程"
      />
    );
  }
  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeading}>
        <div><p>MY TRIPS</p><h2>我的行程</h2></div>
        <span>{collectionTrips.length} 个可继续行程，按最近更新排序。</span>
      </div>
      <div className={styles.tripGrid}>{collectionTrips.map((trip) => <TripCollectionCard key={trip.id} trip={trip} />)}</div>
    </div>
  );
}

function acceptedTrips(trips: Record<string, WorkbenchTrip>) {
  return Object.values(trips)
    .filter((trip) => acceptedTripStatuses.has(trip.status))
    .toSorted((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function LikesPanel() {
  const likedPostSlugs = useLibraryStore((state) => state.likedPostSlugs);
  const togglePostLike = useLibraryStore((state) => state.togglePostLike);
  if (likedPostSlugs.length === 0) {
    return <EmptyState actionHref="/square" actionLabel="去灵感广场" message="喜欢的攻略会保存在这里，刷新后仍可找回。" title="喜欢的攻略会保存在这里" />;
  }
  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeading}><div><p>LIKED GUIDES</p><h2>喜欢</h2></div><span>{likedPostSlugs.length} 条本地喜欢记录</span></div>
      <div className={styles.guideGrid}>
        {likedPostSlugs.map((slug) => {
          const post = postsBySlug[slug];
          if (!post) {
            return (
              <article className={styles.unavailableGuide} key={slug}>
                <span>内容已不可用</span><p>{slug}</p>
                <button aria-label={`移除不可用喜欢 ${slug}`} onClick={() => togglePostLike(slug)} type="button">移除记录</button>
              </article>
            );
          }
          const cover = post.media[0];
          return (
            <article className={styles.guideCard} key={slug}>
              <div className={styles.guideCover}>
                <Image alt={cover.alt} fill sizes="(max-width: 680px) 100vw, 33vw" src={cover.src} />
              </div>
              <div>
                <span>{post.destination} · {post.days} 天</span>
                <h3><Link href={`/square/${post.slug}`}>{post.title}</Link></h3>
                <p>{post.excerpt}</p>
                <FavoriteButton label={post.title} slug={post.slug} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function OffersPanel() {
  const favoriteOffers = useLibraryStore((state) => state.favoriteOffers);
  const priceAlerts = useLibraryStore((state) => state.priceAlerts);
  const offers = Object.values(favoriteOffers);
  const currentTime = useOfferClock(offers);
  const [filter, setFilter] = useState<'all' | FavoriteOfferSnapshot['productKind']>('all');
  if (offers.length === 0) {
    return <EmptyState actionHref="/compare" actionLabel="开始比价" message="收藏一条报价后，可在这里核对数据时间与提醒状态。" title="收藏的报价会保存在这里" />;
  }
  const filteredOffers = filter === 'all' ? offers : offers.filter((offer) => offer.productKind === filter);
  const counts = {
    flight: offers.filter((offer) => offer.productKind === 'flight').length,
    hotel: offers.filter((offer) => offer.productKind === 'hotel').length,
    ticket: offers.filter((offer) => offer.productKind === 'ticket').length,
  };
  const hasEnabledAlert = Object.values(priceAlerts).some((alert) => alert.enabled);
  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeading}><div><p>SAVED OFFERS</p><h2>收藏报价</h2></div><span>{offers.length} 条浏览器本地快照</span></div>
      <div aria-label="筛选收藏报价" className={styles.offerFilters} role="group">
        <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')} type="button">全部 {offers.length}</button>
        <button aria-pressed={filter === 'flight'} onClick={() => setFilter('flight')} type="button">机票 {counts.flight}</button>
        <button aria-pressed={filter === 'hotel'} onClick={() => setFilter('hotel')} type="button">酒店 {counts.hotel}</button>
        <button aria-pressed={filter === 'ticket'} onClick={() => setFilter('ticket')} type="button">门票 {counts.ticket}</button>
      </div>
      {hasEnabledAlert ? <p className={styles.alertBoundary}>已保存提醒设置；本演示不会在关闭页面后推送</p> : null}
      <div className={styles.offerList}>
        {filteredOffers.length > 0
          ? filteredOffers.map((offer) => <OfferCard alertEnabled={Boolean(priceAlerts[offer.key]?.enabled)} currentTime={currentTime} key={offer.key} offer={offer} />)
          : <p className={styles.filteredEmpty}>这一类还没有收藏报价。</p>}
      </div>
    </div>
  );
}

function useOfferClock(offers: readonly FavoriteOfferSnapshot[]) {
  const expirationSignature = offers.map((offer) => offer.expiresAt).toSorted().join('|');
  const expirationTimes = useMemo(
    () => expirationSignature ? expirationSignature.split('|').map(Date.parse) : [],
    [expirationSignature],
  );
  const subscribe = useCallback(
    (listener: ClockListener) => offerClock.subscribe(expirationTimes, listener),
    [expirationTimes],
  );
  return useSyncExternalStore(subscribe, offerClock.getSnapshot, offerClock.getSnapshot);
}

function OfferCard({
  alertEnabled,
  currentTime,
  offer,
}: {
  alertEnabled: boolean;
  currentTime: number;
  offer: FavoriteOfferSnapshot;
}) {
  const expired = Date.parse(offer.expiresAt) <= currentTime;
  const search = new URLSearchParams({ kind: offer.productKind, destination: offer.destination });
  return (
    <article className={styles.offerCard}>
      <div><span>{offerKindLabels[offer.productKind]} · {offer.provider}</span><h3>{offer.destination}</h3><p>{offer.policySummary}</p></div>
      <div className={styles.offerPrice}><small>保存时总价</small><strong>¥ {offer.totalPrice.toLocaleString('zh-CN')}</strong></div>
      <dl>
        <div><dt>数据时间</dt><dd>{formatTimestamp(offer.observedAt)}</dd></div>
        <div><dt>快照状态</dt><dd className={expired ? styles.expired : undefined}>{expired ? '报价可能已变化' : `有效至 ${formatTimestamp(offer.expiresAt)}`}</dd></div>
        <div><dt>本地提醒</dt><dd>{alertEnabled ? '已保存（关闭页面后不会推送）' : '未开启'}</dd></div>
      </dl>
      <Link href={`/compare?${search.toString()}`}>重新比价</Link>
    </article>
  );
}

function formatTimestamp(value: string) {
  return timestampFormatter.format(new Date(value));
}

function SafetyPanel({ partnerError, tripError }: { partnerError: boolean; tripError: boolean }) {
  const trips = useTripStore(selectTripRecords);
  const intents = usePartnerStore((state) => state.intents);
  const matches = usePartnerStore((state) => state.matches);
  const visibleMatchIds = usePartnerStore((state) => state.visibleMatchIds);
  const guardedTrips = Object.values(trips).filter((trip) => trip.status === 'guarded');
  const visibleMatches = visibleMatchIds.map((id) => matches[id]).filter(Boolean);
  const trustedContactCount = visibleMatches.filter((match) => match.trustedContactAcknowledged).length;
  const missedCheckIns = visibleMatches.filter((match) => match.checkInStatus === 'missed').length;
  const currentIntent = Object.values(intents)[0];

  return (
    <div className={styles.panelStack}>
      <div className={styles.sectionHeading}><div><p>PARTNER & SAFETY</p><h2>搭子与安全</h2></div><span>摘要来自搭子与行程领域，不在个人中心复制。</span></div>
      <div className={styles.safetyGrid}>
        <article>
          <Compass aria-hidden size={27} />
          <span>搭子意愿</span>
          {partnerError ? <strong>暂不可用</strong> : <strong>{currentIntent ? `${currentIntent.destination} · ${currentIntent.capacity} 人` : '尚未发布'}</strong>}
          <p>{partnerError ? '搭子资料未能安全读取。' : `${visibleMatches.length} 个可见匹配 · ${trustedContactCount} 个已确认可信联系人`}</p>
          <Link href="/partners">继续寻找搭子</Link>
        </article>
        <article>
          <ShieldCheck aria-hidden size={27} />
          <span>行程守护</span>
          {tripError ? <strong>暂不可用</strong> : <strong>{guardedTrips.length} 个守护中行程</strong>}
          <p>{tripError
            ? '行程资料未能安全读取。'
            : partnerError
              ? '搭子安全状态暂不可用'
              : `${missedCheckIns} 个错过签到状态；官方紧急服务始终优先。`}</p>
          <Link href="/trips">查看我的行程</Link>
        </article>
      </div>
      <aside className={styles.safetyBoundary}>
        <ShieldCheck aria-hidden size={24} />
        <p>身份状态、匹配分数、可信联系人与守护均为当前浏览器中的沙箱演示，不构成身份、安全或紧急响应担保。遇到现实危险时，请优先联系当地警方、急救与官方服务。</p>
      </aside>
    </div>
  );
}

function DomainUnavailable({ compact = false, domain }: { compact?: boolean; domain: string }) {
  return (
    <div className={compact ? styles.compactUnavailable : styles.domainUnavailable} role="status">
      <strong>{domain}资料暂不可用</strong>
      <p>原始浏览器数据已保留；请稍后刷新重试。</p>
    </div>
  );
}

function EmptyState({
  actionHref,
  actionLabel,
  message,
  secondaryHref,
  secondaryLabel,
  title,
}: {
  actionHref: string;
  actionLabel: string;
  message: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  title: string;
}) {
  return (
    <div className={styles.emptyState}>
      <Compass aria-hidden size={28} />
      <h2>{title}</h2><p>{message}</p>
      <div><Link href={actionHref}>{actionLabel}</Link>{secondaryHref && secondaryLabel ? <Link href={secondaryHref}>{secondaryLabel}</Link> : null}</div>
    </div>
  );
}
