### Task 11: Full Regression, Product Design QA, and Production Deployment

**Files:**
- Modify: `design-qa.md`
- Create: `artifacts/design-qa-2026-08-19/` screenshots and comparison boards
- Create: `docs/reports/2026-08-19-xingyu-closed-loop.md`
- Modify: production source/tests only when a Design QA P0/P1/P2 finding has a regression test and verified fix.

**Interfaces:**
- Consumes: approved source visuals, rendered local implementation, full test suite, existing Vercel project.
- Produces: `design-qa.md` with `final result: passed`, verified Vercel Production URL, and rollback-ready commit history.

- [ ] **Step 1: Run complete local verification from a clean worktree**

Run: `pnpm lint`

Run: `pnpm typecheck`

Run: `pnpm test -- --maxWorkers=1 --reporter=dot`

Run: `pnpm test:e2e`

Run: `pnpm build`

Record exact file/test counts, elapsed time, warnings, and exit codes. A detached or truncated process without terminal evidence is not a pass.

- [ ] **Step 2: Read the Design QA rubric and capture normalized evidence in local Chrome**

Read: `C:/Users/lenovo/.codex/plugins/cache/openai-curated-remote/product-design/0.1.52/skills/design-qa/references/qa-rubric.md`

Capture 1440×1024 and 390×844 implementation screenshots after route-specific readiness, fonts loaded, and visible images complete. Capture hover, focus, selected, empty, expired, and hydration-error states where relevant.

- [ ] **Step 3: Build same-input visual comparison boards**

Combine `docs/design/selected-homepage-option-1.png` with the homepage implementation and `docs/design/xingyu-content-hub-target.png` with square/detail/profile implementations. Record source pixels, implementation pixels, CSS viewport, and density normalization in `design-qa.md`.

- [ ] **Step 4: Review the five required fidelity surfaces**

Evaluate fonts/typography, spacing/layout rhythm, colors/tokens, image quality/asset fidelity, and copy/content. Also verify icons, states, touch/keyboard, responsiveness, and accessibility.

- [ ] **Step 5: Iterate every P0/P1/P2 finding through RED → fix → recapture → compare**

Keep `final result: blocked` until no actionable P0/P1/P2 remains. Each iteration records the earlier finding, exact fix, post-fix screenshot, and comparison evidence. Commit each production fix with its regression test before continuing to the next finding.

- [ ] **Step 6: Commit the verified implementation and QA evidence**

```bash
git add design-qa.md artifacts/design-qa-2026-08-19 docs/reports/2026-08-19-xingyu-closed-loop.md
git commit -m "docs: record xingyu design qa and release evidence"
```

- [ ] **Step 7: Deploy a Vercel Preview and verify it before Production**

Use the Vercel deployment skill/CLI linked to the existing `xingyu-travel` project. Verify build status READY, routes, assets, local-storage flows, security headers, console, and no authentication prompt on the candidate Production URL.

- [ ] **Step 8: Promote the verified deployment to Production**

Confirm Production remains public while SSO protects Preview only. Do not alter team-wide authentication settings or unrelated projects.

- [ ] **Step 9: Verify the public handoff URL in a fresh unauthenticated browser context**

Open `https://xingyu-travel.vercel.app`, complete the four closed-loop stories, verify assets and image optimization, and confirm no console/page/HTTP errors. Record the final deployment ID and commit hash in the final report.

- [ ] **Step 10: Final status and rollback record**

Ensure `git status --short` is clean, identify the last known-good Production deployment, and include rollback instructions without executing a rollback.

## Plan Self-Review

- **Spec coverage:** Tasks 1–5 cover local state and personal hub; Tasks 6–9 cover content, imagery, motion, guide experience, home, and navigation; Tasks 10–11 cover all acceptance, Design QA, and Vercel requirements.
- **Type consistency:** `ProfilePreferences`, `LibraryStoreState`, `FavoriteOfferSnapshot`, `savePostAsTrip`, `TripCollection`, `FavoriteButton`, `GuideGallery`, and `DestinationFilmCarousel` are defined before their consumers.
- **Safety:** No task adds real account, payment, booking, background push, or sensitive-data collection. External booking confirmation and emergency boundaries remain regression-tested.
- **Visual integrity:** Every generated photo is a real project asset with a per-image prompt and inspection record; no CSS art, placeholder, sprite crop, scraped brand photography, or unreviewed asset is permitted.
- **No placeholders:** Each task names exact files, interfaces, test assertions, commands, expected RED/GREEN results, and commit scope.
