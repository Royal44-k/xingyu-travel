# Commits
3b9d157 fix: harden assistant safety and guardian isolation

# Diff stat
 src/adapters/mock/mock-assistant.ts           | 21 +++++--
 src/adapters/qwen/qwen-provider.ts            | 84 ++++++++++++++++++---------
 src/app/api/v1/guardian/[tripId]/route.ts     | 13 ++++-
 src/app/guardian/[tripId]/page.tsx            |  4 +-
 src/data/risk-events.ts                       |  6 +-
 src/domain/assistant/safety.ts                | 11 ++++
 src/domain/assistant/schema.ts                |  8 ++-
 src/features/assistant/assistant-client.tsx   | 18 ++++--
 src/features/assistant/request-sequence.ts    |  7 +++
 src/stores/trip-store.ts                      | 11 ++--
 tests/component/assistant-client.test.tsx     | 22 ++++++-
 tests/component/risk-timeline.test.tsx        |  5 +-
 tests/unit/assistant-request-sequence.test.ts | 13 +++++
 tests/unit/assistant-routes.test.ts           | 14 +++++
 tests/unit/assistant-schema.test.ts           | 34 +++++++++++
 tests/unit/emergency-priority.test.ts         | 19 +++++-
 tests/unit/qwen-provider.test.ts              | 68 ++++++++++++++++++++++
 tests/unit/trip-store.test.ts                 | 10 ++++
 18 files changed, 317 insertions(+), 51 deletions(-)

# Full diff
diff --git a/src/adapters/mock/mock-assistant.ts b/src/adapters/mock/mock-assistant.ts
index dbb9dc2..fd2789e 100644
--- a/src/adapters/mock/mock-assistant.ts
+++ b/src/adapters/mock/mock-assistant.ts
@@ -1,27 +1,44 @@
 import type { LLMProvider } from '../contracts';
 import { assistantResponseSchema, type AssistantResponse } from '@/domain/assistant/schema';
 import type { AssistantRequest } from '@/domain/shared/api';
 import { SANDBOX_OBSERVED_AT } from '@/data/offers';
+import { isImmediateDanger } from '@/domain/assistant/safety';
 
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
+    {
+      id: 'DEMO-ALT-BUS-02',
+      title: '大理至丽江沙箱大巴方案',
+      cost: '¥95',
+      duration: '3小时',
+      risk: '中',
+      actions: ['核对固定沙箱时间', '联系人工顾问'],
+    },
+    {
+      id: 'DEMO-ALT-CAR-03',
+      title: '大理至丽江沙箱包车方案',
+      cost: '¥360',
+      duration: '2小时40分',
+      risk: '低',
+      actions: ['核对固定沙箱费用', '联系人工顾问'],
+    },
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
@@ -62,21 +79,17 @@ const emergencyAssistantResponse: AssistantResponse = {
       source: '星屿沙箱应急指引',
       observed_at: SANDBOX_OBSERVED_AT,
     },
   ],
   data_freshness: '固定沙箱快照：2026-08-16 09:00 CST；紧急情况请以官方渠道为准',
   requires_human_help: true,
   demo_mode: true,
   model: 'xingyu-local-demo',
 };
 
-function isImmediateDanger(question: string) {
-  return /失联|人身危险|受伤|火灾|被困/.test(question);
-}
-
 export class MockAssistantProvider implements LLMProvider {
   async answer(input: AssistantRequest): Promise<AssistantResponse> {
     return assistantResponseSchema.parse(
       isImmediateDanger(input.question) ? emergencyAssistantResponse : sandboxAssistantResponse,
     );
   }
 }
diff --git a/src/adapters/qwen/qwen-provider.ts b/src/adapters/qwen/qwen-provider.ts
index 14b7baf..4d9c75b 100644
--- a/src/adapters/qwen/qwen-provider.ts
+++ b/src/adapters/qwen/qwen-provider.ts
@@ -1,50 +1,82 @@
 import type { LLMProvider } from '@/adapters/contracts';
+import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
 import { assistantResponseSchema, type AssistantResponse } from '@/domain/assistant/schema';
+import { containsUnverifiedHighStakesClaim, isImmediateDanger } from '@/domain/assistant/safety';
 import type { AssistantRequest } from '@/domain/shared/api';
 
 const qwenEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
 
 interface QwenProviderOptions {
   apiKey: string;
   model?: string;
   fetcher?: typeof fetch;
+  timeoutMs?: number;
 }
 
 export class QwenProvider implements LLMProvider {
   private readonly fetcher: typeof fetch;
   private readonly model: string;
+  private readonly timeoutMs: number;
 
   constructor(private readonly options: QwenProviderOptions) {
     this.fetcher = options.fetcher ?? fetch;
     this.model = options.model || 'qwen-plus';
+    this.timeoutMs = options.timeoutMs ?? 8_000;
   }
 
   async answer(input: AssistantRequest): Promise<AssistantResponse> {
-    const response = await this.fetcher(qwenEndpoint, {
-      method: 'POST',
-      headers: {
-        Authorization: `Bearer ${this.options.apiKey}`,
-        'Content-Type': 'application/json',
-      },
-      body: JSON.stringify({
-        model: this.model,
-        response_format: { type: 'json_object' },
-        messages: [
-          {
-            role: 'system',
-            content: 'Return only a JSON object matching the requested travel-assistant schema. Never claim real-time facts without evidence. For immediate danger, prioritize 110, 120, 119 and official channels.',
-          },
-          { role: 'user', content: `Trip: ${input.tripId}\nQuestion: ${input.question}` },
-        ],
-      }),
-    });
-
-    if (!response.ok) throw new Error('QWEN_PROVIDER_UNAVAILABLE');
-    const payload = await response.json() as { model?: string; choices?: Array<{ message?: { content?: string } }> };
-    const content = payload.choices?.[0]?.message?.content;
-    if (!content) throw new Error('QWEN_PROVIDER_INVALID_RESPONSE');
-
-    const parsed = assistantResponseSchema.parse(JSON.parse(content));
-    return { ...parsed, demo_mode: false, model: payload.model || this.model };
+    if (isImmediateDanger(input.question)) return new MockAssistantProvider().answer(input);
+
+    const controller = new AbortController();
+    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
+    let response: Response;
+    try {
+      response = await this.fetcher(qwenEndpoint, {
+        method: 'POST',
+        headers: {
+          Authorization: `Bearer ${this.options.apiKey}`,
+          'Content-Type': 'application/json',
+        },
+        signal: controller.signal,
+        body: JSON.stringify({
+          model: this.model,
+          response_format: { type: 'json_object' },
+          messages: [
+            {
+              role: 'system',
+              content: 'Return only a JSON object matching the requested travel-assistant schema. Do not present real-time flight, weather, venue, medical, legal, or rescue claims as verified facts. Do not diagnose, give legal conclusions, or promise emergency outcomes. For immediate danger, tell the user to contact 110, 120, 119 and official channels.',
+            },
+            { role: 'user', content: `Trip: ${input.tripId}\nQuestion: ${input.question}` },
+          ],
+        }),
+      });
+    } catch (error) {
+      if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
+        throw providerError('QWEN_PROVIDER_TIMEOUT');
+      }
+      throw providerError('QWEN_PROVIDER_UNAVAILABLE');
+    } finally {
+      clearTimeout(timeout);
+    }
+
+    if (!response.ok) throw providerError('QWEN_PROVIDER_UNAVAILABLE');
+
+    try {
+      const payload = await response.json() as { model?: string; choices?: Array<{ message?: { content?: string } }> };
+      const content = payload.choices?.[0]?.message?.content;
+      if (!content) throw new Error('missing content');
+      const parsed = assistantResponseSchema.parse(JSON.parse(content));
+      if (parsed.risk_level === 'critical' || containsUnverifiedHighStakesClaim(parsed.answer)) {
+        throw providerError('QWEN_PROVIDER_UNSAFE_OUTPUT');
+      }
+      return { ...parsed, demo_mode: false, model: payload.model || this.model };
+    } catch (error) {
+      if (error instanceof Error && error.message === 'QWEN_PROVIDER_UNSAFE_OUTPUT') throw error;
+      throw providerError('QWEN_PROVIDER_INVALID_RESPONSE');
+    }
   }
 }
+
+function providerError(code: string): Error {
+  return new Error(code);
+}
diff --git a/src/app/api/v1/guardian/[tripId]/route.ts b/src/app/api/v1/guardian/[tripId]/route.ts
index 4b2b6ed..1aaa7a4 100644
--- a/src/app/api/v1/guardian/[tripId]/route.ts
+++ b/src/app/api/v1/guardian/[tripId]/route.ts
@@ -1,16 +1,25 @@
-import { riskEventsForTrip } from '@/data/risk-events';
+import { isKnownGuardianTrip, riskEventsForTrip } from '@/data/risk-events';
 import { createRequestId } from '@/lib/request-id';
 
 export const dynamic = 'force-dynamic';
 
 export async function GET(
   _request: Request,
   context: { params: Promise<{ tripId: string }> },
 ): Promise<Response> {
   const { tripId } = await context.params;
+  const requestId = createRequestId();
+  if (!isKnownGuardianTrip(tripId)) {
+    return Response.json({
+      ok: false,
+      error: { code: 'GUARDIAN_TRIP_NOT_FOUND', message: '未找到该行程，无法显示守护信息。' },
+      request_id: requestId,
+      demo_mode: true,
+    }, { status: 404 });
+  }
   return Response.json({
     events: riskEventsForTrip(tripId),
-    request_id: createRequestId(),
+    request_id: requestId,
     demo_mode: true,
   });
 }
diff --git a/src/app/guardian/[tripId]/page.tsx b/src/app/guardian/[tripId]/page.tsx
index eaab53b..9c08748 100644
--- a/src/app/guardian/[tripId]/page.tsx
+++ b/src/app/guardian/[tripId]/page.tsx
@@ -1,11 +1,13 @@
 import Image from 'next/image';
+import { notFound } from 'next/navigation';
 import { SiteHeader } from '@/components/site-header';
 import { brandAssets } from '@/data/assets';
-import { riskEventsForTrip } from '@/data/risk-events';
+import { isKnownGuardianTrip, riskEventsForTrip } from '@/data/risk-events';
 import { RiskTimeline } from '@/features/guardian/risk-timeline';
 import styles from '@/features/guardian/guardian.module.css';
 
 export default async function GuardianPage({ params }: { params: Promise<{ tripId: string }> }) {
   const { tripId } = await params;
+  if (!isKnownGuardianTrip(tripId)) notFound();
   return <><SiteHeader activePath="/guardian/demo" /><main className={styles.page}><section className={styles.hero}><div className={styles.heroCopy}><p>TRIP GUARDIAN / DEMO</p><h1>先看风险，再决定下一步</h1><span>风险时间线与 Plan A/B/C 均来自固定演示事件；选择只会写入当前浏览器的行程决策。</span></div><Image alt={brandAssets.guardian.alt} className={styles.heroImage} height={brandAssets.guardian.height} priority src={brandAssets.guardian.src} width={brandAssets.guardian.width} /></section><RiskTimeline events={riskEventsForTrip(tripId)} tripId={tripId} /></main></>;
 }
diff --git a/src/data/risk-events.ts b/src/data/risk-events.ts
index 12d7188..177c63b 100644
--- a/src/data/risk-events.ts
+++ b/src/data/risk-events.ts
@@ -21,13 +21,17 @@ export const demoRiskEvents: GuardianRiskEvent[] = [
     title: '苍山沿线强降雨演示提醒',
     description: '固定沙箱事件：仅用于展示风险提示与备选决策，不代表实时天气或景区状态。',
     observedAt: '2026-08-16T09:00:00+08:00',
     demoMode: true,
     status: 'notified',
     source: '星屿沙箱风险事件',
     plans: demoPlans,
   },
 ];
 
+export function isKnownGuardianTrip(tripId: string): boolean {
+  return demoRiskEvents.some((event) => event.tripId === tripId);
+}
+
 export function riskEventsForTrip(tripId: string): GuardianRiskEvent[] {
-  return demoRiskEvents.map((event) => ({ ...event, tripId }));
+  return demoRiskEvents.filter((event) => event.tripId === tripId);
 }
diff --git a/src/domain/assistant/safety.ts b/src/domain/assistant/safety.ts
new file mode 100644
index 0000000..6b6928c
--- /dev/null
+++ b/src/domain/assistant/safety.ts
@@ -0,0 +1,11 @@
+const immediateDangerPattern = /失联|人身危险|昏迷|晕厥|失去意识|胸痛|呼吸困难|大出血|抽搐|持刀|暴力袭击|绑架|火灾|着火|被困/;
+
+export function isImmediateDanger(question: string): boolean {
+  return immediateDangerPattern.test(question);
+}
+
+const unverifiedClaimPattern = /实时|当前航班|(?:航班|天气|景区).{0,12}(?:已|将|正在).{0,8}(?:延误|取消|关闭|下雨)|确诊|诊断|法律结论|违法|救援(?:已|正在)|已报警|已联系/;
+
+export function containsUnverifiedHighStakesClaim(answer: string): boolean {
+  return unverifiedClaimPattern.test(answer);
+}
diff --git a/src/domain/assistant/schema.ts b/src/domain/assistant/schema.ts
index 422ca97..5075bb0 100644
--- a/src/domain/assistant/schema.ts
+++ b/src/domain/assistant/schema.ts
@@ -7,37 +7,41 @@ export const assistantRequestSchema = z
   })
   .strict();
 
 export const assistantAlternativeSchema = z
   .object({
     id: z.string().min(1),
     title: z.string().min(1),
     cost: z.string().min(1),
     duration: z.string().min(1),
     risk: z.string().min(1),
-    actions: z.array(z.string().min(1)),
+    actions: z.array(z.string().min(1)).min(1),
   })
   .strict();
 
 export const assistantEvidenceSchema = z
   .object({
     source: z.string().min(1),
     observed_at: z.string().min(1),
     url: z.url().optional(),
   })
   .strict();
 
 export const assistantResponseSchema = z
   .object({
     risk_level: z.enum(['low', 'medium', 'high', 'critical']),
     answer: z.string().min(1),
-    alternatives: z.array(assistantAlternativeSchema),
+    alternatives: z.array(assistantAlternativeSchema).length(3).superRefine((alternatives, context) => {
+      if (new Set(alternatives.map((alternative) => alternative.id)).size !== alternatives.length) {
+        context.addIssue({ code: 'custom', message: 'duplicate alternative id' });
+      }
+    }),
     evidence: z.array(assistantEvidenceSchema),
     data_freshness: z.string().min(1),
     requires_human_help: z.boolean(),
     demo_mode: z.boolean(),
     model: z.string().min(1),
   })
   .strict()
   .superRefine((response, context) => {
     if (response.risk_level !== 'critical') return;
     if (!response.requires_human_help) {
diff --git a/src/features/assistant/assistant-client.tsx b/src/features/assistant/assistant-client.tsx
index fa466d6..88cc15d 100644
--- a/src/features/assistant/assistant-client.tsx
+++ b/src/features/assistant/assistant-client.tsx
@@ -1,17 +1,18 @@
 'use client';
 
 import { PaperPlaneTilt, ShieldWarning, Sparkle } from '@phosphor-icons/react';
-import { useState } from 'react';
+import { useRef, useState } from 'react';
 import type { AssistantAlternative, AssistantResponse } from '@/domain/assistant/schema';
 import { useTripStore } from '@/stores/trip-store';
 import { AlternativePlan } from './alternative-plan';
+import { createLatestRequestGate } from './request-sequence';
 import styles from './assistant.module.css';
 
 const quickQuestions = [
   { label: '规划建议', question: '请为我的行程给出规划建议。' },
   { label: '航班变化', question: '航班变化时我应该如何调整行程？' },
   { label: '天气提醒', question: '下雨天气有哪些安全的备选安排？' },
   { label: '证件准备', question: '出发前需要核对哪些证件？' },
   { label: '人身安全', question: '同行者失联且可能有人身危险，我现在应该怎么做？' },
 ] as const;
 
@@ -33,51 +34,56 @@ async function requestFromApi(request: AssistantRequest): Promise<AssistantRespo
     throw new Error('error' in payload ? payload.error?.message || '助手暂时不可用' : '助手暂时不可用');
   }
   return payload;
 }
 
 export function AssistantClient({ tripId = 'dali-slow-5d', requestAssistant = requestFromApi }: AssistantClientProps) {
   const [question, setQuestion] = useState('');
   const [result, setResult] = useState<AssistantResponse>();
   const [error, setError] = useState<string>();
   const [loading, setLoading] = useState(false);
+  const requestGate = useRef(createLatestRequestGate());
   const selectGuardianPlan = useTripStore((state) => state.selectGuardianPlan);
 
   const ask = async (nextQuestion: string) => {
-    if (!nextQuestion.trim()) return;
+    if (!nextQuestion.trim() || loading) return;
+    const request = requestGate.current.start();
     setLoading(true);
     setError(undefined);
     try {
-      setResult(await requestAssistant({ tripId, question: nextQuestion }));
+      const response = await requestAssistant({ tripId, question: nextQuestion });
+      if (requestGate.current.isLatest(request)) setResult(response);
     } catch (caught) {
-      setError(caught instanceof Error ? caught.message : '助手暂时不可用，请稍后重试。');
+      if (requestGate.current.isLatest(request)) {
+        setError(caught instanceof Error ? caught.message : '助手暂时不可用，请稍后重试。');
+      }
     } finally {
-      setLoading(false);
+      if (requestGate.current.isLatest(request)) setLoading(false);
     }
   };
 
   const selectPlan = (alternative: AssistantAlternative) => {
     selectGuardianPlan(tripId, { id: alternative.id, title: alternative.title });
   };
 
   return (
     <main className={styles.page}>
       <section className={styles.hero} aria-labelledby="assistant-title">
         <p>AI TRAVEL ASSISTANT / DEMO</p>
         <h1 id="assistant-title">把不确定，整理成下一步</h1>
         <span>默认使用清晰标注的本地演示引擎；不会伪造实时航班、天气或官方救援结果。</span>
       </section>
 
       <section className={styles.askPanel} aria-label="咨询旅行助手">
         <div className={styles.quickQuestions} aria-label="快捷问题">
           {quickQuestions.map((item) => (
-            <button key={item.label} onClick={() => void ask(item.question)} type="button">{item.label}</button>
+            <button disabled={loading} key={item.label} onClick={() => void ask(item.question)} type="button">{item.label}</button>
           ))}
         </div>
         <form onSubmit={(event) => { event.preventDefault(); void ask(question); }}>
           <label htmlFor="assistant-question">你的问题</label>
           <div>
             <input id="assistant-question" onChange={(event) => setQuestion(event.target.value)} placeholder="例如：下雨后如何调整苍山行程？" value={question} />
             <button disabled={loading || !question.trim()} type="submit"><PaperPlaneTilt aria-hidden size={18} />{loading ? '整理中…' : '获取建议'}</button>
           </div>
         </form>
         {error ? <p className={styles.error} role="alert">{error}</p> : null}
diff --git a/src/features/assistant/request-sequence.ts b/src/features/assistant/request-sequence.ts
new file mode 100644
index 0000000..674f531
--- /dev/null
+++ b/src/features/assistant/request-sequence.ts
@@ -0,0 +1,7 @@
+export function createLatestRequestGate() {
+  let latest = 0;
+  return {
+    start: () => ++latest,
+    isLatest: (request: number) => request === latest,
+  };
+}
diff --git a/src/stores/trip-store.ts b/src/stores/trip-store.ts
index f7f9de4..b49e815 100644
--- a/src/stores/trip-store.ts
+++ b/src/stores/trip-store.ts
@@ -186,21 +186,23 @@ export function transitionTrip(
   }
   return next;
 }
 
 export function getBudgetSummary(trip: WorkbenchTrip) {
   const itemTotals = trip.items.map((item) => item.estimatedCost);
   return { itemTotals, overall: itemTotals.reduce((sum, cost) => sum + cost, 0) };
 }
 
 function getTrip(state: TripStoreState, tripId: string): WorkbenchTrip {
-  const trip = state.trips[tripId];
+  const trip = state.trips[tripId] ?? Object.values(state.trips).find(
+    (candidate) => candidate.sourcePostSlug === tripId,
+  );
   if (!trip) throw new Error(`TRIP_NOT_FOUND:${tripId}`);
   return trip;
 }
 
 function validateSettings(patch: TripSettingsPatch) {
   if (patch.budget !== undefined && (!Number.isFinite(patch.budget) || patch.budget < 0)) {
     throw new Error('TRIP_INVALID_BUDGET');
   }
   if (patch.startDate && patch.endDate && patch.endDate < patch.startDate) {
     throw new Error('TRIP_INVALID_DATE_RANGE');
@@ -321,23 +323,24 @@ function stateCreator(set: (recipe: (state: TripStoreState) => Partial<TripStore
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
-    selectGuardianPlan: (tripId: string, plan: GuardianPlanSelection) => set((state) => ({
-      guardianPlans: { ...state.guardianPlans, [tripId]: plan },
-    })),
+    selectGuardianPlan: (tripId: string, plan: GuardianPlanSelection) => set((state) => {
+      const trip = getTrip(state, tripId);
+      return { guardianPlans: { ...state.guardianPlans, [trip.id]: plan } };
+    }),
   } satisfies TripStoreState;
 }
 
 function persistenceOptions(options: CreateTripStoreOptions = {}) {
   return {
     name: 'xingyu-demo-v1',
     version: 1,
     skipHydration: true,
     partialize: (state: TripStoreState): PersistedTripState => ({
       trips: state.trips,
diff --git a/tests/component/assistant-client.test.tsx b/tests/component/assistant-client.test.tsx
index 6ac9165..081d61d 100644
--- a/tests/component/assistant-client.test.tsx
+++ b/tests/component/assistant-client.test.tsx
@@ -1,33 +1,36 @@
 import { render, screen, within } from '@testing-library/react';
 import userEvent from '@testing-library/user-event';
 import { beforeEach, describe, expect, it } from 'vitest';
 import { AssistantClient } from '@/features/assistant/assistant-client';
+import { postsBySlug } from '@/data/posts';
+import { extractTripDraft } from '@/domain/trips/extract-draft';
 import { useTripStore } from '@/stores/trip-store';
 
 const emergencyResponse = {
   risk_level: 'critical' as const,
   answer: '请立即拨打 110，并按现场官方人员指引行动。',
   alternatives: [
     { id: 'EMERGENCY-110', title: '联系公安机关', cost: '以官方处置为准', duration: '立即执行', risk: '极高', actions: ['拨打 110'] },
     { id: 'EMERGENCY-120', title: '请求医疗急救', cost: '以官方处置为准', duration: '立即执行', risk: '极高', actions: ['拨打 120'] },
     { id: 'EMERGENCY-119', title: '请求消防救援', cost: '以官方处置为准', duration: '立即执行', risk: '极高', actions: ['拨打 119'] },
   ],
   evidence: [{ source: '星屿沙箱应急指引', observed_at: '2026-08-16T09:00:00+08:00' }],
   data_freshness: '固定沙箱快照：2026-08-16 09:00 CST',
   requires_human_help: true,
   demo_mode: true,
   model: 'xingyu-local-demo',
 };
 
 beforeEach(() => {
-  useTripStore.setState({ trips: {}, partnerIntents: {} });
+  useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
+  useTripStore.getState().acceptDraft(extractTripDraft(postsBySlug['dali-slow-5d']));
 });
 
 describe('AssistantClient', () => {
   it('shows structured emergency advice with model and evidence labels, then saves a selected plan locally', async () => {
     const user = userEvent.setup();
     const requests: Array<{ tripId: string; question: string }> = [];
     render(
       <AssistantClient
         requestAssistant={async (request) => {
           requests.push(request);
@@ -42,16 +45,31 @@ describe('AssistantClient', () => {
     expect(requests).toEqual([{ tripId: 'dali-slow-5d', question: '同行者失联且可能有人身危险，我现在应该怎么做？' }]);
 
     const result = screen.getByRole('region', { name: '旅行助手回答' });
     expect(result).toHaveTextContent('演示引擎：xingyu-local-demo');
     expect(result).toHaveTextContent('证据时间：2026-08-16T09:00:00+08:00');
     expect(result).toHaveTextContent('110');
     expect(within(result).getAllByRole('article', { name: /方案/ })).toHaveLength(3);
 
     await user.click(within(result).getByRole('button', { name: '选择联系公安机关方案' }));
     expect(screen.getByRole('status')).toHaveTextContent('方案已保存到本浏览器的旅行决策，未创建订单');
-    expect(useTripStore.getState().guardianPlans['dali-slow-5d']).toEqual({
+    expect(useTripStore.getState().guardianPlans['draft-dali-slow-5d']).toEqual({
       id: 'EMERGENCY-110',
       title: '联系公安机关',
     });
   });
+
+  it('blocks a second shortcut while the current request is pending', async () => {
+    const user = userEvent.setup();
+    const requests: Array<{ tripId: string; question: string }> = [];
+    render(<AssistantClient requestAssistant={(request) => {
+      requests.push(request);
+      return new Promise(() => undefined);
+    }} tripId="dali-slow-5d" />);
+
+    await user.click(screen.getByRole('button', { name: '规划建议' }));
+    expect(screen.getByRole('button', { name: '人身安全' })).toBeDisabled();
+    expect(screen.getByRole('button', { name: '整理中…' })).toBeDisabled();
+    await user.click(screen.getByRole('button', { name: '人身安全' }));
+    expect(requests).toEqual([{ tripId: 'dali-slow-5d', question: '请为我的行程给出规划建议。' }]);
+  });
 });
diff --git a/tests/component/risk-timeline.test.tsx b/tests/component/risk-timeline.test.tsx
index c21d836..09fb32b 100644
--- a/tests/component/risk-timeline.test.tsx
+++ b/tests/component/risk-timeline.test.tsx
@@ -1,29 +1,32 @@
 import { render, screen, within } from '@testing-library/react';
 import userEvent from '@testing-library/user-event';
 import { beforeEach, describe, expect, it } from 'vitest';
 import { riskEventsForTrip } from '@/data/risk-events';
+import { postsBySlug } from '@/data/posts';
+import { extractTripDraft } from '@/domain/trips/extract-draft';
 import { RiskTimeline } from '@/features/guardian/risk-timeline';
 import { useTripStore } from '@/stores/trip-store';
 
 beforeEach(() => {
   useTripStore.setState({ trips: {}, partnerIntents: {}, guardianPlans: {} });
+  useTripStore.getState().acceptDraft(extractTripDraft(postsBySlug['dali-slow-5d']));
 });
 
 describe('RiskTimeline', () => {
   it('makes demo risk freshness explicit and records a Plan A choice only in local trip decisions', async () => {
     const user = userEvent.setup();
     render(<RiskTimeline events={riskEventsForTrip('dali-slow-5d')} tripId="dali-slow-5d" />);
 
     const timeline = screen.getByRole('region', { name: '行程守护风险时间线' });
     expect(timeline).toHaveTextContent('固定沙箱事件');
     expect(timeline).toHaveTextContent('2026-08-16T09:00:00+08:00');
     expect(within(timeline).getAllByRole('article', { name: /Plan [ABC]/ })).toHaveLength(3);
 
     await user.click(within(timeline).getByRole('button', { name: '选择调整苍山徒步为古城慢游方案' }));
     expect(screen.getByRole('status')).toHaveTextContent('方案已保存到本浏览器的旅行决策，未创建订单');
-    expect(useTripStore.getState().guardianPlans['dali-slow-5d']).toEqual({
+    expect(useTripStore.getState().guardianPlans['draft-dali-slow-5d']).toEqual({
       id: 'PLAN-A',
       title: '调整苍山徒步为古城慢游',
     });
   });
 });
diff --git a/tests/unit/assistant-request-sequence.test.ts b/tests/unit/assistant-request-sequence.test.ts
new file mode 100644
index 0000000..b11c536
--- /dev/null
+++ b/tests/unit/assistant-request-sequence.test.ts
@@ -0,0 +1,13 @@
+import { describe, expect, it } from 'vitest';
+import { createLatestRequestGate } from '@/features/assistant/request-sequence';
+
+describe('assistant request sequence', () => {
+  it('accepts only the latest response when requests settle out of order', () => {
+    const gate = createLatestRequestGate();
+    const ordinaryRequest = gate.start();
+    const emergencyRequest = gate.start();
+
+    expect(gate.isLatest(emergencyRequest)).toBe(true);
+    expect(gate.isLatest(ordinaryRequest)).toBe(false);
+  });
+});
diff --git a/tests/unit/assistant-routes.test.ts b/tests/unit/assistant-routes.test.ts
index c0e471a..18ea623 100644
--- a/tests/unit/assistant-routes.test.ts
+++ b/tests/unit/assistant-routes.test.ts
@@ -57,11 +57,25 @@ describe('guardian route', () => {
       params: Promise.resolve({ tripId: 'dali-slow-5d' }),
     });
 
     expect(response.status).toBe(200);
     await expect(response.json()).resolves.toMatchObject({
       demo_mode: true,
       request_id: expect.stringMatching(/^req_/),
       events: [expect.objectContaining({ status: 'notified', source: '星屿沙箱风险事件' })],
     });
   });
+
+  it('fails closed for an unknown trip instead of relabeling a demo event', async () => {
+    const response = await getGuardian(new Request('http://localhost/api/v1/guardian/unknown-trip'), {
+      params: Promise.resolve({ tripId: 'unknown-trip' }),
+    });
+
+    expect(response.status).toBe(404);
+    await expect(response.json()).resolves.toEqual({
+      ok: false,
+      error: { code: 'GUARDIAN_TRIP_NOT_FOUND', message: '未找到该行程，无法显示守护信息。' },
+      request_id: expect.any(String),
+      demo_mode: true,
+    });
+  });
 });
diff --git a/tests/unit/assistant-schema.test.ts b/tests/unit/assistant-schema.test.ts
index c504729..1814ad5 100644
--- a/tests/unit/assistant-schema.test.ts
+++ b/tests/unit/assistant-schema.test.ts
@@ -7,20 +7,36 @@ const completeResponse = {
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
+    {
+      id: 'alt-train-02',
+      title: '大理至丽江沙箱大巴方案',
+      cost: '¥95',
+      duration: '3小时',
+      risk: '中',
+      actions: ['确认演示行程'],
+    },
+    {
+      id: 'alt-train-03',
+      title: '大理至丽江沙箱包车方案',
+      cost: '¥360',
+      duration: '2小时40分',
+      risk: '低',
+      actions: ['联系人工顾问'],
+    },
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
@@ -53,20 +69,38 @@ describe('assistantResponseSchema', () => {
     delete incompleteAlternative.actions;
 
     expect(
       assistantResponseSchema.safeParse({
         ...completeResponse,
         alternatives: [incompleteAlternative],
       }).success,
     ).toBe(false);
   });
 
+  it('rejects alternatives that do not form exactly three uniquely identified Plan A/B/C choices', () => {
+    expect(
+      assistantResponseSchema.safeParse({
+        ...completeResponse,
+        alternatives: completeResponse.alternatives.slice(0, 2),
+      }).success,
+    ).toBe(false);
+  });
+
+  it('rejects a plan with no concrete action', () => {
+    expect(
+      assistantResponseSchema.safeParse({
+        ...completeResponse,
+        alternatives: [{ ...completeResponse.alternatives[0], actions: [] }, ...completeResponse.alternatives.slice(1)],
+      }).success,
+    ).toBe(false);
+  });
+
   it('rejects evidence missing its observation timestamp', () => {
     expect(
       assistantResponseSchema.safeParse({
         ...completeResponse,
         evidence: [{ source: '星屿沙箱演示数据' }],
       }).success,
     ).toBe(false);
   });
 
   it('rejects a critical response unless it requires human help and prioritizes all official emergency services', () => {
diff --git a/tests/unit/emergency-priority.test.ts b/tests/unit/emergency-priority.test.ts
index a7dfda1..ac8971a 100644
--- a/tests/unit/emergency-priority.test.ts
+++ b/tests/unit/emergency-priority.test.ts
@@ -1,21 +1,36 @@
 import { describe, expect, it } from 'vitest';
 import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
 
 describe('MockAssistantProvider emergency priority', () => {
-  it('prioritizes official emergency services for immediate danger', async () => {
+  it.each([
+    '同行者失联且可能有人身危险',
+    '同行者昏迷、胸痛且呼吸困难',
+    '有人持刀威胁我',
+    '酒店着火，有人被困',
+  ])('prioritizes official emergency services for immediate danger: %s', async (question) => {
     const result = await new MockAssistantProvider().answer({
       tripId: 'dali-slow-5d',
-      question: '同行者失联且可能有人身危险',
+      question,
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
+
+  it('does not escalate ordinary itinerary questions into an emergency', async () => {
+    const result = await new MockAssistantProvider().answer({
+      tripId: 'dali-slow-5d',
+      question: '下雨时大理古城附近有哪些室内安排？',
+    });
+
+    expect(result.risk_level).toBe('medium');
+    expect(result.requires_human_help).toBe(false);
+  });
 });
diff --git a/tests/unit/qwen-provider.test.ts b/tests/unit/qwen-provider.test.ts
new file mode 100644
index 0000000..c4db6f0
--- /dev/null
+++ b/tests/unit/qwen-provider.test.ts
@@ -0,0 +1,68 @@
+import { describe, expect, it, vi } from 'vitest';
+import { QwenProvider } from '@/adapters/qwen/qwen-provider';
+
+const structuredAnswer = {
+  risk_level: 'low' as const,
+  answer: '这是模型生成的通用行程整理建议，不代表实时事实。',
+  alternatives: [
+    { id: 'MODEL-A', title: 'Plan A', cost: '¥0', duration: '当天', risk: '低', actions: ['自行核对公开信息'] },
+    { id: 'MODEL-B', title: 'Plan B', cost: '¥80', duration: '2小时', risk: '中', actions: ['联系人工顾问'] },
+    { id: 'MODEL-C', title: 'Plan C', cost: '¥160', duration: '3小时', risk: '中', actions: ['保留本地行程决定'] },
+  ],
+  evidence: [],
+  data_freshness: '模型回答不含实时数据',
+  requires_human_help: false,
+  demo_mode: false,
+  model: 'untrusted-model-label',
+};
+
+function qwenResponse(content: string, status = 200): Response {
+  return new Response(JSON.stringify({
+    model: 'qwen-plus',
+    choices: [{ message: { content } }],
+  }), { status });
+}
+
+function provider(fetcher: typeof fetch) {
+  return new QwenProvider({ apiKey: 'not-a-real-key', model: 'qwen-plus', fetcher });
+}
+
+describe('QwenProvider safety boundary', () => {
+  it('keeps immediate danger out of the model path and returns the deterministic official emergency response', async () => {
+    const fetcher = vi.fn(async () => qwenResponse(JSON.stringify(structuredAnswer))) as unknown as typeof fetch;
+
+    const result = await provider(fetcher).answer({
+      tripId: 'dali-slow-5d',
+      question: '同行者昏迷、胸痛且呼吸困难',
+    });
+
+    expect(fetcher).not.toHaveBeenCalled();
+    expect(result).toMatchObject({ risk_level: 'critical', requires_human_help: true, demo_mode: true });
+    expect(result.answer).toMatch(/110.*120.*119/);
+  });
+
+  it('fails closed when a low-risk model response states unverified real-time or medical facts', async () => {
+    const unsafe = { ...structuredAnswer, answer: '当前航班已经延误，医生诊断你需要马上用药。' };
+
+    await expect(provider(async () => qwenResponse(JSON.stringify(unsafe))).answer({
+      tripId: 'dali-slow-5d',
+      question: '请帮我整理备选行程',
+    })).rejects.toThrow('QWEN_PROVIDER_UNSAFE_OUTPUT');
+  });
+
+  it.each([
+    ['non-success status', async () => qwenResponse(JSON.stringify(structuredAnswer), 503), 'QWEN_PROVIDER_UNAVAILABLE'],
+    ['malformed JSON content', async () => qwenResponse('{not-json'), 'QWEN_PROVIDER_INVALID_RESPONSE'],
+    ['schema-invalid content', async () => qwenResponse(JSON.stringify({ ...structuredAnswer, alternatives: [] })), 'QWEN_PROVIDER_INVALID_RESPONSE'],
+    ['timeout abort', async () => {
+      const error = new Error('upstream timeout');
+      error.name = 'AbortError';
+      throw error;
+    }, 'QWEN_PROVIDER_TIMEOUT'],
+  ])('returns a stable non-leaking error for %s', async (_caseName, fetcher, code) => {
+    await expect(provider(fetcher as typeof fetch).answer({
+      tripId: 'dali-slow-5d',
+      question: '请整理行程',
+    })).rejects.toThrow(code);
+  });
+});
diff --git a/tests/unit/trip-store.test.ts b/tests/unit/trip-store.test.ts
index 64bec19..dd41550 100644
--- a/tests/unit/trip-store.test.ts
+++ b/tests/unit/trip-store.test.ts
@@ -111,20 +111,30 @@ describe('decision room', () => {
     store.getState().acceptDraft(daliDraft);
     const tripId = daliDraft.id;
 
     store.getState().vote(tripId, 'member-lin', 'candidate-a');
     expect(store.getState().trips[tripId].votes).toEqual({ 'member-lin': 'candidate-a' });
     store.getState().vote(tripId, 'member-lin', 'candidate-b');
     expect(store.getState().trips[tripId].votes).toEqual({ 'member-lin': 'candidate-b' });
     store.getState().vote(tripId, 'member-lin', 'candidate-b');
     expect(store.getState().trips[tripId].votes).toEqual({});
   });
+
+  it('stores a guardian plan only on an accepted trip and preserves trip isolation', () => {
+    const store = createTripStore();
+    store.getState().acceptDraft(daliDraft);
+
+    store.getState().selectGuardianPlan(daliDraft.sourcePostSlug, { id: 'PLAN-A', title: '室内备选' });
+    expect(store.getState().guardianPlans).toEqual({ [daliDraft.id]: { id: 'PLAN-A', title: '室内备选' } });
+    expect(() => store.getState().selectGuardianPlan('unknown-trip', { id: 'PLAN-B', title: '不应保存' })).toThrow('TRIP_NOT_FOUND:unknown-trip');
+    expect(store.getState().guardianPlans).toEqual({ [daliDraft.id]: { id: 'PLAN-A', title: '室内备选' } });
+  });
 });
 
 describe('draft merge and persistence', () => {
   it('merges the same source draft without replacing accepted edits', () => {
     const store = createTripStore();
     store.getState().acceptDraft(daliDraft);
     store.getState().updateTrip(daliDraft.id, { budget: 6888 });
 
     store.getState().acceptDraft({ ...daliDraft, id: 'replacement-id', budget: 9999 });
 
