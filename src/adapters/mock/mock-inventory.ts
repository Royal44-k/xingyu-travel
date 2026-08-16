import type { InventoryProvider } from '../contracts';
import { normalizeOffer } from '@/domain/comparison/normalize-offer';
import { offerIdentity } from '@/domain/comparison/offer-identity';
import type {
  NormalizedOffer,
  SupplierRunProvider,
  SupplierRunResult,
} from '@/domain/comparison/types';
import type { ComparisonSearchInput } from '@/domain/shared/api';
import {
  sandboxOffers,
  sandboxSupplierRuns,
  type SandboxSupplierRunFixture,
} from '@/data/offers';

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
  constructor(
    private readonly runs: readonly SandboxSupplierRunFixture[] = sandboxSupplierRuns,
    private readonly offers: readonly import('@/domain/comparison/types').RawOffer[] = sandboxOffers,
  ) {}

  async *run(input: ComparisonSearchInput): AsyncIterable<SupplierRunResult> {
    const destination = input.destination.trim().toLowerCase();
    const runs = this.runs
      .filter((run) => run.destination.toLowerCase() === destination)
      .filter((run) => input.kind === undefined || run.kind === input.kind);

    for (const run of runs) {
      if (run.status === 'failure') {
        yield run;
        continue;
      }

      const offers = run.offerRefs
        .map((offerRef) =>
          this.offers.find(
            (offer) => offerIdentity(offer) === offerIdentity(offerRef),
          ),
        )
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
