import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '行屿 XINGYU',
    short_name: '行屿',
    description: '透明比价、可信搭子、攻略转行程与主动式旅行守护。',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F0E8',
    theme_color: '#26312B',
  };
}
