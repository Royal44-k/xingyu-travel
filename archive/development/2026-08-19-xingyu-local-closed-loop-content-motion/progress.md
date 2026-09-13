# SDD ledger — plan: docs/superpowers/plans/2026-08-19-xingyu-local-closed-loop-content-motion.md

Plan base: `2fea008`
Authority: `docs/superpowers/specs/2026-08-18-xingyu-local-closed-loop-content-motion-design.md`
Workspace: `D:/Codex-chat/xingyu-travel/.worktrees/xingyu-public-mvp`

## Pre-flight consistency scan

| Scope | Producer / change | Consumer / expectation | Finding |
|---|---|---|---|
| Task 1 internal | Profile v2 actions, migration, taxonomy, picker | Unit/component tests and PreferenceSettings | Conflict: plan example has four categories; binding spec requires six categories. Ruling recorded below. |
| Task 2 internal | Strict LibraryStore v1 and offer snapshots | Library unit tests | Consistent; uses existing collision-safe `offerIdentity` and `ComparisonProductKind`. |
| Task 3 internal | Shared FavoriteButton and comparison persistence | Cross-component/remount tests | Consistent; comparison selection remains local while favorite/alert state moves to LibraryStore. |
| Task 4 internal | TripStore v2, idempotent `savePostAsTrip`, `/trips` | Conversion/workbench/collection tests | Consistent; URL slugs resolve to canonical trip IDs and all writes remain keyed by canonical `trip.id`. |
| Task 5 internal | Query-driven ProfileHub | Profile/library/trip/partner selectors | Consistent; aggregates selectors without copying domain state. |
| Task 6 internal | Eight complete posts and 32 independent images | Content invariants and asset registry | Consistent; each full guide has four 3:2 assets and itinerary length equals days. |
| Task 7 internal | Square filters, shared favorites, GuideGallery | Square/detail component tests | Consistent; consumes Task 2/3/6 interfaces without new persistence owner. |
| Task 8 internal | DestinationFilmCarousel and home story | Carousel tests, home composition, reduced motion | Consistent; one signature motion surface and restrained supporting motion. |
| Task 9 internal | Header discovery and contextual guardian route | Header/route tests and canonical trip selectors | Consistent; removes fixed demo routes and derives guardian destination from actual trips. |
| Task 10 internal | Real-UI Playwright closed-loop coverage | Existing E2E helpers and all domain stores | Consistent; no storage injection and only browser-visible actions. |
| Task 11 internal | Full gates, Chrome Design QA, Vercel deployment | Production public URL and final evidence | Consistent; existing user authorization covers upload, Production deploy, and Preview-only SSO. |
| Tasks 1 → 5 | ProfileStore v2 and InterestTagPicker | ProfileHub preferences panel | Compatible; Task 5 must reuse Task 1 components/selectors. |
| Tasks 1 → 7 | Interest tags and recommendation state | Square personalized/non-personalized feed | Compatible; Square reads ProfileStore only after hydration. |
| Tasks 1 → 8 | Global motion/tokens in `app/globals.css` | Home visual system | Shared file; Task 8 preserves Task 1 focus/reduced-motion rules. |
| Tasks 2 → 3 | LibraryStore actions and hydration | FavoriteButton and comparison integration | Compatible; Task 3 does not duplicate identity or persistence logic. |
| Tasks 2/3 → 5 | Liked slugs, offer snapshots, alerts | ProfileHub likes and saved-offers tabs | Compatible; Task 5 consumes selectors and handles unavailable/expired records. |
| Tasks 3 → 7 | `FavoriteButton` and `post-card.tsx` | Square cards and detail favorite state | Shared file/interface; Task 7 enriches presentation without replacing persistence behavior. |
| Tasks 4 → 5 | Canonical trips and TripCollection | ProfileHub trip summary/tab | Compatible; Task 5 reuses selectors/cards rather than copying trips. |
| Tasks 4 → 9 | Canonical trip IDs, guardian state | Header contextual guardian navigation | Compatible; Task 9 must resolve most recent guarded canonical trip. |
| Tasks 4/5 → 10 | Trips and ProfileHub UI | Closed-loop E2E | Compatible; E2E creates state through visible controls only. |
| Tasks 6 → 7 | Posts and destination asset registry | Square/detail gallery | Compatible; Task 7 consumes registered assets and fixed 3:2 geometry. |
| Tasks 6 → 8 | Destination assets and discovery-only cities | Home destination film and story sections | Compatible; incomplete cities link only to filters/compare, never missing detail routes. |
| Tasks 7/8 → 10 | Gallery, filters, carousel, motion | Responsive/accessibility E2E | Compatible; Task 10 verifies keyboard, touch, pause and reduced-motion contracts. |
| Tasks 9 → 10 | Navigation and contextual routes | Core journey and responsive navigation E2E | Compatible; no `/trips/demo` or fixed guardian route remains. |
| Tasks 10 → 11 | Stable E2E suite and interaction fixtures | Full verification and production validation | Compatible; Task 11 reruns rather than weakening acceptance. |

Ruling: Implement six visible interest categories—`旅行方式`, `自然景观`, `城市人文`, `住宿偏好`, `美食体验`, `安全与同行`—because the approved spec is binding. Preserve every core tag named by the plan/spec; place lodging and food tags in their own categories. Cost if wrong: taxonomy snapshot expectations may need small rework, but functionality and migration remain unchanged.

Ruling: Treat commit `2fea008` as this plan's review base rather than the long-lived branch merge-base, because this plan is an incremental closed-loop release on top of an already delivered feature branch. Cost if wrong: the final review omits older product code unrelated to this plan, which remains covered by full regression and production QA.

Baseline: `pnpm verify` stopped at lint because ESLint scanned ignored Vercel build output under `.vercel/output` (18 generated `require()` errors and thousands of generated warnings). Root-cause evidence: `.gitignore` excludes `.vercel/`, while `eslint.config.mjs` global ignores only `.next/**` and `artifacts/**`; source diagnostics were not reached.

Ruling: Task 1 will add `.vercel/**` to ESLint global ignores as a minimal baseline hygiene repair, using the failing `pnpm lint` run above as RED evidence, then rerun lint. Generated deployment output is not source and must not participate in source lint. Cost if wrong: a hand-authored source file placed under `.vercel/` would be ignored, but that directory is already reserved and Git-ignored for generated deployment artifacts.

Baseline continuation: `pnpm typecheck` PASS; direct single-worker Vitest PASS (29 files, 215 tests, 400.89s); `pnpm build` PASS after the sandbox-only `.next/trace-build` write restriction was removed in the approved execution context. Source baseline is healthy; only the generated `.vercel/**` lint boundary remains for Task 1.

Task 1: fix round 1/5 (2 addressed, 0 open — hash/whitespace normalization is reload-safe; case-folding is deterministic; commit `e74cbd3`)
Task 1: complete (commits `2fea008..e74cbd3`, review clean)

Ruling: For Task 2 snapshot creation, derive `observedAt` from `NormalizedOffer.updatedAt`, derive `expiresAt` deterministically as 15 minutes after `updatedAt`, derive `policySummary` from refundable/baggage flags, require a non-empty normalized destination and a comparison product kind, and omit `deepLink` when the source offer does not supply one. This fills fields absent from the current `NormalizedOffer` without inventing a real supplier link. Cost if wrong: Task 3 may need a small adapter change if its external-link source later supplies a different validity window.

Task 2: fix round 1/5 (2 addressed, 0 open — strict exact persistence envelope and write-time/schema parity; commit `c413cfe`)
Task 2: complete (commits `e74cbd3..c413cfe`, review clean; focused 28/28, lint and typecheck verified; full Vitest unverified due detached runner and carried to later gates)

Task 3: minor (deferred): heart weight switches immediately while the 160ms CSS transition targets color rather than a literal SVG fill transition; final review should decide whether the visible motion warrants refinement.

Task 3: fix round 1/5 (1 addressed, 0 open — hydration failure explanation is visibly rendered and associated to the disabled favorite control; commit `c614b5f`)
Task 3: complete (commits `c413cfe..c614b5f`, review clean; deferred Minor retained for final review)

Task 4: fix round 1/5 (1 addressed, 0 open — persisted v2 and v0/v1 migration inputs reject duplicate non-empty `sourcePostSlug` values at the shared domain boundary; commit `7486e30`)
Task 4: complete (commits `c614b5f..7486e30`, review clean; lint, typecheck, build, and full Vitest 34 files/272 tests verified)

Task 5: fix round 1/5 (6 addressed, 0 open — partner-error safety gating, live offer expiry, owner-store reset recovery, valid tab ARIA, shortcut focus handoff, and accessible contrast; commit `17d2d75`)
Task 5: complete (commits `7486e30..17d2d75`, review clean; focused 84/84, full Vitest 36 files/287 tests, lint, typecheck, and build verified)

Task 6: fix round 1/5 (4 Important + 1 Minor addressed — legacy slug compatibility, 6-day Sichuan contract, regenerated early-autumn Guizhou terraces, content/SHA/path invariants, Sanya chronology; commit `5d8ec98`)
Task 6: fix round 2/5 (1 partially addressed — recursive filesystem inventory added, but literal 32-path contract still open; commit `268787b`)
Task 6: fix round 3/5 (1 addressed, 0 open — explicit 32-path literal contract preserved alongside recursive inventory and SHA uniqueness; commit `9a8b855`)
Task 6: complete (commits `17d2d75..9a8b855`, review clean; 32 accepted 1536x1024 unique ImageGen assets, 39 calls/7 rejects, focused 6/6, lint/typecheck/build verified; full Vitest deferred because inherited Node PIDs had no terminal evidence and were not overlapped)

Task 7: fix round 1/5 (4 Important addressed — child-key bubbling, thumbnail-swipe isolation, visible search focus, exact-four gallery contract; commit `9581aab`)
Task 7: fix round 2/5 (1 addressed, 0 open — all numeric max-day filters genuinely narrow the current catalog; commit `7b95447`)
Task 7: complete (commits `9a8b855..7b95447`, review clean; focused 21/21 and 12/12, full Vitest 39 files/308 tests, lint/typecheck/build verified)

Task 8: fix round 1/5 (1 Critical + 5 Important + 2 Minor addressed — link-safe drag capture, 12-city discovery, fresh dwell, active-only focus, newest like, adjacent loading, control sizing/motion; commit `9db40a7`)
Task 8: fix round 2/5 (1 addressed, 1 reviewer conflict resolved — 44px controls; focus-inside pause intentionally preserved and fresh 6s dwell begins only after focus exits; commit `4a94c32`)
Task 8: complete (commits `7b95447..4a94c32`, review clean; four additional 1536x1024 ImageGen city assets, focused 23/23 and 19/19, full Vitest 40 files/323 tests, lint/typecheck/build verified)

Task 9: fix round 1/5 (2 addressed, 0 open — supported-only guardian activation and fail-closed hydrated RiskTimeline states; commit `acb2fe2`)
Task 9: complete (commits `4a94c32..acb2fe2`, review clean; related 69/69, full Vitest 41 files/340 tests, lint/typecheck/build verified)

Task 10: fix round 1/5 (4 addressed, 0 open — exact original-guide entry/unlike, stable offer identity, task-owned Playwright server, and auditable report; commit `6c69936`)
Task 10: fix round 2/5 (1 addressed, 0 open — saved offer snapshots preserve validated origin/date/traveler search context with legacy-compatible hydration; commits `6c39b03`, `ab4b31e`)
Task 10: fix round 3/5 (1 addressed, 0 open — origin is locked by real Chrome E2E, profile href, and persistence/rehydration regressions; commits `e14c596`, `1e88020`)
Task 10: complete (commits `acb2fe2..1e88020`, review clean; local-library 4/4, responsive 11/11, full E2E 30/30, full Vitest 342/342, lint/typecheck/build verified; port 4173 free)

Task 11: complete (commits `1e88020..2d7691e`, review clean; Design QA 15 Chrome captures/6 same-input boards, no P0/P1/P2, `final result: passed`; lint/typecheck/Vitest 342/342/E2E 30/30/build verified; Preview `dpl_8pfLnq33CdM3QNq49yqFj3QTcGvB` READY with Preview-only SSO; exact artifact promoted to public Production `dpl_7tBjfSPxfbJXzwTX7PGGBUWCwgoE` at `https://xingyu-travel.vercel.app`; public 9/9 routes, 2/2 assets, 4/4 loops, zero runtime/HTTP errors)

Final branch review: fix round 1/5 (3 Important addressed — truthful discovery-city comparison routes, hydrated/transactional assistant selection, and Partner/Trip split-brain protection; commits `6a60ee2..69b013d`; new Production `dpl_JCoM3n81ch8oogaaj85KKLonKaZj`)
Final branch review: fix round 2/5 (4 Important addressed — assistant result/session invalidation, transactional guardian-plan writes, two-store compensation, fresh full-gate report; commits `dc0a3bb..4b7a911`; a fresh-browser null-byte defect found by Preview verifier prevented promotion of rejected Preview `dpl_GCX5hMKpL2fByCRkwf9ttr6rcPQ9`, then fixed and promoted as Production `dpl_E9kpA1gNdjX54Zzu8YheTmTynteT`)
Final branch review: fix round 3/5 (1 Important addressed — PartnerStore-owned idempotent rollback restores exact null or distinctive non-null raw persistence bytes; commit `f4ef6f0`)
Final branch review: complete (commits `2fea008..a225a04`, review clean; lint/typecheck/Vitest 359/359/Chrome E2E 31/31/build 14/14 verified; Design QA remains passed with no P0/P1/P2; exact Preview `dpl_7bL9cTHePAJyGgKrJDeQzewJyGoM` promoted to public Production `dpl_8Cr2HkEChsnCn1Mn6mkaBn7xQYWp`; public 9/9 routes, 2/2 assets, 8/8 affected flows, 4/4 loops, zero errors/warnings; Preview-only SSO preserved)
