import { MockInventoryProvider } from '@/adapters/mock/mock-inventory';
import { findComparisonSearch } from '@/domain/comparison/search-registry';
import type { QuoteEvent } from '@/domain/comparison/types';
import { createRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

export function encodeSse(event: QuoteEvent): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`,
  );
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const input = findComparisonSearch(id);

  if (!input) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'COMPARISON_SEARCH_NOT_FOUND',
          message: '未找到该比价请求，请重新发起搜索。',
        },
        request_id: createRequestId(),
        demo_mode: true,
      },
      { status: 404 },
    );
  }

  const provider = new MockInventoryProvider();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let offerCount = 0;

      for await (const offer of provider.search(input)) {
        offerCount += 1;
        controller.enqueue(encodeSse({ type: 'offer', payload: offer }));
      }

      if (input.kind === 'flight') {
        controller.enqueue(
          encodeSse({
            type: 'degraded',
            payload: {
              unavailableProviders: 1,
              message: '1 家供应商暂未响应',
            },
          }),
        );
      }

      controller.enqueue(encodeSse({ type: 'complete', payload: { offerCount } }));
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
