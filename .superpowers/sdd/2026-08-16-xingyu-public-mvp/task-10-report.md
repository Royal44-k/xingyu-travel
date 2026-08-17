# Task 10 Report — 账户偏好、透明度与生产保障

## RED → GREEN

- `tests/component/preference-settings.test.tsx` first failed because `PreferenceSettings` / `profile-store` did not exist; after implementing the validated store and control, it passed **2/2**.
- `tests/unit/security-headers.test.ts` first failed with an empty header map; after preserving `poweredByHeader: false` and adding the four required headers, it passed **1/1**.
- `tests/component/feedback-dialogs.test.tsx` first failed because report/external dialog modules did not exist; its final run passed **5/5**, including Square entry-point wiring and reset-on-reopen behaviour.
- `tests/component/square-feed.test.tsx` first failed because Square held its own `recommended` state; after using the profile store as its sole ranking source, the suite passed **6/6**.
- `tests/component/comparison-client.test.tsx` first failed because it still exposed the old sandbox notice; after wiring `ExternalBookingDialog`, the only remaining observed assertion was corrected to the dialog's actual first-focus close control.
- `tests/unit/production-safeguards.test.ts` first failed because the health/metadata routes did not exist; after adding them, it passed **2/2**.

## Commands and evidence

- `node_modules/.bin/vitest.cmd run tests/component/preference-settings.test.tsx --pool=forks --maxWorkers=1 --reporter=verbose` → PASS 2/2.
- `node_modules/.bin/vitest.cmd run tests/unit/security-headers.test.ts --pool=forks --maxWorkers=1 --reporter=verbose` → PASS 1/1.
- `node.exe node_modules/vitest/vitest.mjs run tests/component/feedback-dialogs.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → PASS 5/5.
- `node.exe node_modules/vitest/vitest.mjs run tests/component/comparison-client.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → PASS 11/11.
- `node_modules/.bin/vitest.cmd run tests/component/square-feed.test.tsx --pool=forks --maxWorkers=1 --reporter=verbose` → PASS 6/6 after the shared-store migration.
- `node_modules/.bin/vitest.cmd run tests/unit/production-safeguards.test.ts --pool=forks --maxWorkers=1 --reporter=verbose` → PASS 2/2.
- `node_modules/.bin/tsc.cmd --noEmit` → PASS after correcting the profile store setter type and after final dialog refactor.
- `node_modules/.bin/eslint.cmd .` → PASS after replacing the global-error anchor with `Link` and removing synchronous state updates in effects.
- `node_modules/.bin/next.cmd build` → PASS after final changes; production routes include `/profile`, `/api/v1/health`, `/manifest.webmanifest`, `/robots.txt`, and `/sitemap.xml`.
- Full Vitest was invoked in both verbose and dot single-worker modes. This desktop runner detached Node child processes after emitting partial output, so it did not produce a trustworthy final aggregate summary; the precise scoped test commands above are the usable evidence. The rejected process-cleanup request is left untouched to avoid interrupting unrelated work.

## Integration points

- `useProfileStore` is the only persisted source for `personalizedFeed` and `interestTags`; Square derives either recommended or chronological ordering directly from it.
- Persistence uses `skipHydration`, strict Zod parsing, and fail-closed defaults. Empty interests force personalized ranking off; malformed persisted data cannot be merged into live state.
- `ReportDialog` is reached from every Square `PostCard`; it validates a reason, labels its browser-local demo disposition, and supports Escape, focus trap, cancel, submit, and trigger restoration.
- `ExternalBookingDialog` is reached from Compare offers. It discloses provider responsibility and no on-platform payment, requires confirmation, protects focus, and permits the controlled external action only in a supported production deployment (not tests/local previews).
- `DemoBanner`, profile copy, health response, metadata routes, error boundaries, and 404 path all avoid claims of real identity checks, orders, payment, real-time APIs, or emergency services.

## Risks / follow-up

- The production outbound target is a generic public travel-search handoff because the MVP has no contracted supplier adapter. Before enabling a real supplier, replace that URL with a provider-owned, reviewed adapter destination.
- The default SEO fallback is the Vercel project hostname; configure `VERCEL_URL` from the deployment environment for previews/production.

## Fix round 1 — review hardening

### Root cause, RED → GREEN

- **Malformed profile persistence:** the initial store began from recommendation-on defaults, and a Zod parse failure merely reported an error while preserving that default state. The new browser-storage regression first failed (`expected true to be false`, **1 failed, 2 passed**) after production `rehydrate()` read an invalid `xingyu-profile-demo-v1` value. The persistence merge now returns a fail-closed state (chronological, no interests), reports the hydration error, and does not write over the malformed raw value. An explicit user reset is the only path that restores demo defaults. GREEN: **3/3**.
- **Square hydration flash:** the initial Square page exposed default recommendation controls before the skipped hydration completed. The deferred-rehydrate regression first failed because the neutral status was absent and recommendation controls rendered (**1 failed, 6 passed**). Square now withholds feed controls and posts behind a neutral local-preference status; on completion it renders the saved chronological state once, while a parse failure shows a recoverable chronological notice. GREEN: **7/7**.
- **Report result focus:** submit removed the focused submit button, leaving `document.body` active because the focus trap did not re-activate for the result view. The focused regression first failed (`expected close result button to have focus; received body`, **1 failed, 5 passed**). The shared dialog hook now accepts an activation key, and `ReportDialog` keys it on submitted state so the result close button receives focus; Tab, Shift+Tab, Escape, and trigger restoration remain contained. GREEN: **6/6**.

### Fix-round verification

- `node.exe node_modules\\vitest\\vitest.mjs run tests/component/preference-settings.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → RED 1 failed/2 passed, then GREEN **3/3**.
- `node.exe node_modules\\vitest\\vitest.mjs run tests/component/square-feed.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → RED 1 failed/6 passed, then GREEN **7/7**.
- `node.exe node_modules\\vitest\\vitest.mjs run tests/component/feedback-dialogs.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → RED 1 failed/5 passed, then GREEN **6/6**.
- `node.exe node_modules\\vitest\\vitest.mjs run tests/component/comparison-client.test.tsx --pool=threads --maxWorkers=1 --reporter=verbose` → GREEN **11/11**, including outbound-dialog focus trapping and trigger restoration after the shared hook change.
- `node.exe node_modules\\vitest\\vitest.mjs run tests/unit/security-headers.test.ts tests/unit/production-safeguards.test.ts --pool=threads --maxWorkers=1 --reporter=verbose` → GREEN **3/3**.
- `node_modules\\.bin\\tsc.cmd --noEmit` → GREEN (exit 0).
- `node_modules\\.bin\\eslint.cmd .` → GREEN (exit 0).
- `node_modules\\.bin\\next.cmd build` → GREEN (exit 0); compiled, type checked, and generated all 13 static pages.
- `node.exe node_modules\\vitest\\vitest.mjs run --pool=threads --maxWorkers=1 --reporter=dot` was attempted for the requested full suite. Desktop emitted only `RUN v4.1.10 D:/Codex-chat/xingyu-travel/.worktrees/xingyu-public-mvp` before its child process detached, without dots or a terminal test summary. It is explicitly **not counted as PASS**; no process was terminated.
