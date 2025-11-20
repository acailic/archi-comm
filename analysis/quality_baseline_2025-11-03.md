# Quality Baseline — 2025-11-03

Last audited after introducing the Vitest runner and tsconfig/ESLint layering.

## Command Status

| Command                 | Result        | Notes                                                                                                                                                                                                                                   |
| ----------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`          | ❌            | Parser errors gone; failing on `@typescript-eslint/no-unsafe-*` warnings in `src/__tests__/ai-config.test.ts` and import-order infractions in `__tests__/canvas/world-class-features.test.ts`.                                          |
| `npm run type-check`    | ❌            | Pipeline completes; failures highlight stale canvas fixtures (missing `width`/`height`/`parentId`), unused variables in `canvas-layers.integration.test.tsx`, and Playwright config typings (`reducedMotion`, mobile viewport presets). |
| `npm run test`          | ❌ (executes) | Vitest runner succeeds; suites fail on ServiceProvider recursion (`integration-helpers.tsx`) and other known regressions instead of EPERM.                                                                                              |
| `npm run test:coverage` | ❌ (executes) | Coverage runs with v8, storing reports under `/tmp/archicomm-vitest-coverage`; functional failures mirror unit run.                                                                                                                     |
| `npm run e2e`           | ⚠️ Not rerun  | Should be revisited once unit regressions are cleared; configuration now lint/type-check ready.                                                                                                                                         |

## Key Observations

1. **Configuration blockers** removed: ESLint and Vitest operate under sandbox constraints.
2. **Test health** remains poor—canvas interaction suites recurse indefinitely, blocking deeper validation.
3. **Coverage pipeline** no longer throws EPERM but still cannot deliver actionable metrics until unit failures are addressed.
4. **Playwright config** needs explicit type exclusions or helper types to avoid expanding tsconfig excludes indefinitely.

## Next Steps

- Fix the ServiceProvider recursion to surface substantive test failures.
- Address `no-unsafe-*` warnings by hardening test helpers or relaxing rules for legacy fixtures.
- Document the Vitest wrapper (`tools/scripts/vitest-runner.mjs`) and `/tmp` coverage destination in `DISCOVERIES.md` and `docs/TOOLING.md`.
