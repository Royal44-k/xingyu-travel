## Task 5: 三类产品统一比价与增量报价

**Files:**
- Create: `src/app/compare/page.tsx`
- Create: `src/features/comparison/comparison-client.tsx`
- Create: `src/features/comparison/offer-row.tsx`
- Create: `src/features/comparison/comparison.module.css`
- Create: `src/app/api/v1/comparison/searches/route.ts`
- Create: `src/app/api/v1/comparison/searches/[id]/events/route.ts`
- Create: `src/lib/request-id.ts`
- Create: `tests/unit/quote-stream.test.ts`
- Create: `tests/component/comparison-client.test.tsx`

**Interfaces:**
- `POST /api/v1/comparison/searches` consumes `ComparisonSearchInput`, returns `{ search_id, request_id, demo_mode: true }` with status 202.
- `GET /api/v1/comparison/searches/:id/events` emits `offer`, `degraded`, `complete` events.

- [ ] **Step 1: 写 Route Handler 与 UI 失败测试**

```ts
it('returns 202 and a traceable search id', async () => {
  const response = await POST(new Request('http://test/api/v1/comparison/searches', {
    method: 'POST', body: JSON.stringify(validSearch),
  }));
  expect(response.status).toBe(202);
  await expect(response.json()).resolves.toMatchObject({ demo_mode: true, request_id: expect.any(String) });
});
```

```tsx
it('explains comparable total price and preserves partial results', async () => {
  render(<ComparisonClient initialSearch={validSearch} stream={fakeStream} />);
  expect(await screen.findByText('¥1,020 含税总价')).toBeInTheDocument();
  expect(screen.getByText('1 家供应商暂未响应')).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/unit/quote-stream.test.ts tests/component/comparison-client.test.tsx`

Expected: FAIL。

- [ ] **Step 3: 实现 202 创建接口和 SSE 事件编码器**

```ts
export async function POST(request: Request) {
  const input = comparisonSearchSchema.parse(await request.json());
  return Response.json({ search_id: stableSearchId(input), request_id: createRequestId(), demo_mode: true }, { status: 202 });
}

export function encodeSse(event: QuoteEvent): Uint8Array {
  return new TextEncoder().encode(`event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`);
}
```

- [ ] **Step 4: 实现比价页核心交互**

页面必须包含：产品标签、排序、筛选抽屉、价格日历、报价条件展开、最多三项同屏对比、收藏、降价提醒开关、供应商可信度、更新时间和模拟外跳确认层。`searchParams` 类型为 Promise 并在 Server Component 中 `await`。

```tsx
export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  return <ComparisonClient initialSearch={searchFromParams(params)} />;
}
```

- [ ] **Step 5: 验证失败降级和提交**

Run: `pnpm vitest run tests/unit/quote-stream.test.ts tests/component/comparison-client.test.tsx && pnpm typecheck`

Expected: PASS，重复报价被去重、过期报价被标记、供应商失败不清空已有结果。

```powershell
git add src/app/compare src/app/api/v1/comparison src/features/comparison src/lib/request-id.ts tests
git commit -m "feat: add transparent incremental comparison"
```
