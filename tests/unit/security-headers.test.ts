import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('security headers', () => {
  it('applies browser protection headers without dropping existing Next configuration', async () => {
    const rules = await nextConfig.headers?.();
    const rootRule = rules?.find((rule) => rule.source === '/(.*)');
    const headers = new Map(rootRule?.headers.map((header) => [header.key, header.value]));

    expect(nextConfig.poweredByHeader).toBe(false);
    expect(headers).toMatchObject(new Map([
      ['X-Content-Type-Options', 'nosniff'],
      ['Referrer-Policy', 'strict-origin-when-cross-origin'],
      ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
      ['X-Frame-Options', 'SAMEORIGIN'],
    ]));
  });
});
