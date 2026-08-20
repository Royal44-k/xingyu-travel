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

## Vercel release result

- Deployed source commit: `d58c254` (the QA evidence commit; no production source changed after the complete local gates).
- Preview deployment: `dpl_8pfLnq33CdM3QNq49yqFj3QTcGvB`, `https://xingyu-travel-nylfzzhu4-lirongouyang522-3492s-projects.vercel.app`, target Preview, READY.
- Preview access boundary: a fresh unauthenticated local Chrome context reached `https://vercel.com/login`; after Production promotion the same check still reached that SSO login with zero request failures.
- Preview candidate verification used Vercel's official automation-bypass header with the secret held only in process memory. The secret was never printed, written, or committed.
- Preview hydration diagnostic: the conversion control became enabled after 15,230 ms, within the bounded 30-second wait; conversion and save passed, then the interrupted trip loop and remaining saved-offer loop passed. The raw diagnostic recorded five navigation-cancelled Next RSC prefetches as `net::ERR_ABORTED`; these produced no HTTP response ≥400 and were not application failures.
- Exact candidate promotion: `vercel promote` created Production deployment `dpl_7tBjfSPxfbJXzwTX7PGGBUWCwgoE` from the verified Preview artifact.
- Production deployment URL: `https://xingyu-travel-c6zd0kuwa-lirongouyang522-3492s-projects.vercel.app`, target Production, READY.
- Public Production alias: `https://xingyu-travel.vercel.app`; Vercel inspection confirms the alias resolves to `dpl_7tBjfSPxfbJXzwTX7PGGBUWCwgoE`.
- Production authentication result: fresh local Chrome used no credentials or protection-bypass header; all tested public-alias requests remained on the Production host and returned 200.
- Error-log check: the bounded `--level error --since 1h --limit 100` query returned no error entry for the new deployment.

The first non-archive Preview upload encountered a transient `fetch failed` after reaching the full upload size and produced no Vercel deployment. The task-owned stalled process was stopped, absence of a candidate was confirmed, and the same committed source succeeded once with `--archive=tgz`. No Production state changed before the candidate passed verification.

## Public Production browser verification

Evidence: `artifacts/design-qa-2026-08-19/production-verification.json`.

| Surface | Result |
|---|---|
| Unauthenticated access | Passed in a fresh Google Chrome context through `https://xingyu-travel.vercel.app`. |
| Route matrix | 9/9 returned 200: home, square, detail, profile, trips, compare, partners, assistant, guardian. |
| Browser-local closed loops | 4/4 passed through visible UI in separate fresh contexts. |
| Source asset | `/assets/destinations/dali/01.png` returned 200 `image/png`, 2,487,912 bytes. |
| Next image optimization | `/_next/image?...` returned 200 `image/png`, 364,221 bytes. |
| Security headers | `nosniff`; `strict-origin-when-cross-origin`; `camera=(), microphone=(), geolocation=()`; `SAMEORIGIN`. |
| Runtime health | 0 `console.error`, 0 console warnings, 0 page errors, 0 HTTP responses ≥400. |

The production verifier initially over-constrained dynamic and lazy images by waiting for every dimensioned document image, including offscreen lazy content and a carousel source swap. A focused Chrome inspection proved the requested images returned 200 and rendered with non-zero natural dimensions. The final evidence uses viewport-intersection readiness, matching the route-ready Design QA rule; this changed only the evidence harness, not production code.

## Rollback boundary

- Previous known-good Production: `dpl_3GZmsZn1tZmdJvr2xmDtKM9wdawV` / `https://xingyu-travel-5upep3p2h-lirongouyang522-3492s-projects.vercel.app`, READY.
- Prepared command: `pnpm dlx vercel@59.1.4 rollback https://xingyu-travel-5upep3p2h-lirongouyang522-3492s-projects.vercel.app`.
- The rollback command was recorded only and was not executed.
- Structured release metadata: `artifacts/design-qa-2026-08-19/vercel-release.json`.
