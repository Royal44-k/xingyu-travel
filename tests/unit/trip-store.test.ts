import { beforeEach, describe, expect, it } from 'vitest';
import { extractTripDraft } from '@/domain/trips/extract-draft';
import { postsBySlug } from '@/data/posts';
import {
  createTripStore,
  getBudgetSummary,
  transitionTrip,
} from '@/stores/trip-store';

const daliDraft = extractTripDraft(postsBySlug['dali-slow-5d']);

beforeEach(() => window.localStorage.clear());

describe('trip state machine', () => {
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
});

describe('draft merge and persistence', () => {
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
    const raw = window.localStorage.getItem('xingyu-demo-v1');
    expect(raw).not.toBeNull();
    expect(raw).not.toMatch(/latitude|longitude|phone|email|coordinates/i);
    expect(JSON.parse(raw ?? '{}').state).toMatchObject({
      trips: { [daliDraft.id]: { sourcePostSlug: 'dali-slow-5d' } },
      partnerIntents: { [daliDraft.id]: true },
    });
  });
});
