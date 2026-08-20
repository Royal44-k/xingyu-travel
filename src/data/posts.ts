import { destinationAssets } from '@/data/assets';

export type FeedMode = 'recommended' | 'chronological';

export interface PostMedia {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export type GuideMedia = readonly [PostMedia, PostMedia, PostMedia, PostMedia];

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
  media: GuideMedia;
  locations: readonly LocationCard[];
  tags: readonly string[];
  itinerary: readonly ItineraryItem[];
  products: readonly ProductCard[];
  author: { name: string; role: string; avatar: string };
  publishedAt: string;
  updatedAt?: string;
  ai: { generated: boolean; rewritten: boolean };
}

export const posts: readonly TravelPost[] = [
  {
    slug: 'dali-slow-5d',
    title: '把大理留给慢下来的人：5 天洱海与白族村落路线',
    excerpt: '从古城外的白族院落出发，把喜洲稻田、苍山脚和双廊落日拆成五个从容的日子。',
    destination: '大理',
    days: 5,
    budget: 5200,
    media: destinationAssets.dali,
    locations: [
      { name: '大理古城', area: '大理市', note: '清晨从南门进入，午后转向安静的城边院落。' },
      { name: '喜洲古镇', area: '洱海西岸', note: '骑行稻田前先确认农忙路段，给村落留出安静空间。' },
      { name: '双廊', area: '洱海东岸', note: '傍晚抵达湖边，步行完成当天最后一段。' },
    ],
    tags: ['慢旅行', '洱海', '古镇', '独自出发'],
    itinerary: [
      { day: 1, title: '抵达古城，住进白族院落', description: '从机场进城后只安排院落休息与人民路短走。', location: '大理古城' },
      { day: 2, title: '菜场与苍山脚下', description: '上午逛北门菜场，午后在苍山脚找一段林间慢路。', location: '苍山' },
      { day: 3, title: '骑进喜洲稻田', description: '沿洱海西岸骑行，避开正午，把时间留给稻田与村巷。', location: '喜洲古镇' },
      { day: 4, title: '沿湖去双廊', description: '包车绕行海东，在安全停靠点看湖面光线变化。', location: '双廊' },
      { day: 5, title: '湖畔早餐后返程', description: '用一顿早饭收尾，预留充足的机场交通时间。', location: '双廊' },
    ],
    products: [
      { name: '洱海东岸一日包车', category: '当地交通', price: 480, note: '演示商品，仅供预算规划，不提供预订。' },
      { name: '白族院落住宿 4 晚', category: '住宿', price: 1680, note: '演示价格，节假日需重新核对。' },
    ],
    author: { name: '林见山', role: '行屿 AI 协作旅行编辑', avatar: '林' },
    publishedAt: '2026-08-18T08:30:00+08:00',
    updatedAt: '2026-08-19T09:10:00+08:00',
    ai: { generated: true, rewritten: true },
  },
  {
    slug: 'guilin-river-morning',
    title: '桂林 4 日：把晨雾、竹筏与骑行交给山水节奏',
    excerpt: '早起看漓江层峰，午后在遇龙河和阳朔田野之间慢骑，最后回到城市水岸。',
    destination: '桂林',
    days: 4,
    budget: 4200,
    media: destinationAssets.guilin,
    locations: [
      { name: '漓江', area: '桂林—阳朔', note: '优先清晨航段，雾天也要按码头实时通知出发。' },
      { name: '遇龙河', area: '阳朔县', note: '选择水流平缓航段，骑行与竹筏不要排得过满。' },
      { name: '榕湖水岸', area: '桂林市区', note: '傍晚步行即可，避开灯光最密集的游船时段。' },
    ],
    tags: ['山水', '骑行', '周末', '摄影'],
    itinerary: [
      { day: 1, title: '抵达桂林，水岸散步', description: '入住后沿榕湖慢走，用轻量行程适应湿润天气。', location: '桂林市区' },
      { day: 2, title: '漓江晨雾到阳朔', description: '按水位与天气选择航段，下午在阳朔休息。', location: '漓江' },
      { day: 3, title: '遇龙河与田野骑行', description: '上午看竹筏河段，午后只骑平缓乡道并及时补水。', location: '遇龙河' },
      { day: 4, title: '旧城早餐后返程', description: '留半天给市区与伴手礼，错峰前往车站或机场。', location: '桂林市区' },
    ],
    products: [
      { name: '漓江清晨航段参考', category: '体验', price: 320, note: '演示价格，以现场水位与班次为准。' },
      { name: '阳朔自行车 1 日', category: '当地交通', price: 80, note: '演示商品，骑行前检查车况与头盔。' },
    ],
    author: { name: '周舟', role: '行屿 AI 协作旅行编辑', avatar: '周' },
    publishedAt: '2026-08-17T09:15:00+08:00',
    updatedAt: '2026-08-19T09:20:00+08:00',
    ai: { generated: true, rewritten: true },
  },
  {
    slug: 'sichuan-autumn-road',
    title: '川西 6 日安全自驾：雪山、草原与秋日公路',
    excerpt: '从康定缓慢升高到新都桥、塔公与墨石公园，用机动返程日给高原反应和天气留余地。',
    destination: '川西',
    days: 6,
    budget: 8200,
    media: destinationAssets.sichuan,
    locations: [
      { name: '新都桥', area: '甘孜州康定市', note: '第一晚不赶景点，先观察海拔适应情况。' },
      { name: '塔公草原', area: '甘孜州康定市', note: '风大温差明显，下午云量变化快。' },
      { name: '墨石公园', area: '甘孜州道孚县', note: '沿开放栈道行走，不离开游客安全区。' },
      { name: '康定', area: '甘孜州', note: '作为进出高原的缓冲点，避免夜间翻山。' },
    ],
    tags: ['自驾', '雪山', '秋色', '安全'],
    itinerary: [
      { day: 1, title: '成都到康定', description: '白天完成转场，检查车辆与天气后在康定休息。', location: '康定' },
      { day: 2, title: '缓慢进入新都桥', description: '不追日落，分段停车并留意高原反应。', location: '新都桥' },
      { day: 3, title: '新都桥秋色短线', description: '只走路况明确的村落公路，下午提前回住处。', location: '新都桥' },
      { day: 4, title: '塔公草原与雪峰', description: '在开放观景区停留，遇到大风或降雪立即缩短路线。', location: '塔公草原' },
      { day: 5, title: '墨石地貌步行', description: '沿官方栈道完成半日线路，天黑前返回住宿点。', location: '墨石公园' },
      { day: 6, title: '机动返程成都', description: '按天气和路况选择提前回康定，白天返程并预留堵车与休息时间。', location: '成都' },
    ],
    products: [
      { name: '川西 6 日车辆预算', category: '当地交通', price: 3200, note: '演示预算，不含真实租车或保险服务。' },
      { name: '高原住宿 5 晚', category: '住宿', price: 2200, note: '演示价格，优先选择可取消方案。' },
    ],
    author: { name: '陈野', role: '行屿 AI 协作公路编辑', avatar: '陈' },
    publishedAt: '2026-08-16T12:00:00+08:00',
    updatedAt: '2026-08-19T09:30:00+08:00',
    ai: { generated: true, rewritten: true },
  },
  {
    slug: 'sanya-bay-rainforest-5d',
    title: '三亚 5 日：海湾清晨、后海慢住与雨林降温',
    excerpt: '把海边活动放在清晨和傍晚，中间用后海村巷与呀诺达雨林拉开节奏。',
    destination: '三亚',
    days: 5,
    budget: 6100,
    media: destinationAssets.sanya,
    locations: [
      { name: '亚龙湾', area: '吉阳区', note: '清晨沿岸散步，正午回到室内休息。' },
      { name: '蜈支洲岛', area: '海棠区', note: '以官方航班和海况为准，预留停航替代日程。' },
      { name: '后海村', area: '海棠区', note: '冲浪体验选择正规教练，不进入离岸流区域。' },
      { name: '呀诺达雨林', area: '保亭县', note: '穿防滑鞋，雷雨时服从园区关闭安排。' },
    ],
    tags: ['海岛', '慢旅行', '雨林', '亲子'],
    itinerary: [
      { day: 1, title: '亚龙湾黎明', description: '前一晚抵达并早睡，第一天从清晨海岸开始。', location: '亚龙湾' },
      { day: 2, title: '蜈支洲清水海岸', description: '按海况登岛，避开正午暴晒并及时补水。', location: '蜈支洲岛' },
      { day: 3, title: '后海村慢住', description: '看村巷与海边日常，体验项目控制在半天内。', location: '后海村' },
      { day: 4, title: '呀诺达雨林降温', description: '沿维护步道完成短线，雨后放慢脚步。', location: '呀诺达雨林' },
      { day: 5, title: '海湾早餐与返程', description: '不再安排远距离景点，留足机场交通时间。', location: '三亚市区' },
    ],
    products: [
      { name: '海湾住宿 4 晚', category: '住宿', price: 2200, note: '演示价格，不连接真实库存。' },
      { name: '雨林往返交通', category: '当地交通', price: 260, note: '演示预算，雨天先确认道路与园区开放。' },
    ],
    author: { name: '许澜', role: '行屿 AI 协作海岛编辑', avatar: '许' },
    publishedAt: '2026-08-15T11:10:00+08:00',
    updatedAt: '2026-08-19T09:40:00+08:00',
    ai: { generated: true, rewritten: true },
  },
  {
    slug: 'hangzhou-lake-tea-4d',
    title: '杭州 4 日：西湖晨雾、龙井茶坡与运河夜色',
    excerpt: '用四个步行尺度的小区域串起湖、茶园、竹径和运河，把拥挤时段留给休息。',
    destination: '杭州',
    days: 4,
    budget: 4600,
    media: destinationAssets.hangzhou,
    locations: [
      { name: '西湖', area: '西湖区', note: '清晨从安静湖岸进入，避开正午主景区人流。' },
      { name: '龙井村', area: '西湖区', note: '沿公共步道看茶园，不进入作业中的茶垄。' },
      { name: '灵隐周边', area: '西湖区', note: '以竹石小径为主，寺院开放信息单独核对。' },
      { name: '京杭运河', area: '拱墅区', note: '蓝调时刻到桥西，夜间沿亮灯步道返回。' },
    ],
    tags: ['城市漫游', '茶园', '摄影', '周末'],
    itinerary: [
      { day: 1, title: '西湖晨雾与北山街', description: '早起沿湖慢走，午后回住处休息。', location: '西湖' },
      { day: 2, title: '龙井茶坡', description: '乘公共交通到村口，用半天走完茶园公共路径。', location: '龙井村' },
      { day: 3, title: '灵隐竹石小径', description: '把寺院与山路拆开，不在一天内叠加长距离徒步。', location: '灵隐周边' },
      { day: 4, title: '运河桥影后返程', description: '白天留给休息与行李，傍晚看运河后结束。', location: '京杭运河' },
    ],
    products: [
      { name: '西湖与茶园公交预算', category: '当地交通', price: 120, note: '演示预算，优先公交与步行。' },
      { name: '杭州住宿 3 晚', category: '住宿', price: 1500, note: '演示价格，不含真实预订。' },
    ],
    author: { name: '叶舟', role: '行屿 AI 协作城市编辑', avatar: '叶' },
    publishedAt: '2026-08-14T10:20:00+08:00',
    updatedAt: '2026-08-19T09:50:00+08:00',
    ai: { generated: true, rewritten: true },
  },
  {
    slug: 'nanjing-wall-qinhuai-4d',
    title: '南京 4 日：从明城墙走到梧桐与秦淮夜色',
    excerpt: '先在城墙读城市尺度，再沿梧桐大道和中山陵慢走，最后把夜晚交给秦淮河。',
    destination: '南京',
    days: 4,
    budget: 3900,
    media: destinationAssets.nanjing,
    locations: [
      { name: '明城墙', area: '玄武区—秦淮区', note: '选一段登城，不把多个城门塞进同一天。' },
      { name: '陵园路', area: '玄武区', note: '秋季梧桐路面湿滑，骑行需放慢。' },
      { name: '中山陵', area: '玄武区', note: '台阶较长，预留休息时间并核对预约。' },
      { name: '秦淮河', area: '秦淮区', note: '从外围步行进入，避开最拥挤的核心时段。' },
    ],
    tags: ['人文历史', '城市漫游', '秋色', '摄影'],
    itinerary: [
      { day: 1, title: '明城墙看城市醒来', description: '清晨登城，午后在城墙脚下的小街休息。', location: '明城墙' },
      { day: 2, title: '梧桐大道与旧宅', description: '沿公共步道慢走，雨后注意落叶与湿滑路面。', location: '陵园路' },
      { day: 3, title: '中山陵中轴', description: '上午完成台阶路线，下午不再叠加高强度景点。', location: '中山陵' },
      { day: 4, title: '秦淮夜色收尾', description: '白天留给博物馆，傍晚沿宽阔河段散步后返程。', location: '秦淮河' },
    ],
    products: [
      { name: '南京公共交通 4 日', category: '当地交通', price: 160, note: '演示预算，覆盖地铁与常规公交。' },
      { name: '城南住宿 3 晚', category: '住宿', price: 1320, note: '演示价格，不提供预订。' },
    ],
    author: { name: '顾城南', role: '行屿 AI 协作人文编辑', avatar: '顾' },
    publishedAt: '2026-08-13T08:40:00+08:00',
    updatedAt: '2026-08-19T10:00:00+08:00',
    ai: { generated: true, rewritten: true },
  },
  {
    slug: 'shanghai-urban-walk-3d',
    title: '上海 3 日：外滩蓝调、武康路树影与苏州河桥',
    excerpt: '把天际线、老建筑和河岸工业纹理分成三次步行，不用一口气横穿整座城市。',
    destination: '上海',
    days: 3,
    budget: 4800,
    media: destinationAssets.shanghai,
    locations: [
      { name: '外滩', area: '黄浦区', note: '蓝调时刻前抵达，避开节假日核心人流。' },
      { name: '武康路', area: '徐汇区', note: '住宅区保持安静，不停留在居民出入口。' },
      { name: '苏州河', area: '静安区—虹口区', note: '选择连续开放的河岸步道，桥下路段注意照明。' },
      { name: '陆家嘴', area: '浦东新区', note: '隔江观看天际线比连续换观景台更从容。' },
    ],
    tags: ['城市漫游', '建筑', '摄影', '周末'],
    itinerary: [
      { day: 1, title: '外滩到陆家嘴夜景', description: '下午从老城步行到江边，蓝调时刻固定一个机位。', location: '外滩' },
      { day: 2, title: '武康路建筑散步', description: '上午看树影与街区尺度，午后转入室内展览。', location: '武康路' },
      { day: 3, title: '苏州河桥与仓库', description: '沿开放河段步行，选一座桥结束城市观察。', location: '苏州河' },
    ],
    products: [
      { name: '城市公共交通 3 日', category: '当地交通', price: 150, note: '演示预算，以地铁与步行为主。' },
      { name: '中心城区住宿 2 晚', category: '住宿', price: 1900, note: '演示价格，不连接酒店库存。' },
    ],
    author: { name: '沈梧', role: '行屿 AI 协作建筑编辑', avatar: '沈' },
    publishedAt: '2026-08-12T14:00:00+08:00',
    updatedAt: '2026-08-19T10:10:00+08:00',
    ai: { generated: true, rewritten: true },
  },
  {
    slug: 'guizhou-karst-miao-6d',
    title: '贵州 6 日：小七孔碧水、苗寨山雾与加榜梯田',
    excerpt: '在黔南、黔东南和贵阳之间留出完整转场日，让山路、天气与村寨节奏成为路线的一部分。',
    destination: '贵州',
    days: 6,
    budget: 5800,
    media: destinationAssets.guizhou,
    locations: [
      { name: '小七孔', area: '黔南州荔波县', note: '雨后关注水位和步道开放范围。' },
      { name: '西江千户苗寨', area: '黔东南州雷山县', note: '尊重居民生活，清晨拍摄不使用无人机。' },
      { name: '加榜梯田', area: '黔东南州从江县', note: '山路弯多，白天转场并准备晕车用品。' },
      { name: '贵阳', area: '贵州省', note: '作为交通缓冲，用一晚观察山城层次。' },
    ],
    tags: ['山水', '村寨', '梯田', '人文历史'],
    itinerary: [
      { day: 1, title: '贵阳抵达与山城夜色', description: '不急着远行，用半天适应坡路与湿润天气。', location: '贵阳' },
      { day: 2, title: '贵阳到荔波', description: '白天完成长距离转场，傍晚只在县城休息。', location: '荔波' },
      { day: 3, title: '小七孔碧水', description: '按水位选择开放步道，不进入未开放河岸。', location: '小七孔' },
      { day: 4, title: '转入西江苗寨', description: '下午抵达后沿公共观景步道看山雾与木楼。', location: '西江千户苗寨' },
      { day: 5, title: '加榜梯田慢行', description: '只走村落公共路径，把拍摄与居民生活保持距离。', location: '加榜梯田' },
      { day: 6, title: '白天返回贵阳', description: '预留山路与天气缓冲，不安排当日晚间紧接航班。', location: '贵阳' },
    ],
    products: [
      { name: '贵州 6 日转场预算', category: '当地交通', price: 1900, note: '演示预算，山路用车需另核资质。' },
      { name: '村寨与城市住宿 5 晚', category: '住宿', price: 1800, note: '演示价格，不提供实际预订。' },
    ],
    author: { name: '陶岚', role: '行屿 AI 协作山地编辑', avatar: '陶' },
    publishedAt: '2026-08-11T09:00:00+08:00',
    updatedAt: '2026-08-19T10:20:00+08:00',
    ai: { generated: true, rewritten: true },
  },
];

export const postsBySlug: Readonly<Record<string, TravelPost>> = Object.fromEntries(
  posts.map((post) => [post.slug, post]),
);

const legacyPostRedirects: Readonly<Record<string, string>> = {
  'rainy-mountain-notes': 'sichuan-autumn-road',
};

export function canonicalPostSlug(slug: string): string {
  return legacyPostRedirects[slug] ?? slug;
}

export function postHrefForSlug(slug: string): string {
  const canonicalSlug = canonicalPostSlug(slug);
  return postsBySlug[canonicalSlug] ? `/square/${canonicalSlug}` : '/square';
}

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
