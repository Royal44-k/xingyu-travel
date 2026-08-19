'use client';

import { ArrowRight, CalendarBlank, MapPin, ShieldCheck } from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  hydrateWorkbenchTripStore,
  selectTripRecords,
  type WorkbenchTrip,
  type WorkbenchTripStatus,
  useTripStore,
  useTripStoreHydration,
} from '@/stores/trip-store';
import styles from './trips.module.css';

type CollectionFilter = 'all' | Extract<WorkbenchTripStatus, 'active' | 'guarded' | 'archived'>;

const collectionStatuses = new Set<WorkbenchTripStatus>(['active', 'guarded', 'archived']);
const statusLabels: Record<Exclude<CollectionFilter, 'all'>, string> = {
  active: '规划中',
  guarded: '守护中',
  archived: '已归档',
};
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export function TripCollection() {
  const trips = useTripStore(selectTripRecords);
  const hydrated = useTripStoreHydration((state) => state.hydrated);
  const hydrationError = useTripStoreHydration((state) => state.hydrationError);
  const [filter, setFilter] = useState<CollectionFilter>('all');

  useEffect(() => {
    void hydrateWorkbenchTripStore();
  }, []);

  const collectionTrips = useMemo(
    () => Object.values(trips)
      .filter((trip) => collectionStatuses.has(trip.status))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
    [trips],
  );
  const filteredTrips = filter === 'all'
    ? collectionTrips
    : collectionTrips.filter((trip) => trip.status === filter);
  const counts = {
    active: collectionTrips.filter((trip) => trip.status === 'active').length,
    guarded: collectionTrips.filter((trip) => trip.status === 'guarded').length,
    archived: collectionTrips.filter((trip) => trip.status === 'archived').length,
  };

  if (!hydrated) {
    return <CollectionState title="正在读取我的行程…" message="正在校验保存在当前浏览器中的行程。" />;
  }
  if (hydrationError) {
    return (
      <CollectionState
        actionHref="/square"
        actionLabel="去灵感广场"
        message="浏览器中的原数据没有被覆盖。你可以稍后重试，或从攻略页重新开始。"
        title="本地行程暂时无法读取"
      />
    );
  }
  if (collectionTrips.length === 0) {
    return (
      <CollectionState
        actionHref="/square"
        actionLabel="去灵感广场"
        message="从一篇喜欢的攻略生成行程，或先比较真实价格，再决定去哪里。"
        secondaryHref="/compare"
        secondaryLabel="先做一次比价"
        title="还没有保存的行程"
      />
    );
  }

  return (
    <main className={styles.collectionPage}>
      <header className={styles.collectionHero}>
        <div>
          <p>MY TRIPS / BROWSER LOCAL</p>
          <h1>我的行程</h1>
        </div>
        <p>把已经接受的攻略行程集中在这里，继续规划、守护或回看。数据只保存在当前浏览器。</p>
      </header>

      <section aria-labelledby="trip-list-title" className={styles.collectionSection}>
        <div className={styles.collectionToolbar}>
          <div>
            <p>TRIP INDEX</p>
            <h2 id="trip-list-title">行程册</h2>
            <span>{collectionTrips.length} 个行程 · 当前显示 {filteredTrips.length} 个</span>
          </div>
          <div aria-label="筛选行程状态" className={styles.collectionFilters} role="group">
            <FilterButton active={filter === 'all'} label={`全部 ${collectionTrips.length}`} onClick={() => setFilter('all')} />
            <FilterButton active={filter === 'active'} label={`规划中 ${counts.active}`} onClick={() => setFilter('active')} />
            <FilterButton active={filter === 'guarded'} label={`守护中 ${counts.guarded}`} onClick={() => setFilter('guarded')} />
            <FilterButton active={filter === 'archived'} label={`已归档 ${counts.archived}`} onClick={() => setFilter('archived')} />
          </div>
        </div>

        <div className={styles.tripCardGrid}>
          {filteredTrips.map((trip) => <TripCollectionCard key={trip.id} trip={trip} />)}
        </div>
      </section>
    </main>
  );
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button aria-pressed={active} onClick={onClick} type="button">{label}</button>;
}

export function TripCollectionCard({ trip }: { trip: WorkbenchTrip }) {
  return (
    <article className={styles.tripCollectionCard} data-has-cover={trip.coverImage ? 'true' : 'false'}>
      {trip.coverImage ? (
        <div className={styles.tripCardCover}>
          <Image alt={`${trip.destination}行程封面`} fill sizes="(max-width: 640px) 100vw, 50vw" src={trip.coverImage} />
        </div>
      ) : null}
      <div className={styles.tripCardBody}>
        <div className={styles.tripCardMeta}>
          <small>{statusLabels[trip.status as keyof typeof statusLabels]}</small>
          <span><MapPin aria-hidden size={16} />{trip.destination}</span>
          <span><CalendarBlank aria-hidden size={16} />{trip.startDate} — {trip.endDate}</span>
        </div>
        <h3>{trip.title}</h3>
        <p>{trip.items.length} 天 · ¥{trip.budget.toLocaleString('zh-CN')} 预算</p>
        <div className={styles.tripCardFooter}>
          <span>{trip.status === 'guarded' ? <><ShieldCheck aria-hidden size={15} />本地守护演示中</> : `更新于 ${dateFormatter.format(new Date(trip.updatedAt))}`}</span>
          <Link href={`/trips/${trip.sourcePostSlug}`}>继续规划{trip.title} <ArrowRight aria-hidden size={17} /></Link>
        </div>
      </div>
    </article>
  );
}

function CollectionState({
  title,
  message,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <main className={styles.collectionStatePage}>
      <section aria-live="polite" className={styles.collectionState}>
        <p>MY TRIPS</p>
        <h1>{title}</h1>
        <span>{message}</span>
        {actionHref && actionLabel ? (
          <div>
            <Link href={actionHref}>{actionLabel}</Link>
            {secondaryHref && secondaryLabel ? <Link href={secondaryHref}>{secondaryLabel}</Link> : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}
