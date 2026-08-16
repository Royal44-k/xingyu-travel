import { expect, it } from 'vitest';
import { searchFromParams } from '@/features/comparison/search-params';

it('normalizes repeated comparison params deterministically using the first value', () => {
  expect(
    searchFromParams({
      kind: ['hotel', 'flight'],
      destination: [' 大理古城 ', '丽江'],
      origin: ['上海', '北京'],
      from: ['2026-09-01', '2026-10-01'],
      to: ['2026-09-03', '2026-10-03'],
      travelers: ['3', '5'],
    }),
  ).toEqual({
    kind: 'hotel',
    destination: '大理古城',
    origin: '上海',
    from: '2026-09-01',
    to: '2026-09-03',
    travelers: 3,
  });
});

it('falls back safely when repeated values begin with an invalid value', () => {
  expect(
    searchFromParams({
      kind: ['car', 'hotel'],
      destination: [],
      travelers: ['not-a-number', '2'],
    }),
  ).toEqual({ kind: 'flight', destination: '大理' });
});
