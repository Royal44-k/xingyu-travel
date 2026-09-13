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
