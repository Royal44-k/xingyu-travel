# Task 7 Report: Square Discovery, Favorites, and Guide Gallery

## Result

Implemented the Task 7 square-discovery scope without changing persisted preference schemas or deploying:

- Browser-session-only search plus destination, theme, and maximum-day filters.
- Search coverage across title, excerpt, destination, tags, and location names.
- A recoverable no-results state whose clear action preserves recommendation/chronological mode and profile interests.
- Shared `FavoriteButton` state on both guide cards and guide detail routes.
- A non-autoplaying 3:2 guide gallery with previous/next controls, selected thumbnails, Home/End/Arrow keys, horizontal touch swipe, stable image-error framing, and same-source retry.
- State-driven card lift/glow, 3:2 card imagery, reduced-motion fallbacks, and single-column 390px reflow.

## TDD Evidence

The inherited test-only diff was preserved before production edits. The four pre-existing Node PID pairs were inspected read-only and identified as idle `@mastergo/magic-mcp` processes, not Vitest; none was terminated.

Initial serial RED exposed 8 failures and 10 passes. Four route tests first hit an unrelated `useRouter` test-harness invariant, so the harness was corrected without production edits. The clean feature RED then reported:

- Test files: 3 failed.
- Tests: 8 failed, 10 passed.
- Duration: 69.81s.
- Expected missing behavior: search/filter controls, detail favorite action, and accessible gallery controls.

Focused GREEN:

- Command: `pnpm test tests/component/square-feed.test.tsx tests/component/guide-gallery.test.tsx tests/component/favorite-sync.test.tsx --maxWorkers=1 --reporter=dot`
- Test files: 3 passed.
- Tests: 18 passed.
- Duration: 67.87s.

## Fresh Verification

- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm build`: exit 0; Next.js 16.2.12 compiled in 6.6s, TypeScript completed in 20.6s, and 14/14 static pages generated.
- Before the final full suite, process inspection returned `NO_ACTIVE_VITEST_PROCESS`.
- `pnpm test --maxWorkers=1 --reporter=dot`: 38 test files passed, 301 tests passed, duration 565.09s.
- `git diff --check`: no whitespace errors; only the repository's existing LF-to-CRLF warnings were printed.

The earlier interrupted full-suite attempt has deliberately not been counted as evidence.

## Review Hardening — Round 1/5

The first review pass was reproduced before production edits. Focused component RED reported 4 failures and 15 passes in 49.94s:

- Bubbled `End` from the next-image button changed the gallery from 3/4 to 4/4.
- A horizontal swipe on the thumbnail scroller changed the main gallery from 1/4 to 2/4.
- Three-image input did not fail the exact-four gallery contract.
- The seven-day maximum remained despite the catalog topping out at six days.

A separate CSS contract RED reported 2 failures in 6.03s for the missing search `:focus-within` ring and touch actions living on the wrong interaction boundaries.

The hardening changes now:

- Restrict Home/End/Arrow handling to the focused gallery region itself; key events from arrow, retry, and thumbnail buttons keep native control semantics.
- Bind swipe tracking only to the 3:2 main viewport. The thumbnail strip retains native horizontal scrolling, while touch-action declarations preserve vertical page movement and pinch zoom.
- Restore the search field's no-layout-shift focus ring with `--pine` against `--ivory` (11.87:1 contrast).
- Enforce four media items in destination data and `TravelPost` tuple types, pass the tuple directly at the detail route, and fail fast at the gallery runtime boundary for invalid three- or five-image input.
- Remove the non-narrowing seven-day filter option.
- Strengthen tests for independently active theme/day constraints, the actual empty-state CTA, fake-time no-autoplay, swipe threshold and vertical rejection, bubbled child keys, exact-four input, and the 390px thumbnail/focus/touch CSS contract.

Review-round GREEN and fresh verification:

- Focused: 3 files passed, 21 tests passed, duration 56.16s.
- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm build`: exit 0; compiled in 5.2s, TypeScript completed in 19.7s, and 14/14 static pages generated.
- `pnpm test --maxWorkers=1 --reporter=dot`: 39 files passed, 308 tests passed, duration 567.44s.
- `git diff --check`: no whitespace errors; only repository LF-to-CRLF notices.
- No browser/E2E run, ledger edit, or deployment was performed.

## Review Hardening — Round 2/5

The remaining no-op duration threshold was reproduced with a catalog-level behavior test before production edits:

- RED: 1 file, 1 failed and 11 passed, duration 25.68s. The UI exposed `[3, 4, 5, 6]`; six days excluded no guide because the current catalog maximum is six days.
- Fix: the explicit numeric thresholds are now `[3, 4, 5]`; `不限天数` remains available and filtering behavior is unchanged.
- The regression test enumerates every displayed numeric option and proves each threshold excludes at least one current guide.
- GREEN: 1 file, 12 tests passed, duration 23.31s.
- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- Per the review brief, no repeat build or full suite was run for this isolated one-line production change.
- No browser/E2E run, ledger edit, or deployment was performed.

## Self-review

- Scope remains inside `src/app/square`, `src/features/square`, and the three Task 7 component-test files.
- Filter state lives in React state only; it does not call `localStorage`, alter profile preferences, or persist across remounts.
- Clearing filters resets only filter values and leaves feed mode/interests untouched.
- Gallery renders only the current full-size image, uses real registered destination assets, and never substitutes a different destination after an image failure.
- Client components use direct imports, derived render state, functional state updates where prior state matters, stable semantic controls, visible focus, and no data-fetch waterfalls.
- Images and thumbnails retain a 3:2 frame; thumbnails use empty alt text because their buttons provide the accessible names.
- Motion stays within the approved 8px lift and 1.035 scale cap and is removed under `prefers-reduced-motion`.
- No E2E/browser visual capture, ledger edit, deployment, or production verification was performed in this task.

## Files

Created:

- `src/features/square/destination-filters.tsx`
- `src/features/square/guide-gallery.tsx`
- `tests/component/guide-gallery.test.tsx`

Modified:

- `src/app/square/page.tsx`
- `src/app/square/[slug]/page.tsx`
- `src/features/square/post-card.tsx`
- `src/features/square/square.module.css`
- `tests/component/square-feed.test.tsx`
- `tests/component/favorite-sync.test.tsx`
