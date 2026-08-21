import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('crawler origin', () => {
  it('prefers the stable Vercel production hostname over a preview deployment hostname', async () => {
    vi.stubEnv('VERCEL_URL', 'xingyu-preview-abc.vercel.app');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'xingyu-travel.vercel.app');
    vi.resetModules();

    const [{ default: sitemap }, { default: robots }] = await Promise.all([
      import('@/app/sitemap'),
      import('@/app/robots'),
    ]);

    expect(sitemap().every((entry) => entry.url.startsWith('https://xingyu-travel.vercel.app/'))).toBe(true);
    expect(robots()).toMatchObject({
      host: 'https://xingyu-travel.vercel.app',
      sitemap: 'https://xingyu-travel.vercel.app/sitemap.xml',
    });
  });

  it('uses an explicit public site URL before Vercel-derived hostnames', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://travel.example.cn/');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'xingyu-travel.vercel.app');
    vi.resetModules();

    const [{ default: sitemap }, { default: robots }] = await Promise.all([
      import('@/app/sitemap'),
      import('@/app/robots'),
    ]);

    expect(sitemap()[0].url).toBe('https://travel.example.cn/');
    expect(robots().host).toBe('https://travel.example.cn');
  });
});
