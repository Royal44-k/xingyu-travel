import { z } from 'zod';
import { comparisonProductKinds } from './types';

function isRealIsoDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isRealIsoDate, '日期必须是真实的 ISO 日历日期');

export const comparisonSearchSchema = z
  .object({
    destination: z.string().trim().min(2).max(60),
    kind: z.enum(comparisonProductKinds).optional(),
    origin: z.string().trim().min(1).max(60).optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    travelers: z.number().int().min(1).max(9).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.from && input.to && input.from > input.to) {
      context.addIssue({
        code: 'custom',
        path: ['to'],
        message: '结束日期不得早于开始日期',
      });
    }
  });
