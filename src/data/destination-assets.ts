export const destinationKeys = [
  'dali',
  'guilin',
  'sichuan',
  'sanya',
  'hangzhou',
  'nanjing',
  'shanghai',
  'guizhou',
] as const;

export type DestinationAssetKey = (typeof destinationKeys)[number];

export interface DestinationAsset {
  src: string;
  width: 1536;
  height: 1024;
  alt: string;
  destination: string;
  shot: string;
}

export const destinationAssets = {
  dali: [
    { src: '/assets/destinations/dali/01.png', width: 1536, height: 1024, alt: '晨光里的大理白族院落与石茶桌', destination: '大理', shot: '白族院落清晨' },
    { src: '/assets/destinations/dali/02.png', width: 1536, height: 1024, alt: '苍山脚下沿洱海弯行的自行车道', destination: '大理', shot: '洱海湖畔自行车道' },
    { src: '/assets/destinations/dali/03.png', width: 1536, height: 1024, alt: '喜洲村落前铺开的金绿稻田', destination: '大理', shot: '喜洲稻田' },
    { src: '/assets/destinations/dali/04.png', width: 1536, height: 1024, alt: '双廊旧屋檐下望向洱海落日', destination: '大理', shot: '双廊落日' },
  ],
  guilin: [
    { src: '/assets/destinations/guilin/01.png', width: 1536, height: 1024, alt: '漓江晨雾中层叠的喀斯特山峰', destination: '桂林', shot: '漓江晨雾' },
    { src: '/assets/destinations/guilin/02.png', width: 1536, height: 1024, alt: '遇龙河清水边停靠的两只竹筏', destination: '桂林', shot: '遇龙河竹筏山水' },
    { src: '/assets/destinations/guilin/03.png', width: 1536, height: 1024, alt: '阳朔田园与喀斯特峰林间的骑行路', destination: '桂林', shot: '阳朔喀斯特骑行路' },
    { src: '/assets/destinations/guilin/04.png', width: 1536, height: 1024, alt: '蓝调时刻灯影映照桂林滨水山景', destination: '桂林', shot: '桂林滨水暮色' },
  ],
  sichuan: [
    { src: '/assets/destinations/sichuan/01.png', width: 1536, height: 1024, alt: '新都桥秋色里穿过石屋和白杨的公路', destination: '川西', shot: '新都桥秋日公路' },
    { src: '/assets/destinations/sichuan/02.png', width: 1536, height: 1024, alt: '塔公草原河谷与远处雅拉雪峰', destination: '川西', shot: '塔公草原与雪峰' },
    { src: '/assets/destinations/sichuan/03.png', width: 1536, height: 1024, alt: '墨石公园褶皱岩层间的木栈道', destination: '川西', shot: '墨石地貌' },
    { src: '/assets/destinations/sichuan/04.png', width: 1536, height: 1024, alt: '康定山谷中设有护栏的平缓公路', destination: '川西', shot: '康定山路' },
  ],
  sanya: [
    { src: '/assets/destinations/sanya/01.png', width: 1536, height: 1024, alt: '亚龙湾黎明时分安静的弧形海岸', destination: '三亚', shot: '亚龙湾黎明' },
    { src: '/assets/destinations/sanya/02.png', width: 1536, height: 1024, alt: '蜈支洲岛清澈浅湾与热带林岸', destination: '三亚', shot: '蜈支洲清水海岸' },
    { src: '/assets/destinations/sanya/03.png', width: 1536, height: 1024, alt: '后海村通向海边的沙路与冲浪板', destination: '三亚', shot: '后海冲浪村外景' },
    { src: '/assets/destinations/sanya/04.png', width: 1536, height: 1024, alt: '呀诺达雨林溪水旁的木步道', destination: '三亚', shot: '呀诺达雨林步道' },
  ],
  hangzhou: [
    { src: '/assets/destinations/hangzhou/01.png', width: 1536, height: 1024, alt: '薄雾笼罩西湖柳岸与远亭', destination: '杭州', shot: '西湖晨雾' },
    { src: '/assets/destinations/hangzhou/02.png', width: 1536, height: 1024, alt: '雨后龙井茶园弧形茶垄与石阶', destination: '杭州', shot: '龙井茶园梯坡' },
    { src: '/assets/destinations/hangzhou/03.png', width: 1536, height: 1024, alt: '灵隐附近竹林与苔石围合的小径', destination: '杭州', shot: '灵隐竹石小径' },
    { src: '/assets/destinations/hangzhou/04.png', width: 1536, height: 1024, alt: '京杭运河宽阔水面与三孔古桥夜影', destination: '杭州', shot: '京杭运河夜色倒影' },
  ],
  nanjing: [
    { src: '/assets/destinations/nanjing/01.png', width: 1536, height: 1024, alt: '晨光掠过南京明城墙砖石步道', destination: '南京', shot: '明城墙黎明' },
    { src: '/assets/destinations/nanjing/02.png', width: 1536, height: 1024, alt: '秋雨后南京梧桐大道与老宅围墙', destination: '南京', shot: '梧桐大道秋色' },
    { src: '/assets/destinations/nanjing/03.png', width: 1536, height: 1024, alt: '秦淮河宽阔水面映照古桥与城市夜色', destination: '南京', shot: '秦淮河夜色' },
    { src: '/assets/destinations/nanjing/04.png', width: 1536, height: 1024, alt: '林木环抱的中山陵长阶中轴', destination: '南京', shot: '中山陵中轴景观' },
  ],
  shanghai: [
    { src: '/assets/destinations/shanghai/01.png', width: 1536, height: 1024, alt: '外滩蓝调时刻望向浦东天际线', destination: '上海', shot: '外滩蓝调时刻步道' },
    { src: '/assets/destinations/shanghai/02.png', width: 1536, height: 1024, alt: '武康路梧桐树下的老洋房与自行车', destination: '上海', shot: '武康路建筑' },
    { src: '/assets/destinations/shanghai/03.png', width: 1536, height: 1024, alt: '苏州河上层叠的钢桥与砖仓倒影', destination: '上海', shot: '苏州河桥影' },
    { src: '/assets/destinations/shanghai/04.png', width: 1536, height: 1024, alt: '深蓝夜色中的陆家嘴建筑群', destination: '上海', shot: '陆家嘴夜景' },
  ],
  guizhou: [
    { src: '/assets/destinations/guizhou/01.png', width: 1536, height: 1024, alt: '小七孔古桥下流过清澈碧水', destination: '贵州', shot: '小七孔碧水' },
    { src: '/assets/destinations/guizhou/02.png', width: 1536, height: 1024, alt: '晨雾穿过西江苗寨木楼与山坡', destination: '贵州', shot: '西江苗寨山雾建筑' },
    { src: '/assets/destinations/guizhou/03.png', width: 1536, height: 1024, alt: '云雾中的加榜梯田与木楼村落', destination: '贵州', shot: '加榜梯田' },
    { src: '/assets/destinations/guizhou/04.png', width: 1536, height: 1024, alt: '湿润蓝夜里沿山起伏的贵阳城景', destination: '贵州', shot: '贵阳山城夜色' },
  ],
} as const satisfies Record<DestinationAssetKey, readonly DestinationAsset[]>;
