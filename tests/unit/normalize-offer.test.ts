import { describe, expect, it } from 'vitest';
import { MockInventoryProvider } from '@/adapters/mock/mock-inventory';
import { normalizeOffer } from '@/domain/comparison/normalize-offer';
import { offerKinds } from '@/domain/comparison/types';
import { sandboxOffers } from '@/data/offers';

const validRawOffer = {
  id: 'VALID-OFFER-01',
  provider: '星屿沙箱',
  kind: 'flight',
  basePrice: 100,
  taxes: 10,
  mandatoryFees: 5,
  baggageIncluded: false,
  refundable: true,
  updatedAt: '2026-08-16T09:00:00+08:00',
} as const;

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

  it.each([
    { field: 'basePrice', value: Number.NaN },
    { field: 'basePrice', value: Number.POSITIVE_INFINITY },
    { field: 'basePrice', value: Number.NEGATIVE_INFINITY },
    { field: 'basePrice', value: -1 },
    { field: 'taxes', value: Number.NaN },
    { field: 'taxes', value: Number.POSITIVE_INFINITY },
    { field: 'taxes', value: Number.NEGATIVE_INFINITY },
    { field: 'taxes', value: -1 },
    { field: 'mandatoryFees', value: Number.NaN },
    { field: 'mandatoryFees', value: Number.POSITIVE_INFINITY },
    { field: 'mandatoryFees', value: Number.NEGATIVE_INFINITY },
    { field: 'mandatoryFees', value: -1 },
  ] as const)('rejects invalid $field value $value before price arithmetic', ({ field, value }) => {
    const normalize = () => normalizeOffer({ ...validRawOffer, [field]: value });

    expect(normalize).toThrow(RangeError);
    expect(normalize).toThrow(`${field} must be a finite non-negative number`);
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

  it('supports attraction tickets as an offer kind', () => {
    expect(offerKinds).toContain('ticket');
  });

  it('exposes an explicit fixed sandbox attraction-ticket record', () => {
    expect(sandboxOffers).toContainEqual({
      id: 'DEMO-TICKET-DAL-01',
      provider: '星屿沙箱演示门票',
      kind: 'ticket',
      title: '大理古城体验演示门票',
      destination: '大理',
      basePrice: 88,
      taxes: 0,
      mandatoryFees: 0,
      baggageIncluded: false,
      refundable: true,
      updatedAt: '2026-08-16T09:00:00+08:00',
      demoMode: true,
    });
  });

  it('searches fixed sandbox attraction tickets by destination and kind', async () => {
    const provider = new MockInventoryProvider();
    const offers = [];

    for await (const offer of provider.search({ destination: '大理', kind: 'ticket' })) {
      offers.push(offer);
    }

    expect(offers.map((offer) => offer.id)).toEqual(['DEMO-TICKET-DAL-01']);
    expect(offers[0]).toMatchObject({
      kind: 'ticket',
      totalPrice: 88,
      updatedAt: '2026-08-16T09:00:00+08:00',
      demoMode: true,
    });
  });
});
