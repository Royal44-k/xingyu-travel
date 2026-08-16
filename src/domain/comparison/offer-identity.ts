import type { RawOffer } from './types';

export type OfferIdentityInput = Pick<RawOffer, 'provider' | 'id'>;

export function offerIdentity(offer: OfferIdentityInput): string {
  return JSON.stringify([offer.provider, offer.id]);
}
