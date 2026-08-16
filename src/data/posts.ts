import { brandAssets } from '@/data/assets';

export type FeedMode = 'recommended' | 'chronological';

export interface PostMedia {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface LocationCard {
  name: string;
  area: string;
  note: string;
}

export interface ItineraryItem {
  day: number;
  title: string;
  description: string;
  location: string;
}

export interface ProductCard {
  name: string;
  category: string;
  price: number;
  note: string;
}

export interface TravelPost {
  slug: string;
  title: string;
  excerpt: string;
  destination: string;
  days: number;
  budget: number;
  media: readonly PostMedia[];
  locations: readonly LocationCard[];
  tags: readonly string[];
  itinerary: readonly ItineraryItem[];
  products: readonly ProductCard[];
  author: { name: string; role: string; avatar: string };
  publishedAt: string;
  updatedAt?: string;
  ai: { generated: boolean; rewritten: boolean };
}

const media = {
  dali: brandAssets.guide,
  dawn: brandAssets.hero,
  sichuan: brandAssets.sichuan,
  guilin: brandAssets.guilin,
  guardian: brandAssets.guardian,
} satisfies Record<string, PostMedia>;

export const posts: readonly TravelPost[] = [
  {
    slug: 'dali-slow-5d',
    title: '把大理留给慢下来的人：5 天环洱海松弛路线',
    excerpt: '住进古城外的白族院落，在菜场、湖畔与山风之间，把每天只安排一件重要的事。',
    destination: '大理',
    days: 5,
    budget: 5200,
    media: [media.dali, media.dawn, media.dali, media.dawn, media.dali],
    locations: [
      { name: '大理古城', area: '大理市', note: '清晨从南门进入，避开午后人流。' },
      { name: '喜洲古镇', area: '大理市', note: '留半天给稻田、扎染与破酥粑粑。' },
      { name: '双廊', area: '洱海东岸', note: '傍晚抵达，湖面光线最柔和。' },
    ],
    tags: ['慢旅行', '洱海', '咖啡', '独自出发'],
    itinerary: [
      { day: 1, title: '抵达古城，住进院落', description: '从机场拼车入城，傍晚在人民路散步。', location: '大理古城' },
      { day: 2, title: '菜场与苍山脚下', description: '上午逛北门菜场，午后到寂照庵喝茶。', location: '大理古城' },
      { day: 3, title: '喜洲慢半拍', description: '骑车穿过稻田，看一场白族扎染体验。', location: '喜洲古镇' },
      { day: 4, title: '环湖去双廊', description: '包车环洱海，在海东找一段无人的湖岸。', location: '双廊' },
      { day: 5, title: '湖畔早餐后返程', description: '用一顿早餐收尾，预留充足时间去机场。', location: '双廊' },
    ],
    products: [
      { name: '洱海东岸一日包车', category: '当地交通', price: 480, note: '演示商品，仅供规划参考。' },
      { name: '白族院落住宿 4 晚', category: '住宿', price: 1680, note: '演示商品，不含预订服务。' },
    ],
    author: { name: '林见山', role: '城市漫游者', avatar: '林' },
    publishedAt: '2026-08-15T08:30:00+08:00',
    updatedAt: '2026-08-16T10:00:00+08:00',
    ai: { generated: true, rewritten: true },
  },
  {
    slug: 'sichuan-autumn-road',
    title: '川西金秋自驾：把雪山留在后视镜里',
    excerpt: '从新都桥到塔公，沿着海拔缓慢上升的公路追赶秋色。',
    destination: '川西',
    days: 4,
    budget: 6800,
    media: [media.sichuan, media.guardian],
    locations: [{ name: '塔公草原', area: '甘孜', note: '午后云层变化快，注意保暖。' }],
    tags: ['自驾', '雪山', '秋色'],
    itinerary: [{ day: 1, title: '抵达新都桥', description: '适应海拔，早点休息。', location: '新都桥' }],
    products: [],
    author: { name: '陈野', role: '公路摄影师', avatar: '陈' },
    publishedAt: '2026-08-14T12:00:00+08:00',
    ai: { generated: false, rewritten: false },
  },
  {
    slug: 'guilin-river-morning',
    title: '桂林的清晨，先交给一段江面',
    excerpt: '不追打卡，只在漓江最安静的时候坐一次船。',
    destination: '桂林',
    days: 3,
    budget: 3600,
    media: [media.guilin, media.dali],
    locations: [{ name: '漓江', area: '桂林', note: '选清晨航段，雾气和山水层次更好。' }],
    tags: ['山水', '周末', '轻徒步'],
    itinerary: [{ day: 1, title: '江上清晨', description: '预留早起时间去码头。', location: '漓江' }],
    products: [],
    author: { name: '周舟', role: '旅行编辑', avatar: '周' },
    publishedAt: '2026-08-13T09:15:00+08:00',
    ai: { generated: false, rewritten: true },
  },
  {
    slug: 'rainy-mountain-notes',
    title: '下雨的山路，也值得慢慢开',
    excerpt: '把天气预警当成路书的一部分，雨天同样能抵达风景。',
    destination: '高原山地',
    days: 2,
    budget: 2400,
    media: [media.guardian],
    locations: [{ name: '折多山', area: '甘孜', note: '雨天降低车速并检查路况。' }],
    tags: ['雨天出行', '安全', '自驾'],
    itinerary: [{ day: 1, title: '观察天气再出发', description: '跟随官方路况信息调整时间。', location: '折多山' }],
    products: [],
    author: { name: '沈雨', role: '山地领队', avatar: '沈' },
    publishedAt: '2026-08-12T16:20:00+08:00',
    ai: { generated: false, rewritten: false },
  },
];

export const postsBySlug: Readonly<Record<string, TravelPost>> = Object.fromEntries(
  posts.map((post) => [post.slug, post]),
);

export function orderPosts(mode: FeedMode, interestTags: readonly string[] = []): TravelPost[] {
  const latestFirst = [...posts].sort(
    (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
  );
  if (mode === 'chronological') return latestFirst;

  return latestFirst.sort((left, right) => {
    const rightMatches = right.tags.filter((tag) => interestTags.includes(tag)).length;
    const leftMatches = left.tags.filter((tag) => interestTags.includes(tag)).length;
    return rightMatches - leftMatches;
  });
}
