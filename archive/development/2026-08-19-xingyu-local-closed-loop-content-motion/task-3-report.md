# Task 3 — Shared Favorite Interactions and Comparison Integration report

## Status and commit

Implemented and committed as `f92df1a` (`feat: connect guide and offer favorites`).

## Implementation

- Added a shared `FavoriteButton({ slug, label })` backed only by `useLibraryStore`, with explicit hydration through `hydrateLibraryStore` and readiness/error state from `useLibraryStoreHydration`.
- Replaced `PostCard`'s component-local favorite state with the shared button, so identical guide slugs synchronize immediately and remain liked across component remounts.
- Replaced comparison-local favorite and alert preferences with LibraryStore snapshots and alerts keyed through the existing `offerIdentity` helper. The three-item side-by-side selection remains component-local.
- Kept the existing page-level alert switch. It enables or disables alerts for saved offers currently loaded in the comparison result set and is unavailable until hydration succeeds and at least one offer is saved.
- Added the exact successful enablement notice: `已保存提醒设置；本演示不会在关闭页面后推送`.
- Added an alert-impact confirmation dialog before removing a saved offer with an active alert. Cancel/Escape preserves both records; confirmation calls the store's atomic `removeOffer`, which clears the offer and its alert together.
- Reused the existing `useDialogFocus` behavior for initial focus, Tab trapping, Escape dismissal, and focus restoration.
- Preserved the existing ivory/pine/sand comparison tokens and Phosphor icons without redesigning unrelated surfaces.

## Files

- `src/features/library/favorite-button.tsx`
- `src/features/library/library.module.css`
- `src/features/square/post-card.tsx`
- `src/features/comparison/comparison-client.tsx`
- `src/features/comparison/comparison.module.css`
- `src/features/comparison/offer-row.tsx`
- `tests/component/favorite-sync.test.tsx`
- `tests/component/comparison-client.test.tsx`

## RED evidence

The first sandboxed attempt could not write Vite's temporary config (`EPERM`), so it was rerun once with approved worktree write access. That genuine component RED completed normally:

```text
$ pnpm test tests/component/favorite-sync.test.tsx tests/component/comparison-client.test.tsx
FAIL tests/component/favorite-sync.test.tsx
Failed to resolve import "@/features/library/favorite-button"

FAIL tests/component/comparison-client.test.tsx
4 failed | 10 passed
- missing exact reminder notice
- missing alert-impact confirmation dialog
- missing hydration action lock / error affordance

Test Files  2 failed (2)
Tests       4 failed | 10 passed (14)
```

The failures were caused by the missing shared component and the existing comparison-local favorite/alert implementation, not by test syntax or fixture errors. The runner exited 1 and left no worker process.

## GREEN and regression evidence

Final focused Task 3 plus Task 2 LibraryStore regression:

```text
$ pnpm test tests/component/favorite-sync.test.tsx tests/component/comparison-client.test.tsx tests/unit/library-store.test.ts
Test Files  3 passed (3)
Tests       45 passed (45)
Duration    36.05s
```

Coverage includes:

- two live guide favorite instances and a remounted instance;
- hydration-pending neutral/disabled behavior and hydration-error fail-closed behavior;
- offer favorite plus alert state after comparison remount;
- exact alert notice copy;
- active-alert removal remaining unchanged until explicit confirmation;
- initial dialog focus, Shift+Tab trap, Escape dismissal, and trigger focus restoration;
- atomic favorite/alert removal;
- collision-safe offer identities and all strict Task 2 store regressions.

## Other verification

```text
$ pnpm lint
$ eslint .
```

Passed with exit code 0 and no warnings.

```text
$ pnpm typecheck
$ tsc --noEmit
```

Passed with exit code 0. The first sandboxed invocation could not write `tsconfig.tsbuildinfo`; the approved rerun completed successfully.

Single full-suite attempt (no overlapping runner):

```text
$ pnpm test
Test Files  33 passed (33)
Tests       259 passed (259)
Duration    163.70s
```

The full runner remained active during its quiet period and then exited normally with code 0; it did not detach and no process was stopped or restarted.

`git diff --check` passed with no whitespace errors before commit.

## React best-practices self-review

- Store selectors are split by the smallest stable state/action slices needed by each component; no component reads or writes `localStorage`.
- Favorite and alert booleans are derived during render from store records and current offer keys instead of mirrored into effects or duplicate React state.
- Hydration gates every modifying control, preventing a late rehydrate from overwriting an actionable false-unsaved UI; hydration errors remain fail-closed and visible.
- Interaction side effects remain in click handlers. Effects are limited to hydration and the existing quote-stream lifecycle.
- The confirmation dialog is module-level markup inside `ComparisonClient`; no component is declared inline and no unstable derived-array selector is returned from Zustand.
- Comparison selection stays as local UI state; only durable favorite and alert preferences moved to LibraryStore.
- The shared button uses `aria-pressed`, a polite live result, a visible focus ring, and a Phosphor heart. It has one 160ms fill/color transition and one success bounce; reduced motion removes both the transition and scale animation.

## Concerns

None blocking. The global reminder switch intentionally retains the existing comparison-page interaction model and applies to saved offers in the current result set; a future per-offer reminder control would be a separate product change.

## Fix round 1 — visible guide hydration failure

### Review finding addressed

Guide favorite hydration failures no longer leave sighted users with an unexplained disabled heart. `FavoriteButton` now renders a compact, always-visible `本地喜欢暂不可用` inline label using the existing sand/brown editorial palette. A per-instance `useId()` value connects that label to the disabled favorite button through `aria-describedby`, while `role="alert"` retains the existing assistive announcement semantics. The treatment stays at 10px in a small inline pill instead of adding a full-width recovery panel to every card in a long feed.

The deferred fill-animation Minor was intentionally not changed in this fix round.

### RED evidence

```text
$ pnpm test tests/component/favorite-sync.test.tsx
FAIL ... fails closed with a visible explanation associated with the disabled favorite control
Expected element to have text content: 本地喜欢暂不可用
Received: 本地喜欢状态无法安全读取，暂时无法更改。
Test Files  1 failed (1)
Tests       1 failed | 2 passed (3)
```

The failure came from the old visually hidden-only explanation. The new regression also requires the disabled control to have the concise message as its accessible description.

### GREEN and verification evidence

First component GREEN:

```text
$ pnpm test tests/component/favorite-sync.test.tsx
Test Files  1 passed (1)
Tests       3 passed (3)
```

The first combined focused attempt exited before collection because both Vitest fork workers timed out (`0 tests`, two pool errors). A read-only process check confirmed it left no Vitest worker. One non-overlapping serialized rerun then completed normally:

```text
$ pnpm test tests/component/favorite-sync.test.tsx tests/component/comparison-client.test.tsx --maxWorkers=1
Test Files  2 passed (2)
Tests       17 passed (17)
Duration    196.90s
```

```text
$ pnpm lint
$ eslint .
```

Passed with exit code 0 and no warnings.

```text
$ pnpm typecheck
$ tsc --noEmit
```

Passed with exit code 0.

`git diff --check` passed with no whitespace errors. The full suite was not repeated for this isolated ARIA/CSS fix; the base Task 3 commit's single full run remains verified at 259/259.

### Self-review and concerns

- The error is visible without hover or focus and remains associated with the exact disabled control.
- The compact inline treatment uses existing editorial colors and does not introduce a new page-level surface, animation, store read, or local state.
- `useId()` avoids duplicate `aria-describedby` targets when multiple cards render together.
- Normal favorite synchronization, hydration gating, live success status, comparison persistence, and confirmation behavior are unchanged.
- No blocking concern. The fill-animation Minor remains deferred to final review exactly as directed.
