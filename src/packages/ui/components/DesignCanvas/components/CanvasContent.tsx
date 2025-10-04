import React, { useCallback, useEffect, useState, useRef } from "react";
import { shallow } from "zustand/shallow";
import { AnimatePresence, motion } from "framer-motion";

import {
  ReactFlowCanvas,
  type ReactFlowCanvasWrapperProps,
} from "@canvas/components/ReactFlowCanvas";
import QuickAddOverlayBase from "../../canvas/QuickAddOverlay";
import { EmptyCanvasState } from "@/lib/animations/canvas-empty-states";
import { useCanvasStore, useCanvasMode, useCanvasAnnotations, useCanvasActions } from "@/stores/canvasStore";
import { CanvasAnnotationOverlay } from "@ui/components/overlays/CanvasAnnotationOverlay";
import { AnnotationToolbar, type AnnotationTool } from "@ui/components/canvas/AnnotationToolbar";
import { AnnotationSidebar } from "@ui/components/canvas/AnnotationSidebar";
import { AnnotationEditDialog } from "@ui/components/modals/AnnotationEditDialog";
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

    return (
      <>
        <ReactFlowCanvas {...canvasProps} />

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
  (prev, next) => shallow(prev.canvasProps, next.canvasProps),
);

CanvasContent.displayName = "CanvasContent";
