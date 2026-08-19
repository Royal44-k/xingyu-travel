'use client';

import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { createJSONStorage, persist } from 'zustand/middleware';
import { z } from 'zod';
import {
  demoPartnerCandidates,
  filterPartnerCandidates,
  isPartnerEligible,
  partnerIntentSchema,
  validatePartnerIntent,
  type PartnerIntent,
  type PartnerProfile,
} from '@/data/partners';

export type PartnerMatchStatus = 'pending_mutual' | 'matched' | 'blocked' | 'reported';
export type CheckInStatus = 'none' | 'checked_in' | 'missed';

export interface PartnerMessage {
  id: string;
  senderId: string;
  body: string;
  sentAt: string;
  demoMode: true;
}

export interface PartnerMatch {
  id: string;
  viewerId: string;
  candidateId: string;
  status: PartnerMatchStatus;
  viewerContactConsent: boolean;
  candidateContactConsent: boolean;
  messages: PartnerMessage[];
  trustedContactAcknowledged: boolean;
  tripShared: boolean;
  checkInStatus: CheckInStatus;
  demoMode: true;
}

export interface PartnerStoreState {
  intents: Record<string, PartnerIntent>;
  matches: Record<string, PartnerMatch>;
  visibleMatchIds: string[];
  blockedCandidateIds: string[];
  publishIntent: (profile: PartnerProfile, intent: PartnerIntent) => void;
  requestMatch: (profile: PartnerProfile, candidateId: string) => string;
  simulateMutualApproval: (profile: PartnerProfile, matchId: string) => void;
  sendMessage: (profile: PartnerProfile, matchId: string, body: string) =>
    | { sent: false; code: 'CONTACT_CONSENT_REQUIRED' }
    | { sent: true; warning?: string };
  setContactConsent: (profile: PartnerProfile, matchId: string, side: 'viewer' | 'candidate', consent: boolean) => void;
  acknowledgeTrustedContact: (profile: PartnerProfile, matchId: string) => void;
  shareTrip: (profile: PartnerProfile, matchId: string) => void;
  recordCheckIn: (profile: PartnerProfile, matchId: string, status: Exclude<CheckInStatus, 'none'>) => void;
  blockMatch: (profile: PartnerProfile, matchId: string) => void;
  reportMatch: (profile: PartnerProfile, matchId: string) => void;
  resetPartnerStore: () => void;
}

interface CreatePartnerStoreOptions { onHydrationError?: (error: unknown) => void }
interface PartnerStoreHydrationState { hydrated: boolean; hydrationError: boolean }

const initialPartnerState: Pick<
  PartnerStoreState,
  'intents' | 'matches' | 'visibleMatchIds' | 'blockedCandidateIds'
> = {
  intents: {}, matches: {}, visibleMatchIds: [], blockedCandidateIds: [],
};

const allowedTransitions: Readonly<Record<PartnerMatchStatus, readonly PartnerMatchStatus[]>> = {
  pending_mutual: ['matched', 'blocked', 'reported'],
  matched: ['blocked', 'reported'],
  blocked: [],
  reported: [],
};

const messageSchema = z.object({
  id: z.string().min(1).max(180),
  senderId: z.string().min(1).max(120),
  body: z.string().min(1).max(1000),
  sentAt: z.string().datetime(),
  demoMode: z.literal(true),
}).strict();
const matchSchema = z.object({
  id: z.string().min(1).max(180),
  viewerId: z.string().min(1).max(120),
  candidateId: z.string().min(1).max(120),
  status: z.enum(['pending_mutual', 'matched', 'blocked', 'reported']),
  viewerContactConsent: z.boolean(),
  candidateContactConsent: z.boolean(),
  messages: z.array(messageSchema).max(500),
  trustedContactAcknowledged: z.boolean(),
  tripShared: z.boolean(),
  checkInStatus: z.enum(['none', 'checked_in', 'missed']),
  demoMode: z.literal(true),
}).strict();
function createPersistedPartnerStateSchema(requireTerminalConsentRevoked: boolean) {
  return z.object({
    intents: z.record(z.string(), partnerIntentSchema),
    matches: z.record(z.string(), matchSchema),
    visibleMatchIds: z.array(z.string()),
    blockedCandidateIds: z.array(z.string()),
  }).strict().superRefine((state, context) => {
    for (const [matchId, match] of Object.entries(state.matches)) {
      if (match.id !== matchId) {
        context.addIssue({ code: 'custom', path: ['matches', matchId], message: 'key mismatch' });
      }
      if (requireTerminalConsentRevoked &&
        (match.status === 'blocked' || match.status === 'reported') &&
        (match.viewerContactConsent || match.candidateContactConsent)) {
        context.addIssue({ code: 'custom', path: ['matches', matchId], message: 'terminal consent not revoked' });
      }
    }
    if (new Set(state.visibleMatchIds).size !== state.visibleMatchIds.length) {
      context.addIssue({ code: 'custom', path: ['visibleMatchIds'], message: 'duplicate id' });
    }
    for (const matchId of state.visibleMatchIds) {
      const match = state.matches[matchId];
      if (!match || match.status === 'blocked' || match.status === 'reported') {
        context.addIssue({ code: 'custom', path: ['visibleMatchIds'], message: 'invalid visible match' });
      }
    }
  });
}

const persistedPartnerStateV1Schema = createPersistedPartnerStateSchema(false);
const persistedPartnerStateSchema = createPersistedPartnerStateSchema(true);
type PersistedPartnerState = z.infer<typeof persistedPartnerStateSchema>;

export function transitionPartnerMatch(status: PartnerMatchStatus, next: PartnerMatchStatus) {
  if (!allowedTransitions[status].includes(next)) throw new Error(`PARTNER_INVALID_TRANSITION:${status}:${next}`);
  return next;
}

export function containsContactDetails(body: string) {
  const formattedChinesePhone = /(?<!\d)(?:(?:\+\s*86|0086)[\s-]*)?1[3-9](?:[\s-]?\d){9}(?!\d)/;
  const email = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  const bareHandle = /(?:^|[\s：:，,；;])@[a-z0-9_\-\u4e00-\u9fff]{2,32}(?![a-z0-9_\-\u4e00-\u9fff])/iu;
  const contactLabel = /(?:微\s*信|加\s*[vVＶ]|[vV][xX]|[wW][xX]|wechat|weixin|v\s*信)\s*(?:号|id|[:：])?\s*[a-z0-9_-]{2,32}/iu;
  return formattedChinesePhone.test(body) || email.test(body) || bareHandle.test(body) || contactLabel.test(body);
}

function requireEligibility(profile: PartnerProfile) {
  const result = isPartnerEligible(profile);
  if (!result.allowed) throw new Error(result.code);
}

function requireMatch(state: PartnerStoreState, profile: PartnerProfile, matchId: string) {
  requireEligibility(profile);
  const match = state.matches[matchId];
  if (!match || match.viewerId !== profile.id) throw new Error('PARTNER_MATCH_NOT_FOUND');
  return match;
}

function requireActiveMatch(state: PartnerStoreState, profile: PartnerProfile, matchId: string) {
  const match = requireMatch(state, profile, matchId);
  if (match.status === 'blocked' || match.status === 'reported') throw new Error('PARTNER_MATCH_LOCKED');
  if (match.status !== 'matched') throw new Error('PARTNER_MATCH_NOT_READY');
  return match;
}

function collisionSafeId(prefix: string, existing: Record<string, unknown>) {
  let id = '';
  do id = `${prefix}-${crypto.randomUUID()}`;
  while (existing[id]);
  return id;
}

function stateCreator(
  set: (recipe: (state: PartnerStoreState) => Partial<PartnerStoreState>) => void,
  get: () => PartnerStoreState,
  allowPersistence: () => void = () => {},
): PartnerStoreState {
  return {
    ...initialPartnerState,
    publishIntent: (profile, intent) => {
      requireEligibility(profile);
      const parsed = validatePartnerIntent(intent);
      if (!parsed.success) throw new Error('PARTNER_INVALID_INTENT');
      set((state) => ({ intents: { ...state.intents, [profile.id]: parsed.data } }));
    },
    requestMatch: (profile, candidateId) => {
      requireEligibility(profile);
      const state = get();
      const intent = state.intents[profile.id];
      if (!intent) throw new Error('PARTNER_INTENT_REQUIRED');
      const candidates = filterPartnerCandidates(intent, demoPartnerCandidates, {
        viewerId: profile.id, blockedCandidateIds: state.blockedCandidateIds,
      });
      if (!candidates.some((candidate) => candidate.id === candidateId)) throw new Error('PARTNER_HARD_FILTERED');
      const existing = Object.values(state.matches).find((match) =>
        match.viewerId === profile.id && match.candidateId === candidateId &&
        (match.status === 'pending_mutual' || match.status === 'matched'));
      if (existing) return existing.id;
      const id = collisionSafeId('match', state.matches);
      const match: PartnerMatch = {
        id, viewerId: profile.id, candidateId, status: 'pending_mutual',
        viewerContactConsent: false, candidateContactConsent: false, messages: [],
        trustedContactAcknowledged: false, tripShared: false, checkInStatus: 'none', demoMode: true,
      };
      set((current) => ({
        matches: { ...current.matches, [id]: match },
        visibleMatchIds: [...current.visibleMatchIds, id],
      }));
      return id;
    },
    simulateMutualApproval: (profile, matchId) => set((state) => {
      const match = requireMatch(state, profile, matchId);
      return { matches: { ...state.matches, [matchId]: { ...match, status: transitionPartnerMatch(match.status, 'matched') } } };
    }),
    sendMessage: (profile, matchId, body) => {
      const match = requireActiveMatch(get(), profile, matchId);
      const normalized = body.trim();
      if (!normalized) throw new Error('PARTNER_EMPTY_MESSAGE');
      const hasContact = containsContactDetails(normalized);
      if (hasContact && !(match.viewerContactConsent && match.candidateContactConsent)) {
        return { sent: false, code: 'CONTACT_CONSENT_REQUIRED' };
      }
      set((state) => {
        const current = requireActiveMatch(state, profile, matchId);
        const message: PartnerMessage = {
          id: collisionSafeId('message', Object.fromEntries(current.messages.map(({ id }) => [id, true]))),
          senderId: profile.id, body: normalized, sentAt: new Date().toISOString(), demoMode: true,
        };
        return { matches: { ...state.matches, [matchId]: { ...current, messages: [...current.messages, message] } } };
      });
      return hasContact
        ? { sent: true, warning: '联系方式已在双方同意后发送，仍请谨慎核验并优先使用站内沟通。' }
        : { sent: true };
    },
    setContactConsent: (profile, matchId, side, consent) => set((state) => {
      const match = requireActiveMatch(state, profile, matchId);
      return { matches: { ...state.matches, [matchId]: {
        ...match, [side === 'viewer' ? 'viewerContactConsent' : 'candidateContactConsent']: consent,
      } } };
    }),
    acknowledgeTrustedContact: (profile, matchId) => set((state) => {
      const match = requireActiveMatch(state, profile, matchId);
      return { matches: { ...state.matches, [matchId]: { ...match, trustedContactAcknowledged: true } } };
    }),
    shareTrip: (profile, matchId) => set((state) => {
      const match = requireActiveMatch(state, profile, matchId);
      return { matches: { ...state.matches, [matchId]: { ...match, tripShared: true } } };
    }),
    recordCheckIn: (profile, matchId, checkInStatus) => set((state) => {
      const match = requireActiveMatch(state, profile, matchId);
      return { matches: { ...state.matches, [matchId]: { ...match, checkInStatus } } };
    }),
    blockMatch: (profile, matchId) => set((state) => lockMatch(state, profile, matchId, 'blocked')),
    reportMatch: (profile, matchId) => set((state) => lockMatch(state, profile, matchId, 'reported')),
    resetPartnerStore: () => {
      allowPersistence();
      set(() => ({ intents: {}, matches: {}, visibleMatchIds: [], blockedCandidateIds: [] }));
    },
  };
}

function lockMatch(state: PartnerStoreState, profile: PartnerProfile, matchId: string, next: 'blocked' | 'reported') {
  const match = requireMatch(state, profile, matchId);
  const status = transitionPartnerMatch(match.status, next);
  return {
    matches: { ...state.matches, [matchId]: {
      ...match,
      status,
      viewerContactConsent: false,
      candidateContactConsent: false,
    } },
    visibleMatchIds: state.visibleMatchIds.filter((id) => id !== matchId),
    blockedCandidateIds: next === 'blocked'
      ? [...new Set([...state.blockedCandidateIds, match.candidateId])]
      : state.blockedCandidateIds,
  };
}

function parsePersistedState(state: unknown): PersistedPartnerState {
  const parsed = persistedPartnerStateSchema.safeParse(state);
  if (parsed.success) return parsed.data;
  const error = new Error('PARTNER_INVALID_PERSISTED_STATE') as Error & { cause?: unknown };
  error.cause = parsed.error;
  throw error;
}

function migrateV1PersistedState(state: unknown): PersistedPartnerState {
  const legacy = persistedPartnerStateV1Schema.safeParse(state);
  if (!legacy.success) {
    const error = new Error('PARTNER_INVALID_PERSISTED_STATE') as Error & { cause?: unknown };
    error.cause = legacy.error;
    throw error;
  }
  return parsePersistedState({
    ...legacy.data,
    matches: Object.fromEntries(Object.entries(legacy.data.matches).map(([matchId, match]) => [
      matchId,
      match.status === 'blocked' || match.status === 'reported'
        ? { ...match, viewerContactConsent: false, candidateContactConsent: false }
        : match,
    ])),
  });
}

function persistenceOptions(options: CreatePartnerStoreOptions = {}) {
  return {
    name: 'xingyu-partner-demo-v1', version: 2, skipHydration: true,
    partialize: (state: PartnerStoreState): PersistedPartnerState => ({
      intents: state.intents, matches: state.matches,
      visibleMatchIds: state.visibleMatchIds, blockedCandidateIds: state.blockedCandidateIds,
    }),
    merge: (persistedState: unknown, current: PartnerStoreState): PartnerStoreState => {
      if (persistedState === undefined) return current;
      return { ...current, ...parsePersistedState(persistedState) };
    },
    migrate: (persistedState: unknown, version: number): PersistedPartnerState => {
      if (version !== 1) throw new Error(`PARTNER_UNSUPPORTED_PERSISTED_VERSION:${version}`);
      return migrateV1PersistedState(persistedState);
    },
    onRehydrateStorage: () => (_state: PartnerStoreState | undefined, error: unknown) => {
      if (error) options.onHydrationError?.(error);
    },
  };
}

function createPersistedPartnerState(options: CreatePartnerStoreOptions = {}) {
  let preserveMalformedBytes = false;
  const allowPersistence = () => { preserveMalformedBytes = false; };
  const jsonStorage = createJSONStorage<PersistedPartnerState>(() => localStorage) ?? {
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

  return persist<PartnerStoreState, [], [], PersistedPartnerState>(
    (set, get) => stateCreator(set, get, allowPersistence),
    {
      ...persistenceOptions(safeOptions),
      storage: {
        getItem: (name) => jsonStorage.getItem(name),
        setItem: (name, value) => preserveMalformedBytes ? undefined : jsonStorage.setItem(name, value),
        removeItem: (name) => preserveMalformedBytes ? undefined : jsonStorage.removeItem(name),
      },
    },
  );
}

export function createPartnerStore(options: CreatePartnerStoreOptions = {}) {
  return createStore<PartnerStoreState>()(createPersistedPartnerState(options));
}

export const usePartnerStoreHydration = create<PartnerStoreHydrationState>(() => ({ hydrated: false, hydrationError: false }));
export const usePartnerStore = create<PartnerStoreState>()(
  createPersistedPartnerState({
    onHydrationError: () => usePartnerStoreHydration.setState({ hydrationError: true }),
  }),
);

export async function hydratePartnerStore() {
  if (typeof window === 'undefined' || usePartnerStoreHydration.getState().hydrated) return;
  try {
    usePartnerStoreHydration.setState({ hydrated: false, hydrationError: false });
    await usePartnerStore.persist.rehydrate();
  } catch {
    usePartnerStoreHydration.setState({ hydrationError: true });
  } finally {
    usePartnerStoreHydration.setState({ hydrated: true });
  }
}
