import { describe, expect, it } from 'vitest';
import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';

describe('MockAssistantProvider emergency priority', () => {
  it('prioritizes official emergency services for immediate danger', async () => {
    const result = await new MockAssistantProvider().answer({
      tripId: 'dali-slow-5d',
      question: '同行者失联且可能有人身危险',
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
});
