import type { MetadataRoute } from 'next';
import { resolveSiteOrigin } from '@/lib/site-origin';

const origin = resolveSiteOrigin();
const paths = ['/', '/compare', '/square', '/trips', '/partners', '/assistant', '/profile'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date('2026-08-16T00:00:00.000Z'),
  }));
}
