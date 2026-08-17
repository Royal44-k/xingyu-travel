import type { LLMProvider } from '@/adapters/contracts';
import { z } from 'zod';
import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
import type { AssistantResponse } from '@/domain/assistant/schema';
import { isImmediateDanger } from '@/domain/assistant/safety';
import type { AssistantRequest } from '@/domain/shared/api';

const qwenEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const modelIntentSchema = z.object({ intent: z.enum(['plan', 'disruption', 'preparation']) }).strict();

interface QwenProviderOptions {
  apiKey: string;
  model?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

export class QwenProvider implements LLMProvider {
  private readonly fetcher: typeof fetch;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly options: QwenProviderOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.model = options.model || 'qwen-plus';
    this.timeoutMs = options.timeoutMs ?? 8_000;
  }

  async answer(input: AssistantRequest): Promise<AssistantResponse> {
    if (isImmediateDanger(input.question)) return new MockAssistantProvider().answer(input);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetcher(qwenEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Return only one JSON object: {"intent":"plan"|"disruption"|"preparation"}. Do not return travel facts, prices, times, medical, legal, or emergency text.',
            },
            { role: 'user', content: `Trip: ${input.tripId}\nQuestion: ${input.question}` },
          ],
        }),
      });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        throw providerError('QWEN_PROVIDER_TIMEOUT');
      }
      throw providerError('QWEN_PROVIDER_UNAVAILABLE');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) throw providerError('QWEN_PROVIDER_UNAVAILABLE');

    try {
      const payload = await response.json() as { model?: string; choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('missing content');
      modelIntentSchema.parse(JSON.parse(content));
      const template = await new MockAssistantProvider().answer(input);
      return { ...template, demo_mode: false, model: this.model };
    } catch (error) {
      if (error instanceof Error && error.message === 'QWEN_PROVIDER_UNSAFE_OUTPUT') throw error;
      throw providerError('QWEN_PROVIDER_INVALID_RESPONSE');
    }
  }
}

function providerError(code: string): Error {
  return new Error(code);
}
