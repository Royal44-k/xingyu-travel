import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/v1/health/route';
import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('production safeguards', () => {
  it('returns a minimal health payload without environment data', async () => {
    const response = await GET();
    const payload = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ status: 'ok', demo_mode: true });
    expect(JSON.stringify(payload)).not.toMatch(/secret|token|password|env/i);
  });

  it('builds crawler metadata with a stable public origin rather than localhost', async () => {
    const [rules, pages, appManifest] = await Promise.all([robots(), sitemap(), manifest()]);
    const serialized = JSON.stringify({ rules, pages, appManifest });

    expect(serialized).not.toContain('localhost');
    expect(pages).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: expect.stringMatching(/^https:\/\//) }),
      expect.objectContaining({ url: expect.stringMatching(/\/assistant$/) }),
      expect.objectContaining({ url: expect.stringMatching(/\/partners$/) }),
      expect.objectContaining({ url: expect.stringMatching(/\/profile$/) }),
      expect.objectContaining({ url: expect.stringMatching(/\/trips$/) }),
    ]));
    expect(pages.map((page) => page.url)).not.toEqual(expect.arrayContaining([
      expect.stringMatching(/\/guardian\//),
    ]));
    expect(appManifest).toMatchObject({ name: '行屿 XINGYU', display: 'standalone' });
  });

  it('keeps the historical preview diagnostic read-only for Automation Bypass', () => {
    const diagnostic = readFileSync(join(
      process.cwd(),
      'artifacts/design-qa-2026-08-19/diagnose-preview-trip-hydration.mjs',
    ), 'utf8');

    expect(diagnostic).toContain('/v9/projects/');
    expect(diagnostic).not.toContain('/protection-bypass');
    expect(diagnostic).not.toMatch(/method:\s*['"]PATCH['"]/);
  });
});
