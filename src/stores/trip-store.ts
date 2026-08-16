'use client';

import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import type { TripDraft } from '@/domain/trips/extract-draft';

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
}

type TripSettingsPatch = Partial<Pick<WorkbenchTrip, 'startDate' | 'endDate' | 'budget'>>;
type TripItemPatch = Partial<Pick<WorkbenchItineraryItem, 'title' | 'location' | 'estimatedCost'>>;

export interface TripStoreState {
  trips: Record<string, WorkbenchTrip>;
  partnerIntents: Record<string, boolean>;
  acceptDraft: (draft: TripDraft) => void;
  updateTrip: (tripId: string, patch: TripSettingsPatch) => void;
  updateItem: (tripId: string, itemId: string, patch: TripItemPatch) => void;
  reorderItem: (tripId: string, itemId: string, direction: ReorderDirection) => void;
  toggleAlternative: (tripId: string, itemId: string) => void;
  vote: (tripId: string, memberId: string, candidateId: string) => void;
  enableGuardian: (tripId: string, consent: boolean) => void;
  publishPartnerIntent: (tripId: string) => void;
}

interface TripStoreHydrationState {
  hydrated: boolean;
  hydrationError: boolean;
}

const allowedTransitions: Readonly<Record<WorkbenchTripStatus, readonly WorkbenchTripStatus[]>> = {
  review: ['active', 'discarded'],
  active: ['guarded', 'archived'],
  guarded: ['active', 'archived'],
  discarded: [],
  archived: [],
};

const initialItemCosts = [520, 420, 680, 980, 370] as const;

export const demoMembers = [
  { id: 'member-lin', name: '林见山' },
  { id: 'member-muyu', name: '木雨' },
  { id: 'member-zhou', name: '周舟' },
] as const;

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

function getTrip(state: TripStoreState, tripId: string): WorkbenchTrip {
  const trip = state.trips[tripId];
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

function tripFromDraft(draft: TripDraft): WorkbenchTrip {
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
  };
}

function stateCreator(set: (recipe: (state: TripStoreState) => Partial<TripStoreState>) => void) {
  return {
    trips: {},
    partnerIntents: {},
    acceptDraft: (draft: TripDraft) => set((state) => {
      const existing = Object.values(state.trips).find(
        (trip) => trip.id === draft.id || trip.sourcePostSlug === draft.sourcePostSlug,
      );
      if (existing) return {};
      const trip = tripFromDraft(draft);
      return { trips: { ...state.trips, [trip.id]: trip } };
    }),
    updateTrip: (tripId: string, patch: TripSettingsPatch) => set((state) => {
      const trip = getTrip(state, tripId);
      const next = { ...trip, ...patch };
      validateSettings(next);
      return { trips: { ...state.trips, [tripId]: next } };
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
          [tripId]: {
            ...trip,
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
          [tripId]: { ...trip, items: items.map((item, itemIndex) => ({ ...item, day: itemIndex + 1 })) },
        },
      };
    }),
    toggleAlternative: (tripId: string, itemId: string) => set((state) => {
      const trip = getTrip(state, tripId);
      if (!trip.items.some((item) => item.id === itemId)) throw new Error(`TRIP_ITEM_NOT_FOUND:${itemId}`);
      return {
        trips: {
          ...state.trips,
          [tripId]: {
            ...trip,
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
      return { trips: { ...state.trips, [tripId]: { ...trip, votes } } };
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
          [tripId]: { ...trip, status, guardianEnabled: consent },
        },
      };
    }),
    publishPartnerIntent: (tripId: string) => set((state) => {
      getTrip(state, tripId);
      return { partnerIntents: { ...state.partnerIntents, [tripId]: true } };
    }),
  } satisfies TripStoreState;
}

const persistOptions = {
  name: 'xingyu-demo-v1',
  skipHydration: true,
  partialize: (state: TripStoreState) => ({
    trips: state.trips,
    partnerIntents: state.partnerIntents,
  }),
} as const;

export function createTripStore() {
  return createStore<TripStoreState>()(persist(stateCreator, persistOptions));
}

export const useTripStoreHydration = create<TripStoreHydrationState>(() => ({
  hydrated: false,
  hydrationError: false,
}));

export const useTripStore = create<TripStoreState>()(
  persist(stateCreator, {
    ...persistOptions,
    onRehydrateStorage: () => (_state, error) => {
      if (error) useTripStoreHydration.setState({ hydrationError: true });
    },
  }),
);

export async function hydrateWorkbenchTripStore() {
  if (typeof window === 'undefined' || useTripStoreHydration.getState().hydrated) return;
  try {
    useTripStoreHydration.setState({ hydrated: false, hydrationError: false });
    await useTripStore.persist.rehydrate();
  } catch {
    useTripStoreHydration.setState({ hydrationError: true });
  } finally {
    useTripStoreHydration.setState({ hydrated: true });
  }
}
