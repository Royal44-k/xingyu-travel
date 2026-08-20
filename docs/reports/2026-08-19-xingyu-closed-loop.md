# 行屿浏览器本地闭环 — 发布候选证据

- Evidence date: 2026-08-20 (Asia/Shanghai)
- Branch: `feature/xingyu-public-mvp`
- Verified source commit before QA evidence: `1e88020`
- Product boundary: public browser-local demonstration; no real booking, payment, identity verification, background push, emergency dispatch, or cross-device sync.

## Local release gates

| Gate | Result | Evidence |
|---|---|---|
| `pnpm lint` | exit 0 | 17.51 s; ESLint emitted no finding. |
| `pnpm typecheck` | exit 0 | 8.48 s; the first sandboxed attempt hit only `tsconfig.tsbuildinfo` EPERM, then the exact command completed outside that file restriction. |
| `pnpm test -- --maxWorkers=1 --reporter=dot` | exit 0 | 41 files, 342 tests, 122.98 s. |
| `pnpm test:e2e` | exit 0 | 30 tests, 1.2 min, local Chrome channel. |
| `pnpm build` | exit 0 | Next.js 16.2.12; compile 4.9 s, TypeScript 15.8 s, page data 3.1 s, 14/14 static pages 865 ms. |

The Playwright server emitted development-only `NO_COLOR` notices, Next image LCP guidance on routes whose above-fold image changes with scenario, the documented smooth-scroll advisory, and Motion's reduced-motion informational message. No gate failed. The dedicated route-ready Chrome capture subsequently recorded zero browser console warnings/errors, page errors, or HTTP responses ≥400.

## Closed-loop acceptance

1. Interest clear → re-add Sea Island and City Walk → enable recommendations → reload: persisted.
2. Like Dali guide → reload → profile Likes → open exact original guide → unlike → empty state: passed through visible UI.
3. Convert Dali guide → My Trips → workbench → compare: passed through the canonical trip record.
4. Save the named Shanghai-to-Dali sandbox offer → enable local alert → profile → re-search with exact query identity → confirm removal: passed.

The same full E2E run also covered the public guide → trip → partner → chat → guardian Plan A journey, external-supplier confirmation, keyboard search/tabs/gallery/dialogs, reduced motion, six Axe scans, and the 390 × 844 route matrix.

## Design QA

- Report: `design-qa.md` (`final result: passed`).
- Evidence directory: `artifacts/design-qa-2026-08-19/`.
- Source-to-implementation full boards: `comparison-home-full.png` and `comparison-content-hub-full.png`.
- Focused boards: `comparison-home-focus.png` and `comparison-content-hub-focus.png`.
- State board: `comparison-interaction-states.png`.
- Mobile board: `comparison-mobile-responsiveness.png`.
- Capture manifest: 15 screenshots, local Google Chrome, exact viewport/density and visible-image readiness, zero runtime errors.

No production source changed during this QA pass. One capture-only readiness race was corrected and recaptured; it did not alter the website.

## Vercel preflight

- CLI: Vercel CLI 59.1.4 (pinned for this release).
- Account: `lirongouyang522-3492`.
- Team: `lirongouyang522-3492s-projects` (`lirongouyang522-3492's projects`).
- Linked project: `xingyu-travel` / `prj_IeyWF8pZrE35C9Sp6eJWHcFpIiCl`.
- Linked organization: `team_GXUbEGjD0inFlQqufnaKsSVQ`.
- Framework/runtime: Next.js, Node.js 24.x, root directory `.`.
- Known-good Production before this release: `https://xingyu-travel-5upep3p2h-lirongouyang522-3492s-projects.vercel.app` (READY).

The exact Preview deployment, Promotion result, public Production verification, deployment ID, and rollback command are appended after the verified candidate artifact is promoted. This staging boundary ensures Production is never inferred from a local pass.
