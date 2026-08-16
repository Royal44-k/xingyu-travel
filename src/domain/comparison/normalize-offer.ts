import type { NormalizedOffer, RawOffer } from './types';

export function normalizeOffer(raw: RawOffer): NormalizedOffer {
  const taxes = raw.taxes ?? 0;
  const mandatoryFees = raw.mandatoryFees ?? 0;

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
