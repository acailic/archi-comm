# Specialized Agent Coordination Plan — ArchiComm (2025-11-03)

This plan coordinates the specialized Amplifier agents executing the elite-quality roadmap. Every loop follows **zen-architect → modular-builder → bug-hunter → post-task-cleanup**, with domain experts injected where noted.

## Loop 1 — Foundational Reliability Gates

1. **zen-architect** drafts the configuration layering brief (tsconfig/eslint/vitest changes, temp-directory strategy).
2. **analysis-engine (DEEP)** audits existing configs for drift and captures hazards.
3. **modular-builder** applies the scoped configuration updates.
4. **test-coverage** verifies lint/test suites enforce safety invariants.
5. **bug-hunter** runs `npm run lint`, `npm run type-check`, `npm run test`, `npm run test:coverage`.
6. **post-task-cleanup** records decisions (`DISCOVERIES.md`, `ai_working/decisions/`) and trims temporary artifacts.

## Loop 2 — World-Class Canvas Completion

1. **zen-architect** finalizes virtualization, frames, AI assistant, and template contracts.
2. **modular-builder** regenerates canvas modules from the new specs.
3. **test-coverage** designs the missing regression suites (`__tests__/canvas/world-class-features.test.ts`, `e2e/canvas/world-class-features.spec.ts`).
4. **modular-builder** implements the suites and supporting fixtures.
5. **bug-hunter** runs the suites, triages regressions, and confirms performance monitors.
6. **post-task-cleanup** updates verification status files and removes stale TODO markers.

## Loop 3 — Experience Integrity

1. **analysis-engine (DEEP)** catalogs accessibility, localization, and reduced-motion gaps.
2. **zen-architect** converts findings into interface specs (ARIA, keyboard flows, locale hooks).
3. **modular-builder** applies UI adjustments and instrumentation.
4. **test-coverage** expands Playwright scripts (axe, keyboard traversal, localization smoke, reduced-motion toggles).
5. **bug-hunter** runs targeted subsets (`npm run test -- ui`, `npx playwright test accessibility`).
6. **post-task-cleanup** updates `docs/testing/accessibility.md` and refreshes snapshots.

## Loop 4 — AI & Audio Resilience

1. **integration-specialist** maps tauri/audio/AI contracts and proposes retry/offline fallbacks.
2. **zen-architect** approves the architecture and incremental persistence requirements.
3. **modular-builder** adds resiliency (retry handlers, incremental saves, quota detection).
4. **test-coverage** adds contract/unit/e2e tests for quota exhaustion, offline persistence, extended recordings.
5. **bug-hunter** executes suites plus manual smoke (service start, network drop, UI observation).
6. **post-task-cleanup** logs outcomes and flushes telemetry buffers.

## Loop 5 — Delight Animation Guardrails

1. **zen-architect** specifies motion guidelines, reduced-motion fallbacks, and performance budgets.
2. **modular-builder** completes remaining delight tasks (empty state integration, drag trails, keyframes).
3. **performance-optimizer** measures FPS/CPU via Playwright tracing and tunes thresholds.
4. **test-coverage** adds visual/perf regressions with reduced-motion toggles.
5. **bug-hunter** validates no regressions in canvas workflows.
6. **post-task-cleanup** updates `DELIGHT_FEATURES_IMPLEMENTATION_STATUS.md` and clears obsolete TODOs.

## Loop 6 — Continuous Assurance & Observability

1. **zen-architect** plans CI pipeline enhancements, telemetry hooks, and release checklist structure.
2. **analysis-engine (SYNTHESIS)** synthesizes existing docs/workflows to highlight integration points.
3. **modular-builder** updates GitHub workflows, wrapper scripts, and telemetry shims.
4. **bug-hunter** dry-runs pipelines and inspects logs for stability.
5. **post-task-cleanup** publishes the release checklist, updates SonarCloud dashboards, and documents monitoring strategy.

Each loop produces tangible artifacts (specs, implementations, tests, documentation) stored under `analysis/` or `docs/` and tracked via the Amplifier task system.
