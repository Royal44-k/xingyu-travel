import { z } from 'zod';

export const assistantAlternativeSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    cost: z.string().min(1),
    duration: z.string().min(1),
    risk: z.string().min(1),
    actions: z.array(z.string().min(1)),
  })
  .strict();

export const assistantEvidenceSchema = z
  .object({
    source: z.string().min(1),
    observed_at: z.string().min(1),
    url: z.url().optional(),
  })
  .strict();

export const assistantResponseSchema = z
  .object({
    risk_level: z.enum(['low', 'medium', 'high', 'critical']),
    answer: z.string().min(1),
    alternatives: z.array(assistantAlternativeSchema),
    evidence: z.array(assistantEvidenceSchema),
    data_freshness: z.string().min(1),
    requires_human_help: z.boolean(),
    demo_mode: z.boolean(),
  })
  .strict();

export type AssistantAlternative = z.infer<typeof assistantAlternativeSchema>;
export type AssistantEvidence = z.infer<typeof assistantEvidenceSchema>;
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
