import { beforeEach, describe, expect, it, vi } from 'vitest';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { postsBySlug } from '@/data/posts';
import {
  createTripStore,
  getBudgetSummary,
  hydrateWorkbenchTripStore,
  selectAcceptedTripCount,
  selectMostRecentGuardianTrip,
  selectTripBySourceSlug,
  selectTripRecords,
  transitionTrip,
  useTripStore,
  useTripStoreHydration,
} from '@/stores/trip-store';

const daliDraft = extractTripDraft(postsBySlug['dali-slow-5d']);
const sichuanDraft = extractTripDraft(postsBySlug['sichuan-autumn-road']);
const guilinDraft = extractTripDraft(postsBySlug['guilin-river-morning']);
const canonicalKey = 'xingyu-demo-v1';
const legacyDraftKey = 'xingyu-demo-trip-drafts';
const stableMigrationTimestamp = '2026-08-18T00:00:00.000Z';

beforeEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe('trip state machine', () => {
  it('coalesces concurrent hydration requests from the header and route content', async () => {
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    let finishHydration: (() => void) | undefined;
    const pendingHydration = new Promise<void>((resolve) => { finishHydration = resolve; });
    const rehydrate = vi.spyOn(useTripStore.persist, 'rehydrate').mockReturnValue(pendingHydration);

    const headerHydration = hydrateWorkbenchTripStore();
    const routeHydration = hydrateWorkbenchTripStore();

    expect(rehydrate).toHaveBeenCalledTimes(1);
    finishHydration?.();
    await Promise.all([headerHydration, routeHydration]);
    expect(useTripStoreHydration.getState()).toEqual({ hydrated: true, hydrationError: false });
    rehydrate.mockRestore();
  });

  it('accepts a reviewed draft and enables guardian only after consent', () => {
    const store = createTripStore();

    store.getState().acceptDraft(daliDraft);
    expect(store.getState().trips[daliDraft.id].status).toBe('active');
    expect(() => store.getState().enableGuardian(daliDraft.id, false)).toThrow(
      'TRIP_GUARDIAN_CONSENT_REQUIRED',
    );

    store.getState().enableGuardian(daliDraft.id, true);
    expect(store.getState().trips[daliDraft.id]).toMatchObject({
      status: 'guarded',
      guardianEnabled: true,
    });
    store.getState().enableGuardian(daliDraft.id, false);
    expect(store.getState().trips[daliDraft.id]).toMatchObject({
      status: 'active',
      guardianEnabled: false,
    });
  });

  it('rejects invalid transitions with a stable error', () => {
    expect(() => transitionTrip('review', 'guarded')).toThrow(
      'TRIP_INVALID_TRANSITION:review:guarded',
    );
    expect(transitionTrip('active', 'guarded')).toBe('guarded');
  });
});

describe('trip editing', () => {
  it('keeps canonical map keys when every mutator is invoked through a source slug', async () => {
    const store = createTripStore();
    await store.persist.rehydrate();
    store.getState().acceptDraft(daliDraft);
    const slug = daliDraft.sourcePostSlug;
    const itemId = store.getState().trips[daliDraft.id].items[0].id;
    store.getState().updateTrip(slug, { budget: 6001 });
    store.getState().updateItem(slug, itemId, { estimatedCost: 601 });
    store.getState().toggleAlternative(slug, itemId);
    store.getState().reorderItem(slug, itemId, 'down');
    store.getState().vote(slug, 'member-lin', 'candidate-a');
    store.getState().enableGuardian(slug, true);
    store.getState().publishPartnerIntent(slug);
    store.getState().selectGuardianPlan(slug, { id: 'PLAN-A', title: '室内备选' });

    expect(Object.entries(store.getState().trips).every(([key, trip]) => key === trip.id)).toBe(true);
    const raw = window.localStorage.getItem('xingyu-demo-v1');
    expect(raw).not.toBeNull();
    const rehydrated = createTripStore();
    await rehydrated.persist.rehydrate();
    expect(rehydrated.getState().trips[daliDraft.id].budget).toBe(6001);
  });

  it('updates dates, budget, itinerary details and computes a literal overall total', () => {
    const store = createTripStore();
    store.getState().acceptDraft(daliDraft);
    const tripId = daliDraft.id;
    const firstItemId = store.getState().trips[tripId].items[0].id;

    store.getState().updateTrip(tripId, {
      startDate: '2026-09-20',
      endDate: '2026-09-24',
      budget: 6100,
    });
    store.getState().updateItem(tripId, firstItemId, {
      title: '抵达后先喝茶',
      location: '大理古城',
      estimatedCost: 650,
    });

    const trip = store.getState().trips[tripId];
    expect(trip).toMatchObject({
      startDate: '2026-09-20',
      endDate: '2026-09-24',
      budget: 6100,
    });
    expect(trip.items[0]).toMatchObject({ title: '抵达后先喝茶', estimatedCost: 650 });
    expect(getBudgetSummary(trip)).toEqual({
      itemTotals: [650, 420, 680, 980, 370],
      overall: 3100,
    });
  });

  it('keeps every item when reordering and ignores boundaries', () => {
    const store = createTripStore();
    store.getState().acceptDraft(daliDraft);
    const tripId = daliDraft.id;
    const original = store.getState().trips[tripId].items.map((item) => item.id);

    store.getState().reorderItem(tripId, original[0], 'up');
    expect(store.getState().trips[tripId].items.map((item) => item.id)).toEqual(original);

    store.getState().reorderItem(tripId, original[1], 'up');
    expect(store.getState().trips[tripId].items.map((item) => item.id)).toEqual([
      original[1], original[0], original[2], original[3], original[4],
    ]);
    expect(new Set(store.getState().trips[tripId].items.map((item) => item.id))).toEqual(
      new Set(original),
    );

    store.getState().reorderItem(tripId, original[4], 'down');
    expect(store.getState().trips[tripId].items).toHaveLength(5);
  });

  it('toggles alternatives without removing the itinerary node', () => {
    const store = createTripStore();
    store.getState().acceptDraft(daliDraft);
    const itemId = store.getState().trips[daliDraft.id].items[2].id;

    store.getState().toggleAlternative(daliDraft.id, itemId);
    expect(store.getState().trips[daliDraft.id].items[2].isAlternative).toBe(true);
    store.getState().toggleAlternative(daliDraft.id, itemId);
    expect(store.getState().trips[daliDraft.id].items[2].isAlternative).toBe(false);
  });
});

describe('decision room', () => {
  it('gives each demo member one deterministic vote that replaces or toggles off', () => {
    const store = createTripStore();
    store.getState().acceptDraft(daliDraft);
    const tripId = daliDraft.id;

    store.getState().vote(tripId, 'member-lin', 'candidate-a');
    expect(store.getState().trips[tripId].votes).toEqual({ 'member-lin': 'candidate-a' });
    store.getState().vote(tripId, 'member-lin', 'candidate-b');
    expect(store.getState().trips[tripId].votes).toEqual({ 'member-lin': 'candidate-b' });
    store.getState().vote(tripId, 'member-lin', 'candidate-b');
    expect(store.getState().trips[tripId].votes).toEqual({});
  });

  it('stores a guardian plan only on an accepted trip and preserves trip isolation', () => {
    const store = createTripStore();
    store.getState().acceptDraft(daliDraft);

    store.getState().selectGuardianPlan(daliDraft.sourcePostSlug, { id: 'PLAN-A', title: '室内备选' });
    expect(store.getState().guardianPlans).toEqual({ [daliDraft.id]: { id: 'PLAN-A', title: '室内备选' } });
    expect(() => store.getState().selectGuardianPlan('unknown-trip', { id: 'PLAN-B', title: '不应保存' })).toThrow('TRIP_NOT_FOUND:unknown-trip');
    expect(store.getState().guardianPlans).toEqual({ [daliDraft.id]: { id: 'PLAN-A', title: '室内备选' } });
  });

  it('selects guarded trips by updated time, then created time, then source slug', () => {
    const store = createTripStore();
    const dali = store.getState().savePostAsTrip(daliDraft);
    const sichuan = store.getState().savePostAsTrip(sichuanDraft);
    const guilin = store.getState().savePostAsTrip(guilinDraft);
    const guarded = Object.fromEntries([dali, sichuan, guilin].map((trip) => [
      trip.id,
      { ...trip, status: 'guarded' as const, guardianEnabled: true },
    ]));

    expect(selectMostRecentGuardianTrip({ trips: {
      ...guarded,
      [dali.id]: { ...guarded[dali.id], updatedAt: '2026-08-19T12:00:00.000Z' },
      [sichuan.id]: { ...guarded[sichuan.id], updatedAt: '2026-08-19T13:00:00.000Z' },
      [guilin.id]: { ...guarded[guilin.id], updatedAt: '2026-08-19T11:00:00.000Z' },
    } })?.sourcePostSlug).toBe('sichuan-autumn-road');

    const sameUpdate = '2026-08-19T13:00:00.000Z';
    expect(selectMostRecentGuardianTrip({ trips: {
      ...guarded,
      [dali.id]: { ...guarded[dali.id], updatedAt: sameUpdate, createdAt: '2026-08-19T11:00:00.000Z' },
      [sichuan.id]: { ...guarded[sichuan.id], updatedAt: sameUpdate, createdAt: '2026-08-19T10:00:00.000Z' },
      [guilin.id]: { ...guarded[guilin.id], updatedAt: sameUpdate, createdAt: '2026-08-19T09:00:00.000Z' },
    } })?.sourcePostSlug).toBe('dali-slow-5d');

    const sameCreated = '2026-08-19T11:00:00.000Z';
    expect(selectMostRecentGuardianTrip({ trips: Object.fromEntries(
      Object.entries(guarded).map(([id, trip]) => [id, { ...trip, updatedAt: sameUpdate, createdAt: sameCreated }]),
    ) })?.sourcePostSlug).toBe('dali-slow-5d');
  });

  it('excludes active and unsupported guarded trips from guardian navigation', () => {
    const store = createTripStore();
    const dali = store.getState().savePostAsTrip(daliDraft);
    const sichuan = store.getState().savePostAsTrip(sichuanDraft);
    const trips = {
      [dali.id]: { ...dali, status: 'guarded' as const, guardianEnabled: true, updatedAt: '2026-08-19T11:00:00.000Z' },
      [sichuan.id]: { ...sichuan, status: 'guarded' as const, guardianEnabled: true, updatedAt: '2026-08-19T12:00:00.000Z' },
    };

    expect(selectMostRecentGuardianTrip({ trips }, (slug) => slug === 'dali-slow-5d')).toMatchObject({
      id: dali.id,
      sourcePostSlug: 'dali-slow-5d',
    });
    expect(selectMostRecentGuardianTrip({ trips: { [sichuan.id]: { ...sichuan, status: 'active' } } })).toBeUndefined();
  });
});

describe('draft merge and persistence', () => {
  it('saves a converted guide once and returns the same canonical trip on repeat', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-19T10:30:00.000Z'));
    const store = createTripStore();

    const first = store.getState().savePostAsTrip(
      daliDraft,
      '/assets/destinations/dali/01.png',
    );
    const second = store.getState().savePostAsTrip({ ...daliDraft, id: 'replacement-id' });

    expect(second).toEqual(first);
    expect(Object.keys(store.getState().trips)).toEqual([first.id]);
    expect(first).toMatchObject({
      sourcePostSlug: 'dali-slow-5d',
      coverImage: '/assets/destinations/dali/01.png',
      createdAt: '2026-08-19T10:30:00.000Z',
      updatedAt: '2026-08-19T10:30:00.000Z',
    });
    expect(selectTripRecords(store.getState())).toBe(store.getState().trips);
    expect(selectTripBySourceSlug(store.getState(), daliDraft.sourcePostSlug)).toBe(first);
    expect(selectAcceptedTripCount(store.getState())).toBe(1);
  });

  it('merges the same source draft without replacing accepted edits', () => {
    const store = createTripStore();
    store.getState().acceptDraft(daliDraft);
    store.getState().updateTrip(daliDraft.id, { budget: 6888 });

    store.getState().acceptDraft({ ...daliDraft, id: 'replacement-id', budget: 9999 });

    expect(Object.keys(store.getState().trips)).toEqual([daliDraft.id]);
    expect(store.getState().trips[daliDraft.id].budget).toBe(6888);
  });

  it('persists only non-sensitive demo state under the required key after hydration', async () => {
    const store = createTripStore();
    await store.persist.rehydrate();
    store.getState().acceptDraft(daliDraft);
    store.getState().publishPartnerIntent(daliDraft.id);

    expect(window.localStorage.getItem('xingyu-demo-trip-drafts')).toBeNull();
    const raw = window.localStorage.getItem(canonicalKey);
    expect(raw).not.toBeNull();
    expect(raw).not.toMatch(/latitude|longitude|phone|email|coordinates/i);
    expect(JSON.parse(raw ?? '{}')).toMatchObject({
      version: 2,
      state: {
      trips: { [daliDraft.id]: { sourcePostSlug: 'dali-slow-5d' } },
      partnerIntents: { [daliDraft.id]: true },
      },
    });
  });

  it.each([
    ['null trips', { trips: null, partnerIntents: {} }],
    [
      'invalid status',
      {
        trips: {
          [daliDraft.id]: {
            ...acceptedTrip(),
            status: 'teleporting',
          },
        },
        partnerIntents: {},
      },
    ],
    [
      'NaN-like item cost',
      {
        trips: {
          [daliDraft.id]: {
            ...acceptedTrip(),
            items: [{ ...acceptedTrip().items[0], estimatedCost: 'NaN' }],
          },
        },
        partnerIntents: {},
      },
    ],
    [
      'incomplete item',
      {
        trips: {
          [daliDraft.id]: {
            ...acceptedTrip(),
            items: [{ id: 'incomplete-item' }],
          },
        },
        partnerIntents: {},
      },
    ],
  ])('rejects structurally malformed persisted state: %s', async (_name, malformedState) => {
    let hydrationError = false;
    const store = createTripStore({ onHydrationError: () => { hydrationError = true; } });
    store.getState().acceptDraft(daliDraft);
    const safeTrip = structuredClone(store.getState().trips[daliDraft.id]);
    const malformedBytes = JSON.stringify({ state: malformedState, version: 1 });
    window.localStorage.setItem(canonicalKey, malformedBytes);

    await store.persist.rehydrate();

    expect(hydrationError).toBe(true);
    expect(store.getState().trips).toEqual({ [daliDraft.id]: safeTrip });
    expect(window.localStorage.getItem(canonicalKey)).toBe(malformedBytes);
  });

  it('migrates v1 trips with stable timestamps and imports legacy drafts once without changing source bytes', async () => {
    const source = createTripStore();
    source.getState().acceptDraft(daliDraft);
    const v1Trip = withoutV2Fields(structuredClone(source.getState().trips[daliDraft.id]));
    const legacyDraftBytes = JSON.stringify({
      state: { drafts: { [sichuanDraft.sourcePostSlug]: sichuanDraft } },
      version: 0,
    });
    window.localStorage.setItem(canonicalKey, JSON.stringify({
      state: { trips: { [daliDraft.id]: { ...v1Trip, budget: 6000 } }, partnerIntents: {} },
      version: 1,
    }));
    window.localStorage.setItem(legacyDraftKey, legacyDraftBytes);
    const store = createTripStore();

    await store.persist.rehydrate();
    await store.persist.rehydrate();

    expect(Object.values(store.getState().trips)).toHaveLength(2);
    expect(store.getState().trips[daliDraft.id]).toMatchObject({
      budget: 6000,
      createdAt: stableMigrationTimestamp,
      updatedAt: stableMigrationTimestamp,
    });
    expect(store.getState().trips[sichuanDraft.id]).toMatchObject({
      sourcePostSlug: sichuanDraft.sourcePostSlug,
      createdAt: stableMigrationTimestamp,
      updatedAt: stableMigrationTimestamp,
    });
    expect(window.localStorage.getItem(legacyDraftKey)).toBe(legacyDraftBytes);
    expect(JSON.parse(window.localStorage.getItem(canonicalKey) ?? '{}').version).toBe(2);
  });

  it('fails closed on malformed canonical bytes and preserves the exact raw value', async () => {
    const malformedBytes = '{"state":{"trips":';
    let hydrationError = false;
    const store = createTripStore({ onHydrationError: () => { hydrationError = true; } });
    store.getState().acceptDraft(daliDraft);
    const safeState = structuredClone(store.getState().trips);
    window.localStorage.setItem(canonicalKey, malformedBytes);

    await store.persist.rehydrate();

    expect(hydrationError).toBe(true);
    expect(store.getState().trips).toEqual(safeState);
    expect(window.localStorage.getItem(canonicalKey)).toBe(malformedBytes);
  });

  it('preserves malformed bytes through later mutations until the owner explicitly resets', async () => {
    const malformedBytes = '{"state":{"trips":';
    const store = createTripStore();
    window.localStorage.setItem(canonicalKey, malformedBytes);

    await store.persist.rehydrate();
    store.getState().acceptDraft(daliDraft);

    expect(window.localStorage.getItem(canonicalKey)).toBe(malformedBytes);

    store.getState().resetTripStore();

    expect(store.getState()).toMatchObject({ trips: {}, partnerIntents: {}, guardianPlans: {} });
    const resetEnvelope = JSON.parse(window.localStorage.getItem(canonicalKey) ?? '{}');
    expect(resetEnvelope).toMatchObject({
      state: { trips: {}, partnerIntents: {}, guardianPlans: {} },
      version: 2,
    });
  });

  it('rejects duplicate source slugs in an exact v2 envelope and preserves its raw bytes', async () => {
    const first = acceptedTrip();
    const duplicateId = 'draft-dali-duplicate';
    const duplicate = { ...structuredClone(first), id: duplicateId };
    const raw = JSON.stringify({
      state: {
        trips: { [first.id]: first, [duplicate.id]: duplicate },
        partnerIntents: { [duplicate.id]: true },
        guardianPlans: { [first.id]: { id: 'PLAN-A', title: '室内备选' } },
      },
      version: 2,
    });
    window.localStorage.setItem(canonicalKey, raw);
    let hydrationError = false;
    const store = createTripStore({ onHydrationError: () => { hydrationError = true; } });

    await store.persist.rehydrate();

    expect(hydrationError).toBe(true);
    expect(store.getState().trips).toEqual({});
    expect(store.getState().partnerIntents).toEqual({});
    expect(store.getState().guardianPlans).toEqual({});
    expect(window.localStorage.getItem(canonicalKey)).toBe(raw);
  });

  it.each([0, 1])('rejects duplicate source slugs during version-%i migration', async (version) => {
    const first = withoutV2Fields(acceptedTrip());
    const duplicateId = 'draft-dali-duplicate';
    const duplicate = { ...structuredClone(first), id: duplicateId };
    const raw = JSON.stringify({
      state: {
        trips: { [daliDraft.id]: first, [duplicateId]: duplicate },
        partnerIntents: { [duplicateId]: true },
        guardianPlans: {},
      },
      version,
    });
    window.localStorage.setItem(canonicalKey, raw);
    let hydrationError = false;
    const store = createTripStore({ onHydrationError: () => { hydrationError = true; } });

    await store.persist.rehydrate();

    expect(hydrationError).toBe(true);
    expect(store.getState().trips).toEqual({});
    expect(store.getState().partnerIntents).toEqual({});
    expect(window.localStorage.getItem(canonicalKey)).toBe(raw);
  });

  it('reports missing source slugs independently instead of treating absence as a duplicate', async () => {
    const first = acceptedTrip() as unknown as Record<string, unknown>;
    const second = { ...acceptedTrip(), id: 'draft-without-source-two' } as unknown as Record<string, unknown>;
    delete first.sourcePostSlug;
    delete second.sourcePostSlug;
    const raw = JSON.stringify({
      state: {
        trips: { [String(first.id)]: first, [String(second.id)]: second },
        partnerIntents: {},
        guardianPlans: {},
      },
      version: 2,
    });
    window.localStorage.setItem(canonicalKey, raw);
    let hydrationFailure: unknown;
    const store = createTripStore({ onHydrationError: (error) => { hydrationFailure = error; } });

    await store.persist.rehydrate();

    const issues = hydrationIssues(hydrationFailure);
    expect(issues.filter((issue) => issue.path.at(-1) === 'sourcePostSlug')).toHaveLength(2);
    expect(issues.map((issue) => issue.message)).not.toContain('duplicate source post slug');
    expect(window.localStorage.getItem(canonicalKey)).toBe(raw);
  });

  it('does not duplicate a legacy draft already represented by source slug', async () => {
    const canonical = createTripStore();
    canonical.getState().acceptDraft(daliDraft);
    const canonicalTrip = structuredClone(canonical.getState().trips[daliDraft.id]);
    window.localStorage.setItem(canonicalKey, JSON.stringify({
      state: { trips: { [daliDraft.id]: canonicalTrip }, partnerIntents: {}, guardianPlans: {} },
      version: 2,
    }));
    const changedDraft = { ...daliDraft, budget: 9999 };
    const legacyBytes = JSON.stringify({
      state: { drafts: { [daliDraft.sourcePostSlug]: changedDraft } },
      version: 0,
    });
    window.localStorage.setItem(legacyDraftKey, legacyBytes);
    const store = createTripStore();

    await store.persist.rehydrate();
    await store.persist.rehydrate();

    expect(Object.keys(store.getState().trips)).toEqual([daliDraft.id]);
    expect(store.getState().trips[daliDraft.id].budget).toBe(daliDraft.budget);
    const persisted = JSON.parse(window.localStorage.getItem(canonicalKey) ?? '{}');
    expect(Object.keys(persisted.state.trips)).toEqual([daliDraft.id]);
    expect(window.localStorage.getItem(legacyDraftKey)).toBe(legacyBytes);
  });

  it('persists a newly discovered legacy draft into an existing v2 canonical state once', async () => {
    const canonical = createTripStore();
    canonical.getState().acceptDraft(daliDraft);
    const canonicalTrip = structuredClone(canonical.getState().trips[daliDraft.id]);
    window.localStorage.setItem(canonicalKey, JSON.stringify({
      state: { trips: { [daliDraft.id]: canonicalTrip }, partnerIntents: {}, guardianPlans: {} },
      version: 2,
    }));
    const legacyBytes = JSON.stringify({
      state: { drafts: { [sichuanDraft.sourcePostSlug]: sichuanDraft } },
      version: 0,
    });
    window.localStorage.setItem(legacyDraftKey, legacyBytes);
    const store = createTripStore();

    await store.persist.rehydrate();
    await store.persist.rehydrate();

    const persisted = JSON.parse(window.localStorage.getItem(canonicalKey) ?? '{}');
    expect(Object.keys(persisted.state.trips)).toEqual([daliDraft.id, sichuanDraft.id]);
    expect(Object.keys(store.getState().trips)).toEqual([daliDraft.id, sichuanDraft.id]);
    expect(window.localStorage.getItem(legacyDraftKey)).toBe(legacyBytes);
  });

  it('rejects a v1 map whose key is not the canonical trip id', async () => {
    const source = createTripStore();
    source.getState().acceptDraft(daliDraft);
    const v1Trip = withoutV2Fields(structuredClone(source.getState().trips[daliDraft.id]));
    const raw = JSON.stringify({
      state: { trips: { [daliDraft.id]: v1Trip }, partnerIntents: {} },
      version: 1,
    }).replace(daliDraft.id, 'wrong-map-key');
    window.localStorage.setItem(canonicalKey, raw);
    let hydrationError = false;
    const store = createTripStore({ onHydrationError: () => { hydrationError = true; } });

    await store.persist.rehydrate();

    expect(hydrationError).toBe(true);
    expect(store.getState().trips).toEqual({});
    expect(window.localStorage.getItem(canonicalKey)).toBe(raw);
  });
});

function acceptedTrip() {
  const store = createTripStore();
  store.getState().acceptDraft(daliDraft);
  return structuredClone(store.getState().trips[daliDraft.id]);
}

function withoutV2Fields(trip: ReturnType<typeof acceptedTrip>) {
  return Object.fromEntries(Object.entries(trip).filter(
    ([key]) => key !== 'createdAt' && key !== 'updatedAt' && key !== 'coverImage',
  ));
}

function hydrationIssues(error: unknown): Array<{ message: string; path: PropertyKey[] }> {
  const cause = (error as { cause?: { issues?: Array<{ message: string; path: PropertyKey[] }> } })?.cause;
  return cause?.issues ?? [];
}
