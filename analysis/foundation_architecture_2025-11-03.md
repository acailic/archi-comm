# Foundational Reliability Architecture — 2025-11-03

## Summary

- Added `config/tsconfig.eslint.json` (with `allowJs`) and expanded the main `config/tsconfig.json` includes so ESLint’s type-aware parser can see root `__tests__`, shared configs, and JS tooling without polluting the build graph.
- Updated ESLint configuration to point at the new project file, expanded ignore lists (`commitlint.config.cjs`, `config/vite.config.{mjs,ts}`), and left the legacy `.ts` config as a shim that re-exports the ESM module for compatibility.
- Replaced the Vitest CLI usage with `tools/scripts/vitest-runner.mjs`, a Node API wrapper that:
  - Builds an inline vitest config (aliases, coverage settings, jsdom environment).
  - Redirects coverage output to `/tmp/archicomm-vitest-coverage` to avoid EPERM.
  - Supports `--watch`, `--run`, and `--coverage` flags without writing `.timestamp-*` files to read-only directories.

## Validation Snapshot

| Command                 | Result        | Notes                                                                                                                   |
| ----------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`          | ❌            | Parser errors resolved, but lint still fails due to existing `no-unsafe-*` warnings (strict gate).                      |
| `npm run type-check`    | ❌            | Now runs fully; fails on known canvas fixture gaps (`CustomNode` shape, unused variables) and Playwright config typing. |
| `npm run test`          | ❌ (executes) | Vitest runs, failing on real test issues (service container recursion) instead of EPERM.                                |
| `npm run test:coverage` | ❌ (executes) | Coverage pipeline runs with v8 provider writing to `/tmp`; fails on same test regressions.                              |

## Follow-ups

1. Address lint safety warnings (primarily `@typescript-eslint/no-unsafe-*`) by hardening AI configuration tests or adjusting rule severity for test fixtures.
2. Repair failing Vitest suites beginning with `src/__tests__/canvas.test.tsx` (ServiceProvider recursion) before gating future changes.
3. Decide whether Playwright config should opt-in to type checking or be excluded with explicit reasoning.
4. Capture these changes in `DISCOVERIES.md` and a decision record (tsconfig layering + vitest runner introduction).
