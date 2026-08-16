import { describe, expect, it } from 'vitest';
import { POST } from '@/app/api/v1/comparison/searches/route';
import {
  GET,
  encodeSse,
  quoteEventsForSearch,
} from '@/app/api/v1/comparison/searches/[id]/events/route';
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
    ['a non-existent calendar date', { ...validSearch, from: '2026-02-30' }],
    ['a reversed date range', { ...validSearch, from: '2026-08-28', to: '2026-08-27' }],
    ['too many travelers', { ...validSearch, travelers: 10 }],
    ['an oversized destination', { ...validSearch, destination: '大'.repeat(61) }],
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

  it('trims bounded location inputs before creating the stable token', async () => {
    const response = await createSearch({
      ...validSearch,
      destination: '  大理  ',
      origin: '  上海  ',
    });
    const { search_id: searchId } = await response.json();
    const streamResponse = await GET(
      new Request(`http://test/api/v1/comparison/searches/${searchId}/events`),
      { params: Promise.resolve({ id: searchId }) },
    );

    expect(response.status).toBe(202);
    expect(streamResponse.status).toBe(200);
    expect(await streamResponse.text()).toContain('"id":"DEMO-FLIGHT-DAL-01"');
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
      new Request('http://test/api/v1/comparison/searches/missing/events'),
      { params: Promise.resolve({ id: 'missing' }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'COMPARISON_SEARCH_NOT_FOUND' },
      demo_mode: true,
    });
  });

  it.each([
    ['invalid encoded JSON', 'search_7b'],
    [
      'a stateless reversed date range',
      `search_${Array.from(
        new TextEncoder().encode(
          JSON.stringify({
            destination: '大理',
            kind: 'flight',
            origin: null,
            from: '2026-08-28',
            to: '2026-08-27',
            travelers: 2,
          }),
        ),
        (byte) => byte.toString(16).padStart(2, '0'),
      ).join('')}`,
    ],
    ['an oversized stateless token', `search_${'61'.repeat(2049)}`],
  ])('returns a structured 400 for %s', async (_name, id) => {
    const response = await GET(
      new Request(`http://test/api/v1/comparison/searches/${id}/events`),
      { params: Promise.resolve({ id }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'INVALID_COMPARISON_SEARCH_ID' },
      request_id: expect.stringMatching(/^req_/),
      demo_mode: true,
    });
  });

  it('emits degradation from a recorded ticket supplier failure rather than product kind', async () => {
    const creation = await createSearch({
      destination: '大理',
      kind: 'ticket',
      from: '2026-08-22',
      travelers: 2,
    });
    const { search_id: searchId } = await creation.json();
    const response = await GET(
      new Request(`http://test/api/v1/comparison/searches/${searchId}/events`),
      { params: Promise.resolve({ id: searchId }) },
    );
    const text = await response.text();

    expect(text).toContain('"id":"DEMO-TICKET-DAL-01"');
    expect(text).toContain('event: degraded\n');
    expect(text).toContain('大理景区直连暂未响应');
    expect(text).toContain('event: complete\n');
  });

  it('preserves partial offers and always completes after a supplier runner throws', async () => {
    const partialOffer = {
      id: 'partial-1',
      provider: '部分成功供应商',
      kind: 'flight',
      title: '部分成功报价',
      destination: '大理',
      basePrice: 800,
      taxes: 100,
      mandatoryFees: 0,
      totalPrice: 900,
      currency: 'CNY',
      priceExplanation: '基础价 ¥800 · 税费 ¥100 · 必付费用 ¥0',
      baggageIncluded: true,
      refundable: true,
      providerVerified: true,
      includedBenefits: ['托运行李'],
      updatedAt: '2026-08-16T09:00:00+08:00',
      demoMode: true,
    } as const;
    const throwingRuns = {
      async *run() {
        yield { status: 'success' as const, provider: '部分成功供应商', offers: [partialOffer] };
        throw new Error('supplier transport failed');
      },
    };
    const events = [];

    for await (const event of quoteEventsForSearch(validSearch, throwingRuns)) {
      events.push(event);
    }

    expect(events.map((event) => event.type)).toEqual([
      'offer',
      'degraded',
      'complete',
    ]);
    expect(events[1]).toMatchObject({
      type: 'degraded',
      payload: { unavailableProviders: 1 },
    });
    expect(events[2]).toEqual({ type: 'complete', payload: { offerCount: 1 } });
  });
});
