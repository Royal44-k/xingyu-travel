# Commits
b7023ff test: verify the complete xingyu travel journey

# Diff stat
 .../2026-08-16-xingyu-public-mvp/task-11-report.md | 53 ++++++++++++++
 next.config.ts                                     |  1 +
 playwright.config.ts                               |  5 +-
 src/app/assistant/page.tsx                         |  2 +-
 src/app/chat/[matchId]/page.tsx                    |  2 +-
 src/app/compare/page.tsx                           |  2 +-
 src/app/guardian/[tripId]/page.tsx                 |  2 +-
 src/app/layout.tsx                                 |  1 +
 src/app/partners/page.tsx                          |  2 +-
 src/app/profile/page.tsx                           |  2 +-
 src/app/square/[slug]/page.tsx                     |  2 +-
 src/app/square/page.tsx                            |  2 +-
 src/app/trips/[slug]/page.tsx                      |  2 +-
 src/components/site-header.module.css              | 46 +++++++++---
 src/components/site-header.tsx                     | 30 +++++++-
 src/features/chat/chat-room.tsx                    |  1 +
 src/features/chat/chat.module.css                  |  1 +
 src/features/comparison/comparison.module.css      | 10 +--
 src/features/guardian/guardian.module.css          |  2 +-
 src/features/guardian/risk-timeline.tsx            |  3 +-
 src/features/home/hero.module.css                  |  4 ++
 src/features/home/hero.tsx                         |  9 ++-
 src/features/home/search-composer.tsx              | 10 +--
 src/features/partners/partners.module.css          | 26 +++----
 src/features/square/square.module.css              |  8 +--
 src/stores/partner-store.ts                        |  7 +-
 src/stores/profile-store.ts                        |  1 +
 src/stores/trip-store.ts                           |  1 +
 tests/component/risk-timeline.test.tsx             |  2 +-
 tests/component/site-header.test.tsx               |  2 +-
 tests/e2e/accessibility.spec.ts                    | 84 ++++++++++++++++++++++
 tests/e2e/core-journey.spec.ts                     | 52 ++++++++++++++
 tests/e2e/global-setup.ts                          | 27 +++++++
 tests/e2e/responsive.spec.ts                       | 49 +++++++++++++
 vitest.config.ts                                   |  8 ++-
 35 files changed, 397 insertions(+), 64 deletions(-)

# Full diff
diff --git a/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md
new file mode 100644
index 0000000..6e963c6
--- /dev/null
+++ b/.superpowers/sdd/2026-08-16-xingyu-public-mvp/task-11-report.md
@@ -0,0 +1,53 @@
+# Task 11 verification report — complete journey E2E, responsive, and accessibility
+
+## Scope and inherited state
+
+- Baseline: `994a05a`.
+- Inherited GREEN evidence: initial core journey `1 passed (22.3s)`, mobile navigation at `390x844` `1 passed`, homepage axe critical/serious `0`, and initial keyboard search/tab plus filter-dialog focus checks.
+- Confirmed in the worktree: E2E runtime collectors fail on `console.error`, `pageerror`, and every HTTP status `>=400`; the full public-journey, mobile-nav, a11y, dialog, external-confirmation, and reduced-motion checks all use those collectors.
+
+## New and resumed verification
+
+The desktop foreground command boundary cut long Playwright commands at about 31 seconds without a terminal reporter result. I did not classify those runs as passes. `pnpm exec playwright` also failed immediately with `'playwright' is not recognized`, despite the local binary being present. I used the local `node_modules/.bin/playwright.cmd` in a detached task-local process with `--workers=1 --reporter=list`, while a task-local Next server on port 4173 was running and verified with HTTP 200. The captured reporter outputs were:
+
+| Command / scope | Terminal result |
+| --- | --- |
+| `responsive.spec.ts --grep=trips` | 1 passed (4.3s) |
+| responsive routes `/compare`, `/square`, `/partners`, `/assistant`, `/guardian/dali-slow-5d` | each 1 passed (3.1–4.3s) |
+| axe routes `/`, `/compare`, `/square`, `/partners`, `/assistant`, `/guardian/dali-slow-5d` | each 1 passed (3.8–4.3s); no critical/serious violations |
+| external quote confirmation | 1 passed (3.6s) |
+| reduced motion | 1 passed (3.3s) |
+| `core-journey.spec.ts --workers=1 --reporter=list` | 1 passed (12.3s) |
+| `responsive.spec.ts --workers=1 --reporter=list` | 7 passed (8.9s) |
+| `accessibility.spec.ts --workers=1 --reporter=list` | 10 passed (17.1s), including keyboard tabs/search, dialog focus trap/Escape/trigger restore, external confirmation, and reduced motion |
+| `pnpm test:e2e` | 18 passed (22.7s) |
+
+The detached Node processes emitted only the environmental warning that `NO_COLOR` is ignored because `FORCE_COLOR` is set. No E2E runtime collector reported console, page, or nonexpected HTTP errors.
+
+## Verification fix from observed RED
+
+The first `pnpm verify` exited 1 after lint and typecheck:
+
+- Vitest's default glob collected the newly added Playwright `tests/e2e/*.spec.ts` as three zero-test files.
+- `site-header.test.tsx` still expected the obsolete `/guardian/demo`, while the Task 11 header route intentionally points at the existing `/guardian/dali-slow-5d` route.
+- `risk-timeline.test.tsx` still expected the former button accessible name, while Task 11 adds the `Plan A` qualifier needed by the journey test and assistive technology.
+
+Minimal corrections:
+
+- `vitest.config.ts` excludes `tests/e2e/**` while preserving Vitest default exclusions.
+- The two component tests now assert the intentional route and accessible name.
+
+Fresh post-fix evidence:
+
+| Command | Terminal result |
+| --- | --- |
+| direct `vitest run` for the two repaired component files, `--maxWorkers=1 --reporter=verbose` | 2 files / 3 tests passed (26.18s) |
+| direct full `vitest run --maxWorkers=1 --reporter=dot` | 28 files / 214 tests passed (253.37s) |
+| final `pnpm verify` | exit 0: eslint, `tsc --noEmit`, Vitest 28 files / 214 tests passed (64.86s), and Next production build completed |
+
+`git diff --check` completed without whitespace errors before commit.
+
+## Concerns
+
+- Local Playwright invocation needs the direct local binary in this desktop environment because `pnpm exec playwright` does not resolve it; `pnpm test:e2e` itself succeeds.
+- No product-test failures remain. The `NO_COLOR`/`FORCE_COLOR` warning is environment-only and does not come from application runtime collectors.
diff --git a/next.config.ts b/next.config.ts
index 1233f09..d676e68 100644
--- a/next.config.ts
+++ b/next.config.ts
@@ -1,17 +1,18 @@
 import type { NextConfig } from 'next';
 
 const securityHeaders = [
   { key: 'X-Content-Type-Options', value: 'nosniff' },
   { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
   { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
   { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
 ];
 
 const nextConfig: NextConfig = {
+  allowedDevOrigins: ['127.0.0.1'],
   poweredByHeader: false,
   async headers() {
     return [{ source: '/(.*)', headers: securityHeaders }];
   },
 };
 
 export default nextConfig;
diff --git a/playwright.config.ts b/playwright.config.ts
index 923e286..b252081 100644
--- a/playwright.config.ts
+++ b/playwright.config.ts
@@ -1,12 +1,13 @@
 import { defineConfig, devices } from '@playwright/test';
 
 export default defineConfig({
   testDir: './tests/e2e',
+  globalSetup: './tests/e2e/global-setup.ts',
   use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
   webServer: {
-    command: 'pnpm dev -- --hostname 0.0.0.0 --port 4173',
+    command: 'pnpm exec next dev --hostname 0.0.0.0 --port 4173',
     url: 'http://127.0.0.1:4173',
     reuseExistingServer: true,
   },
-  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
+  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
 });
diff --git a/src/app/assistant/page.tsx b/src/app/assistant/page.tsx
index 7481858..85150d7 100644
--- a/src/app/assistant/page.tsx
+++ b/src/app/assistant/page.tsx
@@ -1,6 +1,6 @@
 import { SiteHeader } from '@/components/site-header';
 import { AssistantClient } from '@/features/assistant/assistant-client';
 
 export default function AssistantPage() {
-  return <><SiteHeader activePath="/assistant" /><AssistantClient /></>;
+return <><SiteHeader activePath="/assistant" variant="solid" /><AssistantClient /></>;
 }
diff --git a/src/app/chat/[matchId]/page.tsx b/src/app/chat/[matchId]/page.tsx
index 548c3ac..b1cc68f 100644
--- a/src/app/chat/[matchId]/page.tsx
+++ b/src/app/chat/[matchId]/page.tsx
@@ -2,12 +2,12 @@ import type { Metadata } from 'next';
 import { SiteHeader } from '@/components/site-header';
 import { ChatRoom } from '@/features/chat/chat-room';
 
 export const metadata: Metadata = {
   title: '搭子聊天演示',
   description: '仅对完成双方同意的本地演示匹配开放，包含联系方式双向同意与安全工具。',
 };
 
 export default async function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
   const { matchId } = await params;
-  return <><SiteHeader /><ChatRoom matchId={matchId} /></>;
+return <><SiteHeader variant="solid" /><ChatRoom matchId={matchId} /></>;
 }
diff --git a/src/app/compare/page.tsx b/src/app/compare/page.tsx
index 9cd8ff5..7a50dd1 100644
--- a/src/app/compare/page.tsx
+++ b/src/app/compare/page.tsx
@@ -13,15 +13,15 @@ export const metadata: Metadata = {
 
 export default async function ComparePage({
   searchParams,
 }: {
   searchParams: Promise<ComparisonSearchParams>;
 }) {
   const params = await searchParams;
 
   return (
     <>
-      <SiteHeader activePath="/compare" />
+        <SiteHeader activePath="/compare" variant="solid" />
       <ComparisonClient initialSearch={searchFromParams(params)} />
     </>
   );
 }
diff --git a/src/app/guardian/[tripId]/page.tsx b/src/app/guardian/[tripId]/page.tsx
index 9c08748..ae5eba1 100644
--- a/src/app/guardian/[tripId]/page.tsx
+++ b/src/app/guardian/[tripId]/page.tsx
@@ -2,12 +2,12 @@ import Image from 'next/image';
 import { notFound } from 'next/navigation';
 import { SiteHeader } from '@/components/site-header';
 import { brandAssets } from '@/data/assets';
 import { isKnownGuardianTrip, riskEventsForTrip } from '@/data/risk-events';
 import { RiskTimeline } from '@/features/guardian/risk-timeline';
 import styles from '@/features/guardian/guardian.module.css';
 
 export default async function GuardianPage({ params }: { params: Promise<{ tripId: string }> }) {
   const { tripId } = await params;
   if (!isKnownGuardianTrip(tripId)) notFound();
-  return <><SiteHeader activePath="/guardian/demo" /><main className={styles.page}><section className={styles.hero}><div className={styles.heroCopy}><p>TRIP GUARDIAN / DEMO</p><h1>先看风险，再决定下一步</h1><span>风险时间线与 Plan A/B/C 均来自固定演示事件；选择只会写入当前浏览器的行程决策。</span></div><Image alt={brandAssets.guardian.alt} className={styles.heroImage} height={brandAssets.guardian.height} priority src={brandAssets.guardian.src} width={brandAssets.guardian.width} /></section><RiskTimeline events={riskEventsForTrip(tripId)} tripId={tripId} /></main></>;
+return <><SiteHeader activePath="/guardian/demo" variant="solid" /><main className={styles.page}><section className={styles.hero}><div className={styles.heroCopy}><p>TRIP GUARDIAN / DEMO</p><h1>先看风险，再决定下一步</h1><span>风险时间线与 Plan A/B/C 均来自固定演示事件；选择只会写入当前浏览器的行程决策。</span></div><Image alt={brandAssets.guardian.alt} className={styles.heroImage} height={brandAssets.guardian.height} priority src={brandAssets.guardian.src} width={brandAssets.guardian.width} /></section><RiskTimeline events={riskEventsForTrip(tripId)} tripId={tripId} /></main></>;
 }
diff --git a/src/app/layout.tsx b/src/app/layout.tsx
index 390d43e..6a12066 100644
--- a/src/app/layout.tsx
+++ b/src/app/layout.tsx
@@ -12,20 +12,21 @@ const sans = Noto_Sans_SC({
 const serif = Noto_Serif_SC({
   subsets: ['latin'],
   display: 'swap',
   variable: '--font-noto-serif-sc',
   weight: ['400', '500', '600'],
 });
 
 export const metadata: Metadata = {
   title: { default: '行屿 XINGYU', template: '%s | 行屿 XINGYU' },
   description: '透明比价、可信搭子、攻略转行程与主动式旅行守护。',
+  icons: { icon: '/assets/guardian-rainy-mountain.png' },
 };
 
 export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
 
 export default function RootLayout({ children }: { children: React.ReactNode }) {
   return (
     <html lang="zh-CN" className={`${sans.variable} ${serif.variable}`}>
       <body><DemoBanner />{children}</body>
     </html>
   );
diff --git a/src/app/partners/page.tsx b/src/app/partners/page.tsx
index 7edbc3d..9f8b86a 100644
--- a/src/app/partners/page.tsx
+++ b/src/app/partners/page.tsx
@@ -1,12 +1,12 @@
 import type { Metadata } from 'next';
 import { SiteHeader } from '@/components/site-header';
 import { PartnerMatchExperience } from '@/features/partners/match-list';
 
 export const metadata: Metadata = {
   title: '可信搭子匹配',
   description: '浏览公开搭子卡片，以明确边界、可解释分数和双方同意开始一次本地演示匹配。',
 };
 
 export default function PartnersPage() {
-  return <><SiteHeader activePath="/partners" /><PartnerMatchExperience /></>;
+return <><SiteHeader activePath="/partners" variant="solid" /><PartnerMatchExperience /></>;
 }
diff --git a/src/app/profile/page.tsx b/src/app/profile/page.tsx
index 2129858..cb5e77a 100644
--- a/src/app/profile/page.tsx
+++ b/src/app/profile/page.tsx
@@ -3,21 +3,21 @@ import { SiteHeader } from '@/components/site-header';
 import { PreferenceSettings } from '@/features/profile/preference-settings';
 
 export const metadata: Metadata = {
   title: '演示账户与偏好',
   description: '管理浏览器本地保存的演示推荐偏好与透明度说明。',
 };
 
 export default function ProfilePage() {
   return (
     <>
-      <SiteHeader activePath="/profile" />
+        <SiteHeader activePath="/profile" variant="solid" />
       <main className="profilePage">
         <section aria-labelledby="profile-title" className="profileIntro">
           <p>XINGYU · DEMO PROFILE</p>
           <h1 id="profile-title">演示账户与偏好</h1>
           <p>演示身份状态仅用于说明安全边界，不等同于实名核验，也不收集证件、人脸、联系方式或支付信息。</p>
           <dl className="profileStatusList">
             <div><dt>年龄边界</dt><dd>26 岁演示账户（仅作 18+ 功能边界展示）</dd></div>
             <div><dt>身份状态</dt><dd>演示已验证，不是实名认证结果</dd></div>
             <div><dt>风险状态</dt><dd>演示状态清晰，不构成安全担保</dd></div>
           </dl>
diff --git a/src/app/square/[slug]/page.tsx b/src/app/square/[slug]/page.tsx
index f6c4887..9b0bff3 100644
--- a/src/app/square/[slug]/page.tsx
+++ b/src/app/square/[slug]/page.tsx
@@ -7,21 +7,21 @@ import { postsBySlug } from '@/data/posts';
 import { ConvertToTrip } from '@/features/square/convert-to-trip';
 import styles from '@/features/square/square.module.css';
 
 export default async function SquarePostPage({ params }: { params: Promise<{ slug: string }> }) {
   const { slug } = await params;
   const post = postsBySlug[slug];
   if (!post) notFound();
 
   return (
     <>
-      <SiteHeader activePath="/square" />
+        <SiteHeader activePath="/square" variant="solid" />
       <main className={styles.detailPage}>
         <Link className={styles.backLink} href="/square">← 返回灵感广场</Link>
         <header className={styles.detailHeader}><p><MapPin aria-hidden size={16} weight="fill" /> {post.destination} · {post.days} 天 · 预算 ¥{post.budget.toLocaleString('zh-CN')}</p><h1>{post.title}</h1><div className={styles.detailAuthor}><b aria-hidden>{post.author.avatar}</b><span>{post.author.name} · {post.author.role}</span><time dateTime={post.publishedAt}>{new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(post.publishedAt))}</time></div>{(post.ai.generated || post.ai.rewritten) && <span className={styles.aiLabel}><Sparkle aria-hidden size={15} weight="fill" /> {post.ai.generated ? 'AI 生成' : 'AI 改写'}{post.ai.generated && post.ai.rewritten ? ' · 已人工改写' : ''}</span>}</header>
         <div className={styles.detailLayout}><article className={styles.article}><p className={styles.lede}>{post.excerpt}</p><div className={styles.mediaGrid}>{post.media.slice(0, 9).map((image, index) => <Image alt={image.alt} className={styles.detailImage} height={image.height} key={`${image.src}-${index}`} sizes="(max-width: 760px) 100vw, 48vw" src={image.src} width={image.width} />)}</div><h2>这次怎么走</h2><ol className={styles.itinerary}>{post.itinerary.map((item) => <li key={item.day}><span>DAY {item.day}</span><div><h3>{item.title}</h3><p>{item.description}</p><small><MapPin aria-hidden size={14} weight="fill" /> {item.location}</small></div></li>)}</ol></article>
           <aside className={styles.detailAside}><section><h2>地点卡片</h2>{post.locations.map((location) => <div className={styles.locationCard} key={location.name}><MapPin aria-hidden size={18} weight="fill" /><div><strong>{location.name}</strong><span>{location.area}</span><p>{location.note}</p></div></div>)}</section>{post.products.length > 0 && <section><h2>路书里的演示商品</h2>{post.products.map((product) => <div className={styles.productCard} key={product.name}><span>{product.category}</span><strong>{product.name}</strong><b>¥{product.price}</b><p>{product.note}</p></div>)}</section>}<ConvertToTrip post={post} /></aside>
         </div>
       </main>
     </>
   );
 }
diff --git a/src/app/square/page.tsx b/src/app/square/page.tsx
index 901056f..c2c4735 100644
--- a/src/app/square/page.tsx
+++ b/src/app/square/page.tsx
@@ -22,21 +22,21 @@ export default function SquarePage() {
   const hydrationError = useProfileStoreHydration((state) => state.hydrationError);
   const mode: FeedMode = personalizedFeed && interestTags.length > 0 ? 'recommended' : 'chronological';
   const posts = orderPosts(mode, interestTags);
 
   useEffect(() => {
     void hydrateProfileStore();
   }, []);
 
   return (
     <>
-      <SiteHeader activePath="/square" />
+        <SiteHeader activePath="/square" variant="solid" />
       <main className={styles.squarePage}>
         <header className={styles.hero}><p>GUIDE SQUARE</p><h1>在别人的路书里，找到自己的出发理由。</h1><span>真实的旅行片段，整理成可继续编辑的本地行程草稿。</span></header>
         <section aria-labelledby="feed-title" className={styles.feedSection}>
           <div className={styles.feedHeading}><div><p>编辑精选</p><h2 id="feed-title">旅行者正在分享</h2></div>{hydrated ? <FeedControls interestTags={interestTags} mode={mode} onClearInterestTags={clearInterestTags} onModeChange={(nextMode) => setPersonalizedFeed(nextMode === 'recommended')} /> : null}</div>
           {!hydrated ? (
             <p className={styles.loading} role="status">正在读取浏览器本地偏好，暂不展示排序与推荐结果。</p>
           ) : (
             <>
               {hydrationError ? <p className={styles.recommendationHint} role="status">本地偏好无法安全读取，当前按时间排序；可前往 <Link href="/profile">演示账户</Link> 重置偏好。</p> : null}
               <div className={styles.masonry}>{posts.map((post) => <PostCard key={post.slug} post={post} />)}</div>
diff --git a/src/app/trips/[slug]/page.tsx b/src/app/trips/[slug]/page.tsx
index ad873de..1f9bdc8 100644
--- a/src/app/trips/[slug]/page.tsx
+++ b/src/app/trips/[slug]/page.tsx
@@ -1,13 +1,13 @@
 import { SiteHeader } from '@/components/site-header';
 import { TripWorkbench } from '@/features/trips/trip-workbench';
 
 export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
   const { slug } = await params;
 
   return (
     <>
-      <SiteHeader />
+        <SiteHeader variant="solid" />
       <TripWorkbench slug={slug} />
     </>
   );
 }
diff --git a/src/components/site-header.module.css b/src/components/site-header.module.css
index 018db61..92aedcc 100644
--- a/src/components/site-header.module.css
+++ b/src/components/site-header.module.css
@@ -14,20 +14,32 @@
 }
 
 .header[data-scrolled='true'] {
   color: var(--ink);
   border-color: rgb(16 16 15 / 14%);
   background: rgb(244 240 232 / 96%);
   box-shadow: 0 10px 30px rgb(16 16 15 / 7%);
   backdrop-filter: blur(16px);
 }
 
+.header[data-variant='solid'] {
+  color: var(--ink);
+  border-color: rgb(16 16 15 / 14%);
+  background: rgb(244 240 232 / 96%);
+  box-shadow: 0 10px 30px rgb(16 16 15 / 7%);
+  backdrop-filter: blur(16px);
+}
+
+.header[data-variant='solid'] .tripLink {
+  border-color: rgb(16 16 15 / 30%);
+}
+
 .inner {
   width: min(calc(100% - 64px), var(--content-max));
   min-height: 82px;
   margin: 0 auto;
   display: grid;
   grid-template-columns: 190px 1fr 128px;
   align-items: center;
   gap: 32px;
 }
 
@@ -51,20 +63,33 @@
   font-weight: 300;
   letter-spacing: 0.14em;
 }
 
 .nav {
   display: flex;
   justify-content: center;
   gap: clamp(24px, 3.8vw, 58px);
 }
 
+.menuButton {
+  display: none;
+  align-items: center;
+  justify-content: center;
+  width: 42px;
+  height: 42px;
+  padding: 0;
+  color: inherit;
+  border: 1px solid currentColor;
+  background: transparent;
+  cursor: pointer;
+}
+
 .navLink,
 .tripLink {
   position: relative;
   color: inherit;
   font-size: 15px;
   letter-spacing: 0.08em;
   text-decoration: none;
   white-space: nowrap;
 }
 
@@ -100,40 +125,43 @@
 .brand:focus-visible,
 .navLink:focus-visible,
 .tripLink:focus-visible {
   outline: 2px solid var(--sand);
   outline-offset: 5px;
 }
 
 @media (max-width: 900px) {
   .inner {
     width: min(calc(100% - 40px), var(--content-max));
-    grid-template-columns: 1fr auto;
+    grid-template-columns: 1fr auto auto;
     gap: 8px 24px;
     padding: 14px 0 12px;
   }
 
   .nav {
+    display: none;
     grid-column: 1 / -1;
     grid-row: 2;
-    justify-content: flex-start;
-    gap: 25px;
-    overflow-x: auto;
-    padding: 4px 0 10px;
-    scrollbar-width: none;
+    flex-direction: column;
+    gap: 0;
+    padding: 4px 0 0;
+    border-top: 1px solid rgb(244 240 232 / 35%);
   }
 
-  .nav::-webkit-scrollbar {
-    display: none;
-  }
+  .header[data-scrolled='true'] .nav,
+  .header[data-variant='solid'] .nav { border-color: rgb(16 16 15 / 18%); }
+  .nav[data-open='true'] { display: flex; }
+
+  .menuButton { display: inline-flex; }
 
   .navLink {
+    padding: 12px 0;
     font-size: 13px;
   }
 
   .navLink::after {
     bottom: -8px;
   }
 }
 
 @media (max-width: 520px) {
   .inner {
diff --git a/src/components/site-header.tsx b/src/components/site-header.tsx
index 6bb4cf7..a8a8247 100644
--- a/src/components/site-header.tsx
+++ b/src/components/site-header.tsx
@@ -1,58 +1,82 @@
 'use client';
 
 import Link from 'next/link';
+import { List, X } from '@phosphor-icons/react';
 import { useEffect, useState } from 'react';
 import styles from './site-header.module.css';
 
 const primaryLinks = [
   { href: '/', label: '首页' },
   { href: '/compare', label: '真实比价' },
   { href: '/square', label: '灵感广场' },
   { href: '/partners', label: '寻找搭子' },
-  { href: '/guardian/demo', label: '行程守护' },
+  { href: '/guardian/dali-slow-5d', label: '行程守护' },
 ] as const;
 
 type SiteHeaderProps = {
   activePath?: string;
+  variant?: 'overlay' | 'solid';
 };
 
-export function SiteHeader({ activePath = '/' }: SiteHeaderProps) {
+export function SiteHeader({ activePath = '/', variant = 'overlay' }: SiteHeaderProps) {
   const [hasScrolled, setHasScrolled] = useState(false);
+  const [mobileNavOpen, setMobileNavOpen] = useState(false);
 
   useEffect(() => {
     const updateHeader = () => setHasScrolled(window.scrollY > 48);
     updateHeader();
     window.addEventListener('scroll', updateHeader, { passive: true });
     return () => window.removeEventListener('scroll', updateHeader);
   }, []);
 
+  useEffect(() => {
+    const closeOnEscape = (event: KeyboardEvent) => {
+      if (event.key === 'Escape') setMobileNavOpen(false);
+    };
+    window.addEventListener('keydown', closeOnEscape);
+    return () => window.removeEventListener('keydown', closeOnEscape);
+  }, []);
+
   return (
     <header
       className={styles.header}
       data-scrolled={hasScrolled ? 'true' : 'false'}
+      data-variant={variant}
     >
       <div className={styles.inner}>
         <Link className={styles.brand} href="/" aria-label="行屿 XINGYU">
           <span className={styles.brandChinese}>行屿</span>
           <span className={styles.brandLatin}>XINGYU</span>
         </Link>
 
-        <nav className={styles.nav} aria-label="主导航">
+        <button
+          aria-controls="primary-navigation"
+          aria-expanded={mobileNavOpen}
+          aria-label={mobileNavOpen ? '关闭导航' : '打开导航'}
+          className={styles.menuButton}
+          onClick={() => setMobileNavOpen((open) => !open)}
+          type="button"
+        >
+          {mobileNavOpen ? <X aria-hidden size={22} /> : <List aria-hidden size={24} />}
+        </button>
+
+        <nav className={styles.nav} aria-label="主导航" data-open={mobileNavOpen} id="primary-navigation">
           {primaryLinks.map((link) => {
             const isCurrent = activePath === link.href;
             return (
               <Link
                 className={styles.navLink}
                 href={link.href}
                 key={link.href}
                 aria-current={isCurrent ? 'page' : undefined}
+                onClick={() => setMobileNavOpen(false)}
               >
                 {link.label}
               </Link>
             );
           })}
         </nav>
 
         <Link className={styles.tripLink} href="/trips/demo">
           我的行程
         </Link>
diff --git a/src/features/chat/chat-room.tsx b/src/features/chat/chat-room.tsx
index 4a095fa..9388972 100644
--- a/src/features/chat/chat-room.tsx
+++ b/src/features/chat/chat-room.tsx
@@ -52,20 +52,21 @@ export function ChatRoom({ matchId }: { matchId: string }) {
       setSendError(error instanceof Error && error.message === 'PARTNER_EMPTY_MESSAGE' ? '请输入消息内容' : '消息暂时无法发送');
     }
   };
 
   return (
     <main className={styles.page}>
       <header className={styles.chatHeader}>
         <div><p>MUTUAL MATCH · SANDBOX</p><h1>与 {candidate.displayName} 的会话</h1><span><ShieldCheck aria-hidden size={16} />双方已同意 · 本地演示聊天，无实时服务或后台连接</span></div>
         <Link href="/partners">返回搭子匹配</Link>
       </header>
+      <p className={styles.safetyNotice} role="note">请勿在聊天中交换身份证件、精确位置、支付信息或其他敏感信息；涉及联系方式时需双方单独同意。</p>
       {hydrationError && <p className={styles.warningBar}>本地聊天记录校验失败，已使用安全的内存状态。</p>}
       <div className={styles.chatLayout}>
         <section aria-labelledby="messages-title" className={styles.conversation}>
           <div className={styles.conversationHeading}><div><p>PRIVATE DEMO ROOM</p><h2 id="messages-title">对话记录</h2></div><span>仅当前浏览器</span></div>
           <ol aria-live="polite" className={styles.messageList}>
             <li className={styles.candidateMessage}><small>{candidate.displayName} · 沙箱示例</small><p>你好，我们可以先从路线节奏和住宿边界聊起。</p></li>
             {match.messages.map((message) => <li className={styles.viewerMessage} key={message.id}><small>我 · 本地演示</small><p>{message.body}</p></li>)}
           </ol>
           <form className={styles.composer} onSubmit={submit}>
             <label htmlFor="chat-message">消息</label>
diff --git a/src/features/chat/chat.module.css b/src/features/chat/chat.module.css
index a9fad90..83b2d74 100644
--- a/src/features/chat/chat.module.css
+++ b/src/features/chat/chat.module.css
@@ -1,17 +1,18 @@
 .page { width: min(100% - 48px, var(--content-max)); margin: 0 auto; padding: 118px 0 80px; }
 .chatHeader { display: flex; align-items: end; justify-content: space-between; gap: 30px; padding: 32px 36px; color: #f5efe4; background: #1f2b25; }
 .chatHeader p, .conversationHeading p, .safetyRail section > p, .safetyDialog > p, .lockedPage p { margin: 0 0 8px; color: #c9b889; font-size: 9px; font-weight: 800; letter-spacing: .17em; }
 .chatHeader h1 { margin: 0 0 10px; font-family: var(--font-display); font-size: 38px; font-weight: 500; }
 .chatHeader span { display: flex; align-items: center; gap: 6px; color: rgb(245 239 228 / 62%); font-size: 12px; }
 .chatHeader a { padding-bottom: 4px; border-bottom: 1px solid #c9b889; font-size: 12px; text-decoration: none; }
 .warningBar { margin: 12px 0; padding: 12px; color: #7d312c; background: #f0d9d2; }
+.safetyNotice { margin: 12px 0 0; padding: 12px 14px; color: #513d1f; border-left: 3px solid #b79a68; background: #f3e8cb; font-size: 13px; line-height: 1.65; }
 .chatLayout { display: grid; grid-template-columns: minmax(0, 1fr) 370px; gap: 18px; margin-top: 18px; }
 .conversation { display: grid; min-height: 680px; grid-template-rows: auto 1fr auto auto; padding: 30px; background: #fffdf8; border: 1px solid #d8d0c4; }
 .conversationHeading { display: flex; align-items: end; justify-content: space-between; padding-bottom: 22px; border-bottom: 1px solid #ddd5c9; }
 .conversationHeading h2, .safetyRail h2, .safetyDialog h2 { margin: 0; font-family: var(--font-display); font-size: 24px; font-weight: 600; }
 .conversationHeading > span { color: #7b746b; font-size: 11px; }
 .messageList { display: grid; align-content: start; gap: 12px; margin: 0; padding: 28px 0; list-style: none; }
 .messageList li { max-width: 78%; padding: 13px 15px; background: #ece5d9; border-radius: 2px 14px 14px 14px; }
 .messageList .viewerMessage { justify-self: end; color: white; background: #304138; border-radius: 14px 2px 14px 14px; }
 .messageList small { color: #82796d; font-size: 9px; }
 .viewerMessage small { color: rgb(255 255 255 / 56%); }
diff --git a/src/features/comparison/comparison.module.css b/src/features/comparison/comparison.module.css
index 79d7574..75ee365 100644
--- a/src/features/comparison/comparison.module.css
+++ b/src/features/comparison/comparison.module.css
@@ -51,21 +51,21 @@
   background: var(--ivory);
   box-shadow: 0 18px 45px rgb(16 16 15 / 10%);
 }
 
 .tab {
   position: relative;
   display: inline-flex;
   align-items: center;
   gap: 8px;
   padding: 0 3px;
-  color: rgb(16 16 15 / 55%);
+  color: rgb(16 16 15 / 64%);
   border: 0;
   background: transparent;
   cursor: pointer;
 }
 
 .tab::after {
   content: '';
   position: absolute;
   right: 0;
   bottom: -1px;
@@ -98,21 +98,21 @@
   gap: 4px;
 }
 
 .toolbar > div strong {
   font-family: var(--font-display);
   font-size: 20px;
   font-weight: 500;
 }
 
 .toolbar > div span {
-  color: rgb(16 16 15 / 58%);
+  color: rgb(16 16 15 / 68%);
   font-size: 12px;
 }
 
 .secondaryButton,
 .sortControl,
 .alertSwitch {
   display: inline-flex;
   align-items: center;
   gap: 8px;
   min-height: 42px;
@@ -266,21 +266,21 @@
   margin: 10px 0 7px;
   font-family: var(--font-display);
   font-size: 19px;
   font-weight: 500;
   line-height: 1.5;
 }
 
 .updated,
 .stale {
   margin: 0;
-  color: rgb(16 16 15 / 52%);
+  color: #67645e;
   font-size: 11px;
 }
 
 .stale {
   display: flex;
   align-items: center;
   gap: 5px;
   margin-top: 6px;
   color: #875c1b;
 }
@@ -321,21 +321,21 @@
 }
 
 .offerPrice strong {
   font-family: var(--font-display);
   font-size: 23px;
   font-weight: 600;
 }
 
 .offerPrice > span {
   margin: 6px 0 12px;
-  color: rgb(16 16 15 / 54%);
+  color: #625f59;
   font-size: 11px;
 }
 
 .primaryButton {
   display: inline-flex;
   align-items: center;
   justify-content: center;
   gap: 7px;
   min-height: 39px;
   padding: 0 16px;
@@ -398,21 +398,21 @@
   margin: 0;
   color: rgb(16 16 15 / 68%);
   font-size: 12px;
   line-height: 1.65;
 }
 
 .loading {
   min-height: 180px;
   display: grid;
   place-items: center;
-  color: rgb(16 16 15 / 58%);
+  color: rgb(16 16 15 / 68%);
   border: 1px dashed rgb(16 16 15 / 22%);
   background: rgb(244 240 232 / 48%);
 }
 
 .compareBar {
   position: fixed;
   z-index: 24;
   right: 28px;
   bottom: 26px;
   display: flex;
diff --git a/src/features/guardian/guardian.module.css b/src/features/guardian/guardian.module.css
index 869f166..5a005b0 100644
--- a/src/features/guardian/guardian.module.css
+++ b/src/features/guardian/guardian.module.css
@@ -1 +1 @@
-.page { width: min(100% - 40px, var(--content-max)); margin: 0 auto; padding: 126px 0 80px; }.hero { display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; color: var(--ivory); background: var(--pine); }.heroCopy { padding: 48px; }.heroCopy p, .eventHead p, .plan > p { margin: 0 0 11px; color: var(--sand); font-size: 11px; font-weight: 700; letter-spacing: .16em; }.hero h1 { margin: 0; font-family: var(--font-display); font-size: clamp(36px, 4.8vw, 62px); font-weight: 500; line-height: 1.15; }.hero span { display: block; margin-top: 20px; color: rgb(244 240 232 / 72%); line-height: 1.75; }.heroImage { width: 100%; height: 100%; min-height: 310px; object-fit: cover; }.timeline { margin-top: 26px; }.demoNote { margin: 0 0 16px; padding: 12px 15px; color: #674d1f; background: #f0e1ba; border-left: 3px solid #ae8440; font-size: 13px; }.event { padding: 30px; background: #fffdf8; border: 1px solid #d6cdc0; }.eventHead { display: flex; align-items: flex-start; gap: 12px; color: #963a2d; }.eventHead h2 { margin: 0; color: var(--ink); font-family: var(--font-display); font-size: 28px; }.event > p { max-width: 800px; line-height: 1.75; }.event > small { color: #6c645a; }.plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }.plan { padding: 20px; background: #f1ece3; border: 1px solid #d7cec1; }.plan h3 { min-height: 54px; margin: 0 0 15px; font-family: var(--font-display); font-size: 20px; }.plan dl { display: grid; gap: 8px; margin: 0 0 18px; }.plan dl div { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }.plan dt { color: #746b60; }.plan dd { margin: 0; text-align: right; }.plan button { width: 100%; min-height: 40px; color: var(--ivory); border: 0; border-radius: 6px; background: var(--pine); cursor: pointer; }.status { margin: 14px 0 0; color: #41634e; font-size: 13px; }.page button:focus-visible { outline: 3px solid var(--sand); outline-offset: 3px; }@media (max-width: 760px) { .page { width: min(100% - 24px, var(--content-max)); padding-top: 102px; }.hero { grid-template-columns: 1fr; }.heroCopy { padding: 36px 24px; }.heroImage { min-height: 210px; }.event { padding: 22px 18px; }.plans { grid-template-columns: 1fr; } }
+.page { width: min(100% - 40px, var(--content-max)); margin: 0 auto; padding: 126px 0 80px; }.hero { display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; color: var(--ivory); background: var(--pine); }.heroCopy { padding: 48px; }.heroCopy p { margin: 0 0 11px; color: var(--sand); font-size: 11px; font-weight: 700; letter-spacing: .16em; }.eventHead p, .plan > p { margin: 0 0 11px; color: #765a2c; font-size: 11px; font-weight: 700; letter-spacing: .16em; }.hero h1 { margin: 0; font-family: var(--font-display); font-size: clamp(36px, 4.8vw, 62px); font-weight: 500; line-height: 1.15; }.hero span { display: block; margin-top: 20px; color: rgb(244 240 232 / 72%); line-height: 1.75; }.heroImage { width: 100%; height: 100%; min-height: 310px; object-fit: cover; }.timeline { margin-top: 26px; }.demoNote { margin: 0 0 16px; padding: 12px 15px; color: #674d1f; background: #f0e1ba; border-left: 3px solid #ae8440; font-size: 13px; }.alternativesHeading { margin: 0 0 14px; font-family: var(--font-display); font-size: 28px; font-weight: 600; }.event { padding: 30px; background: #fffdf8; border: 1px solid #d6cdc0; }.eventHead { display: flex; align-items: flex-start; gap: 12px; color: #963a2d; }.eventHead h2 { margin: 0; color: var(--ink); font-family: var(--font-display); font-size: 28px; }.event > p { max-width: 800px; line-height: 1.75; }.event > small { color: #625b52; }.plans { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }.plan { padding: 20px; background: #f1ece3; border: 1px solid #d7cec1; }.plan h3 { min-height: 54px; margin: 0 0 15px; font-family: var(--font-display); font-size: 20px; }.plan dl { display: grid; gap: 8px; margin: 0 0 18px; }.plan dl div { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }.plan dt { color: #665e54; }.plan dd { margin: 0; text-align: right; }.plan button { width: 100%; min-height: 40px; color: var(--ivory); border: 0; border-radius: 6px; background: var(--pine); cursor: pointer; }.status { margin: 14px 0 0; color: #41634e; font-size: 13px; }.page button:focus-visible { outline: 3px solid var(--sand); outline-offset: 3px; }@media (max-width: 760px) { .page { width: min(100% - 24px, var(--content-max)); padding-top: 102px; }.hero { grid-template-columns: 1fr; }.heroCopy { padding: 36px 24px; }.heroImage { min-height: 210px; }.event { padding: 22px 18px; }.plans { grid-template-columns: 1fr; } }
diff --git a/src/features/guardian/risk-timeline.tsx b/src/features/guardian/risk-timeline.tsx
index a16e601..8677374 100644
--- a/src/features/guardian/risk-timeline.tsx
+++ b/src/features/guardian/risk-timeline.tsx
@@ -5,21 +5,22 @@ import type { GuardianRiskEvent } from '@/data/risk-events';
 import { useTripStore } from '@/stores/trip-store';
 import styles from './guardian.module.css';
 
 interface RiskTimelineProps { events: GuardianRiskEvent[]; tripId: string; }
 
 export function RiskTimeline({ events, tripId }: RiskTimelineProps) {
   const selectGuardianPlan = useTripStore((state) => state.selectGuardianPlan);
   return (
     <section aria-label="行程守护风险时间线" className={styles.timeline} role="region">
       <p className={styles.demoNote}>固定沙箱事件，不读取实时位置、天气或航班状态。</p>
+      <h2 className={styles.alternativesHeading}>备选方案</h2>
       {events.map((event) => (
         <article className={styles.event} key={event.id}>
           <div className={styles.eventHead}><WarningCircle aria-hidden size={22} weight="fill" /><div><p>RISK / {event.status.toUpperCase()}</p><h2>{event.title}</h2></div></div>
           <p>{event.description}</p><small>来源：{event.source} · 证据时间：{event.observedAt}</small>
-          <div className={styles.plans}>{event.plans.map((plan, index) => <article aria-label={`Plan ${String.fromCharCode(65 + index)}`} className={styles.plan} key={plan.id}><p>PLAN {String.fromCharCode(65 + index)}</p><h3>{plan.title}</h3><dl><div><dt>成本</dt><dd>{plan.cost}</dd></div><div><dt>耗时</dt><dd>{plan.duration}</dd></div><div><dt>风险</dt><dd>{plan.risk}</dd></div></dl><button onClick={() => selectGuardianPlan(tripId, { id: plan.id, title: plan.title })} type="button">选择{plan.title}方案</button></article>)}</div>
+          <div className={styles.plans}>{event.plans.map((plan, index) => <article aria-label={`Plan ${String.fromCharCode(65 + index)}`} className={styles.plan} key={plan.id}><p>PLAN {String.fromCharCode(65 + index)}</p><h3>{plan.title}</h3><dl><div><dt>成本</dt><dd>{plan.cost}</dd></div><div><dt>耗时</dt><dd>{plan.duration}</dd></div><div><dt>风险</dt><dd>{plan.risk}</dd></div></dl><button aria-label={`选择 Plan ${String.fromCharCode(65 + index)}：${plan.title}方案`} onClick={() => selectGuardianPlan(tripId, { id: plan.id, title: plan.title })} type="button">选择{plan.title}方案</button></article>)}</div>
         </article>
       ))}
       <p className={styles.status} role="status">方案已保存到本浏览器的旅行决策，未创建订单</p>
     </section>
   );
 }
diff --git a/src/features/home/hero.module.css b/src/features/home/hero.module.css
index 9916443..ba354b9 100644
--- a/src/features/home/hero.module.css
+++ b/src/features/home/hero.module.css
@@ -194,10 +194,14 @@
   .route {
     top: 438px;
   }
 
   .trustLine {
     max-width: calc(100% - 40px);
     text-align: center;
     font-size: 11px;
   }
 }
+
+@media (prefers-reduced-motion: reduce) {
+  .imageLayer { transform: none !important; }
+}
diff --git a/src/features/home/hero.tsx b/src/features/home/hero.tsx
index c3ab682..6ebb7a3 100644
--- a/src/features/home/hero.tsx
+++ b/src/features/home/hero.tsx
@@ -1,46 +1,45 @@
 'use client';
 
 import { MapPin, ShieldCheck } from '@phosphor-icons/react';
-import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
+import { motion, useScroll, useTransform } from 'motion/react';
 import Image from 'next/image';
 import { brandAssets } from '@/data/assets';
 import { SearchComposer } from './search-composer';
 import styles from './hero.module.css';
 
 export function Hero() {
-  const reduceMotion = useReducedMotion();
   const { scrollY } = useScroll();
   const imageY = useTransform(scrollY, [0, 820], [0, 44]);
 
   return (
     <section className={styles.hero} aria-labelledby="hero-title">
       <motion.div
         className={styles.imageLayer}
-        style={reduceMotion ? undefined : { y: imageY }}
+        style={{ y: imageY }}
       >
         <Image
           alt={brandAssets.hero.alt}
           className={styles.image}
           fill
           priority
           sizes="100vw"
           src={brandAssets.hero.src}
         />
       </motion.div>
       <div className={styles.scrim} aria-hidden />
 
       <motion.div
         animate={{ opacity: 1, y: 0 }}
         className={styles.copy}
-        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
-        transition={{ duration: reduceMotion ? 0 : 0.8, ease: 'easeOut' }}
+        initial={{ opacity: 0, y: 18 }}
+        transition={{ duration: 0.8, ease: 'easeOut' }}
       >
         <p className={styles.eyebrow}>XINGYU · TRAVEL WITH CLARITY</p>
         <h1 id="hero-title">
           把远方，<br />
           变成一段安心抵达的旅程
         </h1>
         <p className={styles.description}>
           真实比价，严选资源，行程守护
           <br />
           每一步，都有可靠的答案
diff --git a/src/features/home/search-composer.tsx b/src/features/home/search-composer.tsx
index ae4a7a3..e4aac4c 100644
--- a/src/features/home/search-composer.tsx
+++ b/src/features/home/search-composer.tsx
@@ -3,21 +3,21 @@
 import {
   AirplaneTilt,
   ArrowRight,
   Buildings,
   CalendarBlank,
   CaretDown,
   MapPin,
   Ticket,
   UsersThree,
 } from '@phosphor-icons/react';
-import { motion, useReducedMotion } from 'motion/react';
+import { motion } from 'motion/react';
 import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
 import type { ComparisonProductKind } from '@/domain/comparison/types';
 import styles from './search-composer.module.css';
 
 export type ProductKind = ComparisonProductKind;
 
 export type HomeSearch = {
   kind: ProductKind;
   destination: string;
   from: string;
@@ -84,21 +84,20 @@ export function navigateToComparison(
 export function SearchComposer({
   onSubmit,
   assignLocation,
 }: SearchComposerProps) {
   const [kind, setKind] = useState<ProductKind>('flight');
   const [destination, setDestination] = useState('大理');
   const [from, setFrom] = useState('2026-08-22');
   const [to, setTo] = useState('2026-08-27');
   const [travelers, setTravelers] = useState('2');
   const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
-  const reduceMotion = useReducedMotion();
   const labels = fieldLabels[kind];
 
   function selectAdjacentTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
     if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
     event.preventDefault();
 
     let nextIndex = index;
     if (event.key === 'ArrowRight') nextIndex = (index + 1) % kinds.length;
     if (event.key === 'ArrowLeft') nextIndex = (index - 1 + kinds.length) % kinds.length;
     if (event.key === 'Home') nextIndex = 0;
@@ -117,21 +116,21 @@ export function SearchComposer({
       from,
       to,
       travelers: Number(travelers),
     };
 
     if (onSubmit) onSubmit(search);
     else navigateToComparison(search, assignLocation);
   }
 
   return (
-    <form className={styles.composer} onSubmit={submitSearch}>
+    <form action="/compare" className={styles.composer} onSubmit={submitSearch}>
       <div className={styles.tabs} role="tablist" aria-label="比价类型">
         {kinds.map((item, index) => {
           const Icon = item.icon;
           const selected = kind === item.id;
           return (
             <button
               aria-controls="home-search-fields"
               aria-selected={selected}
               className={styles.tab}
               id={`search-tab-${item.id}`}
@@ -151,25 +150,26 @@ export function SearchComposer({
           );
         })}
       </div>
 
       <motion.div
         animate={{ opacity: 1, x: 0 }}
         aria-labelledby={`search-tab-${kind}`}
         className={styles.fields}
         data-kind={kind}
         id="home-search-fields"
-        initial={reduceMotion ? false : { opacity: 0.72, x: 10 }}
+        initial={{ opacity: 0.72, x: 10 }}
         key={kind}
         role="tabpanel"
-        transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
+        transition={{ duration: 0.2, ease: 'easeOut' }}
       >
+        <input name="kind" type="hidden" value={kind} />
         <label className={styles.destinationField}>
           <span>{labels.destination}</span>
           <span className={styles.controlRow}>
             <MapPin aria-hidden size={22} weight="light" />
             <input
               autoComplete="address-level2"
               name="destination"
               onChange={(event) => setDestination(event.target.value)}
               required
               type="text"
diff --git a/src/features/partners/partners.module.css b/src/features/partners/partners.module.css
index 4fb80aa..92a7f0e 100644
--- a/src/features/partners/partners.module.css
+++ b/src/features/partners/partners.module.css
@@ -1,64 +1,64 @@
 .page { width: min(100% - 48px, var(--content-max)); margin: 0 auto; padding: 122px 0 90px; }
 .hero { padding: 34px 42px 46px; color: #f4efe5; background: #1d2722; border-radius: 2px 28px 2px 2px; }
 .eyebrow, .sectionHeading, .cardTopline, .profileHeading, .profileMeta, .cardAction, .publishedNotice { display: flex; align-items: center; }
 .eyebrow { justify-content: space-between; padding-bottom: 26px; border-bottom: 1px solid rgb(255 255 255 / 17%); color: #cdbd98; font-size: 10px; font-weight: 700; letter-spacing: .17em; }
 .heroGrid { display: grid; grid-template-columns: 1.35fr .65fr; gap: 60px; align-items: end; padding-top: 45px; }
 .hero h1 { margin: 0; font-family: var(--font-display); font-size: clamp(46px, 6vw, 78px); font-weight: 500; letter-spacing: -.05em; line-height: 1.08; }
 .heroGrid > div > p { max-width: 620px; margin: 26px 0 0; color: rgb(244 239 229 / 68%); font-size: 14px; line-height: 1.9; }
 .hero aside { display: grid; gap: 10px; padding: 26px; color: #292f2a; background: #d8c99e; }
 .hero aside p { margin: 14px 0 0; font-size: 9px; font-weight: 800; letter-spacing: .16em; }
 .hero aside strong { font-family: var(--font-display); font-size: 19px; font-weight: 600; }
-.hero aside span { color: #59564d; font-size: 12px; line-height: 1.65; }
+.hero aside span { color: #555249; font-size: 12px; line-height: 1.65; }
 .notice, .publishedNotice { margin: 16px 0 0; padding: 12px 16px; background: #e8dfcb; font-size: 12px; }
 .publishedNotice { width: fit-content; gap: 8px; color: #3c5f49; }
 
 .intentForm { margin-top: 22px; padding: 38px 42px; background: #e8e1d5; border: 1px solid #d1c7b8; }
 .formHeading { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
-.formHeading p, .sectionHeading p { margin: 0 0 8px; color: #8a7651; font-size: 10px; font-weight: 800; letter-spacing: .16em; }
+.formHeading p, .sectionHeading p { margin: 0 0 8px; color: #695631; font-size: 10px; font-weight: 800; letter-spacing: .16em; }
 .formHeading h2, .sectionHeading h2 { margin: 0; font-family: var(--font-display); font-size: 28px; font-weight: 600; }
-.formHeading > span, .sectionHeading > span { color: #777067; font-size: 12px; }
+.formHeading > span, .sectionHeading > span { color: #665f57; font-size: 12px; }
 .formGrid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 15px; }
 .formGrid label { display: grid; min-width: 0; gap: 7px; color: #5d574f; font-size: 12px; }
 .formGrid label > span:first-child { font-weight: 700; }
 .formGrid input, .formGrid select { width: 100%; min-height: 43px; padding: 9px 11px; color: #25241f; background: #f8f4ec; border: 1px solid #c8bfb1; border-radius: 5px; }
 .formGrid input[aria-invalid="true"] { border-color: #9d3f38; }
 .formGrid label small, .formError { color: #983c35; font-size: 11px; }
 .wideField { grid-column: span 2; }
 .certificationField { display: flex !important; align-items: center; grid-column: span 2; gap: 10px !important; padding: 9px 12px; background: rgb(255 255 255 / 40%); border: 1px solid #c8bfb1; }
 .certificationField input { width: 17px; min-height: 17px; }
 .certificationField span { display: grid; gap: 3px; }
-.certificationField small { color: #777067 !important; font-weight: 400; }
+.certificationField small { color: #665f57 !important; font-weight: 400; }
 .primaryButton, .cardAction button, .cardAction a { display: inline-flex; min-height: 43px; align-items: center; justify-content: center; margin-top: 22px; padding: 10px 18px; color: white; background: #26362e; border: 0; border-radius: 5px; cursor: pointer; font-size: 13px; font-weight: 700; text-decoration: none; }
 .formError { margin: 14px 0 0; line-height: 1.6; }
 
 .candidateSection { padding-top: 70px; }
 .sectionHeading { align-items: end; justify-content: space-between; gap: 30px; margin-bottom: 26px; }
 .cardGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
 .partnerCard { min-width: 0; padding: 30px; background: #fffdf8; border: 1px solid #d6cec1; border-radius: 2px 22px 2px 2px; }
-.cardTopline { justify-content: space-between; color: #8c7956; font-size: 9px; font-weight: 800; letter-spacing: .15em; }
+.cardTopline { justify-content: space-between; color: #78623d; font-size: 9px; font-weight: 800; letter-spacing: .15em; }
 .verifiedPill { display: inline-flex; align-items: center; gap: 5px; padding: 6px 8px; color: #425e4a; background: #e3eadf; border-radius: 999px; letter-spacing: normal; }
 .profileHeading { gap: 14px; margin-top: 25px; }
 .monogram { display: grid; width: 58px; height: 58px; flex: none; place-items: center; color: #f7f2e8; background: #3b4a41; border-radius: 50%; font-family: var(--font-display); font-size: 24px; }
 .profileHeading h3 { margin: 0 0 5px; font-family: var(--font-display); font-size: 28px; font-weight: 600; }
-.profileHeading p { margin: 0; color: #746d63; font-size: 12px; }
+.profileHeading p { margin: 0; color: #665f57; font-size: 12px; }
 .profileHeading > strong { display: grid; margin-left: auto; text-align: right; }
 .profileHeading b { color: #7e6941; font-family: var(--font-display); font-size: 42px; font-weight: 500; line-height: .95; }
-.profileHeading small { margin-top: 5px; color: #998b72; font-size: 8px; letter-spacing: .14em; }
-.introduction { min-height: 48px; margin: 22px 0; color: #686158; font-size: 13px; line-height: 1.75; }
-.profileMeta { flex-wrap: wrap; gap: 8px 15px; color: #5f5951; font-size: 11px; }
+.profileHeading small { margin-top: 5px; color: #76664d; font-size: 8px; letter-spacing: .14em; }
+.introduction { min-height: 48px; margin: 22px 0; color: #5b554d; font-size: 13px; line-height: 1.75; }
+.profileMeta { flex-wrap: wrap; gap: 8px 15px; color: #59534b; font-size: 11px; }
 .profileMeta span { display: inline-flex; align-items: center; gap: 5px; }
 .reasonList { margin: 24px 0 0; padding: 0; list-style: none; border-top: 1px solid #ddd5ca; }
 .reasonList li { display: flex; gap: 13px; padding: 12px 0; border-bottom: 1px solid #e5ded4; font-size: 12px; }
-.reasonList li span { color: #99815a; font-size: 10px; font-weight: 800; }
-.scorePrompt { margin: 24px 0 0; padding: 20px; color: #777067; background: #f1ece3; font-size: 12px; line-height: 1.6; }
+.reasonList li span { color: #7d663f; font-size: 10px; font-weight: 800; }
+.scorePrompt { margin: 24px 0 0; padding: 20px; color: #655f56; background: #f1ece3; font-size: 12px; line-height: 1.6; }
 .cardAction { min-height: 66px; justify-content: space-between; gap: 12px; margin-top: 15px; }
-.cardAction > span { color: #6f685e; font-size: 12px; }
+.cardAction > span { color: #645d54; font-size: 12px; }
 .cardAction button, .cardAction a { margin: 0; }
 .cardAction .sandboxButton { color: #262820; background: #d6c597; }
 .emptyState { padding: 46px; text-align: center; background: #e8e1d5; }
 .emptyState h3 { margin: 0 0 10px; font-family: var(--font-display); font-size: 24px; }
-.emptyState p { margin: 0; color: #777067; }
+.emptyState p { margin: 0; color: #665f57; }
 .page :is(button, a, input, select):focus-visible { outline: 3px solid #b77c28; outline-offset: 3px; }
 
 @media (max-width: 920px) { .heroGrid { grid-template-columns: 1fr; } .formGrid { grid-template-columns: repeat(2, 1fr); } .cardGrid { grid-template-columns: 1fr; } }
 @media (max-width: 600px) { .page { width: min(100% - 24px, var(--content-max)); padding-top: 102px; } .hero, .intentForm { padding: 28px 22px; } .eyebrow span:last-child { display: none; } .hero h1 { font-size: 44px; } .formHeading, .sectionHeading { align-items: flex-start; flex-direction: column; } .formGrid { grid-template-columns: 1fr; } .wideField, .certificationField { grid-column: span 1; } .partnerCard { padding: 24px 20px; } .profileHeading { flex-wrap: wrap; } .profileHeading > strong { margin-left: 0; } .cardAction { align-items: stretch; flex-direction: column; } }
diff --git a/src/features/square/square.module.css b/src/features/square/square.module.css
index f2d88f6..d9138b1 100644
--- a/src/features/square/square.module.css
+++ b/src/features/square/square.module.css
@@ -1,17 +1,17 @@
 .squarePage,
 .detailPage { min-height: 100vh; padding: 136px max(32px, calc((100vw - var(--content-max)) / 2)) 72px; }
 
 .hero { max-width: 800px; padding: 44px 0 74px; }
 .hero p,
 .feedHeading > div > p,
-.drawerHeader p { margin: 0 0 12px; color: var(--sand); font-size: 12px; font-weight: 700; letter-spacing: .16em; }
+.drawerHeader p { margin: 0 0 12px; color: #72572f; font-size: 12px; font-weight: 700; letter-spacing: .16em; }
 .hero h1,
 .detailHeader h1 { max-width: 760px; margin: 0; font-family: var(--font-display); font-size: clamp(38px, 5.5vw, 72px); font-weight: 500; letter-spacing: -.045em; line-height: 1.1; }
 .hero span { display: block; margin-top: 21px; color: rgb(16 16 15 / 65%); font-size: 16px; line-height: 1.8; }
 .feedSection { border-top: 1px solid rgb(16 16 15 / 16%); padding-top: 28px; }
 .feedHeading { display: flex; justify-content: space-between; gap: 24px; align-items: start; margin-bottom: 32px; }
 .feedHeading h2 { margin: 0; font-family: var(--font-display); font-size: clamp(27px, 3vw, 40px); font-weight: 500; }
 
 .feedControls { display: flex; flex-wrap: wrap; justify-content: end; gap: 10px; align-items: start; }
 .modeButtons { display: flex; border: 1px solid rgb(16 16 15 / 18%); border-radius: 999px; overflow: hidden; }
 .modeButton,
@@ -63,21 +63,21 @@
 .detailLayout { display: grid; grid-template-columns: minmax(0, 1fr) 330px; gap: clamp(35px, 7vw, 110px); align-items: start; }
 .article { min-width: 0; }
 .lede { margin: 0 0 31px; font-family: var(--font-display); font-size: 23px; line-height: 1.7; }
 .mediaGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
 .mediaGrid img:first-child { grid-column: 1 / -1; aspect-ratio: 1.75; }
 .detailImage { width: 100%; height: 100%; max-height: 440px; border-radius: 10px; object-fit: cover; }
 .article > h2,
 .detailAside h2 { margin: 40px 0 16px; font-family: var(--font-display); font-size: 27px; font-weight: 500; }
 .itinerary { display: grid; gap: 20px; margin: 0; padding: 0; list-style: none; }
 .itinerary li { display: grid; grid-template-columns: 76px 1fr; gap: 17px; padding-top: 18px; border-top: 1px solid rgb(16 16 15 / 14%); }
-.itinerary li > span { color: var(--sand); font-size: 12px; font-weight: 700; letter-spacing: .08em; }
+.itinerary li > span { color: #72572f; font-size: 12px; font-weight: 700; letter-spacing: .08em; }
 .itinerary h3 { margin: 0; font-size: 17px; }
 .itinerary p { margin: 7px 0; color: rgb(16 16 15 / 68%); font-size: 14px; line-height: 1.6; }
 .itinerary small { display: flex; align-items: center; gap: 4px; color: #6d532a; }
 .detailAside { position: sticky; top: 108px; }
 .detailAside section { padding-bottom: 6px; }
 .detailAside h2 { margin-top: 0; font-size: 21px; }
 .locationCard,
 .productCard { margin-bottom: 10px; padding: 14px; border: 1px solid rgb(16 16 15 / 14%); border-radius: 10px; background: rgb(255 255 255 / 22%); }
 .locationCard { display: flex; gap: 9px; color: #6d532a; }
 .locationCard strong,
@@ -101,26 +101,26 @@
 .reviewDrawer { width: min(100%, 560px); min-height: 100%; padding: 28px; overflow-y: auto; background: var(--ivory); box-shadow: -16px 0 40px rgb(16 16 15 / 17%); }
 .drawerHeader { display: flex; justify-content: space-between; gap: 20px; align-items: start; }
 .drawerHeader h2 { margin: 0; font-family: var(--font-display); font-size: 30px; font-weight: 500; }
 .reviewDrawer > p { margin: 20px 0; color: rgb(16 16 15 / 68%); line-height: 1.6; }
 .draftSummary { display: grid; grid-template-columns: repeat(3, 1fr); margin: 0; border-top: 1px solid rgb(16 16 15 / 14%); border-bottom: 1px solid rgb(16 16 15 / 14%); }
 .draftSummary div { padding: 13px 9px; }
 .draftSummary dt { color: rgb(16 16 15 / 58%); font-size: 12px; }
 .draftSummary dd { margin: 5px 0 0; font-size: 15px; }
 .draftItems { display: grid; gap: 14px; margin: 23px 0; padding: 0; list-style: none; }
 .draftItems li { display: grid; grid-template-columns: 54px 1fr; gap: 10px; }
-.draftItems li > span { color: var(--sand); font-size: 11px; font-weight: 700; }
+.draftItems li > span { color: #72572f; font-size: 11px; font-weight: 700; }
 .draftItems strong { font-size: 14px; }
 .draftItems p { margin: 3px 0 0; color: rgb(16 16 15 / 62%); font-size: 12px; line-height: 1.5; }
 .confirmButton { width: 100%; padding: 14px; }
 .handoffPanel { width: min(100%, 690px); margin: 42px auto; padding: clamp(24px, 5vw, 52px); border: 1px solid rgb(16 16 15 / 14%); border-radius: var(--radius-panel); background: rgb(255 255 255 / 23%); }
-.handoffPanel > p { margin: 0 0 12px; color: var(--sand); font-size: 12px; font-weight: 700; letter-spacing: .16em; }
+.handoffPanel > p { margin: 0 0 12px; color: #72572f; font-size: 12px; font-weight: 700; letter-spacing: .16em; }
 .handoffPanel h1 { margin: 0; font-family: var(--font-display); font-size: clamp(30px, 4vw, 48px); font-weight: 500; line-height: 1.2; }
 .handoffPanel > span { display: block; margin: 17px 0 25px; color: rgb(16 16 15 / 65%); line-height: 1.7; }
 .handoffPanel > a { display: inline-block; padding: 11px 15px; border-radius: 8px; background: var(--pine); color: var(--ivory); text-decoration: none; }
 .handoffItems { display: grid; gap: 10px; margin: 22px 0; padding: 0; list-style: none; }
 .handoffItems li { padding-top: 10px; border-top: 1px solid rgb(16 16 15 / 13%); }
 .handoffItems strong,
 .handoffItems span { display: block; }
 .handoffItems span { margin-top: 4px; color: rgb(16 16 15 / 63%); font-size: 13px; line-height: 1.5; }
 
 button:focus-visible,
diff --git a/src/stores/partner-store.ts b/src/stores/partner-store.ts
index c7f0a74..0abff8f 100644
--- a/src/stores/partner-store.ts
+++ b/src/stores/partner-store.ts
@@ -287,23 +287,24 @@ function migrateV1PersistedState(state: unknown): PersistedPartnerState {
   });
 }
 
 function persistenceOptions(options: CreatePartnerStoreOptions = {}) {
   return {
     name: 'xingyu-partner-demo-v1', version: 2, skipHydration: true,
     partialize: (state: PartnerStoreState): PersistedPartnerState => ({
       intents: state.intents, matches: state.matches,
       visibleMatchIds: state.visibleMatchIds, blockedCandidateIds: state.blockedCandidateIds,
     }),
-    merge: (persistedState: unknown, current: PartnerStoreState): PartnerStoreState => ({
-      ...current, ...parsePersistedState(persistedState),
-    }),
+    merge: (persistedState: unknown, current: PartnerStoreState): PartnerStoreState => {
+      if (persistedState === undefined) return current;
+      return { ...current, ...parsePersistedState(persistedState) };
+    },
     migrate: (persistedState: unknown, version: number): PersistedPartnerState => {
       if (version !== 1) throw new Error(`PARTNER_UNSUPPORTED_PERSISTED_VERSION:${version}`);
       return migrateV1PersistedState(persistedState);
     },
     onRehydrateStorage: () => (_state: PartnerStoreState | undefined, error: unknown) => {
       if (error) options.onHydrationError?.(error);
     },
   };
 }
 
diff --git a/src/stores/profile-store.ts b/src/stores/profile-store.ts
index ff67f81..1da1ca3 100644
--- a/src/stores/profile-store.ts
+++ b/src/stores/profile-store.ts
@@ -85,20 +85,21 @@ function persistenceOptions(options: CreateProfileStoreOptions = {}) {
   return {
     name: 'xingyu-profile-demo-v1',
     version: 1,
     skipHydration: true,
     partialize: (state: ProfileState): PersistedProfileState => ({
       demoProfile: state.demoProfile,
       personalizedFeed: state.personalizedFeed,
       interestTags: state.interestTags,
     }),
     merge: (persistedState: unknown, currentState: ProfileState): ProfileState => {
+      if (persistedState === undefined) return currentState;
       try {
         return { ...currentState, ...parsePersistedProfile(persistedState) };
       } catch (error) {
         options.onHydrationError?.(error);
         return { ...currentState, ...failedClosedProfileState };
       }
     },
     onRehydrateStorage: () => (_state: ProfileState | undefined, error: unknown) => {
       if (error) options.onHydrationError?.(error);
     },
diff --git a/src/stores/trip-store.ts b/src/stores/trip-store.ts
index 30c2ef2..d1d0254 100644
--- a/src/stores/trip-store.ts
+++ b/src/stores/trip-store.ts
@@ -345,20 +345,21 @@ function persistenceOptions(options: CreateTripStoreOptions = {}) {
     partialize: (state: TripStoreState): PersistedTripState => ({
       trips: state.trips,
       partnerIntents: state.partnerIntents,
       guardianPlans: state.guardianPlans,
     }),
     migrate: (persistedState: unknown, version: number): PersistedTripState => {
       if (version !== 0) throw new Error(`TRIP_UNSUPPORTED_PERSISTED_VERSION:${version}`);
       return parsePersistedTripState(persistedState);
     },
     merge: (persistedState: unknown, currentState: TripStoreState): TripStoreState => {
+      if (persistedState === undefined) return currentState;
       const safeState = parsePersistedTripState(persistedState);
       return {
         ...currentState,
         trips: { ...safeState.trips, ...currentState.trips },
         partnerIntents: { ...safeState.partnerIntents, ...currentState.partnerIntents },
         guardianPlans: { ...safeState.guardianPlans, ...currentState.guardianPlans },
       };
     },
     onRehydrateStorage: () => (_state: TripStoreState | undefined, error: unknown) => {
       if (error) options.onHydrationError?.(error);
diff --git a/tests/component/risk-timeline.test.tsx b/tests/component/risk-timeline.test.tsx
index 09fb32b..b79f9dd 100644
--- a/tests/component/risk-timeline.test.tsx
+++ b/tests/component/risk-timeline.test.tsx
@@ -15,18 +15,18 @@ beforeEach(() => {
 describe('RiskTimeline', () => {
   it('makes demo risk freshness explicit and records a Plan A choice only in local trip decisions', async () => {
     const user = userEvent.setup();
     render(<RiskTimeline events={riskEventsForTrip('dali-slow-5d')} tripId="dali-slow-5d" />);
 
     const timeline = screen.getByRole('region', { name: '行程守护风险时间线' });
     expect(timeline).toHaveTextContent('固定沙箱事件');
     expect(timeline).toHaveTextContent('2026-08-16T09:00:00+08:00');
     expect(within(timeline).getAllByRole('article', { name: /Plan [ABC]/ })).toHaveLength(3);
 
-    await user.click(within(timeline).getByRole('button', { name: '选择调整苍山徒步为古城慢游方案' }));
+    await user.click(within(timeline).getByRole('button', { name: '选择 Plan A：调整苍山徒步为古城慢游方案' }));
     expect(screen.getByRole('status')).toHaveTextContent('方案已保存到本浏览器的旅行决策，未创建订单');
     expect(useTripStore.getState().guardianPlans['draft-dali-slow-5d']).toEqual({
       id: 'PLAN-A',
       title: '调整苍山徒步为古城慢游',
     });
   });
 });
diff --git a/tests/component/site-header.test.tsx b/tests/component/site-header.test.tsx
index a3dd12f..80ce3e1 100644
--- a/tests/component/site-header.test.tsx
+++ b/tests/component/site-header.test.tsx
@@ -21,21 +21,21 @@ it('renders usable primary navigation with the homepage marked current', () => {
   expect(screen.getByRole('link', { name: '灵感广场' })).toHaveAttribute(
     'href',
     '/square',
   );
   expect(screen.getByRole('link', { name: '寻找搭子' })).toHaveAttribute(
     'href',
     '/partners',
   );
   expect(screen.getByRole('link', { name: '行程守护' })).toHaveAttribute(
     'href',
-    '/guardian/demo',
+    '/guardian/dali-slow-5d',
   );
   expect(screen.getByRole('link', { name: '我的行程' })).toHaveAttribute(
     'href',
     '/trips/demo',
   );
 });
 
 it('marks only the matching route as current', () => {
   render(<SiteHeader activePath="/partners" />);
 
diff --git a/tests/e2e/accessibility.spec.ts b/tests/e2e/accessibility.spec.ts
new file mode 100644
index 0000000..9be07fe
--- /dev/null
+++ b/tests/e2e/accessibility.spec.ts
@@ -0,0 +1,84 @@
+import AxeBuilder from '@axe-core/playwright';
+import { expect, test } from '@playwright/test';
+
+const runtimeErrors = new WeakMap<import('@playwright/test').Page, string[]>();
+
+test.beforeEach(async ({ page }) => {
+  const errors: string[] = [];
+  runtimeErrors.set(page, errors);
+  page.on('console', (message) => {
+    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
+  });
+  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
+  page.on('response', (response) => {
+    if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`);
+  });
+});
+
+test.afterEach(async ({ page }) => {
+  expect(runtimeErrors.get(page)).toEqual([]);
+});
+
+const publicRoutes = [
+  '/',
+  '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
+  '/square',
+  '/partners',
+  '/assistant',
+  '/guardian/dali-slow-5d',
+] as const;
+
+for (const route of publicRoutes) {
+  test(`has no critical or serious axe violations on ${route}`, async ({ page }) => {
+    await page.goto(route);
+    const results = await new AxeBuilder({ page }).analyze();
+    expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([]);
+  });
+}
+
+test('search main path and search tabs work from the keyboard', async ({ page }) => {
+  await page.goto('/');
+  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
+  const flightTab = page.getByRole('tab', { name: '机票' });
+  await flightTab.focus();
+  await page.keyboard.press('ArrowRight');
+  await expect(page.getByRole('tab', { name: '酒店' })).toHaveAttribute('aria-selected', 'true');
+  await page.keyboard.press('Home');
+  await expect(flightTab).toHaveAttribute('aria-selected', 'true');
+
+  await page.keyboard.press('Tab');
+  await expect(page.getByRole('textbox', { name: '到达地' })).toBeFocused();
+  await page.keyboard.press('Control+A');
+  await page.keyboard.type('大理');
+  await page.getByRole('button', { name: '开始规划' }).focus();
+  await page.keyboard.press('Enter');
+  await expect(page).toHaveURL(/\/compare\?/);
+});
+
+test('filter dialog traps focus, closes with Escape, and restores its trigger', async ({ page }) => {
+  await page.goto('/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2');
+  const trigger = page.getByRole('button', { name: '筛选条件' });
+  await trigger.click();
+  const dialog = page.getByRole('dialog', { name: '筛选条件' });
+  await expect(dialog).toBeVisible();
+  await expect(page.getByRole('button', { name: '关闭筛选' })).toBeFocused();
+  await page.keyboard.press('Escape');
+  await expect(dialog).toBeHidden();
+  await expect(trigger).toBeFocused();
+});
+
+test('external quote confirmation remains in the local demo', async ({ page }) => {
+  await page.goto('/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2');
+  await page.getByRole('button', { name: /查看 .*演示报价/ }).first().click();
+  await expect(page.getByRole('dialog', { name: '前往外部供应商' })).toBeVisible();
+  await page.getByRole('button', { name: /确认前往外部页面/ }).click();
+  await expect(page).toHaveURL(/\/compare\?/);
+});
+
+test('reduced motion removes smooth scrolling and motion transitions', async ({ page }) => {
+  await page.emulateMedia({ reducedMotion: 'reduce' });
+  await page.goto('/');
+  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
+  const duration = await page.getByRole('tabpanel').evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
+  expect(duration).toBeLessThanOrEqual(0.00001);
+});
diff --git a/tests/e2e/core-journey.spec.ts b/tests/e2e/core-journey.spec.ts
new file mode 100644
index 0000000..3be7dc4
--- /dev/null
+++ b/tests/e2e/core-journey.spec.ts
@@ -0,0 +1,52 @@
+import { expect, test } from '@playwright/test';
+
+const unexpectedConsoleMessages = (page: import('@playwright/test').Page) => {
+  const messages: string[] = [];
+  page.on('console', (message) => {
+    if (message.type() === 'error') {
+      messages.push(`console.error: ${message.text()}`);
+    }
+  });
+  page.on('pageerror', (error) => messages.push(`pageerror: ${error.message}`));
+  page.on('response', (response) => {
+    if (response.status() >= 400) {
+      messages.push(`http ${response.status()}: ${response.url()}`);
+    }
+  });
+  return messages;
+};
+
+test.use({ viewport: { width: 1440, height: 1024 } });
+
+test('guide to guarded alternative plan through the public UI', async ({ page }) => {
+  const errors = unexpectedConsoleMessages(page);
+
+  await page.goto('/');
+  await page.getByRole('tab', { name: '机票' }).click();
+  await page.getByRole('textbox', { name: '到达地' }).fill('大理');
+  const quoteStream = page.waitForResponse((response) => response.url().includes('/api/v1/comparison/searches/') && response.url().endsWith('/events'));
+  await page.getByRole('button', { name: '开始规划' }).click();
+
+  await expect(page).toHaveURL(/\/compare\?/);
+  expect((await quoteStream).status()).toBe(200);
+  await expect(page.getByText('¥1,010 含税总价')).toBeVisible();
+
+  await page.getByRole('link', { name: '灵感广场' }).click();
+  await page.getByRole('link', { name: '把大理留给慢下来的人：5 天环洱海松弛路线', exact: true }).click();
+  await page.getByRole('button', { name: '转为行程' }).click();
+  await page.getByRole('button', { name: '确认并保存草稿' }).click();
+  await page.getByRole('button', { name: '发布搭子意愿' }).click();
+  await expect(page.getByRole('status')).toContainText('搭子意愿已保存到本浏览器');
+  await page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '寻找搭子' }).click();
+  await page.getByRole('button', { name: '发布匹配意愿' }).click();
+  await page.getByRole('button', { name: '愿意认识木雨' }).click();
+  await page.getByRole('button', { name: '模拟对方同意（沙箱）' }).click();
+  await page.getByRole('link', { name: '进入聊天' }).click();
+  await expect(page.getByText(/其他敏感信息/)).toBeVisible();
+
+  await page.getByRole('link', { name: /行程守护/ }).click();
+  await expect(page.getByRole('heading', { name: '备选方案' })).toBeVisible();
+  await page.getByRole('button', { name: /Plan A/ }).click();
+  await expect(page.getByText(/方案已保存到本浏览器/)).toBeVisible();
+  expect(errors).toEqual([]);
+});
diff --git a/tests/e2e/global-setup.ts b/tests/e2e/global-setup.ts
new file mode 100644
index 0000000..1df158b
--- /dev/null
+++ b/tests/e2e/global-setup.ts
@@ -0,0 +1,27 @@
+const baseUrl = 'http://127.0.0.1:4173';
+
+export default async function globalSetup() {
+  const input = {
+    destination: '大理',
+    kind: 'flight',
+    from: '2026-08-22',
+    to: '2026-08-27',
+    travelers: 2,
+  };
+
+  const create = await fetch(`${baseUrl}/api/v1/comparison/searches`, {
+    method: 'POST',
+    headers: { 'content-type': 'application/json' },
+    body: JSON.stringify(input),
+  });
+  if (create.status !== 202) {
+    throw new Error(`comparison API warm-up failed with ${create.status}`);
+  }
+
+  const { search_id: searchId } = (await create.json()) as { search_id: string };
+  const events = await fetch(`${baseUrl}/api/v1/comparison/searches/${searchId}/events`);
+  if (!events.ok) {
+    throw new Error(`comparison SSE warm-up failed with ${events.status}`);
+  }
+  await events.text();
+}
diff --git a/tests/e2e/responsive.spec.ts b/tests/e2e/responsive.spec.ts
new file mode 100644
index 0000000..e57750b
--- /dev/null
+++ b/tests/e2e/responsive.spec.ts
@@ -0,0 +1,49 @@
+import { expect, test } from '@playwright/test';
+
+const runtimeErrors = new WeakMap<import('@playwright/test').Page, string[]>();
+
+test.beforeEach(async ({ page }) => {
+  const errors: string[] = [];
+  runtimeErrors.set(page, errors);
+  page.on('console', (message) => {
+    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
+  });
+  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
+  page.on('response', (response) => {
+    if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`);
+  });
+});
+
+test.afterEach(async ({ page }) => {
+  expect(runtimeErrors.get(page)).toEqual([]);
+});
+
+test.describe('mobile public MVP', () => {
+  test.use({ viewport: { width: 390, height: 844 } });
+
+  test('mobile navigation is available without horizontal overflow', async ({ page }) => {
+    await page.goto('/');
+    await expect(page.getByRole('button', { name: '打开导航' })).toBeVisible();
+    await page.getByRole('button', { name: '打开导航' }).click();
+    await expect(page.getByRole('navigation', { name: '主导航' }).getByRole('link', { name: '真实比价' })).toBeVisible();
+
+    const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
+    expect(width.body).toBeLessThanOrEqual(width.viewport);
+  });
+
+  for (const route of [
+    '/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2',
+    '/square',
+    '/trips/dali-slow-5d',
+    '/partners',
+    '/assistant',
+    '/guardian/dali-slow-5d',
+  ]) {
+    test(`does not horizontally overflow on ${route}`, async ({ page }) => {
+      await page.goto(route);
+      await expect(page.locator('main')).toBeVisible();
+      const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
+      expect(width.body).toBeLessThanOrEqual(width.viewport);
+    });
+  }
+});
diff --git a/vitest.config.ts b/vitest.config.ts
index 7422934..31795a0 100644
--- a/vitest.config.ts
+++ b/vitest.config.ts
@@ -1,9 +1,13 @@
 import path from 'node:path';
 import react from '@vitejs/plugin-react';
-import { defineConfig } from 'vitest/config';
+import { configDefaults, defineConfig } from 'vitest/config';
 
 export default defineConfig({
   plugins: [react()],
-  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
+  test: {
+    environment: 'jsdom',
+    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
+    setupFiles: ['./src/test/setup.ts'],
+  },
   resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
 });
