'use client';

import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import { z } from 'zod';

export type DemoProfile = {
  age: 26;
  identityVerified: true;
  riskStatus: 'clear';
};

export type ProfileState = {
  demoProfile: DemoProfile;
  personalizedFeed: boolean;
  interestTags: string[];
  setPersonalizedFeed: (value: boolean) => void;
  clearInterestTags: () => void;
  resetProfilePreferences: () => void;
};

type ProfileHydrationState = {
  hydrated: boolean;
  hydrationError: boolean;
};

type CreateProfileStoreOptions = {
  onHydrationError?: (error: unknown) => void;
};

const defaultProfileState = {
  demoProfile: { age: 26, identityVerified: true, riskStatus: 'clear' },
  personalizedFeed: true,
  interestTags: ['山野', '人文', '慢旅行'],
} as const satisfies Pick<ProfileState, 'demoProfile' | 'personalizedFeed' | 'interestTags'>;

const failedClosedProfileState: Pick<ProfileState, 'demoProfile' | 'personalizedFeed' | 'interestTags'> = {
  demoProfile: { ...defaultProfileState.demoProfile },
  personalizedFeed: false,
  interestTags: [],
};

const persistedProfileSchema = z.object({
  demoProfile: z.object({
    age: z.literal(26),
    identityVerified: z.literal(true),
    riskStatus: z.literal('clear'),
  }).strict(),
  personalizedFeed: z.boolean(),
  interestTags: z.array(z.string().min(1).max(40)).max(12),
}).strict().superRefine((value, context) => {
  if (new Set(value.interestTags).size !== value.interestTags.length) {
    context.addIssue({ code: 'custom', path: ['interestTags'], message: 'duplicate interest tag' });
  }
  if (value.personalizedFeed && value.interestTags.length === 0) {
    context.addIssue({ code: 'custom', path: ['personalizedFeed'], message: 'personalization needs interests' });
  }
});

type PersistedProfileState = z.infer<typeof persistedProfileSchema>;

function parsePersistedProfile(state: unknown): PersistedProfileState {
  const parsed = persistedProfileSchema.safeParse(state);
  if (parsed.success) return parsed.data;
  throw new Error('PROFILE_INVALID_PERSISTED_STATE');
}

function stateCreator(set: (recipe: (state: ProfileState) => Partial<ProfileState>) => void): ProfileState {
  return {
    ...defaultProfileState,
    setPersonalizedFeed: (value) => set((state) => ({
      personalizedFeed: value && state.interestTags.length > 0,
    })),
    clearInterestTags: () => set(() => ({ interestTags: [], personalizedFeed: false })),
    resetProfilePreferences: () => set(() => ({
      demoProfile: { ...defaultProfileState.demoProfile },
      personalizedFeed: true,
      interestTags: [...defaultProfileState.interestTags],
    })),
  };
}

function persistenceOptions(options: CreateProfileStoreOptions = {}) {
  return {
    name: 'xingyu-profile-demo-v1',
    version: 1,
    skipHydration: true,
    partialize: (state: ProfileState): PersistedProfileState => ({
      demoProfile: state.demoProfile,
      personalizedFeed: state.personalizedFeed,
      interestTags: state.interestTags,
    }),
    merge: (persistedState: unknown, currentState: ProfileState): ProfileState => {
      if (persistedState === undefined) return currentState;
      try {
        return { ...currentState, ...parsePersistedProfile(persistedState) };
      } catch (error) {
        options.onHydrationError?.(error);
        return { ...currentState, ...failedClosedProfileState };
      }
    },
    onRehydrateStorage: () => (_state: ProfileState | undefined, error: unknown) => {
      if (error) options.onHydrationError?.(error);
    },
  };
}

export function createProfileStore(options: CreateProfileStoreOptions = {}) {
  return createStore<ProfileState>()(
    persist<ProfileState, [], [], PersistedProfileState>(stateCreator, persistenceOptions(options)),
  );
}

export const useProfileStoreHydration = create<ProfileHydrationState>(() => ({
  hydrated: false,
  hydrationError: false,
}));

export const useProfileStore = create<ProfileState>()(
  persist<ProfileState, [], [], PersistedProfileState>(
    stateCreator,
    persistenceOptions({
      onHydrationError: () => useProfileStoreHydration.setState({ hydrationError: true }),
    }),
  ),
);

export async function hydrateProfileStore() {
  if (typeof window === 'undefined' || useProfileStoreHydration.getState().hydrated) return;
  try {
    useProfileStoreHydration.setState({ hydrated: false, hydrationError: false });
    await useProfileStore.persist.rehydrate();
  } catch {
    useProfileStoreHydration.setState({ hydrationError: true });
  } finally {
    useProfileStoreHydration.setState({ hydrated: true });
  }
}
