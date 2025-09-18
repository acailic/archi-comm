# ArchiComm Architecture Guide

This guide walks through the technical architecture of ArchiComm after the repository re-organisation. It explains how the codebase is partitioned into packages, how those packages interact, and which supporting layers keep the experience consistent across desktop (Tauri) and the browser fallback.

## System Overview

ArchiComm is a Tauri desktop application powered by React 18 and TypeScript. The design surface is a highly interactive canvas backed by specialised state stores, service abstractions, and performance tooling. The app is structured around a package-oriented layout that keeps shared logic discoverable and enforces clear boundaries between the UI, canvas runtime, audio stack, and infrastructure services.

Key principles:
- **Package-first organisation.** Every cross-cutting concern lives in a dedicated package under `src/packages` with an explicit public API (`index.ts`).
- **Typed contracts end-to-end.** Shared types flow through the core package so the UI, canvas, and services consume consistent data structures.
- **Environment-aware services.** Service implementations expose the same façade whether the app runs inside Tauri or a browser fallback.
- **Performance visibility.** Canvas, audio, and store layers expose hooks for diagnostics and tracing (`src/shared/hooks/usePerformanceMonitor`, `src/lib/performance`).

## Repository Topology

```
config/                 # Centralised tool configuration (Vite, ESLint, Playwright, tsconfig, semantic-release, Sonar)
docs/                   # Tracked documentation (see docs/README.md for index)
  development/          # Ignored local-only scratch space (notes, brainstorming, TODO, etc.)
distribution/           # Packaging artefacts (Homebrew) kept out of the main git history
src/
  packages/             # Primary application packages (see below)
  shared/hooks/         # Shared React hooks grouped by domain
  lib/                  # Legacy libraries and utilities (incrementally migrating to packages)
  modules/              # Thin entrypoints that re-export package functionality for feature areas
  stores/               # Zustand/Valtio stores broken down by domain
  test/                 # Testing helpers
  dev/                  # Developer playground utilities and scenarios
src-tauri/              # Rust shell for the Tauri Desktop build
```

### Package Breakdown (`src/packages`)

| Package | Purpose | Example Exports |
| --- | --- | --- |
| `core` | Fundamental types and utilities that everything else builds upon. | `types`, `utils`, shared constants |
| `ui` | All React components, UI primitives, and composition helpers. | `components/AppContainer`, `components/ui/button` |
| `canvas` | Canvas runtime (React Flow integration, hooks, utilities). | `components/ReactFlowCanvas`, `hooks/useConnectionEditor` |
| `audio` | Recording, processing, and transcription engines. | `AudioManager`, `detectBestEngines`, engine implementations |
| `services` | Service façades for persistence, Tauri integration, and fallbacks. | `audio/AudioService`, `storage`, `tauri` |

Packages expose a “barrel” file (`index.ts`) that defines the public surface area. Consumers import through the alias defined in `config/tsconfig.json` and `config/vite.config.ts`:

```
import { DesignCanvas } from '@ui/components/DesignCanvas';
import { ReactFlowCanvas } from '@canvas/components/ReactFlowCanvas';
import { AudioManager } from '@audio';
import { StorageService } from '@services/storage';
import { CanvasState } from '@core/types';
```

### Dependency Flow

```
┌────────┐     ┌────────┐     ┌──────────┐
│  core  │ ──▶ │  ui    │ ──▶ │ modules  │
│        │     │        │     │ (feature │
│ types  │     │ view   │     │  entry)  │
└────────┘     │ layer  │     └──────────┘
     │         │        │
     │         └────────┴────────┐
     ▼                            ▼
┌────────┐     ┌────────┐     ┌──────────┐
│ canvas │ ◀── │ audio  │ ◀── │ services │
│ runtime│     │ stack  │     │ infra    │
└────────┘     └────────┘     └──────────┘
```

- `core` owns shared contracts so all packages agree on types.
- `ui` consumes `core` types and delegates specialised work to `canvas`, `audio`, or `services`.
- `canvas` and `audio` depend on `core` for types and on `services` for environment-specific integrations (e.g. file access, telemetry).
- `services` talk to the outside world (filesystem, HTTP, storage) and expose a consistent API back to the UI and runtime packages.

## Stores and Hooks

Domain-specific stores now live under `src/stores`. For example `src/stores/canvas` contains the canvas store, slice helpers, and selectors. Hooks that bridge packages (`useCanvasIntegration`, `useUndoRedo`, `usePerformanceMonitor`) live in `src/shared/hooks` and compose the stores with package APIs.

## Testing Strategy

- **Unit & integration**: Vitest files co-located with packages (`src/packages/**/__tests__`) and legacy tests under `src/__tests__`.
- **Canvas regression**: `src/__tests__/components/DesignCanvas.*.test.tsx` exercises the canvas package via the UI exports.
- **Services**: Add dedicated tests under `src/__tests__/services` to validate the service façade without invoking Tauri.
- **E2E**: Playwright config moved to `config/playwright.config.ts` with absolute paths derived from the repository root.

## Build & Tooling

All tool configuration lives in `config/`:

- `config/vite.config.ts` resolves package aliases and points Vite to the repo root/public directory.
- `config/eslint.config.js` and `config/.prettierrc` ensure linting and formatting runs against the new structure.
- `config/playwright.config.ts` resolves paths relative to the project root so E2E tests work after the move.
- `config/tsconfig.json` exposes the new path aliases and redraws include/exclude paths from the config directory.
- `config/.releaserc.json` and `config/sonar-project.properties` keep release and analysis tooling in sync with the layout.

## Working in the New Layout

- Import UI from `@ui` (or `@ui/components/...`) instead of reaching into `src/components`.
- Canvas utilities live in `@canvas`; avoid crossing package boundaries with relative imports.
- Audio logic must come from `@audio` so the recorder/transcriber engines remain encapsulated.
- Prefer `@services` when interacting with persistence or environment bridges; the package chooses the correct implementation for desktop vs web.
- Shared helpers belong in `@core`. Move additional utilities or types there as they shed coupling to legacy directories.

For migration specifics and alias mapping, see `docs/MIGRATION.md`.
