# Task 4 Report: 沉浸式首页与统一搜索入口

## Result

Implemented the approved “山岚画册” homepage direction with an immersive real-image hero, semantic global navigation, an accessible three-product search composer, and a dark editorial destination strip. The exact H1 contract remains `把远方，变成一段安心抵达的旅程`.

## RED Evidence

Command:

```text
pnpm vitest run tests/component/search-composer.test.tsx tests/component/site-header.test.tsx
```

Observed result before production files existed:

```text
FAIL tests/component/search-composer.test.tsx
Failed to resolve import "@/features/home/search-composer"

FAIL tests/component/site-header.test.tsx
Failed to resolve import "@/components/site-header"

Test Files 2 failed (2)
```

This was the intended missing-component RED: both suites failed because the Task 4 components did not exist, rather than because of a malformed test.

## GREEN Evidence

Scoped component verification:

```text
pnpm vitest run tests/component/search-composer.test.tsx tests/component/site-header.test.tsx tests/component/home-shell.test.tsx
Test Files 3 passed (3)
Tests 8 passed (8)
```

Final verification:

```text
pnpm lint
eslint .

pnpm typecheck
tsc --noEmit

pnpm test
Test Files 7 passed (7)
Tests 43 passed (43)

pnpm build
Compiled successfully
Generating static pages (3/3)
/ prerendered as static content
```

Vitest required an unsandboxed run because Vite writes a temporary config cache under `node_modules`; the complete test suite itself was green.

## Visual Implementation Notes

- Used `brandAssets.hero`, `brandAssets.sichuan`, and `brandAssets.guilin` through `next/image`; no placeholder or fabricated imagery was introduced.
- Matched the selected direction with a viewport-scale mountain hero, restrained ivory/ink/sand palette, Noto Serif SC display typography, thin rules, low-radius controls, generous editorial spacing, and a dark destination continuation.
- Kept the search surface visually unified rather than splitting it into generic SaaS cards.
- Added purposeful Motion transitions for hero entrance, product-field switching, and destination hover; `useReducedMotion` and the global reduced-motion rule neutralize substantial movement.
- Desktop search aligns near the bottom of the hero. At mobile breakpoints, controls stack, the route and type scale down, horizontal page overflow is suppressed, and hero parallax is neutralized.
- Browser screenshot comparison and full responsive design QA are intentionally deferred to Task 12, as directed by the parent implementation plan.

## Interaction and Accessibility

- Header uses semantic links and a named navigation landmark. Only the active route receives `aria-current="page"`.
- Search uses a named tablist, roving tab focus, arrow/Home/End keyboard navigation, labeled tabpanel, visible focus styles, semantic form controls, and product-specific accessible labels.
- Flight, hotel, and ticket tabs change destination/date/traveler terminology; ticket mode removes the visible return-date field.
- Test injection is available through `onSubmit`. The browser default uses `window.location.assign` only when `window` exists.
- Comparison URLs are built with `URLSearchParams`; the verified default contract is `/compare?kind=flight&destination=%E5%A4%A7%E7%90%86&from=2026-08-22&to=2026-08-27&travelers=2`.

## Files

- `src/components/site-header.tsx`
- `src/components/site-header.module.css`
- `src/features/home/search-composer.tsx`
- `src/features/home/search-composer.module.css`
- `src/features/home/hero.tsx`
- `src/features/home/hero.module.css`
- `src/features/home/featured-destinations.tsx`
- `src/features/home/featured-destinations.module.css`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/test/setup.ts`
- `tests/component/search-composer.test.tsx`
- `tests/component/site-header.test.tsx`

## Commit

`feat: build immersive xingyu home search` (the implementation commit containing this report).

## Concerns

- Browser-rendered visual comparison, console inspection, and viewport screenshot evidence are deferred to Task 12; this task's verification is component, static-analysis, and production-build based.
- Destination, comparison, guardian, and trip links intentionally point at routes owned by later tasks. Task 4 does not implement those pages.

## Review Round 1

### RED

Added one rendered-homepage landmark test and one default-submission component test, then ran:

```text
pnpm vitest run tests/component/home-shell.test.tsx tests/component/search-composer.test.tsx --reporter=verbose
```

Observed the two intended failures:

```text
FAIL keeps the site banner outside the main content landmark
<main /> contains: <header />

FAIL uses the default submission path to assign the encoded comparison URL
expected assignLocation to be called once, but got 0 times

Test Files 2 failed (2)
Tests 2 failed | 6 passed (8)
```

The second failure also showed jsdom's expected `Not implemented: navigation to another Document` message, proving the old component still reached the real `window.location.assign` path instead of the requested test seam.

### Fixes

- Moved `SiteHeader` before `<main>` in a fragment so the top-level header retains its banner landmark.
- Exported the small `navigateToComparison` seam and added optional `assignLocation` dependency injection. Rendering `SearchComposer` without `onSubmit` now exercises the production default path while tests can safely observe the final assigned URL.
- Raised essential field-label foreground from 52% to 76% ink. Compositing `rgb(16 16 15 / 76%)` over ivory `#f4f0e8` yields approximately `rgb(71 70 67)` / `#474643`; WCAG relative-luminance calculation gives a contrast ratio of `8.30:1`, exceeding the `4.5:1` AA threshold for 11px text.

### GREEN

```text
Focused component tests: 2 files passed, 8 tests passed
Full test suite: 7 files passed, 45 tests passed
ESLint: passed
TypeScript: passed
Next.js production build: passed; / statically prerendered
```

Review fix commit: `fd4401e fix: address home review feedback`.
