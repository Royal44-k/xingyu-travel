# Task 10 Report — Browser-Level Closed-Loop Acceptance

## Scope and test integrity

- Added four isolated local-Chrome stories for interest recovery, liked-guide persistence, guide-to-trip conversion, and saved-offer/alert management.
- Every state transition is prepared through visible UI in the same browser context. No test calls `localStorage`, seeds Zustand, or injects persisted state through `page.evaluate`.
- The local-library, responsive, accessibility, and core-journey specs collect `console.error`, uncaught page errors, and HTTP responses with status `>= 400`; every completed GREEN run ended with those arrays empty.
- Responsive trip and guardian cases create and authorize their state through the guide conversion and guardian dialogs before visiting the target route.

## RED evidence

The first two sandboxed invocations of the required grep command did not reach tests because the inherited `test-results` directory rejected Playwright writes with `EPERM`. Those are environment failures and are not counted as product RED.

The unchanged command was then run in the approved local-Chrome execution context:

```text
pnpm test:e2e -- --grep "local closed loop"
18 passed, 6 failed (1.3m), exit 1
```

`pnpm` forwarded the literal separator to Playwright, so the invocation collected all 24 E2E tests rather than only the four named stories. All four newly written local-loop stories passed because Tasks 1–9 had already supplied those public behaviors. The required broader acceptance surface still produced honest RED:

1. Home Axe found one serious color-contrast violation containing four nodes.
2. Reduced-motion startup emitted a React hydration mismatch because server and client disagreed on `data-parallax`.
3. Core journey targeted obsolete Dali title and confirmation copy.
4. Responsive trip setup targeted obsolete confirmation copy.
5. Guardian responsive coverage visited a route without first creating and authorizing a guarded trip through UI.
6. A legacy desktop assertion still targeted the former seasonal-card layout instead of the signature destination film.

After expanding Axe to the six required routes and adding the missing keyboard/motion checks, the focused RED run reported `19 passed, 7 failed (1.2m)`. It additionally exposed contrast failures on detail, profile, and trip surfaces and confirmed the reduced-motion hydration defect.

## Integration fixes

- Made reduced-motion activation hydration-aware with a stable server snapshot while always invoking `useReducedMotion`; this stops autoplay and parallax without a server/client attribute warning.
- Darkened only the Axe-failing text colors on home, detail, profile, and trips to meet WCAG AA.
- Updated the core journey to current visible copy and to explicitly authorize guardian state through its consent dialog.
- Replaced stale responsive setup with route-specific readiness and real UI preparation across the nine required 390×844 routes.
- Updated the legacy homepage viewport check to target the approved signature destination-film region.

## Initial GREEN evidence

```text
carousel component: 13/13 passed
core journey: 1/1 passed (24.5s)
responsive: 11/11 passed (37.1s)
accessibility: 14/14 passed (52.9s)
explicit four E2E files: 30/30 passed (1.1m)
pnpm test:e2e: 30/30 passed (1.1m)
full Vitest: 41 files, 340/340 tests passed (195.04s)
pnpm lint: exit 0
pnpm typecheck: exit 0
pnpm build: exit 0; 14/14 static pages generated
```

The initial Task 10 implementation was committed as `3761f37` (`test: verify the complete local travel library`).

## Reviewer fix round 1/5

The local-library stories now bind to stable visible identities rather than feed order:

- The liked-guide story uses the exact Dali guide, opens the profile’s liked-guide link, verifies `/square/dali-slow-5d`, verifies the exact detail title and pressed favorite state, unlikes on detail, then confirms the profile empty state.
- The offer story scopes to the named “上海至大理演示航班 B” card, verifies provider “星屿沙箱演示航班” and `¥1,010` total, verifies the matching saved snapshot, follows that card’s own re-search link, asserts the persisted query contract, and verifies the same named offer remains saved before removal.
- `reuseExistingServer` is now `false`. A task-owned Node listener (`PID 16216`, session `76900`) temporarily held port 4173; the focused Playwright command exited 1 with “http://127.0.0.1:4173 is already used” instead of reusing it. The listener was stopped through its recorded session, and a follow-up port query returned no owner.

Focused reviewer-fix evidence:

```text
pnpm test:e2e tests/e2e/local-library.spec.ts
4/4 passed (22.9s), exit 0
```

The first explicit-four review rerun produced `29 passed, 1 failed (1.0m)`: `/square` observed `document.fonts.status` change from `loaded` back to `loading` between the readiness wait and a separate snapshot. The helper now condition-polls one exact `{ document: 'complete', fonts: 'loaded', images: true }` value, preserving every readiness requirement without sampling between font-load transitions.

Final reviewer-fix evidence:

```text
responsive focused: 11/11 passed (35.7s)
explicit four E2E files: 30/30 passed (1.1m)
pnpm test:e2e: 30/30 passed (1.1m)
pnpm lint: exit 0
pnpm typecheck: exit 0
pnpm build: exit 0; 14/14 static pages generated
```

Full Vitest was not repeated in this review round because changes were limited to Playwright tests/configuration and this report; the immediately preceding Task 10 gate remains `41 files, 340/340 tests passed`.

## Runtime observations

No GREEN E2E run recorded a console error, page error, or HTTP response `>= 400`. Development output did contain non-error notices: Node’s `NO_COLOR`/`FORCE_COLOR` warning, Next.js smooth-scroll annotation guidance, Next Image LCP eager-loading guidance on the Dali image, and Motion’s expected reduced-motion notice. No warning was suppressed or converted into an allowlist.

Each Playwright run used its own configured web server. After completed runs, port 4173 had no owner. No inherited Node or Chrome PID was terminated.

## Reviewer fix round 2/5 — saved offer search context

The second reviewer found that a saved flight offer could only reconstruct `kind` and `destination`; the user-entered dates and traveller count were lost when selecting “重新比价”. The fix stores the validated `ComparisonSearchInput` alongside each favourite-offer snapshot, carries that exact context from the comparison client, and reconstructs the profile re-search URL with `origin`, `from`, `to`, and `travelers` when present. The snapshot validator rejects a context whose product kind or destination does not match its offer, while valid pre-context v1 snapshots still hydrate normally.

The implementation is covered at three levels:

- Store tests verify durable context, legacy v1 hydration, and fail-closed invalid dates.
- Component tests verify a newly saved offer receives the active search context and a profile offer link keeps dates/travellers.
- The visible-browser local-library journey asserts the exact query `kind=flight&destination=大理&origin=上海&from=2026-09-18&to=2026-09-22&travelers=3` after choosing “重新比价”.

Round-2 verification reported by the implementing agent:

```text
focused Vitest RED: 4 failed, 50 passed
focused Chrome E2E RED: re-search URL missing from/to/travelers
focused Vitest GREEN: 56/56 passed
focused local-library E2E GREEN: 1/1 passed
full Vitest: 342/342 passed
full E2E: 30/30 passed
pnpm lint / pnpm typecheck / pnpm build: passed; build generated 14/14 static pages
```

Independent handoff check: a sandboxed focused Vitest invocation could not create Vite’s temporary config file (`EPERM`); the approved local execution subsequently started the configured real-Chrome suite and showed the 30-test run. This report therefore preserves the agent’s completed GREEN evidence above rather than claiming a second, independently completed full run.

## Reviewer fix round 3/5 — origin preservation

The saved-offer flow already persisted and reconstructed `origin`, but its browser URL, profile fixture, and durable rehydration fixture did not assert it. The exact origin contract is now covered in each layer. To prove the assertion is sensitive, the profile URL builder temporarily omitted `origin`; the single real-Chrome saved-offer story failed with the expected diff (`origin: 上海` expected, absent from received query). The production line was then restored without any functional change.

```text
RED: pnpm run test:e2e --grep "favorite offer"
1 failed — expected origin=上海, received query omitted origin

GREEN: pnpm run test:e2e --grep "favorite offer"
1/1 passed (11.3s)

GREEN: pnpm exec vitest run tests/unit/library-store.test.ts tests/component/profile-hub.test.tsx
2 files, 42/42 passed (15.51s)

GREEN: pnpm lint && pnpm typecheck
passed
```
