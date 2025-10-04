# Canvas Store Animation Actions - Implementation Guide

## Changes Made

### 1. State Interface (✅ COMPLETED)
Added to `CanvasStoreState` interface:
```typescript
// Transient animation state (not persisted, not in undo/redo)
droppedComponentId: string | null;
snappingComponentId: string | null;
flowingConnectionIds: string[];
draggedComponentId: string | null;
```

### 2. Initial State (✅ COMPLETED)
Added defaults:
```typescript
// Transient animation state defaults (not persisted)
droppedComponentId: null,
snappingComponentId: null,
flowingConnectionIds: [],
draggedComponentId: null,
```

## Remaining Work

### 3. Actions to Add

Add these actions to `mutableCanvasActions` object:

```typescript
// Animation state management with auto-clear timers
setDroppedComponent(id: string | null) {
  const state = useCanvasStore.getState();
  if (state.droppedComponentId === id) return;

  useCanvasStore.setState(
    { droppedComponentId: id },
    false, // silent: true (don't trigger undo/redo)
  );

  // Auto-clear after animation completes
  if (id) {
    setTimeout(() => {
      const currentState = useCanvasStore.getState();
      if (currentState.droppedComponentId === id) {
        useCanvasStore.setState({ droppedComponentId: null }, false);
      }
    }, 500); // Match landing animation duration
  }
},

setSnappingComponent(id: string | null) {
  const state = useCanvasStore.getState();
  if (state.snappingComponentId === id) return;

  useCanvasStore.setState(
    { snappingComponentId: id },
    false, // silent
  );

  // Auto-clear after snap animation
  if (id) {
    setTimeout(() => {
      const currentState = useCanvasStore.getState();
      if (currentState.snappingComponentId === id) {
        useCanvasStore.setState({ snappingComponentId: null }, false);
      }
    }, 300); // Match snap animation duration
  }
},

addFlowingConnection(id: string) {
  const state = useCanvasStore.getState();
  if (state.flowingConnectionIds.includes(id)) return;

  useCanvasStore.setState(
    {
      flowingConnectionIds: [...state.flowingConnectionIds, id],
    },
    false,
  );
},

removeFlowingConnection(id: string) {
  const state = useCanvasStore.getState();
  useCanvasStore.setState(
    {
      flowingConnectionIds: state.flowingConnectionIds.filter((cid) => cid !== id),
    },
    false,
  );
},

setDraggedComponent(id: string | null) {
  const state = useCanvasStore.getState();
  if (state.draggedComponentId === id) return;

  useCanvasStore.setState({ draggedComponentId: id }, false);
},

toggleAnimations() {
  const state = useCanvasStore.getState();
  useCanvasStore.setState({ animationsEnabled: !state.animationsEnabled });
},
```

### 4. Export Actions

These actions need to be included in the `canvasActions` export:

```typescript
export const canvasActions = {
  ...mutableCanvasActions,
  // ... existing exports ...
  setDroppedComponent: mutableCanvasActions.setDroppedComponent,
  setSnappingComponent: mutableCanvasActions.setSnappingComponent,
  addFlowingConnection: mutableCanvasActions.addFlowingConnection,
  removeFlowingConnection: mutableCanvasActions.removeFlowingConnection,
  setDraggedComponent: mutableCanvasActions.setDraggedComponent,
  toggleAnimations: mutableCanvasActions.toggleAnimations,
} as const;
```

### 5. Selectors to Add

Create convenient selector hooks:

```typescript
// Add to bottom of file

// Animation state selectors
export const useIsComponentDropped = (id: string) =>
  useCanvasStore((state) => state.droppedComponentId === id);

export const useIsComponentSnapping = (id: string) =>
  useCanvasStore((state) => state.snappingComponentId === id);

export const useIsConnectionFlowing = (id: string) =>
  useCanvasStore((state) => state.flowingConnectionIds.includes(id));

export const useIsDragging = () =>
  useCanvasStore((state) => state.draggedComponentId !== null);

export const useAnimationsEnabled = () =>
  useCanvasStore((state) => state.animationsEnabled);
```

### 6. Persist Configuration

Ensure animation state is NOT persisted. The `partialize` function should exclude these fields:

```typescript
partialize: (state) => ({
  // ... existing fields ...
  // Explicitly exclude transient animation state
  // droppedComponentId - NOT persisted
  // snappingComponentId - NOT persisted
  // flowingConnectionIds - NOT persisted
  // draggedComponentId - NOT persisted
}),
```

## Usage Examples

### In CustomNodeView
```typescript
import { useIsComponentDropped, useIsComponentSnapping, useAnimationsEnabled } from '@/stores/canvasStore';

function CustomNodeView({ nodeData }) {
  const isBeingDropped = useIsComponentDropped(nodeData.component.id);
  const isSnapping = useIsComponentSnapping(nodeData.component.id);
  const animationsEnabled = useAnimationsEnabled();

  return (
    <MotionDiv
      isBeingDropped={isBeingDropped}
      isSnapping={isSnapping}
      animationsEnabled={animationsEnabled}
      // ...
    />
  );
}
```

### In DragTrailOverlay
```typescript
import { useCanvasStore } from '@/stores/canvasStore';

function DragTrailOverlay() {
  const draggedComponentId = useCanvasStore(state => state.draggedComponentId);
  // ...
}
```

### Setting Animation State
```typescript
import { canvasActions } from '@/stores/canvasStore';

// When component is dropped
canvasActions.setDroppedComponent(componentId);

// When component snaps to grid
canvasActions.setSnappingComponent(componentId);

// During drag
canvasActions.setDraggedComponent(componentId);

// On drag end
canvasActions.setDraggedComponent(null);
```

## Testing

```typescript
// Test auto-clear timers
canvasActions.setDroppedComponent('component-1');
// Wait 500ms
// Verify droppedComponentId is null

// Test idempotency
canvasActions.setDroppedComponent('component-1');
canvasActions.setDroppedComponent('component-1'); // Should be no-op

// Test flowing connections
canvasActions.addFlowingConnection('conn-1');
canvasActions.addFlowingConnection('conn-2');
// Verify flowingConnectionIds has both
canvasActions.removeFlowingConnection('conn-1');
// Verify only conn-2 remains
```

## Notes

- All animation state actions use `silent: true` (second parameter `false`) to avoid triggering undo/redo
- Auto-clear timers prevent state leaks
- Selectors provide convenient access for components
- Animation state is never persisted to localStorage
- Changes are minimal and don't affect existing functionality
