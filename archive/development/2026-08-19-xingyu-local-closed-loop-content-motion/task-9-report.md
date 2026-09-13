# Task 9 Report: Navigation Connected to Real Local Journeys

## Result

Implemented Task 9 and review round 1 without touching the ledger, running browser/E2E, or deploying:

- Replaced placeholder header destinations with valid `/trips`, `/assistant`, and `/profile` routes.
- Made the Guardian header destination hydration-safe and data-driven: no guarded trip returns to `/trips?intent=guardian`; the newest supported guarded trip opens its canonical `/guardian/{sourcePostSlug}` route with deterministic update/create/slug tie-breaking.
- Preserved one accessible mobile menu with Escape close, focus restoration, explicit personal-center copy, and contained 390px overflow.
- Added Guardian intent guidance to the trip collection and kept every CTA on an existing route.
- Included discoverable static public routes in the sitemap without inventing dynamic Guardian IDs.
- Restricted Guardian activation to trips backed by the shared `isKnownGuardianTrip` event predicate. An existing unguarded Dali trip links to its workbench; unsupported-only or empty collections explain the sandbox boundary and link directly to `/square/dali-slow-5d`.
- Disabled the Guardian workbench control for unsupported trips, named the support boundary, and prevented it from opening consent or changing trip state.
- Made the risk timeline explicitly hydrate the local trip store and fail closed through neutral loading, malformed-storage recovery, missing-local-trip, and known-but-not-enabled states.
- Rendered Plan actions only for a hydrated canonical guarded trip. Event-time store reads and a defensive catch prevent stale clicks from emitting `TRIP_NOT_FOUND` or persisting a plan after eligibility disappears.

The initial Task 9 implementation was committed as `0b3fd9d` (`fix: connect navigation to real local journeys`). Review round 1 resolved both Important findings; none remain open in this round.

## TDD Evidence

Initial Task 9 RED/GREEN:

- Focused GREEN: 40 tests passed across header, trip collection, trip store, and route/sitemap coverage.
- Related GREEN: 62 tests passed.
- Full GREEN: 41 files and 333 tests passed.

Review round 1, supported activation RED:

- Added collection and workbench contracts before production changes.
- RED result: 4 expected failures with 19 existing passes. The failures proved that an unsupported Sichuan trip was selected as the setup target, empty/unsupported collections linked to generic Square, and the unsupported workbench control remained enabled.
- GREEN result: 2 files and 23 tests passed after applying the shared supported-trip predicate to the collection and decision room.

Review round 1, hydrated timeline RED:

- Added delayed hydration, malformed storage, missing local trip, not-Guardian-enabled trip, valid guarded trip, and stale-click coverage before production changes.
- RED result: 4 expected state failures plus the stale interaction's uncaught `TRIP_NOT_FOUND:dali-slow-5d`; 2 existing cases passed.
- GREEN result: all 6 risk-timeline tests passed with explicit hydration and fail-closed eligibility handling.

Related review GREEN:

- Command: `pnpm test tests/component/site-header.test.tsx tests/component/trip-collection.test.tsx tests/component/trip-workbench.test.tsx tests/component/risk-timeline.test.tsx tests/unit/trip-store.test.ts tests/unit/assistant-routes.test.ts tests/unit/production-safeguards.test.ts`
- Result: 7 files and 69 tests passed.

## React Review Evidence

- Hooks remain unconditional, and the reusable timeline state component is declared at module scope.
- Zustand subscriptions select individual hydration flags, the canonical trip ID, one trip, or one saved plan; no component subscribes to the whole store.
- Guardian plan callbacks defer live store reads until interaction time instead of subscribing to action-only state.
- Canonical route resolution uses `sourcePostSlug`, preventing a route slug from being mistaken for an arbitrary local record key.
- Native links, buttons, disabled state, live/status semantics, focus styles, Escape handling, and focus restoration remain explicit.

## Fresh Verification

- Related regression: 7 files, 69 tests passed.
- Full Vitest: 41 files, 340 tests passed; exit 0.
- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0. The restricted first attempt could not write `tsconfig.tsbuildinfo`; the approved project command rerun passed without diagnostics.
- `pnpm build`: exit 0; Next.js 16.2.12 compiled successfully and generated 14/14 static pages.
- `git diff --check`: no whitespace errors; only repository LF-to-CRLF notices were printed.
- No browser, Playwright/E2E, ledger update, or deployment was performed.

## Files

Created:

- `.superpowers/sdd/2026-08-19-xingyu-local-closed-loop-content-motion/task-9-report.md`

Modified in review round 1:

- `src/features/guardian/guardian.module.css`
- `src/features/guardian/risk-timeline.tsx`
- `src/features/trips/decision-room.tsx`
- `src/features/trips/trip-collection.tsx`
- `tests/component/risk-timeline.test.tsx`
- `tests/component/trip-collection.test.tsx`
- `tests/component/trip-workbench.test.tsx`
