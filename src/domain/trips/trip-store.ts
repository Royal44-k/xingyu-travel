'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TripDraft } from './extract-draft';

interface TripStore {
  drafts: Record<string, TripDraft>;
  hydrated: boolean;
  saveDraft: (draft: TripDraft) => void;
}

export const useTripStore = create<TripStore>()(
  persist(
    (set) => ({
      drafts: {},
      hydrated: false,
      saveDraft: (draft) => set((state) => ({ drafts: { ...state.drafts, [draft.sourcePostSlug]: draft } })),
    }),
    { name: 'xingyu-demo-trip-drafts', skipHydration: true },
  ),
);

export async function hydrateTripStore() {
  if (typeof window === 'undefined' || useTripStore.getState().hydrated) return;

  try {
    await useTripStore.persist.rehydrate();
  } finally {
    useTripStore.setState({ hydrated: true });
  }
}
