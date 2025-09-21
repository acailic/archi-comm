# ADR: Unified Client State Management

**Status:** Accepted · 2024-xx-xx

## Context

ArchiComm historically used two parallel state containers:

- An RxJS-based `AppStore` for high-level workflow state (challenge selection, UI phase, feature toggles).
- A Zustand `canvasStore` for the performance-critical canvas data.

Components subscribed to each store independently which resulted in:

- Multiple subscriptions per component (e.g. `DesignCanvasCore` used six selectors),
- Hard-to-track synchronisation between app and canvas slices,
- Limited observability when debugging render thrash or stale data.

## Decision

Introduce a coordination layer with the following pieces:

- **`StateManager`** — a lightweight bridge that synchronises `AppStore` and `canvasStore`, exposes a combined snapshot, and keeps listeners in sync.
- **`useUnifiedState`** — a hook that reads from `StateManager` using a single selector, with optional shallow comparison and render-tracking labels.
- **`useOptimizedSelector`** — generic selector helper used by larger components to consolidate several store reads into one memoised selection.

The canvas refactor (`DesignCanvasLayout` + `CanvasContent`) and the app container (`AppContent`) now rely on these helpers instead of querying each store directly.

## Consequences

- Components observe fewer re-renders because selectors return aggregated slices with stable identities.
- Shared hooks such as `useUnifiedState` make it trivial to derive data that needs both app-level and canvas-level context.
- The state manager becomes the single place to integrate future stores (e.g. audio) or to plug in logging/analytics of state transitions.
- Minor complexity was added to tests; new helpers in `react-testing-utils.tsx` reset and seed both stores consistently.

## Next Steps

- Explore emitting state change events from `StateManager` to power developer tooling (render timeline, state diff visualiser).
- Consider exposing typed selectors for common view-models (e.g. `useCanvasSelection`) built on top of `useUnifiedState`.
