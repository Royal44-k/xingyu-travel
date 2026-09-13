# Commits
f3ef8bd feat: add structured travel assistant and guardian

# Diff stat
 .env.example                                |   6 +-
 src/adapters/mock/mock-assistant.ts         |  51 +++++++++++++-
 src/adapters/qwen/qwen-provider.ts          |  50 ++++++++++++++
 src/app/api/v1/assistant/route.ts           |  48 +++++++++++++
 src/app/api/v1/guardian/[tripId]/route.ts   |  16 +++++
 src/app/assistant/page.tsx                  |   6 ++
 src/app/guardian/[tripId]/page.tsx          |  11 +++
 src/data/risk-events.ts                     |  33 +++++++++
 src/domain/assistant/schema.ts              |  25 ++++++-
 src/features/assistant/alternative-plan.tsx |  25 +++++++
 src/features/assistant/assistant-client.tsx | 101 ++++++++++++++++++++++++++++
 src/features/assistant/assistant.module.css |  33 +++++++++
 src/features/guardian/guardian.module.css   |   1 +
 src/features/guardian/risk-timeline.tsx     |  25 +++++++
 src/stores/trip-store.ts                    |  17 +++++
 tests/component/assistant-client.test.tsx   |  57 ++++++++++++++++
 tests/component/risk-timeline.test.tsx      |  29 ++++++++
 tests/unit/assistant-routes.test.ts         |  67 ++++++++++++++++++
 tests/unit/assistant-schema.test.ts         |  15 +++++
 tests/unit/emergency-priority.test.ts       |  21 ++++++
 20 files changed, 633 insertions(+), 4 deletions(-)

# Full diff
diff --git a/.env.example b/.env.example
index a87cbc0..ff3d51c 100644
--- a/.env.example
+++ b/.env.example
@@ -1 +1,5 @@
-# Reserved for future provider credentials. Do not commit real secrets.
+AI_PROVIDER=mock
+DASHSCOPE_API_KEY=
+QWEN_PLUS_MODEL=
+QWEN_MAX_MODEL=
+QWEN_FLASH_MODEL=
diff --git a/src/adapters/mock/mock-assistant.ts b/src/adapters/mock/mock-assistant.ts
index 2fd9e14..dbb9dc2 100644
--- a/src/adapters/mock/mock-assistant.ts
+++ b/src/adapters/mock/mock-assistant.ts
@@ -18,18 +18,65 @@ const sandboxAssistantResponse: AssistantResponse = {
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
+  model: 'xingyu-local-demo',
 };
 
+const emergencyAssistantResponse: AssistantResponse = {
+  risk_level: 'critical',
+  answer: '如存在即时人身危险，请立即拨打 110 报警；如有人受伤或失去意识，请同时拨打 120；如有火灾或被困风险，请拨打 119。请优先联系现场管理方与当地官方应急渠道，不要等待行程建议。',
+  alternatives: [
+    {
+      id: 'EMERGENCY-110',
+      title: '立即联系公安机关',
+      cost: '以官方处置为准',
+      duration: '立即执行',
+      risk: '极高',
+      actions: ['拨打 110', '说明当前位置、同行者特征和最后联系时间'],
+    },
+    {
+      id: 'EMERGENCY-120',
+      title: '出现伤病时请求医疗急救',
+      cost: '以官方处置为准',
+      duration: '立即执行',
+      risk: '极高',
+      actions: ['拨打 120', '说明伤病症状与准确位置'],
+    },
+    {
+      id: 'EMERGENCY-119',
+      title: '火灾、被困或救援风险请求消防救援',
+      cost: '以官方处置为准',
+      duration: '立即执行',
+      risk: '极高',
+      actions: ['拨打 119', '远离危险区域并等待官方指引'],
+    },
+  ],
+  evidence: [
+    {
+      source: '星屿沙箱应急指引',
+      observed_at: SANDBOX_OBSERVED_AT,
+    },
+  ],
+  data_freshness: '固定沙箱快照：2026-08-16 09:00 CST；紧急情况请以官方渠道为准',
+  requires_human_help: true,
+  demo_mode: true,
+  model: 'xingyu-local-demo',
+};
+
+function isImmediateDanger(question: string) {
+  return /失联|人身危险|受伤|火灾|被困/.test(question);
+}
+
 export class MockAssistantProvider implements LLMProvider {
   async answer(input: AssistantRequest): Promise<AssistantResponse> {
-    void input;
-    return assistantResponseSchema.parse(sandboxAssistantResponse);
+    return assistantResponseSchema.parse(
+      isImmediateDanger(input.question) ? emergencyAssistantResponse : sandboxAssistantResponse,
+    );
   }
 }
diff --git a/src/adapters/qwen/qwen-provider.ts b/src/adapters/qwen/qwen-provider.ts
new file mode 100644
index 0000000..14b7baf
--- /dev/null
+++ b/src/adapters/qwen/qwen-provider.ts
@@ -0,0 +1,50 @@
+import type { LLMProvider } from '@/adapters/contracts';
+import { assistantResponseSchema, type AssistantResponse } from '@/domain/assistant/schema';
+import type { AssistantRequest } from '@/domain/shared/api';
+
+const qwenEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
+
+interface QwenProviderOptions {
+  apiKey: string;
+  model?: string;
+  fetcher?: typeof fetch;
+}
+
+export class QwenProvider implements LLMProvider {
+  private readonly fetcher: typeof fetch;
+  private readonly model: string;
+
+  constructor(private readonly options: QwenProviderOptions) {
+    this.fetcher = options.fetcher ?? fetch;
+    this.model = options.model || 'qwen-plus';
+  }
+
+  async answer(input: AssistantRequest): Promise<AssistantResponse> {
+    const response = await this.fetcher(qwenEndpoint, {
+      method: 'POST',
+      headers: {
+        Authorization: `Bearer ${this.options.apiKey}`,
+        'Content-Type': 'application/json',
+      },
+      body: JSON.stringify({
+        model: this.model,
+        response_format: { type: 'json_object' },
+        messages: [
+          {
+            role: 'system',
+            content: 'Return only a JSON object matching the requested travel-assistant schema. Never claim real-time facts without evidence. For immediate danger, prioritize 110, 120, 119 and official channels.',
+          },
+          { role: 'user', content: `Trip: ${input.tripId}\nQuestion: ${input.question}` },
+        ],
+      }),
+    });
+
+    if (!response.ok) throw new Error('QWEN_PROVIDER_UNAVAILABLE');
+    const payload = await response.json() as { model?: string; choices?: Array<{ message?: { content?: string } }> };
+    const content = payload.choices?.[0]?.message?.content;
+    if (!content) throw new Error('QWEN_PROVIDER_INVALID_RESPONSE');
+
+    const parsed = assistantResponseSchema.parse(JSON.parse(content));
+    return { ...parsed, demo_mode: false, model: payload.model || this.model };
+  }
+}
diff --git a/src/app/api/v1/assistant/route.ts b/src/app/api/v1/assistant/route.ts
new file mode 100644
index 0000000..b38ece8
--- /dev/null
+++ b/src/app/api/v1/assistant/route.ts
@@ -0,0 +1,48 @@
+import type { LLMProvider } from '@/adapters/contracts';
+import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
+import { QwenProvider } from '@/adapters/qwen/qwen-provider';
+import { assistantRequestSchema, assistantResponseSchema } from '@/domain/assistant/schema';
+import { createRequestId } from '@/lib/request-id';
+
+export const dynamic = 'force-dynamic';
+
+export function selectAssistantProvider(env: Readonly<Record<string, string | undefined>>): LLMProvider {
+  if (env.AI_PROVIDER === 'qwen' && env.DASHSCOPE_API_KEY) {
+    return new QwenProvider({ apiKey: env.DASHSCOPE_API_KEY, model: env.QWEN_PLUS_MODEL });
+  }
+  return new MockAssistantProvider();
+}
+
+export async function POST(request: Request): Promise<Response> {
+  const requestId = createRequestId();
+  let input: unknown;
+  try {
+    input = await request.json();
+  } catch {
+    return invalidRequest(requestId);
+  }
+
+  const parsed = assistantRequestSchema.safeParse(input);
+  if (!parsed.success) return invalidRequest(requestId);
+
+  try {
+    const answer = assistantResponseSchema.parse(await selectAssistantProvider(process.env).answer(parsed.data));
+    return Response.json({ ...answer, request_id: requestId });
+  } catch {
+    return Response.json({
+      ok: false,
+      error: { code: 'ASSISTANT_UNAVAILABLE', message: '助手暂时不可用，请稍后重试或联系人工支持。' },
+      request_id: requestId,
+      demo_mode: process.env.AI_PROVIDER !== 'qwen',
+    }, { status: 503 });
+  }
+}
+
+function invalidRequest(requestId: string): Response {
+  return Response.json({
+    ok: false,
+    error: { code: 'INVALID_ASSISTANT_REQUEST', message: '助手问题无效，请检查行程和问题后重试。' },
+    request_id: requestId,
+    demo_mode: true,
+  }, { status: 400 });
+}
diff --git a/src/app/api/v1/guardian/[tripId]/route.ts b/src/app/api/v1/guardian/[tripId]/route.ts
new file mode 100644
index 0000000..4b2b6ed
--- /dev/null
+++ b/src/app/api/v1/guardian/[tripId]/route.ts
@@ -0,0 +1,16 @@
+import { riskEventsForTrip } from '@/data/risk-events';
+import { createRequestId } from '@/lib/request-id';
+
+export const dynamic = 'force-dynamic';
+
+export async function GET(
+  _request: Request,
+  context: { params: Promise<{ tripId: string }> },
+): Promise<Response> {
+  const { tripId } = await context.params;
+  return Response.json({
+    events: riskEventsForTrip(tripId),
+    request_id: createRequestId(),
+    demo_mode: true,
+  });
+}
diff --git a/src/app/assistant/page.tsx b/src/app/assistant/page.tsx
new file mode 100644
index 0000000..7481858
--- /dev/null
+++ b/src/app/assistant/page.tsx
@@ -0,0 +1,6 @@
+import { SiteHeader } from '@/components/site-header';
+import { AssistantClient } from '@/features/assistant/assistant-client';
+
+export default function AssistantPage() {
+  return <><SiteHeader activePath="/assistant" /><AssistantClient /></>;
+}
diff --git a/src/app/guardian/[tripId]/page.tsx b/src/app/guardian/[tripId]/page.tsx
new file mode 100644
index 0000000..eaab53b
--- /dev/null
+++ b/src/app/guardian/[tripId]/page.tsx
@@ -0,0 +1,11 @@
+import Image from 'next/image';
+import { SiteHeader } from '@/components/site-header';
+import { brandAssets } from '@/data/assets';
+import { riskEventsForTrip } from '@/data/risk-events';
+import { RiskTimeline } from '@/features/guardian/risk-timeline';
+import styles from '@/features/guardian/guardian.module.css';
+
+export default async function GuardianPage({ params }: { params: Promise<{ tripId: string }> }) {
+  const { tripId } = await params;
+  return <><SiteHeader activePath="/guardian/demo" /><main className={styles.page}><section className={styles.hero}><div className={styles.heroCopy}><p>TRIP GUARDIAN / DEMO</p><h1>先看风险，再决定下一步</h1><span>风险时间线与 Plan A/B/C 均来自固定演示事件；选择只会写入当前浏览器的行程决策。</span></div><Image alt={brandAssets.guardian.alt} className={styles.heroImage} height={brandAssets.guardian.height} priority src={brandAssets.guardian.src} width={brandAssets.guardian.width} /></section><RiskTimeline events={riskEventsForTrip(tripId)} tripId={tripId} /></main></>;
+}
diff --git a/src/data/risk-events.ts b/src/data/risk-events.ts
new file mode 100644
index 0000000..12d7188
--- /dev/null
+++ b/src/data/risk-events.ts
@@ -0,0 +1,33 @@
+import type { AssistantAlternative } from '@/domain/assistant/schema';
+import type { TripRiskEvent } from '@/domain/trips/state';
+
+export type GuardianRiskEvent = TripRiskEvent & {
+  status: 'detected' | 'notified' | 'acknowledged' | 'monitoring' | 'resolved';
+  source: string;
+  plans: AssistantAlternative[];
+};
+
+const demoPlans: AssistantAlternative[] = [
+  { id: 'PLAN-A', title: '调整苍山徒步为古城慢游', cost: '预计不增加费用', duration: '当天调整', risk: '低', actions: ['在本地行程中标记室内备选', '关注景区官方公告'] },
+  { id: 'PLAN-B', title: '改乘下午交通并延后出发', cost: '以供应商页面为准', duration: '约 3 小时', risk: '中', actions: ['自行核对实时交通', '联系人工顾问确认'] },
+  { id: 'PLAN-C', title: '保留原计划并等待官方提示', cost: '无自动下单', duration: '持续观察', risk: '高', actions: ['不进入风险区域', '按官方公告行动'] },
+];
+
+export const demoRiskEvents: GuardianRiskEvent[] = [
+  {
+    id: 'risk-dali-rain-01',
+    tripId: 'dali-slow-5d',
+    riskLevel: 'high',
+    title: '苍山沿线强降雨演示提醒',
+    description: '固定沙箱事件：仅用于展示风险提示与备选决策，不代表实时天气或景区状态。',
+    observedAt: '2026-08-16T09:00:00+08:00',
+    demoMode: true,
+    status: 'notified',
+    source: '星屿沙箱风险事件',
+    plans: demoPlans,
+  },
+];
+
+export function riskEventsForTrip(tripId: string): GuardianRiskEvent[] {
+  return demoRiskEvents.map((event) => ({ ...event, tripId }));
+}
diff --git a/src/domain/assistant/schema.ts b/src/domain/assistant/schema.ts
index 5867fb1..422ca97 100644
--- a/src/domain/assistant/schema.ts
+++ b/src/domain/assistant/schema.ts
@@ -1,12 +1,19 @@
 import { z } from 'zod';
 
+export const assistantRequestSchema = z
+  .object({
+    tripId: z.string().min(1).max(120),
+    question: z.string().min(1).max(2_000),
+  })
+  .strict();
+
 export const assistantAlternativeSchema = z
   .object({
     id: z.string().min(1),
     title: z.string().min(1),
     cost: z.string().min(1),
     duration: z.string().min(1),
     risk: z.string().min(1),
     actions: z.array(z.string().min(1)),
   })
   .strict();
@@ -21,16 +28,32 @@ export const assistantEvidenceSchema = z
 
 export const assistantResponseSchema = z
   .object({
     risk_level: z.enum(['low', 'medium', 'high', 'critical']),
     answer: z.string().min(1),
     alternatives: z.array(assistantAlternativeSchema),
     evidence: z.array(assistantEvidenceSchema),
     data_freshness: z.string().min(1),
     requires_human_help: z.boolean(),
     demo_mode: z.boolean(),
+    model: z.string().min(1),
   })
-  .strict();
+  .strict()
+  .superRefine((response, context) => {
+    if (response.risk_level !== 'critical') return;
+    if (!response.requires_human_help) {
+      context.addIssue({ code: 'custom', path: ['requires_human_help'], message: 'critical responses require human help' });
+    }
+    const emergencyGuidance = [
+      response.answer,
+      ...response.alternatives.flatMap((alternative) => [alternative.title, ...alternative.actions]),
+    ].join(' ');
+    for (const number of ['110', '120', '119']) {
+      if (!emergencyGuidance.includes(number)) {
+        context.addIssue({ code: 'custom', path: ['alternatives'], message: `critical response missing ${number}` });
+      }
+    }
+  });
 
 export type AssistantAlternative = z.infer<typeof assistantAlternativeSchema>;
 export type AssistantEvidence = z.infer<typeof assistantEvidenceSchema>;
 export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
diff --git a/src/features/assistant/alternative-plan.tsx b/src/features/assistant/alternative-plan.tsx
new file mode 100644
index 0000000..d5221aa
--- /dev/null
+++ b/src/features/assistant/alternative-plan.tsx
@@ -0,0 +1,25 @@
+import type { AssistantAlternative } from '@/domain/assistant/schema';
+import styles from './assistant.module.css';
+
+interface AlternativePlanProps {
+  alternative: AssistantAlternative;
+  index: number;
+  onSelect: (alternative: AssistantAlternative) => void;
+}
+
+export function AlternativePlan({ alternative, index, onSelect }: AlternativePlanProps) {
+  const label = String.fromCharCode(65 + index);
+  return (
+    <article aria-label={`方案 Plan ${label}`} className={styles.planCard}>
+      <p>PLAN {label}</p>
+      <h3>{alternative.title}</h3>
+      <dl>
+        <div><dt>成本</dt><dd>{alternative.cost}</dd></div>
+        <div><dt>耗时</dt><dd>{alternative.duration}</dd></div>
+        <div><dt>风险</dt><dd>{alternative.risk}</dd></div>
+      </dl>
+      <ul>{alternative.actions.map((action) => <li key={action}>{action}</li>)}</ul>
+      <button onClick={() => onSelect(alternative)} type="button">选择{alternative.title}方案</button>
+    </article>
+  );
+}
diff --git a/src/features/assistant/assistant-client.tsx b/src/features/assistant/assistant-client.tsx
new file mode 100644
index 0000000..fa466d6
--- /dev/null
+++ b/src/features/assistant/assistant-client.tsx
@@ -0,0 +1,101 @@
+'use client';
+
+import { PaperPlaneTilt, ShieldWarning, Sparkle } from '@phosphor-icons/react';
+import { useState } from 'react';
+import type { AssistantAlternative, AssistantResponse } from '@/domain/assistant/schema';
+import { useTripStore } from '@/stores/trip-store';
+import { AlternativePlan } from './alternative-plan';
+import styles from './assistant.module.css';
+
+const quickQuestions = [
+  { label: '规划建议', question: '请为我的行程给出规划建议。' },
+  { label: '航班变化', question: '航班变化时我应该如何调整行程？' },
+  { label: '天气提醒', question: '下雨天气有哪些安全的备选安排？' },
+  { label: '证件准备', question: '出发前需要核对哪些证件？' },
+  { label: '人身安全', question: '同行者失联且可能有人身危险，我现在应该怎么做？' },
+] as const;
+
+type AssistantRequest = { tripId: string; question: string };
+
+interface AssistantClientProps {
+  tripId?: string;
+  requestAssistant?: (request: AssistantRequest) => Promise<AssistantResponse>;
+}
+
+async function requestFromApi(request: AssistantRequest): Promise<AssistantResponse> {
+  const response = await fetch('/api/v1/assistant', {
+    method: 'POST',
+    headers: { 'content-type': 'application/json' },
+    body: JSON.stringify(request),
+  });
+  const payload = await response.json() as AssistantResponse | { error?: { message?: string } };
+  if (!response.ok || !('risk_level' in payload)) {
+    throw new Error('error' in payload ? payload.error?.message || '助手暂时不可用' : '助手暂时不可用');
+  }
+  return payload;
+}
+
+export function AssistantClient({ tripId = 'dali-slow-5d', requestAssistant = requestFromApi }: AssistantClientProps) {
+  const [question, setQuestion] = useState('');
+  const [result, setResult] = useState<AssistantResponse>();
+  const [error, setError] = useState<string>();
+  const [loading, setLoading] = useState(false);
+  const selectGuardianPlan = useTripStore((state) => state.selectGuardianPlan);
+
+  const ask = async (nextQuestion: string) => {
+    if (!nextQuestion.trim()) return;
+    setLoading(true);
+    setError(undefined);
+    try {
+      setResult(await requestAssistant({ tripId, question: nextQuestion }));
+    } catch (caught) {
+      setError(caught instanceof Error ? caught.message : '助手暂时不可用，请稍后重试。');
+    } finally {
+      setLoading(false);
+    }
+  };
+
+  const selectPlan = (alternative: AssistantAlternative) => {
+    selectGuardianPlan(tripId, { id: alternative.id, title: alternative.title });
+  };
+
+  return (
+    <main className={styles.page}>
+      <section className={styles.hero} aria-labelledby="assistant-title">
+        <p>AI TRAVEL ASSISTANT / DEMO</p>
+        <h1 id="assistant-title">把不确定，整理成下一步</h1>
+        <span>默认使用清晰标注的本地演示引擎；不会伪造实时航班、天气或官方救援结果。</span>
+      </section>
+
+      <section className={styles.askPanel} aria-label="咨询旅行助手">
+        <div className={styles.quickQuestions} aria-label="快捷问题">
+          {quickQuestions.map((item) => (
+            <button key={item.label} onClick={() => void ask(item.question)} type="button">{item.label}</button>
+          ))}
+        </div>
+        <form onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
+          <label htmlFor="assistant-question">你的问题</label>
+          <div>
+            <input id="assistant-question" onChange={(event) => setQuestion(event.target.value)} placeholder="例如：下雨后如何调整苍山行程？" value={question} />
+            <button disabled={loading || !question.trim()} type="submit"><PaperPlaneTilt aria-hidden size={18} />{loading ? '整理中…' : '获取建议'}</button>
+          </div>
+        </form>
+        {error ? <p className={styles.error} role="alert">{error}</p> : null}
+      </section>
+
+      {result ? (
+        <section aria-label="旅行助手回答" className={styles.result} role="region">
+          <div className={styles.resultMeta}>
+            <span className={result.risk_level === 'critical' ? styles.critical : undefined}>{result.risk_level === 'critical' ? <ShieldWarning aria-hidden size={18} /> : <Sparkle aria-hidden size={18} />}{result.risk_level === 'critical' ? '需立即人工/官方协助' : '结构化建议'}</span>
+            <span>{result.demo_mode ? `演示引擎：${result.model}` : `模型：${result.model}`}</span>
+          </div>
+          <p className={styles.answer}>{result.answer}</p>
+          <p className={styles.freshness}>数据新鲜度：{result.data_freshness}</p>
+          <div className={styles.evidence}><strong>证据与时间</strong>{result.evidence.map((item) => <span key={`${item.source}-${item.observed_at}`}>{item.source} · 证据时间：{item.observed_at}</span>)}</div>
+          <div className={styles.plans}>{result.alternatives.map((alternative, index) => <AlternativePlan alternative={alternative} index={index} key={alternative.id} onSelect={selectPlan} />)}</div>
+          <p className={styles.localStatus} role="status">方案已保存到本浏览器的旅行决策，未创建订单</p>
+        </section>
+      ) : null}
+    </main>
+  );
+}
diff --git a/src/features/assistant/assistant.module.css b/src/features/assistant/assistant.module.css
new file mode 100644
index 0000000..ce76b1f
--- /dev/null
+++ b/src/features/assistant/assistant.module.css
@@ -0,0 +1,33 @@
+.page { width: min(100% - 40px, var(--content-max)); margin: 0 auto; padding: 126px 0 80px; }
+.hero { padding: 52px; color: var(--ivory); background: linear-gradient(122deg, #17221d, #344238); border-radius: 2px 2px 30px 2px; }
+.hero p, .planCard > p { margin: 0 0 12px; color: var(--sand); font-size: 11px; font-weight: 700; letter-spacing: .16em; }
+.hero h1 { max-width: 680px; margin: 0; font-family: var(--font-display); font-size: clamp(38px, 5vw, 64px); font-weight: 500; line-height: 1.12; }
+.hero > span { display: block; max-width: 650px; margin-top: 22px; color: rgb(244 240 232 / 74%); line-height: 1.75; }
+.askPanel { margin-top: 26px; padding: 25px; background: #e8e1d5; border: 1px solid #d1c7b9; }
+.quickQuestions { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 22px; }
+.quickQuestions button, .planCard button { min-height: 38px; padding: 8px 12px; color: #443d33; background: transparent; border: 1px solid #b9ad9c; border-radius: 6px; cursor: pointer; }
+.askPanel label { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 700; }
+.askPanel form > div { display: flex; gap: 10px; }
+.askPanel input { width: 100%; min-height: 45px; padding: 10px 13px; color: var(--ink); border: 1px solid #b9ad9c; border-radius: 6px; background: #fffdf8; }
+.askPanel form button { display: inline-flex; flex: none; align-items: center; gap: 7px; min-height: 45px; padding: 10px 15px; color: var(--ivory); border: 0; border-radius: 6px; background: var(--pine); cursor: pointer; }
+.askPanel form button:disabled { cursor: not-allowed; opacity: .55; }
+.error { margin: 12px 0 0; color: #932e2a; }
+.result { margin-top: 34px; padding: 30px; background: #fffdf8; border: 1px solid #d5ccc0; border-radius: 2px 18px 2px 2px; }
+.resultMeta { display: flex; flex-wrap: wrap; gap: 10px; }
+.resultMeta span { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; color: #506452; background: #dce6da; border-radius: 999px; font-size: 12px; }
+.resultMeta .critical { color: #842820; background: #f6ded8; }
+.answer { max-width: 830px; margin: 24px 0 12px; font-family: var(--font-display); font-size: 22px; line-height: 1.7; }
+.freshness, .evidence { color: #6b645b; font-size: 13px; line-height: 1.7; }
+.evidence { display: grid; gap: 4px; padding: 15px 0; border-block: 1px solid #e1d9ce; }
+.evidence strong { color: var(--ink); }
+.plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
+.planCard { padding: 20px; background: #f3eee5; border: 1px solid #d7cec1; }
+.planCard h3 { min-height: 54px; margin: 0 0 15px; font-family: var(--font-display); font-size: 20px; }
+.planCard dl { display: grid; gap: 8px; margin: 0; }
+.planCard dl div { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
+.planCard dt { color: #746b60; }.planCard dd { margin: 0; text-align: right; }
+.planCard ul { min-height: 64px; margin: 16px 0; padding-left: 17px; color: #5f5850; font-size: 12px; line-height: 1.65; }
+.planCard button { width: 100%; color: var(--ivory); border-color: var(--pine); background: var(--pine); }
+.localStatus { margin: 17px 0 0; color: #41634e; font-size: 13px; }
+.page :is(button, input):focus-visible { outline: 3px solid var(--sand); outline-offset: 3px; }
+@media (max-width: 760px) { .page { width: min(100% - 24px, var(--content-max)); padding-top: 102px; }.hero { padding: 36px 24px; }.askPanel form > div { flex-direction: column; }.askPanel form button { justify-content: center; }.plans { grid-template-columns: 1fr; }.result { padding: 22px 18px; } }
diff --git a/src/features/guardian/guardian.module.css b/src/features/guardian/guardian.module.css
new file mode 100644
index 0000000..869f166
--- /dev/null
+++ b/src/features/guardian/guardian.module.css
@@ -0,0 +1 @@
+.page { width: min(100% - 40px, var(--content-max)); margin: 0 auto; padding: 126px 0 80px; }.hero { display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; color: var(--ivory); background: var(--pine); }.heroCopy { padding: 48px; }.heroCopy p, .eventHead p, .plan > p { margin: 0 0 11px; color: var(--sand); font-size: 11px; font-weight: 700; letter-spacing: .16em; }.hero h1 { margin: 0; font-family: var(--font-display); font-size: clamp(36px, 4.8vw, 62px); font-weight: 500; line-height: 1.15; }.hero span { display: block; margin-top: 20px; color: rgb(244 240 232 / 72%); line-height: 1.75; }.heroImage { width: 100%; height: 100%; min-height: 310px; object-fit: cover; }.timeline { margin-top: 26px; }.demoNote { margin: 0 0 16px; padding: 12px 15px; color: #674d1f; background: #f0e1ba; border-left: 3px solid #ae8440; font-size: 13px; }.event { padding: 30px; background: #fffdf8; border: 1px solid #d6cdc0; }.eventHead { display: flex; align-items: flex-start; gap: 12px; color: #963a2d; }.eventHead h2 { margin: 0; color: var(--ink); font-family: var(--font-display); font-size: 28px; }.event > p { max-width: 800px; line-height: 1.75; }.event > small { color: #6c645a; }.plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }.plan { padding: 20px; background: #f1ece3; border: 1px solid #d7cec1; }.plan h3 { min-height: 54px; margin: 0 0 15px; font-family: var(--font-display); font-size: 20px; }.plan dl { display: grid; gap: 8px; margin: 0 0 18px; }.plan dl div { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }.plan dt { color: #746b60; }.plan dd { margin: 0; text-align: right; }.plan button { width: 100%; min-height: 40px; color: var(--ivory); border: 0; border-radius: 6px; background: var(--pine); cursor: pointer; }.status { margin: 14px 0 0; color: #41634e; font-size: 13px; }.page button:focus-visible { outline: 3px solid var(--sand); outline-offset: 3px; }@media (max-width: 760px) { .page { width: min(100% - 24px, var(--content-max)); padding-top: 102px; }.hero { grid-template-columns: 1fr; }.heroCopy { padding: 36px 24px; }.heroImage { min-height: 210px; }.event { padding: 22px 18px; }.plans { grid-template-columns: 1fr; } }
diff --git a/src/features/guardian/risk-timeline.tsx b/src/features/guardian/risk-timeline.tsx
new file mode 100644
index 0000000..a16e601
--- /dev/null
+++ b/src/features/guardian/risk-timeline.tsx
@@ -0,0 +1,25 @@
+'use client';
+
+import { WarningCircle } from '@phosphor-icons/react';
+import type { GuardianRiskEvent } from '@/data/risk-events';
+import { useTripStore } from '@/stores/trip-store';
+import styles from './guardian.module.css';
+
+interface RiskTimelineProps { events: GuardianRiskEvent[]; tripId: string; }
+
+export function RiskTimeline({ events, tripId }: RiskTimelineProps) {
+  const selectGuardianPlan = useTripStore((state) => state.selectGuardianPlan);
+  return (
+    <section aria-label="行程守护风险时间线" className={styles.timeline} role="region">
+      <p className={styles.demoNote}>固定沙箱事件，不读取实时位置、天气或航班状态。</p>
+      {events.map((event) => (
+        <article className={styles.event} key={event.id}>
+          <div className={styles.eventHead}><WarningCircle aria-hidden size={22} weight="fill" /><div><p>RISK / {event.status.toUpperCase()}</p><h2>{event.title}</h2></div></div>
+          <p>{event.description}</p><small>来源：{event.source} · 证据时间：{event.observedAt}</small>
+          <div className={styles.plans}>{event.plans.map((plan, index) => <article aria-label={`Plan ${String.fromCharCode(65 + index)}`} className={styles.plan} key={plan.id}><p>PLAN {String.fromCharCode(65 + index)}</p><h3>{plan.title}</h3><dl><div><dt>成本</dt><dd>{plan.cost}</dd></div><div><dt>耗时</dt><dd>{plan.duration}</dd></div><div><dt>风险</dt><dd>{plan.risk}</dd></div></dl><button onClick={() => selectGuardianPlan(tripId, { id: plan.id, title: plan.title })} type="button">选择{plan.title}方案</button></article>)}</div>
+        </article>
+      ))}
+      <p className={styles.status} role="status">方案已保存到本浏览器的旅行决策，未创建订单</p>
+    </section>
+  );
+}
diff --git a/src/stores/trip-store.ts b/src/stores/trip-store.ts
index b24c919..f7f9de4 100644
--- a/src/stores/trip-store.ts
+++ b/src/stores/trip-store.ts
@@ -18,20 +18,25 @@ export interface WorkbenchItineraryItem {
   estimatedCost: number;
   isAlternative: boolean;
 }
 
 export interface DecisionCandidate {
   id: string;
   title: string;
   description: string;
 }
 
+export interface GuardianPlanSelection {
+  id: string;
+  title: string;
+}
+
 export interface WorkbenchTrip {
   id: string;
   sourcePostSlug: string;
   title: string;
   destination: string;
   startDate: string;
   endDate: string;
   travelers: number;
   budget: number;
   status: WorkbenchTripStatus;
@@ -40,28 +45,30 @@ export interface WorkbenchTrip {
   candidates: DecisionCandidate[];
   votes: Record<string, string>;
 }
 
 type TripSettingsPatch = Partial<Pick<WorkbenchTrip, 'startDate' | 'endDate' | 'budget'>>;
 type TripItemPatch = Partial<Pick<WorkbenchItineraryItem, 'title' | 'location' | 'estimatedCost'>>;
 
 export interface TripStoreState {
   trips: Record<string, WorkbenchTrip>;
   partnerIntents: Record<string, boolean>;
+  guardianPlans: Record<string, GuardianPlanSelection>;
   acceptDraft: (draft: TripDraft) => void;
   updateTrip: (tripId: string, patch: TripSettingsPatch) => void;
   updateItem: (tripId: string, itemId: string, patch: TripItemPatch) => void;
   reorderItem: (tripId: string, itemId: string, direction: ReorderDirection) => void;
   toggleAlternative: (tripId: string, itemId: string) => void;
   vote: (tripId: string, memberId: string, candidateId: string) => void;
   enableGuardian: (tripId: string, consent: boolean) => void;
   publishPartnerIntent: (tripId: string) => void;
+  selectGuardianPlan: (tripId: string, plan: GuardianPlanSelection) => void;
 }
 
 interface TripStoreHydrationState {
   hydrated: boolean;
   hydrationError: boolean;
 }
 
 interface CreateTripStoreOptions {
   onHydrationError?: (error: unknown) => void;
 }
@@ -136,20 +143,24 @@ const workbenchTripSchema = z.object({
   for (const [memberId, candidateId] of Object.entries(trip.votes)) {
     if (!memberIds.has(memberId) || !candidateIds.has(candidateId)) {
       context.addIssue({ code: 'custom', path: ['votes', memberId], message: 'invalid vote' });
     }
   }
 });
 
 const persistedTripStateSchema = z.object({
   trips: z.record(z.string(), workbenchTripSchema),
   partnerIntents: z.record(z.string(), z.boolean()),
+  guardianPlans: z.record(z.string(), z.object({
+    id: z.string().min(1).max(120),
+    title: z.string().min(1).max(160),
+  }).strict()).default({}),
 }).strict().superRefine((state, context) => {
   for (const [tripId, trip] of Object.entries(state.trips)) {
     if (trip.id !== tripId) {
       context.addIssue({ code: 'custom', path: ['trips', tripId, 'id'], message: 'trip key/id mismatch' });
     }
   }
   for (const tripId of Object.keys(state.partnerIntents)) {
     if (!state.trips[tripId]) {
       context.addIssue({ code: 'custom', path: ['partnerIntents', tripId], message: 'orphan intent' });
     }
@@ -218,20 +229,21 @@ function tripFromDraft(draft: TripDraft): WorkbenchTrip {
       { id: 'candidate-b', title: '苍山茶席', description: '改去苍山脚下，留一整个午后喝茶。' },
     ],
     votes: {},
   };
 }
 
 function stateCreator(set: (recipe: (state: TripStoreState) => Partial<TripStoreState>) => void) {
   return {
     trips: {},
     partnerIntents: {},
+    guardianPlans: {},
     acceptDraft: (draft: TripDraft) => set((state) => {
       const existing = Object.values(state.trips).find(
         (trip) => trip.id === draft.id || trip.sourcePostSlug === draft.sourcePostSlug,
       );
       if (existing) return {};
       const trip = tripFromDraft(draft);
       return { trips: { ...state.trips, [trip.id]: trip } };
     }),
     updateTrip: (tripId: string, patch: TripSettingsPatch) => set((state) => {
       const trip = getTrip(state, tripId);
@@ -309,42 +321,47 @@ function stateCreator(set: (recipe: (state: TripStoreState) => Partial<TripStore
         trips: {
           ...state.trips,
           [tripId]: { ...trip, status, guardianEnabled: consent },
         },
       };
     }),
     publishPartnerIntent: (tripId: string) => set((state) => {
       getTrip(state, tripId);
       return { partnerIntents: { ...state.partnerIntents, [tripId]: true } };
     }),
+    selectGuardianPlan: (tripId: string, plan: GuardianPlanSelection) => set((state) => ({
+      guardianPlans: { ...state.guardianPlans, [tripId]: plan },
+    })),
   } satisfies TripStoreState;
 }
 
 function persistenceOptions(options: CreateTripStoreOptions = {}) {
   return {
     name: 'xingyu-demo-v1',
     version: 1,
     skipHydration: true,
     partialize: (state: TripStoreState): PersistedTripState => ({
       trips: state.trips,
       partnerIntents: state.partnerIntents,
+      guardianPlans: state.guardianPlans,
     }),
     migrate: (persistedState: unknown, version: number): PersistedTripState => {
       if (version !== 0) throw new Error(`TRIP_UNSUPPORTED_PERSISTED_VERSION:${version}`);
       return parsePersistedTripState(persistedState);
     },
     merge: (persistedState: unknown, currentState: TripStoreState): TripStoreState => {
       const safeState = parsePersistedTripState(persistedState);
       return {
         ...currentState,
         trips: { ...safeState.trips, ...currentState.trips },
         partnerIntents: { ...safeState.partnerIntents, ...currentState.partnerIntents },
+        guardianPlans: { ...safeState.guardianPlans, ...currentState.guardianPlans },
       };
     },
     onRehydrateStorage: () => (_state: TripStoreState | undefined, error: unknown) => {
       if (error) options.onHydrationError?.(error);
     },
   };
 }
 
 export function createTripStore(options: CreateTripStoreOptions = {}) {
   return createStore<TripStoreState>()(
diff --git a/tests/component/assistant-client.test.tsx b/tests/component/assistant-client.test.tsx
new file mode 100644
index 0000000..6ac9165
--- /dev/null
+++ b/tests/component/assistant-client.test.tsx
@@ -0,0 +1,57 @@
+import { render, screen, within } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { beforeEach, describe, expect, it } from 'vitest';
+import { AssistantClient } from '@/features/assistant/assistant-client';
+import { useTripStore } from '@/stores/trip-store';
+
+const emergencyResponse = {
+  risk_level: 'critical' as const,
+  answer: '请立即拨打 110，并按现场官方人员指引行动。',
+  alternatives: [
+    { id: 'EMERGENCY-110', title: '联系公安机关', cost: '以官方处置为准', duration: '立即执行', risk: '极高', actions: ['拨打 110'] },
+    { id: 'EMERGENCY-120', title: '请求医疗急救', cost: '以官方处置为准', duration: '立即执行', risk: '极高', actions: ['拨打 120'] },
+    { id: 'EMERGENCY-119', title: '请求消防救援', cost: '以官方处置为准', duration: '立即执行', risk: '极高', actions: ['拨打 119'] },
+  ],
+  evidence: [{ source: '星屿沙箱应急指引', observed_at: '2026-08-16T09:00:00+08:00' }],
+  data_freshness: '固定沙箱快照：2026-08-16 09:00 CST',
+  requires_human_help: true,
+  demo_mode: true,
+  model: 'xingyu-local-demo',
+};
+
+beforeEach(() => {
+  useTripStore.setState({ trips: {}, partnerIntents: {} });
+});
+
+describe('AssistantClient', () => {
+  it('shows structured emergency advice with model and evidence labels, then saves a selected plan locally', async () => {
+    const user = userEvent.setup();
+    const requests: Array<{ tripId: string; question: string }> = [];
+    render(
+      <AssistantClient
+        requestAssistant={async (request) => {
+          requests.push(request);
+          return emergencyResponse;
+        }}
+        tripId="dali-slow-5d"
+      />,
+    );
+
+    await user.click(screen.getByRole('button', { name: '人身安全' }));
+    expect(await screen.findByText('请立即拨打 110，并按现场官方人员指引行动。')).toBeInTheDocument();
+    expect(requests).toEqual([{ tripId: 'dali-slow-5d', question: '同行者失联且可能有人身危险，我现在应该怎么做？' }]);
+
+    const result = screen.getByRole('region', { name: '旅行助手回答' });
+    expect(result).toHaveTextContent('演示引擎：xingyu-local-demo');
+    expect(result).toHaveTextContent('证据时间：2026-08-16T09:00:00+08:00');
+    expect(result).toHaveTextContent('110');
+    expect(within(result).getAllByRole('article', { name: /方案/ })).toHaveLength(3);
+
+    await user.click(within(result).getByRole('button', { name: '选择联系公安机关方案' }));
+    expect(screen.getByRole('status')).toHaveTextContent('方案已保存到本浏览器的旅行决策，未创建订单');
+    expect(useTripStore.getState().guardianPlans['dali-slow-5d']).toEqual({
+      id: 'EMERGENCY-110',
+      title: '联系公安机关',
+    });
+  });
+});
diff --git a/tests/component/risk-timeline.test.tsx b/tests/component/risk-timeline.test.tsx
new file mode 100644
index 0000000..c21d836
--- /dev/null
+++ b/tests/component/risk-timeline.test.tsx
@@ -0,0 +1,29 @@
+import { render, screen, within } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { beforeEach, describe, expect, it } from 'vitest';
+import { riskEventsForTrip } from '@/data/risk-events';
+import { RiskTimeline } from '@/features/guardian/risk-timeline';
+import { useTripStore } from '@/stores/trip-store';
+
+beforeEach(() => {
+  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
+});
+
+describe('RiskTimeline', () => {
+  it('makes demo risk freshness explicit and records a Plan A choice only in local trip decisions', async () => {
+    const user = userEvent.setup();
+    render(<RiskTimeline events={riskEventsForTrip('dali-slow-5d')} tripId="dali-slow-5d" />);
+
+    const timeline = screen.getByRole('region', { name: '行程守护风险时间线' });
+    expect(timeline).toHaveTextContent('固定沙箱事件');
+    expect(timeline).toHaveTextContent('2026-08-16T09:00:00+08:00');
+    expect(within(timeline).getAllByRole('article', { name: /Plan [ABC]/ })).toHaveLength(3);
+
+    await user.click(within(timeline).getByRole('button', { name: '选择调整苍山徒步为古城慢游方案' }));
+    expect(screen.getByRole('status')).toHaveTextContent('方案已保存到本浏览器的旅行决策，未创建订单');
+    expect(useTripStore.getState().guardianPlans['dali-slow-5d']).toEqual({
+      id: 'PLAN-A',
+      title: '调整苍山徒步为古城慢游',
+    });
+  });
+});
diff --git a/tests/unit/assistant-routes.test.ts b/tests/unit/assistant-routes.test.ts
new file mode 100644
index 0000000..c0e471a
--- /dev/null
+++ b/tests/unit/assistant-routes.test.ts
@@ -0,0 +1,67 @@
+import { afterEach, describe, expect, it, vi } from 'vitest';
+import { POST, selectAssistantProvider } from '@/app/api/v1/assistant/route';
+import { GET as getGuardian } from '@/app/api/v1/guardian/[tripId]/route';
+import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
+import { QwenProvider } from '@/adapters/qwen/qwen-provider';
+
+const environment = { ...process.env };
+
+afterEach(() => {
+  process.env = { ...environment };
+  vi.restoreAllMocks();
+});
+
+describe('assistant provider selection', () => {
+  it('keeps the labeled local demo provider unless both Qwen selection and a key are present', () => {
+    expect(selectAssistantProvider({ AI_PROVIDER: 'qwen' })).toBeInstanceOf(MockAssistantProvider);
+    expect(selectAssistantProvider({ DASHSCOPE_API_KEY: 'secret' })).toBeInstanceOf(MockAssistantProvider);
+    expect(selectAssistantProvider({ AI_PROVIDER: 'qwen', DASHSCOPE_API_KEY: 'secret' })).toBeInstanceOf(QwenProvider);
+  });
+});
+
+describe('assistant route', () => {
+  it('returns a labeled structured local-demo response with a request id', async () => {
+    process.env.AI_PROVIDER = 'mock';
+    const response = await POST(new Request('http://localhost/api/v1/assistant', {
+      method: 'POST',
+      body: JSON.stringify({ tripId: 'dali-slow-5d', question: '下雨怎么办？' }),
+    }));
+
+    expect(response.status).toBe(200);
+    await expect(response.json()).resolves.toMatchObject({
+      demo_mode: true,
+      model: 'xingyu-local-demo',
+      request_id: expect.stringMatching(/^req_/),
+    });
+  });
+
+  it('rejects malformed requests with a stable error that does not expose parser details', async () => {
+    const response = await POST(new Request('http://localhost/api/v1/assistant', {
+      method: 'POST',
+      body: JSON.stringify({ tripId: '', question: '' }),
+    }));
+
+    expect(response.status).toBe(400);
+    await expect(response.json()).resolves.toEqual({
+      ok: false,
+      error: { code: 'INVALID_ASSISTANT_REQUEST', message: '助手问题无效，请检查行程和问题后重试。' },
+      request_id: expect.any(String),
+      demo_mode: true,
+    });
+  });
+});
+
+describe('guardian route', () => {
+  it('returns fixed demo risk events with request metadata instead of claiming live monitoring', async () => {
+    const response = await getGuardian(new Request('http://localhost/api/v1/guardian/dali-slow-5d'), {
+      params: Promise.resolve({ tripId: 'dali-slow-5d' }),
+    });
+
+    expect(response.status).toBe(200);
+    await expect(response.json()).resolves.toMatchObject({
+      demo_mode: true,
+      request_id: expect.stringMatching(/^req_/),
+      events: [expect.objectContaining({ status: 'notified', source: '星屿沙箱风险事件' })],
+    });
+  });
+});
diff --git a/tests/unit/assistant-schema.test.ts b/tests/unit/assistant-schema.test.ts
index c3ae0cb..c504729 100644
--- a/tests/unit/assistant-schema.test.ts
+++ b/tests/unit/assistant-schema.test.ts
@@ -17,35 +17,37 @@ const completeResponse = {
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
+  model: 'xingyu-local-demo',
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
+    ['model'],
   ] as const)('rejects a response missing required field %s', (field) => {
     const incomplete = { ...completeResponse } as Record<string, unknown>;
     delete incomplete[field];
 
     expect(assistantResponseSchema.safeParse(incomplete).success).toBe(false);
   });
 
   it('rejects an alternative missing required actions', () => {
     const incompleteAlternative: Record<string, unknown> = { ...completeResponse.alternatives[0] };
     delete incompleteAlternative.actions;
@@ -59,30 +61,43 @@ describe('assistantResponseSchema', () => {
   });
 
   it('rejects evidence missing its observation timestamp', () => {
     expect(
       assistantResponseSchema.safeParse({
         ...completeResponse,
         evidence: [{ source: '星屿沙箱演示数据' }],
       }).success,
     ).toBe(false);
   });
+
+  it('rejects a critical response unless it requires human help and prioritizes all official emergency services', () => {
+    expect(
+      assistantResponseSchema.safeParse({
+        ...completeResponse,
+        risk_level: 'critical',
+        requires_human_help: true,
+        answer: '请立即拨打 110。',
+        alternatives: [completeResponse.alternatives[0]],
+      }).success,
+    ).toBe(false);
+  });
 });
 
 describe('MockAssistantProvider', () => {
   it('returns a deterministic response identified as sandbox data', async () => {
     const provider = new MockAssistantProvider();
 
     const first = await provider.answer({ tripId: 'trip-demo-01', question: '如果下雨怎么办？' });
     const second = await provider.answer({ tripId: 'trip-demo-01', question: '换个问法仍应固定' });
 
     expect(first).toEqual(second);
     expect(first.demo_mode).toBe(true);
+    expect(first.model).toBe('xingyu-local-demo');
     expect(first.evidence).toEqual([
       {
         source: '星屿沙箱演示数据',
         observed_at: '2026-08-16T09:00:00+08:00',
       },
     ]);
     expect(assistantResponseSchema.safeParse(first).success).toBe(true);
   });
 });
diff --git a/tests/unit/emergency-priority.test.ts b/tests/unit/emergency-priority.test.ts
new file mode 100644
index 0000000..a7dfda1
--- /dev/null
+++ b/tests/unit/emergency-priority.test.ts
@@ -0,0 +1,21 @@
+import { describe, expect, it } from 'vitest';
+import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
+
+describe('MockAssistantProvider emergency priority', () => {
+  it('prioritizes official emergency services for immediate danger', async () => {
+    const result = await new MockAssistantProvider().answer({
+      tripId: 'dali-slow-5d',
+      question: '同行者失联且可能有人身危险',
+    });
+
+    expect(result.risk_level).toBe('critical');
+    expect(result.requires_human_help).toBe(true);
+    expect(result.answer).toMatch(/110/);
+    expect(result.alternatives).toHaveLength(3);
+    expect(result.alternatives.map((alternative) => alternative.id)).toEqual([
+      'EMERGENCY-110',
+      'EMERGENCY-120',
+      'EMERGENCY-119',
+    ]);
+  });
+});
