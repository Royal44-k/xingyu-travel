# Task 2 Implementation Report

## Status

Complete on branch `feature/xingyu-public-mvp`.

Commit: `3442a5618561c7c0d18bdb900a64ef14b3efe20d` (`feat: add travel domain contracts and sandbox adapters`)

## Files changed

- `src/domain/comparison/types.ts`
- `src/domain/comparison/normalize-offer.ts`
- `src/domain/partners/score-match.ts`
- `src/domain/trips/state.ts`
- `src/domain/assistant/schema.ts`
- `src/domain/shared/api.ts`
- `src/adapters/contracts.ts`
- `src/adapters/mock/mock-inventory.ts`
- `src/adapters/mock/mock-assistant.ts`
- `src/data/offers.ts`
- `tests/unit/normalize-offer.test.ts`
- `tests/unit/score-match.test.ts`
- `tests/unit/assistant-schema.test.ts`

The commit contains only the 13 Task 2 files above: 569 insertions, no deletions.

## RED evidence

All three required test files were authored before their production modules.

First required behavior run:

```text
node node_modules/vitest/vitest.mjs run tests/unit/normalize-offer.test.ts tests/unit/score-match.test.ts --configLoader runner

Exit code: 1
Test Files: 2 failed (2)
Tests: no tests collected
Expected failures:
- Failed to resolve import "@/adapters/mock/mock-inventory"
- Failed to resolve import "@/domain/partners/score-match"
```

Assistant schema/provider run:

```text
node node_modules/vitest/vitest.mjs run tests/unit/assistant-schema.test.ts --configLoader runner

Exit code: 1
Test Files: 1 failed (1)
Tests: no tests collected
Expected failure:
- Failed to resolve import "@/adapters/mock/mock-assistant"
```

During compatibility self-review, the canonical brief input (which omits `demoMode`) received its own RED/GREEN cycle:

```text
node node_modules/vitest/vitest.mjs run tests/unit/normalize-offer.test.ts --configLoader runner

Exit code: 1
Tests: 1 failed, 2 passed
Expected failure: expected normalized demoMode false, received undefined
```

`RawOffer.demoMode` was then made optional and `normalizeOffer` now deterministically defaults it to `false`; explicit sandbox offers remain `true`.

## GREEN evidence

Fresh final verification after all source changes:

```text
pnpm vitest run tests/unit
Exit code: 0
Test Files: 3 passed (3)
Tests: 17 passed (17)

pnpm typecheck
Exit code: 0
Output: $ tsc --noEmit

pnpm lint
Exit code: 0
Output: $ eslint .

pnpm test
Exit code: 0
Test Files: 4 passed (4)
Tests: 18 passed (18)
```

`git diff --cached --check` also completed with no whitespace errors before commit.

## Implementation and self-review

- Comparable offer totals include base price, taxes, and mandatory fees. Missing taxes/fees normalize to zero, with a deterministic CNY explanation string.
- Partner scoring uses the approved fixed weights in this exact order: date 25, budget 20, pace 15, interest 15, route 10, lodging 5, schedule 5, social 5.
- The approved fixture rounds to score `92` and produces the reasons `date`, `budget`, `pace`.
- Match signals are clamped to the documented ratio range of 0–1. Equal-point reasons use the published signal order as an explicit secondary sort key, so ties do not depend on engine sort behavior.
- Match inputs contain trip-fit signals and the public candidate identity only. No age, gender, ethnicity, health, precise location, contact data, or other sensitive attributes participate in scoring.
- `assistantResponseSchema` is strict at the response, alternative, and evidence levels. Every brief-required top-level and nested field is required; strings are non-empty; `risk_level`, booleans, arrays, and optional evidence URLs are validated structurally.
- All domain/provider values are plain JSON-serializable records, strings, numbers, booleans, and arrays. Provider interfaces use type-only imports and the dependency direction is one-way: domain types -> adapter contracts -> mock implementations. No domain module imports an adapter.
- The trip state model exposes explicit statuses, allowed transition data, risk-event records, and chat-message records without adding runtime state or browser/server dependencies.
- Inventory and assistant mocks use a fixed `2026-08-16T09:00:00+08:00` observation time, fixed IDs/content, explicit demo flags, deterministic total/ID ordering, and no clock, random, filesystem, environment, network, OTA, or AI calls.
- Mock labels and evidence say `星屿沙箱演示...`; they do not claim live airline, hotel, OTA, guardian, realtime, or model data.
- The mock implementations are Vercel-safe because they rely only on portable TypeScript/ECMAScript and Zod already present in project dependencies.
- Mutation review: the tests fail for omitted fees in totals, changed fixed weights/rounding, nondeterministic tie priority, out-of-range signals, missing assistant fields, missing nested actions/timestamps, false sandbox flags, changing snapshot time, provider kind leakage, and non-total ordering.

## Concerns

- No product-code concerns or known failing gates.
- Environment-only note: the managed sandbox denied Vite and TypeScript writes to generated cache files under `node_modules/.vite-temp` and `tsconfig.tsbuildinfo`. The exact final `pnpm` gates were therefore run with the approved out-of-sandbox execution path; no committed configuration was changed for this artifact.
- The sandbox providers are intentionally fixed demo implementations. Live OTA/AI/guardian/realtime integration remains outside Task 2 scope and should not be inferred from these records.

## Review fix round 1

### Commit

`7b1e61d0f8bd50989f8c7d6d1b4590d4ec5bd168` (`fix: harden offer and match domain boundaries`)

This is a separate follow-up commit; the original Task 2 commit was not rewritten.

### Files changed

- `src/domain/comparison/types.ts`
- `src/domain/comparison/normalize-offer.ts`
- `src/domain/partners/score-match.ts`
- `src/data/offers.ts`
- `tests/unit/normalize-offer.test.ts`
- `tests/unit/score-match.test.ts`

### RED evidence

All review regression tests were added before the fix-round production changes.

```text
node node_modules/vitest/vitest.mjs run tests/unit/normalize-offer.test.ts tests/unit/score-match.test.ts --configLoader runner

Exit code: 1
Test Files: 2 failed (2)
Tests: 16 failed, 6 passed (22)
```

Expected observed failures:

- Twelve table cases showed that `basePrice`, `taxes`, and `mandatoryFees` accepted `NaN`, positive infinity, negative infinity, and `-1` without throwing.
- `offerKinds` did not contain `ticket`.
- No explicit deterministic attraction-ticket record existed in `sandboxOffers`.
- A `kind: 'ticket'` inventory search returned an empty list instead of `DEMO-TICKET-DAL-01`.
- `scoreMatch` returned a `NaN` score when given `NaN`, positive infinity, and negative infinity signals.

Independent GREEN steps after each minimal fix:

```text
Ticket support: 3 passed, 15 skipped
score-match.test.ts: 4 passed
normalize-offer.test.ts: 18 passed
```

### Final GREEN evidence

Fresh verification after all fix-round source changes:

```text
pnpm vitest run tests/unit
Exit code: 0
Test Files: 3 passed (3)
Tests: 33 passed (33)

pnpm test
Exit code: 0
Test Files: 4 passed (4)
Tests: 34 passed (34)

pnpm typecheck
Exit code: 0
Output: $ tsc --noEmit

pnpm lint
Exit code: 0
Output: $ eslint .
```

`git diff --cached --check` reported no whitespace errors before the follow-up commit.

### Fix-round self-review

- `ticket` is now part of `OfferKind`; because `ComparisonSearchInput.kind` already references `OfferKind`, typed ticket searches compile without duplicating the union.
- The explicit `DEMO-TICKET-DAL-01` record has fixed price components, timestamp, content, destination, and `demoMode: true`. The existing generic mock inventory pipeline yields it by destination/kind and normalizes its total to `88` without a ticket-specific code path.
- Match ratios now pass through `Number.isFinite` before clamping. Any non-finite signal contributes zero; finite signals retain the existing `[0, 1]` clamp. Scores and reason points therefore remain finite and JSON-serializable while the approved score-92 fixture and tie ordering are unchanged.
- Offer price validation happens after optional fees default to zero and before any total/explanation arithmetic. Each invalid field throws `RangeError` with `<field> must be a finite non-negative number`.
- Zero remains valid. Omitted taxes and mandatory fees continue to normalize to zero.
- Mutation review: removing ticket from the union/data, changing its deterministic snapshot, filtering tickets out, allowing any tested invalid price class, or propagating non-finite match inputs fails at least one regression.

### Fix-round concerns

- No product-code concerns or known failing gates.
- The final test/typecheck commands again used the approved out-of-sandbox path solely because the managed sandbox blocks generated cache writes; no project configuration changed.

## Review fix round 2

### Commit

`eb044c3e734617c361c0705cd4a24370f292404e` (`fix: reject overflowing offer totals`)

This is a second separate follow-up commit; neither prior Task 2 commit was rewritten.

### Files changed

- `src/domain/comparison/normalize-offer.ts`
- `tests/unit/normalize-offer.test.ts`

### RED evidence

The overflow regression was added before the production change.

```text
node node_modules/vitest/vitest.mjs run tests/unit/normalize-offer.test.ts --configLoader runner -t overflows

Exit code: 1
Test Files: 1 failed (1)
Tests: 1 failed, 18 skipped (19)
Expected failure: Number.MAX_VALUE + Number.MAX_VALUE returned without throwing.
```

### GREEN evidence

Scoped GREEN immediately after the minimal implementation:

```text
node node_modules/vitest/vitest.mjs run tests/unit/normalize-offer.test.ts --configLoader runner
Exit code: 0
Test Files: 1 passed (1)
Tests: 19 passed (19)
```

Fresh final verification:

```text
pnpm vitest run tests/unit
Exit code: 0
Test Files: 3 passed (3)
Tests: 34 passed (34)

pnpm test
Exit code: 0
Test Files: 4 passed (4)
Tests: 35 passed (35)

pnpm typecheck
Exit code: 0
Output: $ tsc --noEmit

pnpm lint
Exit code: 0
Output: $ eslint .
```

`git diff --cached --check` reported no whitespace errors before the round-two commit.

### Fix-round self-review

- Each price component is still validated independently before arithmetic.
- The comparable total is now calculated once, checked with `Number.isFinite`, and only then included in the normalized result.
- Overflow throws `RangeError('totalPrice must be a finite number')`; `Infinity` can no longer escape through `totalPrice` or JSON serialization.
- Existing valid totals, omitted-fee defaults, component validation, ticket inventory, fixed score-92 behavior, and sandbox determinism remain covered by the full regression suite.
- Mutation review: removing the total finiteness check or using the unchecked expression in the returned object fails the new regression.

### Fix-round concerns

- No product-code concerns or known failing gates.
- Final verification used the approved out-of-sandbox path only for generated Vite/TypeScript cache writes; project configuration was unchanged.
