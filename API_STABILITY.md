# API Stability Policy

This document defines ArchiComm's API stability guarantees, versioning strategy, and deprecation process.

## Versioning

ArchiComm follows [Semantic Versioning 2.0.0](https://semver.org/). Given a version number MAJOR.MINOR.PATCH:

- **Major (X.0.0)**: Breaking changes to public APIs, component interfaces, or data structures
- **Minor (0.X.0)**: New features and enhancements that are backward compatible
- **Patch (0.0.X)**: Bug fixes, documentation updates, and performance improvements that don't affect the API surface

### Examples

- `0.2.0 → 0.3.0`: Added new component types to the canvas, backward compatible
- `0.2.1 → 0.2.2`: Fixed bug in audio recording, no API changes
- `0.3.0 → 1.0.0`: Changed `DesignComponent` interface, breaking change

## Stability Levels

ArchiComm APIs are classified into three stability levels:

### Stable

**What it means**: Public APIs that follow semantic versioning guarantees. Breaking changes only occur in major releases.

**Indicators**:
- Documented in `docs/API_REFERENCE.md`
- Exported from package entry points (`@core`, `@ui`, `@canvas`, `@services`, `@audio`)
- No `@internal` JSDoc tag
- Used in official examples and documentation

**Examples**:
```typescript
// Stable - Public component interface
export interface DesignComponent {
  id: string;
  type: ComponentType;
  label?: string;
  position: Position;
  // ...
}

// Stable - Public hook
export function useCanvasState(): CanvasState {
  // ...
}

// Stable - Public store
export const useAppStore = create<AppStore>((set, get) => ({
  // ...
}));
```

### Experimental

**What it means**: APIs under active development that may change without notice. Use at your own risk.

**Indicators**:
- Marked with `@experimental` JSDoc tag
- May be documented with "⚠️ Experimental" warnings
- Typically in feature branches or behind feature flags
- May change in any release (major, minor, or patch)

**Examples**:
```typescript
/**
 * @experimental This API is experimental and may change in future releases.
 * Provides AI-powered design suggestions.
 */
export function useAIDesignSuggestions(): Suggestions {
  // ...
}
```

**Usage**:
```typescript
// OK - Explicitly opt-in to experimental features
import { useAIDesignSuggestions } from '@core/experimental';

// Your code acknowledges this may break in future releases
const suggestions = useAIDesignSuggestions();
```

### Internal

**What it means**: Implementation details not intended for public use. May change at any time without warning.

**Indicators**:
- Marked with `@internal` JSDoc tag
- Not exported from package entry points
- Located in `internal/` or `utils/` directories
- Not documented in `docs/API_REFERENCE.md`

**Examples**:
```typescript
/**
 * @internal
 * Internal utility for normalizing component positions.
 * Do not use outside of @canvas package.
 */
export function normalizePosition(pos: Position): Position {
  // ...
}
```

**Usage**:
```typescript
// NOT OK - Importing internal utilities
import { normalizePosition } from '@canvas/internal/utils';

// OK - Use public APIs instead
import { useCanvasState } from '@canvas';
```

## Public API Surface

The following APIs are considered **stable** and follow semantic versioning:

### Core Types (`@core`)
- `DesignComponent`, `Connection`, `InfoCard`
- `ComponentType`, `ConnectionType`, `VisualStyle`
- `Challenge`, `Task`, `Scenario`

### Canvas (`@canvas`)
- `CanvasController`, `NodeLayer`, `EdgeLayer`
- `useCanvasState`, `useCanvasPerformance`
- `ReactFlowCanvasWrapper`

### UI Components (`@ui`)
- `DesignCanvasCore`, `ComponentPalette`, `PropertiesPanel`
- `AssignmentPanel`, `ChallengeSelection`
- All components exported from `@ui/components`

### Audio (`@audio`)
- `SimpleAudioManager`
- Audio recording and playback APIs

### Stores
- `useAppStore`, `useCanvasStore`
- All exported store actions and selectors

### Hooks (`@shared/hooks`)
- `useOptimizedCallbacks`, `useOptimizedSelector`
- `useStableLiterals`, `useAccessibility`

## Deprecation Process

When we need to remove or change a stable API, we follow this process:

### 1. Deprecation Announcement

- Mark the API as deprecated using `@deprecated` JSDoc tag
- Add deprecation warning to console (for runtime APIs)
- Document the deprecation in `CHANGELOG.md`
- Provide migration path in the deprecation message

**Example**:
```typescript
/**
 * @deprecated Use `useCanvasState` instead. Will be removed in v1.0.0.
 *
 * Migration guide:
 * ```typescript
 * // Before
 * const state = useLegacyCanvas();
 *
 * // After
 * const state = useCanvasState();
 * ```
 */
export function useLegacyCanvas(): CanvasState {
  console.warn(
    'useLegacyCanvas is deprecated. Use useCanvasState instead. ' +
    'See https://archicomm.com/docs/migration/v1.0.0'
  );
  // ...
}
```

### 2. Deprecation Period

- Maintain the deprecated API for **at least 2 minor versions**
- Continue to document the API with deprecation warnings
- Update all examples and documentation to use the new API

**Timeline example**:
- v0.8.0: API deprecated, warnings added
- v0.9.0: Still available with warnings
- v0.10.0: Still available with warnings
- v1.0.0: API removed

### 3. Removal

- Remove the API in the next **major version**
- Document the removal in `CHANGELOG.md` under "BREAKING CHANGES"
- Provide comprehensive migration guide in release notes
- Update `docs/MIGRATION.md` with step-by-step instructions

## Breaking Changes

Breaking changes are only allowed in **major releases** (X.0.0).

### What Counts as Breaking

- Removing a public API
- Changing function signatures
- Changing return types
- Renaming exports
- Changing component props (required props, removed props, type changes)
- Changing store structure
- Changing data file formats

### What's NOT Breaking

- Adding new optional parameters
- Adding new exports
- Adding new optional component props
- Fixing bugs that make the API work as documented
- Internal refactoring that doesn't affect public APIs
- Performance improvements

### Breaking Change Checklist

Before introducing a breaking change:

1. [ ] Document the reason in an ADR (Architecture Decision Record)
2. [ ] Discuss in GitHub Discussions or issue
3. [ ] Plan the deprecation timeline
4. [ ] Write migration guide
5. [ ] Update all examples and documentation
6. [ ] Add codemod or migration script if possible
7. [ ] Announce in release notes and CHANGELOG

## Version Support

### Active Development

- **Current major version** (0.x.x): Full support, new features, bug fixes, security patches

### Long-Term Support (LTS)

- **Previous major version** (if applicable): Security fixes only, no new features
- LTS period: 12 months after next major release

**Example**:
- v0.x.x: Active development (current)
- v1.0.0 released on 2026-01-01
- v0.x.x: Security fixes only until 2027-01-01
- v1.x.x: Active development

### End of Life

- Versions older than LTS: No support, no patches
- Upgrade paths documented in `docs/MIGRATION.md`

## Feature Flags

Experimental features may be gated behind feature flags:

```typescript
// Enable experimental features
const appStore = useAppStore();
appStore.enableExperimentalFeatures(['ai-suggestions', 'voice-commands']);

// Check if feature is enabled
if (appStore.isFeatureEnabled('ai-suggestions')) {
  // Use experimental feature
}
```

Feature flags allow us to:
- Ship experimental features without affecting stability
- Gather feedback before promoting to stable
- Deprecate features gracefully

## Upgrade Guide

See `docs/MIGRATION.md` for detailed upgrade guides for each major version.

### Pre-1.0.0 Disclaimer

ArchiComm is currently in **0.x.x** (pre-1.0.0) development. While we follow semantic versioning, note that:

- Minor releases (0.X.0) may include breaking changes
- We're still stabilizing core APIs
- Major refactoring may occur as we approach 1.0.0

We'll announce 1.0.0 when all core APIs are stable and we're ready to commit to full semantic versioning.

## Questions and Feedback

- API stability questions: [GitHub Discussions](https://github.com/acailic/archicomm/discussions)
- Report API issues: [GitHub Issues](https://github.com/acailic/archicomm/issues)
- Suggest improvements: [Open a PR](https://github.com/acailic/archicomm/pulls)

---

*Last updated: 2025-09-30*
*Version: 0.2.1*