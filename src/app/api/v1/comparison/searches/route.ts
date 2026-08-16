import { registerComparisonSearch } from '@/domain/comparison/search-registry';
import { comparisonSearchSchema } from '@/domain/comparison/search-schema';
import { createRequestId } from '@/lib/request-id';

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
