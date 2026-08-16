export const offerKinds = ['flight', 'hotel', 'train', 'car', 'ticket'] as const;

export type OfferKind = (typeof offerKinds)[number];

export const comparisonProductKinds = ['flight', 'hotel', 'ticket'] as const;

export type ComparisonProductKind = (typeof comparisonProductKinds)[number];

export interface RawOffer {
  id: string;
  provider: string;
  kind: OfferKind;
  title?: string;
  origin?: string;
  destination?: string;
  basePrice: number;
  taxes?: number;
  mandatoryFees?: number;
  baggageIncluded: boolean;
  refundable: boolean;
  updatedAt: string;
  demoMode?: boolean;
}

export interface NormalizedOffer extends Omit<RawOffer, 'taxes' | 'mandatoryFees' | 'demoMode'> {
  taxes: number;
  mandatoryFees: number;
  demoMode: boolean;
  currency: 'CNY';
  totalPrice: number;
  priceExplanation: string;
}

export type QuoteEvent =
  | { type: 'offer'; payload: NormalizedOffer }
  | {
      type: 'degraded';
      payload: { unavailableProviders: number; message: string };
    }
  | { type: 'complete'; payload: { offerCount: number } };
