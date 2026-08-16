# Task 7 report — 行程工作台与同行决策室

## Result

Expanded the existing `/trips/[slug]` Task 6 handoff route into a browser-local itinerary workbench. A hydrated guide draft is accepted into an explicit workbench state machine without creating a conflicting `[id]` route or replacing previously edited workbench state. The Dali demo supports trip settings, five editable and reorderable itinerary nodes, alternatives, three-member voting, budget aggregation, comparison handoff, a local partner intent, and explicitly consented, reversible guardian-demo state.

## RED

Added `tests/unit/trip-store.test.ts` and `tests/component/trip-workbench.test.tsx` before their production modules, then ran:

```text
.\node_modules\.bin\vitest.CMD run tests\unit\trip-store.test.ts tests\component\trip-workbench.test.tsx
```

After approving the worktree-local Vite cache write, both suites failed for the intended missing-feature reason:

```text
FAIL tests/component/trip-workbench.test.tsx
Failed to resolve import "@/stores/trip-store"

FAIL tests/unit/trip-store.test.ts
Failed to resolve import "@/stores/trip-store"

Test Files 2 failed (2)
```

No Task 7 production module existed before this RED.

## Store and hydration

- Added `createTripStore` for isolated tests and the app-level `useTripStore`, persisted under exactly `xingyu-demo-v1` with `skipHydration`.
- Persists only demo trip/workbench state and browser-local partner-intent flags. The state contains city/attraction-level locations and fixed member IDs only—no coordinates, contact details, payment data, or other PII.
- Keeps Task 6's `xingyu-demo-trip-drafts` store as the draft source. The workbench waits for both stores to finish explicit browser hydration before accepting a draft, and renders neutral loading or recovery states when hydration is incomplete or malformed.
- De-duplicates draft acceptance by both draft ID and source-post slug. An already accepted trip is left unchanged, preserving edits instead of re-importing the draft.
- Implements the explicit `review → active ↔ guarded` transition path plus discarded/archived terminal paths. Invalid transitions use stable `TRIP_INVALID_TRANSITION:<from>:<to>` errors.
- Guardian activation requires an explicit `true` consent signal; turning it off returns `guarded → active`.
- Editing covers dates, total budget, title, city/attraction location, estimated item cost, stable boundary-safe reorder, and alternative toggling.
- Votes are a member-to-candidate map: a new candidate replaces the same member's prior vote, and selecting the same candidate again toggles that vote off.
- `getBudgetSummary` exposes every item total and the deterministic overall sum.

## UI

- Replaced the Task 6 route-level placeholder with `TripWorkbench` while retaining `TripDraftHandoff` for its existing isolated compatibility tests.
- Added an editorial ink/ivory/sand/pine layout with a responsive trip header, settings panel, route timeline, budget ledger, two-option decision room, member roster, local actions, and comparison CTA.
- Date and budget validation blocks reversed ranges and invalid budgets with an accessible alert.
- Each itinerary node is a named fieldset with labeled inputs, boundary-disabled move controls, save feedback, and an alternative toggle.
- The decision room exposes three named demo members, one real control per member/candidate pairing, visible vote totals, and a two-vote consensus state.
- `进入比价` links to the existing `/compare` route with the current destination, dates, and three-traveler query.
- `发布搭子意愿` only records and confirms a browser-local demo intent; it neither navigates to a missing route nor claims platform publication.
- The guardian switch opens a named consent dialog before activation, is reversible, and explicitly says the demo does not read live location or contact a backend.
- Uses semantic sections, labels, focus-visible styling, dialog focus management, responsive breakpoints, and existing Phosphor icons. No fake map art or inline SVG was introduced.

## Verification

Scoped Task 7 verification:

```text
.\node_modules\.bin\vitest.CMD run tests\unit\trip-store.test.ts tests\component\trip-workbench.test.tsx
Test Files 2 passed (2)
Tests 17 passed (17)
```

Static checks:

```text
.\node_modules\.bin\tsc.CMD --noEmit --incremental false
exit 0

.\node_modules\.bin\eslint.CMD .
exit 0
```

Full regression suite:

```text
.\node_modules\.bin\vitest.CMD run --maxWorkers=1 --reporter=dot
Test Files 16 passed (16)
Tests 111 passed (111)
```

Production build:

```text
.\node_modules\.bin\next.CMD build
Compiled successfully
Route /trips/[slug]  Dynamic
```

Vitest and Next required approved writes for their temporary cache and build artifacts inside the exact worktree. TypeScript was run with incremental output disabled because the sandbox denied rewriting the existing `tsconfig.tsbuildinfo` file.

## Files

- `src/stores/trip-store.ts`
- `src/app/trips/[slug]/page.tsx`
- `src/features/trips/trip-workbench.tsx`
- `src/features/trips/itinerary-editor.tsx`
- `src/features/trips/decision-room.tsx`
- `src/features/trips/trips.module.css`
- `tests/unit/trip-store.test.ts`
- `tests/component/trip-workbench.test.tsx`

## Commit

`feat: add itinerary workbench and decision room`

## Concerns

- All partner-intent, voting, budget, and guardian behavior is intentionally browser-local demo state. There is no booking, publishing, monitoring, or location backend.
- Initial dates, costs, candidates, and the three member identities are fixed Dali demo fixtures. The store boundaries support later adapters without representing those fixtures as live data.
- Verification covers DOM interaction, accessibility-oriented semantics, static analysis, regression tests, and a production build. Browser screenshot and viewport-level visual QA were not run in this task.
