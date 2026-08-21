# 行屿 XINGYU — Design QA（2026-08-21）

## Comparison target

- Source visual truth: `docs/design/selected-homepage-option-1.png` and `docs/design/xingyu-content-hub-target.png`.
- Browser implementation: local production build at `http://127.0.0.1:4173`.
- Browser: locally installed Google Chrome through Playwright `channel: "chrome"`; this run did not use the in-app browser.
- Primary routes/states: `/`, `/square`, `/square/dali-slow-5d`, `/profile`, hover, focus, selected favorite, empty likes, expired offer, malformed-library hydration error, Beijing discovery CTA, assistant with no trip, assistant trip-hydration error, assistant saved-plan success, workbench partner-hydration error, assistant latest-request failure, assistant plan-persistence failure, and workbench second-write failure.
- Capture manifests: `artifacts/design-qa-2026-08-19/capture-manifest.json`, `artifacts/final-fixes-2026-08-21/local-design-qa.json`, and `artifacts/final-fixes-round2-2026-08-21/local-design-qa.json`.

## Normalization

- Homepage source pixels: 1487 × 1058; normalized to 1440 × 1024 beside a 1440 × 1024 CSS-pixel Chrome capture.
- Content-hub source pixels: 1705 × 923; the triptych is a directional composition board rather than a browser viewport. The full board preserves it in one input with three 1440 × 1024 implementation captures, normalized to 900 × 640 for the lower row.
- Desktop implementation: 1440 × 1024 CSS px at `deviceScaleFactor: 1`; screenshot pixels are 1440 × 1024.
- Mobile implementation: 390 × 844 CSS px at `deviceScaleFactor: 1`; screenshot pixels are 390 × 844.
- Final-fix spot captures: 1440 × 1024 CSS px at `deviceScaleFactor: 1`; viewport screenshots are 1440 × 1024 pixels and the two assistant full-page states are 1440 × 1649 and 1440 × 1634 pixels. The combined comparison board is 1920 × 2846 pixels.
- Second-round spot captures: 1440 × 1024 CSS px at `deviceScaleFactor: 1`; all three report `documentWidth === viewportWidth`. Full-page heights are 1024, 1634, and 3602 pixels for latest-request failure, plan-persistence failure, and workbench second-write failure respectively.
- Every capture waited for route-specific content, `document.readyState === "complete"`, `document.fonts.status === "loaded"`, visible images with non-zero natural width, and the finite entrance motion to reach its settled state.

## Full-view comparison evidence

- Homepage: `artifacts/design-qa-2026-08-19/comparison-home-full.png`.
- Content hub: `artifacts/design-qa-2026-08-19/comparison-content-hub-full.png`.
- Responsive quartet: `artifacts/design-qa-2026-08-19/comparison-mobile-responsiveness.png`.
- Final affected surfaces beside both visual-truth inputs: `artifacts/final-fixes-2026-08-21/comparison-affected-surfaces.png`.
- Second-round affected surfaces beside both visual-truth inputs: `artifacts/final-fixes-round2-2026-08-21/comparison-affected-surfaces.png`.

## Focused comparison evidence

- Navigation, Hero hierarchy, route cue, search controls, and trust line: `artifacts/design-qa-2026-08-19/comparison-home-focus.png`.
- Square, guide detail, and profile target-panel comparisons: `artifacts/design-qa-2026-08-19/comparison-content-hub-focus.png`.
- Hover, selected, focus, empty, expired, and hydration-error states: `artifacts/design-qa-2026-08-19/comparison-interaction-states.png`.
- Affected-state readable captures: `artifacts/final-fixes-2026-08-21/homepage-beijing-cta.png`, `assistant-fresh-no-trip.png`, `assistant-hydration-error.png`, `assistant-existing-trip-saved.png`, and `workbench-partner-hydration-error.png` in the same artifact directory. The source boards do not prescribe assistant/workbench null or persistence-error states, so these were judged against the established typography, spacing, tokens, copy, recovery, and control-state system rather than claiming pixel identity to an absent source state.
- Second-round readable captures: `artifacts/final-fixes-round2-2026-08-21/assistant-latest-request-failure.png`, `assistant-plan-persistence-error.png`, and `workbench-second-write-error.png`. They were inspected individually after opening the combined same-input board.

## Findings

No actionable P0, P1, or P2 finding remains in the valid route-ready comparison.

- [Passed · final-fix spot check] The Beijing film keeps the dark editorial treatment while the visible CTA truthfully says `比价北京行程`; the destination is no longer presented as a nonexistent guide.
- [Passed · final-fix spot check] Fresh-user and hydration-error assistant states clearly separate advice-only use from trip persistence. Plan A/B/C remains readable, selection controls appear only for a real trip, and saved status appears only after a successful selection.
- [Passed · final-fix spot check] The partner-store error appears adjacent to the disabled publish action in the decision room, preserves the established error color, and explains the recovery boundary without collapsing the surrounding layout.
- [Passed · second-round spot check] A failed latest Assistant request removes the older Plan A/B/C cards and save controls, leaves a concise retry message adjacent to the prompt, and does not create a blank or misleading result panel.
- [Passed · second-round spot check] Browser quota failure leaves the current structured advice readable but shows no saved status or selected control. The revised message accurately distinguishes persistence failure from a missing trip.
- [Passed · second-round spot check] A failed TripStore marker write compensates the PartnerStore intent, returns the publish button to an enabled retry state, and places the error immediately beside that control without disturbing the long workbench layout.

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
- Final-fix state fidelity: the new context/error panels reuse the existing ivory, sand, pine, and cinnabar tokens; display/body type roles, grid rhythm, button hierarchy, and focus semantics remain consistent. The homepage keeps location-specific sharp imagery; the assistant and decision-room changes require no new image asset and introduce no placeholder or improvised iconography.
- Icons and interactions: Phosphor icons retain one stroke family. Hover lift/glow, favorite fill, carousel selection, gallery focus, tabs, empty/expired/error states, touch-sized controls, keyboard navigation, and reduced motion are covered by screenshots and E2E.

## Interaction, accessibility, and runtime evidence

- Local Chrome capture: the original 15 route/state screenshots and the final five affected-state screenshots recorded zero `console.error`, page errors, HTTP responses ≥400, or console warnings in their manifests.
- Second-round local Chrome capture: all three new affected-state screenshots recorded zero `console.error`, console warnings, page errors, or HTTP responses ≥400. The controlled latest-request failure used an application-shaped 200 error payload so the visual state could be exercised without introducing an intentional browser network error.
- Annotated Hero-layout capture: `artifacts/hero-layout-fix-2026-08-21/comparison-board.png` compares the public pre-fix page and local fix at the same 1024 × 640 CSS viewport, `deviceScaleFactor: 1`, and `scrollY: 192`. Runtime issues were zero in both captures; the copy-to-planner gap increased from 56.0 px to 128.0 px.
- Fresh second-round `pnpm test:e2e`: 31/31 passed in 1.2 minutes using local Chrome, including the discovery-city prefill contract, four browser-local closed loops, nine 390 × 844 routes, six Axe scans, keyboard focus, dialogs, and reduced motion. The earlier final-review run remains recorded as 31/31 in 1.4 minutes.
- Axe: no critical or serious violations on home, square, detail, profile, trips, and compare.
- Responsive evidence: all four primary captures report `documentWidth === viewportWidth`; the broader E2E route matrix also passed closed/open navigation overflow checks.

## Comparison history

1. Evidence preflight found that an early automated homepage capture sampled the 800 ms Motion entrance before the Hero copy settled. This was a capture-readiness defect, not a product finding.
2. The capture script added a computed-opacity readiness condition, then recaptured at the identical route, viewport, density, and state.
3. The rebuilt full and focused same-input boards show the settled implementation. Inspection found no actionable P0/P1/P2 mismatch, so no production source change was made during Design QA.
4. The first final-fix spot script used an overly broad `alert` locator that also matched Next.js's empty route announcer; the locator was narrowed to visible product copy. A subsequent full-page capture retained a prior scroll position and placed the sticky header mid-image; the capture was normalized to `scrollY === 0` and rebuilt. These were evidence-readiness defects, not product defects.
5. The normalized `comparison-affected-surfaces.png` was opened and inspected with both source visual-truth inputs in the same comparison. No actionable P0/P1/P2 difference remained, so no post-comparison production CSS or component change was required.
6. The second-round capture initially matched Next.js's empty route announcer in addition to the product alert; the locator was narrowed to visible product copy. A deliberate HTTP 503 also produced expected browser console noise, so the harness switched to an application-shaped error payload with HTTP 200. These were evidence-harness defects only. The clean rerun recorded three captures with zero runtime errors or warnings.
7. `artifacts/final-fixes-round2-2026-08-21/comparison-affected-surfaces.png` and all three readable captures were opened and inspected. No actionable P0/P1/P2 visual finding remained.
8. The first second-round Preview verifier found a fresh-browser persistence-only defect: compensation changed absent PartnerStore bytes into an empty envelope. `6d10ef2` restores the absent state exactly. The visible workbench failure state and copy are unchanged, so the already-inspected `workbench-second-write-error.png` remains the accurate UI evidence and no redundant recapture was required.
9. The third-round fix moves the exact persistence snapshot and rollback behind the PartnerStore owner API. TripWorkbench no longer reads a storage key or `localStorage`; its rendered branches, error copy, controls, layout, and styles are unchanged. The existing `workbench-second-write-error.png` therefore remains source-faithful evidence, and another visually identical recapture would add no Design QA signal.
10. Browser annotation review found a P2 spacing issue at the 1024 px compact-desktop breakpoint: the planner became two rows tall while the Hero remained 768 px, leaving the lower copy visually crowded. The regression first measured an insufficient 38 px layout gap. The compact-desktop Hero now grows to 840 px, moving the complete planner downward without changing typography, imagery, controls, or mobile/large-desktop geometry. The normalized same-input board was opened and inspected; the final 128 px visual gap removes the crowding and introduces no new P0/P1/P2 issue.
11. A subsequent Chrome screenshot exposed a separate wide-desktop P2: the fluid headline wrapped while the description, route, and planner were independently absolutely positioned. At 2280 × 858 the public page measured a -32.078 px description-to-planner gap and the route sat 1814 px to the right on the bright sun area. The Hero narrative is now one natural vertical flow: complete copy, left-aligned `大理—丽江 / 下一站`, then planner. The fixed implementation measures 32 px from description to route, 32 px from route to planner, 104 px from description to planner, and 0 px left-alignment delta, with the planner fully contained and zero runtime issues. The supplied source is a 2280 × 858 physical-pixel Chrome screenshot whose CSS viewport density/zoom is unavailable, so visual boards are used for ordering and contrast comparison while DOM bounds independently prove geometry. Both `wide-comparison-board.png` and the focused `wide-focused-comparison.png` were opened and inspected; no actionable P0/P1/P2 remains.

## Remote release evidence

- Protected Preview `dpl_7bL9cTHePAJyGgKrJDeQzewJyGoM`, from exact clean commit `cc88e274c628457eb74af587a19e22a2991911b3`, passed `preview-round3-final-verification-clean.json`: 9/9 routes, 2/2 assets, 8/8 affected flows, and 4/4 closed loops; zero runtime errors or warnings. A fresh unauthenticated Chrome context still reached Vercel login. The verifier only read the existing official Automation Bypass in process memory and created no bypass entry.
- The exact verified artifact was promoted to public Production `dpl_8Cr2HkEChsnCn1Mn6mkaBn7xQYWp`. `production-round3-final-verification-clean.json` repeated the same matrix through `https://xingyu-travel.vercel.app` in a fresh Chrome context without credentials or bypass headers and passed with zero runtime errors, warnings, page errors, or HTTP responses >=400.
- The bounded one-hour Production error-log query returned no entry. Security headers remained `nosniff`, strict-origin referrer policy, camera/microphone/geolocation denial, and `SAMEORIGIN` framing. Preview-only SSO was not changed.
- A first Preview pass recorded one Next-generated CSS preload timing warning; the unique same-artifact full recheck was clean. A first Production pass recorded one navigation `net::ERR_FAILED`; an instrumented exact-flow diagnostic recorded no console or request failure, and the unique same-artifact full recheck was clean. Neither transient produced an HTTP response >=400, page error, repeatable application defect, source change, or verifier suppression.
- The annotated-layout release used exact source commit `fef5e9783e86403d1be7dc697903e3b6643d8e04`. Protected Preview `dpl_3yUEAhcETakJiWN3cmzo3PNNms73` passed the clean full matrix (9 routes, 2 assets, 8 affected flows, 4 closed loops, zero runtime errors/warnings) and an explicit 1024 × 640 check measured a 127.96875 px copy-to-planner gap. That exact artifact was promoted to public Production `dpl_A7BPmyHbnyxQ2KKWDhRoQi4q1L9u`; the unauthenticated full matrix and focused 1024 × 640 check repeated cleanly, and the bounded error-log scan returned no entry. Preview-only SSO remained unchanged.
- The wide-Hero correction used exact source commit `755275eb5c59ce75f060f564318fd03fce528c87`. Protected Preview `dpl_6jLp72iYZFNybpo8qD5NMJWkTdGE` passed 9/9 routes, 2/2 assets, 8/8 affected flows, 4/4 closed loops, and the focused 2280 × 858 layout contract with zero runtime issues. The exact artifact was promoted to public Production `dpl_5fKKMYN7AHXD5dygYWonN17E6xho`; unauthenticated Chrome repeated the complete matrix and measured 32 px description-to-route, 32 px route-to-planner, 104 px total clearance, and 0 px left-alignment delta. The error-log scan returned no entry and Preview-only SSO remained unchanged.

## Implementation checklist

- [x] Source and implementation appear in the same full and focused comparison inputs.
- [x] Desktop and mobile captures use the required CSS viewports and density.
- [x] Route readiness, fonts, visible images, states, interactions, console, accessibility, and overflow are evidenced.
- [x] Beijing CTA, assistant no-trip/error/saved, and workbench partner-error states are captured at identical desktop viewport and density with zero runtime errors.
- [x] Assistant latest-failure/quota-error and workbench second-write-error states are captured at identical desktop viewport and density with zero runtime errors or warnings.
- [x] The annotated 1024 px Hero spacing issue is reproduced, fixed, recaptured at the same scroll state, and compared in one board with zero runtime issues.
- [x] The wide Chrome Hero overlap is reproduced, converted to a copy → route → planner flow, and verified at 2280 × 858 with exact bounds and zero runtime issues.
- [x] Objective deviations are classified as required product constraints or P3 follow-up, not silently ignored.
- [x] No actionable P0/P1/P2 remains.

final result: passed
