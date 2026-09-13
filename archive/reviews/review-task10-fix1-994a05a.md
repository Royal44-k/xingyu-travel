# Commits
994a05a fix: harden profile hydration and report focus

# Diff stat
 .../2026-08-16-xingyu-public-mvp/task-10-report.md | 20 ++++++++++++++++
 src/app/square/page.tsx                            | 20 +++++++++++++---
 src/components/report-dialog.tsx                   |  2 +-
 src/features/comparison/use-dialog-focus.ts        |  3 ++-
 src/features/profile/preference-settings.tsx       |  6 ++++-
 src/stores/profile-store.ts                        | 24 +++++++++++++++----
 tests/component/feedback-dialogs.test.tsx          | 23 ++++++++++++++++++
 tests/component/preference-settings.test.tsx       | 28 +++++++++++++++++++++-
 tests/component/square-feed.test.tsx               | 24 ++++++++++++++++++-
 9 files changed, 138 insertions(+), 12 deletions(-)

# Full diff
diff --git a/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-10-report.md b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-10-report.md
index 43abee3..ea5528f 100644
--- a/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-10-report.md
+++ b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-10-report.md
@@ -27,10 +27,30 @@
 - `useProfileStore` is the only persisted source for `personalizedFeed` and `interestTags`; Square derives either recommended or chronological ordering directly from it.
 - Persistence uses `skipHydration`, strict Zod parsing, and fail-closed defaults. Empty interests force personalized ranking off; malformed persisted data cannot be merged into live state.
 - `ReportDialog` is reached from every Square `PostCard`; it validates a reason, labels its browser-local demo disposition, and supports Escape, focus trap, cancel, submit, and trigger restoration.
 - `ExternalBookingDialog` is reached from Compare offers. It discloses provider responsibility and no on-platform payment, requires confirmation, protects focus, and permits the controlled external action only in a supported production deployment (not tests/local previews).
 - `DemoBanner`, profile copy, health response, metadata routes, error boundaries, and 404 path all avoid claims of real identity checks, orders, payment, real-time APIs, or emergency services.
 
 ## Risks / follow-up
 
 - The production outbound target is a generic public travel-search handoff because the MVP has no contracted supplier adapter. Before enabling a real supplier, replace that URL with a provider-owned, reviewed adapter destination.
 - The default SEO fallback is the Vercel project hostname; configure `VERCEL_URL` from the deployment environment for previews/production.
+
+## Fix round 1 — review hardening
+
+### Root cause, RED → GREEN
+
+- **Malformed profile persistence:** the initial store began from recommendation-on defaults, and a Zod parse failure merely reported an error while preserving that default state. The new browser-storage regression first failed (`expected true to be false`, **1 failed, 2 passed**) after production `rehydrate()` read an invalid `xingyu-profile-demo-v1` value. The persistence merge now returns a fail-closed state (chronological, no interests), reports the hydration error, and does not write over the malformed raw value. An explicit user reset is the only path that restores demo defaults. GREEN: **3/3**.
+- **Square hydration flash:** the initial Square page exposed default recommendation controls before the skipped hydration completed. The deferred-rehydrate regression first failed because the neutral status was absent and recommendation controls rendered (**1 failed, 6 passed**). Square now withholds feed controls and posts behind a neutral local-preference status; on completion it renders the saved chronological state once, while a parse failure shows a recoverable chronological notice. GREEN: **7/7**.
+- **Report result focus:** submit removed the focused submit button, leaving `document.body` active because the focus trap did not re-activate for the result view. The focused regression first failed (`expected close result button to have focus; received body`, **1 failed, 5 passed**). The shared dialog hook now accepts an activation key, and `ReportDialog` keys it on submitted state so the result close button receives focus; Tab, Shift+Tab, Escape, and trigger restoration remain contained. GREEN: **6/6**.
+
+### Fix-round verification
+
+- `node.exe node_modules\\vitest\\vitest.mjs run tests/component/preference-settings.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → RED 1 failed/2 passed, then GREEN **3/3**.
+- `node.exe node_modules\\vitest\\vitest.mjs run tests/component/square-feed.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → RED 1 failed/6 passed, then GREEN **7/7**.
+- `node.exe node_modules\\vitest\\vitest.mjs run tests/component/feedback-dialogs.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → RED 1 failed/5 passed, then GREEN **6/6**.
+- `node.exe node_modules\\vitest\\vitest.mjs run tests/component/comparison-client.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → GREEN **11/11**, including outbound-dialog focus trapping and trigger restoration after the shared hook change.
+- `node.exe node_modules\\vitest\\vitest.mjs run tests/unit/security-headers.test.ts tests/unit/production-safeguards.test.ts --pool=threads --maxWorkers=1 --reporter=verbose` → GREEN **3/3**.
+- `node_modules\\.bin\\tsc.cmd --noEmit` → GREEN (exit 0).
+- `node_modules\\.bin\\eslint.cmd .` → GREEN (exit 0).
+- `node_modules\\.bin\\next.cmd build` → GREEN (exit 0); compiled, type checked, and generated all 13 static pages.
+- `node.exe node_modules\\vitest\\vitest.mjs run --pool=threads --maxWorkers=1 --reporter=dot` was attempted for the requested full suite. Desktop emitted only `RUN v4.1.10 D:/Codex-chat/xingyu-travel/.worktrees/xingyu-public-mvp` before its child process detached, without dots or a terminal test summary. It is explicitly **not counted as PASS**; no process was terminated.
diff --git a/src/app/square/page.tsx b/src/app/square/page.tsx
index cbc0692..901056f 100644
--- a/src/app/square/page.tsx
+++ b/src/app/square/page.tsx
@@ -1,35 +1,49 @@
 'use client';
 
 import { useEffect } from 'react';
+import Link from 'next/link';
 import { SiteHeader } from '@/components/site-header';
 import { orderPosts, type FeedMode } from '@/data/posts';
 import { FeedControls } from '@/features/square/feed-controls';
 import { PostCard } from '@/features/square/post-card';
 import styles from '@/features/square/square.module.css';
-import { hydrateProfileStore, useProfileStore } from '@/stores/profile-store';
+import {
+  hydrateProfileStore,
+  useProfileStore,
+  useProfileStoreHydration,
+} from '@/stores/profile-store';
 
 export default function SquarePage() {
   const personalizedFeed = useProfileStore((state) => state.personalizedFeed);
   const interestTags = useProfileStore((state) => state.interestTags);
   const setPersonalizedFeed = useProfileStore((state) => state.setPersonalizedFeed);
   const clearInterestTags = useProfileStore((state) => state.clearInterestTags);
+  const hydrated = useProfileStoreHydration((state) => state.hydrated);
+  const hydrationError = useProfileStoreHydration((state) => state.hydrationError);
   const mode: FeedMode = personalizedFeed && interestTags.length > 0 ? 'recommended' : 'chronological';
   const posts = orderPosts(mode, interestTags);
 
   useEffect(() => {
     void hydrateProfileStore();
   }, []);
 
   return (
     <>
       <SiteHeader activePath="/square" />
       <main className={styles.squarePage}>
         <header className={styles.hero}><p>GUIDE SQUARE</p><h1>在别人的路书里，找到自己的出发理由。</h1><span>真实的旅行片段，整理成可继续编辑的本地行程草稿。</span></header>
         <section aria-labelledby="feed-title" className={styles.feedSection}>
-          <div className={styles.feedHeading}><div><p>编辑精选</p><h2 id="feed-title">旅行者正在分享</h2></div><FeedControls interestTags={interestTags} mode={mode} onClearInterestTags={clearInterestTags} onModeChange={(nextMode) => setPersonalizedFeed(nextMode === 'recommended')} /></div>
-          <div className={styles.masonry}>{posts.map((post) => <PostCard key={post.slug} post={post} />)}</div>
+          <div className={styles.feedHeading}><div><p>编辑精选</p><h2 id="feed-title">旅行者正在分享</h2></div>{hydrated ? <FeedControls interestTags={interestTags} mode={mode} onClearInterestTags={clearInterestTags} onModeChange={(nextMode) => setPersonalizedFeed(nextMode === 'recommended')} /> : null}</div>
+          {!hydrated ? (
+            <p className={styles.loading} role="status">正在读取浏览器本地偏好，暂不展示排序与推荐结果。</p>
+          ) : (
+            <>
+              {hydrationError ? <p className={styles.recommendationHint} role="status">本地偏好无法安全读取，当前按时间排序；可前往 <Link href="/profile">演示账户</Link> 重置偏好。</p> : null}
+              <div className={styles.masonry}>{posts.map((post) => <PostCard key={post.slug} post={post} />)}</div>
+            </>
+          )}
         </section>
       </main>
     </>
   );
 }
diff --git a/src/components/report-dialog.tsx b/src/components/report-dialog.tsx
index a0f9bb2..13078ea 100644
--- a/src/components/report-dialog.tsx
+++ b/src/components/report-dialog.tsx
@@ -23,21 +23,21 @@ function ReportDialogContent({ subject, returnFocusRef, onClose }: Omit<ReportDi
   const dialogRef = useRef<HTMLElement>(null);
   const [reason, setReason] = useState<string>();
   const [error, setError] = useState<string>();
   const [submitted, setSubmitted] = useState(false);
 
   function close() {
     returnFocusRef.current?.focus();
     onClose();
   }
 
-  useDialogFocus(true, dialogRef, returnFocusRef, close);
+  useDialogFocus(true, dialogRef, returnFocusRef, close, submitted);
 
   if (submitted) {
     return (
       <div className={styles.dialogBackdrop}>
         <section aria-label="举报结果" aria-modal="true" className={styles.confirmDialog} ref={dialogRef} role="dialog" tabIndex={-1}>
           <span className={styles.demoPill}>本地演示处置</span>
           <h2>已记录演示举报</h2>
           <p role="status">仅记录在此浏览器的演示状态，不会联系作者或提交到外部平台。</p>
           <button className={styles.primaryButton} onClick={close} type="button">关闭举报结果</button>
         </section>
diff --git a/src/features/comparison/use-dialog-focus.ts b/src/features/comparison/use-dialog-focus.ts
index c921a67..d402554 100644
--- a/src/features/comparison/use-dialog-focus.ts
+++ b/src/features/comparison/use-dialog-focus.ts
@@ -9,20 +9,21 @@ const focusableSelector = [
   'select:not([disabled])',
   'textarea:not([disabled])',
   '[tabindex]:not([tabindex="-1"])',
 ].join(',');
 
 export function useDialogFocus(
   open: boolean,
   dialogRef: RefObject<HTMLElement | null>,
   returnFocusRef: RefObject<HTMLElement | null>,
   onClose: () => void,
+  activationKey?: unknown,
 ) {
   const closeRef = useRef(onClose);
 
   useEffect(() => {
     closeRef.current = onClose;
   }, [onClose]);
 
   useEffect(() => {
     if (!open) return;
     const dialog = dialogRef.current;
@@ -58,12 +59,12 @@ export function useDialogFocus(
         event.preventDefault();
         first.focus();
       }
     }
 
     dialog.addEventListener('keydown', handleKeyDown);
     return () => {
       dialog.removeEventListener('keydown', handleKeyDown);
       returnTarget?.focus();
     };
-  }, [dialogRef, open, returnFocusRef]);
+  }, [activationKey, dialogRef, open, returnFocusRef]);
 }
diff --git a/src/features/profile/preference-settings.tsx b/src/features/profile/preference-settings.tsx
index b174f4c..fdc2462 100644
--- a/src/features/profile/preference-settings.tsx
+++ b/src/features/profile/preference-settings.tsx
@@ -6,37 +6,41 @@ import {
   hydrateProfileStore,
   useProfileStore,
   useProfileStoreHydration,
 } from '@/stores/profile-store';
 
 export function PreferenceSettings() {
   const personalizedFeed = useProfileStore((state) => state.personalizedFeed);
   const interestTags = useProfileStore((state) => state.interestTags);
   const setPersonalizedFeed = useProfileStore((state) => state.setPersonalizedFeed);
   const clearInterestTags = useProfileStore((state) => state.clearInterestTags);
+  const resetProfilePreferences = useProfileStore((state) => state.resetProfilePreferences);
   const hydrated = useProfileStoreHydration((state) => state.hydrated);
   const hydrationError = useProfileStoreHydration((state) => state.hydrationError);
   const canPersonalize = interestTags.length > 0;
 
   useEffect(() => {
     void hydrateProfileStore();
   }, []);
 
   if (!hydrated) return <p aria-live="polite">正在读取浏览器本地偏好…</p>;
 
   return (
     <section aria-labelledby="preference-title" className="preferenceSettings">
       <p>RECOMMENDATION SETTINGS</p>
       <h2 id="preference-title">推荐与兴趣偏好</h2>
       <p>仅保存在当前浏览器，用于决定攻略广场的排序方式。</p>
       {hydrationError ? (
-        <p role="status">本地偏好无法安全读取，已使用默认演示设置。</p>
+        <div role="status">
+          <p>本地偏好无法安全读取，已关闭个性化推荐并保留原始浏览器数据。</p>
+          <button onClick={() => { resetProfilePreferences(); useProfileStoreHydration.setState({ hydrationError: false }); }} type="button">重置演示偏好</button>
+        </div>
       ) : null}
       <div className="preferenceSwitchRow">
         <span>个性化推荐</span>
         <button
           aria-checked={personalizedFeed && canPersonalize}
           aria-describedby={canPersonalize ? undefined : 'personalization-disabled'}
           aria-label="个性化推荐"
           disabled={!canPersonalize}
           onClick={() => setPersonalizedFeed(!personalizedFeed)}
           role="switch"
diff --git a/src/stores/profile-store.ts b/src/stores/profile-store.ts
index 554f3ef..ff67f81 100644
--- a/src/stores/profile-store.ts
+++ b/src/stores/profile-store.ts
@@ -10,37 +10,44 @@ export type DemoProfile = {
   identityVerified: true;
   riskStatus: 'clear';
 };
 
 export type ProfileState = {
   demoProfile: DemoProfile;
   personalizedFeed: boolean;
   interestTags: string[];
   setPersonalizedFeed: (value: boolean) => void;
   clearInterestTags: () => void;
+  resetProfilePreferences: () => void;
 };
 
 type ProfileHydrationState = {
   hydrated: boolean;
   hydrationError: boolean;
 };
 
 type CreateProfileStoreOptions = {
   onHydrationError?: (error: unknown) => void;
 };
 
 const defaultProfileState = {
   demoProfile: { age: 26, identityVerified: true, riskStatus: 'clear' },
   personalizedFeed: true,
   interestTags: ['山野', '人文', '慢旅行'],
 } as const satisfies Pick<ProfileState, 'demoProfile' | 'personalizedFeed' | 'interestTags'>;
 
+const failedClosedProfileState: Pick<ProfileState, 'demoProfile' | 'personalizedFeed' | 'interestTags'> = {
+  demoProfile: { ...defaultProfileState.demoProfile },
+  personalizedFeed: false,
+  interestTags: [],
+};
+
 const persistedProfileSchema = z.object({
   demoProfile: z.object({
     age: z.literal(26),
     identityVerified: z.literal(true),
     riskStatus: z.literal('clear'),
   }).strict(),
   personalizedFeed: z.boolean(),
   interestTags: z.array(z.string().min(1).max(40)).max(12),
 }).strict().superRefine((value, context) => {
   if (new Set(value.interestTags).size !== value.interestTags.length) {
@@ -59,37 +66,46 @@ function parsePersistedProfile(state: unknown): PersistedProfileState {
   throw new Error('PROFILE_INVALID_PERSISTED_STATE');
 }
 
 function stateCreator(set: (recipe: (state: ProfileState) => Partial<ProfileState>) => void): ProfileState {
   return {
     ...defaultProfileState,
     setPersonalizedFeed: (value) => set((state) => ({
       personalizedFeed: value && state.interestTags.length > 0,
     })),
     clearInterestTags: () => set(() => ({ interestTags: [], personalizedFeed: false })),
+    resetProfilePreferences: () => set(() => ({
+      demoProfile: { ...defaultProfileState.demoProfile },
+      personalizedFeed: true,
+      interestTags: [...defaultProfileState.interestTags],
+    })),
   };
 }
 
 function persistenceOptions(options: CreateProfileStoreOptions = {}) {
   return {
     name: 'xingyu-profile-demo-v1',
     version: 1,
     skipHydration: true,
     partialize: (state: ProfileState): PersistedProfileState => ({
       demoProfile: state.demoProfile,
       personalizedFeed: state.personalizedFeed,
       interestTags: state.interestTags,
     }),
-    merge: (persistedState: unknown, currentState: ProfileState): ProfileState => ({
-      ...currentState,
-      ...parsePersistedProfile(persistedState),
-    }),
+    merge: (persistedState: unknown, currentState: ProfileState): ProfileState => {
+      try {
+        return { ...currentState, ...parsePersistedProfile(persistedState) };
+      } catch (error) {
+        options.onHydrationError?.(error);
+        return { ...currentState, ...failedClosedProfileState };
+      }
+    },
     onRehydrateStorage: () => (_state: ProfileState | undefined, error: unknown) => {
       if (error) options.onHydrationError?.(error);
     },
   };
 }
 
 export function createProfileStore(options: CreateProfileStoreOptions = {}) {
   return createStore<ProfileState>()(
     persist<ProfileState, [], [], PersistedProfileState>(stateCreator, persistenceOptions(options)),
   );
diff --git a/tests/component/feedback-dialogs.test.tsx b/tests/component/feedback-dialogs.test.tsx
index 738062a..3d60fd4 100644
--- a/tests/component/feedback-dialogs.test.tsx
+++ b/tests/component/feedback-dialogs.test.tsx
@@ -36,20 +36,43 @@ describe('ReportDialog', () => {
     );
 
     await user.click(screen.getByRole('radio', { name: '虚假或误导信息' }));
     await user.click(screen.getByRole('button', { name: '提交举报' }));
     expect(screen.getByRole('dialog', { name: '举报结果' })).toBeInTheDocument();
     rerender(<ReportDialog onClose={() => undefined} open={false} returnFocusRef={createRef<HTMLButtonElement>()} subject="第一篇攻略" />);
     rerender(<ReportDialog onClose={() => undefined} open returnFocusRef={createRef<HTMLButtonElement>()} subject="另一篇攻略" />);
 
     expect(screen.getByRole('dialog', { name: '举报内容' })).toHaveTextContent('另一篇攻略');
   });
+
+  it('moves focus into the report result and keeps its keyboard trap until close', async () => {
+    const user = userEvent.setup();
+    const trigger = document.createElement('button');
+    document.body.append(trigger);
+    trigger.focus();
+    const onClose = vi.fn();
+    render(<ReportDialog onClose={onClose} open returnFocusRef={{ current: trigger }} subject="大理五日慢游" />);
+
+    await user.click(screen.getByRole('radio', { name: '虚假或误导信息' }));
+    await user.click(screen.getByRole('button', { name: '提交举报' }));
+
+    const close = screen.getByRole('button', { name: '关闭举报结果' });
+    expect(close).toHaveFocus();
+    await user.keyboard('{Tab}');
+    expect(close).toHaveFocus();
+    await user.keyboard('{Shift>}{Tab}{/Shift}');
+    expect(close).toHaveFocus();
+    await user.keyboard('{Escape}');
+    expect(onClose).toHaveBeenCalledOnce();
+    expect(trigger).toHaveFocus();
+    trigger.remove();
+  });
 });
 
 describe('square report entry point', () => {
   it('opens the validated report dialog from a public post card', async () => {
     const user = userEvent.setup();
     render(<PostCard post={posts[0]} />);
 
     await user.click(screen.getByRole('button', { name: `举报 ${posts[0].title}` }));
     expect(screen.getByRole('dialog', { name: '举报内容' })).toHaveTextContent(posts[0].title);
   });
diff --git a/tests/component/preference-settings.test.tsx b/tests/component/preference-settings.test.tsx
index abd2ea7..8ab2c37 100644
--- a/tests/component/preference-settings.test.tsx
+++ b/tests/component/preference-settings.test.tsx
@@ -1,26 +1,52 @@
 import { render, screen } from '@testing-library/react';
 import userEvent from '@testing-library/user-event';
 import { beforeEach, describe, expect, it } from 'vitest';
 import { PreferenceSettings } from '@/features/profile/preference-settings';
-import { useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';
+import { createProfileStore, useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';
 
 describe('PreferenceSettings', () => {
   beforeEach(() => {
     window.localStorage.clear();
     useProfileStore.setState({
       personalizedFeed: true,
       interestTags: ['山野', '人文', '慢旅行'],
     });
     useProfileStoreHydration.setState({ hydrated: true, hydrationError: false });
   });
 
+  it('fails closed for malformed browser persistence without overwriting it until an explicit reset', async () => {
+    const malformed = JSON.stringify({
+      state: {
+        demoProfile: { age: 26, identityVerified: true, riskStatus: 'clear' },
+        personalizedFeed: true,
+        interestTags: 'not-a-list',
+      },
+      version: 1,
+    });
+    window.localStorage.setItem('xingyu-profile-demo-v1', malformed);
+    let hydrationError: unknown;
+    const store = createProfileStore({ onHydrationError: (error) => { hydrationError = error; } });
+
+    await store.persist.rehydrate();
+
+    expect(store.getState().personalizedFeed).toBe(false);
+    expect(store.getState().interestTags).toEqual([]);
+    expect(hydrationError).toBeInstanceOf(Error);
+    expect(window.localStorage.getItem('xingyu-profile-demo-v1')).toBe(malformed);
+
+    store.getState().resetProfilePreferences();
+    expect(store.getState().personalizedFeed).toBe(true);
+    expect(store.getState().interestTags).toEqual(['山野', '人文', '慢旅行']);
+    expect(window.localStorage.getItem('xingyu-profile-demo-v1')).not.toBe(malformed);
+  });
+
   it('clears interest labels and disables personalized recommendations', async () => {
     const user = userEvent.setup();
     render(<PreferenceSettings />);
 
     await user.click(screen.getByRole('switch', { name: '个性化推荐' }));
     await user.click(screen.getByRole('button', { name: '清除兴趣标签' }));
 
     expect(screen.getByText('当前使用按时间排序')).toBeInTheDocument();
     expect(useProfileStore.getState().personalizedFeed).toBe(false);
     expect(useProfileStore.getState().interestTags).toEqual([]);
diff --git a/tests/component/square-feed.test.tsx b/tests/component/square-feed.test.tsx
index c0cec02..4b88b78 100644
--- a/tests/component/square-feed.test.tsx
+++ b/tests/component/square-feed.test.tsx
@@ -1,11 +1,11 @@
-import { render, screen } from '@testing-library/react';
+import { act, render, screen } from '@testing-library/react';
 import userEvent from '@testing-library/user-event';
 import { beforeEach, describe, expect, it, vi } from 'vitest';
 import { FeedControls } from '@/features/square/feed-controls';
 import SquarePage from '@/app/square/page';
 import { useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';
 
 beforeEach(() => {
   window.localStorage.clear();
   useProfileStore.setState({
     personalizedFeed: true,
@@ -82,11 +82,33 @@ describe('FeedControls', () => {
     expect(change).not.toHaveBeenCalledWith('recommended');
   });
 
   it('uses the profile preference as the only source for chronological ordering', () => {
     useProfileStore.setState({ personalizedFeed: false, interestTags: ['慢旅行'] });
     render(<SquarePage />);
 
     expect(screen.getByRole('button', { name: '按时间排序' })).toHaveAttribute('aria-pressed', 'true');
     expect(screen.getByRole('button', { name: '为你推荐' })).toHaveAttribute('aria-pressed', 'false');
   });
+
+  it('holds neutral while preference hydration is pending, then shows the saved chronological feed once', async () => {
+    let releaseHydration: (() => void) | undefined;
+    const pendingHydration = new Promise<void>((resolve) => { releaseHydration = resolve; });
+    const rehydrate = vi.spyOn(useProfileStore.persist, 'rehydrate').mockImplementation(async () => {
+      await pendingHydration;
+      useProfileStore.setState({ personalizedFeed: false, interestTags: ['慢旅行'] });
+    });
+    useProfileStoreHydration.setState({ hydrated: false, hydrationError: false });
+
+    render(<SquarePage />);
+
+    expect(screen.getByRole('status')).toHaveTextContent('正在读取浏览器本地偏好');
+    expect(screen.queryByRole('button', { name: '为你推荐' })).not.toBeInTheDocument();
+    expect(screen.queryByRole('button', { name: '按时间排序' })).not.toBeInTheDocument();
+
+    await act(async () => { releaseHydration?.(); });
+
+    expect(await screen.findByRole('button', { name: '按时间排序' })).toHaveAttribute('aria-pressed', 'true');
+    expect(screen.getByRole('button', { name: '为你推荐' })).toHaveAttribute('aria-pressed', 'false');
+    rehydrate.mockRestore();
+  });
 });
