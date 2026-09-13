# Task 4 Report — Canonical Trip Store v2 and My Trips

## Status

Implemented and verified. `TripStore` v2 is the only accepted-trip owner, guide conversion writes directly to it, the canonical `/trips` collection is available, and legacy draft storage is retained only as a non-destructive migration source.

## TDD evidence

### Store and migration RED

Command:

```text
pnpm test tests/unit/trip-store.test.ts
```

Initial RED output:

```text
Test Files  1 failed (1)
Tests       5 failed | 14 passed (19)
```

The expected failures were: `savePostAsTrip` absent, envelope still version 1, no legacy import, malformed canonical bytes not raising hydration failure in the new test, and a v2 fixture not loading under the old schema.

Additional focused RED cycles:

- Stable selectors: `1 failed | 18 passed`; `selectTripRecords is not a function`.
- Existing-v2 legacy import persistence: `1 failed | 19 passed`; the newly discovered legacy trip existed in memory but had not yet been written to the canonical envelope.
- Sitemap discovery: `1 failed | 1 passed`; `/trips` was absent.

Final store GREEN:

```text
Test Files  1 passed (1)
Tests       20 passed (20)
```

### Component RED

Command:

```text
pnpm test tests/component/convert-to-trip.test.tsx tests/component/trip-collection.test.tsx
```

Initial RED output:

```text
Test Files  2 failed (2)
Tests       no tests
```

Both suites failed import resolution because `TripCollection` did not exist, the expected missing-feature boundary.

Navigation RED:

```text
Test Files  1 failed (1)
Tests       1 failed | 1 passed (2)
```

The existing header still linked `/trips/demo` instead of `/trips`.

Non-Dali canonical-route RED:

```text
Test Files  1 failed (1)
Tests       1 failed | 12 passed (13)
```

The workbench still rendered `LOCAL TRIP / DALI` and fixed five-day copy for a four-day Sichuan trip.

Focused GREEN evidence:

```text
Task 4 focused: 5 files passed, 44 tests passed
Canonical workbench after route-copy fix: 1 file passed, 13 tests passed
Partner/guardian/assistant regressions: 4 files passed, 11 tests passed
```

## Migration and persistence decisions

- Canonical key remains `xingyu-demo-v1`; the strict Zustand envelope version is now `2` with `skipHydration: true`.
- V2 trips require `createdAt` and `updatedAt`, accept optional `coverImage`, and validate timestamp order, dates, guardian/status agreement, item and candidate uniqueness, votes, canonical `key === trip.id`, and non-orphaned partner/guardian records.
- V1 and compatible version-zero workbench state migrate through a separate strict schema. Every migrated trip receives `2026-08-18T00:00:00.000Z`; migration never calls `Date.now()`.
- `xingyu-demo-trip-drafts` is parsed by a strict legacy envelope/schema inside the trip domain. It is never removed, cleared, or overwritten.
- Valid legacy drafts are imported by source slug. Import into absent/v1 or existing-v2 canonical state is persisted once, and repeated hydration is idempotent.
- Malformed canonical bytes fail closed. The storage wrapper preserves the exact raw value and suppresses writes/removal after hydration failure.
- `savePostAsTrip` resolves existing trips by `sourcePostSlug`, returns the same canonical object on repeat, rejects an unrelated ID collision, and always writes `trips[trip.id]`.
- Every existing mutator resolves a canonical trip from ID or source slug before writing. Trip records, partner intents, and guardian plans remain keyed by canonical `trip.id`; mutations refresh `updatedAt`.

## UI and routing decisions

- `ConvertToTrip` hydrates and writes the canonical store directly, carries the guide cover, updates `/trips` immediately, and changes repeat conversion to `已在我的行程中` before entering the existing trip.
- `TripWorkbench` no longer merges or creates from a separate draft store. It reads the canonical trip only, preserves safe in-memory work after hydration error, and uses destination/day-count copy for every real trip route.
- `/trips` renders stable loading, validation-error, and empty states; sorts accepted trips by `updatedAt` descending; filters all/active/guarded/archived; reports total and visible counts; and links cards to `/trips/{sourcePostSlug}`.
- Header and sitemap now point to `/trips`; source and tests contain no `/trips/demo` route link.
- Collection styling reuses the ivory/ink/pine/sand tokens and Noto variables, uses real saved cover assets when available, removes the cover column when unavailable, exposes semantic filters/cards, preserves visible focus, and collapses cleanly below 640 px including a 390 px viewport.

## React best-practice review

- Hydration/no flicker: conversion, collection, and workbench render explicit neutral loading boundaries before reading browser-local data; no empty collection is shown before hydration.
- Selector granularity: collection subscribes through stable `selectTripRecords`; conversion/workbench subscribe to source-specific trip objects and primitive hydration/action values; Task 5 can consume exported record, slug, and accepted-count selectors without copying domain records.
- Derived state: sorted/eligible trips are memoized from the canonical record; filtered trips and counts are derived during render, not mirrored into effects or duplicate state.
- Effects: effects only initiate store hydration; workbench starts independent trip and partner hydration in parallel. User actions remain in event handlers.
- Rendering and accessibility: components are module-level, image sizing is explicit, dialogs retain established focus handling, filters use `aria-pressed`, cards use real links, and focus-visible styles cover controls.

## Files

Created:

- `src/app/trips/page.tsx`
- `src/features/trips/trip-collection.tsx`
- `tests/component/trip-collection.test.tsx`
- `.superpowers/sdd/2026-08-19-xingyu-local-closed-loop-content-motion/task-4-report.md`

Modified:

- `src/stores/trip-store.ts`
- `src/domain/trips/trip-store.ts`
- `src/features/square/convert-to-trip.tsx`
- `src/features/trips/trip-workbench.tsx`
- `src/features/trips/trip-draft-handoff.tsx`
- `src/features/trips/itinerary-editor.tsx`
- `src/features/trips/trips.module.css`
- `src/components/site-header.tsx`
- `src/app/sitemap.ts`
- `tests/unit/trip-store.test.ts`
- `tests/unit/production-safeguards.test.ts`
- `tests/component/convert-to-trip.test.tsx`
- `tests/component/trip-workbench.test.tsx`
- `tests/component/site-header.test.tsx`

## Final verification

All commands ran sequentially with no overlapping Vitest runner.

```text
pnpm lint
$ eslint .
PASS (0 errors, 0 warnings)

pnpm typecheck
$ tsc --noEmit
PASS

pnpm build
$ next build
PASS — /trips static route and /trips/[slug] dynamic route present

pnpm test
Test Files  34 passed (34)
Tests       268 passed (268)
Duration    112.58s
```

## Concerns

- Persistence is intentionally browser- and device-local; trips do not sync across browsers or accounts.
- No direct Playwright/browser screenshot run was added in this task. Responsive behavior is covered by the implemented breakpoint/focus rules and component semantics; production compilation and the complete Vitest suite are green.

## Fix round 1 — unique source-post slugs

### Finding and root cause

The persisted trip-state schemas validated canonical map keys and side-state ownership but did not validate the cross-record invariant that a non-empty `sourcePostSlug` belongs to at most one canonical trip. Therefore, a structurally valid envelope could hydrate duplicate guide-derived trips and leave source-slug lookup order-dependent.

### RED

```text
pnpm test tests/unit/trip-store.test.ts
Test Files  1 failed (1)
Tests       3 failed | 21 passed (24)
```

The three expected failures were the exact-v2 duplicate case and the version-zero/version-one migration duplicate cases: all hydrated without reporting an error before the refinement existed.

### Implementation and migration decisions

- Added one `refineUniqueTripSourceSlugs` refinement to the shared persisted-state schema factory, so exact v2 validation and version-zero/v1 migration input validation enforce the same invariant.
- The refinement compares non-empty string slugs exactly and reports the later canonical record at `trips.<id>.sourcePostSlug`.
- Missing, non-string, and empty values are left to their field-level schemas and do not create a second, misleading duplicate-slug issue.
- Duplicate persisted states still fail closed: no trips or side-state hydrate, and the canonical local-storage bytes remain byte-for-byte unchanged.
- Valid legacy import remains idempotent. Its existing source-slug lookup prevents adding an already represented draft, and the shared normalized-state parse provides a second invariant check before persistence.
- Canonical `key === trip.id`, partner-intent/guardian-plan ownership, and malformed-byte suppression are unchanged.

### GREEN and regression evidence

All runners were sequential and terminal before the next command began.

```text
pnpm test tests/unit/trip-store.test.ts
Test Files  1 passed (1)
Tests       24 passed (24)

pnpm test tests/component/convert-to-trip.test.tsx tests/component/trip-collection.test.tsx tests/component/trip-workbench.test.tsx
Test Files  3 passed (3)
Tests       24 passed (24)

pnpm lint
$ eslint .
PASS

pnpm typecheck
$ tsc --noEmit
PASS

pnpm build
$ next build
PASS — /trips static route and /trips/[slug] dynamic route present

pnpm test
Test Files  34 passed (34)
Tests       272 passed (272)
Duration    84.15s
```

The first typecheck identified only an unsafe cast in the intentionally malformed test fixture. The fixture was changed to cast through `unknown`; the production implementation did not require a type workaround, and the rerun passed.

### Self-review

- The invariant lives at the persisted domain boundary instead of in selectors or UI, so collection cards, conversions, and every slug-based mutator receive unambiguous canonical state.
- Both migration inputs and exact v2 envelopes traverse the same refinement; migration cannot silently collapse a duplicate or choose one based on object order.
- The new code does not mutate, normalize, delete, or overwrite either storage key when validation fails.
- No TSX changed in this fix round. Hydration/no-flicker behavior, selector granularity, derived state, and effect boundaries from the original React review are unaffected.

### Fix-round files

- `src/stores/trip-store.ts`
- `tests/unit/trip-store.test.ts`
