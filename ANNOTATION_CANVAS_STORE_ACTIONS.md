# Canvas Store Annotation Actions - Implementation Guide

## Status: Partially Complete

### ✅ Completed
1. Added `Annotation` import to canvas store
2. Added `annotations: Annotation[]` to `CanvasStoreState` interface
3. Added `annotations: []` to `initialState`

### 📝 Remaining Work

Add these annotation actions to `mutableCanvasActions` object (around line 443):

```typescript
// Annotation Management Actions
setAnnotations(annotations: Annotation[], options?: ArrayActionOptions) {
  const current = useCanvasStore.getState().annotations;
  if (arraysEqual(current, annotations)) return;

  applyUpdate(
    "setAnnotations",
    (draft) => {
      draft.annotations = annotations;
    },
    options,
  );
},

updateAnnotations(
  updater: (annotations: Annotation[]) => Annotation[],
  options?: ArrayActionOptions
) {
  const current = useCanvasStore.getState().annotations;
  const updated = updater(current);
  if (arraysEqual(current, updated)) return;

  applyUpdate(
    "updateAnnotations",
    (draft) => {
      draft.annotations = updated;
    },
    options,
  );
},

addAnnotation(
  annotation: Omit<Annotation, "id" | "timestamp">,
  options?: BaseActionOptions
) {
  const id = crypto.randomUUID?.() || `annotation-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = Date.now();

  const newAnnotation: Annotation = {
    ...annotation,
    id,
    timestamp,
    visible: annotation.visible ?? true,
  };

  applyUpdate(
    "addAnnotation",
    (draft) => {
      draft.annotations.push(newAnnotation);
    },
    options,
  );

  return newAnnotation;
},

updateAnnotation(
  id: string,
  updates: Partial<Annotation>,
  options?: BaseActionOptions
) {
  const state = useCanvasStore.getState();
  const annotation = state.annotations.find((a) => a.id === id);
  if (!annotation) {
    console.warn(`updateAnnotation: annotation ${id} not found`);
    return;
  }

  applyUpdate(
    "updateAnnotation",
    (draft) => {
      const index = draft.annotations.findIndex((a) => a.id === id);
      if (index !== -1) {
        draft.annotations[index] = { ...draft.annotations[index], ...updates };
      }
    },
    options,
  );
},

deleteAnnotation(id: string, options?: BaseActionOptions) {
  applyUpdate(
    "deleteAnnotation",
    (draft) => {
      draft.annotations = draft.annotations.filter((a) => a.id !== id);
    },
    options,
  );
},

clearAnnotations(options?: BaseActionOptions) {
  const current = useCanvasStore.getState().annotations;
  if (current.length === 0) return;

  applyUpdate(
    "clearAnnotations",
    (draft) => {
      draft.annotations = [];
    },
    options,
  );
},
```

### Export Actions

Add to the `canvasActions` export (around line 840):

```typescript
export const canvasActions = {
  ...mutableCanvasActions,
  // ... existing exports ...
  setAnnotations: mutableCanvasActions.setAnnotations,
  updateAnnotations: mutableCanvasActions.updateAnnotations,
  addAnnotation: mutableCanvasActions.addAnnotation,
  updateAnnotation: mutableCanvasActions.updateAnnotation,
  deleteAnnotation: mutableCanvasActions.deleteAnnotation,
  clearAnnotations: mutableCanvasActions.clearAnnotations,
} as const;
```

### Add Selectors

Add after line 905 (after existing selectors):

```typescript
// Annotation selectors
export const useCanvasAnnotations = () =>
  useCanvasStore((state) => state.annotations, shallow);

export const useAnnotationsByType = (type: Annotation['type']) =>
  useCanvasStore((state) => state.annotations.filter((a) => a.type === type));

export const useAnnotationsInRegion = (x: number, y: number, width: number, height: number) =>
  useCanvasStore((state) =>
    state.annotations.filter(
      (a) =>
        a.x < x + width &&
        a.x + a.width > x &&
        a.y < y + height &&
        a.y + a.height > y
    )
  );

export const useCanvasMode = () =>
  useCanvasStore((state) => state.canvasMode);
```

### Update updateCanvasData

Find `updateCanvasData` function (around line 607) and add annotation handling:

```typescript
updateCanvasData(
  data: {
    components?: DesignComponent[];
    connections?: Connection[];
    infoCards?: InfoCard[];
    annotations?: Annotation[]; // Add this
  },
  options?: UpdateCanvasDataOptions
) {
  // ... existing code ...

  // Add this block
  if (data.annotations !== undefined) {
    this.setAnnotations(data.annotations, { silent: options?.silent });
  }
}
```

### Update resetCanvas

Find `resetCanvas` function (around line 661) and add:

```typescript
resetCanvas(options?: BaseActionOptions) {
  applyUpdate(
    "resetCanvas",
    (draft) => {
      draft.components = [];
      draft.connections = [];
      draft.infoCards = [];
      draft.annotations = []; // Add this line
      draft.selectedComponent = null;
      draft.connectionStart = null;
    },
    options,
  );
}
```

### Update useNormalizedCanvasData

Find `useNormalizedCanvasData` selector (around line 962) and add annotations:

```typescript
export const useNormalizedCanvasData = () => {
  return useCanvasStore((state) => ({
    components: state.components,
    connections: state.connections,
    infoCards: state.infoCards,
    annotations: state.annotations, // Add this line
    // ... rest of the data
  }), shallow);
};
```

### Update Persistence Configuration

In the `partialize` function (around line 391), ensure annotations are included:

```typescript
partialize: (state) => ({
  components: state.components,
  connections: state.connections,
  infoCards: state.infoCards,
  annotations: state.annotations, // Add this line
  // ... rest of persisted state
}),
```

## Usage Examples

```typescript
// Add annotation
const newAnnotation = canvasActions.addAnnotation({
  type: 'note',
  content: 'Important note',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  color: '#fef3c7',
});

// Update annotation
canvasActions.updateAnnotation('annotation-id', {
  content: 'Updated content',
  resolved: true,
});

// Delete annotation
canvasActions.deleteAnnotation('annotation-id');

// Get all annotations
const annotations = useCanvasAnnotations();

// Get annotations by type
const notes = useAnnotationsByType('note');
```

## Notes

- All annotation actions use the same `applyUpdate` pattern as existing actions
- Annotations are included in undo/redo via temporal middleware
- Annotations are persisted to localStorage
- ID generation uses `crypto.randomUUID()` with fallback
- Change detection prevents unnecessary updates
