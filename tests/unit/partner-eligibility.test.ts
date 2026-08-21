import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultPartnerIntent,
  demoPartnerCandidates,
  filterPartnerCandidates,
  isPartnerEligible,
  scorePartnerCandidate,
  validatePartnerIntent,
  type PartnerCandidate,
  type PartnerIntent,
} from '@/data/partners';
import { containsContactDetails, createPartnerStore } from '@/stores/partner-store';

const eligibleProfile = {
  id: 'viewer-demo',
  age: 28,
  identityVerified: true,
  riskStatus: 'clear' as const,
};
const daliPartnerIntent = { ...defaultPartnerIntent, destination: '大理' };

beforeEach(() => window.localStorage.clear());

describe('partner eligibility', () => {
  it.each([
    [{ age: 17, identityVerified: true, riskStatus: 'clear' as const }, 'AGE_RESTRICTED'],
    [{ age: 24, identityVerified: false, riskStatus: 'clear' as const }, 'IDENTITY_REQUIRED'],
    [{ age: 24, identityVerified: true, riskStatus: 'review' as const }, 'RISK_RESTRICTED'],
  ])('blocks ineligible partner actions with a deterministic code', (profile, code) => {
    expect(isPartnerEligible({ id: 'viewer', ...profile })).toEqual({ allowed: false, code });
  });

  it('allows a clear, identity-verified adult without collecting identity artifacts', () => {
    expect(isPartnerEligible(eligibleProfile)).toEqual({ allowed: true });
    expect(eligibleProfile).not.toHaveProperty('idNumber');
    expect(eligibleProfile).not.toHaveProperty('identityPhoto');
    expect(eligibleProfile).not.toHaveProperty('face');
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, undefined])(
    'treats malformed runtime age %s as age restricted',
    (age) => {
      expect(isPartnerEligible({ ...eligibleProfile, age } as typeof eligibleProfile)).toEqual({
        allowed: false,
        code: 'AGE_RESTRICTED',
      });
    },
  );
});

describe('partner intent and hard filters', () => {
  it('rolls back owner memory when browser persistence rejects an intent write', async () => {
    const store = createPartnerStore();
    await store.persist.rehydrate();
    const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      if (key === 'xingyu-partner-demo-v1') throw new Error('QUOTA_EXCEEDED');
      originalSetItem(key, value);
    });

    expect(() => store.getState().publishIntent(eligibleProfile, daliPartnerIntent)).toThrow('QUOTA_EXCEEDED');
    expect(store.getState().intents[eligibleProfile.id]).toBeUndefined();

    setItem.mockRestore();
  });

  it('requires every intent field and a valid date, budget, interest, and capacity', () => {
    expect(validatePartnerIntent({
      ...defaultPartnerIntent,
      destination: '',
      endDate: '2026-09-01',
      budget: 0,
      interests: [],
      capacity: 0,
    })).toEqual({
      success: false,
      fieldErrors: {
        budget: '请输入大于 0 的预算',
        capacity: '同行容量至少为 1 人',
        destination: '请输入目的地',
        endDate: '返程日期不能早于出发日期',
        interests: '请至少选择一项兴趣',
      },
    });
  });

  it('filters destination, date, capacity, certification, blocked relations, and candidate risk', () => {
    const seed = demoPartnerCandidates[0];
    const candidates: PartnerCandidate[] = [
      seed,
      { ...seed, id: 'wrong-destination', destination: '川西' },
      { ...seed, id: 'wrong-date', startDate: '2026-10-02', endDate: '2026-10-05' },
      { ...seed, id: 'full', capacity: 1 },
      { ...seed, id: 'uncertified', certified: false },
      { ...seed, id: 'blocked-us', blockedUserIds: [eligibleProfile.id] },
      { ...seed, id: 'we-blocked', blockedUserIds: [] },
      { ...seed, id: 'risk', riskStatus: 'review' },
    ];

    expect(filterPartnerCandidates(daliPartnerIntent, candidates, {
      viewerId: eligibleProfile.id,
      blockedCandidateIds: ['we-blocked'],
    }).map((candidate) => candidate.id)).toEqual([seed.id]);
  });

  it('keeps the approved candidate at 92 with exactly three understandable shared-model reasons', () => {
    const result = scorePartnerCandidate(defaultPartnerIntent, demoPartnerCandidates[0]);

    expect(result.score).toBe(92);
    expect(result.reasons).toEqual([
      '旅行日期高度重合',
      '预算范围很接近',
      '旅行节奏很合拍',
    ]);
  });

  it.each([
    ['budget', { budget: 9000 }, 74, ['旅行日期高度重合', '旅行节奏很合拍', '共同兴趣较多']],
    ['pace', { pace: '紧凑' }, 77, ['旅行日期高度重合', '预算范围很接近', '共同兴趣较多']],
    ['interests', { interests: ['徒步'] }, 77, ['旅行日期高度重合', '预算范围很接近', '旅行节奏很合拍']],
    ['route', { route: '拉萨—林芝' }, 82, ['旅行日期高度重合', '预算范围很接近', '旅行节奏很合拍']],
  ])('derives a predictable score from changed %s intent', (_field, patch, score, reasons) => {
    expect(scorePartnerCandidate({ ...defaultPartnerIntent, ...patch }, demoPartnerCandidates[0])).toMatchObject({
      score,
      reasons,
    });
  });

  it('changes the top reasons when several current intent preferences diverge', () => {
    expect(scorePartnerCandidate({
      ...defaultPartnerIntent,
      budget: 9000,
      pace: '紧凑',
      interests: ['徒步'],
      route: '拉萨—林芝',
    }, demoPartnerCandidates[0])).toMatchObject({
      score: 34,
      reasons: ['旅行日期高度重合', '住宿边界相容', '社交偏好相近'],
    });
  });

  it.each([
    ['overlong destination', { destination: '川'.repeat(81) }],
    ['invalid calendar date', { startDate: '2026-02-30' }],
    ['capacity over limit', { capacity: 13 }],
    ['too many interests', { interests: Array.from({ length: 21 }, (_, index) => `兴趣${index}`) }],
    ['unknown sensitive field', { preciseCoordinates: '30,120' }],
  ])('rejects strict runtime intent input before persistence: %s', (_label, patch) => {
    const malformed = { ...defaultPartnerIntent, ...patch } as unknown as PartnerIntent;
    const store = createPartnerStore();

    const validation = validatePartnerIntent(malformed);
    expect(validation.success).toBe(false);
    if (!validation.success) expect(Object.keys(validation.fieldErrors).length).toBeGreaterThan(0);
    expect(() => store.getState().publishIntent(eligibleProfile, malformed)).toThrow('PARTNER_INVALID_INTENT');
    expect(store.getState().intents).toEqual({});
  });
});

describe('partner match and chat state', () => {
  it('gates publish and match, then allows only pending_mutual to advance to matched', () => {
    const store = createPartnerStore();
    const candidateId = demoPartnerCandidates[0].id;

    expect(() => store.getState().publishIntent(
      { ...eligibleProfile, identityVerified: false },
      defaultPartnerIntent,
    )).toThrow('IDENTITY_REQUIRED');

    store.getState().publishIntent(eligibleProfile, daliPartnerIntent);
    const matchId = store.getState().requestMatch(eligibleProfile, candidateId);
    expect(store.getState().matches[matchId].status).toBe('pending_mutual');
    expect(() => store.getState().sendMessage(eligibleProfile, matchId, '你好')).toThrow(
      'PARTNER_MATCH_NOT_READY',
    );

    store.getState().simulateMutualApproval(eligibleProfile, matchId);
    expect(store.getState().matches[matchId].status).toBe('matched');
    expect(() => store.getState().simulateMutualApproval(eligibleProfile, matchId)).toThrow(
      'PARTNER_INVALID_TRANSITION:matched:matched',
    );
  });

  it('blocks contact details until each side consents, then sends with a warning', () => {
    const store = matchedStore();
    const matchId = Object.keys(store.getState().matches)[0];

    expect(store.getState().sendMessage(eligibleProfile, matchId, '加微信 travel_2026')).toEqual({
      sent: false,
      code: 'CONTACT_CONSENT_REQUIRED',
    });
    store.getState().setContactConsent(eligibleProfile, matchId, 'viewer', true);
    expect(store.getState().sendMessage(eligibleProfile, matchId, '邮箱 me@example.com')).toEqual({
      sent: false,
      code: 'CONTACT_CONSENT_REQUIRED',
    });
    store.getState().setContactConsent(eligibleProfile, matchId, 'candidate', true);

    expect(store.getState().sendMessage(eligibleProfile, matchId, '电话 13800138000')).toEqual({
      sent: true,
      warning: '联系方式已在双方同意后发送，仍请谨慎核验并优先使用站内沟通。',
    });
    expect(store.getState().matches[matchId].messages.at(-1)?.body).toBe('电话 13800138000');
  });

  it.each([
    '电话 138 0013 8000',
    '手机 138-0013-8000',
    '国际格式 +8613800138000',
    '国际格式 +86 138-0013-8000',
    '国际格式 008613800138000',
    '国际格式 0086 138 0013 8000',
    '联系 @travel_2026',
    '微 信 travel_2026',
    '加V: travel_2026',
    'vx travel2026',
    '邮箱 ME@example.com',
  ])('detects contact bypass form: %s', (body) => {
    expect(containsContactDetails(body)).toBe(true);
  });

  it.each(['走 318 国道', '预算 5200 元', '9 月 18 日出发', '航班号 CA1234', '订单 +86-2026-0918']) (
    'does not block ordinary travel number: %s',
    (body) => expect(containsContactDetails(body)).toBe(false),
  );

  it('locks matches immediately after block or report and records check-in safety state', () => {
    const blockedStore = matchedStore();
    const blockedId = Object.keys(blockedStore.getState().matches)[0];
    blockedStore.getState().acknowledgeTrustedContact(eligibleProfile, blockedId);
    blockedStore.getState().shareTrip(eligibleProfile, blockedId);
    blockedStore.getState().recordCheckIn(eligibleProfile, blockedId, 'checked_in');
    expect(blockedStore.getState().matches[blockedId]).toMatchObject({
      trustedContactAcknowledged: true,
      tripShared: true,
      checkInStatus: 'checked_in',
    });
    blockedStore.getState().blockMatch(eligibleProfile, blockedId);
    expect(blockedStore.getState().matches[blockedId].status).toBe('blocked');
    expect(blockedStore.getState().visibleMatchIds).not.toContain(blockedId);
    expect(() => blockedStore.getState().recordCheckIn(eligibleProfile, blockedId, 'missed')).toThrow(
      'PARTNER_MATCH_LOCKED',
    );

    const reportedStore = matchedStore();
    const reportedId = Object.keys(reportedStore.getState().matches)[0];
    reportedStore.getState().reportMatch(eligibleProfile, reportedId);
    expect(reportedStore.getState().matches[reportedId].status).toBe('reported');
    expect(reportedStore.getState().visibleMatchIds).not.toContain(reportedId);
  });

  it.each(['blockMatch', 'reportMatch'] as const)(
    'atomically revokes bilateral contact consent on terminal %s',
    (action) => {
      const store = matchedStore();
      const matchId = Object.keys(store.getState().matches)[0];
      store.getState().setContactConsent(eligibleProfile, matchId, 'viewer', true);
      store.getState().setContactConsent(eligibleProfile, matchId, 'candidate', true);

      store.getState()[action](eligibleProfile, matchId);

      expect(store.getState().matches[matchId]).toMatchObject({
        viewerContactConsent: false,
        candidateContactConsent: false,
      });
      expect(() => store.getState().setContactConsent(eligibleProfile, matchId, 'viewer', true)).toThrow(
        'PARTNER_MATCH_LOCKED',
      );
      expect(() => store.getState().sendMessage(eligibleProfile, matchId, 'me@example.com')).toThrow(
        'PARTNER_MATCH_LOCKED',
      );
      const persisted = JSON.parse(window.localStorage.getItem('xingyu-partner-demo-v1') ?? '{}');
      expect(persisted.state.matches[matchId]).toMatchObject({
        viewerContactConsent: false,
        candidateContactConsent: false,
      });
    },
  );

  it('rejects malformed persisted matches without overwriting the unsafe bytes', async () => {
    const malformedBytes = JSON.stringify({
      state: {
        intents: {},
        matches: { bad: { id: 'bad', status: 'matched', messages: 'not-an-array' } },
        visibleMatchIds: ['bad'],
        blockedCandidateIds: [],
      },
      version: 1,
    });
    window.localStorage.setItem('xingyu-partner-demo-v1', malformedBytes);
    let hydrationFailure: unknown;
    const store = createPartnerStore({ onHydrationError: (error) => { hydrationFailure = error; } });

    await store.persist.rehydrate();

    expect(hydrationFailure).toBeInstanceOf(Error);
    expect((hydrationFailure as Error).message).toBe('PARTNER_INVALID_PERSISTED_STATE');
    expect(store.getState().matches).toEqual({});
    expect(window.localStorage.getItem('xingyu-partner-demo-v1')).toBe(malformedBytes);
  });

  it('preserves malformed bytes through later mutations until the owner explicitly resets', async () => {
    const storageKey = 'xingyu-partner-demo-v1';
    const malformedBytes = '{"state":{"matches":';
    window.localStorage.setItem(storageKey, malformedBytes);
    const store = createPartnerStore();

    await store.persist.rehydrate();
    store.getState().publishIntent(eligibleProfile, daliPartnerIntent);

    expect(window.localStorage.getItem(storageKey)).toBe(malformedBytes);

    store.getState().resetPartnerStore();

    expect(store.getState()).toMatchObject({
      intents: {}, matches: {}, visibleMatchIds: [], blockedCandidateIds: [],
    });
    const resetEnvelope = JSON.parse(window.localStorage.getItem(storageKey) ?? '{}');
    expect(resetEnvelope).toMatchObject({
      state: { intents: {}, matches: {}, visibleMatchIds: [], blockedCandidateIds: [] },
      version: 2,
    });
  });

  it('migrates a valid v1 terminal match by revoking consent and repersisting safe v2 state', async () => {
    const source = matchedStore();
    const matchId = Object.keys(source.getState().matches)[0];
    source.getState().setContactConsent(eligibleProfile, matchId, 'viewer', true);
    source.getState().setContactConsent(eligibleProfile, matchId, 'candidate', true);
    source.getState().sendMessage(eligibleProfile, matchId, '先在站内确认路线');
    source.getState().acknowledgeTrustedContact(eligibleProfile, matchId);
    source.getState().shareTrip(eligibleProfile, matchId);
    const legacyState = JSON.parse(window.localStorage.getItem('xingyu-partner-demo-v1') ?? '{}').state;
    legacyState.matches[matchId].status = 'blocked';
    legacyState.matches[matchId].viewerContactConsent = true;
    legacyState.matches[matchId].candidateContactConsent = true;
    legacyState.visibleMatchIds = [];
    legacyState.blockedCandidateIds = [demoPartnerCandidates[0].id];
    const legacyBytes = JSON.stringify({ state: legacyState, version: 1 });
    window.localStorage.setItem('xingyu-partner-demo-v1', legacyBytes);
    const store = createPartnerStore();

    await store.persist.rehydrate();

    expect(store.getState().matches[matchId]).toEqual({
      ...legacyState.matches[matchId],
      viewerContactConsent: false,
      candidateContactConsent: false,
    });
    expect(store.getState().intents).toEqual(legacyState.intents);
    expect(store.getState().blockedCandidateIds).toEqual(legacyState.blockedCandidateIds);
    const migrated = JSON.parse(window.localStorage.getItem('xingyu-partner-demo-v1') ?? '{}');
    expect(migrated.version).toBe(2);
    expect(migrated.state.matches[matchId]).toMatchObject({
      status: 'blocked',
      viewerContactConsent: false,
      candidateContactConsent: false,
    });
  });

  it('rejects v2 persisted terminal matches that retain either contact consent flag', async () => {
    const source = matchedStore();
    const matchId = Object.keys(source.getState().matches)[0];
    const unsafeState = JSON.parse(window.localStorage.getItem('xingyu-partner-demo-v1') ?? '{}').state;
    unsafeState.matches[matchId].status = 'reported';
    unsafeState.matches[matchId].viewerContactConsent = true;
    unsafeState.visibleMatchIds = [];
    const unsafeBytes = JSON.stringify({ state: unsafeState, version: 2 });
    window.localStorage.setItem('xingyu-partner-demo-v1', unsafeBytes);
    let hydrationFailure: unknown;
    const store = createPartnerStore({ onHydrationError: (error) => { hydrationFailure = error; } });

    await store.persist.rehydrate();

    expect(hydrationFailure).toBeInstanceOf(Error);
    expect((hydrationFailure as Error).message).toBe('PARTNER_INVALID_PERSISTED_STATE');
    expect(store.getState().matches).toEqual({});
    expect(window.localStorage.getItem('xingyu-partner-demo-v1')).toBe(unsafeBytes);
  });
});

function matchedStore() {
  const store = createPartnerStore();
  store.getState().publishIntent(eligibleProfile, daliPartnerIntent);
  const matchId = store.getState().requestMatch(eligibleProfile, demoPartnerCandidates[0].id);
  store.getState().simulateMutualApproval(eligibleProfile, matchId);
  return store;
}
