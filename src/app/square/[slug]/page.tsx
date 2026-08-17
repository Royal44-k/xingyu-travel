import { notFound } from 'next/navigation';
import { MapPin, Sparkle } from '@phosphor-icons/react/dist/ssr';
import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { postsBySlug } from '@/data/posts';
import { ConvertToTrip } from '@/features/square/convert-to-trip';
import styles from '@/features/square/square.module.css';

export default async function SquarePostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = postsBySlug[slug];
  if (!post) notFound();

  return (
    <>
        <SiteHeader activePath="/square" variant="solid" />
      <main className={styles.detailPage}>
        <Link className={styles.backLink} href="/square">← 返回灵感广场</Link>
        <header className={styles.detailHeader}><p><MapPin aria-hidden size={16} weight="fill" /> {post.destination} · {post.days} 天 · 预算 ¥{post.budget.toLocaleString('zh-CN')}</p><h1>{post.title}</h1><div className={styles.detailAuthor}><b aria-hidden>{post.author.avatar}</b><span>{post.author.name} · {post.author.role}</span><time dateTime={post.publishedAt}>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(post.publishedAt))}</time></div>{(post.ai.generated || post.ai.rewritten) && <span className={styles.aiLabel}><Sparkle aria-hidden size={15} weight="fill" /> {post.ai.generated ? 'AI 生成' : 'AI 改写'}{post.ai.generated && post.ai.rewritten ? ' · 已人工改写' : ''}</span>}</header>
        <div className={styles.detailLayout}><article className={styles.article}><p className={styles.lede}>{post.excerpt}</p><div className={styles.mediaGrid}>{post.media.slice(0, 9).map((image, index) => <Image alt={image.alt} className={styles.detailImage} height={image.height} key={`${image.src}-${index}`} sizes="(max-width: 760px) 100vw, 48vw" src={image.src} width={image.width} />)}</div><h2>这次怎么走</h2><ol className={styles.itinerary}>{post.itinerary.map((item) => <li key={item.day}><span>DAY {item.day}</span><div><h3>{item.title}</h3><p>{item.description}</p><small><MapPin aria-hidden size={14} weight="fill" /> {item.location}</small></div></li>)}</ol></article>
          <aside className={styles.detailAside}><section><h2>地点卡片</h2>{post.locations.map((location) => <div className={styles.locationCard} key={location.name}><MapPin aria-hidden size={18} weight="fill" /><div><strong>{location.name}</strong><span>{location.area}</span><p>{location.note}</p></div></div>)}</section>{post.products.length > 0 && <section><h2>路书里的演示商品</h2>{post.products.map((product) => <div className={styles.productCard} key={product.name}><span>{product.category}</span><strong>{product.name}</strong><b>¥{product.price}</b><p>{product.note}</p></div>)}</section>}<ConvertToTrip post={post} /></aside>
        </div>
      </main>
    </>
  );
}
