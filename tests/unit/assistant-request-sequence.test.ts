import { describe, expect, it } from 'vitest';
import { createLatestRequestGate } from '@/features/assistant/request-sequence';

describe('assistant request sequence', () => {
  it('accepts only the latest response when requests settle out of order', () => {
    const gate = createLatestRequestGate();
    const ordinaryRequest = gate.start();
    const emergencyRequest = gate.start();

    expect(gate.isLatest(emergencyRequest)).toBe(true);
    expect(gate.isLatest(ordinaryRequest)).toBe(false);
  });
});
