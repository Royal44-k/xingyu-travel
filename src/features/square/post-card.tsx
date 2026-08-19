'use client';

import { Flag, MapPin } from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ReportDialog } from '@/components/report-dialog';
import type { TravelPost } from '@/data/posts';
import { FavoriteButton } from '@/features/library/favorite-button';
import styles from './square.module.css';

export function PostCard({ post }: { post: TravelPost }) {
  const [reportOpen, setReportOpen] = useState(false);
  const reportTriggerRef = useRef<HTMLButtonElement>(null);
  const image = post.media[0];

  return (
    <article className={styles.postCard}>
      <Link className={styles.postImageLink} href={`/square/${post.slug}`} aria-label={`阅读攻略：${post.title}`}>
        <Image alt={image.alt} className={styles.postImage} height={image.height} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" src={image.src} width={image.width} />
      </Link>
      <div className={styles.postBody}>
        <div className={styles.postMeta}><MapPin aria-hidden size={16} weight="fill" /> {post.destination} · {post.days} 天</div>
        <h2><Link href={`/square/${post.slug}`}>{post.title}</Link></h2>
        <p>{post.excerpt}</p>
        <div className={styles.tags}>{post.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div>
        <footer className={styles.cardFooter}>
          <span className={styles.author}><b aria-hidden>{post.author.avatar}</b>{post.author.name}</span>
          <div className={styles.cardActions}>
            <FavoriteButton label={post.title} slug={post.slug} />
            <button aria-expanded={reportOpen} aria-label={`举报 ${post.title}`} onClick={() => setReportOpen(true)} ref={reportTriggerRef} type="button"><Flag aria-hidden size={19} /></button>
          </div>
        </footer>
        <ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} returnFocusRef={reportTriggerRef} subject={post.title} />
      </div>
    </article>
  );
}
