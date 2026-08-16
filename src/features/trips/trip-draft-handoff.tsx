'use client';

import Link from 'next/link';
import { postsBySlug } from '@/data/posts';
import { useTripStore } from '@/domain/trips/trip-store';
import styles from '@/features/square/square.module.css';

export function TripDraftHandoff({ slug }: { slug: string }) {
  const draft = useTripStore((state) => state.drafts[slug]);
  const sourceHref = postsBySlug[slug] ? `/square/${slug}` : '/square';

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
        <Link href={`/square/${draft.sourcePostSlug}`}>返回原攻略</Link>
      </section>
    </main>
  );
}
