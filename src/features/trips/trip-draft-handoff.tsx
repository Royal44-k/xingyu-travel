'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { postsBySlug } from '@/data/posts';
import { hydrateWorkbenchTripStore, useTripStore, useTripStoreHydration } from '@/stores/trip-store';
import styles from '@/features/square/square.module.css';

export function TripDraftHandoff({ slug }: { slug: string }) {
  const trip = useTripStore((state) => Object.values(state.trips).find(
    (candidate) => candidate.sourcePostSlug === slug,
  ));
  const hydrated = useTripStoreHydration((state) => state.hydrated);
  const hydrationError = useTripStoreHydration((state) => state.hydrationError);
  const sourceHref = postsBySlug[slug] ? `/square/${slug}` : '/square';

  useEffect(() => {
    void hydrateWorkbenchTripStore();
  }, []);

  if (!hydrated) {
    return (
      <main className={styles.detailPage}>
        <section className={styles.handoffPanel} aria-live="polite">
          <p>LOCAL DRAFT</p>
          <h1>正在读取本地草稿…</h1>
        </section>
      </main>
    );
  }

  if (hydrationError) {
    return (
      <main className={styles.detailPage}>
        <section className={styles.handoffPanel}>
          <p>LOCAL DRAFT</p>
          <h1>本地草稿暂时无法读取</h1>
          <span>浏览器中的草稿未被覆盖。请返回原攻略，稍后再尝试生成或读取本地草稿。</span>
          <Link href={sourceHref}>返回原攻略</Link>
        </section>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className={styles.detailPage}>
        <section className={styles.handoffPanel}>
          <p>LOCAL DRAFT</p>
          <h1>未找到本地行程草稿</h1>
          <span>草稿只保存在创建它的浏览器中。你可以返回攻略重新确认并生成新的本地草稿。</span>
          <Link href={sourceHref}>返回原攻略</Link>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.detailPage}>
      <section className={styles.handoffPanel}>
        <p>LOCAL DRAFT</p>
        <h1>{trip.destination} · {trip.items.length} 天行程已保存</h1>
        <span>已完成攻略到本地草稿的交接。完整行程工作台将继续在此草稿上编辑。</span>
        <dl className={styles.draftSummary}><div><dt>预算</dt><dd>¥{trip.budget.toLocaleString('zh-CN')}</dd></div><div><dt>行程节点</dt><dd>{trip.items.length} 个</dd></div><div><dt>状态</dt><dd>可继续规划</dd></div></dl>
        <ol className={styles.handoffItems}>{trip.items.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.location} · {item.description}</span></li>)}</ol>
        <Link href={`/square/${trip.sourcePostSlug}`}>返回原攻略</Link>
      </section>
    </main>
  );
}
