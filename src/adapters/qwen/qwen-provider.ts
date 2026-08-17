import type { LLMProvider } from '@/adapters/contracts';
import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
import { assistantResponseSchema, type AssistantResponse } from '@/domain/assistant/schema';
import { containsUnverifiedHighStakesClaim, isImmediateDanger } from '@/domain/assistant/safety';
import type { AssistantRequest } from '@/domain/shared/api';

const qwenEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

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
              content: 'Return only a JSON object matching the requested travel-assistant schema. Do not present real-time flight, weather, venue, medical, legal, or rescue claims as verified facts. Do not diagnose, give legal conclusions, or promise emergency outcomes. For immediate danger, tell the user to contact 110, 120, 119 and official channels.',
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
      const parsed = assistantResponseSchema.parse(JSON.parse(content));
      if (parsed.risk_level === 'critical' || containsUnverifiedHighStakesClaim(parsed.answer)) {
        throw providerError('QWEN_PROVIDER_UNSAFE_OUTPUT');
      }
      return { ...parsed, demo_mode: false, model: payload.model || this.model };
    } catch (error) {
      if (error instanceof Error && error.message === 'QWEN_PROVIDER_UNSAFE_OUTPUT') throw error;
      throw providerError('QWEN_PROVIDER_INVALID_RESPONSE');
    }
  }
}

function providerError(code: string): Error {
  return new Error(code);
}
