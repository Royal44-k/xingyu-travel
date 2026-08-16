import { MockSupplierRunProvider } from '@/adapters/mock/mock-inventory';
import { findComparisonSearch } from '@/domain/comparison/search-registry';
import type {
  QuoteEvent,
  SupplierRunProvider,
} from '@/domain/comparison/types';
import type { ComparisonSearchInput } from '@/domain/shared/api';
import { createRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

export function encodeSse(event: QuoteEvent): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`,
  );
}

export async function* quoteEventsForSearch(
  input: ComparisonSearchInput,
  runner: SupplierRunProvider = new MockSupplierRunProvider(),
): AsyncIterable<QuoteEvent> {
  let offerCount = 0;

  try {
    for await (const result of runner.run(input)) {
      if (result.status === 'success') {
        for (const offer of result.offers) {
          offerCount += 1;
          yield { type: 'offer', payload: offer };
        }
      } else {
        yield {
          type: 'degraded',
          payload: { unavailableProviders: 1, message: result.message },
        };
      }
    }
  } catch {
    yield {
      type: 'degraded',
      payload: {
        unavailableProviders: 1,
        message: '供应商连接异常，已保留当前结果',
      },
    };
  } finally {
    yield { type: 'complete', payload: { offerCount } };
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const lookup = findComparisonSearch(id);

  if (lookup.status !== 'found') {
    const invalid = lookup.status === 'invalid';
    return Response.json(
      {
        ok: false,
        error: {
          code: invalid
            ? 'INVALID_COMPARISON_SEARCH_ID'
            : 'COMPARISON_SEARCH_NOT_FOUND',
          message: invalid
            ? '比价请求标识无效，请重新发起搜索。'
            : '未找到该比价请求，请重新发起搜索。',
        },
        request_id: createRequestId(),
        demo_mode: true,
      },
      { status: invalid ? 400 : 404 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const event of quoteEventsForSearch(lookup.input)) {
        controller.enqueue(encodeSse(event));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
