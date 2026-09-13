# Task 8 Report — 可信搭子匹配、双向同意与模拟聊天

## Outcome

Implemented the public partner discovery, explainable matching, mutual-consent gate, and browser-local sandbox chat flow.

- Public cards remain browseable before intent publication.
- Partner actions require an adult, identity-status-verified profile with clear risk status; deterministic denial codes are `AGE_RESTRICTED`, `IDENTITY_REQUIRED`, and `RISK_RESTRICTED`.
- The intent form validates destination, real ordered dates, positive budget, pace, interests, route, lodging boundary, schedule, social preference, capacity, and certification preference.
- Candidate hard filters cover destination, overlapping dates, capacity, certification, both blocked-relation directions, and candidate eligibility/risk.
- Candidate scores reuse the shared fixed-weight `scoreMatch`; the approved 木雨 fixture renders 92 and exactly the three top reasons: date, budget, and pace.
- “愿意认识” creates only `pending_mutual`; the explicitly labelled sandbox counterpart action advances it to `matched`, after which the chat link appears.
- Match/chat state is browser-local, collision-safe, versioned, strictly validated during hydration, and limited to explicit allowed transitions.
- Unknown, pending, blocked, and reported chat IDs render a locked recovery state.
- Chat includes a message list/composer, report, block, trusted-contact acknowledgement, demo trip sharing, safe check-in, and missed-check-in notice.
- Local phone/email/WeChat detection blocks contact messages until each side separately consents. After both consents, sending is permitted with a continuing safety warning.
- The trusted-contact dialog traps focus, closes on Escape, restores trigger focus, and resets consent without an effect-driven state update.
- Demo status is explicit throughout. No ID number, identity photo, face data, religion, ethnicity, health attributes, precise coordinates, WebSocket, backend, booking, or real alerting claim was introduced.

## TDD Evidence

1. Unit RED: `pnpm test tests/unit/partner-eligibility.test.ts`
   - 11 tests ran; 10 failed on the intended missing eligibility, validation, filter, score, transition, contact, safety, and hydration behaviors.
   - The one passing assertion only established that the fixture contained no sensitive identity artifacts.
2. Unit GREEN: the same command passed 11/11.
3. Component RED: `pnpm test tests/component/partner-flow.test.tsx`
   - 5/5 failed on the intended missing public-card, intent, consent-gate, chat, safety-modal, and route-guard behaviors.
4. Component GREEN: the same command passed 5/5.

## Verification

- Required scoped tests: 3 files, 20 tests passed.
  - `tests/unit/partner-eligibility.test.ts`
  - `tests/unit/score-match.test.ts`
  - `tests/component/partner-flow.test.tsx`
- Full Vitest suite: 18 files, 135 tests passed; exit code 0.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed; `/partners` is statically generated and `/chat/[matchId]` is a guarded dynamic route.
- `git diff --check`: passed.

## Known Limits

This is intentionally a browser-local sandbox. Identity verification, counterpart consent, messaging, trip sharing, trusted-contact acknowledgement, check-ins, reporting, and blocking do not call a backend or contact a real person. Persisted state is scoped to this browser and malformed state is rejected without overwriting its original bytes.

## Review Round 1 Hardening

- Replaced candidate-owned static score signals with values derived from the current intent and non-sensitive candidate preferences. Budget, pace, interests, route, lodging, schedule, social preference, and date overlap now affect the shared fixed-weight scorer; the approved seed remains exactly 92 with date/budget/pace as its top reasons.
- Expanded local contact detection to formatted Chinese mobile numbers, email, bare `@` handles, and spaced or abbreviated WeChat/V variants while retaining ordinary road, budget, date, and flight numbers.
- Terminal block/report transitions now revoke both contact-consent flags in the same state update, remove the visible match, persist the revoked state, and keep messaging/consent actions locked.
- Chat rendering now verifies the match belongs to the current demo viewer before revealing any messages or controls.
- Eligibility now rejects missing and non-finite ages with `AGE_RESTRICTED`.
- Publication and hydration now share the same strict Zod intent schema, including trimming, real dates, length limits, capacity 1–12, at most 20 interests, positive finite budget, ordered dates, and rejection of unknown fields.
- The intent form mounts only after hydration and uses a keyed initial value, so a reload displays persisted values and an unchanged submission preserves them.

### Review Verification

- Review RED: 45 focused tests ran with 21 expected failures across all seven findings.
- Review focused GREEN: 2 files, 45/45 tests passed.
- Required scoped GREEN: 3 files, 49/49 tests passed.
- Full suite first attempt encountered a Windows/Vitest `%TEMP%` worker-file `ENOENT` with no assertion failures; the controlled single-worker rerun passed 18 files, 164/164 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed.

## Review Round 2 Hardening

- Expanded Chinese mobile detection to compact, spaced, and hyphenated `+86` / `0086` country-code forms while preserving ordinary travel-number examples.
- Bumped the browser-local partner persistence format to version 2.
- Added a strict version-2 invariant: `blocked` and `reported` matches must have both contact-consent flags revoked.
- Added a validated version-1 migration that first rejects malformed legacy state, then clears only terminal contact-consent flags, validates the complete migrated version-2 state, and lets Zustand repersist it at version 2.
- Confirmed malformed legacy bytes and unsafe version-2 terminal records remain fail-closed and untouched.

### Review Round 2 Verification

- Round-2 RED: 45 focused tests ran with 3 targeted failures for compact `+86`, compact `0086`, and absent legacy migration.
- Round-2 focused GREEN: 45/45 tests passed.
- Required scoped GREEN: 3 files, 56/56 tests passed.
- Full stable single-worker suite: 18 files, 171/171 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm build`: passed.
