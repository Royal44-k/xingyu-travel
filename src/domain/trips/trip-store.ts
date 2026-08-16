'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TripDraft } from './extract-draft';

interface TripStore {
  drafts: Record<string, TripDraft>;
  saveDraft: (draft: TripDraft) => void;
}

interface TripHydrationState {
  hydrated: boolean;
  hydrationError: boolean;
}

export const useTripHydrationStore = create<TripHydrationState>(() => ({
  hydrated: false,
  hydrationError: false,
}));

export const useTripStore = create<TripStore>()(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (draft) => set((state) => ({ drafts: { ...state.drafts, [draft.sourcePostSlug]: draft } })),
    }),
    {
      name: 'xingyu-demo-trip-drafts',
      skipHydration: true,
      onRehydrateStorage: () => (_state, error) => {
        if (error) useTripHydrationStore.setState({ hydrationError: true });
      },
    },
  ),
);

export async function hydrateTripStore() {
  if (typeof window === 'undefined' || useTripHydrationStore.getState().hydrated) return;

  try {
    useTripHydrationStore.setState({ hydrated: false, hydrationError: false });
    await useTripStore.persist.rehydrate();
  } catch {
    useTripHydrationStore.setState({ hydrationError: true });
  } finally {
    useTripHydrationStore.setState({ hydrated: true });
  }
}
