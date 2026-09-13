# Task 11 verification report — complete journey E2E, responsive, and accessibility

## Scope and inherited state

- Baseline: `994a05a`.
- Inherited GREEN evidence: initial core journey `1 passed (22.3s)`, mobile navigation at `390x844` `1 passed`, homepage axe critical/serious `0`, and initial keyboard search/tab plus filter-dialog focus checks.
- Confirmed in the worktree: E2E runtime collectors fail on `console.error`, `pageerror`, and every HTTP status `>=400`; the full public-journey, mobile-nav, a11y, dialog, external-confirmation, and reduced-motion checks all use those collectors.

## New and resumed verification

The desktop foreground command boundary cut long Playwright commands at about 31 seconds without a terminal reporter result. I did not classify those runs as passes. `pnpm exec playwright` also failed immediately with `'playwright' is not recognized`, despite the local binary being present. I used the local `node_modules/.bin/playwright.cmd` in a detached task-local process with `--workers=1 --reporter=list`, while a task-local Next server on port 4173 was running and verified with HTTP 200. The captured reporter outputs were:

| Command / scope | Terminal result |
| --- | --- |
| `responsive.spec.ts --grep=trips` | 1 passed (4.3s) |
| responsive routes `/compare`, `/square`, `/partners`, `/assistant`, `/guardian/dali-slow-5d` | each 1 passed (3.1–4.3s) |
| axe routes `/`, `/compare`, `/square`, `/partners`, `/assistant`, `/guardian/dali-slow-5d` | each 1 passed (3.8–4.3s); no critical/serious violations |
| external quote confirmation | 1 passed (3.6s) |
| reduced motion | 1 passed (3.3s) |
| `core-journey.spec.ts --workers=1 --reporter=list` | 1 passed (12.3s) |
| `responsive.spec.ts --workers=1 --reporter=list` | 7 passed (8.9s) |
| `accessibility.spec.ts --workers=1 --reporter=list` | 10 passed (17.1s), including keyboard tabs/search, dialog focus trap/Escape/trigger restore, external confirmation, and reduced motion |
| `pnpm test:e2e` | 18 passed (22.7s) |

The detached Node processes emitted only the environmental warning that `NO_COLOR` is ignored because `FORCE_COLOR` is set. No E2E runtime collector reported console, page, or nonexpected HTTP errors.

## Verification fix from observed RED

The first `pnpm verify` exited 1 after lint and typecheck:

- Vitest's default glob collected the newly added Playwright `tests/e2e/*.spec.ts` as three zero-test files.
- `site-header.test.tsx` still expected the obsolete `/guardian/demo`, while the Task 11 header route intentionally points at the existing `/guardian/dali-slow-5d` route.
- `risk-timeline.test.tsx` still expected the former button accessible name, while Task 11 adds the `Plan A` qualifier needed by the journey test and assistive technology.

Minimal corrections:

- `vitest.config.ts` excludes `tests/e2e/**` while preserving Vitest default exclusions.
- The two component tests now assert the intentional route and accessible name.

Fresh post-fix evidence:

| Command | Terminal result |
| --- | --- |
| direct `vitest run` for the two repaired component files, `--maxWorkers=1 --reporter=verbose` | 2 files / 3 tests passed (26.18s) |
| direct full `vitest run --maxWorkers=1 --reporter=dot` | 28 files / 214 tests passed (253.37s) |
| final `pnpm verify` | exit 0: eslint, `tsc --noEmit`, Vitest 28 files / 214 tests passed (64.86s), and Next production build completed |

`git diff --check` completed without whitespace errors before commit.

## Concerns

- Local Playwright invocation needs the direct local binary in this desktop environment because `pnpm exec playwright` does not resolve it; `pnpm test:e2e` itself succeeds.
- No product-test failures remain. The `NO_COLOR`/`FORCE_COLOR` warning is environment-only and does not come from application runtime collectors.

## Fix round — connected journey state and stronger browser acceptance

This round reviewed the committed Task 11 baseline at `b7023ff` and preserved its existing implementation. The acceptance gaps were closed with observable state and condition-based browser checks rather than timing sleeps or `networkidle` guesses.

### Critical trip-to-partner handoff

- The workbench now hydrates the partner store and publishes a schema-valid partner intent whose destination, dates, and budget come from the canonical accepted trip while personal matching preferences remain intact.
- 木雨's sandbox availability is aligned to 大理; the accepted trip still yields score 92 and exactly three explanations.
- `/partners` consumes the already-published local intent and does not mount a second intent form.
- The first strengthened core E2E run exposed a real boundary bug: `tripToPartnerIntent` spread the full runtime `WorkbenchTrip`, leaking strict-schema keys such as `id`, `items`, and `status`. The focused unit reproduction failed with `success: false`; explicit mapping of the four hard fields made the unit GREEN and the core journey GREEN.

### Important acceptance corrections

- Guardian Plan A had a static success message before any click. The component regression first failed because `role="status"` already existed. `RiskTimeline` now subscribes to the canonical trip's actual plan selection, renders no selected state initially, exposes `aria-pressed=false → true`, and announces the exact selected Plan A only after the click.
- The core journey now submits non-default `2026-09-18`–`2026-09-22` dates and 3 travelers, compares all five literal `URLSearchParams`, checks the exact comparison summary, proves the workbench-to-partner handoff with no second form and 木雨 score 92, and proves Plan A is not a no-op.
- The responsive timing regression navigated only to response commit and correctly failed with `document=loading` and incomplete images. The final helper waits for route-specific dynamic/hydration state, scrolls each lazy image into view, waits for `document.readyState=complete`, `document.fonts.status=loaded`, and all images complete, then proves header hydration with an open/close round trip. Every mobile route is measured with the menu both closed and open.
- The filter-dialog E2E now checks last `Tab` → first and first `Shift+Tab` → last before retaining Escape and trigger-focus restoration. A temporary mutation removing the forward wrap produced the expected focused RED; restoring the real branch produced GREEN.
- Existing partner component/domain fixtures were updated to request the newly intentional 大理 candidate. No hard filter was weakened. A saved intent now has a neutral local-intent notice rather than incorrectly claiming every saved intent originated in the workbench.

### Fresh terminal evidence

| Command / scope | Terminal result |
| --- | --- |
| guardian component RED | 1 failed: pre-click static status was present |
| guardian component GREEN | 1 passed |
| full runtime trip conversion unit RED | 1 failed: strict intent validation returned false |
| trip conversion unit GREEN | 1 passed |
| core journey first strengthened run | 1 failed at the strict-schema handoff boundary |
| core journey after explicit mapping | 1 passed (11.0s) |
| responsive timing RED | 1 failed with `document=loading`, `images=false` |
| complete responsive spec | 7 passed (12.7s) |
| dialog focus mutation RED / restored GREEN | 1 failed at last-to-first wrap / 1 passed (4.2s) |
| complete accessibility spec | 10 passed (18.7s) |
| three Task 11 specs together, one worker | 18 passed (33.5s) |
| `pnpm test:e2e` | 18 passed (21.3s), exit 0 |
| focused partner component | 7 passed |
| focused partner domain unit | 45 passed |
| final `pnpm test` | 29 files / 215 tests passed (61.31s) |
| final `pnpm verify` | exit 0: eslint, typecheck, 29 files / 215 tests, and Next production build completed |

`next-env.d.ts` was verified byte-for-byte against the HEAD blob after Next dev rewrote its generated route reference; the generated change was excluded. Final status contains only this fix round's source, test, and report files.

## Fix round 2 — hydrated mobile trip workbench

This surgical round reviewed baseline `59a6f62` and changed no production code. The responsive trip case now proves the real hydrated `TripWorkbench`, rather than treating the clean-context recovery page as sufficient coverage.

### Strict RED to GREEN

- RED: the trip route's readiness assertion was first changed to require the workbench-only `大理慢行计划` heading and `行程设置` region. With no setup, the isolated case failed because a clean browser context rendered `未找到本地行程草稿`; terminal result was 1 failed (6.6s).
- GREEN: the table case gained a typed `prepare` callback that stays in the same Playwright page/context and uses only public UI: `/square/dali-slow-5d` → `转为行程` → `确认并保存草稿` → `/trips/dali-slow-5d`. It does not inject local storage or call `page.evaluate` to create state. The isolated case then passed (1 passed, 5.7s).
- After the real workbench is visible, the shared readiness helper waits for the route-specific UI, document completion, loaded fonts, and completed lazy images, and proves header hydration with a menu open/close round trip. The final assertion measures `scrollWidth <= innerWidth` at 390×844 with the mobile menu both closed and open.
- Existing `console.error`, `pageerror`, and HTTP `>=400` guards remain active throughout the UI preparation and both layout states.

### Fresh terminal evidence

| Command / scope | Terminal result |
| --- | --- |
| trip responsive case before UI preparation | 1 failed (6.6s): workbench-only heading absent on the recovery page |
| trip responsive case after real UI preparation | 1 passed (5.7s) |
| `responsive.spec.ts --workers=1 --reporter=list` | 7 passed (15.1s) |
| core, responsive, and accessibility specs together, one worker | 18 passed (37.4s) |
| `pnpm test:e2e` | 18 passed (23.6s), exit 0 |
| `pnpm test` | 29 files / 215 tests passed (87.50s), exit 0 |
| final `pnpm verify` | exit 0: eslint, typecheck, 29 files / 215 tests passed (88.91s), and Next production build completed |

The first sandboxed `pnpm verify` attempt had already passed lint, typecheck, and all 215 Vitest checks, but its build could not connect to Google Fonts for the configured Noto families. Re-running the unchanged command in a network-enabled build context completed successfully. Playwright emitted only the environmental `NO_COLOR`/`FORCE_COLOR` warning; no application runtime guard fired.
