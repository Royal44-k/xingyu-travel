import type { MetadataRoute } from 'next';

const origin = (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://xingyu-travel.vercel.app').replace(/\/$/, '');

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
