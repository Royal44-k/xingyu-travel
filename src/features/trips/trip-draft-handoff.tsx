'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { postsBySlug } from '@/data/posts';
import { hydrateTripStore, useTripHydrationStore, useTripStore } from '@/domain/trips/trip-store';
import styles from '@/features/square/square.module.css';

export function TripDraftHandoff({ slug }: { slug: string }) {
  const draft = useTripStore((state) => state.drafts[slug]);
  const hydrated = useTripHydrationStore((state) => state.hydrated);
  const hydrationError = useTripHydrationStore((state) => state.hydrationError);
  const sourceHref = postsBySlug[slug] ? `/square/${slug}` : '/square';

  useEffect(() => {
    void hydrateTripStore();
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

  if (!draft) {
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
        <h1>{draft.destination} · {draft.days} 天行程草稿已保存</h1>
        <span>已完成攻略到本地草稿的交接。完整行程工作台将继续在此草稿上编辑。</span>
        <dl className={styles.draftSummary}><div><dt>预算</dt><dd>¥{draft.budget.toLocaleString('zh-CN')}</dd></div><div><dt>行程节点</dt><dd>{draft.items.length} 个</dd></div><div><dt>状态</dt><dd>待编辑</dd></div></dl>
        <ol className={styles.handoffItems}>{draft.items.map((item) => <li key={item.id}><strong>{item.title}</strong><span>{item.location} · {item.description}</span></li>)}</ol>
        <Link href={`/square/${draft.sourcePostSlug}`}>返回原攻略</Link>
      </section>
    </main>
  );
}
