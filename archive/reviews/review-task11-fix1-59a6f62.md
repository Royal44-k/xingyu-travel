# Commits
59a6f62 fix: connect journey state and strengthen browser acceptance

# Diff stat
 .../2026-08-16-xingyu-public-mvp/task-11-report.md |  42 +++++++++
 src/data/partners.ts                               |   2 +-
 src/features/guardian/risk-timeline.tsx            |  13 ++-
 src/features/partners/match-list.tsx               |   2 +-
 src/features/partners/trip-to-partner-intent.ts    |  11 +++
 src/features/trips/trip-workbench.tsx              |  12 ++-
 tests/component/partner-flow.test.tsx              |  19 ++--
 tests/component/risk-timeline.test.tsx             |   8 +-
 tests/e2e/accessibility.spec.ts                    |   9 +-
 tests/e2e/core-journey.spec.ts                     |  24 ++++-
 tests/e2e/responsive.spec.ts                       | 101 +++++++++++++++++----
 tests/unit/partner-eligibility.test.ts             |   9 +-
 tests/unit/trip-to-partner-intent.test.ts          |  30 ++++++
 13 files changed, 236 insertions(+), 46 deletions(-)

# Full diff
diff --git a/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md
index 6e963c6..a25bc61 100644
--- a/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md
+++ b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md
@@ -44,10 +44,52 @@ Fresh post-fix evidence:
 | direct `vitest run` for the two repaired component files, `--maxWorkers=1 --reporter=verbose` | 2 files / 3 tests passed (26.18s) |
 | direct full `vitest run --maxWorkers=1 --reporter=dot` | 28 files / 214 tests passed (253.37s) |
 | final `pnpm verify` | exit 0: eslint, `tsc --noEmit`, Vitest 28 files / 214 tests passed (64.86s), and Next production build completed |
 
 `git diff --check` completed without whitespace errors before commit.
 
 ## Concerns
 
 - Local Playwright invocation needs the direct local binary in this desktop environment because `pnpm exec playwright` does not resolve it; `pnpm test:e2e` itself succeeds.
 - No product-test failures remain. The `NO_COLOR`/`FORCE_COLOR` warning is environment-only and does not come from application runtime collectors.
+
+## Fix round — connected journey state and stronger browser acceptance
+
+This round reviewed the committed Task 11 baseline at `b7023ff` and preserved its existing implementation. The acceptance gaps were closed with observable state and condition-based browser checks rather than timing sleeps or `networkidle` guesses.
+
+### Critical trip-to-partner handoff
+
+- The workbench now hydrates the partner store and publishes a schema-valid partner intent whose destination, dates, and budget come from the canonical accepted trip while personal matching preferences remain intact.
+- 木雨's sandbox availability is aligned to 大理; the accepted trip still yields score 92 and exactly three explanations.
+- `/partners` consumes the already-published local intent and does not mount a second intent form.
+- The first strengthened core E2E run exposed a real boundary bug: `tripToPartnerIntent` spread the full runtime `WorkbenchTrip`, leaking strict-schema keys such as `id`, `items`, and `status`. The focused unit reproduction failed with `success: false`; explicit mapping of the four hard fields made the unit GREEN and the core journey GREEN.
+
+### Important acceptance corrections
+
+- Guardian Plan A had a static success message before any click. The component regression first failed because `role="status"` already existed. `RiskTimeline` now subscribes to the canonical trip's actual plan selection, renders no selected state initially, exposes `aria-pressed=false → true`, and announces the exact selected Plan A only after the click.
+- The core journey now submits non-default `2026-09-18`–`2026-09-22` dates and 3 travelers, compares all five literal `URLSearchParams`, checks the exact comparison summary, proves the workbench-to-partner handoff with no second form and 木雨 score 92, and proves Plan A is not a no-op.
+- The responsive timing regression navigated only to response commit and correctly failed with `document=loading` and incomplete images. The final helper waits for route-specific dynamic/hydration state, scrolls each lazy image into view, waits for `document.readyState=complete`, `document.fonts.status=loaded`, and all images complete, then proves header hydration with an open/close round trip. Every mobile route is measured with the menu both closed and open.
+- The filter-dialog E2E now checks last `Tab` → first and first `Shift+Tab` → last before retaining Escape and trigger-focus restoration. A temporary mutation removing the forward wrap produced the expected focused RED; restoring the real branch produced GREEN.
+- Existing partner component/domain fixtures were updated to request the newly intentional 大理 candidate. No hard filter was weakened. A saved intent now has a neutral local-intent notice rather than incorrectly claiming every saved intent originated in the workbench.
+
+### Fresh terminal evidence
+
+| Command / scope | Terminal result |
+| --- | --- |
+| guardian component RED | 1 failed: pre-click static status was present |
+| guardian component GREEN | 1 passed |
+| full runtime trip conversion unit RED | 1 failed: strict intent validation returned false |
+| trip conversion unit GREEN | 1 passed |
+| core journey first strengthened run | 1 failed at the strict-schema handoff boundary |
+| core journey after explicit mapping | 1 passed (11.0s) |
+| responsive timing RED | 1 failed with `document=loading`, `images=false` |
+| complete responsive spec | 7 passed (12.7s) |
+| dialog focus mutation RED / restored GREEN | 1 failed at last-to-first wrap / 1 passed (4.2s) |
+| complete accessibility spec | 10 passed (18.7s) |
+| three Task 11 specs together, one worker | 18 passed (33.5s) |
+| `pnpm test:e2e` | 18 passed (21.3s), exit 0 |
+| focused partner component | 7 passed |
+| focused partner domain unit | 45 passed |
+| final `pnpm test` | 29 files / 215 tests passed (61.31s) |
+| final `pnpm verify` | exit 0: eslint, typecheck, 29 files / 215 tests, and Next production build completed |
+
+`next-env.d.ts` was verified byte-for-byte against the HEAD blob after Next dev rewrote its generated route reference; the generated change was excluded. Final status contains only this fix round's source, test, and report files.
diff --git a/src/data/partners.ts b/src/data/partners.ts
index 85f91de..f428423 100644
--- a/src/data/partners.ts
+++ b/src/data/partners.ts
@@ -74,21 +74,21 @@ export const demoViewerProfile: PartnerProfile = {
   riskStatus: 'clear',
 };
 
 export const demoPartnerCandidates: PartnerCandidate[] = [{
   id: 'user-muyu',
   displayName: '木雨',
   age: 27,
   identityVerified: true,
   riskStatus: 'clear',
   introduction: '慢节奏风光摄影爱好者，习惯提前确认边界与每日安排。',
-  destination: '川西',
+  destination: '大理',
   startDate: '2026-09-17',
   endDate: '2026-09-24',
   budget: 5000,
   pace: '舒缓',
   interests: ['雪山', '摄影'],
   route: '成都—康定—新都桥',
   lodgingBoundary: '接受同性拼房，需独立床位',
   schedule: '早起，22:30 前休息',
   socialPreference: '结伴活动，也保留独处时间',
   capacity: 3,
diff --git a/src/features/guardian/risk-timeline.tsx b/src/features/guardian/risk-timeline.tsx
index 8677374..a3d884c 100644
--- a/src/features/guardian/risk-timeline.tsx
+++ b/src/features/guardian/risk-timeline.tsx
@@ -2,25 +2,34 @@
 
 import { WarningCircle } from '@phosphor-icons/react';
 import type { GuardianRiskEvent } from '@/data/risk-events';
 import { useTripStore } from '@/stores/trip-store';
 import styles from './guardian.module.css';
 
 interface RiskTimelineProps { events: GuardianRiskEvent[]; tripId: string; }
 
 export function RiskTimeline({ events, tripId }: RiskTimelineProps) {
   const selectGuardianPlan = useTripStore((state) => state.selectGuardianPlan);
+  const selectedPlan = useTripStore((state) => {
+    const canonicalTripId = state.trips[tripId]?.id ?? Object.values(state.trips).find(
+      (trip) => trip.sourcePostSlug === tripId,
+    )?.id ?? tripId;
+    return state.guardianPlans[canonicalTripId];
+  });
+  const selectedPlanIndex = selectedPlan
+    ? events.flatMap((event) => event.plans).findIndex((plan) => plan.id === selectedPlan.id)
+    : -1;
   return (
     <section aria-label="行程守护风险时间线" className={styles.timeline} role="region">
       <p className={styles.demoNote}>固定沙箱事件，不读取实时位置、天气或航班状态。</p>
       <h2 className={styles.alternativesHeading}>备选方案</h2>
       {events.map((event) => (
         <article className={styles.event} key={event.id}>
           <div className={styles.eventHead}><WarningCircle aria-hidden size={22} weight="fill" /><div><p>RISK / {event.status.toUpperCase()}</p><h2>{event.title}</h2></div></div>
           <p>{event.description}</p><small>来源：{event.source} · 证据时间：{event.observedAt}</small>
-          <div className={styles.plans}>{event.plans.map((plan, index) => <article aria-label={`Plan ${String.fromCharCode(65 + index)}`} className={styles.plan} key={plan.id}><p>PLAN {String.fromCharCode(65 + index)}</p><h3>{plan.title}</h3><dl><div><dt>成本</dt><dd>{plan.cost}</dd></div><div><dt>耗时</dt><dd>{plan.duration}</dd></div><div><dt>风险</dt><dd>{plan.risk}</dd></div></dl><button aria-label={`选择 Plan ${String.fromCharCode(65 + index)}：${plan.title}方案`} onClick={() => selectGuardianPlan(tripId, { id: plan.id, title: plan.title })} type="button">选择{plan.title}方案</button></article>)}</div>
+          <div className={styles.plans}>{event.plans.map((plan, index) => <article aria-label={`Plan ${String.fromCharCode(65 + index)}`} className={styles.plan} key={plan.id}><p>PLAN {String.fromCharCode(65 + index)}</p><h3>{plan.title}</h3><dl><div><dt>成本</dt><dd>{plan.cost}</dd></div><div><dt>耗时</dt><dd>{plan.duration}</dd></div><div><dt>风险</dt><dd>{plan.risk}</dd></div></dl><button aria-label={`选择 Plan ${String.fromCharCode(65 + index)}：${plan.title}方案`} aria-pressed={selectedPlan?.id === plan.id} onClick={() => selectGuardianPlan(tripId, { id: plan.id, title: plan.title })} type="button">选择{plan.title}方案</button></article>)}</div>
         </article>
       ))}
-      <p className={styles.status} role="status">方案已保存到本浏览器的旅行决策，未创建订单</p>
+      {selectedPlan && selectedPlanIndex >= 0 ? <p className={styles.status} role="status">已选择 Plan {String.fromCharCode(65 + selectedPlanIndex)}：{selectedPlan.title}；方案已保存到本浏览器的旅行决策，未创建订单</p> : null}
     </section>
   );
 }
diff --git a/src/features/partners/match-list.tsx b/src/features/partners/match-list.tsx
index 1b3b79c..2f6df0c 100644
--- a/src/features/partners/match-list.tsx
+++ b/src/features/partners/match-list.tsx
@@ -42,21 +42,21 @@ export function PartnerMatchExperience() {
     <main className={styles.page}>
       <header className={styles.hero}>
         <div className={styles.eyebrow}><span>TRUSTED COMPANIONS</span><span>浏览器本地沙箱</span></div>
         <div className={styles.heroGrid}>
           <div><h1>先谈边界，<br />再一起出发。</h1><p>公开浏览演示搭子卡片。发布、认识、聊天和安全操作均需成年、身份状态已验证且风险状态清晰。</p></div>
           <aside aria-label="演示身份状态"><ShieldCheck aria-hidden size={30} weight="thin" /><p>DEMO IDENTITY STATUS</p><strong>已完成身份状态验证 · 风险状态清晰</strong><span>此处仅展示验证状态，不收集证件号、照片或人脸。</span></aside>
         </div>
       </header>
       {hydrationError && <p className={styles.notice} role="status">本地匹配记录校验失败，已继续使用安全的内存状态；原数据未被覆盖。</p>}
       {hydrated
-        ? <IntentForm key={JSON.stringify(intent ?? defaultPartnerIntent)} initialIntent={intent ?? defaultPartnerIntent} onPublish={handlePublish} />
+        ? intent ? <p className={styles.publishedNotice} role="status"><CheckCircle aria-hidden size={18} />已读取本地匹配意愿</p> : <IntentForm key={JSON.stringify(defaultPartnerIntent)} initialIntent={defaultPartnerIntent} onPublish={handlePublish} />
         : <p className={styles.notice} aria-live="polite">正在读取本地匹配意愿…</p>}
       {published && <p className={styles.publishedNotice}><CheckCircle aria-hidden size={18} />已发布到本地演示匹配</p>}
       {actionError && <p className={styles.formError} role="alert">{actionError}</p>}
       <section aria-labelledby="candidate-title" className={styles.candidateSection}>
         <div className={styles.sectionHeading}><div><p>PUBLIC PROFILES / 02</p><h2 id="candidate-title">合拍，也要能说清为什么</h2></div><span>{intent ? `${candidates.length} 位通过硬条件` : '公开卡片可先浏览，发布后计算匹配'}</span></div>
         <div className={styles.cardGrid}>
           {candidates.map((candidate, index) => {
             const scored = intent ? scorePartnerCandidate(intent, candidate) : undefined;
             const match = matchByCandidate[candidate.id];
             return (
diff --git a/src/features/partners/trip-to-partner-intent.ts b/src/features/partners/trip-to-partner-intent.ts
new file mode 100644
index 0000000..3a4c95e
--- /dev/null
+++ b/src/features/partners/trip-to-partner-intent.ts
@@ -0,0 +1,11 @@
+import { defaultPartnerIntent, type PartnerIntent } from '@/data/partners';
+
+export function tripToPartnerIntent(trip: Pick<PartnerIntent, 'destination' | 'startDate' | 'endDate' | 'budget'>, existingIntent?: PartnerIntent): PartnerIntent {
+  return {
+    ...(existingIntent ?? defaultPartnerIntent),
+    destination: trip.destination,
+    startDate: trip.startDate,
+    endDate: trip.endDate,
+    budget: trip.budget,
+  };
+}
diff --git a/src/features/trips/trip-workbench.tsx b/src/features/trips/trip-workbench.tsx
index 58156aa..0ecff7f 100644
--- a/src/features/trips/trip-workbench.tsx
+++ b/src/features/trips/trip-workbench.tsx
@@ -11,62 +11,68 @@ import {
 import {
   getBudgetSummary,
   hydrateWorkbenchTripStore,
   type WorkbenchTrip,
   useTripStore,
   useTripStoreHydration,
 } from '@/stores/trip-store';
 import { DecisionRoom } from './decision-room';
 import { ItineraryEditor } from './itinerary-editor';
 import styles from './trips.module.css';
+import { demoViewerProfile } from '@/data/partners';
+import { tripToPartnerIntent } from '@/features/partners/trip-to-partner-intent';
+import { hydratePartnerStore, usePartnerStore, usePartnerStoreHydration } from '@/stores/partner-store';
 
 export function TripWorkbench({ slug }: { slug: string }) {
   const draft = useDraftTripStore((state) => state.drafts[slug]);
   const draftHydrated = useDraftHydrationStore((state) => state.hydrated);
   const draftHydrationError = useDraftHydrationStore((state) => state.hydrationError);
   const workbenchHydrated = useTripStoreHydration((state) => state.hydrated);
   const workbenchHydrationError = useTripStoreHydration((state) => state.hydrationError);
+  const partnerHydrated = usePartnerStoreHydration((state) => state.hydrated);
+  const partnerIntent = usePartnerStore((state) => state.intents[demoViewerProfile.id]);
+  const publishPartnerMatchIntent = usePartnerStore((state) => state.publishIntent);
   const tripId = useTripStore((state) =>
     Object.keys(state.trips).find((id) => state.trips[id].sourcePostSlug === slug),
   );
   const trip = useTripStore((state) => tripId ? state.trips[tripId] : undefined);
   const partnerIntentPublished = useTripStore((state) => tripId ? Boolean(state.partnerIntents[tripId]) : false);
   const acceptDraft = useTripStore((state) => state.acceptDraft);
   const updateTrip = useTripStore((state) => state.updateTrip);
   const updateItem = useTripStore((state) => state.updateItem);
   const reorderItem = useTripStore((state) => state.reorderItem);
   const toggleAlternative = useTripStore((state) => state.toggleAlternative);
   const vote = useTripStore((state) => state.vote);
   const enableGuardian = useTripStore((state) => state.enableGuardian);
   const publishPartnerIntent = useTripStore((state) => state.publishPartnerIntent);
   useEffect(() => {
-    void Promise.all([hydrateDraftTripStore(), hydrateWorkbenchTripStore()]);
+    void Promise.all([hydrateDraftTripStore(), hydrateWorkbenchTripStore(), hydratePartnerStore()]);
   }, []);
 
   useEffect(() => {
     if (draftHydrated && workbenchHydrated && !draftHydrationError && !workbenchHydrationError && draft && !trip) {
       acceptDraft(draft);
     }
   }, [acceptDraft, draft, draftHydrated, draftHydrationError, trip, workbenchHydrated, workbenchHydrationError]);
 
   const compareHref = useMemo(() => {
     if (!trip) return '/compare';
     const query = new URLSearchParams({
       destination: trip.destination,
       from: trip.startDate,
       to: trip.endDate,
       travelers: String(trip.travelers),
     });
     return `/compare?${query.toString()}`;
   }, [trip]);
 
-  if (!workbenchHydrated || (!trip && !draftHydrated)) {
+  if (!workbenchHydrated || !partnerHydrated || (!trip && !draftHydrated)) {
     return <WorkbenchState title="正在读取本地行程…" message="正在合并攻略草稿与浏览器中的工作台状态。" />;
   }
 
   if (!trip && (draftHydrationError || workbenchHydrationError)) {
     return <WorkbenchState title="本地行程暂时无法读取" message="浏览器中的数据未被覆盖。请返回原攻略，稍后再试。" sourceHref={`/square/${slug}`} />;
   }
 
   if (!draft && !trip) {
     return <WorkbenchState title="未找到本地行程草稿" message="草稿只保存在创建它的浏览器中。请返回攻略重新生成。" sourceHref={`/square/${slug}`} />;
   }
@@ -112,21 +118,21 @@ export function TripWorkbench({ slug }: { slug: string }) {
         <div className={styles.budgetNumbers}>
           <span><small>五项预计花费</small><strong>¥{budgetSummary.overall.toLocaleString('zh-CN')}</strong></span>
           <span><small>行程总预算</small><strong>¥{trip.budget.toLocaleString('zh-CN')}</strong></span>
           <span><small>剩余弹性</small><strong>¥{Math.max(0, trip.budget - budgetSummary.overall).toLocaleString('zh-CN')}</strong></span>
         </div>
         <ol className={styles.costList}>{trip.items.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, '0')} · {item.title}</span><strong>¥{budgetSummary.itemTotals[index].toLocaleString('zh-CN')}</strong></li>)}</ol>
       </section>
 
       <DecisionRoom
         onEnableGuardian={(consent) => enableGuardian(trip.id, consent)}
-        onPublishPartnerIntent={() => publishPartnerIntent(trip.id)}
+        onPublishPartnerIntent={() => { publishPartnerMatchIntent(demoViewerProfile, tripToPartnerIntent(trip, partnerIntent)); publishPartnerIntent(trip.id); }}
         onVote={(memberId, candidateId) => vote(trip.id, memberId, candidateId)}
         partnerIntentPublished={partnerIntentPublished}
         trip={trip}
       />
 
       <section className={styles.compareCta}>
         <div><Coins aria-hidden size={26} /><span><p>NEXT STEP</p><h2>把决定交给真实比价</h2><small>将目的地、日期和人数带入现有比价页，不进行预订。</small></span></div>
         <Link href={compareHref}>进入比价 <ArrowRight aria-hidden size={18} /></Link>
       </section>
     </main>
diff --git a/tests/component/partner-flow.test.tsx b/tests/component/partner-flow.test.tsx
index be0dc94..792e3da 100644
--- a/tests/component/partner-flow.test.tsx
+++ b/tests/component/partner-flow.test.tsx
@@ -26,57 +26,56 @@ describe('partner matching flow', () => {
     await user.click(await screen.findByRole('button', { name: '发布匹配意愿' }));
 
     expect(screen.getByRole('alert')).toHaveTextContent('请输入目的地');
     expect(screen.queryByText('已发布到本地演示匹配')).not.toBeInTheDocument();
   });
 
   it('shows exactly three reasons and withholds chat until sandbox mutual approval', async () => {
     const user = userEvent.setup();
     render(<PartnerMatchExperience />);
 
+    const destination = await screen.findByLabelText('目的地');
+    await user.clear(destination);
+    await user.type(destination, '大理');
     await user.click(await screen.findByRole('button', { name: '发布匹配意愿' }));
     expect(await screen.findByText('已发布到本地演示匹配')).toBeInTheDocument();
     const card = screen.getByTestId(`partner-card-${demoPartnerCandidates[0].id}`);
     expect(within(card).getByText('92')).toBeInTheDocument();
     expect(within(card).getAllByRole('listitem')).toHaveLength(3);
     expect(within(card).getByText('旅行日期高度重合')).toBeInTheDocument();
 
     await user.click(within(card).getByRole('button', { name: '愿意认识木雨' }));
     expect(within(card).getByText('等待对方同意')).toBeInTheDocument();
     expect(within(card).queryByRole('link', { name: '进入聊天' })).not.toBeInTheDocument();
 
     await user.click(within(card).getByRole('button', { name: '模拟对方同意（沙箱）' }));
     expect(within(card).getByText('双方已同意')).toBeInTheDocument();
     expect(within(card).getByRole('link', { name: '进入聊天' })).toHaveAttribute('href', expect.stringMatching(/^\/chat\/match-/));
   });
 
-  it('hydrates the saved intent before mounting the form and preserves unchanged values', async () => {
-    const user = userEvent.setup();
+  it('hydrates a saved intent without mounting a second form and preserves unchanged values', async () => {
     const savedIntent = {
       ...defaultPartnerIntent,
       destination: '稻城',
       budget: 6880,
       route: '成都—康定—稻城',
     };
     const source = createPartnerStore();
     await source.persist.rehydrate();
     source.getState().publishIntent(demoViewerProfile, savedIntent);
 
     render(<PartnerMatchExperience />);
 
     expect(screen.getByText('正在读取本地匹配意愿…')).toBeInTheDocument();
-    const destination = await screen.findByLabelText('目的地');
-    expect(destination).toHaveValue('稻城');
-    expect(screen.getByLabelText('旅行预算')).toHaveValue(6880);
-    expect(screen.getByLabelText('期待路线')).toHaveValue('成都—康定—稻城');
-    await user.click(screen.getByRole('button', { name: '发布匹配意愿' }));
-
+    expect(await screen.findByText('已读取本地匹配意愿')).toBeInTheDocument();
+    expect(screen.queryByLabelText('目的地')).not.toBeInTheDocument();
+    expect(screen.queryByRole('button', { name: '发布匹配意愿' })).not.toBeInTheDocument();
     expect(usePartnerStore.getState().intents[demoViewerProfile.id]).toEqual(savedIntent);
   });
 });
 
 describe('matched chat safety flow', () => {
   it('blocks contact details until bilateral consent and warns after permitted send', async () => {
     const user = userEvent.setup();
     const matchId = createMatchedDemo();
     render(<ChatRoom matchId={matchId} />);
 
@@ -128,32 +127,32 @@ describe('matched chat safety flow', () => {
   it('guards unknown and unmatched chat ids with a locked recovery state', () => {
     render(<ChatRoom matchId="unknown-match" />);
 
     expect(screen.getByRole('heading', { name: '聊天暂不可用' })).toBeInTheDocument();
     expect(screen.getByRole('link', { name: '返回搭子匹配' })).toHaveAttribute('href', '/partners');
   });
 
   it('locks a shape-valid matched chat owned by another viewer', () => {
     const foreignProfile = { ...demoViewerProfile, id: 'foreign-viewer' };
     const foreignStore = createPartnerStore();
-    foreignStore.getState().publishIntent(foreignProfile, defaultPartnerIntent);
+    foreignStore.getState().publishIntent(foreignProfile, { ...defaultPartnerIntent, destination: '大理' });
     const matchId = foreignStore.getState().requestMatch(foreignProfile, demoPartnerCandidates[0].id);
     foreignStore.getState().simulateMutualApproval(foreignProfile, matchId);
     usePartnerStore.setState({
       matches: foreignStore.getState().matches,
       visibleMatchIds: foreignStore.getState().visibleMatchIds,
     });
 
     render(<ChatRoom matchId={matchId} />);
 
     expect(screen.getByRole('heading', { name: '聊天暂不可用' })).toBeInTheDocument();
     expect(screen.queryByText('你好，我们可以先从路线节奏和住宿边界聊起。')).not.toBeInTheDocument();
     expect(screen.queryByLabelText('消息')).not.toBeInTheDocument();
   });
 });
 
 function createMatchedDemo() {
-  usePartnerStore.getState().publishIntent(demoViewerProfile, defaultPartnerIntent);
+  usePartnerStore.getState().publishIntent(demoViewerProfile, { ...defaultPartnerIntent, destination: '大理' });
   const matchId = usePartnerStore.getState().requestMatch(demoViewerProfile, demoPartnerCandidates[0].id);
   usePartnerStore.getState().simulateMutualApproval(demoViewerProfile, matchId);
   return matchId;
 }
diff --git a/tests/component/risk-timeline.test.tsx b/tests/component/risk-timeline.test.tsx
index b79f9dd..6a47088 100644
--- a/tests/component/risk-timeline.test.tsx
+++ b/tests/component/risk-timeline.test.tsx
@@ -14,19 +14,23 @@ beforeEach(() => {
 
 describe('RiskTimeline', () => {
   it('makes demo risk freshness explicit and records a Plan A choice only in local trip decisions', async () => {
     const user = userEvent.setup();
     render(<RiskTimeline events={riskEventsForTrip('dali-slow-5d')} tripId="dali-slow-5d" />);
 
     const timeline = screen.getByRole('region', { name: '行程守护风险时间线' });
     expect(timeline).toHaveTextContent('固定沙箱事件');
     expect(timeline).toHaveTextContent('2026-08-16T09:00:00+08:00');
     expect(within(timeline).getAllByRole('article', { name: /Plan [ABC]/ })).toHaveLength(3);
+    const planA = within(timeline).getByRole('button', { name: '选择 Plan A：调整苍山徒步为古城慢游方案' });
+    expect(planA).toHaveAttribute('aria-pressed', 'false');
+    expect(screen.queryByRole('status')).not.toBeInTheDocument();
 
-    await user.click(within(timeline).getByRole('button', { name: '选择 Plan A：调整苍山徒步为古城慢游方案' }));
-    expect(screen.getByRole('status')).toHaveTextContent('方案已保存到本浏览器的旅行决策，未创建订单');
+    await user.click(planA);
+    expect(planA).toHaveAttribute('aria-pressed', 'true');
+    expect(screen.getByRole('status')).toHaveTextContent('已选择 Plan A：调整苍山徒步为古城慢游；方案已保存到本浏览器的旅行决策，未创建订单');
     expect(useTripStore.getState().guardianPlans['draft-dali-slow-5d']).toEqual({
       id: 'PLAN-A',
       title: '调整苍山徒步为古城慢游',
     });
   });
 });
diff --git a/tests/e2e/accessibility.spec.ts b/tests/e2e/accessibility.spec.ts
index 9be07fe..df0e55f 100644
--- a/tests/e2e/accessibility.spec.ts
+++ b/tests/e2e/accessibility.spec.ts
@@ -54,21 +54,28 @@ test('search main path and search tabs work from the keyboard', async ({ page })
   await page.keyboard.press('Enter');
   await expect(page).toHaveURL(/\/compare\?/);
 });
 
 test('filter dialog traps focus, closes with Escape, and restores its trigger', async ({ page }) => {
   await page.goto('/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2');
   const trigger = page.getByRole('button', { name: '筛选条件' });
   await trigger.click();
   const dialog = page.getByRole('dialog', { name: '筛选条件' });
   await expect(dialog).toBeVisible();
-  await expect(page.getByRole('button', { name: '关闭筛选' })).toBeFocused();
+  const first = page.getByRole('button', { name: '关闭筛选' });
+  const last = page.getByRole('button', { name: '应用筛选' });
+  await expect(first).toBeFocused();
+  await last.focus();
+  await page.keyboard.press('Tab');
+  await expect(first).toBeFocused();
+  await page.keyboard.press('Shift+Tab');
+  await expect(last).toBeFocused();
   await page.keyboard.press('Escape');
   await expect(dialog).toBeHidden();
   await expect(trigger).toBeFocused();
 });
 
 test('external quote confirmation remains in the local demo', async ({ page }) => {
   await page.goto('/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2');
   await page.getByRole('button', { name: /查看 .*演示报价/ }).first().click();
   await expect(page.getByRole('dialog', { name: '前往外部供应商' })).toBeVisible();
   await page.getByRole('button', { name: /确认前往外部页面/ }).click();
diff --git a/tests/e2e/core-journey.spec.ts b/tests/e2e/core-journey.spec.ts
index 3be7dc4..58e0253 100644
--- a/tests/e2e/core-journey.spec.ts
+++ b/tests/e2e/core-journey.spec.ts
@@ -17,36 +17,54 @@ const unexpectedConsoleMessages = (page: import('@playwright/test').Page) => {
 };
 
 test.use({ viewport: { width: 1440, height: 1024 } });
 
 test('guide to guarded alternative plan through the public UI', async ({ page }) => {
   const errors = unexpectedConsoleMessages(page);
 
   await page.goto('/');
   await page.getByRole('tab', { name: '机票' }).click();
   await page.getByRole('textbox', { name: '到达地' }).fill('大理');
+  await page.getByLabel('出发日期').fill('2026-09-18');
+  await page.getByLabel('返程日期').fill('2026-09-22');
+  await page.getByLabel('乘机人').selectOption('3');
   const quoteStream = page.waitForResponse((response) => response.url().includes('/api/v1/comparison/searches/') && response.url().endsWith('/events'));
   await page.getByRole('button', { name: '开始规划' }).click();
 
   await expect(page).toHaveURL(/\/compare\?/);
+  const submittedSearch = Object.fromEntries(new URL(page.url()).searchParams);
+  expect(submittedSearch).toEqual({
+    kind: 'flight',
+    destination: '大理',
+    from: '2026-09-18',
+    to: '2026-09-22',
+    travelers: '3',
+  });
   expect((await quoteStream).status()).toBe(200);
+  await expect(page.getByText('大理 · 沙箱演示报价', { exact: true })).toBeVisible();
   await expect(page.getByText('¥1,010 含税总价')).toBeVisible();
 
   await page.getByRole('link', { name: '灵感广场' }).click();
   await page.getByRole('link', { name: '把大理留给慢下来的人：5 天环洱海松弛路线', exact: true }).click();
   await page.getByRole('button', { name: '转为行程' }).click();
   await page.getByRole('button', { name: '确认并保存草稿' }).click();
   await page.getByRole('button', { name: '发布搭子意愿' }).click();
   await expect(page.getByRole('status')).toContainText('搭子意愿已保存到本浏览器');
   await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '寻找搭子' }).click();
-  await page.getByRole('button', { name: '发布匹配意愿' }).click();
+  await expect(page.getByText('已读取本地匹配意愿', { exact: true })).toBeVisible();
+  await expect(page.getByRole('button', { name: '发布匹配意愿' })).toHaveCount(0);
+  await expect(page.getByTestId('partner-card-user-muyu').getByLabel('匹配分 92')).toBeVisible();
   await page.getByRole('button', { name: '愿意认识木雨' }).click();
   await page.getByRole('button', { name: '模拟对方同意（沙箱）' }).click();
   await page.getByRole('link', { name: '进入聊天' }).click();
   await expect(page.getByText(/其他敏感信息/)).toBeVisible();
 
   await page.getByRole('link', { name: /行程守护/ }).click();
   await expect(page.getByRole('heading', { name: '备选方案' })).toBeVisible();
-  await page.getByRole('button', { name: /Plan A/ }).click();
-  await expect(page.getByText(/方案已保存到本浏览器/)).toBeVisible();
+  const planA = page.getByRole('button', { name: '选择 Plan A：调整苍山徒步为古城慢游方案' });
+  await expect(planA).toHaveAttribute('aria-pressed', 'false');
+  await expect(page.getByRole('status')).toHaveCount(0);
+  await planA.click();
+  await expect(planA).toHaveAttribute('aria-pressed', 'true');
+  await expect(page.getByRole('status')).toHaveText('已选择 Plan A：调整苍山徒步为古城慢游；方案已保存到本浏览器的旅行决策，未创建订单');
   expect(errors).toEqual([]);
 });
diff --git a/tests/e2e/responsive.spec.ts b/tests/e2e/responsive.spec.ts
index e57750b..d3ba6ac 100644
--- a/tests/e2e/responsive.spec.ts
+++ b/tests/e2e/responsive.spec.ts
@@ -1,49 +1,112 @@
 import { expect, test } from '@playwright/test';
 
+type Page = import('@playwright/test').Page;
+
 const runtimeErrors = new WeakMap<import('@playwright/test').Page, string[]>();
 
 test.beforeEach(async ({ page }) => {
   const errors: string[] = [];
   runtimeErrors.set(page, errors);
   page.on('console', (message) => {
     if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
   });
   page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
   page.on('response', (response) => {
     if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`);
   });
 });
 
 test.afterEach(async ({ page }) => {
   expect(runtimeErrors.get(page)).toEqual([]);
 });
 
+async function waitForResponsiveReady(page: Page, routeReady: () => Promise<void>) {
+  await expect(page.locator('main')).toBeVisible();
+  await routeReady();
+
+  const images = page.locator('img');
+  for (let index = 0; index < await images.count(); index += 1) {
+    await images.nth(index).scrollIntoViewIfNeeded();
+  }
+  await page.evaluate(() => window.scrollTo(0, 0));
+  await page.waitForFunction(() =>
+    document.readyState === 'complete' &&
+    document.fonts.status === 'loaded' &&
+    [...document.images].every((image) => image.complete),
+  );
+
+  const readiness = await page.evaluate(() => ({
+    document: document.readyState,
+    fonts: document.fonts.status,
+    images: [...document.images].every((image) => image.complete),
+  }));
+  expect(readiness).toEqual({ document: 'complete', fonts: 'loaded', images: true });
+
+  const menu = page.getByRole('button', { name: '打开导航' });
+  await expect(menu).toHaveAttribute('aria-expanded', 'false');
+  await menu.click();
+  await expect(page.getByRole('button', { name: '关闭导航' })).toHaveAttribute('aria-expanded', 'true');
+  await page.getByRole('button', { name: '关闭导航' }).click();
+  await expect(menu).toHaveAttribute('aria-expanded', 'false');
+}
+
+async function expectNoHorizontalOverflow(page: Page) {
+  const width = await page.evaluate(() => ({
+    body: document.body.scrollWidth,
+    document: document.documentElement.scrollWidth,
+    viewport: window.innerWidth,
+  }));
+  expect(Math.max(width.body, width.document)).toBeLessThanOrEqual(width.viewport);
+}
+
+async function expectClosedAndOpenLayoutsFit(page: Page) {
+  await expectNoHorizontalOverflow(page);
+  await page.getByRole('button', { name: '打开导航' }).click();
+  await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '真实比价' })).toBeVisible();
+  await expectNoHorizontalOverflow(page);
+}
+
 test.describe('mobile public MVP', () => {
   test.use({ viewport: { width: 390, height: 844 } });
 
   test('mobile navigation is available without horizontal overflow', async ({ page }) => {
-    await page.goto('/');
-    await expect(page.getByRole('button', { name: '打开导航' })).toBeVisible();
-    await page.getByRole('button', { name: '打开导航' }).click();
-    await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '真实比价' })).toBeVisible();
-
-    const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
-    expect(width.body).toBeLessThanOrEqual(width.viewport);
+    await page.goto('/', { waitUntil: 'commit' });
+    await waitForResponsiveReady(page, async () => {
+      await expect(page.getByRole('button', { name: '开始规划' })).toBeVisible();
+    });
+    await expectClosedAndOpenLayoutsFit(page);
   });
 
-  for (const route of [
-    '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
-    '/square',
-    '/trips/dali-slow-5d',
-    '/partners',
-    '/assistant',
-    '/guardian/dali-slow-5d',
-  ]) {
+  for (const { route, ready } of [
+    {
+      route: '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
+      ready: async (page: Page) => { await expect(page.getByText('¥1,010 含税总价')).toBeVisible(); },
+    },
+    {
+      route: '/square',
+      ready: async (page: Page) => { await expect(page.getByRole('button', { name: '查看兴趣偏好' })).toBeVisible(); },
+    },
+    {
+      route: '/trips/dali-slow-5d',
+      ready: async (page: Page) => { await expect(page.getByRole('heading', { name: '未找到本地行程草稿' })).toBeVisible(); },
+    },
+    {
+      route: '/partners',
+      ready: async (page: Page) => { await expect(page.getByRole('button', { name: '发布匹配意愿' })).toBeVisible(); },
+    },
+    {
+      route: '/assistant',
+      ready: async (page: Page) => { await expect(page.getByLabel('你的问题')).toBeVisible(); },
+    },
+    {
+      route: '/guardian/dali-slow-5d',
+      ready: async (page: Page) => { await expect(page.getByRole('button', { name: /选择 Plan A/ })).toBeVisible(); },
+    },
+  ] as const) {
     test(`does not horizontally overflow on ${route}`, async ({ page }) => {
-      await page.goto(route);
-      await expect(page.locator('main')).toBeVisible();
-      const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
-      expect(width.body).toBeLessThanOrEqual(width.viewport);
+      await page.goto(route, { waitUntil: 'commit' });
+      await waitForResponsiveReady(page, () => ready(page));
+      await expectClosedAndOpenLayoutsFit(page);
     });
   }
 });
diff --git a/tests/unit/partner-eligibility.test.ts b/tests/unit/partner-eligibility.test.ts
index 18d2674..7d0fb86 100644
--- a/tests/unit/partner-eligibility.test.ts
+++ b/tests/unit/partner-eligibility.test.ts
@@ -10,20 +10,21 @@ import {
   type PartnerIntent,
 } from '@/data/partners';
 import { containsContactDetails, createPartnerStore } from '@/stores/partner-store';
 
 const eligibleProfile = {
   id: 'viewer-demo',
   age: 28,
   identityVerified: true,
   riskStatus: 'clear' as const,
 };
+const daliPartnerIntent = { ...defaultPartnerIntent, destination: '大理' };
 
 beforeEach(() => window.localStorage.clear());
 
 describe('partner eligibility', () => {
   it.each([
     [{ age: 17, identityVerified: true, riskStatus: 'clear' as const }, 'AGE_RESTRICTED'],
     [{ age: 24, identityVerified: false, riskStatus: 'clear' as const }, 'IDENTITY_REQUIRED'],
     [{ age: 24, identityVerified: true, riskStatus: 'review' as const }, 'RISK_RESTRICTED'],
   ])('blocks ineligible partner actions with a deterministic code', (profile, code) => {
     expect(isPartnerEligible({ id: 'viewer', ...profile })).toEqual({ allowed: false, code });
@@ -65,30 +66,30 @@ describe('partner intent and hard filters', () => {
         endDate: '返程日期不能早于出发日期',
         interests: '请至少选择一项兴趣',
       },
     });
   });
 
   it('filters destination, date, capacity, certification, blocked relations, and candidate risk', () => {
     const seed = demoPartnerCandidates[0];
     const candidates: PartnerCandidate[] = [
       seed,
-      { ...seed, id: 'wrong-destination', destination: '大理' },
+      { ...seed, id: 'wrong-destination', destination: '川西' },
       { ...seed, id: 'wrong-date', startDate: '2026-10-02', endDate: '2026-10-05' },
       { ...seed, id: 'full', capacity: 1 },
       { ...seed, id: 'uncertified', certified: false },
       { ...seed, id: 'blocked-us', blockedUserIds: [eligibleProfile.id] },
       { ...seed, id: 'we-blocked', blockedUserIds: [] },
       { ...seed, id: 'risk', riskStatus: 'review' },
     ];
 
-    expect(filterPartnerCandidates(defaultPartnerIntent, candidates, {
+    expect(filterPartnerCandidates(daliPartnerIntent, candidates, {
       viewerId: eligibleProfile.id,
       blockedCandidateIds: ['we-blocked'],
     }).map((candidate) => candidate.id)).toEqual([seed.id]);
   });
 
   it('keeps the approved candidate at 92 with exactly three understandable shared-model reasons', () => {
     const result = scorePartnerCandidate(defaultPartnerIntent, demoPartnerCandidates[0]);
 
     expect(result.score).toBe(92);
     expect(result.reasons).toEqual([
@@ -144,21 +145,21 @@ describe('partner intent and hard filters', () => {
 describe('partner match and chat state', () => {
   it('gates publish and match, then allows only pending_mutual to advance to matched', () => {
     const store = createPartnerStore();
     const candidateId = demoPartnerCandidates[0].id;
 
     expect(() => store.getState().publishIntent(
       { ...eligibleProfile, identityVerified: false },
       defaultPartnerIntent,
     )).toThrow('IDENTITY_REQUIRED');
 
-    store.getState().publishIntent(eligibleProfile, defaultPartnerIntent);
+    store.getState().publishIntent(eligibleProfile, daliPartnerIntent);
     const matchId = store.getState().requestMatch(eligibleProfile, candidateId);
     expect(store.getState().matches[matchId].status).toBe('pending_mutual');
     expect(() => store.getState().sendMessage(eligibleProfile, matchId, '你好')).toThrow(
       'PARTNER_MATCH_NOT_READY',
     );
 
     store.getState().simulateMutualApproval(eligibleProfile, matchId);
     expect(store.getState().matches[matchId].status).toBe('matched');
     expect(() => store.getState().simulateMutualApproval(eligibleProfile, matchId)).toThrow(
       'PARTNER_INVALID_TRANSITION:matched:matched',
@@ -335,15 +336,15 @@ describe('partner match and chat state', () => {
 
     expect(hydrationFailure).toBeInstanceOf(Error);
     expect((hydrationFailure as Error).message).toBe('PARTNER_INVALID_PERSISTED_STATE');
     expect(store.getState().matches).toEqual({});
     expect(window.localStorage.getItem('xingyu-partner-demo-v1')).toBe(unsafeBytes);
   });
 });
 
 function matchedStore() {
   const store = createPartnerStore();
-  store.getState().publishIntent(eligibleProfile, defaultPartnerIntent);
+  store.getState().publishIntent(eligibleProfile, daliPartnerIntent);
   const matchId = store.getState().requestMatch(eligibleProfile, demoPartnerCandidates[0].id);
   store.getState().simulateMutualApproval(eligibleProfile, matchId);
   return store;
 }
diff --git a/tests/unit/trip-to-partner-intent.test.ts b/tests/unit/trip-to-partner-intent.test.ts
new file mode 100644
index 0000000..0bd15cf
--- /dev/null
+++ b/tests/unit/trip-to-partner-intent.test.ts
@@ -0,0 +1,30 @@
+import { describe, expect, it } from 'vitest';
+import { defaultPartnerIntent, demoPartnerCandidates, filterPartnerCandidates, scorePartnerCandidate, validatePartnerIntent } from '@/data/partners';
+import { tripToPartnerIntent } from '@/features/partners/trip-to-partner-intent';
+
+describe('tripToPartnerIntent', () => {
+  it('uses canonical trip fields while preserving personal preferences and keeps 木雨 at score 92', () => {
+    const canonicalTrip = {
+      id: 'draft-dali-slow-5d',
+      sourcePostSlug: 'dali-slow-5d',
+      title: '大理慢行计划',
+      destination: '大理',
+      startDate: '2026-09-18',
+      endDate: '2026-09-22',
+      travelers: 3,
+      budget: 5200,
+      status: 'active',
+      guardianEnabled: false,
+      items: [],
+      candidates: [],
+      votes: {},
+    } as const;
+    const intent = tripToPartnerIntent(canonicalTrip, defaultPartnerIntent);
+    expect(intent).toMatchObject({ destination: '大理', startDate: '2026-09-18', endDate: '2026-09-22', budget: 5200, pace: defaultPartnerIntent.pace });
+    expect(validatePartnerIntent(intent)).toMatchObject({ success: true });
+    const candidates = filterPartnerCandidates(intent, demoPartnerCandidates, { viewerId: 'viewer-demo', blockedCandidateIds: [] });
+    const muyu = candidates.find((candidate) => candidate.id === 'user-muyu');
+    expect(muyu).toBeDefined();
+    expect(scorePartnerCandidate(intent, muyu!).score).toBe(92);
+  });
+});
