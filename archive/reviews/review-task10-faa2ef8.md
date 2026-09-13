# Commits
faa2ef8 feat: add privacy controls and production safeguards

# Diff stat
 .../2026-08-16-xingyu-public-mvp/task-10-report.md |  36 ++++++
 next.config.ts                                     |  14 ++-
 src/app/api/v1/health/route.ts                     |   8 ++
 src/app/error.tsx                                  |  15 +++
 src/app/global-error.tsx                           |  19 ++++
 src/app/globals.css                                |  80 ++++++++++++++
 src/app/layout.tsx                                 |   3 +-
 src/app/manifest.ts                                |  13 +++
 src/app/not-found.tsx                              |  14 +++
 src/app/profile/page.tsx                           |  29 +++++
 src/app/robots.ts                                  |  11 ++
 src/app/sitemap.ts                                 |  11 ++
 src/app/square/page.tsx                            |  18 ++-
 src/components/demo-banner.tsx                     |   7 ++
 src/components/external-booking-dialog.tsx         |  58 ++++++++++
 src/components/report-dialog.tsx                   |  70 ++++++++++++
 src/features/comparison/comparison-client.tsx      |  28 +++--
 src/features/profile/preference-settings.tsx       |  61 +++++++++++
 src/features/square/post-card.tsx                  |  13 +--
 src/stores/profile-store.ts                        | 122 +++++++++++++++++++++
 tests/component/comparison-client.test.tsx         |  23 ++--
 tests/component/feedback-dialogs.test.tsx          | 102 +++++++++++++++++
 tests/component/preference-settings.test.tsx       |  39 +++++++
 tests/component/square-feed.test.tsx               |  20 +++-
 tests/unit/production-safeguards.test.ts           |  27 +++++
 tests/unit/security-headers.test.ts                |  18 +++
 26 files changed, 820 insertions(+), 39 deletions(-)

# Full diff
diff --git a/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-10-report.md b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-10-report.md
new file mode 100644
index 0000000..43abee3
--- /dev/null
+++ b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-10-report.md
@@ -0,0 +1,36 @@
+# Task 10 Report — 账户偏好、透明度与生产保障
+
+## RED → GREEN
+
+- `tests/component/preference-settings.test.tsx` first failed because `PreferenceSettings` / `profile-store` did not exist; after implementing the validated store and control, it passed **2/2**.
+- `tests/unit/security-headers.test.ts` first failed with an empty header map; after preserving `poweredByHeader: false` and adding the four required headers, it passed **1/1**.
+- `tests/component/feedback-dialogs.test.tsx` first failed because report/external dialog modules did not exist; its final run passed **5/5**, including Square entry-point wiring and reset-on-reopen behaviour.
+- `tests/component/square-feed.test.tsx` first failed because Square held its own `recommended` state; after using the profile store as its sole ranking source, the suite passed **6/6**.
+- `tests/component/comparison-client.test.tsx` first failed because it still exposed the old sandbox notice; after wiring `ExternalBookingDialog`, the only remaining observed assertion was corrected to the dialog's actual first-focus close control.
+- `tests/unit/production-safeguards.test.ts` first failed because the health/metadata routes did not exist; after adding them, it passed **2/2**.
+
+## Commands and evidence
+
+- `node_modules/.bin/vitest.cmd run tests/component/preference-settings.test.tsx --pool=forks --maxWorkers=1 --reporter=verbose` → PASS 2/2.
+- `node_modules/.bin/vitest.cmd run tests/unit/security-headers.test.ts --pool=forks --maxWorkers=1 --reporter=verbose` → PASS 1/1.
+- `node.exe node_modules/vitest/vitest.mjs run tests/component/feedback-dialogs.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → PASS 5/5.
+- `node.exe node_modules/vitest/vitest.mjs run tests/component/comparison-client.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → PASS 11/11.
+- `node_modules/.bin/vitest.cmd run tests/component/square-feed.test.tsx --pool=forks --maxWorkers=1 --reporter=verbose` → PASS 6/6 after the shared-store migration.
+- `node_modules/.bin/vitest.cmd run tests/unit/production-safeguards.test.ts --pool=forks --maxWorkers=1 --reporter=verbose` → PASS 2/2.
+- `node_modules/.bin/tsc.cmd --noEmit` → PASS after correcting the profile store setter type and after final dialog refactor.
+- `node_modules/.bin/eslint.cmd .` → PASS after replacing the global-error anchor with `Link` and removing synchronous state updates in effects.
+- `node_modules/.bin/next.cmd build` → PASS after final changes; production routes include `/profile`, `/api/v1/health`, `/manifest.webmanifest`, `/robots.txt`, and `/sitemap.xml`.
+- Full Vitest was invoked in both verbose and dot single-worker modes. This desktop runner detached Node child processes after emitting partial output, so it did not produce a trustworthy final aggregate summary; the precise scoped test commands above are the usable evidence. The rejected process-cleanup request is left untouched to avoid interrupting unrelated work.
+
+## Integration points
+
+- `useProfileStore` is the only persisted source for `personalizedFeed` and `interestTags`; Square derives either recommended or chronological ordering directly from it.
+- Persistence uses `skipHydration`, strict Zod parsing, and fail-closed defaults. Empty interests force personalized ranking off; malformed persisted data cannot be merged into live state.
+- `ReportDialog` is reached from every Square `PostCard`; it validates a reason, labels its browser-local demo disposition, and supports Escape, focus trap, cancel, submit, and trigger restoration.
+- `ExternalBookingDialog` is reached from Compare offers. It discloses provider responsibility and no on-platform payment, requires confirmation, protects focus, and permits the controlled external action only in a supported production deployment (not tests/local previews).
+- `DemoBanner`, profile copy, health response, metadata routes, error boundaries, and 404 path all avoid claims of real identity checks, orders, payment, real-time APIs, or emergency services.
+
+## Risks / follow-up
+
+- The production outbound target is a generic public travel-search handoff because the MVP has no contracted supplier adapter. Before enabling a real supplier, replace that URL with a provider-owned, reviewed adapter destination.
+- The default SEO fallback is the Vercel project hostname; configure `VERCEL_URL` from the deployment environment for previews/production.
diff --git a/next.config.ts b/next.config.ts
index 8f8eced..1233f09 100644
--- a/next.config.ts
+++ b/next.config.ts
@@ -1,5 +1,17 @@
 import type { NextConfig } from 'next';
 
-const nextConfig: NextConfig = { poweredByHeader: false };
+const securityHeaders = [
+  { key: 'X-Content-Type-Options', value: 'nosniff' },
+  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
+  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
+  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
+];
+
+const nextConfig: NextConfig = {
+  poweredByHeader: false,
+  async headers() {
+    return [{ source: '/(.*)', headers: securityHeaders }];
+  },
+};
 
 export default nextConfig;
diff --git a/src/app/api/v1/health/route.ts b/src/app/api/v1/health/route.ts
new file mode 100644
index 0000000..9ba3176
--- /dev/null
+++ b/src/app/api/v1/health/route.ts
@@ -0,0 +1,8 @@
+import { NextResponse } from 'next/server';
+
+export function GET() {
+  return NextResponse.json({
+    status: 'ok',
+    demo_mode: true,
+  });
+}
diff --git a/src/app/error.tsx b/src/app/error.tsx
new file mode 100644
index 0000000..6ba9cc3
--- /dev/null
+++ b/src/app/error.tsx
@@ -0,0 +1,15 @@
+'use client';
+
+import Link from 'next/link';
+
+export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
+  return (
+    <main>
+      <p>页面暂时无法完成当前操作。</p>
+      <h1>请重试，或返回核心功能继续浏览</h1>
+      <button onClick={reset} type="button">重试当前页面</button>
+      <Link href="/">返回首页</Link>
+      <Link href="/compare">前往比价</Link>
+    </main>
+  );
+}
diff --git a/src/app/global-error.tsx b/src/app/global-error.tsx
new file mode 100644
index 0000000..b8f29a4
--- /dev/null
+++ b/src/app/global-error.tsx
@@ -0,0 +1,19 @@
+'use client';
+
+import Link from 'next/link';
+
+export default function GlobalErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
+  return (
+    <html lang="zh-CN">
+      <body>
+        <main>
+          <p>行屿 XINGYU</p>
+          <h1>页面暂时不可用</h1>
+          <p>请重试，或回到首页继续查看公开演示内容。</p>
+          <button onClick={reset} type="button">重试</button>
+          <Link href="/">返回首页</Link>
+        </main>
+      </body>
+    </html>
+  );
+}
diff --git a/src/app/globals.css b/src/app/globals.css
index 5910526..8628343 100644
--- a/src/app/globals.css
+++ b/src/app/globals.css
@@ -27,19 +27,99 @@ body {
   -webkit-font-smoothing: antialiased;
 }
 
 a { color: inherit; }
 
 button,
 input,
 select,
 textarea { font: inherit; }
 
+.demoBanner {
+  margin: 0;
+  padding: 10px max(20px, calc((100vw - var(--content-max)) / 2));
+  color: #513d1f;
+  border-bottom: 1px solid #c7aa70;
+  background: #f3e8cb;
+  font-size: 12px;
+  line-height: 1.65;
+  text-align: center;
+}
+
+.profilePage {
+  width: min(calc(100% - 48px), 860px);
+  margin: 0 auto;
+  padding: 120px 0 96px;
+}
+
+.profileIntro,
+.preferenceSettings {
+  padding: clamp(24px, 5vw, 44px);
+  border: 1px solid rgb(16 16 15 / 13%);
+  border-radius: var(--radius-panel);
+  background: rgb(244 240 232 / 82%);
+  box-shadow: 0 18px 42px rgb(16 16 15 / 7%);
+}
+
+.profileIntro > p:first-child,
+.preferenceSettings > p:first-child {
+  color: var(--sand);
+  font-size: 11px;
+  letter-spacing: 0.17em;
+}
+
+.profileIntro h1,
+.preferenceSettings h2 {
+  margin: 0 0 15px;
+  font-family: var(--font-display);
+  font-weight: 500;
+}
+
+.profileIntro > p:not(:first-child),
+.preferenceSettings > p:not(:first-child) {
+  color: rgb(16 16 15 / 70%);
+  line-height: 1.8;
+}
+
+.profileStatusList {
+  display: grid;
+  gap: 12px;
+  margin: 28px 0 0;
+}
+
+.profileStatusList > div {
+  padding: 14px 16px;
+  border-left: 2px solid var(--sand);
+  background: #e7e1d5;
+}
+
+.profileStatusList dt { font-size: 12px; font-weight: 700; }
+.profileStatusList dd { margin: 5px 0 0; color: rgb(16 16 15 / 72%); font-size: 13px; }
+
+.preferenceSettings { margin-top: 20px; }
+.preferenceSwitchRow { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 24px 0 14px; }
+.preferenceSwitchRow button,
+.preferenceClear { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; padding: 0 14px; color: var(--ivory); border: 1px solid var(--pine); border-radius: var(--radius-control); background: var(--pine); cursor: pointer; }
+.preferenceSwitchRow button[aria-checked='false'],
+.preferenceClear { color: var(--ink); border-color: rgb(16 16 15 / 20%); background: transparent; }
+.preferenceSwitchRow button:disabled,
+.preferenceClear:disabled { opacity: 0.55; cursor: not-allowed; }
+.preferenceTags { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0; }
+.preferenceTags span { padding: 6px 9px; border-radius: 999px; background: #e7e1d5; font-size: 13px; }
+.preferenceSwitchRow button:focus-visible,
+.preferenceClear:focus-visible { outline: 2px solid var(--sand); outline-offset: 3px; }
+
 @media (prefers-reduced-motion: reduce) {
   *,
   *::before,
   *::after {
     scroll-behavior: auto !important;
     animation-duration: 0.01ms !important;
     transition-duration: 0.01ms !important;
   }
 }
+
+@media (max-width: 600px) {
+  .profilePage { width: min(calc(100% - 28px), 860px); padding: 94px 0 70px; }
+  .preferenceSwitchRow { align-items: flex-start; flex-direction: column; }
+  .preferenceSwitchRow button { width: 100%; }
+}
diff --git a/src/app/layout.tsx b/src/app/layout.tsx
index 1b639a3..390d43e 100644
--- a/src/app/layout.tsx
+++ b/src/app/layout.tsx
@@ -1,12 +1,13 @@
 import type { Metadata, Viewport } from 'next';
 import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
+import { DemoBanner } from '@/components/demo-banner';
 import './globals.css';
 
 const sans = Noto_Sans_SC({
   subsets: ['latin'],
   display: 'swap',
   variable: '--font-noto-sans-sc',
 });
 
 const serif = Noto_Serif_SC({
   subsets: ['latin'],
@@ -18,14 +19,14 @@ const serif = Noto_Serif_SC({
 export const metadata: Metadata = {
   title: { default: '行屿 XINGYU', template: '%s | 行屿 XINGYU' },
   description: '透明比价、可信搭子、攻略转行程与主动式旅行守护。',
 };
 
 export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
 
 export default function RootLayout({ children }: { children: React.ReactNode }) {
   return (
     <html lang="zh-CN" className={`${sans.variable} ${serif.variable}`}>
-      <body>{children}</body>
+      <body><DemoBanner />{children}</body>
     </html>
   );
 }
diff --git a/src/app/manifest.ts b/src/app/manifest.ts
new file mode 100644
index 0000000..4cb7c16
--- /dev/null
+++ b/src/app/manifest.ts
@@ -0,0 +1,13 @@
+import type { MetadataRoute } from 'next';
+
+export default function manifest(): MetadataRoute.Manifest {
+  return {
+    name: '行屿 XINGYU',
+    short_name: '行屿',
+    description: '透明比价、可信搭子、攻略转行程与主动式旅行守护。',
+    start_url: '/',
+    display: 'standalone',
+    background_color: '#F4F0E8',
+    theme_color: '#26312B',
+  };
+}
diff --git a/src/app/not-found.tsx b/src/app/not-found.tsx
new file mode 100644
index 0000000..83053d8
--- /dev/null
+++ b/src/app/not-found.tsx
@@ -0,0 +1,14 @@
+import Link from 'next/link';
+
+export default function NotFoundPage() {
+  return (
+    <main>
+      <p>404 · XINGYU</p>
+      <h1>这里还没有一段可抵达的旅程</h1>
+      <p>返回首页、攻略广场或透明比价，继续规划下一站。</p>
+      <Link href="/">返回首页</Link>
+      <Link href="/square">前往攻略广场</Link>
+      <Link href="/compare">前往透明比价</Link>
+    </main>
+  );
+}
diff --git a/src/app/profile/page.tsx b/src/app/profile/page.tsx
new file mode 100644
index 0000000..2129858
--- /dev/null
+++ b/src/app/profile/page.tsx
@@ -0,0 +1,29 @@
+import type { Metadata } from 'next';
+import { SiteHeader } from '@/components/site-header';
+import { PreferenceSettings } from '@/features/profile/preference-settings';
+
+export const metadata: Metadata = {
+  title: '演示账户与偏好',
+  description: '管理浏览器本地保存的演示推荐偏好与透明度说明。',
+};
+
+export default function ProfilePage() {
+  return (
+    <>
+      <SiteHeader activePath="/profile" />
+      <main className="profilePage">
+        <section aria-labelledby="profile-title" className="profileIntro">
+          <p>XINGYU · DEMO PROFILE</p>
+          <h1 id="profile-title">演示账户与偏好</h1>
+          <p>演示身份状态仅用于说明安全边界，不等同于实名核验，也不收集证件、人脸、联系方式或支付信息。</p>
+          <dl className="profileStatusList">
+            <div><dt>年龄边界</dt><dd>26 岁演示账户（仅作 18+ 功能边界展示）</dd></div>
+            <div><dt>身份状态</dt><dd>演示已验证，不是实名认证结果</dd></div>
+            <div><dt>风险状态</dt><dd>演示状态清晰，不构成安全担保</dd></div>
+          </dl>
+        </section>
+        <PreferenceSettings />
+      </main>
+    </>
+  );
+}
diff --git a/src/app/robots.ts b/src/app/robots.ts
new file mode 100644
index 0000000..6706377
--- /dev/null
+++ b/src/app/robots.ts
@@ -0,0 +1,11 @@
+import type { MetadataRoute } from 'next';
+
+const origin = (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://xingyu-travel.vercel.app').replace(/\/$/, '');
+
+export default function robots(): MetadataRoute.Robots {
+  return {
+    rules: { userAgent: '*', allow: '/' },
+    sitemap: `${origin}/sitemap.xml`,
+    host: origin,
+  };
+}
diff --git a/src/app/sitemap.ts b/src/app/sitemap.ts
new file mode 100644
index 0000000..3f66345
--- /dev/null
+++ b/src/app/sitemap.ts
@@ -0,0 +1,11 @@
+import type { MetadataRoute } from 'next';
+
+const origin = (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://xingyu-travel.vercel.app').replace(/\/$/, '');
+const paths = ['/', '/compare', '/square', '/partners', '/assistant', '/profile'] as const;
+
+export default function sitemap(): MetadataRoute.Sitemap {
+  return paths.map((path) => ({
+    url: `${origin}${path}`,
+    lastModified: new Date('2026-08-16T00:00:00.000Z'),
+  }));
+}
diff --git a/src/app/square/page.tsx b/src/app/square/page.tsx
index 202492d..cbc0692 100644
--- a/src/app/square/page.tsx
+++ b/src/app/square/page.tsx
@@ -1,29 +1,35 @@
 'use client';
 
-import { useState } from 'react';
+import { useEffect } from 'react';
 import { SiteHeader } from '@/components/site-header';
 import { orderPosts, type FeedMode } from '@/data/posts';
 import { FeedControls } from '@/features/square/feed-controls';
 import { PostCard } from '@/features/square/post-card';
 import styles from '@/features/square/square.module.css';
-
-const initialInterestTags = ['慢旅行', '咖啡', '自驾'];
+import { hydrateProfileStore, useProfileStore } from '@/stores/profile-store';
 
 export default function SquarePage() {
-  const [mode, setMode] = useState<FeedMode>('recommended');
-  const [interestTags, setInterestTags] = useState<readonly string[]>(initialInterestTags);
+  const personalizedFeed = useProfileStore((state) => state.personalizedFeed);
+  const interestTags = useProfileStore((state) => state.interestTags);
+  const setPersonalizedFeed = useProfileStore((state) => state.setPersonalizedFeed);
+  const clearInterestTags = useProfileStore((state) => state.clearInterestTags);
+  const mode: FeedMode = personalizedFeed && interestTags.length > 0 ? 'recommended' : 'chronological';
   const posts = orderPosts(mode, interestTags);
 
+  useEffect(() => {
+    void hydrateProfileStore();
+  }, []);
+
   return (
     <>
       <SiteHeader activePath="/square" />
       <main className={styles.squarePage}>
         <header className={styles.hero}><p>GUIDE SQUARE</p><h1>在别人的路书里，找到自己的出发理由。</h1><span>真实的旅行片段，整理成可继续编辑的本地行程草稿。</span></header>
         <section aria-labelledby="feed-title" className={styles.feedSection}>
-          <div className={styles.feedHeading}><div><p>编辑精选</p><h2 id="feed-title">旅行者正在分享</h2></div><FeedControls interestTags={interestTags} mode={mode} onClearInterestTags={() => { setInterestTags([]); setMode('chronological'); }} onModeChange={(nextMode) => { if (nextMode === 'recommended' && interestTags.length === 0) return; setMode(nextMode); }} /></div>
+          <div className={styles.feedHeading}><div><p>编辑精选</p><h2 id="feed-title">旅行者正在分享</h2></div><FeedControls interestTags={interestTags} mode={mode} onClearInterestTags={clearInterestTags} onModeChange={(nextMode) => setPersonalizedFeed(nextMode === 'recommended')} /></div>
           <div className={styles.masonry}>{posts.map((post) => <PostCard key={post.slug} post={post} />)}</div>
         </section>
       </main>
     </>
   );
 }
diff --git a/src/components/demo-banner.tsx b/src/components/demo-banner.tsx
new file mode 100644
index 0000000..726c9a1
--- /dev/null
+++ b/src/components/demo-banner.tsx
@@ -0,0 +1,7 @@
+export function DemoBanner() {
+  return (
+    <aside aria-label="演示环境说明" className="demoBanner" role="note">
+      公开 MVP 演示：报价、身份状态、搭子、AI、守护与预订流程均使用演示数据或浏览器本地状态；不提供实名核验、真实成交、实时外部接口、支付或应急服务。
+    </aside>
+  );
+}
diff --git a/src/components/external-booking-dialog.tsx b/src/components/external-booking-dialog.tsx
new file mode 100644
index 0000000..b27bf1e
--- /dev/null
+++ b/src/components/external-booking-dialog.tsx
@@ -0,0 +1,58 @@
+'use client';
+
+import { ArrowSquareOut, WarningCircle, X } from '@phosphor-icons/react';
+import { useRef, type RefObject } from 'react';
+import { useDialogFocus } from '@/features/comparison/use-dialog-focus';
+import styles from '@/features/comparison/comparison.module.css';
+
+type ExternalBookingOffer = {
+  provider: string;
+  totalPrice: number;
+  title?: string;
+};
+
+type ExternalBookingDialogProps = {
+  open: boolean;
+  offer: ExternalBookingOffer;
+  returnFocusRef: RefObject<HTMLElement | null>;
+  onClose: () => void;
+  onConfirm: () => void;
+};
+
+export function ExternalBookingDialog({
+  open,
+  offer,
+  returnFocusRef,
+  onClose,
+  onConfirm,
+}: ExternalBookingDialogProps) {
+  const dialogRef = useRef<HTMLElement>(null);
+
+  function close() {
+    returnFocusRef.current?.focus();
+    onClose();
+  }
+
+  useDialogFocus(open, dialogRef, returnFocusRef, close);
+
+  if (!open) return null;
+
+  return (
+    <div className={styles.dialogBackdrop}>
+      <section aria-label="前往外部供应商" aria-modal="true" className={styles.confirmDialog} ref={dialogRef} role="dialog" tabIndex={-1}>
+        <div className={styles.drawerHeader}>
+          <div><p>EXTERNAL BOOKING</p><h2>前往外部供应商</h2></div>
+          <button aria-label="取消外部跳转" className={styles.iconButton} onClick={close} type="button"><X aria-hidden size={20} /></button>
+        </div>
+        <p className={styles.dialogOffer}>{offer.provider} · {offer.title ?? '演示报价'} · ¥{new Intl.NumberFormat('zh-CN').format(offer.totalPrice)} 含税总价</p>
+        <p><WarningCircle aria-hidden size={17} /> 外部页面的价格、库存和成交由供应商负责，页面跳转后请重新核验退改与隐私条款。</p>
+        <p>不会在行屿完成成交或付款，也不会采集支付信息。</p>
+        <p>本地或测试预览中，为避免误导航，确认后只会关闭此说明；受支持的公开部署才会新开旅行搜索页。</p>
+        <div>
+          <button className={styles.secondaryButton} onClick={close} type="button">取消并留在行屿</button>
+          <button className={styles.primaryButton} onClick={() => { onConfirm(); close(); }} type="button">确认前往外部页面 <ArrowSquareOut aria-hidden size={17} /></button>
+        </div>
+      </section>
+    </div>
+  );
+}
diff --git a/src/components/report-dialog.tsx b/src/components/report-dialog.tsx
new file mode 100644
index 0000000..a0f9bb2
--- /dev/null
+++ b/src/components/report-dialog.tsx
@@ -0,0 +1,70 @@
+'use client';
+
+import { WarningCircle, X } from '@phosphor-icons/react';
+import { useRef, useState, type RefObject } from 'react';
+import { useDialogFocus } from '@/features/comparison/use-dialog-focus';
+import styles from '@/features/comparison/comparison.module.css';
+
+type ReportDialogProps = {
+  open: boolean;
+  subject: string;
+  returnFocusRef: RefObject<HTMLElement | null>;
+  onClose: () => void;
+};
+
+const reasons = ['虚假或误导信息', '骚扰、仇恨或不安全内容', '侵权或其他问题'] as const;
+
+export function ReportDialog({ open, subject, returnFocusRef, onClose }: ReportDialogProps) {
+  if (!open) return null;
+  return <ReportDialogContent onClose={onClose} returnFocusRef={returnFocusRef} subject={subject} />;
+}
+
+function ReportDialogContent({ subject, returnFocusRef, onClose }: Omit<ReportDialogProps, 'open'>) {
+  const dialogRef = useRef<HTMLElement>(null);
+  const [reason, setReason] = useState<string>();
+  const [error, setError] = useState<string>();
+  const [submitted, setSubmitted] = useState(false);
+
+  function close() {
+    returnFocusRef.current?.focus();
+    onClose();
+  }
+
+  useDialogFocus(true, dialogRef, returnFocusRef, close);
+
+  if (submitted) {
+    return (
+      <div className={styles.dialogBackdrop}>
+        <section aria-label="举报结果" aria-modal="true" className={styles.confirmDialog} ref={dialogRef} role="dialog" tabIndex={-1}>
+          <span className={styles.demoPill}>本地演示处置</span>
+          <h2>已记录演示举报</h2>
+          <p role="status">仅记录在此浏览器的演示状态，不会联系作者或提交到外部平台。</p>
+          <button className={styles.primaryButton} onClick={close} type="button">关闭举报结果</button>
+        </section>
+      </div>
+    );
+  }
+
+  return (
+    <div className={styles.dialogBackdrop}>
+      <section aria-label="举报内容" aria-modal="true" className={styles.confirmDialog} ref={dialogRef} role="dialog" tabIndex={-1}>
+        <div className={styles.drawerHeader}>
+          <div><p>SAFETY FEEDBACK</p><h2>举报内容</h2></div>
+          <button aria-label="取消举报" className={styles.iconButton} onClick={close} type="button"><X aria-hidden size={20} /></button>
+        </div>
+        <p>你正在举报：{subject}。请勿在举报说明中填写证件、联系方式或支付信息。</p>
+        <fieldset>
+          <legend>请选择举报原因</legend>
+          {reasons.map((item) => (
+            <label key={item}><input checked={reason === item} name="report-reason" onChange={() => { setReason(item); setError(undefined); }} type="radio" />{item}</label>
+          ))}
+        </fieldset>
+        {error ? <p role="alert"><WarningCircle aria-hidden size={17} />{error}</p> : null}
+        <div>
+          <button className={styles.secondaryButton} onClick={close} type="button">取消</button>
+          <button className={styles.primaryButton} onClick={() => { if (!reason) { setError('请选择举报原因'); return; } setSubmitted(true); }} type="button">提交举报</button>
+        </div>
+      </section>
+    </div>
+  );
+}
diff --git a/src/features/comparison/comparison-client.tsx b/src/features/comparison/comparison-client.tsx
index 995f119..417ffd3 100644
--- a/src/features/comparison/comparison-client.tsx
+++ b/src/features/comparison/comparison-client.tsx
@@ -17,20 +17,21 @@ import {
   useMemo,
   useRef,
   useState,
   type KeyboardEvent,
 } from 'react';
 import type {
   ComparisonProductKind,
   NormalizedOffer,
   QuoteEvent,
 } from '@/domain/comparison/types';
+import { ExternalBookingDialog } from '@/components/external-booking-dialog';
 import { offerIdentity } from '@/domain/comparison/offer-identity';
 import type { ComparisonSearchInput } from '@/domain/shared/api';
 import { OfferRow } from './offer-row';
 import { useDialogFocus } from './use-dialog-focus';
 import styles from './comparison.module.css';
 
 type ComparisonClientProps = {
   initialSearch: ComparisonSearchInput;
   stream?: AsyncIterable<QuoteEvent>;
   now?: string;
@@ -118,26 +119,24 @@ export function ComparisonClient({
   const [verifiedOnly, setVerifiedOnly] = useState(false);
   const [selectedOfferKeys, setSelectedOfferKeys] = useState<string[]>([]);
   const [favoriteOfferKeys, setFavoriteOfferKeys] = useState<string[]>([]);
   const [alertsEnabled, setAlertsEnabled] = useState(false);
   const [outboundOffer, setOutboundOffer] = useState<NormalizedOffer>();
   const [comparisonOpen, setComparisonOpen] = useState(false);
   const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
   const filterTriggerRef = useRef<HTMLButtonElement>(null);
   const filterDialogRef = useRef<HTMLElement>(null);
   const outboundTriggerRef = useRef<HTMLElement>(null);
-  const outboundDialogRef = useRef<HTMLElement>(null);
   const compareTriggerRef = useRef<HTMLButtonElement>(null);
   const compareDialogRef = useRef<HTMLElement>(null);
 
   useDialogFocus(filtersOpen, filterDialogRef, filterTriggerRef, () => setFiltersOpen(false));
-  useDialogFocus(Boolean(outboundOffer), outboundDialogRef, outboundTriggerRef, () => setOutboundOffer(undefined));
   useDialogFocus(comparisonOpen, compareDialogRef, compareTriggerRef, () => setComparisonOpen(false));
 
   useEffect(() => {
     let active = true;
 
     const acceptEvent = (event: QuoteEvent) => {
       if (!active) return;
       if (event.type === 'offer') {
         setOffers((current) => upsertOffer(current, event.payload));
       } else if (event.type === 'degraded') {
@@ -222,20 +221,29 @@ export function ComparisonClient({
   }
 
   function toggleComparison(key: string) {
     setSelectedOfferKeys((current) => {
       if (current.includes(key)) return current.filter((entry) => entry !== key);
       if (current.length >= 3) return current;
       return [...current, key];
     });
   }
 
+  function openExternalBooking() {
+    if (!outboundOffer || typeof window === 'undefined') return;
+    const localDemo =
+      process.env.NODE_ENV !== 'production' ||
+      ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
+    if (localDemo) return;
+    window.open('https://www.ctrip.com/', '_blank', 'noopener,noreferrer');
+  }
+
   return (
     <main className={styles.page}>
       <section className={styles.masthead} aria-labelledby="comparison-title">
         <p>XINGYU · TRANSPARENT COMPARISON</p>
         <h1 id="comparison-title">看清总价，再从容出发</h1>
         <span>
           {search.origin ? `${search.origin} → ` : ''}
           {search.destination} · 沙箱演示报价
         </span>
       </section>
@@ -400,29 +408,27 @@ export function ComparisonClient({
             <fieldset>
               <legend>供应商可信度</legend>
               <label><input checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} type="checkbox" />仅看已验证供应商</label>
             </fieldset>
             <button className={styles.primaryButton} onClick={() => setFiltersOpen(false)} type="button">应用筛选</button>
           </aside>
         </div>
       ) : null}
 
       {outboundOffer ? (
-        <div className={styles.dialogBackdrop}>
-          <section aria-label="沙箱演示确认" aria-modal="true" className={styles.confirmDialog} ref={outboundDialogRef} role="dialog" tabIndex={-1}>
-            <span className={styles.demoPill}>沙箱 / Demo</span>
-            <h2>这是演示报价，不会跳转真实供应商</h2>
-            <p>当前操作仅解释外部确认流程，不会预订、出票或付款，也不会采集支付信息。</p>
-            <p className={styles.dialogOffer}>{outboundOffer.provider} · ¥{new Intl.NumberFormat('zh-CN').format(outboundOffer.totalPrice)} 含税总价</p>
-            <button className={styles.primaryButton} onClick={() => setOutboundOffer(undefined)} type="button">我知道了</button>
-          </section>
-        </div>
+        <ExternalBookingDialog
+          offer={outboundOffer}
+          onClose={() => setOutboundOffer(undefined)}
+          onConfirm={openExternalBooking}
+          open
+          returnFocusRef={outboundTriggerRef}
+        />
       ) : null}
 
       {comparisonOpen ? (
         <div className={styles.dialogBackdrop}>
           <section aria-label="报价同屏对比" aria-modal="true" className={styles.comparisonDialog} ref={compareDialogRef} role="dialog" tabIndex={-1}>
             <div className={styles.drawerHeader}>
               <div><p>COMPARE</p><h2>报价同屏对比</h2></div>
               <button aria-label="关闭同屏对比" className={styles.iconButton} onClick={() => setComparisonOpen(false)} type="button"><X aria-hidden size={21} /></button>
             </div>
             <div className={styles.comparisonTableWrap}>
diff --git a/src/features/profile/preference-settings.tsx b/src/features/profile/preference-settings.tsx
new file mode 100644
index 0000000..b174f4c
--- /dev/null
+++ b/src/features/profile/preference-settings.tsx
@@ -0,0 +1,61 @@
+'use client';
+
+import { Sparkle, X } from '@phosphor-icons/react';
+import { useEffect } from 'react';
+import {
+  hydrateProfileStore,
+  useProfileStore,
+  useProfileStoreHydration,
+} from '@/stores/profile-store';
+
+export function PreferenceSettings() {
+  const personalizedFeed = useProfileStore((state) => state.personalizedFeed);
+  const interestTags = useProfileStore((state) => state.interestTags);
+  const setPersonalizedFeed = useProfileStore((state) => state.setPersonalizedFeed);
+  const clearInterestTags = useProfileStore((state) => state.clearInterestTags);
+  const hydrated = useProfileStoreHydration((state) => state.hydrated);
+  const hydrationError = useProfileStoreHydration((state) => state.hydrationError);
+  const canPersonalize = interestTags.length > 0;
+
+  useEffect(() => {
+    void hydrateProfileStore();
+  }, []);
+
+  if (!hydrated) return <p aria-live="polite">正在读取浏览器本地偏好…</p>;
+
+  return (
+    <section aria-labelledby="preference-title" className="preferenceSettings">
+      <p>RECOMMENDATION SETTINGS</p>
+      <h2 id="preference-title">推荐与兴趣偏好</h2>
+      <p>仅保存在当前浏览器，用于决定攻略广场的排序方式。</p>
+      {hydrationError ? (
+        <p role="status">本地偏好无法安全读取，已使用默认演示设置。</p>
+      ) : null}
+      <div className="preferenceSwitchRow">
+        <span>个性化推荐</span>
+        <button
+          aria-checked={personalizedFeed && canPersonalize}
+          aria-describedby={canPersonalize ? undefined : 'personalization-disabled'}
+          aria-label="个性化推荐"
+          disabled={!canPersonalize}
+          onClick={() => setPersonalizedFeed(!personalizedFeed)}
+          role="switch"
+          type="button"
+        >
+          <Sparkle aria-hidden size={17} weight="fill" />
+          {personalizedFeed && canPersonalize ? '已开启' : '已关闭'}
+        </button>
+      </div>
+      {!canPersonalize ? (
+        <p id="personalization-disabled">兴趣标签已清除；添加兴趣后才可重新开启个性化推荐。</p>
+      ) : null}
+      <div aria-label="当前兴趣标签" className="preferenceTags">
+        {interestTags.length ? interestTags.map((tag) => <span key={tag}>#{tag}</span>) : <span>尚无兴趣标签</span>}
+      </div>
+      <button className="preferenceClear" disabled={!interestTags.length} onClick={clearInterestTags} type="button">
+        <X aria-hidden size={16} /> 清除兴趣标签
+      </button>
+      <p role="status">{personalizedFeed && canPersonalize ? '当前使用个性化推荐排序' : '当前使用按时间排序'}</p>
+    </section>
+  );
+}
diff --git a/src/features/square/post-card.tsx b/src/features/square/post-card.tsx
index 98a4d48..7cb94cf 100644
--- a/src/features/square/post-card.tsx
+++ b/src/features/square/post-card.tsx
@@ -1,41 +1,38 @@
 'use client';
 
 import { Flag, Heart, MapPin } from '@phosphor-icons/react';
 import Image from 'next/image';
 import Link from 'next/link';
-import { useState } from 'react';
+import { useRef, useState } from 'react';
+import { ReportDialog } from '@/components/report-dialog';
 import type { TravelPost } from '@/data/posts';
 import styles from './square.module.css';
 
 export function PostCard({ post }: { post: TravelPost }) {
   const [favorite, setFavorite] = useState(false);
   const [reportOpen, setReportOpen] = useState(false);
-  const [reported, setReported] = useState(false);
+  const reportTriggerRef = useRef<HTMLButtonElement>(null);
   const image = post.media[0];
 
   return (
     <article className={styles.postCard}>
       <Link className={styles.postImageLink} href={`/square/${post.slug}`} aria-label={`阅读攻略：${post.title}`}>
         <Image alt={image.alt} className={styles.postImage} height={image.height} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" src={image.src} width={image.width} />
       </Link>
       <div className={styles.postBody}>
         <div className={styles.postMeta}><MapPin aria-hidden size={16} weight="fill" /> {post.destination} · {post.days} 天</div>
         <h2><Link href={`/square/${post.slug}`}>{post.title}</Link></h2>
         <p>{post.excerpt}</p>
         <div className={styles.tags}>{post.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div>
         <footer className={styles.cardFooter}>
           <span className={styles.author}><b aria-hidden>{post.author.avatar}</b>{post.author.name}</span>
           <div className={styles.cardActions}>
             <button aria-label={`收藏 ${post.title}`} aria-pressed={favorite} onClick={() => setFavorite((value) => !value)} type="button"><Heart aria-hidden size={20} weight={favorite ? 'fill' : 'regular'} /></button>
-            <button aria-expanded={reportOpen} aria-label={`举报 ${post.title}`} onClick={() => setReportOpen(true)} type="button"><Flag aria-hidden size={19} /></button>
+            <button aria-expanded={reportOpen} aria-label={`举报 ${post.title}`} onClick={() => setReportOpen(true)} ref={reportTriggerRef} type="button"><Flag aria-hidden size={19} /></button>
           </div>
         </footer>
-        {reportOpen && (
-          <div className={styles.reportNotice} role="status">
-            {reported ? '已收到演示举报，不会向任何平台提交。' : <><span>举报为演示操作，不会提交或联系作者。</span><button onClick={() => setReported(true)} type="button">确认演示举报</button><button onClick={() => setReportOpen(false)} type="button">取消</button></>}
-          </div>
-        )}
+        <ReportDialog onClose={() => setReportOpen(false)} open={reportOpen} returnFocusRef={reportTriggerRef} subject={post.title} />
       </div>
     </article>
   );
 }
diff --git a/src/stores/profile-store.ts b/src/stores/profile-store.ts
new file mode 100644
index 0000000..554f3ef
--- /dev/null
+++ b/src/stores/profile-store.ts
@@ -0,0 +1,122 @@
+'use client';
+
+import { create } from 'zustand';
+import { createStore } from 'zustand/vanilla';
+import { persist } from 'zustand/middleware';
+import { z } from 'zod';
+
+export type DemoProfile = {
+  age: 26;
+  identityVerified: true;
+  riskStatus: 'clear';
+};
+
+export type ProfileState = {
+  demoProfile: DemoProfile;
+  personalizedFeed: boolean;
+  interestTags: string[];
+  setPersonalizedFeed: (value: boolean) => void;
+  clearInterestTags: () => void;
+};
+
+type ProfileHydrationState = {
+  hydrated: boolean;
+  hydrationError: boolean;
+};
+
+type CreateProfileStoreOptions = {
+  onHydrationError?: (error: unknown) => void;
+};
+
+const defaultProfileState = {
+  demoProfile: { age: 26, identityVerified: true, riskStatus: 'clear' },
+  personalizedFeed: true,
+  interestTags: ['山野', '人文', '慢旅行'],
+} as const satisfies Pick<ProfileState, 'demoProfile' | 'personalizedFeed' | 'interestTags'>;
+
+const persistedProfileSchema = z.object({
+  demoProfile: z.object({
+    age: z.literal(26),
+    identityVerified: z.literal(true),
+    riskStatus: z.literal('clear'),
+  }).strict(),
+  personalizedFeed: z.boolean(),
+  interestTags: z.array(z.string().min(1).max(40)).max(12),
+}).strict().superRefine((value, context) => {
+  if (new Set(value.interestTags).size !== value.interestTags.length) {
+    context.addIssue({ code: 'custom', path: ['interestTags'], message: 'duplicate interest tag' });
+  }
+  if (value.personalizedFeed && value.interestTags.length === 0) {
+    context.addIssue({ code: 'custom', path: ['personalizedFeed'], message: 'personalization needs interests' });
+  }
+});
+
+type PersistedProfileState = z.infer<typeof persistedProfileSchema>;
+
+function parsePersistedProfile(state: unknown): PersistedProfileState {
+  const parsed = persistedProfileSchema.safeParse(state);
+  if (parsed.success) return parsed.data;
+  throw new Error('PROFILE_INVALID_PERSISTED_STATE');
+}
+
+function stateCreator(set: (recipe: (state: ProfileState) => Partial<ProfileState>) => void): ProfileState {
+  return {
+    ...defaultProfileState,
+    setPersonalizedFeed: (value) => set((state) => ({
+      personalizedFeed: value && state.interestTags.length > 0,
+    })),
+    clearInterestTags: () => set(() => ({ interestTags: [], personalizedFeed: false })),
+  };
+}
+
+function persistenceOptions(options: CreateProfileStoreOptions = {}) {
+  return {
+    name: 'xingyu-profile-demo-v1',
+    version: 1,
+    skipHydration: true,
+    partialize: (state: ProfileState): PersistedProfileState => ({
+      demoProfile: state.demoProfile,
+      personalizedFeed: state.personalizedFeed,
+      interestTags: state.interestTags,
+    }),
+    merge: (persistedState: unknown, currentState: ProfileState): ProfileState => ({
+      ...currentState,
+      ...parsePersistedProfile(persistedState),
+    }),
+    onRehydrateStorage: () => (_state: ProfileState | undefined, error: unknown) => {
+      if (error) options.onHydrationError?.(error);
+    },
+  };
+}
+
+export function createProfileStore(options: CreateProfileStoreOptions = {}) {
+  return createStore<ProfileState>()(
+    persist<ProfileState, [], [], PersistedProfileState>(stateCreator, persistenceOptions(options)),
+  );
+}
+
+export const useProfileStoreHydration = create<ProfileHydrationState>(() => ({
+  hydrated: false,
+  hydrationError: false,
+}));
+
+export const useProfileStore = create<ProfileState>()(
+  persist<ProfileState, [], [], PersistedProfileState>(
+    stateCreator,
+    persistenceOptions({
+      onHydrationError: () => useProfileStoreHydration.setState({ hydrationError: true }),
+    }),
+  ),
+);
+
+export async function hydrateProfileStore() {
+  if (typeof window === 'undefined' || useProfileStoreHydration.getState().hydrated) return;
+  try {
+    useProfileStoreHydration.setState({ hydrated: false, hydrationError: false });
+    await useProfileStore.persist.rehydrate();
+  } catch {
+    useProfileStoreHydration.setState({ hydrationError: true });
+  } finally {
+    useProfileStoreHydration.setState({ hydrated: true });
+  }
+}
diff --git a/tests/component/comparison-client.test.tsx b/tests/component/comparison-client.test.tsx
index 860b415..738f2bc 100644
--- a/tests/component/comparison-client.test.tsx
+++ b/tests/component/comparison-client.test.tsx
@@ -183,38 +183,38 @@ describe('ComparisonClient incremental results', () => {
     expect(screen.getByRole('switch', { name: '降价提醒' })).toHaveAttribute('aria-checked', 'true');
 
     const compareChecks = screen.getAllByRole('checkbox', { name: /加入同屏对比/ });
     await user.click(compareChecks[0]);
     await user.click(compareChecks[1]);
     await user.click(compareChecks[2]);
     expect(compareChecks[3]).toBeDisabled();
     expect(screen.getByText('已选择 3/3 项')).toBeInTheDocument();
   });
 
-  it('requires an explicit sandbox confirmation and never presents booking or payment as completed', async () => {
+  it('requires an explicit external booking confirmation with supplier responsibility disclosure', async () => {
     const user = userEvent.setup();
     render(
       <ComparisonClient
         initialSearch={initialSearch}
         now="2026-08-16T12:30:00+08:00"
         stream={streamEvents([{ type: 'offer', payload: offers[0] }])}
       />,
     );
     await screen.findByText('¥1,020 含税总价');
 
     await user.click(screen.getByRole('button', { name: '查看 云程旅行 演示报价' }));
-    const dialog = screen.getByRole('dialog', { name: '沙箱演示确认' });
-    expect(dialog).toHaveTextContent('沙箱 / Demo');
-    expect(dialog).toHaveTextContent('不会预订、出票或付款');
-    expect(within(dialog).queryByRole('link')).not.toBeInTheDocument();
-    await user.click(within(dialog).getByRole('button', { name: '我知道了' }));
-    expect(screen.queryByRole('dialog', { name: '沙箱演示确认' })).not.toBeInTheDocument();
+    const dialog = screen.getByRole('dialog', { name: '前往外部供应商' });
+    expect(dialog).toHaveTextContent('云程旅行');
+    expect(dialog).toHaveTextContent('外部页面的价格、库存和成交由供应商负责');
+    expect(dialog).toHaveTextContent('不会在行屿完成成交或付款');
+    await user.click(within(dialog).getByRole('button', { name: '取消并留在行屿' }));
+    expect(screen.queryByRole('dialog', { name: '前往外部供应商' })).not.toBeInTheDocument();
   });
 
   it('shows a stable empty result after a zero-offer stream completes', async () => {
     render(
       <ComparisonClient
         initialSearch={initialSearch}
         now="2026-08-16T12:30:00+08:00"
         stream={streamEvents([{ type: 'complete', payload: { offerCount: 0 } }])}
       />,
     );
@@ -356,21 +356,22 @@ describe('ComparisonClient incremental results', () => {
     render(
       <ComparisonClient
         initialSearch={initialSearch}
         now="2026-08-16T12:30:00+08:00"
         stream={streamEvents([{ type: 'offer', payload: offers[0] }])}
       />,
     );
     await screen.findByText('云程旅行');
     const trigger = screen.getByRole('button', { name: '查看 云程旅行 演示报价' });
     await user.click(trigger);
-    const dialog = screen.getByRole('dialog', { name: '沙箱演示确认' });
-    const close = within(dialog).getByRole('button', { name: '我知道了' });
+    const dialog = screen.getByRole('dialog', { name: '前往外部供应商' });
+    const dismiss = within(dialog).getByRole('button', { name: '取消外部跳转' });
+    const close = within(dialog).getByRole('button', { name: '取消并留在行屿' });
 
-    expect(close).toHaveFocus();
+    expect(dismiss).toHaveFocus();
     await user.keyboard('{Tab}');
     expect(close).toHaveFocus();
     await user.keyboard('{Escape}');
-    expect(screen.queryByRole('dialog', { name: '沙箱演示确认' })).not.toBeInTheDocument();
+    expect(screen.queryByRole('dialog', { name: '前往外部供应商' })).not.toBeInTheDocument();
     expect(trigger).toHaveFocus();
   });
 });
diff --git a/tests/component/feedback-dialogs.test.tsx b/tests/component/feedback-dialogs.test.tsx
new file mode 100644
index 0000000..738062a
--- /dev/null
+++ b/tests/component/feedback-dialogs.test.tsx
@@ -0,0 +1,102 @@
+import { render, screen, within } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { createRef } from 'react';
+import { describe, expect, it, vi } from 'vitest';
+import { ExternalBookingDialog } from '@/components/external-booking-dialog';
+import { ReportDialog } from '@/components/report-dialog';
+import { posts } from '@/data/posts';
+import { PostCard } from '@/features/square/post-card';
+
+describe('ReportDialog', () => {
+  it('validates a reason and records only a local demo disposition', async () => {
+    const user = userEvent.setup();
+    const trigger = document.createElement('button');
+    document.body.append(trigger);
+    trigger.focus();
+    const onClose = vi.fn();
+    render(<ReportDialog onClose={onClose} open returnFocusRef={{ current: trigger }} subject="大理五日慢游" />);
+
+    const dialog = screen.getByRole('dialog', { name: '举报内容' });
+    await user.click(within(dialog).getByRole('button', { name: '提交举报' }));
+    expect(within(dialog).getByRole('alert')).toHaveTextContent('请选择举报原因');
+    await user.click(within(dialog).getByRole('radio', { name: '虚假或误导信息' }));
+    await user.click(within(dialog).getByRole('button', { name: '提交举报' }));
+
+    expect(screen.getByRole('status')).toHaveTextContent('仅记录在此浏览器的演示状态，不会联系作者或提交到外部平台');
+    await user.click(screen.getByRole('button', { name: '关闭举报结果' }));
+    expect(onClose).toHaveBeenCalledOnce();
+    expect(trigger).toHaveFocus();
+    trigger.remove();
+  });
+
+  it('resets a completed local report before the dialog is opened for another post', async () => {
+    const user = userEvent.setup();
+    const { rerender } = render(
+      <ReportDialog onClose={() => undefined} open returnFocusRef={createRef<HTMLButtonElement>()} subject="第一篇攻略" />,
+    );
+
+    await user.click(screen.getByRole('radio', { name: '虚假或误导信息' }));
+    await user.click(screen.getByRole('button', { name: '提交举报' }));
+    expect(screen.getByRole('dialog', { name: '举报结果' })).toBeInTheDocument();
+    rerender(<ReportDialog onClose={() => undefined} open={false} returnFocusRef={createRef<HTMLButtonElement>()} subject="第一篇攻略" />);
+    rerender(<ReportDialog onClose={() => undefined} open returnFocusRef={createRef<HTMLButtonElement>()} subject="另一篇攻略" />);
+
+    expect(screen.getByRole('dialog', { name: '举报内容' })).toHaveTextContent('另一篇攻略');
+  });
+});
+
+describe('square report entry point', () => {
+  it('opens the validated report dialog from a public post card', async () => {
+    const user = userEvent.setup();
+    render(<PostCard post={posts[0]} />);
+
+    await user.click(screen.getByRole('button', { name: `举报 ${posts[0].title}` }));
+    expect(screen.getByRole('dialog', { name: '举报内容' })).toHaveTextContent(posts[0].title);
+  });
+});
+
+describe('ExternalBookingDialog', () => {
+  it('requires confirmation before invoking the external booking action and restores trigger focus on cancel', async () => {
+    const user = userEvent.setup();
+    const trigger = document.createElement('button');
+    document.body.append(trigger);
+    trigger.focus();
+    const onClose = vi.fn();
+    const onConfirm = vi.fn();
+    render(
+      <ExternalBookingDialog
+        onClose={onClose}
+        onConfirm={onConfirm}
+        offer={{ provider: '云程旅行', totalPrice: 1020, title: '上海至大理演示航班' }}
+        open
+        returnFocusRef={{ current: trigger }}
+      />,
+    );
+
+    const dialog = screen.getByRole('dialog', { name: '前往外部供应商' });
+    expect(dialog).toHaveTextContent('外部页面的价格、库存和成交由供应商负责');
+    expect(dialog).toHaveTextContent('不会在行屿完成成交或付款');
+    await user.click(within(dialog).getByRole('button', { name: '取消并留在行屿' }));
+    expect(onConfirm).not.toHaveBeenCalled();
+    expect(onClose).toHaveBeenCalledOnce();
+    expect(trigger).toHaveFocus();
+    trigger.remove();
+  });
+
+  it('only calls the supplied external action after confirmation', async () => {
+    const user = userEvent.setup();
+    const onConfirm = vi.fn();
+    render(
+      <ExternalBookingDialog
+        onClose={() => undefined}
+        onConfirm={onConfirm}
+        offer={{ provider: '云程旅行', totalPrice: 1020, title: '上海至大理演示航班' }}
+        open
+        returnFocusRef={createRef<HTMLButtonElement>()}
+      />,
+    );
+
+    await user.click(screen.getByRole('button', { name: '确认前往外部页面' }));
+    expect(onConfirm).toHaveBeenCalledOnce();
+  });
+});
diff --git a/tests/component/preference-settings.test.tsx b/tests/component/preference-settings.test.tsx
new file mode 100644
index 0000000..abd2ea7
--- /dev/null
+++ b/tests/component/preference-settings.test.tsx
@@ -0,0 +1,39 @@
+import { render, screen } from '@testing-library/react';
+import userEvent from '@testing-library/user-event';
+import { beforeEach, describe, expect, it } from 'vitest';
+import { PreferenceSettings } from '@/features/profile/preference-settings';
+import { useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';
+
+describe('PreferenceSettings', () => {
+  beforeEach(() => {
+    window.localStorage.clear();
+    useProfileStore.setState({
+      personalizedFeed: true,
+      interestTags: ['山野', '人文', '慢旅行'],
+    });
+    useProfileStoreHydration.setState({ hydrated: true, hydrationError: false });
+  });
+
+  it('clears interest labels and disables personalized recommendations', async () => {
+    const user = userEvent.setup();
+    render(<PreferenceSettings />);
+
+    await user.click(screen.getByRole('switch', { name: '个性化推荐' }));
+    await user.click(screen.getByRole('button', { name: '清除兴趣标签' }));
+
+    expect(screen.getByText('当前使用按时间排序')).toBeInTheDocument();
+    expect(useProfileStore.getState().personalizedFeed).toBe(false);
+    expect(useProfileStore.getState().interestTags).toEqual([]);
+  });
+
+  it('keeps recommendation disabled when no interests remain', async () => {
+    const user = userEvent.setup();
+    useProfileStore.setState({ personalizedFeed: false, interestTags: [] });
+    render(<PreferenceSettings />);
+
+    const control = screen.getByRole('switch', { name: '个性化推荐' });
+    expect(control).toBeDisabled();
+    await user.click(control);
+    expect(useProfileStore.getState().personalizedFeed).toBe(false);
+  });
+});
diff --git a/tests/component/square-feed.test.tsx b/tests/component/square-feed.test.tsx
index b40ae57..c0cec02 100644
--- a/tests/component/square-feed.test.tsx
+++ b/tests/component/square-feed.test.tsx
@@ -1,15 +1,25 @@
 import { render, screen } from '@testing-library/react';
 import userEvent from '@testing-library/user-event';
-import { describe, expect, it, vi } from 'vitest';
+import { beforeEach, describe, expect, it, vi } from 'vitest';
 import { FeedControls } from '@/features/square/feed-controls';
 import SquarePage from '@/app/square/page';
+import { useProfileStore, useProfileStoreHydration } from '@/stores/profile-store';
+
+beforeEach(() => {
+  window.localStorage.clear();
+  useProfileStore.setState({
+    personalizedFeed: true,
+    interestTags: ['山野', '人文', '慢旅行'],
+  });
+  useProfileStoreHydration.setState({ hydrated: true, hydrationError: false });
+});
 
 describe('FeedControls', () => {
   it('lets users switch off recommendations', async () => {
     const user = userEvent.setup();
     const change = vi.fn();
     render(<FeedControls mode="recommended" onModeChange={change} />);
 
     await user.click(screen.getByRole('button', { name: '按时间排序' }));
 
     expect(change).toHaveBeenCalledWith('chronological');
@@ -64,11 +74,19 @@ describe('FeedControls', () => {
     const user = userEvent.setup();
     const change = vi.fn();
     render(<FeedControls interestTags={[]} mode="chronological" onModeChange={change} />);
 
     const recommendation = screen.getByRole('button', { name: '为你推荐' });
     expect(recommendation).toBeDisabled();
     expect(recommendation).toHaveAccessibleDescription('兴趣偏好已清空；以后添加兴趣偏好后可重新开启推荐。');
     await user.click(recommendation);
     expect(change).not.toHaveBeenCalledWith('recommended');
   });
+
+  it('uses the profile preference as the only source for chronological ordering', () => {
+    useProfileStore.setState({ personalizedFeed: false, interestTags: ['慢旅行'] });
+    render(<SquarePage />);
+
+    expect(screen.getByRole('button', { name: '按时间排序' })).toHaveAttribute('aria-pressed', 'true');
+    expect(screen.getByRole('button', { name: '为你推荐' })).toHaveAttribute('aria-pressed', 'false');
+  });
 });
diff --git a/tests/unit/production-safeguards.test.ts b/tests/unit/production-safeguards.test.ts
new file mode 100644
index 0000000..a83bf65
--- /dev/null
+++ b/tests/unit/production-safeguards.test.ts
@@ -0,0 +1,27 @@
+import { describe, expect, it } from 'vitest';
+import { GET } from '@/app/api/v1/health/route';
+import manifest from '@/app/manifest';
+import robots from '@/app/robots';
+import sitemap from '@/app/sitemap';
+
+describe('production safeguards', () => {
+  it('returns a minimal health payload without environment data', async () => {
+    const response = await GET();
+    const payload = await response.json() as Record<string, unknown>;
+
+    expect(response.status).toBe(200);
+    expect(payload).toMatchObject({ status: 'ok', demo_mode: true });
+    expect(JSON.stringify(payload)).not.toMatch(/secret|token|password|env/i);
+  });
+
+  it('builds crawler metadata with a stable public origin rather than localhost', async () => {
+    const [rules, pages, appManifest] = await Promise.all([robots(), sitemap(), manifest()]);
+    const serialized = JSON.stringify({ rules, pages, appManifest });
+
+    expect(serialized).not.toContain('localhost');
+    expect(pages).toEqual(expect.arrayContaining([
+      expect.objectContaining({ url: expect.stringMatching(/^https:\/\//) }),
+    ]));
+    expect(appManifest).toMatchObject({ name: '行屿 XINGYU', display: 'standalone' });
+  });
+});
diff --git a/tests/unit/security-headers.test.ts b/tests/unit/security-headers.test.ts
new file mode 100644
index 0000000..160089d
--- /dev/null
+++ b/tests/unit/security-headers.test.ts
@@ -0,0 +1,18 @@
+import { describe, expect, it } from 'vitest';
+import nextConfig from '../../next.config';
+
+describe('security headers', () => {
+  it('applies browser protection headers without dropping existing Next configuration', async () => {
+    const rules = await nextConfig.headers?.();
+    const rootRule = rules?.find((rule) => rule.source === '/(.*)');
+    const headers = new Map(rootRule?.headers.map((header) => [header.key, header.value]));
+
+    expect(nextConfig.poweredByHeader).toBe(false);
+    expect(headers).toMatchObject(new Map([
+      ['X-Content-Type-Options', 'nosniff'],
+      ['Referrer-Policy', 'strict-origin-when-cross-origin'],
+      ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
+      ['X-Frame-Options', 'SAMEORIGIN'],
+    ]));
+  });
+});
