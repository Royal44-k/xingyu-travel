import { z } from 'zod';
import type { TripDraft } from './extract-draft';

export const legacyTripDraftStorageKey = 'xingyu-demo-trip-drafts';

const legacyItineraryItemSchema = z.object({
  id: z.string().min(1).max(120),
  day: z.number().int().positive(),
  title: z.string().min(1).max(120),
  description: z.string().max(500),
  location: z.string().min(1).max(120),
}).strict();

const legacyTripDraftSchema = z.object({
  id: z.string().min(1).max(120),
  destination: z.string().min(1).max(120),
  days: z.number().int().positive().max(60),
  budget: z.number().finite().nonnegative(),
  items: z.array(legacyItineraryItemSchema).min(1).max(60),
  sourcePostSlug: z.string().min(1).max(120),
  status: z.literal('review'),
}).strict().superRefine((draft, context) => {
  if (draft.id !== `draft-${draft.sourcePostSlug}`) {
    context.addIssue({ code: 'custom', path: ['id'], message: 'draft id/slug mismatch' });
  }
  if (draft.days !== draft.items.length) {
    context.addIssue({ code: 'custom', path: ['days'], message: 'draft day count mismatch' });
  }
  if (new Set(draft.items.map((item) => item.id)).size !== draft.items.length) {
    context.addIssue({ code: 'custom', path: ['items'], message: 'duplicate item id' });
  }
});

const legacyTripDraftEnvelopeSchema = z.object({
  state: z.object({
    drafts: z.record(z.string(), legacyTripDraftSchema),
  }).strict(),
  version: z.literal(0),
}).strict().superRefine((envelope, context) => {
  for (const [slug, draft] of Object.entries(envelope.state.drafts)) {
    if (draft.sourcePostSlug !== slug) {
      context.addIssue({ code: 'custom', path: ['state', 'drafts', slug], message: 'draft key/slug mismatch' });
    }
  }
});

export function readLegacyTripDrafts(storage: Pick<Storage, 'getItem'>): TripDraft[] {
  const raw = storage.getItem(legacyTripDraftStorageKey);
  if (raw === null) return [];

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('TRIP_INVALID_LEGACY_DRAFT_BYTES');
  }
  const parsed = legacyTripDraftEnvelopeSchema.safeParse(value);
  if (!parsed.success) throw new Error('TRIP_INVALID_LEGACY_DRAFT_STATE');
  return Object.values(parsed.data.state.drafts);
}
