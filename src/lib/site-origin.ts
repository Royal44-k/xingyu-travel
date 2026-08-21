const fallbackOrigin = 'https://xingyu-travel.vercel.app';

type SiteEnvironment = Readonly<Record<string, string | undefined>>;

function normalizeOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (url.protocol !== 'https:') return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

export function resolveSiteOrigin(env: SiteEnvironment = process.env): string {
  return normalizeOrigin(env.NEXT_PUBLIC_SITE_URL)
    ?? normalizeOrigin(env.SITE_URL)
    ?? normalizeOrigin(env.VERCEL_PROJECT_PRODUCTION_URL)
    ?? fallbackOrigin;
}
