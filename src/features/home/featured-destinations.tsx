import { posts } from '@/data/posts';
import {
  DestinationFilmCarousel,
  type DestinationFilmItem,
} from './destination-film-carousel';
import styles from './featured-destinations.module.css';

const seasons: Record<string, string> = {
  大理: '秋日',
  桂林: '初秋',
  川西: '金秋',
  三亚: '晚夏',
  杭州: '初秋',
  南京: '深秋',
  上海: '四季',
  贵州: '雨后',
};

const destinations: readonly DestinationFilmItem[] = posts.map((post) => ({
  destination: post.destination,
  title: post.title,
  description: post.excerpt,
  days: post.days,
  season: seasons[post.destination] ?? '当季',
  image: post.media[0],
  href: `/square/${post.slug}`,
}));

export function FeaturedDestinations() {
  return (
    <section className={styles.section} aria-labelledby="featured-title">
      <div className={styles.intro}>
        <p>DESTINATION FILM</p>
        <h2 id="featured-title">把下一程，放进取景窗</h2>
        <span>八座山海与城市，来自可以继续阅读、收藏和转成行程的完整攻略。</span>
      </div>
      <DestinationFilmCarousel destinations={destinations} />
    </section>
  );
}
