import type { MetadataRoute } from 'next';

const origin = (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://xingyu-travel.vercel.app').replace(/\/$/, '');
const paths = ['/', '/compare', '/square', '/partners', '/assistant', '/profile'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date('2026-08-16T00:00:00.000Z'),
  }));
}
