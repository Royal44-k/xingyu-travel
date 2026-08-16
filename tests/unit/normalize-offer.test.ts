import { describe, expect, it } from 'vitest';
import { MockInventoryProvider } from '@/adapters/mock/mock-inventory';
import { normalizeOffer } from '@/domain/comparison/normalize-offer';

describe('normalizeOffer', () => {
  it('sorts by comparable total instead of bare price', () => {
    const offer = normalizeOffer({
      id: 'MU-DAL-01',
      provider: '云程旅行',
      kind: 'flight',
      basePrice: 860,
      taxes: 120,
      mandatoryFees: 40,
      baggageIncluded: true,
      refundable: false,
      updatedAt: '2026-08-16T09:00:00+08:00',
    });

    expect(offer.totalPrice).toBe(1020);
    expect(offer.priceExplanation).toContain('税费 ¥120');
    expect(offer.priceExplanation).toContain('必付费用 ¥40');
    expect(offer.demoMode).toBe(false);
  });

  it('treats omitted taxes and mandatory fees as zero', () => {
    const offer = normalizeOffer({
      id: 'HOTEL-DAL-01',
      provider: '星屿沙箱',
      kind: 'hotel',
      basePrice: 680,
      baggageIncluded: false,
      refundable: true,
      updatedAt: '2026-08-16T09:00:00+08:00',
      demoMode: true,
    });

    expect(offer.totalPrice).toBe(680);
    expect(offer.priceExplanation).toBe('基础价 ¥680 · 税费 ¥0 · 必付费用 ¥0');
  });
});

describe('MockInventoryProvider', () => {
  it('returns only fixed sandbox offers that match the search', async () => {
    const provider = new MockInventoryProvider();
    const offers = [];

    for await (const offer of provider.search({ destination: '大理', kind: 'flight' })) {
      offers.push(offer);
    }

    expect(offers).not.toHaveLength(0);
    expect(offers.every((offer) => offer.kind === 'flight')).toBe(true);
    expect(offers.every((offer) => offer.demoMode)).toBe(true);
    expect(offers.every((offer) => offer.updatedAt === '2026-08-16T09:00:00+08:00')).toBe(true);
    expect(offers.map((offer) => offer.totalPrice)).toEqual(
      [...offers].sort((left, right) => left.totalPrice - right.totalPrice).map((offer) => offer.totalPrice),
    );
  });
});
