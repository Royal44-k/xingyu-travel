import { describe, expect, it } from 'vitest';
import { scoreMatch } from '@/domain/partners/score-match';

describe('scoreMatch', () => {
  it('uses the fixed weighted model and explains the top three reasons', () => {
    const result = scoreMatch(
      {
        destination: '川西',
        dateOverlap: 1,
        budgetFit: 0.9,
        paceFit: 1,
        interestFit: 0.8,
        routeFit: 1,
        lodgingFit: 1,
        scheduleFit: 0.6,
        socialFit: 0.8,
      },
      { id: 'user-muyu', displayName: '木雨' },
    );

    expect(result.score).toBe(92);
    expect(result.reasons).toHaveLength(3);
    expect(result.reasons.map((reason) => reason.key)).toEqual(['date', 'budget', 'pace']);
  });

  it('breaks equal-point ties in the published signal order', () => {
    const result = scoreMatch(
      {
        destination: '川西',
        dateOverlap: 0,
        budgetFit: 0,
        paceFit: 1,
        interestFit: 1,
        routeFit: 0,
        lodgingFit: 0,
        scheduleFit: 0,
        socialFit: 0,
      },
      { id: 'user-muyu', displayName: '木雨' },
    );

    expect(result.reasons.map((reason) => reason.key)).toEqual(['pace', 'interest', 'date']);
  });

  it('clamps out-of-range fit signals before scoring', () => {
    const result = scoreMatch(
      {
        destination: '川西',
        dateOverlap: 2,
        budgetFit: -1,
        paceFit: 0,
        interestFit: 0,
        routeFit: 0,
        lodgingFit: 0,
        scheduleFit: 0,
        socialFit: 0,
      },
      { id: 'user-muyu', displayName: '木雨' },
    );

    expect(result.score).toBe(25);
    expect(result.reasons[0]).toMatchObject({ key: 'date', points: 25 });
  });

  it('normalizes non-finite fit signals to zero and returns serializable reasons', () => {
    const result = scoreMatch(
      {
        destination: '川西',
        dateOverlap: Number.NaN,
        budgetFit: Number.POSITIVE_INFINITY,
        paceFit: Number.NEGATIVE_INFINITY,
        interestFit: 0,
        routeFit: 0,
        lodgingFit: 0,
        scheduleFit: 0,
        socialFit: 0,
      },
      { id: 'user-muyu', displayName: '木雨' },
    );

    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([
      { key: 'date', points: 0 },
      { key: 'budget', points: 0 },
      { key: 'pace', points: 0 },
    ]);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
});
