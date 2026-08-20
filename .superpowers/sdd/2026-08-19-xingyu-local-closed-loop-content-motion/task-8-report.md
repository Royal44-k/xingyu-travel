# Task 8 Report: Signature Destination Film and Rich Home Story

## Result

Implemented the Task 8 homepage scope without changing persisted schemas, running a browser/E2E session, touching the ledger, or deploying:

- Replaced the two-card seasonal strip with a 12-stop destination film: all eight Task 6 guide cities plus Beijing, Xi’an, Chongqing, and Xiamen discovery stops.
- Enlarged the active destination while keeping both adjacent photographs partially visible.
- Added 6-second autoplay, hover/focus-within/page-hidden/drag pause behavior, pointer drag, previous/next controls, pagination, Home/End/Arrow keys, an accessible live position, and reduced-motion autoplay/parallax removal.
- Hardened pointer handling so nested destination links keep native tap activation: interactive targets are excluded and pointer capture begins only after horizontal drag intent.
- Replaced the perpetual interval with one restartable timeout, giving resume, controls, pagination, and drag selection a new full six-second dwell without duplicate autoplay deadlines.
- Kept only the active slide accessible and interactive while adjacent images remain visual peeks; only the active and adjacent images mount with high fetch priority.
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
- Tests: 23 passed after review hardening.
- Covered timing, every pause source, pointer drag and cancellation, keyboard endpoints, pagination, reduced motion, real image/route metadata, all narrative CTAs, neutral hydration, local trip/like reveal, and the unchanged search composer.

Review round 1 RED/GREEN:

- Initial RED command: `pnpm test tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx`
- Initial RED result: 7 expected failures and 10 existing passes. Failures demonstrated the premature nested-link pointer capture, non-restartable interval, adjacent tabbability, eager image mounting, eight-item production mapping, and oldest-first liked-guide selection.
- Additional interaction-boundary RED: the inactive-slide `inert` assertion failed 1 of 12 carousel tests before production added the inert boundary.
- GREEN command: `pnpm test tests/component/destination-film-carousel.test.tsx tests/component/home-shell.test.tsx tests/component/search-composer.test.tsx`
- GREEN result: 3 files and 23 tests passed.

Review round 2 focus-contract resolution:

- The timer concern conflicted with the approved product behavior: autoplay must remain paused while keyboard or pointer focus is anywhere inside the carousel. A native pointer/focus/click regression now selects the next destination, holds it indefinitely while the control retains focus, moves focus outside the carousel, then proves that autoplay waits a fresh 5999ms and advances only on the final millisecond.
- That focus regression passed against the existing production implementation before any production edit, so timer logic was intentionally left unchanged. Making a clicked or focused control autoplay would regress keyboard and pointer accessibility.
- Valid RED: the new control-size contract reported the existing previous/next dimensions as 42px, below the required 44px minimum.
- GREEN: previous/next controls are now 44×44px; focused carousel plus style-contract run passed 2 files and 14 tests.
- The four discovery-only CTAs are asserted as exact encoded links to the existing `/square` route. Query-seeding behavior was not expanded.

## ImageGen Assets and Provenance

Each discovery-only city used exactly one call to the built-in `image_gen` tool. Generation was not performed through a CLI. Originals remain in the generated-image directory; copies live at clear production paths. All four copies were individually opened with `view_image`, confirmed as 1536×1024, and accepted for destination geography, natural photographic treatment, responsive crop, and absence of overlay text, readable signs, logos, watermarks, or recognizable faces.

### Beijing

- Exact prompt: `Create one photorealistic natural editorial travel photograph at exactly 1536×1024 pixels (3:2 landscape) for a premium China destination carousel. Beijing at dawn: a geographically accurate elevated long-lens view along Beijing’s historic central axis with the Forbidden City palace roofs and Meridian Gate architecture recognizable in warm first light, subtle morning haze, restrained cinematic color, believable stone and glazed-tile texture, calm spacious composition with the visual subject centered for responsive cropping. No gradients or illustration styling. No text, no readable signs, no logos, no watermark, no borders, no UI, no recognizable faces; any people must be tiny anonymous background silhouettes.`
- Generated original: `C:/Users/lenovo/.codex/generated_images/01a01db4-a504-7232-95e8-d3187a66dcad/exec-a64474ac-73bc-4457-afaa-96afde3dbb27.png`
- Workspace copy: `public/assets/home-film/beijing-forbidden-city-dawn.png`
- SHA-256: `61FF2127073A3320233C1431C4D4D85062BA0C18693014DCBBF69211174CDCA3`
- Inspection: accepted; Forbidden City palace roofs and Beijing axis read correctly at dawn, with no readable sign, overlay, logo, watermark, or identifiable person.

### Xi’an

- Exact prompt: `Create one photorealistic natural editorial travel photograph at exactly 1536×1024 pixels (3:2 landscape) for a premium China destination carousel. Xi’an at dusk: a geographically accurate wide view of the intact Xi’an Ming city wall with a traditional corner/watch tower, crenellated brick ramparts and the surrounding modern city held quietly beyond, blue-and-amber twilight after sunset, believable masonry and soft practical lantern light, restrained cinematic color, calm spacious composition with the historic wall centered for responsive cropping. No gradients or illustration styling. No text, no readable signs, no logos, no watermark, no borders, no UI, no recognizable faces; any people must be tiny anonymous background silhouettes.`
- Generated original: `C:/Users/lenovo/.codex/generated_images/01a01db4-a504-7232-95e8-d3187a66dcad/exec-f5335e32-ac1f-4aff-845f-03b72b6608e8.png`
- Workspace copy: `public/assets/home-film/xian-city-wall-dusk.png`
- SHA-256: `537E60285AB987A0B5968BFB8F9959416BF1FA4CF0F9AE63F329540B1A27DF6D`
- Inspection: accepted; the Ming wall, brick ramparts, tower, and dusk city context are geographically coherent with no prohibited marks or faces.

### Chongqing

- Exact prompt: `Create one photorealistic natural editorial travel photograph at exactly 1536×1024 pixels (3:2 landscape) for a premium China destination carousel. Chongqing at blue hour: a geographically convincing wide view of the steep layered mountain city rising beside the meeting of broad rivers, dense illuminated towers and hillside neighborhoods, a bridge crossing the water, humid blue atmosphere and subtle reflections, emphasizing Chongqing’s vertical river-city terrain rather than a generic skyline, restrained cinematic color, calm composition centered for responsive cropping. No gradients or illustration styling. No text, no readable signs, no logos, no watermark, no borders, no UI, no recognizable faces; any people must be tiny anonymous background silhouettes.`
- Generated original: `C:/Users/lenovo/.codex/generated_images/01a01db4-a504-7232-95e8-d3187a66dcad/exec-05141445-2203-4a31-a3e0-787d80995e55.png`
- Workspace copy: `public/assets/home-film/chongqing-river-city-blue-hour.png`
- SHA-256: `A5F538F8BDEAB2CE3A2B865D32E65E8197AC726BE63F5848DCEE6C879BB6AB97`
- Inspection: accepted; layered hillside construction, broad river, bridge, and blue-hour atmosphere clearly communicate Chongqing without prohibited marks or faces.

### Xiamen

- Exact prompt: `Create one photorealistic natural editorial travel photograph at exactly 1536×1024 pixels (3:2 landscape) for a premium China destination carousel. Xiamen in soft morning light: a geographically convincing coastal view from Gulangyu with subtropical greenery, weathered red-roofed historic villas, calm blue water and the Xiamen island skyline across the channel, gentle sea haze, natural Fujian coast atmosphere, restrained cinematic color, spacious composition centered for responsive cropping. No gradients or illustration styling. No text, no readable signs, no logos, no watermark, no borders, no UI, no recognizable faces; any people must be tiny anonymous background silhouettes.`
- Generated original: `C:/Users/lenovo/.codex/generated_images/01a01db4-a504-7232-95e8-d3187a66dcad/exec-e9598c60-12c1-4956-ab50-125a8b67d4f7.png`
- Workspace copy: `public/assets/home-film/xiamen-gulangyu-morning.png`
- SHA-256: `C9A83BDE2B7D1043B59D80B71432DBEDD85BB2D3D60FE801E7124787459D01AB`
- Inspection: accepted; Gulangyu’s red-roof villas, subtropical shore, channel, and Xiamen skyline read correctly with no prohibited marks or recognizable faces.

## Design Evidence

- Read and followed the approved homepage target `docs/design/selected-homepage-option-1.png`, the content target `docs/design/xingyu-content-hub-target.png`, the full Task 8 brief, and the homepage/motion sections of the approved plan and spec.
- Followed the Product Design critical override at `C:/Users/lenovo/.codex/plugins/cache/openai-curated-remote/product-design/0.1.52/references/critical-overrides.md` and the local frontend-design guidance.
- Reused the approved tokens `#10100F`, `#F4F0E8`, `#B79A68`, `#26312B`, `#4D6B63`, and `#A94032`, plus the existing Noto Serif/Sans roles.
- Kept the moving travel viewfinder as the single new signature motion surface. Supporting cards use only state-driven focus/hover treatment; lift is 6px and image scale is capped at 1.035.
- Sand glow appears only on the active carousel card, active pagination, and hovered controls. No gradient, CSS drawing, inline/handcrafted SVG, fake map line, decorative numbering, or generic metric dashboard was added.
- The 390px rules collapse all grids, keep adjacent film edges visible inside an overflow-clipped viewport, preserve readable copy and focus, and remove large transforms under reduced motion.
- Twelve 44px pagination targets wrap within a 354px mobile content width while their visual pills stay restrained; no horizontal overflow is introduced.
- Previous/next controls also use a measured 44×44px target while retaining the existing restrained circular treatment.

## React Review Evidence

- Direct imports keep the client bundle boundary explicit; the static post-to-film mapping remains in the server composition.
- High-frequency pointer origin and drag intent stay in a ref; pause booleans live in state because they own timeout lifecycle and must synchronously clear/restart the single autoplay deadline.
- Store subscriptions select only the liked slugs, trip records, and individual hydration booleans they render.
- Derived recent-trip and newest-valid liked-guide data is memoized; reversing a copy preserves store order and no effect mirrors derived render state.
- `useSyncExternalStore` provides a stable false server snapshot and true client snapshot for hydration-safe local content without `setState` inside an effect.
- All controls are DOM-native buttons/links with Phosphor icons, visible focus, semantic grouping, and no child-key hijacking.

## Fresh Verification

- Review round 2 focused carousel/home/style contract: 3 files, 19 tests passed.
- Focused home/search: 3 files, 23 tests passed.
- Full Vitest: 40 files, 323 tests passed; exit 0.
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
