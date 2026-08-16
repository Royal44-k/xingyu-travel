export interface MatchSignals {
  destination: string;
  dateOverlap: number;
  budgetFit: number;
  paceFit: number;
  interestFit: number;
  routeFit: number;
  lodgingFit: number;
  scheduleFit: number;
  socialFit: number;
}

export interface MatchCandidate {
  id: string;
  displayName: string;
}

export type MatchReasonKey =
  | 'date'
  | 'budget'
  | 'pace'
  | 'interest'
  | 'route'
  | 'lodging'
  | 'schedule'
  | 'social';

export interface MatchReason {
  key: MatchReasonKey;
  points: number;
}

export interface MatchResult {
  candidate: MatchCandidate;
  score: number;
  reasons: MatchReason[];
}

type ScoredSignal = Exclude<keyof MatchSignals, 'destination'>;

const weightedSignals = [
  { signal: 'dateOverlap', key: 'date', weight: 25 },
  { signal: 'budgetFit', key: 'budget', weight: 20 },
  { signal: 'paceFit', key: 'pace', weight: 15 },
  { signal: 'interestFit', key: 'interest', weight: 15 },
  { signal: 'routeFit', key: 'route', weight: 10 },
  { signal: 'lodgingFit', key: 'lodging', weight: 5 },
  { signal: 'scheduleFit', key: 'schedule', weight: 5 },
  { signal: 'socialFit', key: 'social', weight: 5 },
] as const satisfies ReadonlyArray<{
  signal: ScoredSignal;
  key: MatchReasonKey;
  weight: number;
}>;

function clampFit(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function scoreMatch(intent: MatchSignals, candidate: MatchCandidate): MatchResult {
  const entries = weightedSignals.map(({ signal, key, weight }, order) => ({
    key,
    points: clampFit(intent[signal]) * weight,
    order,
  }));

  const score = Math.round(entries.reduce((sum, entry) => sum + entry.points, 0));
  const reasons = entries
    .sort((left, right) => right.points - left.points || left.order - right.order)
    .slice(0, 3)
    .map(({ key, points }) => ({ key, points }));

  return { candidate, score, reasons };
}
