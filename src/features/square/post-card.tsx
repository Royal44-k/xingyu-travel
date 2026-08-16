'use client';

import { Flag, Heart, MapPin } from '@phosphor-icons/react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { TravelPost } from '@/data/posts';
import styles from './square.module.css';

export function PostCard({ post }: { post: TravelPost }) {
  const [favorite, setFavorite] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState(false);
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
            <button aria-label={`收藏 ${post.title}`} aria-pressed={favorite} onClick={() => setFavorite((value) => !value)} type="button"><Heart aria-hidden size={20} weight={favorite ? 'fill' : 'regular'} /></button>
            <button aria-expanded={reportOpen} aria-label={`举报 ${post.title}`} onClick={() => setReportOpen(true)} type="button"><Flag aria-hidden size={19} /></button>
          </div>
        </footer>
        {reportOpen && (
          <div className={styles.reportNotice} role="status">
            {reported ? '已收到演示举报，不会向任何平台提交。' : <><span>举报为演示操作，不会提交或联系作者。</span><button onClick={() => setReported(true)} type="button">确认演示举报</button><button onClick={() => setReportOpen(false)} type="button">取消</button></>}
          </div>
        )}
      </div>
    </article>
  );
}
