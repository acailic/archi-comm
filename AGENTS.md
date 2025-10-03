# Repository Guidelines

## Project Structure & Module Organization
ArchiComm pairs a React/TypeScript front end with a Tauri shell. Application code lives in `src/`, with feature modules under `src/modules`, shared UI primitives in `src/packages/ui`, cross-cutting libraries in `src/lib`, and persisted state helpers under `src/stores` and `src/shared`. Browser-oriented tests sit in `src/__tests__`, while Playwright specs reside in `e2e/`. Desktop bindings, commands, and Rust plugins are under `src-tauri/`. Build and tooling configuration is centralized in `config/`, automation scripts live in `tools/`, and product documentation and assets are stored in `docs/` and `distribution/` respectively.

## Build, Test & Development Commands
Use `npm run dev` for the Vite web preview and `npm run tauri:dev` for the native shell. Ship-ready bundles are produced with `npm run build` (desktop) or `npm run web:build` (browser). Run `npm run lint` and `npm run format` before committing to ensure ESLint/Prettier compliance. Unit and integration suites execute with `npm run test`, while `npm run test:coverage:check` enforces coverage gates. For browser automation, run `npm run e2e`, and validate types with `npm run type-check`.

## Coding Style & Naming Conventions
Formatting is handled by Prettier (`config/.prettierrc`) with 2-space indentation, single quotes, `printWidth` 100, and LF endings; never hand-format around those defaults. ESLint (`config/eslint.config.js`) must pass without warnings; prefer explicit imports and let the `@/` alias resolve to `src/`. React components, hooks, and Zustand stores should be named `PascalCase`/`camelCase`, follow the existing directory-level README guidance, and colocate styles in `*.css` or `styles/` siblings when applicable.

## Testing Guidelines
Write Vitest specs beside related code or in `src/__tests__` using the `*.test.ts(x)` suffix. Keep the 80/80/75 coverage thresholds green by running `npm run test:coverage:check` locally and adding targeted tests when instrumentation drops. End-to-end flows belong in `e2e/` with descriptive folder names and Playwright’s `@axe-core/playwright` accessibility checks enabled where practical. Document any new fixtures in `docs/testing.md` if behavior differs from current conventions.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) with imperative, <=72-character subjects—commitlint enforces this at commit time. Before opening a PR, ensure lint, tests, and coverage scripts are green and attach console output or screenshots for UI-impacting work. Reference related issues, describe risk/rollback steps, and, when touching critical flows, note any `tools/` automation you executed (e.g., `npm run validate:structure` or `node tools/cli/ai-review.js staged`).
