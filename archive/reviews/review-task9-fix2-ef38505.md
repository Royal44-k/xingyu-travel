# Commits
ef38505 fix: enforce trusted assistant output and canonical trip keys

# Diff stat
 src/adapters/qwen/qwen-provider.ts | 16 +++++------
 src/stores/trip-store.ts           | 16 +++++------
 tests/unit/qwen-provider.test.ts   | 59 +++++++++++++++++++++++++++-----------
 tests/unit/trip-store.test.ts      | 21 ++++++++++++++
 4 files changed, 80 insertions(+), 32 deletions(-)

# Full diff
diff --git a/src/adapters/qwen/qwen-provider.ts b/src/adapters/qwen/qwen-provider.ts
index 4d9c75b..f246989 100644
--- a/src/adapters/qwen/qwen-provider.ts
+++ b/src/adapters/qwen/qwen-provider.ts
@@ -1,17 +1,19 @@
 import type { LLMProvider } from '@/adapters/contracts';
+import { z } from 'zod';
 import { MockAssistantProvider } from '@/adapters/mock/mock-assistant';
-import { assistantResponseSchema, type AssistantResponse } from '@/domain/assistant/schema';
-import { containsUnverifiedHighStakesClaim, isImmediateDanger } from '@/domain/assistant/safety';
+import type { AssistantResponse } from '@/domain/assistant/schema';
+import { isImmediateDanger } from '@/domain/assistant/safety';
 import type { AssistantRequest } from '@/domain/shared/api';
 
 const qwenEndpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
+const modelIntentSchema = z.object({ intent: z.enum(['plan', 'disruption', 'preparation']) }).strict();
 
 interface QwenProviderOptions {
   apiKey: string;
   model?: string;
   fetcher?: typeof fetch;
   timeoutMs?: number;
 }
 
 export class QwenProvider implements LLMProvider {
   private readonly fetcher: typeof fetch;
@@ -37,46 +39,44 @@ export class QwenProvider implements LLMProvider {
           Authorization: `Bearer ${this.options.apiKey}`,
           'Content-Type': 'application/json',
         },
         signal: controller.signal,
         body: JSON.stringify({
           model: this.model,
           response_format: { type: 'json_object' },
           messages: [
             {
               role: 'system',
-              content: 'Return only a JSON object matching the requested travel-assistant schema. Do not present real-time flight, weather, venue, medical, legal, or rescue claims as verified facts. Do not diagnose, give legal conclusions, or promise emergency outcomes. For immediate danger, tell the user to contact 110, 120, 119 and official channels.',
+              content: 'Return only one JSON object: {"intent":"plan"|"disruption"|"preparation"}. Do not return travel facts, prices, times, medical, legal, or emergency text.',
             },
             { role: 'user', content: `Trip: ${input.tripId}\nQuestion: ${input.question}` },
           ],
         }),
       });
     } catch (error) {
       if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
         throw providerError('QWEN_PROVIDER_TIMEOUT');
       }
       throw providerError('QWEN_PROVIDER_UNAVAILABLE');
     } finally {
       clearTimeout(timeout);
     }
 
     if (!response.ok) throw providerError('QWEN_PROVIDER_UNAVAILABLE');
 
     try {
       const payload = await response.json() as { model?: string; choices?: Array<{ message?: { content?: string } }> };
       const content = payload.choices?.[0]?.message?.content;
       if (!content) throw new Error('missing content');
-      const parsed = assistantResponseSchema.parse(JSON.parse(content));
-      if (parsed.risk_level === 'critical' || containsUnverifiedHighStakesClaim(parsed.answer)) {
-        throw providerError('QWEN_PROVIDER_UNSAFE_OUTPUT');
-      }
-      return { ...parsed, demo_mode: false, model: payload.model || this.model };
+      modelIntentSchema.parse(JSON.parse(content));
+      const template = await new MockAssistantProvider().answer(input);
+      return { ...template, demo_mode: false, model: this.model };
     } catch (error) {
       if (error instanceof Error && error.message === 'QWEN_PROVIDER_UNSAFE_OUTPUT') throw error;
       throw providerError('QWEN_PROVIDER_INVALID_RESPONSE');
     }
   }
 }
 
 function providerError(code: string): Error {
   return new Error(code);
 }
diff --git a/src/stores/trip-store.ts b/src/stores/trip-store.ts
index b49e815..30c2ef2 100644
--- a/src/stores/trip-store.ts
+++ b/src/stores/trip-store.ts
@@ -244,98 +244,98 @@ function stateCreator(set: (recipe: (state: TripStoreState) => Partial<TripStore
         (trip) => trip.id === draft.id || trip.sourcePostSlug === draft.sourcePostSlug,
       );
       if (existing) return {};
       const trip = tripFromDraft(draft);
       return { trips: { ...state.trips, [trip.id]: trip } };
     }),
     updateTrip: (tripId: string, patch: TripSettingsPatch) => set((state) => {
       const trip = getTrip(state, tripId);
       const next = { ...trip, ...patch };
       validateSettings(next);
-      return { trips: { ...state.trips, [tripId]: next } };
+      return { trips: { ...state.trips, [trip.id]: next } };
     }),
     updateItem: (tripId: string, itemId: string, patch: TripItemPatch) => set((state) => {
       const trip = getTrip(state, tripId);
       if (patch.estimatedCost !== undefined &&
         (!Number.isFinite(patch.estimatedCost) || patch.estimatedCost < 0)) {
         throw new Error('TRIP_INVALID_ITEM_COST');
       }
       if (!trip.items.some((item) => item.id === itemId)) throw new Error(`TRIP_ITEM_NOT_FOUND:${itemId}`);
       return {
         trips: {
           ...state.trips,
-          [tripId]: {
+          [trip.id]: {
             ...trip,
             items: trip.items.map((item) => item.id === itemId ? { ...item, ...patch } : item),
           },
         },
       };
     }),
     reorderItem: (tripId: string, itemId: string, direction: ReorderDirection) => set((state) => {
       const trip = getTrip(state, tripId);
       const index = trip.items.findIndex((item) => item.id === itemId);
       if (index < 0) throw new Error(`TRIP_ITEM_NOT_FOUND:${itemId}`);
       const target = direction === 'up' ? index - 1 : index + 1;
       if (target < 0 || target >= trip.items.length) return {};
       const items = [...trip.items];
       [items[index], items[target]] = [items[target], items[index]];
       return {
         trips: {
           ...state.trips,
-          [tripId]: { ...trip, items: items.map((item, itemIndex) => ({ ...item, day: itemIndex + 1 })) },
+          [trip.id]: { ...trip, items: items.map((item, itemIndex) => ({ ...item, day: itemIndex + 1 })) },
         },
       };
     }),
     toggleAlternative: (tripId: string, itemId: string) => set((state) => {
       const trip = getTrip(state, tripId);
       if (!trip.items.some((item) => item.id === itemId)) throw new Error(`TRIP_ITEM_NOT_FOUND:${itemId}`);
       return {
         trips: {
           ...state.trips,
-          [tripId]: {
+          [trip.id]: {
             ...trip,
             items: trip.items.map((item) =>
               item.id === itemId ? { ...item, isAlternative: !item.isAlternative } : item,
             ),
           },
         },
       };
     }),
     vote: (tripId: string, memberId: string, candidateId: string) => set((state) => {
       const trip = getTrip(state, tripId);
       if (!demoMembers.some((member) => member.id === memberId)) {
         throw new Error(`TRIP_MEMBER_NOT_FOUND:${memberId}`);
       }
       if (!trip.candidates.some((candidate) => candidate.id === candidateId)) {
         throw new Error(`TRIP_CANDIDATE_NOT_FOUND:${candidateId}`);
       }
       const votes = { ...trip.votes };
       if (votes[memberId] === candidateId) delete votes[memberId];
       else votes[memberId] = candidateId;
-      return { trips: { ...state.trips, [tripId]: { ...trip, votes } } };
+      return { trips: { ...state.trips, [trip.id]: { ...trip, votes } } };
     }),
     enableGuardian: (tripId: string, consent: boolean) => set((state) => {
       const trip = getTrip(state, tripId);
       if (!consent && trip.status !== 'guarded') throw new Error('TRIP_GUARDIAN_CONSENT_REQUIRED');
       const status = consent
         ? transitionTrip(trip.status, 'guarded')
         : transitionTrip(trip.status, 'active');
       return {
         trips: {
           ...state.trips,
-          [tripId]: { ...trip, status, guardianEnabled: consent },
+          [trip.id]: { ...trip, status, guardianEnabled: consent },
         },
       };
     }),
     publishPartnerIntent: (tripId: string) => set((state) => {
-      getTrip(state, tripId);
-      return { partnerIntents: { ...state.partnerIntents, [tripId]: true } };
+      const trip = getTrip(state, tripId);
+      return { partnerIntents: { ...state.partnerIntents, [trip.id]: true } };
     }),
     selectGuardianPlan: (tripId: string, plan: GuardianPlanSelection) => set((state) => {
       const trip = getTrip(state, tripId);
       return { guardianPlans: { ...state.guardianPlans, [trip.id]: plan } };
     }),
   } satisfies TripStoreState;
 }
 
 function persistenceOptions(options: CreateTripStoreOptions = {}) {
   return {
diff --git a/tests/unit/qwen-provider.test.ts b/tests/unit/qwen-provider.test.ts
index c4db6f0..08bdcfe 100644
--- a/tests/unit/qwen-provider.test.ts
+++ b/tests/unit/qwen-provider.test.ts
@@ -1,27 +1,14 @@
 import { describe, expect, it, vi } from 'vitest';
 import { QwenProvider } from '@/adapters/qwen/qwen-provider';
 
-const structuredAnswer = {
-  risk_level: 'low' as const,
-  answer: '这是模型生成的通用行程整理建议，不代表实时事实。',
-  alternatives: [
-    { id: 'MODEL-A', title: 'Plan A', cost: '¥0', duration: '当天', risk: '低', actions: ['自行核对公开信息'] },
-    { id: 'MODEL-B', title: 'Plan B', cost: '¥80', duration: '2小时', risk: '中', actions: ['联系人工顾问'] },
-    { id: 'MODEL-C', title: 'Plan C', cost: '¥160', duration: '3小时', risk: '中', actions: ['保留本地行程决定'] },
-  ],
-  evidence: [],
-  data_freshness: '模型回答不含实时数据',
-  requires_human_help: false,
-  demo_mode: false,
-  model: 'untrusted-model-label',
-};
+const structuredAnswer = { intent: 'plan' as const };
 
 function qwenResponse(content: string, status = 200): Response {
   return new Response(JSON.stringify({
     model: 'qwen-plus',
     choices: [{ message: { content } }],
   }), { status });
 }
 
 function provider(fetcher: typeof fetch) {
   return new QwenProvider({ apiKey: 'not-a-real-key', model: 'qwen-plus', fetcher });
@@ -34,27 +21,67 @@ describe('QwenProvider safety boundary', () => {
     const result = await provider(fetcher).answer({
       tripId: 'dali-slow-5d',
       question: '同行者昏迷、胸痛且呼吸困难',
     });
 
     expect(fetcher).not.toHaveBeenCalled();
     expect(result).toMatchObject({ risk_level: 'critical', requires_human_help: true, demo_mode: true });
     expect(result.answer).toMatch(/110.*120.*119/);
   });
 
-  it('fails closed when a low-risk model response states unverified real-time or medical facts', async () => {
+  it('fails closed when a model response includes unverified real-time or medical facts', async () => {
     const unsafe = { ...structuredAnswer, answer: '当前航班已经延误，医生诊断你需要马上用药。' };
 
     await expect(provider(async () => qwenResponse(JSON.stringify(unsafe))).answer({
       tripId: 'dali-slow-5d',
       question: '请帮我整理备选行程',
-    })).rejects.toThrow('QWEN_PROVIDER_UNSAFE_OUTPUT');
+    })).rejects.toThrow('QWEN_PROVIDER_INVALID_RESPONSE');
+  });
+
+  it('never exposes model-authored answer, plan, evidence, or freshness text without trusted tools', async () => {
+    const malicious = {
+      ...structuredAnswer,
+      answer: '以下为建议。',
+      alternatives: [{ id: 'A', title: '模型计划', cost: '1', duration: '1', risk: '低', actions: ['已确诊肺炎，救援十分钟到达'] }],
+      evidence: [{ source: 'MU123 将于18:00起飞', observed_at: '现在' }],
+      data_freshness: '实时官方确认',
+    };
+
+    await expect(provider(async () => qwenResponse(JSON.stringify(malicious))).answer({
+      tripId: 'dali-slow-5d',
+      question: '帮我规划行程',
+    })).rejects.toThrow('QWEN_PROVIDER_INVALID_RESPONSE');
+  });
+
+  it('renders the audited local template for an allowed model intent', async () => {
+    const result = await provider(async () => qwenResponse(JSON.stringify({ intent: 'disruption' }))).answer({
+      tripId: 'dali-slow-5d',
+      question: '帮我整理行程',
+    });
+
+    expect(result).toMatchObject({
+      answer: '这是固定的沙箱演示建议：请先核对行程，再选择备选交通方案。',
+      demo_mode: false,
+      model: 'qwen-plus',
+    });
+    expect(result.alternatives.map((alternative) => alternative.id)).toEqual([
+      'DEMO-ALT-TRAIN-01',
+      'DEMO-ALT-BUS-02',
+      'DEMO-ALT-CAR-03',
+    ]);
+  });
+
+  it('fails closed for an unrecognized model intent', async () => {
+    await expect(provider(async () => qwenResponse(JSON.stringify({ intent: 'freeform' }))).answer({
+      tripId: 'dali-slow-5d',
+      question: '帮我整理行程',
+    })).rejects.toThrow('QWEN_PROVIDER_INVALID_RESPONSE');
   });
 
   it.each([
     ['non-success status', async () => qwenResponse(JSON.stringify(structuredAnswer), 503), 'QWEN_PROVIDER_UNAVAILABLE'],
     ['malformed JSON content', async () => qwenResponse('{not-json'), 'QWEN_PROVIDER_INVALID_RESPONSE'],
     ['schema-invalid content', async () => qwenResponse(JSON.stringify({ ...structuredAnswer, alternatives: [] })), 'QWEN_PROVIDER_INVALID_RESPONSE'],
     ['timeout abort', async () => {
       const error = new Error('upstream timeout');
       error.name = 'AbortError';
       throw error;
diff --git a/tests/unit/trip-store.test.ts b/tests/unit/trip-store.test.ts
index dd41550..97f3847 100644
--- a/tests/unit/trip-store.test.ts
+++ b/tests/unit/trip-store.test.ts
@@ -35,20 +35,41 @@ describe('trip state machine', () => {
 
   it('rejects invalid transitions with a stable error', () => {
     expect(() => transitionTrip('review', 'guarded')).toThrow(
       'TRIP_INVALID_TRANSITION:review:guarded',
     );
     expect(transitionTrip('active', 'guarded')).toBe('guarded');
   });
 });
 
 describe('trip editing', () => {
+  it('keeps canonical map keys when every mutator is invoked through a source slug', async () => {
+    const store = createTripStore();
+    await store.persist.rehydrate();
+    store.getState().acceptDraft(daliDraft);
+    const slug = daliDraft.sourcePostSlug;
+    const itemId = store.getState().trips[daliDraft.id].items[0].id;
+    store.getState().updateTrip(slug, { budget: 6001 });
+    store.getState().updateItem(slug, itemId, { estimatedCost: 601 });
+    store.getState().toggleAlternative(slug, itemId);
+    store.getState().vote(slug, 'member-lin', 'candidate-a');
+    store.getState().enableGuardian(slug, true);
+    store.getState().publishPartnerIntent(slug);
+
+    expect(Object.entries(store.getState().trips).every(([key, trip]) => key === trip.id)).toBe(true);
+    const raw = window.localStorage.getItem('xingyu-demo-v1');
+    expect(raw).not.toBeNull();
+    const rehydrated = createTripStore();
+    await rehydrated.persist.rehydrate();
+    expect(rehydrated.getState().trips[daliDraft.id].budget).toBe(6001);
+  });
+
   it('updates dates, budget, itinerary details and computes a literal overall total', () => {
     const store = createTripStore();
     store.getState().acceptDraft(daliDraft);
     const tripId = daliDraft.id;
     const firstItemId = store.getState().trips[tripId].items[0].id;
 
     store.getState().updateTrip(tripId, {
       startDate: '2026-09-20',
       endDate: '2026-09-24',
       budget: 6100,
