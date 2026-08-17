import { describe, expect, it } from 'vitest';
import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';

describe('MockAssistantProvider emergency priority', () => {
  it.each([
    '同行者失联且可能有人身危险',
    '同行者昏迷、胸痛且呼吸困难',
    '有人持刀威胁我',
    '酒店着火，有人被困',
  ])('prioritizes official emergency services for immediate danger: %s', async (question) => {
    const result = await new MockAssistantProvider().answer({
      tripId: 'dali-slow-5d',
      question,
    });

    expect(result.risk_level).toBe('critical');
    expect(result.requires_human_help).toBe(true);
    expect(result.answer).toMatch(/110/);
    expect(result.alternatives).toHaveLength(3);
    expect(result.alternatives.map((alternative) => alternative.id)).toEqual([
      'EMERGENCY-110',
      'EMERGENCY-120',
      'EMERGENCY-119',
    ]);
  });

  it('does not escalate ordinary itinerary questions into an emergency', async () => {
    const result = await new MockAssistantProvider().answer({
      tripId: 'dali-slow-5d',
      question: '下雨时大理古城附近有哪些室内安排？',
    });

    expect(result.risk_level).toBe('medium');
    expect(result.requires_human_help).toBe(false);
  });
});
