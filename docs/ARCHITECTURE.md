# ArchiComm Architecture Guide

This guide provides a consolidated technical overview of the ArchiComm application for developers. It covers system structure, core modules, performance strategies, testing, build and deployment, and best practices.

Links:
- Study workflow and scenarios: `src/docs/SystemDesignPractice.md`
- UI components and canvas: `src/components`
- Core libraries and services: `src/lib`, `src/services`

## System Overview

ArchiComm is a Tauri desktop app built with React and TypeScript for interactive system design practice. The application centers around a performant canvas system, a task/plugin framework for study modules, and a consistent developer experience that runs both in the Tauri shell and the browser (web fallback).

Architecture principles:
- Local-first desktop UX with Tauri, with graceful web fallbacks
- Clear separation of concerns between orchestration, viewport, and node rendering on the canvas
- Predictable data flow with typed contracts and utilities
- Performance budget driven by real-time interactions and frequent re-renders
- Testable boundaries for services, plugins, and UI

## Tech Stack Deep Dive

- Tauri (Rust) for desktop shell, filesystem, and native integrations
  - Tauri config: `src-tauri/tauri.conf.json`
  - Rust entrypoint: `src-tauri/src/main.rs`
- React 18 + TypeScript for UI and stateful interactions
- Vite for development and bundling (`vite.config.ts`, `src/vite.config.ts`)
- Tailwind + Radix UI for modern UI components
- Vitest for unit/integration tests; Playwright for E2E

## Project Structure

```
src/
  components/         # UI components including the canvas system
  hooks/              # Custom React hooks for app features
  lib/                # Core utilities, services, contracts, performance
  services/           # Tauri and web fallback bridges
  shared/             # Shared utilities and types
  styles/             # Global styles
  docs/               # In-app docs and study materials
src-tauri/            # Tauri Rust code and config
```

Notable modules:
- `src/components/DesignCanvas.tsx` — canvas orchestrator
- `src/components/CanvasArea.tsx` — viewport, panning/zooming, hit-testing
- `src/components/CanvasComponent.tsx` — node rendering and interactions
- `src/lib/performance/*` — performance tracking and optimization
- `src/lib/task-system/*` — task templates and plugin interfaces
- `src/services/tauri.ts`, `src/services/web-fallback.ts` — platform bridges

## Canvas System Architecture

Three-layer architecture:
- Orchestration — `DesignCanvas`
  - Owns overall canvas state, selection, tools/modes
  - Coordinates persistence and performance measurements
- Viewport/Interaction — `CanvasArea`
  - Manages zoom/pan, pointer events, keyboard shortcuts, selection boxes
  - Translates world <-> screen coordinates
- Node Rendering — `CanvasComponent`
  - Renders components, ports, labels, and attachment points
  - Handles direct manipulation (drag, resize) in a constrained way

Performance levers:
- `CanvasPerformanceManager` to track FPS, render timings, memory, and event throughput
- Batching updates and deferring non-critical work (idle callbacks, rAF)
- Culling and virtualization to limit DOM updates to visible regions
- Memoized selectors and stable props to minimize React churn

## Data Flow & State Management

- Typed contracts in `src/lib/contracts` and `src/shared/contracts`
- Deterministic state transitions for canvas operations (add/move/connect/delete)
- Error store and logger (`src/lib/errorStore.ts`, `src/lib/logger.ts`) for diagnostics
- Environment gates in `src/lib/environment.ts` for platform-specific behavior

Persistence:
- Tauri-backed storage for projects and auto-save on desktop (`src/lib/tauri.ts`, `src/services/tauri.ts`)
- Web fallback layer for previews (`src/services/web-fallback.ts`)

## Plugin System & Extensibility

- Task plugins define study modules under `src/lib/task-system/plugins/<task-id>`
- Plugin interface: `src/lib/task-system/TaskPlugin.ts`
- Templates registry: `src/lib/task-system/templates/index.ts`

A task typically includes:
- `task.json` with metadata (id, title, requirements, difficulty, time, category)
- Optional assets such as diagrams and seed data
- Optional architecture templates for pre-seeding canvas components and connections

## Performance Management

- `CanvasPerformanceManager` and `PerformanceOptimizer` track core metrics
- Live diagnostics via `components/PerformanceDashboard.tsx` and `components/DeveloperDiagnosticsPage.tsx`
- Guidelines:
  - Prefer derived values and memoization over redundant state
  - Avoid deep object identity churn in props; keep render surfaces small
  - Use virtualization/culling strategies for large diagrams

## Testing Strategy

- Unit/Integration (Vitest):
  - Located in `src/__tests__` and inline component tests
  - Coverage via `vitest` and `@vitest/coverage-v8` (`npm run test:coverage`)
- End-to-End (Playwright):
  - Scenarios under `e2e/`
  - CI workflow `e2e.yml` runs headless; local run via `npm run e2e`
- Test helpers:
  - `src/test/setup.ts` for environment setup
  - Playwright fixtures under `e2e/fixtures`

## Build & Deployment

- Web build: `npm run web:build` (Vite bundles)
- Desktop build: `npm run build` (Tauri bundles native app for OS)
- CI workflows: `.github/workflows/*.yml` including `ci.yml`, `coverage.yml`, `e2e.yml`, `security.yml`, and `build-tauri.yml`

Release considerations:
- Keep `tauri.conf.json` and icons up to date
- Validate OS-specific signing and permissions

## Development Best Practices

- TypeScript strictness; avoid `any` and prefer discriminated unions for actions
- Keep canvas props stable; memoize expensive selectors and computations
- Isolate side effects in services/hooks; keep components mostly declarative
- Follow linting and formatting (`eslint`, `prettier`) and keep PRs focused
- Ensure unit tests for new utilities and hooks; add E2E where user flows are affected

## References

- Study practice guide: `src/docs/SystemDesignPractice.md`
- Canvas: `src/components/DesignCanvas.tsx`, `src/components/CanvasArea.tsx`, `src/components/CanvasComponent.tsx`
- Performance: `src/lib/performance/CanvasPerformanceManager.ts`, `src/lib/performance/PerformanceOptimizer.ts`
- Plugins: `src/lib/task-system/TaskPlugin.ts`, `src/lib/task-system/templates/index.ts`
- Services: `src/services/tauri.ts`, `src/services/web-fallback.ts`

