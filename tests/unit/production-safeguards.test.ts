import { createHash } from 'node:crypto';
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

  it('ships dedicated square brand icons instead of reusing a travel photo as the favicon', () => {
    const appIcon = readFileSync(join(process.cwd(), 'src/app/icon.png'));
    const appleIcon = readFileSync(join(process.cwd(), 'src/app/apple-icon.png'));
    const pwa192 = readFileSync(join(process.cwd(), 'public/icon-192.png'));
    const pwa512 = readFileSync(join(process.cwd(), 'public/icon-512.png'));
    const favicon = readFileSync(join(process.cwd(), 'src/app/favicon.ico'));
    const formerTravelPhoto = readFileSync(join(
      process.cwd(),
      'public/assets/guardian-rainy-mountain.png',
    ));

    for (const [bytes, width, height] of [
      [appIcon, 512, 512],
      [appleIcon, 180, 180],
      [pwa192, 192, 192],
      [pwa512, 512, 512],
    ] as const) {
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(bytes.readUInt32BE(16)).toBe(width);
      expect(bytes.readUInt32BE(20)).toBe(height);
      expect(bytes.length).toBeGreaterThan(1_000);
    }

    expect(favicon.subarray(0, 4).toString('hex')).toBe('00000100');
    expect(createHash('sha256').update(appIcon).digest('hex')).not.toBe(
      createHash('sha256').update(formerTravelPhoto).digest('hex'),
    );
  });

  it('advertises installable 行屿 icons in the web manifest', () => {
    expect(manifest().icons).toEqual([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ]);
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
