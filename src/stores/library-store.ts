'use client';

import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';
import { z } from 'zod';
import { offerIdentity } from '@/domain/comparison/offer-identity';
import { comparisonSearchSchema } from '@/domain/comparison/search-schema';
import { comparisonProductKinds, type ComparisonProductKind, type NormalizedOffer } from '@/domain/comparison/types';
import type { ComparisonSearchInput } from '@/domain/shared/api';

const libraryStorageKey = 'xingyu-library-demo-v1';
const libraryStorageVersion = 1;
const maxLikedPostSlugs = 500;
const maxFavoriteOffers = 200;
const validityWindowMilliseconds = 15 * 60 * 1000;

export interface FavoriteOfferSnapshot {
  key: string;
  provider: string;
  productKind: ComparisonProductKind;
  destination: string;
  totalPrice: number;
  currency: 'CNY';
  policySummary: string;
  observedAt: string;
  expiresAt: string;
  search?: ComparisonSearchInput;
  deepLink?: string;
}

export interface PriceAlert {
  offerKey: string;
  enabled: boolean;
  createdAt: string;
}

export interface LibraryStoreState {
  likedPostSlugs: string[];
  favoriteOffers: Record<string, FavoriteOfferSnapshot>;
  priceAlerts: Record<string, PriceAlert>;
  togglePostLike: (slug: string) => void;
  saveOffer: (offer: NormalizedOffer, search?: ComparisonSearchInput) => void;
  removeOffer: (offerKey: string) => void;
  setPriceAlert: (offerKey: string, enabled: boolean) => void;
  resetLibrary: () => void;
}

interface LibraryStoreHydrationState {
  hydrated: boolean;
  hydrationError: boolean;
}

interface CreateLibraryStoreOptions {
  onHydrationError?: (error: unknown) => void;
}

const initialLibraryState = {
  likedPostSlugs: [],
  favoriteOffers: {},
  priceAlerts: {},
} satisfies Pick<LibraryStoreState, 'likedPostSlugs' | 'favoriteOffers' | 'priceAlerts'>;

const nonEmptyText = z.string().trim().min(1).max(500);
const isoTimestamp = z.string().datetime({ offset: true }).superRefine((value, context) => {
  if (Number.isNaN(Date.parse(value))) context.addIssue({ code: 'custom', message: 'invalid timestamp' });
});
const policySummaries = ['可退款｜含行李', '可退款｜不含行李', '不可退款｜含行李', '不可退款｜不含行李'] as const;

const favoriteOfferSnapshotSchema = z.object({
  key: nonEmptyText,
  provider: nonEmptyText,
  productKind: z.enum(comparisonProductKinds),
  destination: nonEmptyText,
  totalPrice: z.number().finite().nonnegative(),
  currency: z.literal('CNY'),
  policySummary: z.enum(policySummaries),
  observedAt: isoTimestamp,
  expiresAt: isoTimestamp,
  search: comparisonSearchSchema.optional(),
  deepLink: z.string().url().optional(),
}).strict().superRefine((snapshot, context) => {
  const identity = parseOfferIdentity(snapshot.key);
  if (!identity || identity.provider !== snapshot.provider || snapshot.key !== offerIdentity(identity)) {
    context.addIssue({ code: 'custom', path: ['key'], message: 'invalid offer identity' });
  }
  if (Date.parse(snapshot.expiresAt) !== Date.parse(snapshot.observedAt) + validityWindowMilliseconds) {
    context.addIssue({ code: 'custom', path: ['expiresAt'], message: 'invalid offer validity window' });
  }
  if (snapshot.search &&
    (snapshot.search.kind !== snapshot.productKind || snapshot.search.destination !== snapshot.destination)) {
    context.addIssue({ code: 'custom', path: ['search'], message: 'search context does not match offer' });
  }
});

const priceAlertSchema = z.object({
  offerKey: nonEmptyText,
  enabled: z.literal(true),
  createdAt: isoTimestamp,
}).strict();

const persistedLibraryStateSchema = z.object({
  likedPostSlugs: z.array(nonEmptyText).max(maxLikedPostSlugs),
  favoriteOffers: z.record(z.string(), favoriteOfferSnapshotSchema),
  priceAlerts: z.record(z.string(), priceAlertSchema),
}).strict().superRefine((state, context) => {
  if (new Set(state.likedPostSlugs).size !== state.likedPostSlugs.length) {
    context.addIssue({ code: 'custom', path: ['likedPostSlugs'], message: 'duplicate post slug' });
  }
  if (Object.keys(state.favoriteOffers).length > maxFavoriteOffers) {
    context.addIssue({ code: 'custom', path: ['favoriteOffers'], message: 'too many favorite offers' });
  }
  for (const [offerKey, snapshot] of Object.entries(state.favoriteOffers)) {
    if (snapshot.key !== offerKey) {
      context.addIssue({ code: 'custom', path: ['favoriteOffers', offerKey], message: 'snapshot key mismatch' });
    }
  }
  for (const [offerKey, alert] of Object.entries(state.priceAlerts)) {
    if (!state.favoriteOffers[offerKey] || alert.offerKey !== offerKey) {
      context.addIssue({ code: 'custom', path: ['priceAlerts', offerKey], message: 'orphaned alert' });
    }
  }
});

const persistedLibraryEnvelopeSchema = z.object({
  state: persistedLibraryStateSchema,
  version: z.literal(libraryStorageVersion),
}).strict();

type PersistedLibraryState = Pick<
  LibraryStoreState,
  'likedPostSlugs' | 'favoriteOffers' | 'priceAlerts'
>;

function parseOfferIdentity(key: string): { provider: string; id: string } | undefined {
  try {
    const parsed: unknown = JSON.parse(key);
    if (!Array.isArray(parsed) || parsed.length !== 2 ||
      typeof parsed[0] !== 'string' || typeof parsed[1] !== 'string' ||
      !parsed[0].trim() || !parsed[1].trim()) return undefined;
    return { provider: parsed[0], id: parsed[1] };
  } catch {
    return undefined;
  }
}

function parsePersistedLibraryState(state: unknown): PersistedLibraryState {
  const parsed = persistedLibraryStateSchema.safeParse(state);
  if (parsed.success) return parsed.data;
  throw new Error('LIBRARY_INVALID_PERSISTED_STATE');
}

function parsePersistedLibraryEnvelope(value: unknown): { state: PersistedLibraryState; version: number } {
  const parsed = persistedLibraryEnvelopeSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Error('LIBRARY_INVALID_PERSISTED_ENVELOPE');
}

function canonicalText(raw: unknown, errorCode: 'LIBRARY_INVALID_OFFER' | 'LIBRARY_INVALID_POST_SLUG'): string {
  const parsed = nonEmptyText.safeParse(raw);
  if (parsed.success) return parsed.data;
  throw new Error(errorCode);
}

function snapshotFromOffer(
  offer: NormalizedOffer,
  search?: ComparisonSearchInput,
): FavoriteOfferSnapshot {
  const provider = canonicalText(offer.provider, 'LIBRARY_INVALID_OFFER');
  const id = canonicalText(offer.id, 'LIBRARY_INVALID_OFFER');
  const destination = canonicalText(offer.destination, 'LIBRARY_INVALID_OFFER');
  const offerKey = offerIdentity({ provider, id });
  const observedAt = offer.updatedAt;
  const observedAtMilliseconds = Date.parse(observedAt);
  if (!comparisonProductKinds.includes(offer.kind as ComparisonProductKind) ||
    !Number.isFinite(offer.totalPrice) || offer.totalPrice < 0 || Number.isNaN(observedAtMilliseconds) ||
    !isoTimestamp.safeParse(observedAt).success) {
    throw new Error('LIBRARY_INVALID_OFFER');
  }
  const parsedSearch = comparisonSearchSchema.safeParse({
    ...search,
    kind: search?.kind ?? offer.kind,
    destination: search?.destination ?? destination,
  });
  if (!parsedSearch.success ||
    parsedSearch.data.kind !== offer.kind || parsedSearch.data.destination !== destination) {
    throw new Error('LIBRARY_INVALID_OFFER');
  }
  const snapshot: FavoriteOfferSnapshot = {
    key: offerKey,
    provider,
    productKind: offer.kind as ComparisonProductKind,
    destination,
    totalPrice: offer.totalPrice,
    currency: 'CNY',
    policySummary: `${offer.refundable ? '可退款' : '不可退款'}｜${offer.baggageIncluded ? '含行李' : '不含行李'}`,
    observedAt,
    expiresAt: new Date(observedAtMilliseconds + validityWindowMilliseconds).toISOString(),
    search: parsedSearch.data,
  };
  if (!favoriteOfferSnapshotSchema.safeParse(snapshot).success) throw new Error('LIBRARY_INVALID_OFFER');
  return snapshot;
}

function omitRecordEntry<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([candidateKey]) => candidateKey !== key));
}

function stateCreator(
  set: (recipe: (state: LibraryStoreState) => Partial<LibraryStoreState>) => void,
  registerHydrationFailure?: (handler: () => void) => void,
  allowPersistence?: () => void,
): LibraryStoreState {
  registerHydrationFailure?.(() => set(() => ({ ...initialLibraryState })));
  return {
    ...initialLibraryState,
    togglePostLike: (rawSlug) => set((state) => {
      const slug = canonicalText(rawSlug, 'LIBRARY_INVALID_POST_SLUG');
      if (state.likedPostSlugs.includes(slug)) {
        return { likedPostSlugs: state.likedPostSlugs.filter((existingSlug) => existingSlug !== slug) };
      }
      if (state.likedPostSlugs.length >= maxLikedPostSlugs) throw new Error('LIBRARY_LIKED_POST_LIMIT');
      return { likedPostSlugs: [...state.likedPostSlugs, slug] };
    }),
    saveOffer: (offer, search) => set((state) => {
      const snapshot = snapshotFromOffer(offer, search);
      if (!state.favoriteOffers[snapshot.key] && Object.keys(state.favoriteOffers).length >= maxFavoriteOffers) {
        throw new Error('LIBRARY_FAVORITE_OFFER_LIMIT');
      }
      return { favoriteOffers: { ...state.favoriteOffers, [snapshot.key]: snapshot } };
    }),
    removeOffer: (offerKey) => set((state) => {
      return {
        favoriteOffers: omitRecordEntry(state.favoriteOffers, offerKey),
        priceAlerts: omitRecordEntry(state.priceAlerts, offerKey),
      };
    }),
    setPriceAlert: (offerKey, enabled) => set((state) => {
      if (!enabled) {
        return { priceAlerts: omitRecordEntry(state.priceAlerts, offerKey) };
      }
      if (!state.favoriteOffers[offerKey]) throw new Error('LIBRARY_OFFER_NOT_SAVED');
      return {
        priceAlerts: {
          ...state.priceAlerts,
          [offerKey]: { offerKey, enabled: true, createdAt: new Date().toISOString() },
        },
      };
    }),
    resetLibrary: () => {
      allowPersistence?.();
      set(() => ({ ...initialLibraryState }));
    },
  };
}

function persistenceOptions(options: CreateLibraryStoreOptions = {}) {
  return {
    name: libraryStorageKey,
    version: libraryStorageVersion,
    skipHydration: true,
    partialize: (state: LibraryStoreState): PersistedLibraryState => ({
      likedPostSlugs: state.likedPostSlugs,
      favoriteOffers: state.favoriteOffers,
      priceAlerts: state.priceAlerts,
    }),
    merge: (persistedState: unknown, currentState: LibraryStoreState): LibraryStoreState => {
      if (persistedState === undefined) return currentState;
      return { ...currentState, ...parsePersistedLibraryState(persistedState) };
    },
    migrate: (_persistedState: unknown, version: number): PersistedLibraryState => {
      throw new Error(`LIBRARY_UNSUPPORTED_PERSISTED_VERSION:${version}`);
    },
    onRehydrateStorage: () => (_state: LibraryStoreState | undefined, error: unknown) => {
      if (error) options.onHydrationError?.(error);
    },
  };
}

function createPersistedLibraryState(options: CreateLibraryStoreOptions = {}) {
  let preserveMalformedBytes = false;
  let failClosed = () => {};
  const libraryStorage = createJSONStorage<PersistedLibraryState>(() => localStorage) ?? {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  const preserveMalformedBytesForRecovery = () => { preserveMalformedBytes = true; };
  const allowPersistence = () => { preserveMalformedBytes = false; };
  const safeOptions = {
    ...options,
    onHydrationError: (error: unknown) => {
      preserveMalformedBytesForRecovery();
      options.onHydrationError?.(error);
      failClosed();
    },
  };

  return persist<LibraryStoreState, [], [], PersistedLibraryState>(
    (set) => stateCreator(set, (handler) => { failClosed = handler; }, allowPersistence),
    {
      ...persistenceOptions(safeOptions),
      storage: {
        getItem: (name) => {
          const value = libraryStorage.getItem(name);
          if (value === null) return null;
          return parsePersistedLibraryEnvelope(value);
        },
        setItem: (name, value) => (preserveMalformedBytes ? undefined : libraryStorage.setItem(name, value)),
        removeItem: (name) => (preserveMalformedBytes ? undefined : libraryStorage.removeItem(name)),
      },
    },
  );
}

export function createLibraryStore(options: CreateLibraryStoreOptions = {}) {
  return createStore<LibraryStoreState>()(createPersistedLibraryState(options));
}

export const useLibraryStoreHydration = create<LibraryStoreHydrationState>(() => ({
  hydrated: false,
  hydrationError: false,
}));

export const useLibraryStore = create<LibraryStoreState>()(
  createPersistedLibraryState({
    onHydrationError: () => useLibraryStoreHydration.setState({ hydrationError: true }),
  }),
);

export async function hydrateLibraryStore() {
  if (typeof window === 'undefined' || useLibraryStoreHydration.getState().hydrated) return;
  try {
    useLibraryStoreHydration.setState({ hydrated: false, hydrationError: false });
    await useLibraryStore.persist.rehydrate();
  } catch {
    useLibraryStoreHydration.setState({ hydrationError: true });
  } finally {
    useLibraryStoreHydration.setState({ hydrated: true });
  }
}
