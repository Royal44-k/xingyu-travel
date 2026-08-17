import { describe, expect, it } from 'vitest';
import { defaultPartnerIntent, demoPartnerCandidates, filterPartnerCandidates, scorePartnerCandidate, validatePartnerIntent } from '@/data/partners';
import { tripToPartnerIntent } from '@/features/partners/trip-to-partner-intent';

describe('tripToPartnerIntent', () => {
  it('uses canonical trip fields while preserving personal preferences and keeps 木雨 at score 92', () => {
    const canonicalTrip = {
      id: 'draft-dali-slow-5d',
      sourcePostSlug: 'dali-slow-5d',
      title: '大理慢行计划',
      destination: '大理',
      startDate: '2026-09-18',
      endDate: '2026-09-22',
      travelers: 3,
      budget: 5200,
      status: 'active',
      guardianEnabled: false,
      items: [],
      candidates: [],
      votes: {},
    } as const;
    const intent = tripToPartnerIntent(canonicalTrip, defaultPartnerIntent);
    expect(intent).toMatchObject({ destination: '大理', startDate: '2026-09-18', endDate: '2026-09-22', budget: 5200, pace: defaultPartnerIntent.pace });
    expect(validatePartnerIntent(intent)).toMatchObject({ success: true });
    const candidates = filterPartnerCandidates(intent, demoPartnerCandidates, { viewerId: 'viewer-demo', blockedCandidateIds: [] });
    const muyu = candidates.find((candidate) => candidate.id === 'user-muyu');
    expect(muyu).toBeDefined();
    expect(scorePartnerCandidate(intent, muyu!).score).toBe(92);
  });
});
