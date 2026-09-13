# Task 6 report — 攻略广场与攻略转行程

## RED

- Added `tests/unit/extract-trip-draft.test.ts` and `tests/component/square-feed.test.tsx` before their corresponding modules.
- Scoped Vitest initially failed because `@/data/posts` and `@/features/square/feed-controls` did not exist. This was the expected missing-feature RED state.
- The workspace package wrapper did not expose Vitest directly; invoking the worktree executable required a Vite temporary-cache write permission before the suite could load.

## GREEN

- Added deterministic, local `TravelPost` data. `dali-slow-5d` is a 大理, 5-day, ¥5,200 guide with exactly five itinerary nodes.
- Added pure `extractTripDraft`, recommended/chronological ordering, local persisted Zustand draft storage, accessible feed controls/cards, detail route, and review-first conversion drawer.
- Scoped GREEN: 2 files, 4 tests passing.

## Files

- `src/data/posts.ts`
- `src/domain/trips/extract-draft.ts`
- `src/domain/trips/trip-store.ts`
- `src/app/square/page.tsx`
- `src/app/square/[slug]/page.tsx`
- `src/features/square/feed-controls.tsx`
- `src/features/square/post-card.tsx`
- `src/features/square/convert-to-trip.tsx`
- `src/features/square/square.module.css`
- `tests/unit/extract-trip-draft.test.ts`
- `tests/component/square-feed.test.tsx`

## Verification

- `vitest run tests/unit/extract-trip-draft.test.ts tests/component/square-feed.test.tsx` — pass (2 files, 4 tests)
- `pnpm typecheck` — pass
- `pnpm lint` — pass
- `vitest run` — pass (13 files, 82 tests)
- `pnpm build` — pass; includes `/square` and `/square/[slug]`

## Commit

- `6a73707 feat: add guide square and trip conversion`
- `202c161 fix: complete square conversion and feed behavior`
- `7387126 fix: harden square preferences and draft hydration`
- `64cbb90 fix: hydrate drafts before square conversion`
- `5033cf6 fix: block conversion after draft hydration failure`

## Concerns

- This is deliberately a local demo: favorites, reports, interest preferences, and trip drafts are browser-only and do not call a publishing, reporting, booking, or payment backend.

## Review round 1

### RED

- The review regression suite initially failed because the persisted-draft handoff component did not exist, non-Dali posts did not provide the declared number of daily itinerary nodes, and chronological mode still described tag-based recommendations.

### GREEN

- Added the minimal `/trips/[slug]` local-draft handoff route and its clear empty-browser recovery link; it is intentionally not the Task 7 workbench.
- Added complete deterministic 4/3/2 day itineraries for the remaining posts and an invariant covering every post.
- Clearing interests in the square now switches the parent feed to chronological mode, and controls communicate that recommendations are off.
- Replaced the equal-height grid with CSS multi-column editorial waterfall (`columns: 3/2/1`) while preserving source DOM order.
- Added review-first conversion tests: no save before confirmation, all draft details, Escape/focus restoration, store persistence, and exact injected navigation destination.

### Verification

- Focused review suite: 3 files, 11 tests passing.
- Full suite: 14 files, 89 tests passing.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass; the build includes `/trips/[slug]`.

## Review round 2

### RED

- New component regressions initially showed that empty interest tags still allowed the recommendation mode to be activated, and that a persisted draft could render before browser hydration completed.

### GREEN

- The recommendation control is disabled without interests, has an accessible restore explanation, and the parent refuses an empty-interest recommendation transition.
- The persisted Zustand store now skips server hydration and marks hydration complete only after an explicit browser-side rehydrate call. The handoff renders `正在读取本地草稿…` until then.
- Conversion coverage now verifies every draft item’s title, location, description, pre-confirmation no-save behavior, persisted payload, and hydrated successful handoff.

### Verification

- Focused second-round suite: 2 files, 10 tests passing.
- Full suite: 14 files, 91 tests passing.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass; build retains `/trips/[slug]`.

## Review round 3

### RED

- Final regression tests initially showed that conversion could proceed while the persisted store was unhydrated, replacing seeded drafts, and that malformed persisted data fell through to ordinary empty recovery.

### GREEN

- Conversion now invokes the real browser-only `hydrateTripStore` on mount and is disabled with a neutral status until hydration completes; confirmation also has a hydration guard.
- Hydration state is isolated from the persisted draft store so hydration flags and failures never write an empty draft state over browser storage.
- Tests seed the actual `xingyu-demo-trip-drafts` Zustand persistence payload, rehydrate via the production path, preserve an existing draft while adding the current conversion, and verify both in memory and localStorage.
- Malformed persisted storage produces safe recovery copy and remains untouched. SSR and the first client render both remain neutral until the browser hydration transition.

### Verification

- Focused final suite: 2 files, 12 tests passing.
- Full suite: 14 files, 93 tests passing.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass; build includes `/trips/[slug]`.

## Review round 4

### RED/GREEN

- Added a real malformed-localStorage conversion regression. RED: hydration completed with an error and re-enabled conversion.
- GREEN: conversion readiness now requires both hydration completion and no hydration error; the trigger and confirmation guard remain blocked, an explicit manual-recovery message is shown, and malformed bytes are not changed.

### Verification status

- Focused `tests/component/convert-to-trip.test.tsx`: pass (8 tests).
- `pnpm typecheck`: pass.
- `pnpm lint`: pass.
- A final full-suite rerun was attempted but stalled after Vitest startup; its orphaned local workers were stopped. It is therefore not recorded as passing for this micro-fix. The prior full-suite/build evidence above remains from review round 3.
