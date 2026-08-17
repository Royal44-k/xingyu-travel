import type { LLMProvider } from '@/adapters/contracts';
import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
import { QwenProvider } from '@/adapters/qwen/qwen-provider';
import { assistantRequestSchema, assistantResponseSchema } from '@/domain/assistant/schema';
import { createRequestId } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

export function selectAssistantProvider(env: Readonly<Record<string, string | undefined>>): LLMProvider {
  if (env.AI_PROVIDER === 'qwen' && env.DASHSCOPE_API_KEY) {
    return new QwenProvider({ apiKey: env.DASHSCOPE_API_KEY, model: env.QWEN_PLUS_MODEL });
  }
  return new MockAssistantProvider();
}

export async function POST(request: Request): Promise<Response> {
  const requestId = createRequestId();
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return invalidRequest(requestId);
  }

  const parsed = assistantRequestSchema.safeParse(input);
  if (!parsed.success) return invalidRequest(requestId);

  try {
    const answer = assistantResponseSchema.parse(await selectAssistantProvider(process.env).answer(parsed.data));
    return Response.json({ ...answer, request_id: requestId });
  } catch {
    return Response.json({
      ok: false,
      error: { code: 'ASSISTANT_UNAVAILABLE', message: '助手暂时不可用，请稍后重试或联系人工支持。' },
      request_id: requestId,
      demo_mode: process.env.AI_PROVIDER !== 'qwen',
    }, { status: 503 });
  }
}

function invalidRequest(requestId: string): Response {
  return Response.json({
    ok: false,
    error: { code: 'INVALID_ASSISTANT_REQUEST', message: '助手问题无效，请检查行程和问题后重试。' },
    request_id: requestId,
    demo_mode: true,
  }, { status: 400 });
}
