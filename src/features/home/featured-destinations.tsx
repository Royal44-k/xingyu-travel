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

const guideDestinations: readonly DestinationFilmItem[] = posts.map((post) => ({
  destination: post.destination,
  title: post.title,
  description: post.excerpt,
  days: post.days,
  season: seasons[post.destination] ?? '当季',
  image: post.media[0],
  href: `/square/${post.slug}`,
  ctaLabel: `打开${post.destination}攻略`,
}));

const discoveryDestinations: readonly DestinationFilmItem[] = [
  {
    destination: '北京',
    title: '沿中轴线读懂北京的清晨',
    description: '从景山晨光望向故宫，再沿中轴线走进胡同与城门之间的历史层次。',
    days: 4,
    season: '春秋',
    image: {
      src: '/assets/home-film/beijing-forbidden-city-dawn.png',
      width: 1536,
      height: 1024,
      alt: '晨光中的北京故宫建筑群与城市中轴线',
    },
    href: '/compare?kind=hotel&destination=%E5%8C%97%E4%BA%AC',
    ctaLabel: '比价北京行程',
  },
  {
    destination: '西安',
    title: '在城墙暮色里走近长安',
    description: '从明城墙的砖石与角楼出发，把博物馆、坊巷和关中味道放进四天。',
    days: 4,
    season: '暮春',
    image: {
      src: '/assets/home-film/xian-city-wall-dusk.png',
      width: 1536,
      height: 1024,
      alt: '蓝调暮色中的西安明城墙与角楼',
    },
    href: '/compare?kind=hotel&destination=%E8%A5%BF%E5%AE%89',
    ctaLabel: '比价西安行程',
  },
  {
    destination: '重庆',
    title: '顺着山城的高低与江流穿行',
    description: '用轨道、步道和轮渡连接立体街区，在蓝调时刻看两江与山城亮起。',
    days: 4,
    season: '初冬',
    image: {
      src: '/assets/home-film/chongqing-river-city-blue-hour.png',
      width: 1536,
      height: 1024,
      alt: '蓝调时刻的重庆山城建筑与江面桥梁',
    },
    href: '/compare?kind=hotel&destination=%E9%87%8D%E5%BA%86',
    ctaLabel: '比价重庆行程',
  },
  {
    destination: '厦门',
    title: '把海风留在鼓浪屿的早晨',
    description: '从鼓浪屿老别墅与树影慢慢走到海边，隔着鹭江看城市在晨雾里醒来。',
    days: 4,
    season: '晚秋',
    image: {
      src: '/assets/home-film/xiamen-gulangyu-morning.png',
      width: 1536,
      height: 1024,
      alt: '晨光中的厦门鼓浪屿红屋顶与鹭江海岸',
    },
    href: '/compare?kind=hotel&destination=%E5%8E%A6%E9%97%A8',
    ctaLabel: '比价厦门行程',
  },
];

const destinations: readonly DestinationFilmItem[] = [
  ...guideDestinations,
  ...discoveryDestinations,
];

export function FeaturedDestinations() {
  return (
    <section className={styles.section} aria-labelledby="featured-title">
      <div className={styles.intro}>
        <p>DESTINATION FILM</p>
        <h2 id="featured-title">把下一程，放进取景窗</h2>
        <span>八篇完整攻略与四座新发现城市，都能继续进入灵感广场或旅行工具。</span>
      </div>
      <DestinationFilmCarousel destinations={destinations} />
    </section>
  );
}
