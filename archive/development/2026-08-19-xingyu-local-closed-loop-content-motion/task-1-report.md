# Task 1 — Profile Preferences v2 and Recoverable Interest Management

## Implemented behavior

- Added the six visible taxonomy categories required by the approved specification: `旅行方式`, `自然景观`, `城市人文`, `住宿偏好`, `美食体验`, and `安全与同行`. The library retains every specified core tag; lodging and food have their own categories.
- Added `normalizeInterestTag`, visible-character validation, case-insensitive de-duplication, a twelve-tag limit, and stable `PROFILE_TAG_INVALID` / `PROFILE_TAG_LIMIT` errors.
- Added Profile Preferences v2 actions: `addInterestTag`, `removeInterestTag`, and `replaceInterestTags`. Clearing tags disables personalization; adding a tag does not turn it back on.
- Kept the existing `xingyu-profile-demo-v1` storage key and migrated valid version-one state to version two deterministically, including normalized legacy tags and the legacy default demo profile.
- Maintained strict Zod parsing, `skipHydration`, explicit versioning, and fail-closed recovery. Malformed v1/v2 bytes remain in local storage; a storage write is unlocked only by the explicit reset action.
- Added `InterestTagPicker`: selectable chips with `aria-pressed`, a visible check icon, custom Enter/button submission, inline validation, live status feedback, removable selected tags, and a confirmation step before clearing. The tag library remains visible when empty.
- Added `.vercel/**` to ESLint global ignores so generated, Git-ignored Vercel output does not contaminate source linting.

## Files changed

- `eslint.config.mjs`
- `src/data/interest-tags.ts`
- `src/stores/profile-store.ts`
- `src/features/profile/interest-tag-picker.tsx`
- `src/features/profile/preference-settings.tsx`
- `src/app/globals.css`
- `tests/unit/profile-preferences.test.ts`
- `tests/component/interest-tag-picker.test.tsx`
- `tests/component/preference-settings.test.tsx`

## RED evidence

1. `pnpm test tests/unit/profile-preferences.test.ts`
   - Failed as expected before implementation: Vite could not resolve `@/data/interest-tags`, proving the new taxonomy/normalization contract did not exist.
2. `pnpm test tests/component/interest-tag-picker.test.tsx tests/component/preference-settings.test.tsx`
   - Failed as expected before the picker implementation: neither `清除全部兴趣` nor the `自定义兴趣` input existed.
   - The same run also exposed a real migration gap: malformed v1 data left pre-hydration defaults active. The fix switches memory to fail-closed state while suppressing persistence writes until reset.
3. `pnpm test tests/unit/profile-preferences.test.ts` after strengthening the migration fixture
   - Failed as expected with `expected [] to deeply equal ['山野']`: v1 validation ran before normalization. The migration schema was then narrowed to strict legacy shape validation while allowing legacy strings to be normalized and de-duplicated.

The pre-flight ledger also recorded the baseline `pnpm lint` RED caused only by generated `.vercel/**` output; the minimal ignore repair is included in this task commit.

## GREEN evidence

- `pnpm test tests/unit/profile-preferences.test.ts` — PASS, 1 file / 6 tests.
- `pnpm test tests/component/interest-tag-picker.test.tsx tests/component/preference-settings.test.tsx` — PASS, 2 files / 5 tests.
- `pnpm lint` — PASS.
- `pnpm typecheck` — PASS.

## Full-suite evidence

`pnpm test` — PASS, 31 files / 223 tests, 92.95s.

The first full-suite runner session detached after startup; process inspection confirmed completion. The suite was repeated once with output captured in a temporary log to obtain terminal evidence; it exited with code 0 and the summary above.

## Self-review

- The persistence owner is still `profile-store`; neither component reads `localStorage` directly.
- Persisted v2 state is strict and normalized; legacy v1 input is strictly shaped, then deterministically normalized during migration.
- Recovery does not overwrite malformed storage bytes. Explicit reset deliberately re-enables persistence and writes known-safe defaults.
- The picker uses the established editorial tokens, retains mobile reflow/focus styling, and limits visual emphasis to selected chips and their check indicator.
- `git diff --check` completed without whitespace errors.

## Concerns

None open. No production build was run because this task changed a client-side preference flow and lint, typecheck, focused component/unit tests, and the full Vitest suite all passed.

## Fix round 1 — canonical interest persistence and deterministic Latin keys

### Findings addressed

1. `normalizeInterestTag(' # 海岛 ')` previously returned `' 海岛'`: it became an accepted persisted value and then failed strict v2 rehydration because the parser normalized it again. The normalizer now trims after hash removal and whitespace collapse, making the stored form canonical and idempotent.
2. `interestTagKey` previously used ambient-locale `toLocaleLowerCase()`. It now uses locale-independent `toLowerCase()`, so Latin duplicate detection and v1 normalization remain deterministic.

### Files changed

- `src/data/interest-tags.ts`
- `tests/unit/profile-preferences.test.ts`

### RED evidence

`pnpm test tests/unit/profile-preferences.test.ts` — FAILED, 2 of 8 tests:

- Hash/whitespace persistence regression received `[' 海岛']` where canonical `['海岛']` was expected.
- A simulated runtime default locale that maps `I` differently accepted both `ISTANBUL` and `istanbul`, where a single tag was expected.

Both failures exercised actual store behavior. The locale test temporarily simulates the platform casing behavior that `toLocaleLowerCase()` delegates to, then restores the built-in method.

### GREEN evidence

- `pnpm test tests/unit/profile-preferences.test.ts` — PASS, 1 file / 8 tests, 5.08s.
- `pnpm test tests/component/interest-tag-picker.test.tsx tests/component/preference-settings.test.tsx` — PASS, 2 files / 5 tests, 17.77s.
- `pnpm lint` — PASS.
- `pnpm typecheck` — PASS.
- `pnpm test` — PASS, 31 files / 225 tests, 96.26s (captured to a temporary runner log; exit code 0).

### Self-review

- The canonicalization test creates persisted browser-local state, constructs a second store, and verifies successful rehydration; it therefore covers the original fail-closed persistence path rather than only a pure helper.
- The locale test fails with the prior ambient-locale implementation and passes with deterministic key normalization.
- No persistence key, action signature, schema version, migration behavior, or component API changed.
