## Task 9: AI 旅行助手与主动行程守护

**Files:**
- Create: `src/app/api/v1/assistant/route.ts`
- Create: `src/app/api/v1/guardian/[tripId]/route.ts`
- Create: `src/adapters/qwen/qwen-provider.ts`
- Create: `src/app/assistant/page.tsx`
- Create: `src/app/guardian/[tripId]/page.tsx`
- Create: `src/features/assistant/assistant-client.tsx`
- Create: `src/features/assistant/alternative-plan.tsx`
- Create: `src/features/guardian/risk-timeline.tsx`
- Create: `src/data/risk-events.ts`
- Create: `tests/unit/emergency-priority.test.ts`
- Create: `tests/component/assistant-client.test.tsx`

**Interfaces:**
- `POST /api/v1/assistant` validates and returns `AssistantResponse`。
- `GET /api/v1/guardian/:tripId` returns `{ events, request_id, demo_mode }`。

- [ ] **Step 1: 写结构化高风险失败测试**

```ts
it('prioritizes official emergency services for immediate danger', async () => {
  const result = await mockAssistant.answer({ message: '同行者失联且可能有人身危险', tripId: 'dali-slow-5d' });
  expect(result.risk_level).toBe('critical');
  expect(result.requires_human_help).toBe(true);
  expect(result.answer).toMatch(/110/);
  expect(result.alternatives.length).toBeGreaterThanOrEqual(3);
});
```

- [ ] **Step 2: 实现模型路由和无密钥安全回退**

```ts
export function selectAssistantProvider(env: NodeJS.ProcessEnv): LLMProvider {
  if (env.DASHSCOPE_API_KEY && env.AI_PROVIDER === 'qwen') return new QwenProvider({ apiKey: env.DASHSCOPE_API_KEY });
  return mockAssistant;
}

export async function POST(request: Request) {
  const input = assistantRequestSchema.parse(await request.json());
  const result = assistantResponseSchema.parse(await selectAssistantProvider(process.env).answer(input));
  return Response.json({ ...result, request_id: createRequestId() });
}
```

`.env.example` 只包含变量名：`AI_PROVIDER=mock`、`DASHSCOPE_API_KEY=`、`QWEN_PLUS_MODEL=`、`QWEN_MAX_MODEL=`、`QWEN_FLASH_MODEL=`。

- [ ] **Step 3: 实现助手和守护体验**

助手提供规划、航变、天气、证件、人身安全快捷问题；回答显示演示/模型标识、证据时间和数据新鲜度。守护页展示风险时间线和 Plan A/B/C，每个方案显示成本、耗时、风险和明确动作，所有“选择方案”仅写入行程决策，不触发订单。

- [ ] **Step 4: 验证和提交**

Run: `pnpm vitest run tests/unit/emergency-priority.test.ts tests/unit/assistant-schema.test.ts tests/component/assistant-client.test.tsx`

Expected: PASS。

```powershell
git add src/app/api/v1/assistant src/app/api/v1/guardian src/app/assistant src/app/guardian src/features/assistant src/features/guardian src/data/risk-events.ts .env.example tests
git commit -m "feat: add structured travel assistant and guardian"
```
