'use client';

import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';
import { z } from 'zod';
import { hasValidInterestTagLength, interestTagKey, normalizeInterestTag } from '@/data/interest-tags';

export type DemoProfile = {
  age: 26;
  identityVerified: true;
  riskStatus: 'clear';
};

export type ProfilePreferences = {
  personalizedFeed: boolean;
  interestTags: string[];
};

export type ProfileState = ProfilePreferences & {
  demoProfile: DemoProfile;
  setPersonalizedFeed: (value: boolean) => void;
  addInterestTag: (tag: string) => void;
  removeInterestTag: (tag: string) => void;
  replaceInterestTags: (tags: string[]) => void;
  clearInterestTags: () => void;
  resetProfilePreferences: () => void;
};

type ProfileHydrationState = {
  hydrated: boolean;
  hydrationError: boolean;
};

type CreateProfileStoreOptions = {
  onHydrationError?: (error: unknown) => void;
  onHydrationFailure?: () => void;
  onPreserveMalformedBytes?: () => void;
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

const demoProfileSchema = z.object({
    age: z.literal(26),
    identityVerified: z.literal(true),
    riskStatus: z.literal('clear'),
  }).strict();

const interestTagsSchema = z.array(z.string().superRefine((tag, context) => {
  if (tag !== normalizeInterestTag(tag) || !hasValidInterestTagLength(tag)) {
    context.addIssue({ code: 'custom', message: 'invalid interest tag' });
  }
})).max(12);

const profilePreferencesSchema = z.object({
  personalizedFeed: z.boolean(),
  interestTags: interestTagsSchema,
}).strict().superRefine((value, context) => {
  if (new Set(value.interestTags.map(interestTagKey)).size !== value.interestTags.length) {
    context.addIssue({ code: 'custom', path: ['interestTags'], message: 'duplicate interest tag' });
  }
  if (value.personalizedFeed && value.interestTags.length === 0) {
    context.addIssue({ code: 'custom', path: ['personalizedFeed'], message: 'personalization needs interests' });
  }
});

const persistedProfileSchema = profilePreferencesSchema.extend({
  demoProfile: demoProfileSchema,
}).strict();

const persistedV1PreferencesSchema = z.object({
  personalizedFeed: z.boolean(),
  interestTags: z.array(z.string().min(1).max(40)).max(12),
}).strict();

const persistedV1ProfileSchema = z.union([
  persistedV1PreferencesSchema,
  persistedV1PreferencesSchema.extend({ demoProfile: demoProfileSchema }).strict(),
]);

type PersistedProfileState = z.infer<typeof persistedProfileSchema>;

function parsePersistedProfile(state: unknown): PersistedProfileState {
  const parsed = persistedProfileSchema.safeParse(state);
  if (parsed.success) return parsed.data;
  throw new Error('PROFILE_INVALID_PERSISTED_STATE');
}

function validateInterestTag(raw: string): string {
  const tag = normalizeInterestTag(raw);
  if (!hasValidInterestTagLength(tag)) throw new Error('PROFILE_TAG_INVALID');
  return tag;
}

function normalizeInterestTags(tags: string[]): string[] {
  const normalized: string[] = [];
  const knownTags = new Set<string>();

  for (const raw of tags) {
    const tag = validateInterestTag(raw);
    const key = interestTagKey(tag);
    if (knownTags.has(key)) continue;
    if (normalized.length === 12) throw new Error('PROFILE_TAG_LIMIT');
    knownTags.add(key);
    normalized.push(tag);
  }

  return normalized;
}

function migrateV1ProfileState(persistedState: unknown): PersistedProfileState {
  const parsed = persistedV1ProfileSchema.safeParse(persistedState);
  if (!parsed.success) throw new Error('PROFILE_INVALID_PERSISTED_STATE');

  const interestTags = normalizeInterestTags(parsed.data.interestTags);
  return {
    demoProfile: 'demoProfile' in parsed.data ? parsed.data.demoProfile : { ...defaultProfileState.demoProfile },
    personalizedFeed: parsed.data.personalizedFeed && interestTags.length > 0,
    interestTags,
  };
}

function stateCreator(
  set: (recipe: (state: ProfileState) => Partial<ProfileState>) => void,
  registerHydrationFailure?: (handler: () => void) => void,
  allowPersistence?: () => void,
): ProfileState {
  registerHydrationFailure?.(() => set(() => ({ ...failedClosedProfileState })));
  return {
    ...defaultProfileState,
    setPersonalizedFeed: (value) => set((state) => ({
      personalizedFeed: value && state.interestTags.length > 0,
    })),
    addInterestTag: (raw) => set((state) => {
      const tag = validateInterestTag(raw);
      if (state.interestTags.some((existingTag) => interestTagKey(existingTag) === interestTagKey(tag))) return {};
      if (state.interestTags.length === 12) throw new Error('PROFILE_TAG_LIMIT');
      return { interestTags: [...state.interestTags, tag] };
    }),
    removeInterestTag: (raw) => set((state) => {
      const key = interestTagKey(raw);
      const interestTags = state.interestTags.filter((tag) => interestTagKey(tag) !== key);
      return {
        interestTags,
        personalizedFeed: interestTags.length > 0 ? state.personalizedFeed : false,
      };
    }),
    replaceInterestTags: (tags) => set((state) => {
      const interestTags = normalizeInterestTags(tags);
      return {
        interestTags,
        personalizedFeed: interestTags.length > 0 ? state.personalizedFeed : false,
      };
    }),
    clearInterestTags: () => set(() => ({ interestTags: [], personalizedFeed: false })),
    resetProfilePreferences: () => {
      allowPersistence?.();
      set(() => ({
        demoProfile: { ...defaultProfileState.demoProfile },
        personalizedFeed: true,
        interestTags: [...defaultProfileState.interestTags],
      }));
    },
  };
}

function persistenceOptions(options: CreateProfileStoreOptions = {}) {
  return {
    name: 'xingyu-profile-demo-v1',
    version: 2,
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
        options.onPreserveMalformedBytes?.();
        return { ...currentState, ...failedClosedProfileState };
      }
    },
    migrate: (persistedState: unknown, version: number): PersistedProfileState => {
      try {
        if (version !== 1) throw new Error('PROFILE_INVALID_PERSISTED_STATE');
        return migrateV1ProfileState(persistedState);
      } catch (error) {
        options.onHydrationError?.(error);
        options.onPreserveMalformedBytes?.();
        return { ...failedClosedProfileState };
      }
    },
    onRehydrateStorage: () => (_state: ProfileState | undefined, error: unknown) => {
      if (error) {
        options.onHydrationError?.(error);
        options.onPreserveMalformedBytes?.();
        options.onHydrationFailure?.();
      }
    },
  };
}

function createPersistedProfileState(options: CreateProfileStoreOptions = {}) {
  let failClosed = () => {};
  let preserveMalformedBytes = false;
  const profileStorage = createJSONStorage<PersistedProfileState>(() => localStorage) ?? {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  const preserveMalformedBytesForRecovery = () => { preserveMalformedBytes = true; };
  const allowPersistence = () => { preserveMalformedBytes = false; };

  return persist<ProfileState, [], [], PersistedProfileState>(
    (set) => stateCreator(set, (handler) => { failClosed = handler; }, allowPersistence),
    {
      ...persistenceOptions({
        ...options,
        onHydrationFailure: () => failClosed(),
        onPreserveMalformedBytes: preserveMalformedBytesForRecovery,
      }),
      storage: {
        getItem: (name) => profileStorage.getItem(name),
        setItem: (name, value) => (preserveMalformedBytes ? undefined : profileStorage.setItem(name, value)),
        removeItem: (name) => profileStorage.removeItem(name),
      },
    },
  );
}

export function createProfileStore(options: CreateProfileStoreOptions = {}) {
  return createStore<ProfileState>()(createPersistedProfileState(options));
}

export const useProfileStoreHydration = create<ProfileHydrationState>(() => ({
  hydrated: false,
  hydrationError: false,
}));

export const useProfileStore = create<ProfileState>()(
  createPersistedProfileState({
    onHydrationError: () => useProfileStoreHydration.setState({ hydrationError: true }),
  }),
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
