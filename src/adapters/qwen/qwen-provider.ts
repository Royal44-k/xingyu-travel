import type { LLMProvider } from '@/adapters/contracts';
import { assistantResponseSchema, type AssistantResponse } from '@/domain/assistant/schema';
import type { AssistantRequest } from '@/domain/shared/api';

const qwenEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

interface QwenProviderOptions {
  apiKey: string;
  model?: string;
  fetcher?: typeof fetch;
}

export class QwenProvider implements LLMProvider {
  private readonly fetcher: typeof fetch;
  private readonly model: string;

  constructor(private readonly options: QwenProviderOptions) {
    this.fetcher = options.fetcher ?? fetch;
    this.model = options.model || 'qwen-plus';
  }

  async answer(input: AssistantRequest): Promise<AssistantResponse> {
    const response = await this.fetcher(qwenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Return only a JSON object matching the requested travel-assistant schema. Never claim real-time facts without evidence. For immediate danger, prioritize 110, 120, 119 and official channels.',
          },
          { role: 'user', content: `Trip: ${input.tripId}\nQuestion: ${input.question}` },
        ],
      }),
    });

    if (!response.ok) throw new Error('QWEN_PROVIDER_UNAVAILABLE');
    const payload = await response.json() as { model?: string; choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error('QWEN_PROVIDER_INVALID_RESPONSE');

    const parsed = assistantResponseSchema.parse(JSON.parse(content));
    return { ...parsed, demo_mode: false, model: payload.model || this.model };
  }
}
