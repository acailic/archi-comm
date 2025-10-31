# Canvas Happy Flow Assessment — 2025-02-14

## Purpose
Define the end-to-end “happy flow” for the ArchiComm canvas, map it to existing modules, and highlight the gaps that currently prevent the experience from working reliably. This assessment guides the implementation work needed before we touch code.

## Happy Flow Definition
1. Load a challenge and hydrate the canvas from persisted `DesignData`.
2. Drag components from the library onto the canvas, select, move, duplicate, lock, and group them.
3. Connect components via quick-connect or manual edge creation; edit or delete connections.
4. Enter annotation mode, place comments/notes/highlights/arrows, edit them, and keep them in sync with persistence/import/export.
5. Switch to drawing mode, sketch on top of the diagram, undo/clear as needed.
6. Save or export the design (JSON/PNG) and restore it later without losing annotations or drawings.

## Current Architecture Snapshot
- **State management** — `src/stores/canvasStore.ts` centralises components, connections, drawings, annotations, and related actions/selectors. Annotation CRUD and selectors already exist (`canvasStore.ts:727-780`, `canvasStore.ts:1986-1995`).
- **Canvas rendering** — Two parallel React Flow wrappers exist:
  - `ReactFlowCanvasWrapper` (`src/packages/canvas/components/ReactFlowCanvasWrapper.tsx`) powers the production canvas used by `DesignCanvasCore`.
  - `SimpleCanvas` (`src/packages/canvas/SimpleCanvas.tsx`) is a streamlined alternative with recent loop fixes (`SimpleCanvas.tsx:600-1040`) but is not wired into the main UI.
- **Design Canvas shell** — `DesignCanvasCore` orchestrates palette, panels, overlays, quick-connect, persistence, and includes local annotation state (`DesignCanvasCore.tsx:671-750`) instead of delegating to the store.
- **Annotation UI** — Toolbar, sidebar, and overlay components exist (`AnnotationToolbar.tsx`, `AnnotationSidebar.tsx`, `CanvasAnnotationOverlay.tsx`), but integration is incomplete:
  - `CanvasAnnotationOverlay` requires `annotations` and emits rich callbacks (`CanvasAnnotationOverlay.tsx:1-210`).
  - `CanvasOverlays` mounts the overlay without supplying required props and invents its own counters (`CanvasOverlays.tsx:60-68`).
  - No `AnnotationLayer` is rendered on top of React Flow to display placed annotations.
- **Persistence hooks** — Import/export logic propagates annotations/drawings through the store when `canvasActions.updateCanvasData` runs (`useDesignCanvasImportExport.ts:24-61`).

## Gaps Blocking the Happy Flow
1. **Duplicate annotation state**  
   `DesignCanvasCore` keeps annotations in component state (`DesignCanvasCore.tsx:678-719`), bypassing the store that persistence and selectors rely on. The toolbar/sidebar interact with this local state, so imported annotations or other consumers never see updates.

2. **Overlay integration mismatch**  
   `CanvasOverlays` passes props (`enableQuickConnect`, `onAnnotationCreate`) that `CanvasAnnotationOverlay` does not accept, while omitting required `annotations` and select/delete handlers (`CanvasOverlays.tsx:60-68` vs. `CanvasAnnotationOverlay.tsx:12-34`). It also manages its own `selectedTool` state instead of consuming the toolbar selection from `DesignCanvasCore`, so annotation mode never actually activates. TypeScript should flag this, indicating the overlay isn’t active today.

3. **No rendered annotation layer**  
   Neither `ReactFlowCanvasWrapper` nor `SimpleCanvas` render annotations back onto the canvas, so even if we created them they would be invisible. A dedicated `AnnotationLayer` (planned in `ANNOTATION_FEATURE_IMPLEMENTATION_STATUS.md`) is still missing.

4. **SimpleCanvas not adopted**  
   `SimpleCanvas` encapsulates the simplified canvas experience but `DesignCanvasCore` still mounts `ReactFlowCanvasWrapper` (`DesignCanvasCore.tsx:938-963`). This leaves duplicate code paths and complicates further improvements.

5. **Testing coverage gaps**  
   Existing Playwright/Vitest suites focus on infinite-loop regressions and core drag/drop. There is no automated assertion that the annotation flow works, that drawings persist, or that import/export retains annotations.

## Bug Triage Summary
- **Annotation toolbar disconnected from overlay** — Selecting a tool in `AnnotationToolbar` updates `selectedAnnotationTool` in `DesignCanvasCore` but `CanvasAnnotationOverlay` never sees it because `CanvasOverlays` tracks its own tool state (`DesignCanvasCore.tsx:671-693`, `CanvasOverlays.tsx:41-68`).
- **Overlay callbacks dead-end** — `CanvasAnnotationOverlay` expects `onAnnotationCreate` to receive full annotation objects, yet `CanvasOverlays` increments a counter instead of delegating to store actions (`CanvasAnnotationOverlay.tsx:118-189`, `CanvasOverlays.tsx:49-55`).
- **Annotation focus highlights do nothing** — `highlightedAnnotation` is computed (`DesignCanvasCore.tsx:329-334`) but no visual layer consumes it, leaving focus pings invisible.
- **Toolbar badge never updates** — The badge in `AnnotationToolbar` relies on `annotationCount` propagated from `DesignCanvasCore`, but the component always receives `annotationCount=0` (`AnnotationToolbar.tsx:84-104`) because counts live in disconnected local states.
- **Quick-connect preview duplication** — Both `SimpleCanvas` and `ReactFlowCanvasWrapper` implement quick-connect preview logic, yet only the wrapper is active, leading to dead code paths and inconsistent behavior (`SimpleCanvas.tsx:664-711` vs. `ReactFlowCanvasWrapper.tsx:250-340`).

## Recommended Implementation Plan
1. **Consolidate annotation state in the store**
   - Replace `useState` annotations in `DesignCanvasCore` with `useCanvasAnnotations` and store actions.
   - Ensure toolbar/sidebar use selectors and actions, enabling persistence, undo, and external access.

2. **Fix overlay contract**
   - Update `CanvasAnnotationOverlay` to receive/store-managed annotations and emit domain-level events (create/select/update/delete).
   - Adjust `CanvasOverlays` (or move overlay mounting closer to the canvas component) so props align with the overlay contract.

3. **Render annotations**
   - Implement `AnnotationLayer` under `src/packages/canvas/components/` to draw comment/note/highlight/arrow entities atop React Flow nodes, respecting zoom and hit-testing.
   - Mount `AnnotationLayer` inside whichever canvas implementation we retain (`ReactFlowCanvasWrapper` or `SimpleCanvas`).

4. **Choose a single canvas implementation**
   - Either finish the migration to `SimpleCanvas` (preferred for ruthless simplicity) or fold its improvements back into `ReactFlowCanvasWrapper`. Document the decision in `ai_working/decisions/` if it changes direction.

5. **Happy-flow regression tests**
   - Add targeted unit/integration tests: placing annotations, toggling toolbar, export/import round-trip.
   - Extend Playwright smoke tests to click through the toolbar, place an annotation, and verify its presence.

6. **Telemetry & persistence verification**
   - Confirm `useDesignCanvasImportExport` still hydrates annotations after state consolidation and update the toast copy to surface annotation counts.

## Test Strategy
- **Unit**: store actions (annotation CRUD), annotation layer geometry helpers.
- **Integration**: React component tests covering toolbar → overlay → store interactions.
- **E2E**: Playwright flow that creates component, connects, adds annotation, draws stroke, exports/imports.

## Risks & Mitigations
- **TypeScript drift**: After wiring overlay/annotations through the store, re-run `npm run lint` and `npm run typecheck` to catch signature mismatches early.
- **Performance**: Annotation rendering must memoise to avoid reintroducing infinite render loops; reuse patterns from `SimpleCanvas`.
- **UX consistency**: Keep keyboard shortcuts and status messaging aligned with documentation (`CANVAS_USABILITY_IMPROVEMENTS.md`).

---
Prepared for the modular-builder implementation pass. This document should be updated once the gaps are addressed.
