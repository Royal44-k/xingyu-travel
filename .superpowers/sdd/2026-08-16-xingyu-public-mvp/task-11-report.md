# Task 11 verification report — complete journey E2E, responsive, and accessibility

## Scope and inherited state

- Baseline: `994a05a`.
- Inherited GREEN evidence: initial core journey `1 passed (22.3s)`, mobile navigation at `390x844` `1 passed`, homepage axe critical/serious `0`, and initial keyboard search/tab plus filter-dialog focus checks.
- Confirmed in the worktree: E2E runtime collectors fail on `console.error`, `pageerror`, and every HTTP status `>=400`; the full public-journey, mobile-nav, a11y, dialog, external-confirmation, and reduced-motion checks all use those collectors.

## New and resumed verification

The desktop foreground command boundary cut long Playwright commands at about 31 seconds without a terminal reporter result. I did not classify those runs as passes. `pnpm exec playwright` also failed immediately with `'playwright' is not recognized`, despite the local binary being present. I used the local `node_modules/.bin/playwright.cmd` in a detached task-local process with `--workers=1 --reporter=list`, while a task-local Next server on port 4173 was running and verified with HTTP 200. The captured reporter outputs were:

| Command / scope | Terminal result |
| --- | --- |
| `responsive.spec.ts --grep=trips` | 1 passed (4.3s) |
| responsive routes `/compare`, `/square`, `/partners`, `/assistant`, `/guardian/dali-slow-5d` | each 1 passed (3.1–4.3s) |
| axe routes `/`, `/compare`, `/square`, `/partners`, `/assistant`, `/guardian/dali-slow-5d` | each 1 passed (3.8–4.3s); no critical/serious violations |
| external quote confirmation | 1 passed (3.6s) |
| reduced motion | 1 passed (3.3s) |
| `core-journey.spec.ts --workers=1 --reporter=list` | 1 passed (12.3s) |
| `responsive.spec.ts --workers=1 --reporter=list` | 7 passed (8.9s) |
| `accessibility.spec.ts --workers=1 --reporter=list` | 10 passed (17.1s), including keyboard tabs/search, dialog focus trap/Escape/trigger restore, external confirmation, and reduced motion |
| `pnpm test:e2e` | 18 passed (22.7s) |

The detached Node processes emitted only the environmental warning that `NO_COLOR` is ignored because `FORCE_COLOR` is set. No E2E runtime collector reported console, page, or nonexpected HTTP errors.

## Verification fix from observed RED

The first `pnpm verify` exited 1 after lint and typecheck:

- Vitest's default glob collected the newly added Playwright `tests/e2e/*.spec.ts` as three zero-test files.
- `site-header.test.tsx` still expected the obsolete `/guardian/demo`, while the Task 11 header route intentionally points at the existing `/guardian/dali-slow-5d` route.
- `risk-timeline.test.tsx` still expected the former button accessible name, while Task 11 adds the `Plan A` qualifier needed by the journey test and assistive technology.

Minimal corrections:

- `vitest.config.ts` excludes `tests/e2e/**` while preserving Vitest default exclusions.
- The two component tests now assert the intentional route and accessible name.

Fresh post-fix evidence:

| Command | Terminal result |
| --- | --- |
| direct `vitest run` for the two repaired component files, `--maxWorkers=1 --reporter=verbose` | 2 files / 3 tests passed (26.18s) |
| direct full `vitest run --maxWorkers=1 --reporter=dot` | 28 files / 214 tests passed (253.37s) |
| final `pnpm verify` | exit 0: eslint, `tsc --noEmit`, Vitest 28 files / 214 tests passed (64.86s), and Next production build completed |

`git diff --check` completed without whitespace errors before commit.

## Concerns

- Local Playwright invocation needs the direct local binary in this desktop environment because `pnpm exec playwright` does not resolve it; `pnpm test:e2e` itself succeeds.
- No product-test failures remain. The `NO_COLOR`/`FORCE_COLOR` warning is environment-only and does not come from application runtime collectors.
