'use client';

import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';
import { z } from 'zod';
import type { TripDraft } from '@/domain/trips/extract-draft';
import { legacyTripDraftStorageKey, readLegacyTripDrafts } from '@/domain/trips/trip-store';

export type WorkbenchTripStatus = 'review' | 'active' | 'guarded' | 'discarded' | 'archived';
export type ReorderDirection = 'up' | 'down';

export interface WorkbenchItineraryItem {
  id: string;
  day: number;
  title: string;
  description: string;
  location: string;
  estimatedCost: number;
  isAlternative: boolean;
}

export interface DecisionCandidate {
  id: string;
  title: string;
  description: string;
}

export interface GuardianPlanSelection {
  id: string;
  title: string;
}

export interface WorkbenchTrip {
  id: string;
  sourcePostSlug: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: number;
  budget: number;
  status: WorkbenchTripStatus;
  guardianEnabled: boolean;
  items: WorkbenchItineraryItem[];
  candidates: DecisionCandidate[];
  votes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
}

type TripSettingsPatch = Partial<Pick<WorkbenchTrip, 'startDate' | 'endDate' | 'budget'>>;
type TripItemPatch = Partial<Pick<WorkbenchItineraryItem, 'title' | 'location' | 'estimatedCost'>>;

export interface TripStoreState {
  trips: Record<string, WorkbenchTrip>;
  partnerIntents: Record<string, boolean>;
  guardianPlans: Record<string, GuardianPlanSelection>;
  acceptDraft: (draft: TripDraft) => void;
  savePostAsTrip: (draft: TripDraft, coverImage?: string) => WorkbenchTrip;
  updateTrip: (tripId: string, patch: TripSettingsPatch) => void;
  updateItem: (tripId: string, itemId: string, patch: TripItemPatch) => void;
  reorderItem: (tripId: string, itemId: string, direction: ReorderDirection) => void;
  toggleAlternative: (tripId: string, itemId: string) => void;
  vote: (tripId: string, memberId: string, candidateId: string) => void;
  enableGuardian: (tripId: string, consent: boolean) => void;
  publishPartnerIntent: (tripId: string) => void;
  selectGuardianPlan: (tripId: string, plan: GuardianPlanSelection) => void;
  resetTripStore: () => void;
}

interface TripStoreHydrationState {
  hydrated: boolean;
  hydrationError: boolean;
}

interface CreateTripStoreOptions {
  onHydrationError?: (error: unknown) => void;
}

const allowedTransitions: Readonly<Record<WorkbenchTripStatus, readonly WorkbenchTripStatus[]>> = {
  review: ['active', 'discarded'],
  active: ['guarded', 'archived'],
  guarded: ['active', 'archived'],
  discarded: [],
  archived: [],
};

const initialItemCosts = [520, 420, 680, 980, 370] as const;
const tripStorageKey = 'xingyu-demo-v1';
const tripStorageVersion = 2;
const stableMigrationTimestamp = '2026-08-18T00:00:00.000Z';
const initialTripState = { trips: {}, partnerIntents: {}, guardianPlans: {} } as const;

export const demoMembers = [
  { id: 'member-lin', name: '林见山' },
  { id: 'member-muyu', name: '木雨' },
  { id: 'member-zhou', name: '周舟' },
] as const;

const realIsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
});
const isoTimestampSchema = z.string().datetime({ offset: true }).refine(
  (value) => !Number.isNaN(Date.parse(value)),
  { message: 'invalid timestamp' },
);

const itineraryItemSchema = z.object({
  id: z.string().min(1).max(120),
  day: z.number().int().positive(),
  title: z.string().min(1).max(120),
  description: z.string().max(500),
  location: z.string().min(1).max(120),
  estimatedCost: z.number().finite().nonnegative(),
  isAlternative: z.boolean(),
}).strict();

const decisionCandidateSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  description: z.string().max(500),
}).strict();

const workbenchTripFields = {
  id: z.string().min(1).max(120),
  sourcePostSlug: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  destination: z.string().min(1).max(120),
  startDate: realIsoDateSchema,
  endDate: realIsoDateSchema,
  travelers: z.number().int().min(1).max(9),
  budget: z.number().finite().nonnegative(),
  status: z.enum(['review', 'active', 'guarded', 'discarded', 'archived']),
  guardianEnabled: z.boolean(),
  items: z.array(itineraryItemSchema).min(1).max(60),
  candidates: z.array(decisionCandidateSchema).min(1).max(20),
  votes: z.record(z.string(), z.string()),
};

const workbenchTripV1Schema = z.object(workbenchTripFields).strict().superRefine(validateTripIntegrity);
const workbenchTripSchema = z.object({
  ...workbenchTripFields,
  createdAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema,
  coverImage: z.string().min(1).max(500).optional(),
}).strict().superRefine((trip, context) => {
  validateTripIntegrity(trip, context);
  if (Date.parse(trip.updatedAt) < Date.parse(trip.createdAt)) {
    context.addIssue({ code: 'custom', path: ['updatedAt'], message: 'timestamp order mismatch' });
  }
});

function validateTripIntegrity(
  trip: Omit<WorkbenchTrip, 'createdAt' | 'updatedAt' | 'coverImage'>,
  context: z.RefinementCtx,
) {
  if (trip.endDate < trip.startDate) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: 'invalid date order' });
  }
  if (trip.guardianEnabled !== (trip.status === 'guarded')) {
    context.addIssue({ code: 'custom', path: ['guardianEnabled'], message: 'guardian/status mismatch' });
  }
  const itemIds = new Set(trip.items.map((item) => item.id));
  if (itemIds.size !== trip.items.length) {
    context.addIssue({ code: 'custom', path: ['items'], message: 'duplicate item id' });
  }
  const candidateIds = new Set(trip.candidates.map((candidate) => candidate.id));
  if (candidateIds.size !== trip.candidates.length) {
    context.addIssue({ code: 'custom', path: ['candidates'], message: 'duplicate candidate id' });
  }
  const memberIds = new Set<string>(demoMembers.map((member) => member.id));
  for (const [memberId, candidateId] of Object.entries(trip.votes)) {
    if (!memberIds.has(memberId) || !candidateIds.has(candidateId)) {
      context.addIssue({ code: 'custom', path: ['votes', memberId], message: 'invalid vote' });
    }
  }
}

function refineUniqueTripSourceSlugs(
  trips: Record<string, { sourcePostSlug?: unknown }>,
  context: z.RefinementCtx,
) {
  const firstTripIdBySourceSlug = new Map<string, string>();
  for (const [tripId, trip] of Object.entries(trips)) {
    const sourcePostSlug = trip.sourcePostSlug;
    if (typeof sourcePostSlug !== 'string' || sourcePostSlug.length === 0) continue;
    if (firstTripIdBySourceSlug.has(sourcePostSlug)) {
      context.addIssue({
        code: 'custom',
        path: ['trips', tripId, 'sourcePostSlug'],
        message: 'duplicate source post slug',
      });
      continue;
    }
    firstTripIdBySourceSlug.set(sourcePostSlug, tripId);
  }
}

function persistedTripStateSchemaFor(tripSchema: typeof workbenchTripSchema | typeof workbenchTripV1Schema) {
  return z.object({
  trips: z.record(z.string(), tripSchema),
  partnerIntents: z.record(z.string(), z.boolean()),
  guardianPlans: z.record(z.string(), z.object({
    id: z.string().min(1).max(120),
    title: z.string().min(1).max(160),
  }).strict()).default({}),
}).strict().superRefine((state, context) => {
  for (const [tripId, trip] of Object.entries(state.trips)) {
    if (trip.id !== tripId) {
      context.addIssue({ code: 'custom', path: ['trips', tripId, 'id'], message: 'trip key/id mismatch' });
    }
  }
  for (const tripId of Object.keys(state.partnerIntents)) {
    if (!state.trips[tripId]) {
      context.addIssue({ code: 'custom', path: ['partnerIntents', tripId], message: 'orphan intent' });
    }
  }
  for (const tripId of Object.keys(state.guardianPlans)) {
    if (!state.trips[tripId]) {
      context.addIssue({ code: 'custom', path: ['guardianPlans', tripId], message: 'orphan guardian plan' });
    }
  }
  refineUniqueTripSourceSlugs(state.trips, context);
  });
}

const persistedTripStateV1Schema = persistedTripStateSchemaFor(workbenchTripV1Schema);
const persistedTripStateSchema = persistedTripStateSchemaFor(workbenchTripSchema);
const persistedTripEnvelopeSchema = z.object({
  state: z.unknown(),
  version: z.number().int().nonnegative(),
}).strict();

type PersistedTripState = Pick<TripStoreState, 'trips' | 'partnerIntents' | 'guardianPlans'>;
type PersistedTripV1State = {
  trips: Record<string, Omit<WorkbenchTrip, 'createdAt' | 'updatedAt' | 'coverImage'>>;
  partnerIntents: Record<string, boolean>;
  guardianPlans: Record<string, GuardianPlanSelection>;
};

function parsePersistedTripState(state: unknown): PersistedTripState {
  const parsed = persistedTripStateSchema.safeParse(state);
  if (parsed.success) return parsed.data as PersistedTripState;
  const error = new Error('TRIP_INVALID_PERSISTED_STATE') as Error & { cause?: unknown };
  error.cause = parsed.error;
  throw error;
}

function migrateV1PersistedTripState(state: unknown): PersistedTripState {
  const parsed = persistedTripStateV1Schema.safeParse(state);
  if (!parsed.success) {
    const error = new Error('TRIP_INVALID_PERSISTED_STATE') as Error & { cause?: unknown };
    error.cause = parsed.error;
    throw error;
  }
  const legacy = parsed.data as PersistedTripV1State;
  return parsePersistedTripState({
    ...legacy,
    trips: Object.fromEntries(Object.entries(legacy.trips).map(([tripId, trip]) => [
      tripId,
      { ...trip, createdAt: stableMigrationTimestamp, updatedAt: stableMigrationTimestamp },
    ])),
  });
}

export function transitionTrip(
  status: WorkbenchTripStatus,
  next: WorkbenchTripStatus,
): WorkbenchTripStatus {
  if (!allowedTransitions[status].includes(next)) {
    throw new Error(`TRIP_INVALID_TRANSITION:${status}:${next}`);
  }
  return next;
}

export function getBudgetSummary(trip: WorkbenchTrip) {
  const itemTotals = trip.items.map((item) => item.estimatedCost);
  return { itemTotals, overall: itemTotals.reduce((sum, cost) => sum + cost, 0) };
}

export const selectTripRecords = (state: Pick<TripStoreState, 'trips'>) => state.trips;

export function selectTripBySourceSlug(
  state: Pick<TripStoreState, 'trips'>,
  sourcePostSlug: string,
) {
  return Object.values(state.trips).find((trip) => trip.sourcePostSlug === sourcePostSlug);
}

export function selectAcceptedTripCount(state: Pick<TripStoreState, 'trips'>) {
  return Object.values(state.trips).filter(
    (trip) => trip.status === 'active' || trip.status === 'guarded' || trip.status === 'archived',
  ).length;
}

type GuardianTripSupport = (sourcePostSlug: string) => boolean;
const supportsEveryGuardianTrip: GuardianTripSupport = () => true;

/**
 * Returns one canonical guarded trip without relying on object insertion order.
 * Newer updates win, then newer creation time, then the ascending source slug.
 */
export function selectMostRecentGuardianTrip(
  state: Pick<TripStoreState, 'trips'>,
  supportsTrip: GuardianTripSupport = supportsEveryGuardianTrip,
): WorkbenchTrip | undefined {
  let selected: WorkbenchTrip | undefined;
  for (const trip of Object.values(state.trips)) {
    if (trip.status !== 'guarded' || !trip.guardianEnabled || !supportsTrip(trip.sourcePostSlug)) {
      continue;
    }
    if (!selected || isGuardianTripMoreRecent(trip, selected)) selected = trip;
  }
  return selected;
}

function isGuardianTripMoreRecent(candidate: WorkbenchTrip, selected: WorkbenchTrip) {
  const updatedDifference = Date.parse(candidate.updatedAt) - Date.parse(selected.updatedAt);
  if (updatedDifference !== 0) return updatedDifference > 0;
  const createdDifference = Date.parse(candidate.createdAt) - Date.parse(selected.createdAt);
  if (createdDifference !== 0) return createdDifference > 0;
  return candidate.sourcePostSlug < selected.sourcePostSlug;
}

export function getTrip(state: Pick<TripStoreState, 'trips'>, tripId: string): WorkbenchTrip {
  const trip = state.trips[tripId] ?? Object.values(state.trips).find(
    (candidate) => candidate.sourcePostSlug === tripId,
  );
  if (!trip) throw new Error(`TRIP_NOT_FOUND:${tripId}`);
  return trip;
}

function validateSettings(patch: TripSettingsPatch) {
  if (patch.budget !== undefined && (!Number.isFinite(patch.budget) || patch.budget < 0)) {
    throw new Error('TRIP_INVALID_BUDGET');
  }
  if (patch.startDate && patch.endDate && patch.endDate < patch.startDate) {
    throw new Error('TRIP_INVALID_DATE_RANGE');
  }
}

function tripFromDraft(
  draft: TripDraft,
  coverImage?: string,
  timestamp = new Date().toISOString(),
): WorkbenchTrip {
  return {
    id: draft.id,
    sourcePostSlug: draft.sourcePostSlug,
    title: `${draft.destination}慢行计划`,
    destination: draft.destination,
    startDate: '2026-09-18',
    endDate: '2026-09-22',
    travelers: 3,
    budget: draft.budget,
    status: transitionTrip(draft.status, 'active'),
    guardianEnabled: false,
    items: draft.items.map((item, index) => ({
      ...item,
      estimatedCost: initialItemCosts[index] ?? 0,
      isAlternative: false,
    })),
    candidates: [
      { id: 'candidate-a', title: '喜洲稻田骑行', description: '把第三天留给稻田、扎染和慢骑。' },
      { id: 'candidate-b', title: '苍山茶席', description: '改去苍山脚下，留一整个午后喝茶。' },
    ],
    votes: {},
    createdAt: timestamp,
    updatedAt: timestamp,
    ...(coverImage ? { coverImage } : {}),
  };
}

function withImportedLegacyDrafts(state: PersistedTripState): PersistedTripState {
  if (typeof localStorage === 'undefined') return state;
  const trips = { ...state.trips };
  for (const draft of readLegacyTripDrafts(localStorage)) {
    const existing = Object.values(trips).find((trip) => trip.sourcePostSlug === draft.sourcePostSlug);
    if (existing) continue;
    if (trips[draft.id]) throw new Error(`TRIP_ID_CONFLICT:${draft.id}`);
    trips[draft.id] = tripFromDraft(draft, undefined, stableMigrationTimestamp);
  }
  return parsePersistedTripState({ ...state, trips });
}

function updatedTrip(trip: WorkbenchTrip, patch: Partial<WorkbenchTrip>): WorkbenchTrip {
  return { ...trip, ...patch, updatedAt: new Date().toISOString() };
}

function stateCreator(
  set: (recipe: (state: TripStoreState) => Partial<TripStoreState>) => void,
  get: () => TripStoreState,
  allowPersistence: () => void = () => {},
) {
  return {
    ...initialTripState,
    acceptDraft: (draft: TripDraft) => { get().savePostAsTrip(draft); },
    savePostAsTrip: (draft: TripDraft, coverImage?: string) => {
      let canonicalTrip: WorkbenchTrip | undefined;
      set((state) => {
        const existing = Object.values(state.trips).find(
          (trip) => trip.sourcePostSlug === draft.sourcePostSlug,
        );
        if (existing) {
          canonicalTrip = existing;
          return {};
        }
        if (state.trips[draft.id]) throw new Error(`TRIP_ID_CONFLICT:${draft.id}`);
        canonicalTrip = tripFromDraft(draft, coverImage);
        return { trips: { ...state.trips, [canonicalTrip.id]: canonicalTrip } };
      });
      if (!canonicalTrip) throw new Error('TRIP_SAVE_FAILED');
      return canonicalTrip;
    },
    updateTrip: (tripId: string, patch: TripSettingsPatch) => set((state) => {
      const trip = getTrip(state, tripId);
      const next = updatedTrip(trip, patch);
      validateSettings(next);
      return { trips: { ...state.trips, [trip.id]: next } };
    }),
    updateItem: (tripId: string, itemId: string, patch: TripItemPatch) => set((state) => {
      const trip = getTrip(state, tripId);
      if (patch.estimatedCost !== undefined &&
        (!Number.isFinite(patch.estimatedCost) || patch.estimatedCost < 0)) {
        throw new Error('TRIP_INVALID_ITEM_COST');
      }
      if (!trip.items.some((item) => item.id === itemId)) throw new Error(`TRIP_ITEM_NOT_FOUND:${itemId}`);
      return {
        trips: {
          ...state.trips,
          [trip.id]: {
            ...updatedTrip(trip, {}),
            items: trip.items.map((item) => item.id === itemId ? { ...item, ...patch } : item),
          },
        },
      };
    }),
    reorderItem: (tripId: string, itemId: string, direction: ReorderDirection) => set((state) => {
      const trip = getTrip(state, tripId);
      const index = trip.items.findIndex((item) => item.id === itemId);
      if (index < 0) throw new Error(`TRIP_ITEM_NOT_FOUND:${itemId}`);
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= trip.items.length) return {};
      const items = [...trip.items];
      [items[index], items[target]] = [items[target], items[index]];
      return {
        trips: {
          ...state.trips,
          [trip.id]: updatedTrip(trip, { items: items.map((item, itemIndex) => ({ ...item, day: itemIndex + 1 })) }),
        },
      };
    }),
    toggleAlternative: (tripId: string, itemId: string) => set((state) => {
      const trip = getTrip(state, tripId);
      if (!trip.items.some((item) => item.id === itemId)) throw new Error(`TRIP_ITEM_NOT_FOUND:${itemId}`);
      return {
        trips: {
          ...state.trips,
          [trip.id]: {
            ...updatedTrip(trip, {}),
            items: trip.items.map((item) =>
              item.id === itemId ? { ...item, isAlternative: !item.isAlternative } : item,
            ),
          },
        },
      };
    }),
    vote: (tripId: string, memberId: string, candidateId: string) => set((state) => {
      const trip = getTrip(state, tripId);
      if (!demoMembers.some((member) => member.id === memberId)) {
        throw new Error(`TRIP_MEMBER_NOT_FOUND:${memberId}`);
      }
      if (!trip.candidates.some((candidate) => candidate.id === candidateId)) {
        throw new Error(`TRIP_CANDIDATE_NOT_FOUND:${candidateId}`);
      }
      const votes = { ...trip.votes };
      if (votes[memberId] === candidateId) delete votes[memberId];
      else votes[memberId] = candidateId;
      return { trips: { ...state.trips, [trip.id]: updatedTrip(trip, { votes }) } };
    }),
    enableGuardian: (tripId: string, consent: boolean) => set((state) => {
      const trip = getTrip(state, tripId);
      if (!consent && trip.status !== 'guarded') throw new Error('TRIP_GUARDIAN_CONSENT_REQUIRED');
      const status = consent
        ? transitionTrip(trip.status, 'guarded')
        : transitionTrip(trip.status, 'active');
      return {
        trips: {
          ...state.trips,
          [trip.id]: updatedTrip(trip, { status, guardianEnabled: consent }),
        },
      };
    }),
    publishPartnerIntent: (tripId: string) => set((state) => {
      const trip = getTrip(state, tripId);
      return {
        trips: { ...state.trips, [trip.id]: updatedTrip(trip, {}) },
        partnerIntents: { ...state.partnerIntents, [trip.id]: true },
      };
    }),
    selectGuardianPlan: (tripId: string, plan: GuardianPlanSelection) => set((state) => {
      const trip = getTrip(state, tripId);
      return {
        trips: { ...state.trips, [trip.id]: updatedTrip(trip, {}) },
        guardianPlans: { ...state.guardianPlans, [trip.id]: plan },
      };
    }),
    resetTripStore: () => {
      allowPersistence();
      set(() => ({ trips: {}, partnerIntents: {}, guardianPlans: {} }));
    },
  } satisfies TripStoreState;
}

function persistenceOptions(options: CreateTripStoreOptions = {}) {
  return {
    name: tripStorageKey,
    version: tripStorageVersion,
    skipHydration: true,
    partialize: (state: TripStoreState): PersistedTripState => ({
      trips: state.trips,
      partnerIntents: state.partnerIntents,
      guardianPlans: state.guardianPlans,
    }),
    migrate: (persistedState: unknown, version: number): PersistedTripState => {
      if (version !== 1 && version !== 0) {
        throw new Error(`TRIP_UNSUPPORTED_PERSISTED_VERSION:${version}`);
      }
      return withImportedLegacyDrafts(migrateV1PersistedTripState(persistedState));
    },
    merge: (persistedState: unknown, currentState: TripStoreState): TripStoreState => {
      if (persistedState === undefined) return currentState;
      const safeState = withImportedLegacyDrafts(parsePersistedTripState(persistedState));
      return {
        ...currentState,
        trips: { ...safeState.trips, ...currentState.trips },
        partnerIntents: { ...safeState.partnerIntents, ...currentState.partnerIntents },
        guardianPlans: { ...safeState.guardianPlans, ...currentState.guardianPlans },
      };
    },
    onRehydrateStorage: () => (_state: TripStoreState | undefined, error: unknown) => {
      if (error) options.onHydrationError?.(error);
    },
  };
}

function createPersistedTripState(options: CreateTripStoreOptions = {}) {
  let preserveMalformedBytes = false;
  const allowPersistence = () => { preserveMalformedBytes = false; };
  const jsonStorage = createJSONStorage<PersistedTripState>(() => localStorage) ?? {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  const safeOptions = {
    ...options,
    onHydrationError: (error: unknown) => {
      preserveMalformedBytes = true;
      options.onHydrationError?.(error);
    },
  };

  return persist<TripStoreState, [], [], PersistedTripState>(
    (set, get) => stateCreator(set, get, allowPersistence),
    {
    ...persistenceOptions(safeOptions),
    storage: {
      getItem: (name) => {
        const value = jsonStorage.getItem(name);
        if (value === null) {
          if (typeof localStorage === 'undefined' || localStorage.getItem(legacyTripDraftStorageKey) === null) {
            return null;
          }
          return {
            state: { trips: {}, partnerIntents: {}, guardianPlans: {} },
            version: 1,
          };
        }
        const parsed = persistedTripEnvelopeSchema.safeParse(value);
        if (!parsed.success) throw new Error('TRIP_INVALID_PERSISTED_ENVELOPE');
        if (parsed.data.version === tripStorageVersion) {
          const canonicalState = parsePersistedTripState(parsed.data.state);
          const importedState = withImportedLegacyDrafts(canonicalState);
          if (Object.keys(importedState.trips).length !== Object.keys(canonicalState.trips).length) {
            jsonStorage.setItem(name, { state: importedState, version: tripStorageVersion });
          }
          return { state: importedState, version: tripStorageVersion };
        }
        return parsed.data as { state: PersistedTripState; version: number };
      },
      setItem: (name, value) => preserveMalformedBytes ? undefined : jsonStorage.setItem(name, value),
      removeItem: (name) => preserveMalformedBytes ? undefined : jsonStorage.removeItem(name),
    },
    },
  );
}

export function createTripStore(options: CreateTripStoreOptions = {}) {
  return createStore<TripStoreState>()(createPersistedTripState(options));
}

export const useTripStoreHydration = create<TripStoreHydrationState>(() => ({
  hydrated: false,
  hydrationError: false,
}));

export const useTripStore = create<TripStoreState>()(
  createPersistedTripState({
    onHydrationError: () => useTripStoreHydration.setState({ hydrationError: true }),
  }),
);

let tripHydrationPromise: Promise<void> | undefined;

export function hydrateWorkbenchTripStore(): Promise<void> {
  if (typeof window === 'undefined' || useTripStoreHydration.getState().hydrated) {
    return Promise.resolve();
  }
  if (tripHydrationPromise) return tripHydrationPromise;
  tripHydrationPromise = (async () => {
    try {
      useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
      await useTripStore.persist.rehydrate();
    } catch {
      useTripStoreHydration.setState({ hydrationError: true });
    } finally {
      useTripStoreHydration.setState({ hydrated: true });
      tripHydrationPromise = undefined;
    }
  })();
  return tripHydrationPromise;
}
