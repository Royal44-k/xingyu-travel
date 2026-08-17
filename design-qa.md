# 行屿 XINGYU — Design QA

## Comparison target

- Source visual truth: `docs/design/selected-homepage-option-1.png`
- Browser implementation: `http://127.0.0.1:4173/`
- Desktop evidence: `artifacts/home-desktop-1440x1024.png`
- Mobile evidence: `artifacts/home-mobile-390x844.png`
- Same-input comparison: `artifacts/design-comparison.png`
- Browser: locally installed Google Chrome through Playwright, headless capture
- State: homepage initial state, flight tab selected, Dali, 2026-08-22 to 2026-08-27, two travelers

## Normalization

- Source pixels: 1487 × 1058.
- Desktop implementation pixels and CSS viewport: 1440 × 1024 at `deviceScaleFactor: 1`.
- Source was proportionally displayed at 1440 × 1024; its aspect ratio differs by less than 0.1%, so no crop was introduced.
- Comparison pixels: 2880 × 1024, preserving each side at 1440 × 1024.
- Mobile implementation pixels and CSS viewport: 390 × 844 at `deviceScaleFactor: 1`; it was reviewed for reflow and overflow rather than pixel equality with the desktop source.

## Findings

- [P1 · closed] The global demo disclosure was obscured by the fixed navigation.
  - Location: global `.demoBanner` and the homepage overlay header.
  - Evidence: first Chrome capture placed both at `y = 0`; navigation blur made the disclosure unreadable and pushed the Hero down.
  - Impact: users could not reliably read the sandbox boundary, and the first-screen composition visibly drifted from the source.
  - Fix: position the disclosure immediately below the 82px header, remove it from document flow, and use an opaque ink surface with ivory text.
  - Post-fix evidence: `artifacts/home-desktop-1440x1024.png`; browser regression verifies the disclosure starts at or below the header edge.

- [P2 · closed] Hero and seasonal destinations were vertically displaced below the source composition.
  - Location: Hero copy, search area, Hero height, and featured-destinations top rhythm.
  - Evidence: first normalized measurement placed the title at 233px, composer at 587px, and first destination card at 892px; the source positions are approximately 194px, 516px, and 806px.
  - Impact: the planning action and editorial destination handoff felt less immediate, and materially less destination content appeared above the fold.
  - Fix: set desktop Hero height to 768px, copy top to 136px, search bottom to 60px, destination top padding to 38px, and intro alignment to the start.
  - Post-fix evidence: title approximately 194px, composer 517px, Hero boundary 768px, first card 806px in `artifacts/design-comparison.png`.

- [P1 · closed] The relocated disclosure failed WCAG AA contrast on light-background routes.
  - Location: global `.demoBanner`.
  - Evidence: Axe measured 2.62:1 on Square, Partners, Assistant, and Guardian after the first layout fix.
  - Impact: the compliance message was difficult to read and produced a serious accessibility violation.
  - Fix: increase the ink background to 94% opacity while retaining ivory text.
  - Post-fix evidence: six public-route Axe scans report no critical or serious violations.

- [P1 · closed] The mobile disclosure overlaid the first content block on non-home routes.
  - Location: the global disclosure and the Compare, Trip Workbench, Partners, Assistant, and Guardian page shells at 390px.
  - Evidence: the first content block began at `y = 0` or `y = 102px`, while the disclosure extended to approximately `y = 144.5px`; the focused Chrome regression failed on five of six routes.
  - Impact: page headings and controls could appear underneath the safety disclosure on a common phone viewport.
  - Fix: identify the homepage shell explicitly and reserve 154px of mobile top space on every other direct `main`, preserving the intentional homepage overlay composition.
  - Post-fix evidence: the same six-route local-Chrome regression passed 6/6 and verifies the first content block starts at or below the disclosure edge, with both closed and open navigation free of horizontal overflow.

- [P3 · accepted] The production Hero asset places the sun farther right than the concept image.
  - This is an intentional licensed-asset constraint: the implementation uses the generated `hero-dali-dawn.png`, keeps the same dark-left/bright-right mountain-lake art direction, and does not reuse hotel-brand imagery.

- [P3 · accepted] The visible disclosure strip and split departure/return inputs are more explicit than the concept image.
  - The disclosure is required to prevent the sandbox from being mistaken for a real OTA, and the separate date controls support real browser form semantics. Both retain the reference hierarchy and palette.

## Required fidelity surfaces

- Fonts and typography: Noto Serif SC is used for the editorial display hierarchy and Noto Sans SC for controls and body copy. Chrome confirmed the fonts loaded before measurement. Display weight, line height, wrapping, and optical hierarchy now closely follow the source; no truncation was observed.
- Spacing and layout rhythm: desktop title, search composer, Hero boundary, and destination cards align with the source within a small tolerance. Mobile stacks navigation and search fields without horizontal overflow.
- Colors and visual tokens: ink, ivory, sand, mist, and pine tokens preserve the warm editorial palette. The compliance surface now meets the automated AA contrast gate.
- Image quality and asset fidelity: all visible photography uses full-resolution generated PNG assets with intentional crops; no placeholder, emoji, CSS drawing, handcrafted SVG, watermark, or recognizable face is used.
- Copy and content: brand promise, comparison trust line, destination labels, sandbox limits, and task labels are coherent in the standalone product. The extra demo disclosure is a deliberate safety requirement.
- Icons and states: Phosphor icons share one stroke family; selected tabs, focus rings, hover motion, the mobile navigation, dialogs, disabled states, and reduced motion were exercised.

## Full-view and focused evidence

- Full-view comparison: `artifacts/design-comparison.png` keeps both sides at 1440 × 1024 in one 2880 × 1024 image.
- Focused review: the source and implementation files were also opened at native pixels to inspect navigation, disclosure text, title wrapping, search labels, icon alignment, card crops, and destination copy. Separate crops were unnecessary because the combined file preserves each side at 1:1 desktop pixels.
- Mobile review: `artifacts/home-mobile-390x844.png` shows a readable disclosure, collapsed navigation, intact Hero hierarchy, and the search entry without horizontal clipping.

## Interaction and accessibility evidence

- `pnpm test:e2e`: 20/20 passed in local Chrome.
- Covered the complete guide → trip → partner → chat → guardian Plan A journey.
- Covered keyboard search tabs, filter-dialog focus trap/Escape/restore, external-supplier confirmation, and reduced motion.
- Covered mobile closed/open navigation and horizontal overflow across Home, Compare, Square, Trip Workbench, Partners, Assistant, and Guardian.
- Checked console errors, page errors, and HTTP responses ≥400 during the browser suites; none remained.
- Axe reported zero critical or serious violations on six public routes.

## Comparison history

1. Initial capture: blocked by disclosure/header overlap and Hero vertical drift.
2. Iteration 1: moved disclosure outside the header; overlap regression changed from RED (`y = 0`) to GREEN (`y ≥ 82`).
3. Iteration 2: aligned Hero and seasonal destination geometry; three desktop visual boundaries changed from RED (233/587/892px) to GREEN (≤210/≤540/≤820px).
4. Iteration 3: Axe exposed disclosure contrast on light routes; opaque ink background closed all four failures and the final 20-test Chrome suite passed.
5. Review follow-up: mobile geometry checks exposed disclosure/content overlap on five non-home routes; the shared page-shell spacing rule changed the focused regression from 5 failures to 6/6 passed.

## Open questions

- None blocking. The generated Hero photo, compliance strip, and semantically richer date inputs are accepted product constraints rather than unresolved fidelity defects.

## Implementation checklist

- [x] Preserve the selected editorial mountain-and-lake direction.
- [x] Keep the demo boundary visible and readable without changing page flow.
- [x] Align desktop title, search entry, Hero boundary, and destination cards.
- [x] Verify desktop and mobile Chrome captures at the required viewports.
- [x] Verify navigation, main journey, dialogs, focus, reduced motion, console, HTTP failures, Axe, and mobile overflow.
- [x] Close every actionable P0, P1, and P2 finding.

## Follow-up polish

- P3: when a stable production image pipeline is selected, create an AVIF/WebP derivative of the Hero while retaining the current PNG as a high-quality fallback.
- P3: a future custom domain may replace the full-width disclosure with a persistent, equally explicit environment badge after legal/product review.

final result: passed
