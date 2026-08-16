'use client';

import { create } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import {
  demoPartnerCandidates,
  filterPartnerCandidates,
  isPartnerEligible,
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
}

interface CreatePartnerStoreOptions { onHydrationError?: (error: unknown) => void }
interface PartnerStoreHydrationState { hydrated: boolean; hydrationError: boolean }

const allowedTransitions: Readonly<Record<PartnerMatchStatus, readonly PartnerMatchStatus[]>> = {
  pending_mutual: ['matched', 'blocked', 'reported'],
  matched: ['blocked', 'reported'],
  blocked: [],
  reported: [],
};

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
});
const intentSchema = z.object({
  destination: z.string().trim().min(1).max(80),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  budget: z.number().finite().positive(),
  pace: z.string().trim().min(1).max(80),
  interests: z.array(z.string().trim().min(1).max(80)).min(1).max(20),
  route: z.string().trim().min(1).max(240),
  lodgingBoundary: z.string().trim().min(1).max(240),
  schedule: z.string().trim().min(1).max(240),
  socialPreference: z.string().trim().min(1).max(240),
  capacity: z.number().int().min(1).max(12),
  certificationRequired: z.boolean(),
}).strict().refine((intent) => intent.endDate >= intent.startDate);
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
const persistedPartnerStateSchema = z.object({
  intents: z.record(z.string(), intentSchema),
  matches: z.record(z.string(), matchSchema),
  visibleMatchIds: z.array(z.string()),
  blockedCandidateIds: z.array(z.string()),
}).strict().superRefine((state, context) => {
  for (const [matchId, match] of Object.entries(state.matches)) {
    if (match.id !== matchId) context.addIssue({ code: 'custom', path: ['matches', matchId], message: 'key mismatch' });
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
type PersistedPartnerState = z.infer<typeof persistedPartnerStateSchema>;

export function transitionPartnerMatch(status: PartnerMatchStatus, next: PartnerMatchStatus) {
  if (!allowedTransitions[status].includes(next)) throw new Error(`PARTNER_INVALID_TRANSITION:${status}:${next}`);
  return next;
}

export function containsContactDetails(body: string) {
  return /(?:\b1[3-9]\d{9}\b)|(?:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})|(?:(?:微信|wechat|weixin|vx|v信|wx)\s*[:：号]?\s*[a-z0-9_-]{4,})/i.test(body);
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
): PartnerStoreState {
  return {
    intents: {}, matches: {}, visibleMatchIds: [], blockedCandidateIds: [],
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
  };
}

function lockMatch(state: PartnerStoreState, profile: PartnerProfile, matchId: string, next: 'blocked' | 'reported') {
  const match = requireMatch(state, profile, matchId);
  const status = transitionPartnerMatch(match.status, next);
  return {
    matches: { ...state.matches, [matchId]: { ...match, status } },
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

function persistenceOptions(options: CreatePartnerStoreOptions = {}) {
  return {
    name: 'xingyu-partner-demo-v1', version: 1, skipHydration: true,
    partialize: (state: PartnerStoreState): PersistedPartnerState => ({
      intents: state.intents, matches: state.matches,
      visibleMatchIds: state.visibleMatchIds, blockedCandidateIds: state.blockedCandidateIds,
    }),
    merge: (persistedState: unknown, current: PartnerStoreState): PartnerStoreState => ({
      ...current, ...parsePersistedState(persistedState),
    }),
    onRehydrateStorage: () => (_state: PartnerStoreState | undefined, error: unknown) => {
      if (error) options.onHydrationError?.(error);
    },
  };
}

export function createPartnerStore(options: CreatePartnerStoreOptions = {}) {
  return createStore<PartnerStoreState>()(
    persist<PartnerStoreState, [], [], PersistedPartnerState>(stateCreator, persistenceOptions(options)),
  );
}

export const usePartnerStoreHydration = create<PartnerStoreHydrationState>(() => ({ hydrated: false, hydrationError: false }));
export const usePartnerStore = create<PartnerStoreState>()(
  persist<PartnerStoreState, [], [], PersistedPartnerState>(stateCreator, persistenceOptions({
    onHydrationError: () => usePartnerStoreHydration.setState({ hydrationError: true }),
  })),
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
