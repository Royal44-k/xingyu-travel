## Task 2: 领域契约、状态机和沙箱适配器

**Files:**
- Create: `src/domain/comparison/types.ts`
- Create: `src/domain/comparison/normalize-offer.ts`
- Create: `src/domain/partners/score-match.ts`
- Create: `src/domain/trips/state.ts`
- Create: `src/domain/assistant/schema.ts`
- Create: `src/domain/shared/api.ts`
- Create: `src/adapters/contracts.ts`
- Create: `src/adapters/mock/mock-inventory.ts`
- Create: `src/adapters/mock/mock-assistant.ts`
- Create: `src/data/offers.ts`
- Create: `tests/unit/normalize-offer.test.ts`
- Create: `tests/unit/score-match.test.ts`
- Create: `tests/unit/assistant-schema.test.ts`

**Interfaces:**
- Produces: `normalizeOffer(raw): NormalizedOffer`、`scoreMatch(intent, candidate): MatchResult`、`assistantResponseSchema`、所有 Provider 接口。
- Consumers: Tasks 5–9 的页面与 Route Handlers。

- [ ] **Step 1: 写报价与匹配规则失败测试**

```ts
// tests/unit/normalize-offer.test.ts
import { normalizeOffer } from '@/domain/comparison/normalize-offer';

it('sorts by comparable total instead of bare price', () => {
  const offer = normalizeOffer({
    id: 'MU-DAL-01', provider: '云程旅行', kind: 'flight',
    basePrice: 860, taxes: 120, mandatoryFees: 40, baggageIncluded: true,
    refundable: false, updatedAt: '2026-08-16T09:00:00+08:00',
  });
  expect(offer.totalPrice).toBe(1020);
  expect(offer.priceExplanation).toContain('税费 ¥120');
});
```

```ts
// tests/unit/score-match.test.ts
import { scoreMatch } from '@/domain/partners/score-match';

it('uses the fixed weighted model and explains the top three reasons', () => {
  const result = scoreMatch(
    { destination: '川西', dateOverlap: 1, budgetFit: 0.9, paceFit: 1, interestFit: 0.8, routeFit: 1, lodgingFit: 1, scheduleFit: 0.6, socialFit: 0.8 },
    { id: 'user-muyu', displayName: '木雨' },
  );
  expect(result.score).toBe(92);
  expect(result.reasons).toHaveLength(3);
  expect(result.reasons[0].key).toBe('date');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/unit/normalize-offer.test.ts tests/unit/score-match.test.ts`

Expected: FAIL，因为领域函数不存在。

- [ ] **Step 3: 实现可序列化领域类型和固定权重**

```ts
// src/domain/partners/score-match.ts
const weights = {
  dateOverlap: 25, budgetFit: 20, paceFit: 15, interestFit: 15,
  routeFit: 10, lodgingFit: 5, scheduleFit: 5, socialFit: 5,
} as const;

export function scoreMatch(intent: MatchSignals, candidate: MatchCandidate): MatchResult {
  const entries = Object.entries(weights).map(([key, weight]) => ({
    key: signalLabels[key as keyof MatchSignals],
    points: intent[key as keyof MatchSignals] * weight,
  }));
  const score = Math.round(entries.reduce((sum, entry) => sum + entry.points, 0));
  return { candidate, score, reasons: entries.sort((a, b) => b.points - a.points).slice(0, 3) };
}
```

```ts
// src/domain/assistant/schema.ts
import { z } from 'zod';

export const assistantResponseSchema = z.object({
  risk_level: z.enum(['low', 'medium', 'high', 'critical']),
  answer: z.string().min(1),
  alternatives: z.array(z.object({
    id: z.string(), title: z.string(), cost: z.string(), duration: z.string(), risk: z.string(), actions: z.array(z.string()),
  })),
  evidence: z.array(z.object({ source: z.string(), observed_at: z.string(), url: z.string().url().optional() })),
  data_freshness: z.string(),
  requires_human_help: z.boolean(),
  demo_mode: z.boolean(),
});
```

- [ ] **Step 4: 定义适配器边界并实现沙箱 Provider**

```ts
// src/adapters/contracts.ts
export interface InventoryProvider {
  search(input: ComparisonSearchInput): AsyncIterable<NormalizedOffer>;
}
export interface LLMProvider {
  answer(input: AssistantRequest): Promise<AssistantResponse>;
}
export interface GuardianProvider {
  getRiskEvents(tripId: string): Promise<TripRiskEvent[]>;
}
export interface RealtimeProvider {
  listMessages(matchId: string): Promise<ChatMessage[]>;
  sendMessage(matchId: string, body: string): Promise<ChatMessage>;
}
```

- [ ] **Step 5: 完成测试和提交**

Run: `pnpm vitest run tests/unit && pnpm typecheck`

Expected: PASS。

```powershell
git add src/domain src/adapters src/data tests/unit
git commit -m "feat: add travel domain contracts and sandbox adapters"
```
