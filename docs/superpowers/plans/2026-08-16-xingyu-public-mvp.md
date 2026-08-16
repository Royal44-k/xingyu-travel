# 行屿公开 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建并发布一个可公开访问的行屿国内自由行产品级 MVP，完整跑通“搜索比价 → 攻略转行程 → 搭子匹配与聊天 → 行程守护 → AI 备选方案”。

**Architecture:** 使用单个 Next.js 16.2 App Router 应用承载页面与 `/api/v1` Route Handlers；纯 TypeScript 领域层负责报价、匹配、行程和 AI 结构规则，页面只依赖适配器接口。公开版本默认使用确定性的沙箱适配器和浏览器持久化，外部 OTA、PostgreSQL、Qwen、身份核验与实时服务通过环境开关替换。

**Tech Stack:** Node.js 24 LTS、Next.js 16.2、React、TypeScript strict、pnpm、CSS Modules、Motion、Zod、Zustand、Phosphor Icons、Vitest、Testing Library、Playwright、axe-core、Vercel。

## Global Constraints

- 视觉真值固定为 `docs/design/selected-homepage-option-1.png`，1440×1024 首页需匹配其构图、层级、色彩和影像气质。
- 产品面向 18–35 岁国内自由行用户；搭子发布、匹配和聊天仅允许演示账户中标记为 18+ 且“已实名”的状态。
- 首版不接受真实身份证、精确位置、支付信息或外部联系方式，不实现站内支付、出票、退款和自动改签。
- 比价必须展示含税总价、条件差异、数据更新时间和演示供应商来源，不按不可比裸价误导排序。
- AI 结果必须包含 `risk_level`、`answer`、`alternatives[]`、`evidence[]`、`data_freshness`、`requires_human_help` 和 `demo_mode`。
- 高风险事件优先显示 110、120、119 和官方渠道提示；任何流程不得自动下单或承诺官方救援。
- 所有可见图片使用生成资产或允许使用的资源；禁止复制丽思卡尔顿或万豪的 Logo、照片和商业文案。
- 可见 UI 不使用手绘 SVG、CSS 图形、emoji 或占位框替代图像与图标；标准 UI 图标使用 `@phosphor-icons/react`。
- 所有主要交互支持键盘，正文对比度至少 4.5:1，并尊重 `prefers-reduced-motion`。
- 生产构建必须在 Vercel READY，公开 URL 可在未登录窗口打开；任何密钥只能进入 Vercel 加密环境变量。

---

## File Map

```text
src/
├─ app/
│  ├─ api/v1/                    # 比价、AI、守护的 Route Handlers
│  ├─ assistant/                 # AI 助手
│  ├─ chat/[matchId]/            # 模拟站内聊天
│  ├─ compare/                   # 统一比价
│  ├─ guardian/[tripId]/         # 风险事件与备选方案
│  ├─ partners/                  # 搭子意愿与匹配
│  ├─ profile/                   # 偏好、收藏、隐私状态
│  ├─ square/[slug]/             # 攻略详情
│  ├─ square/                    # 攻略广场
│  ├─ trips/[id]/                # 行程工作台
│  ├─ error.tsx
│  ├─ global-error.tsx
│  ├─ globals.css
│  ├─ layout.tsx
│  ├─ not-found.tsx
│  └─ page.tsx
├─ adapters/                     # mock 与生产适配器
├─ components/                   # 品牌、布局、反馈和安全组件
├─ domain/                       # 无 React 依赖的领域规则
├─ features/                     # 按产品能力组织的客户端组件
├─ data/                         # 稳定沙箱数据
├─ lib/                          # 请求、格式化、字体和环境配置
└─ stores/                       # Zustand 演示状态
public/assets/                   # Image Gen 生成资产
tests/
├─ unit/
├─ component/
└─ e2e/
```

## Canonical Interfaces

以下类型在 Task 2 中一次性创建，后续任务不得改名或另造同义字段。所有金额均为人民币整数元，所有时间均为带时区的 ISO 8601 字符串。

```ts
export type ProductKind = 'flight' | 'hotel' | 'ticket';

export interface ComparisonSearchInput {
  kind: ProductKind;
  origin?: string;
  destination: string;
  from: string;
  to: string;
  travelers: number;
}

export interface RawOffer {
  id: string;
  provider: string;
  kind: ProductKind;
  basePrice: number;
  taxes: number;
  mandatoryFees: number;
  baggageIncluded?: boolean;
  refundable: boolean;
  updatedAt: string;
}

export interface NormalizedOffer extends RawOffer {
  totalPrice: number;
  priceExplanation: string;
  freshness: 'fresh' | 'aging' | 'expired';
  providerTrust: 'verified' | 'standard' | 'new';
}

export type QuoteEvent =
  | { type: 'offer'; payload: NormalizedOffer }
  | { type: 'degraded'; payload: { provider: string; message: string } }
  | { type: 'complete'; payload: { count: number } };

export interface MatchSignals {
  destination: string;
  dateOverlap: number;
  budgetFit: number;
  paceFit: number;
  interestFit: number;
  routeFit: number;
  lodgingFit: number;
  scheduleFit: number;
  socialFit: number;
}

export interface MatchCandidate { id: string; displayName: string }
export interface MatchReason { key: string; points: number }
export interface MatchResult { candidate: MatchCandidate; score: number; reasons: MatchReason[] }

export type TripStatus = 'review' | 'active' | 'guarded' | 'discarded' | 'archived';
export interface ItineraryItem { id: string; day: number; title: string; place: string; estimatedCost: number }
export interface TripDraft {
  id: string;
  destination: string;
  days: number;
  budget: number;
  items: ItineraryItem[];
  sourcePostSlug: string;
  status: TripStatus;
}

export interface TravelPost {
  slug: string;
  destination: string;
  days: number;
  budget: number;
  itinerary: Omit<ItineraryItem, 'id'>[];
}

export interface AssistantRequest { message: string; tripId?: string }
export interface AlternativePlan {
  id: string;
  title: string;
  cost: string;
  duration: string;
  risk: string;
  actions: string[];
}
export interface AssistantEvidence { source: string; observed_at: string; url?: string }
export interface AssistantResponse {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  answer: string;
  alternatives: AlternativePlan[];
  evidence: AssistantEvidence[];
  data_freshness: string;
  requires_human_help: boolean;
  demo_mode: boolean;
}

export interface PartnerProfile { age: number; identityVerified: boolean; riskStatus: 'clear' | 'review' | 'blocked' }
export type EligibilityResult = { allowed: true } | { allowed: false; code: 'AGE_RESTRICTED' | 'IDENTITY_REQUIRED' | 'RISK_RESTRICTED' };
export interface ChatMessage { id: string; matchId: string; senderId: string; body: string; sentAt: string }
export interface TripRiskEvent { id: string; tripId: string; kind: 'flight' | 'weather' | 'attraction'; severity: 'medium' | 'high' | 'critical'; observedAt: string; summary: string }

export declare function createRequestId(): string;
export declare function stableSearchId(input: ComparisonSearchInput): string;
export declare function readSearchForm(form: HTMLFormElement, kind: ProductKind): ComparisonSearchInput;
export declare function navigateToComparison(input: ComparisonSearchInput): void;
```

## Task 1: Next.js 基础、质量门槛与品牌令牌

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `tests/component/home-shell.test.tsx`
- Create: `.env.example`
- Create: `.gitignore`

**Interfaces:**
- Consumes: `docs/superpowers/specs/2026-08-16-xingyu-web-design.md` 的令牌和品牌文案。
- Produces: `RootLayout`、全局 CSS 令牌、`pnpm test`、`pnpm test:e2e`、`pnpm build`。

- [ ] **Step 1: 写品牌壳层失败测试**

```tsx
// tests/component/home-shell.test.tsx
import { render, screen } from '@testing-library/react';
import HomePage from '@/app/page';

it('renders the Xingyu brand promise', () => {
  render(<HomePage />);
  expect(screen.getByRole('heading', {
    name: '把远方，变成一段安心抵达的旅程',
  })).toBeInTheDocument();
});
```

- [ ] **Step 2: 初始化依赖并验证测试先失败**

Run:

```powershell
pnpm init
pnpm add next@16.2 react react-dom motion zod zustand @phosphor-icons/react clsx
pnpm add -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @axe-core/playwright
pnpm vitest run tests/component/home-shell.test.tsx
```

Expected: FAIL，因为 `src/app/page.tsx` 尚未提供目标标题。

- [ ] **Step 3: 建立脚本与测试环境**

```json
{
  "name": "xingyu-travel",
  "private": true,
  "packageManager": "pnpm@10",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "verify": "pnpm lint && pnpm typecheck && pnpm test && pnpm build"
  }
}
```

```ts
// vitest.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

```ts
// next.config.ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { poweredByHeader: false };
export default nextConfig;
```

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  webServer: { command: 'pnpm dev -- --hostname 0.0.0.0 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: true },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

```ts
// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([...nextVitals, ...nextTs, globalIgnores(['.next/**', 'artifacts/**'])]);
```

```ts
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: 建立根布局、首页最小实现和设计令牌**

```tsx
// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';
import './globals.css';

const sans = Noto_Sans_SC({ subsets: ['latin'], display: 'swap', variable: '--font-noto-sans-sc' });
const serif = Noto_Serif_SC({ subsets: ['latin'], display: 'swap', variable: '--font-noto-serif-sc', weight: ['400', '500', '600'] });

export const metadata: Metadata = {
  title: { default: '行屿 XINGYU', template: '%s | 行屿 XINGYU' },
  description: '透明比价、可信搭子、攻略转行程与主动式旅行守护。',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="zh-CN" className={`${sans.variable} ${serif.variable}`}><body>{children}</body></html>;
}
```

```css
/* src/app/globals.css */
:root {
  --ink: #10100f;
  --ivory: #f4f0e8;
  --sand: #b79a68;
  --mist: #d8d3ca;
  --pine: #26312b;
  --font-display: var(--font-noto-serif-sc), "Songti SC", serif;
  --font-ui: var(--font-noto-sans-sc), "PingFang SC", sans-serif;
  --content-max: 1320px;
  --radius-control: 10px;
  --radius-panel: 18px;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; color: var(--ink); background: var(--ivory); font-family: var(--font-ui); }
button, input, select, textarea { font: inherit; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 5: 运行基础质量门槛**

Run: `pnpm test && pnpm typecheck && pnpm lint`

Expected: PASS。

- [ ] **Step 6: 提交基础工程**

```powershell
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts eslint.config.mjs vitest.config.ts playwright.config.ts .env.example .gitignore src tests
git commit -m "chore: initialize xingyu next app"
```

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
  expect(result.score).toBe(91);
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

## Task 3: 生成并登记品牌影像资产

**Files:**
- Create: `public/assets/hero-dali-dawn.png`
- Create: `public/assets/destination-sichuan.png`
- Create: `public/assets/destination-guilin.png`
- Create: `public/assets/guide-dali-courtyard.png`
- Create: `public/assets/guardian-rainy-mountain.png`
- Create: `src/data/assets.ts`
- Create: `tests/unit/assets.test.ts`
- Create: `public/assets/ASSET-LICENSES.md`

**Interfaces:**
- Produces: `brandAssets` 静态映射，供所有 `next/image` 组件使用。
- Consumes: 选定视觉图和五个明确槽位尺寸。

- [ ] **Step 1: 写资产完整性失败测试**

```ts
// tests/unit/assets.test.ts
import { stat } from 'node:fs/promises';
import { brandAssets } from '@/data/assets';

it('ships every visible branded image as a real local asset', async () => {
  for (const asset of Object.values(brandAssets)) {
    const info = await stat(`public${asset.src}`);
    expect(info.size).toBeGreaterThan(20_000);
    expect(asset.alt.length).toBeGreaterThan(6);
  }
});
```

- [ ] **Step 2: 使用 Image Gen 分别生成五张独立图片**

每次调用只生成一张并保存到上方固定路径。统一艺术指导：真实摄影、暖金晨光、低饱和黑金调、中国目的地、无文字、无 Logo、无水印。

```text
Hero: 2400×1600，大理高山与湖泊日出，河谷形成自然引导线，左侧保留深色负空间供白色标题，摄影写实。
Sichuan: 1600×1000，川西雪山高原与秋草，低机位编辑旅行摄影，人物不可辨识。
Guilin: 1600×1000，桂林喀斯特山水与竹筏暮色，深色前景、暖色天光。
Dali guide: 1400×1000，大理白族院落、植物与石桌，生活化自然光，不出现商业标识。
Guardian: 1600×1000，山路雨幕与远处云层，保持安全距离，无灾难猎奇画面。
```

- [ ] **Step 3: 登记尺寸、alt 和用途**

```ts
// src/data/assets.ts
export const brandAssets = {
  hero: { src: '/assets/hero-dali-dawn.png', width: 2400, height: 1600, alt: '晨光穿过大理群山与湖谷' },
  sichuan: { src: '/assets/destination-sichuan.png', width: 1600, height: 1000, alt: '秋日川西雪山高原' },
  guilin: { src: '/assets/destination-guilin.png', width: 1600, height: 1000, alt: '暮色中的桂林山水' },
  guide: { src: '/assets/guide-dali-courtyard.png', width: 1400, height: 1000, alt: '大理白族院落里的慢旅行片刻' },
  guardian: { src: '/assets/guardian-rainy-mountain.png', width: 1600, height: 1000, alt: '雨幕中的高原山路' },
} as const;
```

- [ ] **Step 4: 验证真实资产并提交**

Run: `pnpm vitest run tests/unit/assets.test.ts`

Expected: PASS。

```powershell
git add public/assets src/data/assets.ts tests/unit/assets.test.ts
git commit -m "feat: add original xingyu destination imagery"
```

## Task 4: 沉浸式首页与统一搜索入口

**Files:**
- Create: `src/components/site-header.tsx`
- Create: `src/components/site-header.module.css`
- Create: `src/features/home/hero.tsx`
- Create: `src/features/home/hero.module.css`
- Create: `src/features/home/search-composer.tsx`
- Create: `src/features/home/search-composer.module.css`
- Create: `src/features/home/featured-destinations.tsx`
- Modify: `src/app/page.tsx`
- Create: `tests/component/search-composer.test.tsx`
- Create: `tests/component/site-header.test.tsx`

**Interfaces:**
- Produces: `SearchComposer`，提交后导航至 `/compare?kind=flight&destination=大理&from=2026-08-22&to=2026-08-27&travelers=2`。
- Consumes: `brandAssets` 和全局令牌。

- [ ] **Step 1: 写标签切换与提交失败测试**

```tsx
it('changes fields by product kind and submits a comparable search', async () => {
  render(<SearchComposer onSubmit={onSubmit} />);
  await user.click(screen.getByRole('tab', { name: '酒店' }));
  expect(screen.getByLabelText('入住地')).toBeInTheDocument();
  await user.type(screen.getByLabelText('入住地'), '大理');
  await user.click(screen.getByRole('button', { name: '开始规划' }));
  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'hotel', destination: '大理' }));
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run tests/component/search-composer.test.tsx`

Expected: FAIL，因为组件不存在。

- [ ] **Step 3: 实现可访问的搜索组件**

```tsx
'use client';
const kinds = [
  { id: 'flight', label: '机票' },
  { id: 'hotel', label: '酒店' },
  { id: 'ticket', label: '门票' },
] as const;

export function SearchComposer({ onSubmit = navigateToComparison }: Props) {
  const [kind, setKind] = useState<ProductKind>('flight');
  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(readSearchForm(event.currentTarget, kind)); }}>
      <div role="tablist" aria-label="比价类型">
        {kinds.map((item) => <button key={item.id} role="tab" aria-selected={kind === item.id} onClick={() => setKind(item.id)} type="button">{item.label}</button>)}
      </div>
      <SearchFields kind={kind} />
      <button type="submit">开始规划</button>
    </form>
  );
}
```

- [ ] **Step 4: 按视觉真值实现 Hero、导航和目的地带**

```tsx
// src/features/home/hero.tsx
<section className={styles.hero} aria-labelledby="hero-title">
  <Image src={brandAssets.hero.src} alt={brandAssets.hero.alt} fill priority sizes="100vw" className={styles.image} />
  <div className={styles.scrim} />
  <div className={styles.copy}>
    <h1 id="hero-title">把远方，<br />变成一段安心抵达的旅程</h1>
    <p>真实比价，严选资源，行程守护<br />每一步，都有可靠的答案</p>
  </div>
  <SearchComposer />
</section>
```

CSS 使用 `min-height: 820px`、Hero 左边距 `clamp(24px, 7.5vw, 112px)`、搜索台底部距视口 90px；移动端将搜索字段改为纵向并取消视差。

- [ ] **Step 5: 验证首页与提交**

Run: `pnpm vitest run tests/component/search-composer.test.tsx tests/component/site-header.test.tsx && pnpm typecheck`

Expected: PASS。

```powershell
git add src/app src/components src/features/home tests/component
git commit -m "feat: build immersive xingyu home search"
```

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

## Task 6: 攻略广场与攻略转行程

**Files:**
- Create: `src/data/posts.ts`
- Create: `src/domain/trips/extract-draft.ts`
- Create: `src/app/square/page.tsx`
- Create: `src/app/square/[slug]/page.tsx`
- Create: `src/features/square/feed-controls.tsx`
- Create: `src/features/square/post-card.tsx`
- Create: `src/features/square/convert-to-trip.tsx`
- Create: `src/features/square/square.module.css`
- Create: `tests/unit/extract-trip-draft.test.ts`
- Create: `tests/component/square-feed.test.tsx`

**Interfaces:**
- Produces: `extractTripDraft(post): TripDraft` 和 `/trips/dali-slow-5d` 草稿。
- Feed 支持 `recommended | chronological`，并显示推荐关闭与兴趣偏好清除入口。

- [ ] **Step 1: 写抽取和非个性化 Feed 失败测试**

```ts
it('extracts a reviewable itinerary draft from a guide', () => {
  const draft = extractTripDraft(postsBySlug['dali-slow-5d']);
  expect(draft).toMatchObject({ destination: '大理', days: 5, budget: 5200 });
  expect(draft.items).toHaveLength(5);
  expect(draft.status).toBe('review');
});
```

```tsx
it('lets users switch off recommendations', async () => {
  render(<FeedControls mode="recommended" onModeChange={change} />);
  await user.click(screen.getByRole('button', { name: '按时间排序' }));
  expect(change).toHaveBeenCalledWith('chronological');
});
```

- [ ] **Step 2: 运行失败测试并实现纯领域抽取**

Run: `pnpm vitest run tests/unit/extract-trip-draft.test.ts tests/component/square-feed.test.tsx`

Expected: FAIL 后实现：

```ts
export function extractTripDraft(post: TravelPost): TripDraft {
  return {
    id: `draft-${post.slug}`,
    destination: post.destination,
    days: post.days,
    budget: post.budget,
    items: post.itinerary.map((item, index) => ({ ...item, id: `${post.slug}-${index + 1}` })),
    sourcePostSlug: post.slug,
    status: 'review',
  };
}
```

- [ ] **Step 3: 实现广场和详情页**

广场使用编辑式瀑布布局但维持 DOM 阅读顺序；卡片包含图片、地点、作者、收藏和举报入口。详情页最多展示九图位、地点节点、商品卡和 AI 内容标签；“转为行程”先打开审核抽屉，确认后写入 `tripStore` 并导航。

- [ ] **Step 4: 验证和提交**

Run: `pnpm vitest run tests/unit/extract-trip-draft.test.ts tests/component/square-feed.test.tsx && pnpm typecheck`

Expected: PASS。

```powershell
git add src/app/square src/features/square src/domain/trips src/data/posts.ts tests
git commit -m "feat: add guide square and trip conversion"
```

## Task 7: 行程工作台与同行决策室

**Files:**
- Create: `src/stores/trip-store.ts`
- Create: `src/app/trips/[id]/page.tsx`
- Create: `src/features/trips/trip-workbench.tsx`
- Create: `src/features/trips/itinerary-editor.tsx`
- Create: `src/features/trips/decision-room.tsx`
- Create: `src/features/trips/trips.module.css`
- Create: `tests/unit/trip-store.test.ts`
- Create: `tests/component/trip-workbench.test.tsx`

**Interfaces:**
- Produces: `useTripStore`，支持 `acceptDraft`、`updateItem`、`reorderItem`、`vote`、`enableGuardian`。
- Persists: 仅将非敏感演示状态写入 `localStorage` key `xingyu-demo-v1`。

- [ ] **Step 1: 写状态转移失败测试**

```ts
it('accepts a reviewed draft and enables guardian only after consent', () => {
  const store = createTripStore();
  store.getState().acceptDraft(daliDraft);
  expect(store.getState().trips[daliDraft.id].status).toBe('active');
  store.getState().enableGuardian(daliDraft.id, true);
  expect(store.getState().trips[daliDraft.id].guardianEnabled).toBe(true);
});
```

- [ ] **Step 2: 实现 store 与显式状态机**

```ts
const allowedTransitions: Record<TripStatus, TripStatus[]> = {
  review: ['active', 'discarded'], active: ['guarded', 'archived'], guarded: ['active', 'archived'], discarded: [], archived: [],
};
export function transitionTrip(status: TripStatus, next: TripStatus): TripStatus {
  if (!allowedTransitions[status].includes(next)) throw new Error(`TRIP_INVALID_TRANSITION:${status}:${next}`);
  return next;
}
```

- [ ] **Step 3: 实现行程编辑与决策室**

工作台必须支持改日期/预算、重新排序五个节点、标记备选、三位演示成员投票、预算合计、进入比价、发布搭子意愿和守护授权。位置只到城市/景点，不出现实时坐标。

- [ ] **Step 4: 验证和提交**

Run: `pnpm vitest run tests/unit/trip-store.test.ts tests/component/trip-workbench.test.tsx`

Expected: PASS。

```powershell
git add src/app/trips src/features/trips src/stores/trip-store.ts tests
git commit -m "feat: add itinerary workbench and decision room"
```

## Task 8: 可信搭子匹配、双向同意与模拟聊天

**Files:**
- Create: `src/data/partners.ts`
- Create: `src/stores/partner-store.ts`
- Create: `src/app/partners/page.tsx`
- Create: `src/app/chat/[matchId]/page.tsx`
- Create: `src/features/partners/intent-form.tsx`
- Create: `src/features/partners/match-list.tsx`
- Create: `src/features/chat/chat-room.tsx`
- Create: `src/components/safety-consent.tsx`
- Create: `tests/unit/partner-eligibility.test.ts`
- Create: `tests/component/partner-flow.test.tsx`

**Interfaces:**
- Produces: `isPartnerEligible(profile): EligibilityResult` 和 `partnerStore`。
- Gate: `age >= 18 && identityVerified && riskStatus === 'clear'`。

- [ ] **Step 1: 写未成年人、未实名和匹配解释失败测试**

```ts
it.each([
  [{ age: 17, identityVerified: true, riskStatus: 'clear' }, 'AGE_RESTRICTED'],
  [{ age: 24, identityVerified: false, riskStatus: 'clear' }, 'IDENTITY_REQUIRED'],
])('blocks ineligible partner actions', (profile, code) => {
  expect(isPartnerEligible(profile)).toEqual({ allowed: false, code });
});
```

- [ ] **Step 2: 实现硬过滤和用户可理解的前三项理由**

```ts
export function isPartnerEligible(profile: PartnerProfile): EligibilityResult {
  if (profile.age < 18) return { allowed: false, code: 'AGE_RESTRICTED' };
  if (!profile.identityVerified) return { allowed: false, code: 'IDENTITY_REQUIRED' };
  if (profile.riskStatus !== 'clear') return { allowed: false, code: 'RISK_RESTRICTED' };
  return { allowed: true };
}
```

- [ ] **Step 3: 实现主交互**

意愿表包含目的地、日期、预算、节奏、兴趣、路线、住宿边界、作息和社交偏好。匹配卡显示三项理由；点击“愿意认识”后进入 `pending_mutual`，演示对方确认后才出现聊天入口。聊天页包含举报、拉黑、可信联系人、行程分享和平安签到；联系方式输入被本地正则拦截并说明需双方确认。

- [ ] **Step 4: 验证和提交**

Run: `pnpm vitest run tests/unit/partner-eligibility.test.ts tests/unit/score-match.test.ts tests/component/partner-flow.test.tsx`

Expected: PASS。

```powershell
git add src/app/partners src/app/chat src/features/partners src/features/chat src/components/safety-consent.tsx src/stores/partner-store.ts src/data/partners.ts tests
git commit -m "feat: add explainable safe partner matching"
```

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

## Task 10: 账户偏好、透明度、安全反馈与全局错误

**Files:**
- Create: `src/app/profile/page.tsx`
- Create: `src/features/profile/preference-settings.tsx`
- Create: `src/stores/profile-store.ts`
- Create: `src/components/demo-banner.tsx`
- Create: `src/components/report-dialog.tsx`
- Create: `src/components/external-booking-dialog.tsx`
- Create: `src/app/error.tsx`
- Create: `src/app/global-error.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/app/manifest.ts`
- Create: `src/app/api/v1/health/route.ts`
- Modify: `next.config.ts`
- Create: `tests/component/preference-settings.test.tsx`
- Create: `tests/unit/security-headers.test.ts`

**Interfaces:**
- Produces: 推荐开关、兴趣标签删除、演示身份状态、统一错误/举报/外跳体验。

- [ ] **Step 1: 写推荐关闭和安全响应头失败测试**

```tsx
it('clears interest labels and disables personalized recommendations', async () => {
  render(<PreferenceSettings />);
  await user.click(screen.getByRole('switch', { name: '个性化推荐' }));
  await user.click(screen.getByRole('button', { name: '清除兴趣标签' }));
  expect(screen.getByText('当前使用按时间排序')).toBeInTheDocument();
});
```

- [ ] **Step 2: 实现 profileStore 与反馈组件**

```ts
export const useProfileStore = create<ProfileState>()(persist(
  (set) => ({
    demoProfile: { age: 26, identityVerified: true, riskStatus: 'clear' },
    personalizedFeed: true,
    interestTags: ['山野', '人文', '慢旅行'],
    setPersonalizedFeed: (value) => set({ personalizedFeed: value }),
    clearInterestTags: () => set({ interestTags: [] }),
  }),
  { name: 'xingyu-profile-demo-v1' },
));
```

- [ ] **Step 3: 配置响应头、SEO 和错误边界**

```ts
// next.config.ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
];
export default { async headers() { return [{ source: '/(.*)', headers: securityHeaders }]; } };
```

- [ ] **Step 4: 验证和提交**

Run: `pnpm vitest run tests/component/preference-settings.test.tsx tests/unit/security-headers.test.ts && pnpm typecheck`

Expected: PASS。

```powershell
git add src/app/profile src/features/profile src/stores/profile-store.ts src/components src/app/error.tsx src/app/global-error.tsx src/app/not-found.tsx src/app/robots.ts src/app/sitemap.ts src/app/manifest.ts src/app/api/v1/health next.config.ts tests
git commit -m "feat: add privacy controls and production safeguards"
```

## Task 11: 完整旅程 E2E、响应式与可访问性

**Files:**
- Create: `tests/e2e/core-journey.spec.ts`
- Create: `tests/e2e/responsive.spec.ts`
- Create: `tests/e2e/accessibility.spec.ts`
- Modify: `playwright.config.ts`
- Modify: affected CSS Modules and components from Tasks 4–10

**Interfaces:**
- Consumes: 所有公共页面和主链路。
- Produces: 可重复的桌面、移动端和可访问性验收。

- [ ] **Step 1: 写完整旅程失败测试**

```ts
test('guide to guarded alternative plan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: '机票' }).click();
  await page.getByLabel('目的地').fill('大理');
  await page.getByRole('button', { name: '开始规划' }).click();
  await expect(page.getByText('含税总价')).toBeVisible();
  await page.goto('/square/dali-slow-5d');
  await page.getByRole('button', { name: '转为行程' }).click();
  await page.getByRole('button', { name: '确认行程草稿' }).click();
  await page.getByRole('button', { name: '发布搭子意愿' }).click();
  await page.getByRole('button', { name: '愿意认识木雨' }).click();
  await page.getByRole('link', { name: '进入聊天' }).click();
  await page.goto('/guardian/dali-slow-5d');
  await expect(page.getByRole('heading', { name: '备选方案' })).toBeVisible();
});
```

- [ ] **Step 2: 运行 E2E 确认真实失败点**

Run: `pnpm exec playwright install chromium && pnpm test:e2e tests/e2e/core-journey.spec.ts`

Expected: 初次运行暴露路由、选择器或状态衔接缺口；逐个记录而不是批量猜测。

- [ ] **Step 3: 修复主链路并添加移动端断言**

```ts
test.use({ viewport: { width: 390, height: 844 } });
test('mobile navigation and search have no horizontal overflow', async ({ page }) => {
  await page.goto('/');
  const width = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: window.innerWidth }));
  expect(width.body).toBeLessThanOrEqual(width.viewport);
  await page.getByRole('button', { name: '打开导航' }).click();
  await expect(page.getByRole('link', { name: '真实比价' })).toBeVisible();
});
```

- [ ] **Step 4: 添加 axe 和 reduced-motion 验证**

```ts
import AxeBuilder from '@axe-core/playwright';
test('home has no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([]);
});
```

- [ ] **Step 5: 运行完整工程验证并提交**

Run: `pnpm verify && pnpm test:e2e`

Expected: 全部 PASS，浏览器控制台无未处理错误。

```powershell
git add tests/e2e src
git commit -m "test: verify the complete xingyu travel journey"
```

## Task 12: 浏览器视觉对照与 Design QA

**Files:**
- Create: `artifacts/home-desktop-1440x1024.png`
- Create: `artifacts/home-mobile-390x844.png`
- Create: `artifacts/design-comparison.png`
- Create: `design-qa.md`
- Modify: visual files reported by QA

**Interfaces:**
- Consumes: `docs/design/selected-homepage-option-1.png` 与浏览器实拍。
- Produces: `design-qa.md`，最终一行必须是 `final result: passed`。

- [ ] **Step 1: 启动本地预览并用 Codex 内置浏览器打开**

Run: `pnpm dev -- --hostname 0.0.0.0 --port 4173`

在内置浏览器中打开对应本地地址，确认首页、比价、广场、搭子、助手和守护可导航；记录控制台错误。

- [ ] **Step 2: 以 1440×1024 和 390×844 捕获实现截图**

桌面截图必须与视觉真值保持同一视口、相同首页初始状态；移动端另行检查内容重排，不与桌面真值做像素级误判。

- [ ] **Step 3: 把源图和实现图合成一个并排比较输入**

```text
左侧：docs/design/selected-homepage-option-1.png
右侧：artifacts/home-desktop-1440x1024.png
输出：artifacts/design-comparison.png
```

- [ ] **Step 4: 按五个必查面写首轮 `design-qa.md`**

必须逐项写字体、间距节奏、颜色令牌、图像质量、文案内容；每个 P0/P1/P2 包含位置、证据、影响和具体修复。

- [ ] **Step 5: 修复 P0/P1/P2 后重复截图与比较**

每轮在 `design-qa.md` 记录旧问题、修复和新证据；P3 可列入后续润色，但不能用来阻止交付。

- [ ] **Step 6: 确认视觉门槛并提交**

Run: `rg -n "final result: passed" design-qa.md && pnpm verify && pnpm test:e2e`

Expected: 找到唯一通过结果，全部测试 PASS。

```powershell
git add artifacts design-qa.md src public tests
git commit -m "fix: pass responsive design qa"
```

## Task 13: Vercel 发布、公开访问与上线验收

**Files:**
- Create: `vercel.json`
- Create: `docs/deployment/vercel-runbook.md`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**
- Consumes: 通过全部本地验证的 Next.js 应用。
- Produces: READY 的生产部署、公开 URL 和回滚说明。

- [ ] **Step 1: 写运行手册和最小 Vercel 配置**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["hkg1"]
}
```

运行手册必须记录：Node 24、构建命令 `pnpm build`、健康检查 `/api/v1/health`、演示模式变量、生产密钥禁止入库、Preview → Production 提升和回滚步骤。

- [ ] **Step 2: 进行本地发布前验证**

Run: `pnpm verify && pnpm test:e2e && git status --short`

Expected: 测试全部 PASS，仅允许部署文档或计划内产物未提交；提交后工作树干净。

- [ ] **Step 3: 创建 Vercel Preview**

通过已连接的 Vercel 部署能力从 `D:\Codex-chat\xingyu-travel` 部署当前项目。若项目需要选择团队，先列出团队并选择当前用户的个人团队；不得把代码部署到未经选择的组织账户。

- [ ] **Step 4: 验证 Preview 并提升 Production**

对 Preview 执行：

```text
GET /
GET /api/v1/health
首页搜索 → 比价
攻略 → 行程
搭子 → 聊天
守护 → Plan A/B/C
未登录窗口可访问
控制台 error 数量为 0
```

全部通过后使用同一构建产物提升为 Production，避免重新构建产生差异。

- [ ] **Step 5: 检查生产状态与日志**

确认部署状态 `READY`，扫描生产构建日志和运行日志；将最终 URL、项目 ID、部署 ID、提交 SHA、验证时间和已知演示限制写入运行手册。

- [ ] **Step 6: 提交发布记录**

```powershell
git add vercel.json docs/deployment/vercel-runbook.md README.md .env.example
git commit -m "docs: record vercel production release"
```

## Plan Self-Review Record

- Spec coverage: 首页、三类比价、增量报价、广场、攻略转行程、行程工作台、搭子、聊天、AI、守护、隐私偏好、响应式、可访问性、视觉 QA 和 Vercel 发布均有独立任务。
- Deliberate production adapters: 真实 OTA、数据库、实名、Qwen 和实时聊天均通过契约预留，不作为无密钥公开演示的完成条件。
- Placeholder scan: 本计划未发现未决要求、空接口或依赖其他任务隐式补全的步骤。
- Type consistency: `NormalizedOffer`、`MatchResult`、`TripDraft`、`AssistantResponse`、Provider 接口和状态方法在首次出现处定义，后续任务使用同名契约。
- Release gate: `pnpm verify`、Playwright 完整旅程、`design-qa.md` passed、Vercel READY 和未登录公开访问缺一不可。
