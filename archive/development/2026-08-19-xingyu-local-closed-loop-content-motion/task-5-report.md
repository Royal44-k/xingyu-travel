# Task 5 implementation report

Status: DONE — FIX ROUND 1 VERIFIED

## RED evidence

Production source was untouched when the missing-feature test was added.

- Command: `pnpm test tests/component/profile-hub.test.tsx`
- Result: failed as expected because Vite could not resolve `@/features/profile/profile-hub`; 1 failed suite, 0 tests.
- The first sandboxed attempt could not create Vite's temporary config (`EPERM`), so the same command was rerun with permission to write the worktree temp file. The recorded RED is the second run's missing-module failure, not the sandbox error.

Two later requirements each received their own RED before implementation:

- Offer filtering/local-alert disclosure: 1 failed, 6 passed because the exact local-only reminder and product-kind controls were absent.
- Overview summary navigation: 1 failed, 7 passed because clicking the liked-guides summary did not activate the query-backed tab.

## GREEN implementation

- Added `HydrationBoundary`, which accepts domain readiness/error descriptors without reading store internals. It blocks all cross-domain interaction behind one neutral loading state, then names each failed domain while allowing unaffected domains to remain visible. Profile and library errors expose their owning stores' explicit reset actions.
- Added `ProfileHub({ initialTab })` and exported `ProfileTab` for `overview`, `trips`, `likes`, `offers`, `safety`, and `preferences`. Invalid values normalize to overview.
- Added semantic `tablist` / roving `tab` / named `tabpanel` behavior, ArrowLeft/ArrowRight/Home/End keyboard support, `history.pushState`, and `popstate` restoration.
- Aggregated only live selectors/records from profile, library, trip, and partner stores. No cross-domain data was copied into a profile store and no component reads `localStorage`.
- Reused `TripCollectionCard`, `FavoriteButton`, `PreferenceSettings`, `selectTripRecords`, and `selectAcceptedTripCount` from earlier tasks.
- Covered accepted trips, recently updated trips, liked guides, removed-guide slugs, saved offer snapshots, observed/expiry times, stale offer warnings, alerts, offer-kind filters, partner intent/matches, trusted-contact/check-in summaries, guarded trips, demo identity, and safety boundaries.
- Added recoverable empty states for trips, likes, and offers. Unavailable liked-guide records can be removed without crashing.
- Rebuilt `/profile` as a query-seeded server route with the approved dark editorial masthead and the existing ivory/ink/pine/sand system. The existing Dali dawn asset supplies the mountain-at-dusk backdrop; Noto Serif SC/Noto Sans SC remain unchanged.
- Added 390px reflow, visible focus, bounded hover motion, and a reduced-motion override.

## Frontend and React review

- Design review kept one signature gesture: the target board's identity-and-count masthead. Cards, state notices, and tabs stay visually restrained.
- Independent store hydrations start together with `Promise.all`, avoiding a client waterfall.
- Static tab metadata and formatters are module-scoped; sorted trip derivations use memoization; offer expiry uses a boundary-scheduled external clock rather than render-time derived state or polling.
- Components are split by domain panel and reuse existing components rather than duplicating them.
- The React purity lint finding on render-time `Date.now()` was corrected by capturing the stable profile-session reference outside render; the stale-offer behavior test stayed green.
- All interactive controls use native links/buttons, semantic labels, and visible focus. No handcrafted SVG or placeholder visual asset was introduced.

## Files

- Created `src/components/hydration-boundary.tsx`
- Created `src/features/profile/profile-hub.tsx`
- Created `src/features/profile/profile.module.css`
- Created `tests/component/profile-hub.test.tsx`
- Modified `src/app/profile/page.tsx`
- Modified `src/app/globals.css`
- Created this ignored report file

## Final terminal evidence

- `pnpm test tests/component/profile-hub.test.tsx`
  - 1 file passed, 8 tests passed.
- `pnpm test tests/component/profile-hub.test.tsx tests/component/preference-settings.test.tsx tests/component/favorite-sync.test.tsx tests/component/trip-collection.test.tsx tests/component/partner-flow.test.tsx`
  - 5 files passed, 26 tests passed, duration 26.92s.
- `pnpm lint`
  - exit 0, no warnings or errors.
- `pnpm typecheck`
  - exit 0.
- `pnpm build`
  - exit 0; Next.js 16.2.12 production build compiled, typechecked, generated 14/14 static pages, and emitted dynamic `/profile`.
- `pnpm test -- --maxWorkers=1 --reporter=dot`
  - one honest, non-overlapping full Vitest session (`96437`): 35 files passed, 280 tests passed, duration 121.11s.
- `git diff --check`
  - exit 0; only Windows line-ending notices from Git.

## Concerns

- The six round-one review findings are closed. Trip and partner recovery now remains owned by those stores and is invoked by `ProfileHub`; malformed raw bytes are preserved through incidental mutations and replaced only after the user deliberately resets the failed domain.
- No deployment was attempted, as required.

## Fix round 1

### Review findings and decisions

1. Partner-derived missed-check-in counts are hidden whenever partner hydration fails, while the independently trip-owned guarded-trip count remains available.
2. Saved offers use one shared external clock that schedules the next expiry boundary, transitions the visible status at that boundary, and refreshes its snapshot on subscription so remounts cannot reuse stale module-load time.
3. `trip-store` and `partner-store` now own explicit reset actions. A hydration error locks persistence so later incidental mutations cannot replace malformed raw bytes; only the corresponding reset action unlocks persistence and writes the empty valid envelope. `ProfileHub` only wires these owner actions to recovery controls.
4. Every tab's `aria-controls` target now exists in the DOM. Inactive panels are hidden and non-tabbable; the active panel remains labelled by its owning tab.
5. Overview shortcut buttons request focus for the destination panel after React commits the tab change. Keyboard tab navigation still hands focus to the newly active tab.
6. Small accent text and visible focus indicators now use explicit light/dark roles with WCAG contrast floors, while the approved sand token remains on dark editorial surfaces and decorative accents.

### RED evidence

- Inherited component RED: `pnpm test tests/component/profile-hub.test.tsx` produced 5 failed / 6 passed for dangling `aria-controls`, lost shortcut focus, non-transitioning expiry, stale expiry after remount, and the false partner-error count.
- Isolated HEAD-baseline unit RED: `pnpm test tests/unit/trip-store.test.ts tests/unit/partner-eligibility.test.ts tests/unit/profile-color-contrast.test.ts --maxWorkers=1 --reporter=verbose` produced 3 failed files, 2 failed / 69 passed tests. The baseline had no trip reset action, a partner mutation replaced malformed bytes before deliberate reset, and the profile contrast module did not exist. The isolated snapshot was removed after the run without changing the working tree.
- Typecheck RED during resume: `pnpm typecheck` identified the interrupted partner initial-state constant as readonly where `PartnerStoreState` requires mutable arrays. The constant now has an explicit owner-state `Pick` type.

### GREEN evidence

- Focused affected run: `pnpm test tests/component/profile-hub.test.tsx tests/unit/trip-store.test.ts tests/unit/partner-eligibility.test.ts tests/unit/profile-color-contrast.test.ts --maxWorkers=1 --reporter=verbose`
  - 4 files passed, 84 tests passed; final post-fix rerun duration 26.17s.
- Full Vitest run: `pnpm test --maxWorkers=1 --reporter=dot`
  - 36 files passed, 287 tests passed, duration 305.34s. No other test runner was active; pre-existing orphaned Node processes remained idle and were not terminated.
- `pnpm lint`: exit 0, no warnings or errors.
- `pnpm typecheck`: exit 0 after the mutable-state annotation correction.
- `pnpm build`: exit 0; Next.js 16.2.12 compiled, typechecked, generated 14/14 static pages, and emitted dynamic `/profile`.
- `git diff --check`: exit 0; only Git's existing Windows line-ending notices were emitted.
