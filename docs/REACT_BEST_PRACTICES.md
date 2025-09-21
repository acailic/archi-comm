# React Best Practices for ArchiComm

This document captures the conventions we follow when building React features in the ArchiComm codebase. It highlights the architectural primitives that now exist (state manager, accessibility layer, performance tools) and explains when to reach for them.

## Component Structure

- **Prefer composition over monoliths.** Large containers such as `DesignCanvasCore` should be decomposed into focused building blocks. Use layout components (for example `DesignCanvasLayout`) to orchestrate panels and keep feature logic isolated.
- **Keep props stable.** Memoise callback collections with `useStableCallbacks` or `useCallback`. Wrap expensive children in `React.memo` and compare props with `shallow` when feasible.
- **Use context-aware providers.** Render UI under `LoggerProvider`, `RecoveryProvider`, and `AccessibilityProvider` so children can rely on `useLogger`, `useErrorRecovery`, and the accessibility hooks without repeating boilerplate.

## Hooks & State Management

- **Read store state through selectors.** Favour the `StateManager` helpers (`useUnifiedState`, `useOptimizedSelector`) to combine AppStore and canvas state in a single subscription and preserve referential stability.
- **Record render metrics when optimising.** `useComponentRenderTracking` and the `ComponentOptimizer` utility help identify wasteful renders—add them to complex components while diagnosing performance issues.
- **Encapsulate variant logic.** Use `useAppVariant` to derive the active variant and feature flags instead of duplicating environment checks.

## Performance Guidelines

- Avoid inline object/array literals inside JSX. Compute them with `useMemo`.
- Make async UI work with Suspense and keep fallback components lightweight.
- Run persistence and recovery routines via the provided hooks rather than scheduling bespoke timers.

## Accessibility Expectations

- Wrap interactive surfaces with `AccessibilityProvider` so helpers (focus traps, announcers, keyboard shortcuts) work consistently.
- Build keyboard-friendly components via `useAccessibility` hooks (`useFocusManagement`, `useAnnouncer`, `useKeyboardNavigation`).
- Provide `aria-*` metadata and explicit focus management when rendering custom controls (see `CommandPalette` and `ReactFlowCanvas` for reference).

## Testing Strategy

- Use `renderWithAppProviders` from `src/test/react-testing-utils.tsx` to render components under the same providers as the app (DI, recovery, accessibility, logging). This helper resets stores between runs and exposes utilities such as `flushPromises`.
- When writing integration-style tests, prefer the richer helpers in `integration-helpers.tsx` for canvas operations.

## Error Handling

- Wrap top-level routes with `EnhancedErrorBoundary`. It integrates with the recovery system and surfaces meaningful fallbacks to the user.
- Inside features, bubble errors to the boundary and call `useErrorRecovery` to display recovery status where appropriate.

Adhering to these practices keeps the UI modular, observable, and accessible while reducing the amount of duplicated infrastructure inside feature modules.
