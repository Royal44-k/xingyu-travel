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

## Final review release — 2026-08-21

This section supersedes the deployment identifiers above while preserving the earlier release history.

- Exact deployed source commit: `51818da9514cc756f1c01a114570ee8878a46904`.
- Preview: `dpl_AXdEaEHnUubPbBJXbC1x8DRGBXNW`, `https://xingyu-travel-88ifag4pc-lirongouyang522-3492s-projects.vercel.app`, Preview, READY, unauthenticated Chrome redirected to Vercel login.
- Preview verification: `preview-final-verification.json`; 9 routes and 2 assets returned 200, all 5 final-review flows and all 4 closed loops passed, security headers passed, and runtime errors/warnings were both zero.
- Exact-artifact Production promotion: `dpl_JCoM3n81ch8oogaaj85KKLonKaZj`, `https://xingyu-travel-nqssihr6y-lirongouyang522-3492s-projects.vercel.app`, Production, READY.
- Public alias: `https://xingyu-travel.vercel.app`; `production-final-verification.json` repeated the full Preview matrix in a fresh Chrome context without credentials or bypass headers and passed.
- Bounded one-hour Production `--level error` query: no entry returned.
- Preview-only SSO remained unchanged. The verifier was corrected to read the existing default Automation Bypass in memory instead of creating one. Two non-default entries accidentally created by this final-review task were precisely revoked; the count returned from 10 to 8 and the original default remained selected.
- Previous known-good Production: `dpl_7tBjfSPxfbJXzwTX7PGGBUWCwgoE` / `https://xingyu-travel-c6zd0kuwa-lirongouyang522-3492s-projects.vercel.app`, READY.
- Prepared rollback command: `pnpm dlx vercel@59.1.4 rollback https://xingyu-travel-c6zd0kuwa-lirongouyang522-3492s-projects.vercel.app --scope lirongouyang522-3492s-projects`; recorded only, not executed.

### Final-review local gates already evidenced

- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm test --maxWorkers=1`: 42/42 files, 348/348 tests, 489.89 s.
- `pnpm test:e2e`: 31/31 passed in 1.4 minutes using local Google Chrome.
- `pnpm build`: exit 0; Next.js 16.2.12; 14/14 static pages generated.

## Second final-review candidate — 2026-08-21

- Production-fix commits: `dc0a3bb` (Assistant request invalidation and transactional plan selection), `fd63609` (cross-store partner publication compensation), `7bf184a` (read-only historical Preview diagnostic), `3ddca47` (React-compliant trip-context session binding), and `6d10ef2` (fresh-browser absent PartnerStore persistence compensation).
- `pnpm lint`: exit 0; ESLint emitted no finding after the React best-practices refactor.
- `pnpm typecheck`: exit 0; the initial sandboxed attempt encountered only `tsconfig.tsbuildinfo` EPERM, then the exact command completed with permitted project-cache access.
- `pnpm test --maxWorkers=1`: 42/42 files, 357/357 tests, 460.05 s after the fresh-browser compensation fix.
- `pnpm test:e2e`: 31/31 passed in 59.3 seconds using local Google Chrome after the fresh-browser compensation fix; port 4173 was free after the runner stopped its server.
- `pnpm build`: exit 0 after the fresh-browser compensation fix; Next.js 16.2.12; compile 5.4 s, TypeScript 16.7 s, 14/14 static pages generated in 837 ms.
- Second-round same-input Design QA: `artifacts/final-fixes-round2-2026-08-21/comparison-affected-surfaces.png` plus three readable affected-state captures; manifest result `passed`, with zero runtime errors or warnings and no actionable P0/P1/P2.
- `design-qa.md` remains `final result: passed`.
- Rejected Preview `dpl_GCX5hMKpL2fByCRkwf9ttr6rcPQ9` was never promoted. Its fresh-context verifier proved that TripStore quota compensation restored PartnerStore memory but changed raw persistence from absent (`null`) to an empty envelope. The exact RED was added locally, fixed in `6d10ef2`, and the full local gates above were rerun before creating a replacement Preview.

### Second final-review release result

- Exact deployed source and evidence commit: `a4cd194632577d03414c963fa26eb427dbfd73b7`; the replacement Preview was created from a clean worktree after all fresh local gates passed.
- Protected Preview: `dpl_F8z6cvXmsEEMZ85qfHAz1EudNtXq`, `https://xingyu-travel-abvgvmar8-lirongouyang522-3492s-projects.vercel.app`, READY. `preview-round2-final-verification.json` passed 9/9 routes, 2/2 image assets, 8/8 affected flows, and 4/4 browser-local closed loops with zero runtime errors or warnings. An unauthenticated fresh Chrome context reached Vercel SSO as required.
- Exact-artifact promotion created Production `dpl_E9kpA1gNdjX54Zzu8YheTmTynteT`, `https://xingyu-travel-dvjn1hjjq-lirongouyang522-3492s-projects.vercel.app`, READY. No Production rebuild or divergent source deployment was used.
- Public Production: `https://xingyu-travel.vercel.app`. `production-round2-final-verification.json` repeated the complete Preview matrix without credentials or bypass headers and passed with zero console errors, console warnings, page errors, or HTTP responses >=400.
- The bounded one-hour Production error-log query returned no error-level entry. Security headers passed: `nosniff`, strict-origin referrer policy, camera/microphone/geolocation denial, and `SAMEORIGIN` framing.
- Preview-only SSO remained unchanged. The verifier read the pre-existing official Automation Bypass through a read-only lookup and created no new bypass credential or entry.
- Previous known-good Production: `dpl_JCoM3n81ch8oogaaj85KKLonKaZj` / `https://xingyu-travel-nqssihr6y-lirongouyang522-3492s-projects.vercel.app`, READY.
- Prepared rollback command: `pnpm dlx vercel@59.1.4 rollback https://xingyu-travel-nqssihr6y-lirongouyang522-3492s-projects.vercel.app --scope lirongouyang522-3492s-projects`; recorded only, not executed.

## Third final-review candidate — 2026-08-21

- Production fix commit: `f4ef6f0`. PartnerStore now owns the exact raw persistence snapshot and returns an idempotent rollback handle after a durable intent write. The rollback restores owner memory without semantic reserialization and then restores the original null or non-null bytes verbatim. TripWorkbench only invokes that handle and no longer reads `localStorage`, the PartnerStore storage key, or a semantic restore action.
- Exact RED: the focused 2-file/67-test run produced two expected failures. The component regression received canonical compact state-first JSON instead of the intentionally formatted valid v2 bytes, and the unit owner-transaction regression received no rollback handle.
- Focused GREEN: 2/2 files and 67/67 tests passed in 22.43 seconds. Coverage includes a valid distinctive non-null v2 envelope, a forced second TripStore quota failure, byte- and memory-exact rollback, successful owner reload, absent bytes remaining absent, owner first-write failure, and the normal publish/reload path.
- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm test --maxWorkers=1`: 42/42 files, 359/359 tests, 492.93 seconds.
- `pnpm test:e2e`: 31/31 passed in 1.1 minutes using local Google Chrome; the task-owned server stopped and port 4173 was free.
- `pnpm build`: exit 0; Next.js 16.2.12; compile 6.1 seconds, TypeScript 18.2 seconds, and 14/14 static pages generated in 938 ms.
- Visible UI, copy, interaction state, styles, and responsive behavior are unchanged. The previously passed workbench second-write-error comparison remains accurate; `design-qa.md` records why a visually identical recapture was not repeated and still ends `final result: passed`.
- The exact-byte distinction cannot be produced through ordinary visible UI because normal user writes intentionally serialize canonical valid JSON. Unit and real-component tests cover byte identity; Preview and Production verification will repeat the visible second-write failure, semantic state, route, closed-loop, security, and runtime contracts.

### Third final-review release result

- Exact deployed source and evidence commit: `cc88e274c628457eb74af587a19e22a2991911b3`; Preview was created from a clean worktree after all fresh local gates passed.
- Protected Preview: `dpl_7bL9cTHePAJyGgKrJDeQzewJyGoM`, `https://xingyu-travel-fvetaopy2-lirongouyang522-3492s-projects.vercel.app`, READY. `preview-round3-final-verification-clean.json` passed 9/9 routes, 2/2 image assets, 8/8 affected flows, and 4/4 closed loops with zero runtime errors or warnings. Unauthenticated fresh Chrome reached Vercel SSO.
- Exact-artifact promotion created Production `dpl_8Cr2HkEChsnCn1Mn6mkaBn7xQYWp`, `https://xingyu-travel-fs9wgz522-lirongouyang522-3492s-projects.vercel.app`, READY. Public alias `https://xingyu-travel.vercel.app` resolves to that deployment.
- `production-round3-final-verification-clean.json` repeated the complete matrix without credentials or bypass headers and passed with zero console errors, console warnings, page errors, or HTTP responses >=400. The bounded one-hour Production error-log query returned no error-level entry.
- Preview-only SSO remained unchanged. The verifier used only the pre-existing official Automation Bypass through a read-only lookup and created no new bypass credential or entry.
- One first-pass Preview CSS preload timing warning did not reproduce in the unique same-artifact full recheck. One first-pass Production navigation `net::ERR_FAILED` did not reproduce in an instrumented exact-flow diagnostic or the unique same-artifact full recheck. No source or verifier suppression was introduced; only the clean terminal matrices are retained as release evidence.
- Previous known-good Production: `dpl_E9kpA1gNdjX54Zzu8YheTmTynteT` / `https://xingyu-travel-dvjn1hjjq-lirongouyang522-3492s-projects.vercel.app`, READY.
- Prepared rollback command: `pnpm dlx vercel@59.1.4 rollback https://xingyu-travel-dvjn1hjjq-lirongouyang522-3492s-projects.vercel.app --scope lirongouyang522-3492s-projects`; recorded only, not executed.

## Annotated homepage layout fix — 2026-08-21

- User evidence: the browser annotation identified that the compact-desktop comparison planner visually crowded the upper-left Hero copy and requested that the planner move downward.
- Root cause: at widths up to 1050 px the planner changes to a taller two-row layout, while the Hero previously retained the 768 px large-desktop minimum height.
- Exact RED: the new 1024 × 640 local-Chrome regression measured only 37.96875 px between the rendered copy and planner, below the required 96 px separation, and failed 1/1.
- Fix: the existing Hero gains a 840 px minimum height only in the compact-desktop `max-width: 1050px` band. Existing mobile breakpoints continue to override it, and typography, imagery, planner controls, and large-desktop geometry are unchanged.
- Focused GREEN: the compact-desktop regression passed 1/1.
- Same-input Design QA: `artifacts/hero-layout-fix-2026-08-21/comparison-board.png` combines the public pre-fix page and local implementation at 1024 × 640 CSS pixels, `deviceScaleFactor: 1`, and `scrollY: 192`. The visible copy-to-planner gap increased from 55.96875 px to 127.96875 px; both captures recorded zero runtime issues and the corrected layout introduced no actionable P0/P1/P2 finding.
- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm test --maxWorkers=1 --reporter=dot`: 42/42 files and 359/359 tests passed in 295.90 seconds.
- `pnpm test:e2e`: 32/32 passed in 56.4 seconds using local Google Chrome, including the new compact-desktop Hero contract.
- `pnpm build`: exit 0 after the sandbox-only `.next/trace` EPERM was retried with permitted project-cache access; Next.js 16.2.12 compiled in 4.9 seconds, TypeScript finished in 11.8 seconds, and 14/14 static pages were generated.
- Production release identifiers and public verification will be appended after an exact committed Preview passes and that same artifact is promoted.

### Annotated homepage release result

- Exact deployed source commit: `fef5e9783e86403d1be7dc697903e3b6643d8e04`.
- Protected Preview: `dpl_3yUEAhcETakJiWN3cmzo3PNNms73`, `https://xingyu-travel-h08ayatmv-lirongouyang522-3492s-projects.vercel.app`, READY. A fresh unauthenticated Chrome context reached Vercel SSO as required.
- Clean Preview matrix: `artifacts/design-qa-2026-08-19/preview-hero-layout-verification-clean.json` passed 9/9 routes, 2/2 image assets, 8/8 affected flows, and 4/4 closed loops with zero runtime errors or warnings. The first pass's lone Next auto-CSS preload timing warning did not reproduce in the unique same-artifact full recheck; no source or verifier suppression changed.
- Focused Preview evidence: `artifacts/hero-layout-fix-2026-08-21/preview-layout.json` and `preview-layout.png` measured a 127.96875 px copy-to-planner gap at 1024 × 640, kept the planner inside the Hero, and recorded zero runtime issues.
- Exact-artifact promotion created Production `dpl_A7BPmyHbnyxQ2KKWDhRoQi4q1L9u`, `https://xingyu-travel-au0uarq6d-lirongouyang522-3492s-projects.vercel.app`, READY. Vercel inspection confirms `https://xingyu-travel.vercel.app` resolves to this deployment.
- Public Production verification: `artifacts/design-qa-2026-08-19/production-hero-layout-verification.json` repeated 9/9 routes, 2/2 image assets, 8/8 affected flows, and 4/4 closed loops in a fresh unauthenticated Chrome context with zero runtime errors or warnings.
- Focused public evidence: `artifacts/hero-layout-fix-2026-08-21/production-layout.json` and `production-layout.png` repeated the 127.96875 px gap, Hero containment, and zero-runtime-issue checks at the user's compact-desktop viewport.
- Preview-only SSO remained unchanged; the verifier read only the pre-existing official Automation Bypass in process memory and created no bypass entry. Production remained publicly accessible without credentials or bypass headers.
- The bounded one-hour Production error-level log scan returned no entry.
- Previous known-good Production: `dpl_8Cr2HkEChsnCn1Mn6mkaBn7xQYWp` / `https://xingyu-travel-fs9wgz522-lirongouyang522-3492s-projects.vercel.app`, READY.
- Prepared rollback command: `pnpm dlx vercel@59.1.4 rollback https://xingyu-travel-fs9wgz522-lirongouyang522-3492s-projects.vercel.app --scope lirongouyang522-3492s-projects`; recorded only, not executed.

## Second annotated homepage correction — 2026-08-21

- User evidence: the supplied Chrome screenshot shows the white flight planner covering the second description line, while `大理—丽江 / 下一站` sits over the bright right-side sun and is difficult to read. The requested order is complete description → left-aligned route → planner.
- Root cause: Hero copy, route, and planner were three independently absolutely positioned siblings. At the supplied wide aspect ratio the fluid heading became taller, but the fixed planner position did not move with it.
- Objective pre-fix evidence from the public page at 2280 × 858 CSS pixels: description bottom 549.078 px, planner top 517 px, therefore -32.078 px overlap; route x 1926 px versus description x 112 px, an 1814 px alignment delta.
- Exact RED: the new local-Chrome regression required the route to sit at least 24 px below the complete description, the planner at least 24 px below the route, matching left alignment within 1 px, at least 96 px total description-to-planner clearance, and Hero containment. The old layout failed before implementation.
- Fix: the existing Hero now uses a natural vertical flex flow. Copy, route, and planner remain the same content and components; only their layout ownership changes. The route is placed 32 px below the description on the dark left field, and the planner is placed 32 px below the route. Responsive breakpoints keep their existing widths while using the same flow.
- Focused GREEN: wide-desktop Hero regression passed 1/1. Responsive GREEN: 13/13 passed after the readiness helper was shared with the existing compact-desktop contract so Motion entrance transforms cannot be mistaken for final geometry.
- Local fixed metrics at 2280 × 858: description-to-route 32 px, route-to-planner 32 px, description-to-planner 104 px, left-alignment delta 0 px, planner contained in Hero, and zero runtime issues. Evidence: `artifacts/hero-layout-fix-2026-08-21/wide-after-local.json` and `wide-after-local.png`.
- Design QA: `wide-comparison-board.png` and `wide-focused-comparison.png` were opened and inspected. The source screenshot is 2280 × 858 physical pixels but does not expose its CSS viewport density/zoom; the boards therefore evidence semantic order and contrast, while DOM bounds provide the exact geometry contract. No actionable P0/P1/P2 remained.
- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0 after the sandbox-only `tsconfig.tsbuildinfo` EPERM was retried with permitted project-cache access.
- `pnpm test --maxWorkers=1 --reporter=dot`: 42/42 files and 359/359 tests passed in 420.34 seconds.
- `pnpm test:e2e`: 33/33 passed in 1.0 minute using local Google Chrome, including the new wide Hero and existing compact Hero contracts.
- `pnpm build`: exit 0 after the sandbox-only `.next/trace-build` EPERM was retried with permitted project-cache access; Next.js 16.2.12 compiled in 7.0 seconds, TypeScript finished in 12.3 seconds, and 14/14 static pages were generated in 494 ms.
- Release identifiers remain pending until this exact committed candidate passes protected Preview verification and that same artifact is promoted to public Production.
