import type { LLMProvider } from '../contracts';
import { assistantResponseSchema, type AssistantResponse } from '@/domain/assistant/schema';
import type { AssistantRequest } from '@/domain/shared/api';
import { SANDBOX_OBSERVED_AT } from '@/data/offers';

const sandboxAssistantResponse: AssistantResponse = {
  risk_level: 'medium',
  answer: '这是固定的沙箱演示建议：请先核对行程，再选择备选交通方案。',
  alternatives: [
    {
      id: 'DEMO-ALT-TRAIN-01',
      title: '大理至丽江沙箱列车方案',
      cost: '¥128',
      duration: '2小时18分',
      risk: '中',
      actions: ['确认演示行程', '联系人工顾问'],
    },
  ],
  evidence: [
    {
      source: '星屿沙箱演示数据',
      observed_at: SANDBOX_OBSERVED_AT,
    },
  ],
  data_freshness: '固定沙箱快照：2026-08-16 09:00 CST',
  requires_human_help: false,
  demo_mode: true,
};

export class MockAssistantProvider implements LLMProvider {
  async answer(input: AssistantRequest): Promise<AssistantResponse> {
    void input;
    return assistantResponseSchema.parse(sandboxAssistantResponse);
  }
}
