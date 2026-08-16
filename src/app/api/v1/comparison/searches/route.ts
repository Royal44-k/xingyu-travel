import { z } from 'zod';
import { comparisonProductKinds } from '@/domain/comparison/types';
import { registerComparisonSearch } from '@/domain/comparison/search-registry';
import { createRequestId } from '@/lib/request-id';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const comparisonSearchSchema = z
  .object({
    destination: z.string().trim().min(1).max(80),
    kind: z.enum(comparisonProductKinds).optional(),
    origin: z.string().trim().min(1).max(80).optional(),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    travelers: z.number().int().min(1).max(9).optional(),
  })
  .strict();

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();

  try {
    const input = comparisonSearchSchema.parse(await request.json());
    const searchId = registerComparisonSearch(input);

    return Response.json(
      { search_id: searchId, request_id: requestId, demo_mode: true },
      { status: 202 },
    );
  } catch {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'INVALID_COMPARISON_SEARCH',
          message: '比价条件无效，请检查产品类型、目的地、日期与人数。',
        },
        request_id: requestId,
        demo_mode: true,
      },
      { status: 400 },
    );
  }
}
