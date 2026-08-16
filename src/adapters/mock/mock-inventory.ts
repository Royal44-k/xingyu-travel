import type { InventoryProvider } from '../contracts';
import { normalizeOffer } from '@/domain/comparison/normalize-offer';
import type { NormalizedOffer } from '@/domain/comparison/types';
import type { ComparisonSearchInput } from '@/domain/shared/api';
import { sandboxOffers } from '@/data/offers';

export class MockInventoryProvider implements InventoryProvider {
  async *search(input: ComparisonSearchInput): AsyncIterable<NormalizedOffer> {
    const destination = input.destination.trim().toLowerCase();
    const offers = sandboxOffers
      .filter((offer) => offer.destination?.toLowerCase() === destination)
      .filter((offer) => input.kind === undefined || offer.kind === input.kind)
      .filter((offer) => input.origin === undefined || offer.origin === input.origin)
      .map(normalizeOffer)
      .sort(
        (left, right) =>
          left.totalPrice - right.totalPrice || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
      );

    for (const offer of offers) {
      yield offer;
    }
  }
}
