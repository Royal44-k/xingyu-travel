import { expect, it } from 'vitest';
import { offerIdentity } from '@/domain/comparison/offer-identity';

it('keeps delimiter-bearing provider and offer id pairs collision-free', () => {
  expect(offerIdentity({ provider: 'a', id: 'b:c' })).not.toBe(
    offerIdentity({ provider: 'a:b', id: 'c' }),
  );
});
