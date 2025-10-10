# Canvas Code Review Fixes

This document tracks all fixes implemented from the comprehensive code review.

## ✅ Completed Fixes

### 1. ContextMenu Focus Trapping and ARIA Roles
**Status:** ✅ Completed
**File:** `src/packages/canvas/components/ContextMenu.tsx`

**Changes:**
- Added focus trapping with `previousFocusRef` to save and restore focus
- Implemented roving tabindex pattern (`tabIndex={0}` for focused item, `-1` for others)
- Added proper ARIA roles for separators (`role="separator"`)
- Added proper ARIA roles for menu groups (`role="group"`)
- All buttons now have `role="menuitem"` without duplicates
- Added `aria-label` to all menu items for screen readers
- Implemented Tab/Shift+Tab cycling within menu
- Escape key closes menu and restores focus
- Arrow keys navigate between items
- Enter/Space activates focused item

### 2. ContextMenu Select All Action Mismatch
**Status:** ✅ Completed
**File:** `src/packages/canvas/components/ContextMenu.tsx`

**Changes:**
- Fixed "Select All" button to dispatch `canvas:select-all` event
- Previously called `onComponentDeselect()` which was incorrect
- Now properly selects all components when clicked

### 3. Remove Duplicate Role Attributes
**Status:** ✅ Completed
**File:** `src/packages/canvas/components/ContextMenu.tsx`

**Changes:**
- Removed all duplicate `role="menuitem"` attributes
- Added proper button styles (background: none, border: none, cursor: pointer)
- Ensured consistent ARIA attributes across all menu items

### 4. Zoom Configuration
**Status:** ✅ Completed
**Files:**
- `src/packages/canvas/config/CanvasConfig.ts`
- `src/packages/canvas/contexts/CanvasConfigContext.tsx`
- `src/packages/canvas/components/VirtualCanvas.tsx`
- `src/packages/canvas/components/ReactFlowCanvasWrapper.tsx`

**Changes:**
- Lowered default zoom from 1.0 to 0.65 (65%) to show ~50% more canvas area
- Enhanced zoom controls visibility with explicit props
- Positioned controls prominently in top-right corner
- Enabled `showZoom`, `showFitView`, and `showInteractive` options

### 5. Review Screen Canvas Component Positioning
**Status:** ✅ Completed
**Files:**
- `src/packages/ui/components/pages/ReviewScreen.tsx`
- `src/packages/ui/components/canvas/CanvasComponent.tsx`

**Changes:**
- Fixed component layout by removing redundant wrappers and relying on absolute positioning
- Replaced hardcoded canvas dimensions with dynamic bounds based on component positions
- Added viewport tracking, minimap integration, and scroll-aware navigation helpers
- Introduced pan/zoom handlers and loading guard while the canvas prepares
- Updated SVG connection rendering to follow dynamic sizing and zoom scaling

**Issue:** Components overlapped at origin due to conflicting positioning logic and rigid canvas sizing
**Solution:** Standardize absolute positioning across canvas elements and augment review tooling with navigation aids

## 🔄 Partially Implemented / Needs Review

### 5. SelectionBox Viewport Transformation
**Status:** 🔄 Needs Implementation
**Files:**
- `src/packages/ui/components/canvas/SelectionBox.tsx`
- `src/packages/ui/components/DesignCanvas/components/CanvasContent.tsx`

**TODO:**
```typescript
// In SelectionBox.tsx
// Add viewport prop
interface SelectionBoxProps {
  viewport: { x: number; y: number; zoom: number };
}

// Transform world coordinates to screen coordinates
const screenX = box.x * viewport.zoom + viewport.x;
const screenY = box.y * viewport.zoom + viewport.y;
const screenWidth = box.width * viewport.zoom;
const screenHeight = box.height * viewport.zoom;

// In CanvasContent.tsx
<SelectionBox viewport={viewport} />
```

### 6. ReactFlow Integration Locked Component Filtering
**Status:** 🔄 Needs Implementation
**File:** `src/packages/canvas/hooks/useReactFlowIntegration.ts`

**TODO:**
```typescript
// Replace
const updatedComponents = fromNodeChanges(changes, components);

// With
const updatedComponents = fromNodeChanges(allowedChanges, components);
```

### 7. CanvasInteractionLayer Store Import
**Status:** 🔄 Needs Implementation
**File:** `src/packages/canvas/components/CanvasInteractionLayer.tsx`

**TODO:**
- Import `{ useCanvasStore }` if using `useCanvasStore.getState()`
- Remove unused debug code referencing `component = canvasActions.getDebugInfo()`

## 📋 Pending Implementation

### 8. Optimize Alignment Guide Detection
**File:** `src/stores/canvasStore.ts`

**Recommendation:**
- Implement quad-tree or uniform grid spatial indexing
- Throttle updates via `requestAnimationFrame`
- Reduce GC pressure by tracking visibility flags instead of resetting arrays

### 9. Filter Locked Components from Selection Drag
**File:** `src/packages/ui/components/DesignCanvas/components/CanvasContent.tsx`

**TODO:**
```typescript
// In handleSelectionEnd
const selectedIds = comps
  .filter(c => {
    // Existing intersection logic
    const intersects = /* ... */;
    return intersects && !c.locked; // Filter locked components
  })
  .map(c => c.id);
```

### 10. Refactor SelectionBox Style Memoization
**File:** `src/packages/ui/components/canvas/SelectionBox.tsx`

**TODO:**
- Move style object to top-level `useMemo`
- Keep code consistent with `AlignmentGuides` and `ComponentGroupOverlay`

### 11. Create Scoped Event Bus
**Files:**
- `src/lib/events/shortcutBus.ts` (new)
- `src/lib/shortcuts/KeyboardShortcuts.ts`
- `src/packages/ui/components/DesignCanvas/components/CanvasContent.tsx`

**TODO:**
```typescript
// lib/events/shortcutBus.ts
export const shortcutBus = {
  on(topic: string, handler: Function): () => void,
  off(topic: string, handler: Function): void,
  emit(topic: string, detail?: any): void
};
```

### 12. Implement Zoom-to-Selection Handler
**File:** `src/packages/ui/components/DesignCanvas/components/CanvasContent.tsx`

**TODO:**
```typescript
useEffect(() => {
  const handleZoomToSelection = () => {
    const selectedIds = useCanvasStore.getState().selectedComponentIds;
    if (selectedIds.length > 0 && reactFlowInstance) {
      // Compute bounding box and call reactFlowInstance.fitView()
    }
  };
  window.addEventListener('shortcut:zoom-to-selection', handleZoomToSelection);
  return () => window.removeEventListener('shortcut:zoom-to-selection', handleZoomToSelection);
}, []);
```

### 13. Enhance AlignmentToolbar Accessibility
**File:** `src/packages/ui/components/canvas/AlignmentToolbar.tsx`

**TODO:**
- Add `aria-disabled` on distribution buttons when selection < 3
- Ensure visible focus styles on all buttons
- Add `aria-label` with operation details

### 14. Improve Rate Limiter Feedback
**File:** `src/stores/canvasStore.ts`

**TODO:**
- Exempt discrete actions (align, distribute, lock) from aggressive limiting
- Batch drag-related updates via `requestAnimationFrame`
- Expose diagnostics in UI when limiter engages

### 15. Fix Debounce Cleanup
**File:** `src/packages/ui/components/panels/ComponentPaletteSearch.tsx`

**TODO:**
```typescript
useEffect(() => {
  return () => cleanup();
}, [cleanup]);
```

### 16. Fix ContextMenu Pointer-Events
**File:** `src/packages/canvas/components/ContextMenu.tsx`

**TODO:**
- Remove `pointerEvents: 'none'` on portal container
- Rely on overlay click handler and document-level click capture

### 17. Align ComponentGroupOverlay Z-Index
**File:** `src/packages/ui/components/canvas/ComponentGroupOverlay.tsx`

**TODO:**
```typescript
import { overlayZIndex } from "@/lib/design/design-system";
// Use overlayZIndex.group instead of hard-coded z-[50]
```

### 18. Improve AlignmentGuides Label Clarity
**File:** `src/packages/ui/components/canvas/AlignmentGuides.tsx`

**TODO:**
```typescript
// Render label based on guide.type and componentIds.length
const label = guide.type === 'vertical'
  ? `V-Aligned (${guide.componentIds.length})`
  : `H-Aligned (${guide.componentIds.length})`;
```

### 19. Update Documentation Status
**File:** `CANVAS_USABILITY_IMPROVEMENTS.md`

**TODO:**
- Move "Context menu implementation" to Completed
- Add TODOs for focus trap and select-all action verification
- Note "Zoom to selection" remains in-progress

### 20. Harden useFilteredComponents Type Safety
**File:** `src/stores/canvasStore.ts`

**TODO:**
```typescript
const resolvedCategory = (component.category || '').toLowerCase();
const descriptionMatch = (component.description || '').toLowerCase().includes(query);
```

### 21. Add E2E Tests
**Files:** `e2e/` directory

**TODO:**
- Create `multi-select.spec.ts` for drag selection and SelectionBox
- Create `alignment-toolbar.spec.ts` for align/distribute operations
- Create `grouping-locking.spec.ts` for group/ungroup and lock flows
- Create `context-menu.spec.ts` for keyboard navigation
- Create `keyboard-shortcuts.spec.ts` for shortcut verification

## Implementation Priority

**High Priority (Critical for UX):**
1. ✅ ContextMenu focus trapping and ARIA
2. ✅ ContextMenu Select All fix
3. 🔄 SelectionBox viewport transformation
4. 🔄 Filter locked components from selection
5. 🔄 ReactFlow locked component filtering
6. ✅ Review screen canvas positioning and minimap integration

**Medium Priority (Performance & Accessibility):**
6. Optimize alignment guide detection
7. Enhance AlignmentToolbar accessibility
8. Improve rate limiter feedback
9. Create scoped event bus
10. Implement zoom-to-selection

**Low Priority (Polish & Testing):**
11. Refactor SelectionBox style
12. Fix debounce cleanup
13. Fix ContextMenu pointer-events
14. Align ComponentGroupOverlay z-index
15. Improve AlignmentGuides labels
16. Update documentation
17. Harden type safety
18. Add E2E tests

## Testing Checklist

- [ ] Context menu keyboard navigation (Tab, Shift+Tab, Arrow keys, Escape)
- [ ] Context menu focus restoration after close
- [ ] Select All from canvas context menu
- [ ] SelectionBox rendering at different zoom levels
- [ ] Locked components excluded from bulk operations
- [ ] Alignment guide performance with 100+ components
- [ ] Rate limiter diagnostics visibility
- [ ] Zoom-to-selection functionality
- [ ] E2E test coverage for multi-select workflows

## Notes

- All changes follow the CLAUDE.md guidelines for simplicity and modularity
- Files kept under 300 LOC where possible
- Clear header comments maintained
- No database changes required
- All changes are backward compatible
