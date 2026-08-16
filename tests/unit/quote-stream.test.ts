import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/v1/comparison/searches/route';
import { GET, encodeSse } from '@/app/api/v1/comparison/searches/[id]/events/route';
import type { QuoteEvent } from '@/domain/comparison/types';

const validSearch = {
  destination: '大理',
  kind: 'flight',
  origin: '上海',
  from: '2026-08-22',
  to: '2026-08-27',
  travelers: 2,
} as const;

async function createSearch(body: unknown = validSearch) {
  return POST(
    new Request('http://test/api/v1/comparison/searches', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

describe('comparison search route', () => {
  it('returns 202 with a stable traceable search id and a unique request id', async () => {
    const first = await createSearch();
    const second = await createSearch();
    const firstBody = await first.json();
    const secondBody = await second.json();

    expect(first.status).toBe(202);
    expect(firstBody).toMatchObject({
      search_id: expect.stringMatching(/^search_[a-z0-9]+$/),
      request_id: expect.stringMatching(/^req_/),
      demo_mode: true,
    });
    expect(secondBody.search_id).toBe(firstBody.search_id);
    expect(secondBody.request_id).not.toBe(firstBody.request_id);
  });

  it.each([
    ['malformed JSON', '{'],
    ['an unsupported product kind', { ...validSearch, kind: 'car' }],
    ['an empty destination', { ...validSearch, destination: '   ' }],
    ['an invalid traveler count', { ...validSearch, travelers: 0 }],
  ])('returns the unified JSON error contract for %s', async (_name, body) => {
    const response = await createSearch(body);

    expect(response.status).toBe(400);
    expect(response.headers.get('content-type')).toContain('application/json');
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: {
        code: 'INVALID_COMPARISON_SEARCH',
        message: expect.any(String),
      },
      request_id: expect.stringMatching(/^req_/),
      demo_mode: true,
    });
  });
});

describe('comparison quote stream', () => {
  it('frames an event as valid UTF-8 server-sent event data', () => {
    const event: QuoteEvent = {
      type: 'degraded',
      payload: { unavailableProviders: 1, message: '1 家供应商暂未响应' },
    };

    expect(new TextDecoder().decode(encodeSse(event))).toBe(
      'event: degraded\ndata: {"unavailableProviders":1,"message":"1 家供应商暂未响应"}\n\n',
    );
  });

  it('streams deterministic sandbox offers, degradation, and completion with SSE headers', async () => {
    const creation = await createSearch();
    const { search_id: searchId } = await creation.json();
    const response = await GET(
      new Request(`http://test/api/v1/comparison/searches/${searchId}/events`),
      { params: Promise.resolve({ id: searchId }) },
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-cache, no-transform');
    expect(response.headers.get('connection')).toBe('keep-alive');
    expect(text).toContain('event: offer\n');
    expect(text).toContain('"id":"DEMO-FLIGHT-DAL-01"');
    expect(text).toContain('"totalPrice":1020');
    expect(text).toContain('event: degraded\n');
    expect(text).toContain('event: complete\n');
    expect(text.indexOf('event: offer')).toBeLessThan(text.indexOf('event: degraded'));
    expect(text.indexOf('event: degraded')).toBeLessThan(text.indexOf('event: complete'));
  });

  it('returns a unified not-found response for an unknown search id', async () => {
    const response = await GET(
      new Request('http://test/api/v1/comparison/searches/search_missing/events'),
      { params: Promise.resolve({ id: 'search_missing' }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'COMPARISON_SEARCH_NOT_FOUND' },
      demo_mode: true,
    });
  });
});
