import type { InventoryProvider } from '../contracts';
import { normalizeOffer } from '@/domain/comparison/normalize-offer';
import type {
  NormalizedOffer,
  SupplierRunProvider,
  SupplierRunResult,
} from '@/domain/comparison/types';
import type { ComparisonSearchInput } from '@/domain/shared/api';
import { sandboxOffers, sandboxSupplierRuns } from '@/data/offers';

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

export class MockSupplierRunProvider implements SupplierRunProvider {
  async *run(input: ComparisonSearchInput): AsyncIterable<SupplierRunResult> {
    const destination = input.destination.trim().toLowerCase();
    const runs = sandboxSupplierRuns
      .filter((run) => run.destination.toLowerCase() === destination)
      .filter((run) => input.kind === undefined || run.kind === input.kind);

    for (const run of runs) {
      if (run.status === 'failure') {
        yield run;
        continue;
      }

      const offers = run.offerIds
        .map((offerId) => sandboxOffers.find((offer) => offer.id === offerId))
        .filter((offer) => offer !== undefined)
        .filter(
          (offer) =>
            input.origin === undefined ||
            offer.origin === undefined ||
            offer.origin === input.origin,
        )
        .map(normalizeOffer);
      yield { status: 'success', provider: run.provider, offers };
    }
  }
}
