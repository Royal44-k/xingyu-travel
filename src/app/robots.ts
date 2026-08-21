import type { MetadataRoute } from 'next';
import { resolveSiteOrigin } from '@/lib/site-origin';

const origin = resolveSiteOrigin();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
