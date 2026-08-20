# Task 8 Report: Signature Destination Film and Rich Home Story

## Result

Implemented the Task 8 homepage scope without changing persisted schemas, running a browser/E2E session, touching the ledger, or deploying:

- Replaced the two-card seasonal strip with a real eight-guide destination film sourced from the Task 6 post and destination-image registries.
- Enlarged the active destination while keeping both adjacent photographs partially visible.
- Added 6-second autoplay, hover/focus-within/page-hidden/drag pause behavior, pointer drag, previous/next controls, pagination, Home/End/Arrow keys, an accessible live position, and reduced-motion autoplay/parallax removal.
- Added four guide themes, true-total-price explanation, guide-to-trip example, AI/guardian scenario, trusted-partner boundary, and browser-local recent-trip/liked-guide content.
- Kept the local shelf server/client neutral until the client snapshot and both owning stores are hydrated, then derived content through store selectors without direct `localStorage` access.
- Kept every CTA on an existing route and every photograph tied to real destination metadata.

## TDD Evidence

Production files were unchanged when the Task 8 component contract was added.

Initial RED:

- Command: `pnpm test tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx`
- Test files: 2 failed.
- Existing home checks: 2 passed.
- Expected missing behavior: the carousel module did not exist; the home shell lacked the destination region, narrative modules, and local hydration status.

Focused GREEN:

- Command: `pnpm test tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx tests/component/search-composer.test.tsx`
- Test files: 3 passed.
- Tests: 16 passed.
- Covered timing, every pause source, pointer drag and cancellation, keyboard endpoints, pagination, reduced motion, real image/route metadata, all narrative CTAs, neutral hydration, local trip/like reveal, and the unchanged search composer.

## Design Evidence

- Read and followed the approved homepage target `docs/design/selected-homepage-option-1.png`, the content target `docs/design/xingyu-content-hub-target.png`, the full Task 8 brief, and the homepage/motion sections of the approved plan and spec.
- Followed the Product Design critical override at `C:/Users/lenovo/.codex/plugins/cache/openai-curated-remote/product-design/0.1.52/references/critical-overrides.md` and the local frontend-design guidance.
- Reused the approved tokens `#10100F`, `#F4F0E8`, `#B79A68`, `#26312B`, `#4D6B63`, and `#A94032`, plus the existing Noto Serif/Sans roles.
- Kept the moving travel viewfinder as the single new signature motion surface. Supporting cards use only state-driven focus/hover treatment; lift is 6px and image scale is capped at 1.035.
- Sand glow appears only on the active carousel card, active pagination, and hovered controls. No gradient, CSS drawing, inline/handcrafted SVG, fake map line, decorative numbering, or generic metric dashboard was added.
- The 390px rules collapse all grids, keep adjacent film edges visible inside an overflow-clipped viewport, preserve readable copy and focus, and remove large transforms under reduced motion.

## React Review Evidence

- Direct imports keep the client bundle boundary explicit; the static post-to-film mapping remains in the server composition.
- Transient pointer and pause state lives in refs so high-frequency movement and timer checks do not cause avoidable rerenders.
- Store subscriptions select only the liked slugs, trip records, and individual hydration booleans they render.
- Derived recent-trip and liked-guide data is memoized; no effect mirrors derived render state.
- `useSyncExternalStore` provides a stable false server snapshot and true client snapshot for hydration-safe local content without `setState` inside an effect.
- All controls are DOM-native buttons/links with Phosphor icons, visible focus, semantic grouping, and no child-key hijacking.

## Fresh Verification

- Focused home/search: 3 files, 16 tests passed.
- Full Vitest: 40 files, 316 tests passed; exit 0.
- `pnpm lint`: exit 0.
- `pnpm typecheck`: exit 0.
- `pnpm build`: exit 0; Next.js 16.2.12 compiled successfully and generated 14/14 static pages.
- `git diff --check`: no whitespace errors; only the repository's existing LF-to-CRLF notices were printed.
- No browser, Playwright/E2E, ledger, deployment, or unrelated MasterGo process action was performed.

## Files

Created:

- `src/features/home/destination-film-carousel.tsx`
- `src/features/home/home-story-sections.tsx`
- `tests/component/destination-film-carousel.test.tsx`

Modified:

- `src/features/home/featured-destinations.tsx`
- `src/features/home/featured-destinations.module.css`
- `src/app/page.tsx`
- `tests/component/home-shell.test.tsx`
