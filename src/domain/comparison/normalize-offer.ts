import type { NormalizedOffer, RawOffer } from './types';

function assertValidPriceComponent(
  field: 'basePrice' | 'taxes' | 'mandatoryFees',
  value: number,
): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${field} must be a finite non-negative number`);
  }
}

export function normalizeOffer(raw: RawOffer): NormalizedOffer {
  const taxes = raw.taxes ?? 0;
  const mandatoryFees = raw.mandatoryFees ?? 0;

  assertValidPriceComponent('basePrice', raw.basePrice);
  assertValidPriceComponent('taxes', taxes);
  assertValidPriceComponent('mandatoryFees', mandatoryFees);

  return {
    ...raw,
    taxes,
    mandatoryFees,
    demoMode: raw.demoMode ?? false,
    currency: 'CNY',
    totalPrice: raw.basePrice + taxes + mandatoryFees,
    priceExplanation: `基础价 ¥${raw.basePrice} · 税费 ¥${taxes} · 必付费用 ¥${mandatoryFees}`,
  };
}
