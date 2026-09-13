# Task 1 report — Next.js foundation, quality gates, and brand tokens

## Files changed

- `.env.example`
- `.gitignore`
- `eslint.config.mjs`
- `next-env.d.ts`
- `next.config.ts`
- `package.json`
- `playwright.config.ts`
- `pnpm-lock.yaml`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/test/setup.ts`
- `tests/component/home-shell.test.tsx`
- `tsconfig.json`
- `vitest.config.ts`

`next-env.d.ts` and the final `tsconfig.json` JSX/include settings were generated or required by the successful Next.js build. `.gitignore` excludes the generated TypeScript build-info file.

## RED evidence

Command:

```powershell
pnpm vitest run tests/component/home-shell.test.tsx
```

Result: exit code 1. Vitest loaded the component-test environment and failed to resolve `@/app/page` because the home page did not yet exist. This was the intended pre-implementation failure for the brand-promise contract.

## Reviewer-requested RED contract validation

This validation was performed after the implementation commit in response to review feedback; it supplements, rather than rewrites, the original RED chronology above.

Using `apply_patch`, `src/app/page.tsx` was temporarily changed to render the valid semantic placeholder heading `行域 XINGYU` instead of the required brand promise. No test or assertion was changed.

Command:

```powershell
pnpm vitest run tests/component/home-shell.test.tsx
```

Result: exit code 1; the actual heading assertion ran and failed as required:

```text
TestingLibraryElementError: Unable to find an accessible element with the role "heading" and name "把远方，变成一段安心抵达的旅程"
```

Testing Library reported the only available heading as `行域 XINGYU`. The exact production heading was then restored with `apply_patch`; the same command passed, followed by a passing `pnpm verify` run.

## GREEN and quality-gate evidence

Component GREEN command:

```powershell
pnpm vitest run tests/component/home-shell.test.tsx
```

Result: exit code 0; 1 test passed. The rendered page exposes the semantic heading `把远方，变成一段安心抵达的旅程`.

Final fresh verification command:

```powershell
pnpm verify
```

Result: exit code 0.

- `pnpm lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 1 file / 1 test passed.
- `pnpm build`: passed; Next.js 16.2.12 produced static `/` and `/_not-found` routes.

## Self-review

- The page implementation is deliberately limited to the one tested, semantic brand-promise heading; it does not introduce any later-task interaction, data, or visual assets.
- `RootLayout` applies the specified Chinese locale, Noto font variables, metadata, and viewport configuration.
- Global CSS contains only the approved color, typography, sizing, corner-radius, box-sizing, and reduced-motion tokens/rules.
- Test setup uses the real React component without mocks. The test was written before `src/app/page.tsx` and observed failing before the page existed.
- Fresh unpinned package resolution selected TypeScript 7 and ESLint 10, which are incompatible with the installed `eslint-config-next` dependency chain. Task 1 therefore pins TypeScript 6.0.3 and ESLint 9.39.5, the compatible majors, while preserving the requested toolchain and scripts.

## Commit

- `20679924edba552db7c7e4d376f38a84ea7264cb` — `chore: initialize xingyu next app`

## Concerns

- No `tests/e2e` files are created in Task 1, so `pnpm test:e2e` is configured but was not run; later tasks should add the first browser scenario before treating that command as a passing gate.
- The package-manager declaration uses `pnpm@10.0.0` rather than the shorthand `pnpm@10`, because current pnpm requires an exact version and otherwise emits a warning on every command.
