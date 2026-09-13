# Task 2 — Library Store report

## Implementation

Created an independent browser-local `LibraryStore` under `xingyu-library-demo-v1` (version 1). It owns liked guide slugs, normalized favorite-offer snapshots, and local price-alert records; no UI or other domain store was changed.

The store:

- reuses `offerIdentity(offer)` for every saved-offer key;
- derives snapshots from `NormalizedOffer`, with `observedAt = updatedAt`, `expiresAt = updatedAt + 15 minutes`, normalized non-empty destination, CNY total, and the four policy-summary combinations derived from refundable/baggage flags;
- omits `deepLink`, since the source offer has no supplier URL;
- caps likes at 500 and snapshots at 200;
- permits alerts only for saved offers and atomically removes an alert together with its saved offer;
- validates persisted data strictly with Zod (including no unknown keys, finite non-negative prices, timestamps, identity/key consistency, validity window, limits, and alert dependency);
- uses `skipHydration`, explicit `hydrated` / `hydrationError` state, a safe fail-closed reset, and prevents malformed storage bytes from being overwritten until `resetLibrary()`.

## Files

- `src/stores/library-store.ts`
- `tests/unit/library-store.test.ts`

## RED / GREEN evidence

Initial RED (after the test file and before any production LibraryStore file):

```text
$ pnpm test tests/unit/library-store.test.ts
FAIL tests/unit/library-store.test.ts
Error: Failed to resolve import "@/stores/library-store" ... Does the file exist?
Test Files  1 failed (1)
Tests  no tests
```

First GREEN after the minimal store implementation:

```text
$ pnpm test tests/unit/library-store.test.ts
Test Files  1 passed (1)
Tests  14 passed (14)
```

Self-review found that malformed rehydration did not clear already-existing in-memory state. A regression test was added first and failed as expected:

```text
$ pnpm test tests/unit/library-store.test.ts
FAIL ... clears pre-existing in-memory library data when a later rehydrate is malformed
expected [ 'dali-slow-5d' ] to deeply equal []
Test Files  1 failed (1)
Tests  1 failed | 14 passed (15)
```

After registering the fail-closed state reset, the focused suite was green:

```text
$ pnpm test tests/unit/library-store.test.ts
Test Files  1 passed (1)
Tests  15 passed (15)
```

Focused coverage includes toggling/limits, collision-safe provider/id pairs, snapshot derivation and 15-minute validity, invalid offers, alert dependency/removal, persistence and rehydration, malformed-byte preservation/reset, fail-closed rehydration, and strict nested unknown-key rejection.

## Verification

```text
$ pnpm typecheck
$ tsc --noEmit
```

Passed with exit code 0.

```text
$ pnpm lint
$ eslint .
```

Passed with exit code 0 and no warnings.

`pnpm test` was attempted before commit. The terminal detached after Vitest startup, and a process check showed the parent plus worker processes were still active. A subsequent non-parallel single-worker rerun behaved the same way. Each exact hung runner/workers was stopped, and a final process check found no remaining Vitest process. Therefore the complete-suite result is **not verified** and is not reported as passing.

## Self-review

- Confirmed the store neither reads localStorage from components nor couples to profile/trip/partner state.
- Confirmed no offer key is concatenated manually; the existing identity helper is the only key creator.
- Confirmed malformed data is strict-rejected and does not overwrite recoverable raw bytes until explicit reset.
- Ran `git diff --check`; no whitespace errors.

## Concerns

The full Vitest suite could not be conclusively completed in this environment because Vitest detached and left active workers even in single-worker/non-parallel mode. Focused tests, typecheck, and lint are verified green; full-suite status remains unverified.

## Fix round 1 — strict envelope and write-time parity

### Review findings addressed

- The raw Zustand storage envelope is now validated strictly at the persistence storage boundary. The envelope must be exactly `{ state, version: 1 }`; missing `state`, missing/non-numeric versions, and unknown envelope keys fail closed before `merge` receives a state value.
- Every write now conforms to the persisted text constraints. Liked slugs are canonicalized/validated with the same 1–500-character rule as the schema. Saved-offer provider, id, and destination are canonicalized with that rule, the canonical provider/id pair is passed to the existing `offerIdentity`, and the completed snapshot is checked against the snapshot schema before it can enter state.

### RED / GREEN evidence

RED command:

```text
$ pnpm test tests/unit/library-store.test.ts
Test Files  1 failed (1)
Tests  10 failed | 18 passed (28)
```

The expected failures covered a 501-character slug; oversized provider/destination and overlong identity key; canonical provider/id whitespace; all four malformed envelope shapes; and global `hydrationError` signaling. The failures showed the prior store accepted unrehydratable action results and bypassed `onHydrationError` for malformed envelopes.

The first implementation run left four failures because the new regression wrote malformed storage and then deliberately populated the test store, which correctly replaced the bytes before hydration. The setup was corrected to populate in-memory state first and install the malformed bytes last; no production behavior was weakened.

Final GREEN command:

```text
$ pnpm test tests/unit/library-store.test.ts
Test Files  1 passed (1)
Tests  28 passed (28)
```

```text
$ pnpm typecheck
$ tsc --noEmit
```

Passed with exit code 0.

```text
$ pnpm lint
$ eslint .
```

Passed with exit code 0 and no warnings.

After confirming no Vitest process existed, one full `pnpm test` attempt was made. The terminal detached after Vitest startup; a process check showed its exact parent and workers still active, so those exact processes were stopped. The full suite is **unverified**, not passing.

### Fix-round self-review and concerns

- Strictness now applies both to decoded envelope metadata and the nested state schema; malformed bytes remain untouched after later actions until `resetLibrary()`.
- The canonical key is still made solely with `offerIdentity`; no key concatenation was introduced.
- The new tests prove both per-store `onHydrationError` and exported global hydration error state for malformed envelope input.
- Concern unchanged: full Vitest cannot be conclusively completed in this environment because the runner detaches and leaves live workers. Focused 28/28, typecheck, and lint are verified green.
