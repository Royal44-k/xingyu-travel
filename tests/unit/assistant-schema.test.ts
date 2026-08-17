import { describe, expect, it } from 'vitest';
import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
import { assistantResponseSchema } from '@/domain/assistant/schema';

const completeResponse = {
  risk_level: 'medium',
  answer: '建议改乘固定的沙箱备选班次。',
  alternatives: [
    {
      id: 'alt-train-01',
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
      observed_at: '2026-08-16T09:00:00+08:00',
    },
  ],
  data_freshness: '固定沙箱快照：2026-08-16 09:00 CST',
  requires_human_help: false,
  demo_mode: true,
  model: 'xingyu-local-demo',
} as const;

describe('assistantResponseSchema', () => {
  it('accepts a complete structured response', () => {
    expect(assistantResponseSchema.parse(completeResponse)).toEqual(completeResponse);
  });

  it.each([
    ['risk_level'],
    ['answer'],
    ['alternatives'],
    ['evidence'],
    ['data_freshness'],
    ['requires_human_help'],
    ['demo_mode'],
    ['model'],
  ] as const)('rejects a response missing required field %s', (field) => {
    const incomplete = { ...completeResponse } as Record<string, unknown>;
    delete incomplete[field];

    expect(assistantResponseSchema.safeParse(incomplete).success).toBe(false);
  });

  it('rejects an alternative missing required actions', () => {
    const incompleteAlternative: Record<string, unknown> = { ...completeResponse.alternatives[0] };
    delete incompleteAlternative.actions;

    expect(
      assistantResponseSchema.safeParse({
        ...completeResponse,
        alternatives: [incompleteAlternative],
      }).success,
    ).toBe(false);
  });

  it('rejects evidence missing its observation timestamp', () => {
    expect(
      assistantResponseSchema.safeParse({
        ...completeResponse,
        evidence: [{ source: '星屿沙箱演示数据' }],
      }).success,
    ).toBe(false);
  });

  it('rejects a critical response unless it requires human help and prioritizes all official emergency services', () => {
    expect(
      assistantResponseSchema.safeParse({
        ...completeResponse,
        risk_level: 'critical',
        requires_human_help: true,
        answer: '请立即拨打 110。',
        alternatives: [completeResponse.alternatives[0]],
      }).success,
    ).toBe(false);
  });
});

describe('MockAssistantProvider', () => {
  it('returns a deterministic response identified as sandbox data', async () => {
    const provider = new MockAssistantProvider();

    const first = await provider.answer({ tripId: 'trip-demo-01', question: '如果下雨怎么办？' });
    const second = await provider.answer({ tripId: 'trip-demo-01', question: '换个问法仍应固定' });

    expect(first).toEqual(second);
    expect(first.demo_mode).toBe(true);
    expect(first.model).toBe('xingyu-local-demo');
    expect(first.evidence).toEqual([
      {
        source: '星屿沙箱演示数据',
        observed_at: '2026-08-16T09:00:00+08:00',
      },
    ]);
    expect(assistantResponseSchema.safeParse(first).success).toBe(true);
  });
});
