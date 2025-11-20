# Elite Quality Roadmap — ArchiComm (2025-11-03)

## Current Focus & Progress

1. **Foundational Reliability Gates** (in flight)
   - ✅ tsconfig/ESLint layering completed.
   - ✅ Vitest runner introduced; coverage redirected to `/tmp`.
   - 🔴 Outstanding: tame `no-unsafe-*` lint warnings, fix ServiceProvider recursion, decide on Playwright typing strategy.

2. **World-Class Canvas Completion** (blocked by tests)
   - Specs exist; awaiting stable unit suite before regenerating modules and adding regression coverage.

3. **Experience Integrity** (queued)
   - Accessibility/localization audits deferred until core suites pass; reduced-motion hooks needed for forthcoming delight work.

4. **AI & Audio Resilience**, **Delight Guardrails**, **Continuous Assurance** remain queued pending stability of loops 1–3.

## Immediate Actions

| Priority | Action                                                                                                    | Owner Loop |
| -------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| P0       | Fix ServiceProvider recursion (`src/test/integration-helpers.tsx`) so vitest can surface real regressions | Loop 1     |
| P0       | Decide lint strategy for `@typescript-eslint/no-unsafe-*` in test harnesses                               | Loop 1     |
| P1       | Harden Playwright config types or document exclusion rationale                                            | Loop 1     |
| P1       | Begin world-class canvas regeneration once tests are green                                                | Loop 2     |
| P2       | Draft accessibility gap report (analysis-engine DEEP)                                                     | Loop 3     |

---

Target: move ArchiComm Community Edition into the top 0.01% of open-source polish. Themes are ordered by impact; each theme lists acceptance criteria, scope, and required agent loops (architecture → implementation → verification → cleanup).

## 1. Foundational Reliability Gates (Critical)

**Objective**: Reinstate deterministic CI and local dev feedback loops.

- **Fix ESLint project graph** so all JS/TS files (including `__tests__/` and config roots) are part of `config/tsconfig.json`. Acceptance: `npm run lint` passes with zero warnings (strict gate), no `parserOptions.project` errors.
- **Resolve Vitest temp file EPERM** by redirecting bundler cache to the repo’s writable temp directory or disabling timestamp bundling. Acceptance: `npm run test`, `npm run test:coverage:check` succeed headless on macOS sandbox.
- **Eliminate unsafe `any` usage in AI config tests**; replace with typed helpers or fixture builders. Acceptance: no `@typescript-eslint/no-unsafe-*` warnings.
- **Stabilize Playwright artifacts**: ensure `config/playwright.shared.ts` participates in type checking so env drift is caught before runtime.
- **Agent loop**: `zen-architect` (determine config changes) → `modular-builder` (tsconfig/eslint/vitest patches) → `bug-hunter` (rerun suites) → `post-task-cleanup` (remove stale temp dirs).

## 2. World-Class Canvas Completion (Critical)

**Objective**: Deliver promised features called out in `VERIFICATION_IMPLEMENTATION_STATUS.md`.

- Implement virtualization wiring, frames, search, AI canvas assistant placeholders, and pattern library scaffolding (Comment 3–10).
- Complete TODO unit/E2E suites (`__tests__/canvas/world-class-features.test.ts`, `e2e/canvas/world-class-features.spec.ts`) covering:
  - 1000+ node virtualization thresholds
  - Frames CRUD + navigation breadcrumbs
  - Template library browsing/apply
  - AI text-to-diagram (mock provider) & rate-limited failure case
  - Presentation flow transitions
- Acceptance: all TODO files replaced by working code/tests; delight backlog reclassified.
- **Agent loop**: `zen-architect` (feature contract), `modular-builder` (implementation), `test-coverage` (ensure cases), `bug-hunter` (regressions), `post-task-cleanup`.

## 3. Experience Integrity (High)

**Objective**: Guarantee accessibility, localization, and reduced-motion friendliness.

- Add reduced-motion code paths for upcoming animations (Kick off when Comment 5 placeholders ship). Tests should toggle `prefers-reduced-motion`.
- Extend Playwright coverage for screen-reader landmarks and keyboard navigation across onboarding, canvas toolbar, and audio recorder.
- Prepare localization smoke tests (string extraction, `Intl` fallbacks) even if only English is available today.
- Acceptance: automated accessibility suite passes with axe + reduced-motion toggles; manual checklist stored in `docs/testing/accessibility.md`.
- **Agent loop**: `analysis-engine` (DEEP review of current UI), `modular-builder`, `test-coverage`, `post-task-cleanup`.

## 4. AI & Audio Resilience (High)

- Introduce contract tests for AI rate limiting, offline mode, and transcription retries (unit: mocked adapters; integration: dependency injection tests; e2e: simulated API timeout with deterministic fallback).
- Persist audio session metadata incrementally to avoid data loss (align with Incremental Processing pattern).
- Acceptance: new tests demonstrate graceful degradation; documentation in `docs/testing/ai_audio.md`.
- **Agent loop**: `integration-specialist` for tauri/API interactions, `modular-builder`, `bug-hunter`.

## 5. Delight Animation Guardrails (Medium)

- Complete remaining delight feature tasks (CanvasContent empty state, DragTrailOverlay wiring, CSS keyframes).
- Add regression specs verifying animation configuration honors `prefers-reduced-motion`, does not impact frame rate > 16ms under load.
- Acceptance: Playwright visual snapshots remain within tolerance; performance tests confirm stable FPS.
- **Agent loop**: `zen-architect` (animation spec), `modular-builder`, `performance-optimizer`, `post-task-cleanup`.

## 6. Continuous Assurance & Observability (High)

- Harden CI with stages: lint → unit → coverage → e2e → nightly world-class suite. Surface results to SonarCloud badges and GitHub checks.
- Instrument telemetry hooks (even if mocked) to verify error boundaries emit structured events; add regression tests that capture logs.
- Document release checklist ensuring `make check`, `npm run test`, and `npm run e2e --project=chromium` are mandatory gates.
- Acceptance: CI green by default; dashboards reflect latest coverage/perf metrics; release checklist stored under `docs/release/README.md`.
- **Agent loop**: `zen-architect`, `analysis-engine` (TRIAGE mode on flaky tests), `post-task-cleanup`.

## Supporting Actions

- Update `DISCOVERIES.md` with resolved issues (Vitest EPERM, lint project graph, world-class feature verification).
- Create decision records for major configuration changes in `ai_working/decisions/`.
- Ensure every new module follows the modular “brick & stud” principle with local README/spec.

## Success Metrics

- ✅ 100% of quality gates automated (lint/type/test/e2e) and passing.
- ✅ Coverage thresholds maintained at ≥80/80/75 (unit/integration/e2e) without manual waivers.
- ✅ No open TODO placeholders in production code paths.
- ✅ Accessibility audits pass (axe + keyboard + reduced motion).
- ✅ Release checklist executed per milestone with attached artifacts.
