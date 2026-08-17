import type { LLMProvider } from '../contracts';
import { assistantResponseSchema, type AssistantResponse } from '@/domain/assistant/schema';
import type { AssistantRequest } from '@/domain/shared/api';
import { SANDBOX_OBSERVED_AT } from '@/data/offers';
import { isImmediateDanger } from '@/domain/assistant/safety';

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
    {
      id: 'DEMO-ALT-BUS-02',
      title: '大理至丽江沙箱大巴方案',
      cost: '¥95',
      duration: '3小时',
      risk: '中',
      actions: ['核对固定沙箱时间', '联系人工顾问'],
    },
    {
      id: 'DEMO-ALT-CAR-03',
      title: '大理至丽江沙箱包车方案',
      cost: '¥360',
      duration: '2小时40分',
      risk: '低',
      actions: ['核对固定沙箱费用', '联系人工顾问'],
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
  model: 'xingyu-local-demo',
};

const emergencyAssistantResponse: AssistantResponse = {
  risk_level: 'critical',
  answer: '如存在即时人身危险，请立即拨打 110 报警；如有人受伤或失去意识，请同时拨打 120；如有火灾或被困风险，请拨打 119。请优先联系现场管理方与当地官方应急渠道，不要等待行程建议。',
  alternatives: [
    {
      id: 'EMERGENCY-110',
      title: '立即联系公安机关',
      cost: '以官方处置为准',
      duration: '立即执行',
      risk: '极高',
      actions: ['拨打 110', '说明当前位置、同行者特征和最后联系时间'],
    },
    {
      id: 'EMERGENCY-120',
      title: '出现伤病时请求医疗急救',
      cost: '以官方处置为准',
      duration: '立即执行',
      risk: '极高',
      actions: ['拨打 120', '说明伤病症状与准确位置'],
    },
    {
      id: 'EMERGENCY-119',
      title: '火灾、被困或救援风险请求消防救援',
      cost: '以官方处置为准',
      duration: '立即执行',
      risk: '极高',
      actions: ['拨打 119', '远离危险区域并等待官方指引'],
    },
  ],
  evidence: [
    {
      source: '星屿沙箱应急指引',
      observed_at: SANDBOX_OBSERVED_AT,
    },
  ],
  data_freshness: '固定沙箱快照：2026-08-16 09:00 CST；紧急情况请以官方渠道为准',
  requires_human_help: true,
  demo_mode: true,
  model: 'xingyu-local-demo',
};

export class MockAssistantProvider implements LLMProvider {
  async answer(input: AssistantRequest): Promise<AssistantResponse> {
    return assistantResponseSchema.parse(
      isImmediateDanger(input.question) ? emergencyAssistantResponse : sandboxAssistantResponse,
    );
  }
}
