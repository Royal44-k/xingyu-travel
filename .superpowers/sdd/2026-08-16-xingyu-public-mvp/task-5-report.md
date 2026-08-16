# Task 5 Report: 三类产品统一比价与增量报价

## Result

Implemented a transparent comparison experience for flights, hotels, and attraction tickets. The page consumes incremental sandbox events, keeps and deduplicates partial results, retains offers when a supplier degrades, and exposes comparable total price, conditions, credibility, and fixed update-time evidence. All outbound behavior is an inert, explicit sandbox confirmation; the MVP neither navigates to a partner nor claims to book or take payment.

## RED Evidence

Command:

```text
node node_modules/vitest/vitest.mjs run tests/unit/quote-stream.test.ts tests/component/comparison-client.test.tsx
```

The ordinary `pnpm vitest` launcher was absent from this worktree's generated `.bin` directory, and Vite's first direct run was blocked from writing `node_modules/.vite-temp` by the sandbox. After approving that scoped cache write, the genuine pre-implementation result was:

```text
FAIL tests/component/comparison-client.test.tsx
Failed to resolve import "@/features/comparison/comparison-client"

FAIL tests/unit/quote-stream.test.ts
Failed to resolve import "@/app/api/v1/comparison/searches/route"

Test Files 2 failed (2)
```

Both suites failed for the intended reason: the Task 5 production components and handlers did not exist. No production implementation was written before this RED.

## GREEN Evidence

Focused feature verification:

```text
node node_modules/vitest/vitest.mjs run tests/unit/quote-stream.test.ts tests/component/comparison-client.test.tsx
Test Files 2 passed (2)
Tests 12 passed (12)
```

The first implementation run had 11 passing tests and one assertion ambiguity because both retained offers correctly rendered supplier-credibility labels. The query was corrected from a singular lookup to require exactly two real labels; no product behavior or contract was weakened.

Full verification:

```text
pnpm lint
eslint .

pnpm typecheck
tsc --noEmit

node node_modules/vitest/vitest.mjs run
Test Files 9 passed (9)
Tests 57 passed (57)

pnpm build
Compiled successfully
Route /compare                                  Dynamic
Route /api/v1/comparison/searches               Dynamic
Route /api/v1/comparison/searches/[id]/events   Dynamic
```

Vitest, TypeScript incremental metadata, and Next build output required approved unsandboxed runs because their caches/build artifacts were denied by the workspace sandbox. The commands then completed with exit code 0.

## API and Streaming

- `POST /api/v1/comparison/searches` strictly validates JSON for only `flight`, `hotel`, and `ticket`, returning status 202 with a stable search ID, unique request ID, and `demo_mode: true`.
- Malformed JSON and invalid fields return the unified JSON 400 contract; unknown stream IDs return the same structured error shape with 404 rather than an unhandled 500.
- The stable search token is deterministic and self-contained, so the GET handler can recover validated search context even if POST and SSE execute in isolated route invocations. An in-process lookup remains only as a fast path.
- `GET /api/v1/comparison/searches/:id/events` emits deterministic `offer`, optional `degraded`, and `complete` frames with the required SSE content type, no-cache, keep-alive, and buffering headers.
- `encodeSse` is exported and verified byte-for-byte as UTF-8 SSE framing.

## UI and Interaction

- Incremental offer state appends earlier results and upserts only identical provider/ID pairs. A degradation banner does not replace or clear current results.
- Stale marking is computed against an injected reference timestamp in component tests, avoiding wall-clock dependence. Visible data includes the fixed update time, supplier credibility, total-price breakdown, baggage, and refund/change conditions.
- Accessible product tabs support mouse and arrow/Home/End keyboard selection. Sorting, filter drawer, refundable filter, price calendar, expandable conditions, favorites, price-alert switch, and compare selection all change state.
- Same-screen comparison is limited to three offers; the fourth unchecked control becomes disabled at the boundary.
- Filter and outbound layers expose named dialog semantics. The outbound confirmation explicitly says `沙箱 / Demo` and `不会预订、出票或付款`; it contains no partner link.
- The Server Component awaits its `searchParams` Promise before deriving the initial shared `ComparisonSearchInput`.
- Visual styling extends the home page's ink/ivory/sand/pine editorial system, reuses `SiteHeader`, uses only Phosphor icons, and collapses the four-column quote rows into a single-column mobile layout.

## Files

- `src/app/compare/page.tsx`
- `src/app/api/v1/comparison/searches/route.ts`
- `src/app/api/v1/comparison/searches/[id]/events/route.ts`
- `src/features/comparison/comparison-client.tsx`
- `src/features/comparison/offer-row.tsx`
- `src/features/comparison/comparison.module.css`
- `src/domain/comparison/types.ts`
- `src/domain/comparison/search-registry.ts`
- `src/domain/shared/api.ts`
- `src/features/home/search-composer.tsx`
- `src/lib/request-id.ts`
- `tests/unit/quote-stream.test.ts`
- `tests/component/comparison-client.test.tsx`

## Commit

`feat: add transparent incremental comparison` (the implementation commit containing this report).

## Concerns

- Sandbox offers remain intentionally fixed and sparse: the current inventory has two flight quotes and one quote each for hotel and ticket in Dali. Empty-result behavior is therefore expected for other sandbox destinations.
- The price calendar is explicitly labeled as a fixed demo sample. It does not imply a live historical-price feed.
- Browser screenshot and viewport-level visual QA remain outside Task 5; this task's UI verification is component, static-analysis, and production-build based.
