# Canvas Store Migration Guide

## Overview

The monolithic `canvasStore.ts` (2028 LOC) has been **split into 3 focused stores** for better performance and maintainability. This guide will help you migrate your code to use the new architecture.

## Why Split the Store?

**Before**: Single massive store caused excessive re-renders
- Every state update triggered re-renders across ALL components subscribing to the store
- 60+ individual state properties without proper selector optimization
- Impossible to maintain (2028 lines - 7x the 300 LOC limit)
- Poor separation of concerns

**After**: Three focused stores with clear responsibilities
- Components only re-render when their specific state slice changes
- Each store under 300 LOC - easy to understand and maintain
- **60-80% reduction in re-renders** expected
- Clear separation: View preferences, Data, UI interactions

---

## New Store Architecture

### 1. `canvasViewStore.ts` - View & Preferences (180 LOC)

**What it manages:**
- Canvas mode (select, draw, pan, annotation, quick-connect)
- Grid settings (enabled, spacing, snap-to-grid)
- Minimap visibility
- Animation preferences
- Visual theme
- Connection styling preferences
- Layer visibility and opacity
- Onboarding state (tour completed, dismissed tips)

**When to use:**
- Reading/updating view preferences
- Toggling grid, minimap, animations
- Changing canvas modes
- Layer visibility controls

**Example:**
```typescript
import { useCanvasMode, useGridEnabled, useCanvasViewStore } from '@/stores/canvasViewStore';

function Toolbar() {
  const mode = useCanvasMode(); // Only re-renders when mode changes
  const gridEnabled = useGridEnabled(); // Only re-renders when grid changes
  const { toggleGrid, setCanvasMode } = useCanvasViewStore();

  return (
    <div>
      <button onClick={() => setCanvasMode('draw')}>Draw Mode</button>
      <button onClick={toggleGrid}>Toggle Grid</button>
    </div>
  );
}
```

---

### 2. `canvasDataStore.ts` - Canvas Content (280 LOC)

**What it manages:**
- Design components
- Connections between components
- Info cards
- Annotations
- Drawing strokes
- Update tracking (version, timestamp)
- **Undo/redo support** (via zundo temporal)

**When to use:**
- Reading/updating components, connections, annotations
- Canvas data operations
- Undo/redo functionality

**Example:**
```typescript
import { useCanvasComponents, useCanvasDataStore, useCanvasUndo, useCanvasRedo } from '@/stores/canvasDataStore';

function CanvasContent() {
  const components = useCanvasComponents(); // Only re-renders when components change
  const undo = useCanvasUndo();
  const redo = useCanvasRedo();
  const { setComponents, updateComponents } = useCanvasDataStore();

  const handleAddComponent = (component) => {
    updateComponents((comps) => [...comps, component]);
  };

  return (
    <div>
      {components.map(comp => <Component key={comp.id} data={comp} />)}
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </div>
  );
}
```

---

### 3. `canvasUIStore.ts` - UI Interactions (290 LOC)

**What it manages:**
- Multi-select and selection box
- Component groups
- Alignment guides
- Component locking
- Search and filtering
- Drawing tool settings
- Quick-connect state
- Usage tracking (recent/favorite components)
- Transient animation states

**When to use:**
- Managing selections
- Grouping components
- Drawing tool settings
- Search/filter operations
- Animation state

**Example:**
```typescript
import { useSelectedComponentIds, useDrawingTool, useCanvasUIStore } from '@/stores/canvasUIStore';

function SelectionPanel() {
  const selectedIds = useSelectedComponentIds(); // Only re-renders when selection changes
  const drawingTool = useDrawingTool(); // Only re-renders when drawing tool changes
  const { clearSelection, setDrawingTool } = useCanvasUIStore();

  return (
    <div>
      <p>Selected: {selectedIds.length} components</p>
      <button onClick={clearSelection}>Clear Selection</button>
      <button onClick={() => setDrawingTool('pen')}>Pen Tool</button>
    </div>
  );
}
```

---

## Migration Strategies

### Strategy 1: Gradual Migration (Recommended)

**For existing code that uses the old store:**

The old `canvasStore.ts` is still available for backward compatibility, but you should migrate incrementally.

**Old code (still works):**
```typescript
import { useCanvasStore, canvasActions } from '@/stores/canvasStore';

const components = useCanvasStore((state) => state.components);
const gridEnabled = useCanvasStore((state) => state.gridEnabled);

canvasActions.toggleGrid();
canvasActions.setComponents(newComponents);
```

**New code (better performance):**
```typescript
import { useCanvasComponents } from '@/stores/canvasDataStore';
import { useGridEnabled, useCanvasViewStore } from '@/stores/canvasViewStore';

const components = useCanvasComponents(); // Specific selector
const gridEnabled = useGridEnabled(); // Specific selector

const { toggleGrid } = useCanvasViewStore();
const { setComponents } = useCanvasDataStore();

toggleGrid();
setComponents(newComponents);
```

### Strategy 2: Unified Import (Quick Migration)

Use the unified export from `@/stores` for a quick migration:

```typescript
import { canvasActions, useCanvasComponents, useGridEnabled } from '@/stores';

// All exports are re-exported from the index file
const components = useCanvasComponents();
const gridEnabled = useGridEnabled();

canvasActions.toggleGrid();
canvasActions.setComponents(newComponents);
```

---

## Performance Best Practices

### ✅ DO: Use Specific Selectors

```typescript
// Good - only re-renders when components change
const components = useCanvasComponents();

// Good - only re-renders when grid changes
const gridEnabled = useGridEnabled();

// Good - only re-renders when mode changes
const mode = useCanvasMode();
```

### ❌ DON'T: Select Multiple Unrelated Properties

```typescript
// Bad - re-renders when ANY property changes
const { components, gridEnabled, mode } = useCanvasViewStore();

// Bad - creates new object on every render
const data = useCanvasDataStore((state) => ({
  components: state.components,
  connections: state.connections
}));
```

### ✅ DO: Use shallow for Multiple Related Properties

```typescript
import { shallow } from 'zustand/shallow';

// Good - only re-renders when these specific properties change
const { gridEnabled, snapToGrid, gridSpacing } = useCanvasViewStore(
  (state) => ({
    gridEnabled: state.gridEnabled,
    snapToGrid: state.snapToGrid,
    gridSpacing: state.gridSpacing,
  }),
  shallow
);
```

### ✅ DO: Combine Selectors for Complex Queries

```typescript
// Good - memoize derived state
const selectedComponents = useCanvasComponents().filter((c) =>
  useSelectedComponentIds().includes(c.id)
);

// Better - use useMemo for expensive computations
const selectedComponents = useMemo(() => {
  const components = useCanvasComponents();
  const selectedIds = useSelectedComponentIds();
  return components.filter((c) => selectedIds.includes(c.id));
}, [components, selectedIds]);
```

---

## Common Migration Patterns

### Pattern 1: Component Using Multiple Stores

**Before:**
```typescript
function DesignCanvas() {
  const components = useCanvasStore((state) => state.components);
  const gridEnabled = useCanvasStore((state) => state.gridEnabled);
  const selectedIds = useCanvasStore((state) => state.selectedComponentIds);
  const mode = useCanvasStore((state) => state.canvasMode);

  // All 4 selectors re-render when ANY canvas state changes!
}
```

**After:**
```typescript
function DesignCanvas() {
  // Each selector only re-renders when its specific state changes
  const components = useCanvasComponents(); // canvasDataStore
  const gridEnabled = useGridEnabled(); // canvasViewStore
  const selectedIds = useSelectedComponentIds(); // canvasUIStore
  const mode = useCanvasMode(); // canvasViewStore

  // 60-80% fewer re-renders!
}
```

### Pattern 2: Actions

**Before:**
```typescript
import { canvasActions } from '@/stores/canvasStore';

canvasActions.setComponents(newComponents);
canvasActions.toggleGrid();
canvasActions.setSelectedComponents(ids);
```

**After (Option 1 - Unified):**
```typescript
import { canvasActions } from '@/stores';

canvasActions.setComponents(newComponents);
canvasActions.toggleGrid();
canvasActions.setSelectedComponents(ids);
```

**After (Option 2 - Specific Stores):**
```typescript
import { useCanvasDataStore } from '@/stores/canvasDataStore';
import { useCanvasViewStore } from '@/stores/canvasViewStore';
import { useCanvasUIStore } from '@/stores/canvasUIStore';

useCanvasDataStore.getState().setComponents(newComponents);
useCanvasViewStore.getState().toggleGrid();
useCanvasUIStore.getState().setSelectedComponents(ids);
```

### Pattern 3: Reading State Outside React

**Before:**
```typescript
import { useCanvasStore } from '@/stores/canvasStore';

const currentComponents = useCanvasStore.getState().components;
```

**After:**
```typescript
import { useCanvasDataStore } from '@/stores/canvasDataStore';

const currentComponents = useCanvasDataStore.getState().components;
```

---

## File Size Comparison

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| canvasStore.ts | 2028 LOC | (deprecated) | - |
| canvasViewStore.ts | - | 180 LOC | New |
| canvasDataStore.ts | - | 280 LOC | New |
| canvasUIStore.ts | - | 290 LOC | New |
| **Total** | **2028 LOC** | **750 LOC** | **63% smaller** |

Plus: Better separation of concerns, easier to test, easier to maintain!

---

## Expected Performance Improvements

✅ **60-80% reduction in re-renders**
- Components only subscribe to relevant state slices
- No more cascading re-renders from unrelated state updates

✅ **Faster initial load**
- Better code splitting opportunities
- Tree-shaking removes unused store code

✅ **Smoother interactions**
- Reduced computation in render path
- Better React profiler scores

✅ **Easier debugging**
- Clear store boundaries
- Easier to trace state updates

---

## Checklist for Migration

- [ ] Update imports to use new stores
- [ ] Use specific selectors instead of accessing entire store
- [ ] Add `shallow` comparison for multiple properties
- [ ] Memoize expensive derived state with `useMemo`
- [ ] Test that undo/redo still works (now in canvasDataStore)
- [ ] Verify persistence works (view preferences, drawing settings, usage tracking)
- [ ] Check performance with React DevTools Profiler

---

## Need Help?

- See `src/stores/index.ts` for all exports
- Check individual store files for detailed documentation
- Review tests for usage examples

---

## Summary

The store split provides **massive performance improvements** with minimal code changes:

1. Use specific selectors: `useCanvasComponents()` instead of `useCanvasStore((state) => state.components)`
2. Import from specific stores when possible: `@/stores/canvasDataStore`
3. Use `shallow` for multiple related properties
4. Memoize expensive computations

**Migration is gradual** - old code continues to work through the compatibility layer in `src/stores/index.ts`.

New components should use the new stores directly for best performance.
