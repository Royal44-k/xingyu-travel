# 行屿 XINGYU — Design QA（2026-08-20）

## Comparison target

- Source visual truth: `docs/design/selected-homepage-option-1.png` and `docs/design/xingyu-content-hub-target.png`.
- Browser implementation: local production build at `http://127.0.0.1:4173`.
- Browser: locally installed Google Chrome through Playwright `channel: "chrome"`; this run did not use the in-app browser.
- Primary routes/states: `/`, `/square`, `/square/dali-slow-5d`, `/profile`, hover, focus, selected favorite, empty likes, expired offer, and malformed-library hydration error.
- Capture manifest: `artifacts/design-qa-2026-08-19/capture-manifest.json`.

## Normalization

- Homepage source pixels: 1487 × 1058; normalized to 1440 × 1024 beside a 1440 × 1024 CSS-pixel Chrome capture.
- Content-hub source pixels: 1705 × 923; the triptych is a directional composition board rather than a browser viewport. The full board preserves it in one input with three 1440 × 1024 implementation captures, normalized to 900 × 640 for the lower row.
- Desktop implementation: 1440 × 1024 CSS px at `deviceScaleFactor: 1`; screenshot pixels are 1440 × 1024.
- Mobile implementation: 390 × 844 CSS px at `deviceScaleFactor: 1`; screenshot pixels are 390 × 844.
- Every capture waited for route-specific content, `document.readyState === "complete"`, `document.fonts.status === "loaded"`, visible images with non-zero natural width, and the finite entrance motion to reach its settled state.

## Full-view comparison evidence

- Homepage: `artifacts/design-qa-2026-08-19/comparison-home-full.png`.
- Content hub: `artifacts/design-qa-2026-08-19/comparison-content-hub-full.png`.
- Responsive quartet: `artifacts/design-qa-2026-08-19/comparison-mobile-responsiveness.png`.

## Focused comparison evidence

- Navigation, Hero hierarchy, route cue, search controls, and trust line: `artifacts/design-qa-2026-08-19/comparison-home-focus.png`.
- Square, guide detail, and profile target-panel comparisons: `artifacts/design-qa-2026-08-19/comparison-content-hub-focus.png`.
- Hover, selected, focus, empty, expired, and hydration-error states: `artifacts/design-qa-2026-08-19/comparison-interaction-states.png`.

## Findings

No actionable P0, P1, or P2 finding remains in the valid route-ready comparison.

- [P3 · accepted] The generated Hero places the brightest sun and water reflection farther right than the homepage concept. The delivered asset keeps the same dark-left/bright-right mountain-lake art direction and avoids copied hotel-brand photography.
- [P3 · accepted] The implementation adds an explicit public-MVP disclosure, real date fields, a complete navigation inventory, and local-library entry points. These are required product and safety semantics; they preserve the reference hierarchy while making the standalone prototype honest and operable.
- [P3 · accepted] The content-hub target is a directional triptych with generated microcopy and a dark canvas. The implementation preserves its editorial serif hierarchy, sand/ink/pine tokens, image density, three-part information architecture, and dark identity header, while using ivory reading surfaces for accurate long-form copy, form controls, and recoverable browser-local states.
- [P3 · follow-up] The 390 px profile tab rail intentionally scrolls horizontally and leaves the next label partially visible as a continuation cue. A future polish pass may add a subtle end fade, provided it does not hide focus or reduce tab contrast.

## Required fidelity surfaces

- Fonts and typography: Noto Serif SC carries display hierarchy and Noto Sans SC carries controls, data, and body copy. The manifest confirms fonts were loaded before capture; headings, labels, dates, and long Chinese strings remain readable without truncation.
- Spacing and layout rhythm: the homepage retains the overlay navigation, left-weighted Hero, central planning surface, and editorial handoff. Square, detail, and profile use stable content widths, consistent section rules, restrained radii, and 390 px reflow with document width equal to viewport width.
- Colors and visual tokens: ink `#10100F`, ivory `#F4F0E8`, sand `#B79A68`, pine `#26312B`, lake jade `#4D6B63`, and cinnabar `#A94032` remain legible across normal, selected, warning, and error states.
- Image quality and asset fidelity: visible generated photography is sharp, location-specific, consistently cropped, and complete in the manifest. No placeholder, emoji, CSS drawing, inline SVG imitation, watermark, logo, or recognizable face substitutes source imagery.
- Copy and content: interface text is coherent outside the design board, names the browser-local boundary, distinguishes snapshot prices from live inventory, and gives every empty/error state a recovery action.
- Icons and interactions: Phosphor icons retain one stroke family. Hover lift/glow, favorite fill, carousel selection, gallery focus, tabs, empty/expired/error states, touch-sized controls, keyboard navigation, and reduced motion are covered by screenshots and E2E.

## Interaction, accessibility, and runtime evidence

- Local Chrome capture: 15 route/state screenshots; zero `console.error`, page errors, HTTP responses ≥400, or console warnings in the capture manifest.
- `pnpm test:e2e`: 30/30 passed in 1.2 minutes using local Chrome, including four browser-local closed loops, nine 390 × 844 routes, six Axe scans, keyboard focus, dialogs, and reduced motion.
- Axe: no critical or serious violations on home, square, detail, profile, trips, and compare.
- Responsive evidence: all four primary captures report `documentWidth === viewportWidth`; the broader E2E route matrix also passed closed/open navigation overflow checks.

## Comparison history

1. Evidence preflight found that an early automated homepage capture sampled the 800 ms Motion entrance before the Hero copy settled. This was a capture-readiness defect, not a product finding.
2. The capture script added a computed-opacity readiness condition, then recaptured at the identical route, viewport, density, and state.
3. The rebuilt full and focused same-input boards show the settled implementation. Inspection found no actionable P0/P1/P2 mismatch, so no production source change was made during Design QA.

## Implementation checklist

- [x] Source and implementation appear in the same full and focused comparison inputs.
- [x] Desktop and mobile captures use the required CSS viewports and density.
- [x] Route readiness, fonts, visible images, states, interactions, console, accessibility, and overflow are evidenced.
- [x] Objective deviations are classified as required product constraints or P3 follow-up, not silently ignored.
- [x] No actionable P0/P1/P2 remains.

final result: passed
