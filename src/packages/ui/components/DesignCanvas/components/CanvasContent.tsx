import React, { useCallback, useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Viewport } from "@xyflow/react";

import {
  ReactFlowCanvas,
  type ReactFlowCanvasWrapperProps,
} from "@canvas/components/ReactFlowCanvas";
import QuickAddOverlayBase from "../../canvas/QuickAddOverlay";
import { EmptyCanvasState } from "@/lib/animations/canvas-empty-states";
import { overlayZIndex } from "@/lib/design/design-system";
import { useCanvasStore, useCanvasMode, useCanvasAnnotations, useCanvasActions } from "@/stores/canvasStore";
import { CanvasAnnotationOverlay } from "@ui/components/overlays/CanvasAnnotationOverlay";
import { AnnotationToolbar, type AnnotationTool } from "@ui/components/canvas/AnnotationToolbar";
import { AnnotationSidebar } from "@ui/components/canvas/AnnotationSidebar";
import { AnnotationEditDialog } from "@ui/components/modals/AnnotationEditDialog";
import { AlignmentToolbar } from "@ui/components/canvas/AlignmentToolbar";
import { SelectionBox } from "@ui/components/canvas/SelectionBox";
import { AlignmentGuides } from "@ui/components/canvas/AlignmentGuides";
import { ComponentGroupOverlay } from "@ui/components/canvas/ComponentGroupOverlay";
import type { Annotation } from "@shared/contracts";

interface CanvasContentProps {
  canvasProps: ReactFlowCanvasWrapperProps;
}

interface QuickAddShortcutDetail {
  query?: string;
  position?: { x: number; y: number };
  forceOpen?: boolean;
  forceClose?: boolean;
}

interface QuickAddOverlayAddOptions {
  position?: { x: number; y: number };
  keepOpen?: boolean;
}

interface QuickAddOverlayProps {
  active: boolean;
  initialQuery?: string;
  anchorPosition?: { x: number; y: number };
  onAddComponent: (
    componentType: string,
    options?: QuickAddOverlayAddOptions,
  ) => void;
  onRequestClose: () => void;
}

interface CanvasAddComponentDetail {
  componentType: string;
  position?: { x: number; y: number };
  source?: string;
}

const QuickAddOverlay =
  QuickAddOverlayBase as unknown as React.ComponentType<QuickAddOverlayProps>;

export const CanvasContent = React.memo(
  ({ canvasProps }: CanvasContentProps) => {
    const [quickAddActive, setQuickAddActive] = useState(false);
    const [quickAddContext, setQuickAddContext] =
      useState<QuickAddShortcutDetail | null>(null);

    // Get components from canvas store to check if canvas is empty
    const components = useCanvasStore((state) => state.components);
    const tourCompleted = useCanvasStore((state) => state.tourCompleted);
    const isCanvasEmpty = components.length === 0;
    const showEmptyState = isCanvasEmpty && tourCompleted; // Don't show during onboarding

    // Viewport tracking for overlays
    const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
    const handleViewportChange = useCallback((v: Viewport) => {
      setViewport(v);
    }, []);

    // Annotation state
    const canvasMode = useCanvasMode();
    const annotations = useCanvasAnnotations();
    const canvasActions = useCanvasActions();
    const [selectedAnnotationTool, setSelectedAnnotationTool] = useState<AnnotationTool>(null);
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
    const [annotationToEdit, setAnnotationToEdit] = useState<Annotation | null>(null);
    const [showAnnotationSidebar, setShowAnnotationSidebar] = useState(false);
    const annotationOverlayRef = useRef<any>(null);

    // Annotation mode is active when canvas mode is 'annotation'
    const isAnnotationMode = canvasMode === "annotation";

    const handleCloseQuickAdd = useCallback(() => {
      setQuickAddActive(false);
      setQuickAddContext(null);
    }, []);

    const handleAddComponent = useCallback(
      (componentType: string, options?: QuickAddOverlayAddOptions) => {
        if (typeof window !== "undefined") {
          const eventDetail: CanvasAddComponentDetail = {
            componentType,
            position: options?.position,
            source: "quick-add-overlay",
          };
          window.dispatchEvent(
            new CustomEvent<CanvasAddComponentDetail>("canvas:add-component", {
              detail: eventDetail,
            }),
          );
        }

        if (!options?.keepOpen) {
          handleCloseQuickAdd();
        }
      },
      [handleCloseQuickAdd],
    );

    useEffect(() => {
      if (typeof window === "undefined") {
        return undefined;
      }

      const handleShortcut: EventListener = (event) => {
        const detail = (
          event as CustomEvent<QuickAddShortcutDetail | undefined>
        ).detail;

        setQuickAddActive((prev) => {
          let next: boolean;

          if (detail?.forceOpen) {
            next = true;
          } else if (detail?.forceClose) {
            next = false;
          } else {
            next = !prev;
          }

          setQuickAddContext(next ? (detail ?? null) : null);

          return next;
        });
      };

      window.addEventListener("shortcut:quick-add-component", handleShortcut);
      return () => {
        window.removeEventListener(
          "shortcut:quick-add-component",
          handleShortcut,
        );
      };
    }, []);

    useEffect(() => {
      if (typeof window === "undefined") {
        return undefined;
      }

      const handleOverlayClose: EventListener = () => {
        handleCloseQuickAdd();
      };

      window.addEventListener("quick-add-overlay:close", handleOverlayClose);
      return () => {
        window.removeEventListener(
          "quick-add-overlay:close",
          handleOverlayClose,
        );
      };
    }, [handleCloseQuickAdd]);

    useEffect(() => {
      if (typeof window === "undefined") {
        return undefined;
      }

      const handleCanvasAddComponent: EventListener = (event) => {
        const detail = (
          event as CustomEvent<CanvasAddComponentDetail | undefined>
        ).detail;
        if (detail?.source === "quick-add-overlay") {
          handleCloseQuickAdd();
        }
      };

      window.addEventListener("canvas:add-component", handleCanvasAddComponent);
      return () => {
        window.removeEventListener(
          "canvas:add-component",
          handleCanvasAddComponent,
        );
      };
    }, [handleCloseQuickAdd]);

    const handleBrowseTemplates = useCallback(() => {
      // Open pattern library modal
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("show-pattern-library"));
      }
    }, []);

    const handleQuickAddFromEmpty = useCallback(() => {
      setQuickAddActive(true);
      setQuickAddContext({ forceOpen: true });
    }, []);

    // Annotation handlers
    const handleAnnotationCreate = useCallback((annotation: Annotation) => {
      canvasActions.addAnnotation(annotation);
    }, [canvasActions]);

    const handleAnnotationUpdate = useCallback((annotation: Annotation) => {
      canvasActions.updateAnnotation(annotation);
    }, [canvasActions]);

    const handleAnnotationDelete = useCallback((annotationId: string) => {
      canvasActions.deleteAnnotation(annotationId);
      if (selectedAnnotationId === annotationId) {
        setSelectedAnnotationId(null);
        setAnnotationToEdit(null);
      }
    }, [canvasActions, selectedAnnotationId]);

    const handleAnnotationSelect = useCallback((annotationId: string) => {
      setSelectedAnnotationId(annotationId);
      const annotation = annotations.find(a => a.id === annotationId);
      if (annotation) {
        setAnnotationToEdit(annotation);
      }
    }, [annotations]);

    const handleAnnotationFocus = useCallback((annotationId: string) => {
      // Focus on the annotation (e.g., pan the canvas to center it)
      // This would require canvas pan/zoom controls
      setSelectedAnnotationId(annotationId);
    }, []);

    const handleAnnotationEditClose = useCallback(() => {
      setAnnotationToEdit(null);
    }, []);

    const handleAnnotationEditSave = useCallback((annotation: Annotation) => {
      canvasActions.updateAnnotation(annotation);
      setAnnotationToEdit(null);
    }, [canvasActions]);

    // Toggle annotation sidebar when annotation mode is active
    useEffect(() => {
      if (isAnnotationMode && annotations.length > 0) {
        setShowAnnotationSidebar(true);
      } else if (!isAnnotationMode) {
        setShowAnnotationSidebar(false);
      }
    }, [isAnnotationMode, annotations.length]);

    // Event-to-store bridge for selection drag
    useEffect(() => {
      if (typeof window === "undefined") return;

      const handleSelectionStart = (e: Event) => {
        const detail = (e as CustomEvent<{x:number;y:number}>).detail;
        canvasActions.setSelectionBox({x:detail.x, y:detail.y, width:0, height:0});
      };

      const handleSelectionMove = (e: Event) => {
        const detail = (e as CustomEvent<{x:number;y:number;width:number;height:number}>).detail;
        canvasActions.setSelectionBox(detail);
      };

      const handleSelectionEnd = () => {
        const box = useCanvasStore.getState().selectionBox;
        if (box) {
          // Compute selected IDs by intersecting box with components
          const comps = useCanvasStore.getState().components;
          const selectedIds = comps
            .filter(c => {
              // Skip locked components in drag selection
              if (c.locked) return false;

              const cRight = c.x + (c.width || 220);
              const cBottom = c.y + (c.height || 140);
              const boxRight = box.x + box.width;
              const boxBottom = box.y + box.height;
              return !(c.x > boxRight || cRight < box.x || c.y > boxBottom || cBottom < box.y);
            })
            .map(c => c.id);
          canvasActions.setSelectedComponents(selectedIds);
        }
        canvasActions.setSelectionBox(null);
      };

      const handleToggle = (e: Event) => {
        const detail = (e as CustomEvent<{componentId:string}>).detail;
        canvasActions.toggleComponentSelection(detail.componentId);
      };

      window.addEventListener('canvas:selection-drag-start', handleSelectionStart);
      window.addEventListener('canvas:selection-drag-move', handleSelectionMove);
      window.addEventListener('canvas:selection-drag-end', handleSelectionEnd);
      window.addEventListener('canvas:toggle-component-selection', handleToggle);

      return () => {
        window.removeEventListener('canvas:selection-drag-start', handleSelectionStart);
        window.removeEventListener('canvas:selection-drag-move', handleSelectionMove);
        window.removeEventListener('canvas:selection-drag-end', handleSelectionEnd);
        window.removeEventListener('canvas:toggle-component-selection', handleToggle);
      };
    }, [canvasActions]);

    // Event-to-store bridge for keyboard shortcuts
    useEffect(() => {
      if (typeof window === "undefined") return;

      const handleDuplicate = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        if (selectedIds.length > 0) {
          canvasActions.duplicateComponents(selectedIds);
        }
      };

      const handleGroup = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        if (selectedIds.length >= 2) {
          canvasActions.groupComponents(selectedIds);
        }
      };

      const handleUngroup = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        const state = useCanvasStore.getState();

        // Find groups that contain selected components
        const groupsToUngroup = new Set<string>();
        selectedIds.forEach(id => {
          const component = state.components.find(c => c.id === id);
          if (component?.groupId) {
            groupsToUngroup.add(component.groupId);
          }
        });

        if (groupsToUngroup.size === 0) return;

        // If multiple groups, show confirmation or ungroup only the last selected component's group
        if (groupsToUngroup.size > 1) {
          // Get the last selected component's group
          const lastSelected = state.selectedComponentIds[state.selectedComponentIds.length - 1];
          const lastComponent = state.components.find(c => c.id === lastSelected);

          if (lastComponent?.groupId) {
            // Ungroup only the last selected component's group
            canvasActions.ungroupComponents(lastComponent.groupId);
          }
        } else {
          // Single group - ungroup it
          const groupId = Array.from(groupsToUngroup)[0];
          canvasActions.ungroupComponents(groupId);
        }
      };

      const handleLock = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        if (selectedIds.length > 0) {
          canvasActions.lockComponents(selectedIds);
        }
      };

      const handleUnlock = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        if (selectedIds.length > 0) {
          canvasActions.unlockComponents(selectedIds);
        }
      };

      const handleAlignLeft = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        if (selectedIds.length >= 2) {
          canvasActions.alignComponents(selectedIds, "left");
        }
      };

      const handleAlignRight = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        if (selectedIds.length >= 2) {
          canvasActions.alignComponents(selectedIds, "right");
        }
      };

      const handleAlignTop = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        if (selectedIds.length >= 2) {
          canvasActions.alignComponents(selectedIds, "top");
        }
      };

      const handleAlignBottom = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        if (selectedIds.length >= 2) {
          canvasActions.alignComponents(selectedIds, "bottom");
        }
      };

      const handleSelectAll = () => {
        const state = useCanvasStore.getState();
        if (!state.components.length) {
          return;
        }

        // Filter out locked components for consistency with drag-select behavior
        const componentIds = state.components
          .filter(component => !component.locked)
          .map(component => component.id);
        canvasActions.setSelectedComponents(componentIds);
      };

      const handleSelectLocked = () => {
        const state = useCanvasStore.getState();
        const lockedComponentIds = state.components
          .filter(component => component.locked)
          .map(component => component.id);

        if (!lockedComponentIds.length) {
          return;
        }

        canvasActions.setSelectedComponents(lockedComponentIds);
        canvasActions.setSelectionBox(null);
      };

      const handleClearSelection = () => {
        const state = useCanvasStore.getState();

        if (state.selectedComponentIds.length > 0 || state.selectionBox) {
          canvasActions.clearSelection();
          canvasActions.setSelectionBox(null);
        }
      };

      const handleExitDrawMode = () => {
        const state = useCanvasStore.getState();

        if (state.canvasMode === "draw") {
          canvasActions.setDrawingTool(null);
          canvasActions.setCanvasMode("select");
        }
      };

      const handleZoomToSelection = () => {
        const selectedIds = useCanvasStore.getState().selectedComponentIds;
        if (selectedIds.length === 0) return;

        const state = useCanvasStore.getState();
        const selectedComponents = state.components.filter(c => selectedIds.includes(c.id));

        if (selectedComponents.length === 0) return;

        // Calculate bounding box of selected components
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        selectedComponents.forEach(comp => {
          const width = comp.width || 220;
          const height = comp.height || 140;
          minX = Math.min(minX, comp.x);
          minY = Math.min(minY, comp.y);
          maxX = Math.max(maxX, comp.x + width);
          maxY = Math.max(maxY, comp.y + height);
        });

        // Dispatch event with bounding box for ReactFlow to handle
        window.dispatchEvent(new CustomEvent('canvas:fit-bounds', {
          detail: { x: minX, y: minY, width: maxX - minX, height: maxY - minY, padding: 0.2 }
        }));
      };

      window.addEventListener('shortcut:duplicate', handleDuplicate);
      window.addEventListener('shortcut:group', handleGroup);
      window.addEventListener('shortcut:ungroup', handleUngroup);
      window.addEventListener('shortcut:lock-components', handleLock);
      window.addEventListener('shortcut:unlock-components', handleUnlock);
      window.addEventListener('shortcut:align-left', handleAlignLeft);
      window.addEventListener('shortcut:align-right', handleAlignRight);
      window.addEventListener('shortcut:align-top', handleAlignTop);
      window.addEventListener('shortcut:align-bottom', handleAlignBottom);
      window.addEventListener('shortcut:select-all', handleSelectAll);
      window.addEventListener('canvas:select-all', handleSelectAll);
      window.addEventListener('canvas:select-locked', handleSelectLocked);
      window.addEventListener('shortcut:clear-selection', handleClearSelection);
      window.addEventListener('canvas:clear-selection', handleClearSelection);
      window.addEventListener('shortcut:exit-draw-mode', handleExitDrawMode);
      window.addEventListener('canvas:exit-drawing-mode', handleExitDrawMode);
      window.addEventListener('shortcut:zoom-to-selection', handleZoomToSelection);

      return () => {
        window.removeEventListener('shortcut:duplicate', handleDuplicate);
        window.removeEventListener('shortcut:group', handleGroup);
        window.removeEventListener('shortcut:ungroup', handleUngroup);
        window.removeEventListener('shortcut:lock-components', handleLock);
        window.removeEventListener('shortcut:unlock-components', handleUnlock);
        window.removeEventListener('shortcut:align-left', handleAlignLeft);
        window.removeEventListener('shortcut:align-right', handleAlignRight);
        window.removeEventListener('shortcut:align-top', handleAlignTop);
        window.removeEventListener('shortcut:align-bottom', handleAlignBottom);
        window.removeEventListener('shortcut:select-all', handleSelectAll);
        window.removeEventListener('canvas:select-all', handleSelectAll);
        window.removeEventListener('canvas:select-locked', handleSelectLocked);
        window.removeEventListener('shortcut:clear-selection', handleClearSelection);
        window.removeEventListener('canvas:clear-selection', handleClearSelection);
        window.removeEventListener('shortcut:exit-draw-mode', handleExitDrawMode);
        window.removeEventListener('canvas:exit-drawing-mode', handleExitDrawMode);
        window.removeEventListener('shortcut:zoom-to-selection', handleZoomToSelection);
      };
    }, [canvasActions]);

    return (
      <>
        <ReactFlowCanvas {...canvasProps} onViewportChange={handleViewportChange} />

        {/* Selection and alignment overlays */}
        <SelectionBox viewport={viewport} />
        <ComponentGroupOverlay viewport={viewport} />
        <AlignmentGuides viewport={viewport} />
        <AlignmentToolbar
          className="absolute top-20 left-1/2 -translate-x-1/2"
          style={{ zIndex: overlayZIndex.toolbar }}
        />

        {/* Annotation Overlay - renders on top of canvas */}
        {isAnnotationMode && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 15 }}>
            <CanvasAnnotationOverlay
              ref={annotationOverlayRef}
              width={canvasProps.width || 800}
              height={canvasProps.height || 600}
              selectedTool={selectedAnnotationTool || undefined}
              isActive={isAnnotationMode}
              onAnnotationCreate={handleAnnotationCreate}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationDelete={handleAnnotationDelete}
              onAnnotationSelect={(annotation) => {
                if (annotation) {
                  handleAnnotationSelect(annotation.id);
                }
              }}
            />
          </div>
        )}

        {/* Annotation Toolbar */}
        {isAnnotationMode && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2" style={{ zIndex: 20 }}>
            <AnnotationToolbar
              selectedTool={selectedAnnotationTool}
              onToolSelect={setSelectedAnnotationTool}
              annotationCount={annotations.length}
            />
          </div>
        )}

        {/* Annotation Sidebar */}
        {showAnnotationSidebar && (
          <div className="absolute top-0 right-0 h-full w-80" style={{ zIndex: 20 }}>
            <AnnotationSidebar
              annotations={annotations}
              selectedAnnotation={selectedAnnotationId}
              onAnnotationSelect={handleAnnotationSelect}
              onAnnotationDelete={handleAnnotationDelete}
              onAnnotationFocus={handleAnnotationFocus}
            />
          </div>
        )}

        {/* Annotation Edit Dialog */}
        <AnnotationEditDialog
          annotation={annotationToEdit}
          isOpen={!!annotationToEdit}
          onClose={handleAnnotationEditClose}
          onSave={handleAnnotationEditSave}
          onDelete={handleAnnotationDelete}
        />

        {/* Empty state overlay */}
        <AnimatePresence>
          {showEmptyState && !quickAddActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
            >
              <div className="pointer-events-auto">
                <EmptyCanvasState
                  onBrowseTemplates={handleBrowseTemplates}
                  onQuickAdd={handleQuickAddFromEmpty}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick add overlay */}
        {quickAddActive ? (
          <QuickAddOverlay
            active={quickAddActive}
            initialQuery={quickAddContext?.query}
            anchorPosition={quickAddContext?.position}
            onAddComponent={handleAddComponent}
            onRequestClose={handleCloseQuickAdd}
          />
        ) : null}
      </>
    );
  },
);

CanvasContent.displayName = "CanvasContent";
