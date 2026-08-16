'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TripDraft } from './extract-draft';

interface TripStore {
  drafts: Record<string, TripDraft>;
  saveDraft: (draft: TripDraft) => void;
}

export const useTripStore = create<TripStore>()(
  persist(
    (set) => ({
      drafts: {},
      saveDraft: (draft) => set((state) => ({ drafts: { ...state.drafts, [draft.sourcePostSlug]: draft } })),
    }),
    { name: 'xingyu-demo-trip-drafts' },
  ),
);
