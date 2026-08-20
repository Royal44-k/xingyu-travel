import { beforeEach, describe, expect, it } from 'vitest';
import { offerIdentity } from '@/domain/comparison/offer-identity';
import type { NormalizedOffer } from '@/domain/comparison/types';
import {
  createLibraryStore,
  hydrateLibraryStore,
  useLibraryStore,
  useLibraryStoreHydration,
} from '@/stores/library-store';

const storageKey = 'xingyu-library-demo-v1';

beforeEach(() => window.localStorage.clear());

describe('liked guides', () => {
  it('toggles a guide slug without duplicating it', () => {
    const store = createLibraryStore();

    store.getState().togglePostLike('sanya-coast-rainforest');
    store.getState().togglePostLike('sanya-coast-rainforest');

    expect(store.getState().likedPostSlugs).toEqual([]);
  });

  it('enforces the 500 liked-guide limit', () => {
    const store = createLibraryStore();

    for (let index = 0; index < 500; index += 1) store.getState().togglePostLike(`guide-${index}`);

    expect(() => store.getState().togglePostLike('guide-over-limit')).toThrow('LIBRARY_LIKED_POST_LIMIT');
    expect(store.getState().likedPostSlugs).toHaveLength(500);
  });

  it.each(['   ', 'x'.repeat(501)])('rejects a slug that the persisted schema would reject: %s', (slug) => {
    const store = createLibraryStore();

    expect(() => store.getState().togglePostLike(slug)).toThrow('LIBRARY_INVALID_POST_SLUG');
    expect(store.getState().likedPostSlugs).toEqual([]);
  });
});

describe('favorite offer snapshots', () => {
  it('uses offerIdentity so delimiter-containing provider and id pairs remain distinct', () => {
    const store = createLibraryStore();
    const first = makeOffer({ provider: 'a:b', id: 'same:id' });
    const second = makeOffer({ provider: 'a', id: 'b:same:id' });

    store.getState().saveOffer(first);
    store.getState().saveOffer(second);

    expect(Object.keys(store.getState().favoriteOffers).sort()).toEqual([
      '["a","b:same:id"]',
      '["a:b","same:id"]',
    ]);
  });

  it('derives the durable snapshot, search context, and fifteen-minute validity window from a normalized offer', () => {
    const store = createLibraryStore();
    const offer = makeOffer({
      destination: '  大理  ',
      refundable: true,
      baggageIncluded: false,
      updatedAt: '2026-08-19T10:00:00.000Z',
    });

    store.getState().saveOffer(offer, {
      kind: 'flight',
      destination: '大理',
      origin: '上海',
      from: '2026-09-18',
      to: '2026-09-22',
      travelers: 3,
    });

    expect(store.getState().favoriteOffers[offerIdentity(offer)]).toEqual({
      key: '["mock-provider","offer-1"]',
      provider: 'mock-provider',
      productKind: 'flight',
      destination: '大理',
      totalPrice: 1280,
      currency: 'CNY',
      policySummary: '可退款｜不含行李',
      observedAt: '2026-08-19T10:00:00.000Z',
      expiresAt: '2026-08-19T10:15:00.000Z',
      search: {
        kind: 'flight',
        destination: '大理',
        origin: '上海',
        from: '2026-09-18',
        to: '2026-09-22',
        travelers: 3,
      },
    });
  });

  it.each<[string, Partial<NormalizedOffer>]>([
    ['an empty destination', { destination: '   ' }],
    ['a non-comparison product kind', { kind: 'train' }],
    ['a negative total price', { totalPrice: -1 }],
    ['an invalid timestamp', { updatedAt: 'not-a-date' }],
  ])('rejects %s instead of saving an invalid snapshot', (_label, patch) => {
    const store = createLibraryStore();

    expect(() => store.getState().saveOffer(makeOffer(patch))).toThrow('LIBRARY_INVALID_OFFER');
    expect(store.getState().favoriteOffers).toEqual({});
  });

  it.each<[string, Partial<NormalizedOffer>]>([
    ['a whitespace-only provider', { provider: '   ' }],
    ['an oversized provider', { provider: 'p'.repeat(501) }],
    ['a whitespace-only destination', { destination: '   ' }],
    ['an oversized destination', { destination: 'd'.repeat(501) }],
    ['an identity key longer than the persisted key limit', { provider: 'p'.repeat(300), id: 'i'.repeat(300) }],
  ])('rejects %s before it can create an unrehydratable snapshot', (_label, patch) => {
    const store = createLibraryStore();

    expect(() => store.getState().saveOffer(makeOffer(patch))).toThrow('LIBRARY_INVALID_OFFER');
    expect(store.getState().favoriteOffers).toEqual({});
  });

  it('canonicalizes surrounding provider and id whitespace before persisting the offer identity', async () => {
    const source = createLibraryStore();
    const offer = makeOffer({ provider: '  canonical-provider  ', id: '  canonical-id  ', destination: '  大理  ' });
    await source.persist.rehydrate();

    source.getState().saveOffer(offer);

    const key = offerIdentity({ provider: 'canonical-provider', id: 'canonical-id' });
    expect(source.getState().favoriteOffers[key]).toMatchObject({ provider: 'canonical-provider', destination: '大理' });
    const rehydrated = createLibraryStore();
    await rehydrated.persist.rehydrate();
    expect(rehydrated.getState().favoriteOffers[key]).toMatchObject({ provider: 'canonical-provider', destination: '大理' });
  });

  it('enforces the 200 saved-offer limit without blocking replacement of an existing offer', () => {
    const store = createLibraryStore();

    for (let index = 0; index < 200; index += 1) {
      store.getState().saveOffer(makeOffer({ provider: `provider-${index}`, id: `offer-${index}` }));
    }
    store.getState().saveOffer(makeOffer({ provider: 'provider-0', id: 'offer-0', totalPrice: 777 }));

    expect(store.getState().favoriteOffers['["provider-0","offer-0"]'].totalPrice).toBe(777);
    expect(() => store.getState().saveOffer(makeOffer({ provider: 'provider-over-limit', id: 'offer-over-limit' })))
      .toThrow('LIBRARY_FAVORITE_OFFER_LIMIT');
    expect(Object.keys(store.getState().favoriteOffers)).toHaveLength(200);
  });
});

describe('local price alerts', () => {
  it('requires a saved offer before enabling an alert', () => {
    const store = createLibraryStore();

    expect(() => store.getState().setPriceAlert('["missing","offer"]', true)).toThrow('LIBRARY_OFFER_NOT_SAVED');
    expect(store.getState().priceAlerts).toEqual({});
  });

  it('removing a favorite offer also disables its local alert', () => {
    const store = createLibraryStore();
    const offer = makeOffer();
    store.getState().saveOffer(offer);
    store.getState().setPriceAlert(offerIdentity(offer), true);

    store.getState().removeOffer(offerIdentity(offer));

    expect(store.getState().priceAlerts).toEqual({});
  });
});

describe('persistence and recovery', () => {
  it('persists a liked post, normalized offer snapshot, and alert for a fresh store to rehydrate', async () => {
    const source = createLibraryStore();
    const offer = makeOffer({ id: 'same:id', provider: 'a:b' });
    await source.persist.rehydrate();
    source.getState().togglePostLike('sanya-coast-rainforest');
    source.getState().saveOffer(offer, {
      kind: 'flight',
      destination: '大理',
      origin: '上海',
      from: '2026-09-18',
      to: '2026-09-22',
      travelers: 3,
    });
    source.getState().setPriceAlert(offerIdentity(offer), true);

    const rehydrated = createLibraryStore();
    await rehydrated.persist.rehydrate();

    expect(rehydrated.getState().likedPostSlugs).toEqual(['sanya-coast-rainforest']);
    expect(rehydrated.getState().favoriteOffers[offerIdentity(offer)]).toMatchObject({
      key: '["a:b","same:id"]',
      expiresAt: '2026-08-19T10:15:00.000Z',
      search: {
        kind: 'flight',
        destination: '大理',
        origin: '上海',
        from: '2026-09-18',
        to: '2026-09-22',
        travelers: 3,
      },
    });
    expect(rehydrated.getState().priceAlerts[offerIdentity(offer)]).toMatchObject({
      offerKey: '["a:b","same:id"]',
      enabled: true,
    });
  });

  it('continues to hydrate a valid v1 offer snapshot saved before search context existed', async () => {
    const legacySnapshot = {
      key: '["mock-provider","offer-1"]',
      provider: 'mock-provider',
      productKind: 'flight',
      destination: '大理',
      totalPrice: 1280,
      currency: 'CNY',
      policySummary: '可退款｜含行李',
      observedAt: '2026-08-19T10:00:00.000Z',
      expiresAt: '2026-08-19T10:15:00.000Z',
    };
    window.localStorage.setItem(storageKey, JSON.stringify({
      state: {
        likedPostSlugs: [],
        favoriteOffers: { [legacySnapshot.key]: legacySnapshot },
        priceAlerts: {},
      },
      version: 1,
    }));
    let hydrationError = false;
    const store = createLibraryStore({ onHydrationError: () => { hydrationError = true; } });

    await store.persist.rehydrate();

    expect(hydrationError).toBe(false);
    expect(store.getState().favoriteOffers[legacySnapshot.key]).toEqual(legacySnapshot);
  });

  it('fails closed and preserves malformed bytes until an explicit reset', async () => {
    const malformedBytes = JSON.stringify({
      state: { likedPostSlugs: [], favoriteOffers: {}, priceAlerts: {}, unexpected: true },
      version: 1,
    });
    window.localStorage.setItem(storageKey, malformedBytes);
    let hydrationError = false;
    const store = createLibraryStore({ onHydrationError: () => { hydrationError = true; } });

    await store.persist.rehydrate();
    store.getState().togglePostLike('dali-slow-5d');

    expect(hydrationError).toBe(true);
    expect(store.getState().likedPostSlugs).toEqual(['dali-slow-5d']);
    expect(window.localStorage.getItem(storageKey)).toBe(malformedBytes);

    store.getState().resetLibrary();

    expect(store.getState().likedPostSlugs).toEqual([]);
    expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')).toMatchObject({
      state: { likedPostSlugs: [], favoriteOffers: {}, priceAlerts: {} },
      version: 1,
    });
  });

  it('clears pre-existing in-memory library data when a later rehydrate is malformed', async () => {
    const store = createLibraryStore();
    store.getState().togglePostLike('dali-slow-5d');
    const malformedBytes = JSON.stringify({
      state: { likedPostSlugs: [], favoriteOffers: {}, priceAlerts: {}, unexpected: true },
      version: 1,
    });
    window.localStorage.setItem(storageKey, malformedBytes);

    await store.persist.rehydrate();

    expect(store.getState().likedPostSlugs).toEqual([]);
    expect(window.localStorage.getItem(storageKey)).toBe(malformedBytes);
  });

  it.each([
    ['an envelope without state', { version: 1 }],
    ['an envelope with an unknown key', { state: emptyPersistedState(), version: 1, unexpected: true }],
    ['an envelope without a version', { state: emptyPersistedState() }],
    ['an envelope with a non-numeric version', { state: emptyPersistedState(), version: '1' }],
  ])('fails closed and preserves bytes for %s', async (_label, envelope) => {
    let hydrationError = false;
    const errorAwareStore = createLibraryStore({ onHydrationError: () => { hydrationError = true; } });
    errorAwareStore.getState().togglePostLike('in-memory-guide');
    const malformedBytes = JSON.stringify(envelope);
    window.localStorage.setItem(storageKey, malformedBytes);

    await errorAwareStore.persist.rehydrate();
    errorAwareStore.getState().togglePostLike('after-failure');

    expect(hydrationError).toBe(true);
    expect(errorAwareStore.getState().likedPostSlugs).toEqual(['after-failure']);
    expect(window.localStorage.getItem(storageKey)).toBe(malformedBytes);
  });

  it('sets global hydrationError when the persisted envelope is malformed', async () => {
    const malformedBytes = JSON.stringify({ version: 1 });
    useLibraryStore.setState({ likedPostSlugs: ['in-memory-guide'], favoriteOffers: {}, priceAlerts: {} });
    useLibraryStoreHydration.setState({ hydrated: false, hydrationError: false });
    window.localStorage.setItem(storageKey, malformedBytes);

    await hydrateLibraryStore();

    expect(useLibraryStore.getState().likedPostSlugs).toEqual([]);
    expect(useLibraryStoreHydration.getState()).toEqual({ hydrated: true, hydrationError: true });
    expect(window.localStorage.getItem(storageKey)).toBe(malformedBytes);
  });

  it('rejects persisted snapshots with unknown nested keys', async () => {
    const snapshot = {
      key: '["mock-provider","offer-1"]',
      provider: 'mock-provider',
      productKind: 'flight',
      destination: '大理',
      totalPrice: 1280,
      currency: 'CNY',
      policySummary: '可退款｜含行李',
      observedAt: '2026-08-19T10:00:00.000Z',
      expiresAt: '2026-08-19T10:15:00.000Z',
      injected: true,
    };
    const malformedBytes = JSON.stringify({
      state: { likedPostSlugs: [], favoriteOffers: { [snapshot.key]: snapshot }, priceAlerts: {} },
      version: 1,
    });
    window.localStorage.setItem(storageKey, malformedBytes);
    const store = createLibraryStore();

    await store.persist.rehydrate();

    expect(store.getState()).toMatchObject({ likedPostSlugs: [], favoriteOffers: {}, priceAlerts: {} });
    expect(window.localStorage.getItem(storageKey)).toBe(malformedBytes);
  });

  it('fails closed and preserves bytes when persisted search context is invalid', async () => {
    const snapshot = {
      key: '["mock-provider","offer-1"]',
      provider: 'mock-provider',
      productKind: 'flight',
      destination: '大理',
      totalPrice: 1280,
      currency: 'CNY',
      policySummary: '可退款｜含行李',
      observedAt: '2026-08-19T10:00:00.000Z',
      expiresAt: '2026-08-19T10:15:00.000Z',
      search: {
        kind: 'flight',
        destination: '大理',
        from: '2026-02-30',
        to: '2026-09-22',
        travelers: 3,
      },
    };
    const malformedBytes = JSON.stringify({
      state: { likedPostSlugs: [], favoriteOffers: { [snapshot.key]: snapshot }, priceAlerts: {} },
      version: 1,
    });
    window.localStorage.setItem(storageKey, malformedBytes);
    const store = createLibraryStore();

    await store.persist.rehydrate();

    expect(store.getState()).toMatchObject({ likedPostSlugs: [], favoriteOffers: {}, priceAlerts: {} });
    expect(window.localStorage.getItem(storageKey)).toBe(malformedBytes);
  });
});

function emptyPersistedState() {
  return { likedPostSlugs: [], favoriteOffers: {}, priceAlerts: {} };
}

function makeOffer(patch: Partial<NormalizedOffer> = {}): NormalizedOffer {
  return {
    id: 'offer-1',
    provider: 'mock-provider',
    kind: 'flight',
    title: '大理往返机票',
    origin: '上海',
    destination: '大理',
    basePrice: 1000,
    taxes: 180,
    mandatoryFees: 100,
    baggageIncluded: true,
    refundable: true,
    providerVerified: true,
    includedBenefits: ['随身行李'],
    updatedAt: '2026-08-19T10:00:00.000Z',
    demoMode: true,
    currency: 'CNY',
    totalPrice: 1280,
    priceExplanation: '含税费与必缴费用',
    ...patch,
  } as NormalizedOffer;
}
