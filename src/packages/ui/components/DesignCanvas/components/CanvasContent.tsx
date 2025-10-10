import React, { useCallback, useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Viewport, ReactFlowInstance } from "@xyflow/react";

import {
  ReactFlowCanvas,
  type ReactFlowCanvasWrapperProps,
} from "@canvas/components/ReactFlowCanvas";
import QuickAddOverlayBase from "../../canvas/QuickAddOverlay";
import { EmptyCanvasState } from "@/lib/animations/canvas-empty-states";
import { overlayZIndex } from "@/lib/design/design-system";
import {
  useCanvasStore,
  useCanvasMode,
  useCanvasAnnotations,
  useCanvasActions,
  useCanvasDrawings,
  useDrawingTool,
  useDrawingColor,
  useDrawingSize,
  useDrawingSettings,
  useLayerVisibility,
  useLayerOpacity,
} from "@/stores/canvasStore";
import { CanvasAnnotationOverlay } from "@ui/components/overlays/CanvasAnnotationOverlay";
import { UnifiedToolbar, type AnnotationTool } from "@ui/components/canvas/UnifiedToolbar";
import { AnnotationSidebar } from "@ui/components/canvas/AnnotationSidebar";
import { AnnotationEditDialog } from "@ui/components/modals/AnnotationEditDialog";
import { AlignmentToolbar } from "@ui/components/canvas/AlignmentToolbar";
import { SelectionBox } from "@ui/components/canvas/SelectionBox";
import { AlignmentGuides } from "@ui/components/canvas/AlignmentGuides";
import { ComponentGroupOverlay } from "@ui/components/canvas/ComponentGroupOverlay";
import { LayerPanel } from "@ui/components/canvas/LayerPanel";
import { DrawingOverlay } from "@ui/components/canvas/DrawingOverlay";
import { DrawingToolbar } from "@ui/components/canvas/DrawingToolbar";
import { ModeIndicator } from "@ui/components/canvas/ModeIndicator";
import { AnnotationLayer } from "@canvas/components/AnnotationLayer";
import {
  canvasAnnotationToContract,
  AnnotationWithReplies,
} from "@/lib/canvas/annotation-utils";
import type { CanvasAnnotation } from "@/lib/canvas/CanvasAnnotations";
import type {
  Annotation,
  DrawingSettings,
  DrawingStroke,
  DesignComponent,
} from "@shared/contracts";
import { shortcutBus } from "@/lib/events/shortcutBus";
import { newAnnotationId } from "@/lib/utils/id";
import {
  APP_EVENT,
  type CanvasAddComponentDetail,
  type QuickAddShortcutDetail,
  dispatchAppEvent,
} from "@/lib/events/appEvents";

const showCanvasToast = (type: "info" | "success", message: string) => {
  if (typeof window === "undefined") {
    return;
  }

  const anyWindow = window as any;

  try {
    if (typeof anyWindow.__ARCHICOMM_TOAST === "function") {
      anyWindow.__ARCHICOMM_TOAST(type, message);
      return;
    }
    if (anyWindow.toast && typeof anyWindow.toast[type] === "function") {
      anyWindow.toast[type](message);
      return;
    }
    if (typeof anyWindow.showToast === "function") {
      anyWindow.showToast({ type, message });
      return;
    }
  } catch (_error) {
    // Fall back to console logging
  }

  if (type === "success") {
    console.log(message);
  } else {
    console.info(message);
  }
};

interface CanvasContentProps {
  canvasProps: ReactFlowCanvasWrapperProps;
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
    const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
    const previousComponentCountRef = useRef<number>(components.length);

    // Viewport tracking for overlays
    const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
    const handleViewportChange = useCallback((v: Viewport) => {
      setViewport(v);
    }, []);

    useEffect(() => {
      if (
        previousComponentCountRef.current === 0 &&
        components.length === 1
      ) {
        showCanvasToast("success", "Great start! 🎉");

        if (typeof window !== "undefined") {
          dispatchAppEvent(APP_EVENT.CANVAS_FIRST_COMPONENT_ADDED, {
            componentId: components[0]?.id ?? null,
          });

          const confetti = (window as any).__ARCHICOMM_CONFETTI;
          if (typeof confetti === "function") {
            confetti();
          }
        }
      }

      previousComponentCountRef.current = components.length;
    }, [components]);

    // Annotation state
    const canvasMode = useCanvasMode();
    const annotations = useCanvasAnnotations();
    const drawings = useCanvasDrawings();
    const drawingTool = useDrawingTool();
    const drawingColor = useDrawingColor();
    const drawingSize = useDrawingSize();
    const drawingSettings = useDrawingSettings();
    const drawingsVisible = useLayerVisibility("drawings");
    const annotationsVisible = useLayerVisibility("annotations");
    const componentsVisible = useLayerVisibility("components");
    const connectionsVisible = useLayerVisibility("connections");
    const infoCardsVisible = useLayerVisibility("infoCards");
    const drawingsOpacity = useLayerOpacity("drawings");
    const annotationsOpacity = useLayerOpacity("annotations");
    const componentsOpacity = useLayerOpacity("components");
    const connectionsOpacity = useLayerOpacity("connections");
    const infoCardsOpacity = useLayerOpacity("infoCards");
    const canvasActions = useCanvasActions();
    const [selectedAnnotationTool, setSelectedAnnotationTool] = useState<AnnotationTool>(null);
    const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
    const [annotationToEdit, setAnnotationToEdit] =
      useState<AnnotationWithReplies | null>(null);
    const [showAnnotationSidebar, setShowAnnotationSidebar] = useState(false);
    const [showLayerPanel, setShowLayerPanel] = useState(false);
    const annotationOverlayContainerRef = useRef<HTMLDivElement | null>(null);
    const fallbackCanvasWidth = (canvasProps as { width?: number }).width;
    const fallbackCanvasHeight = (canvasProps as { height?: number }).height;
    const [annotationOverlaySize, setAnnotationOverlaySize] = useState(() => ({
      width: typeof fallbackCanvasWidth === "number" ? fallbackCanvasWidth : 0,
      height: typeof fallbackCanvasHeight === "number" ? fallbackCanvasHeight : 0,
    }));

    // Annotation mode is active when canvas mode is 'annotation'
    const isAnnotationMode = canvasMode === "annotation";

    useEffect(() => {
      if (typeof window === "undefined") {
        return;
      }

      const container = annotationOverlayContainerRef.current;
      if (!container) {
        return;
      }

      const updateSize = () => {
        const rect = container.getBoundingClientRect();
        const nextWidth = Math.round(rect.width);
        const nextHeight = Math.round(rect.height);

        setAnnotationOverlaySize((prev) =>
          prev.width === nextWidth && prev.height === nextHeight
            ? prev
            : { width: nextWidth, height: nextHeight }
        );
      };

      updateSize();

      if (typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", updateSize);
        return () => {
          window.removeEventListener("resize", updateSize);
        };
      }

      const observer = new ResizeObserver((entries) => {
        const entry = entries.find((item) => item.target === container);
        if (!entry) {
          return;
        }

        const { width: entryWidth, height: entryHeight } = entry.contentRect;
        const nextWidth = Math.round(entryWidth);
        const nextHeight = Math.round(entryHeight);

        setAnnotationOverlaySize((prev) =>
          prev.width === nextWidth && prev.height === nextHeight
            ? prev
            : { width: nextWidth, height: nextHeight }
        );
      });

      observer.observe(container);

      return () => {
        observer.disconnect();
      };
    }, []);

    const resolvedAnnotationOverlayWidth = Math.max(
      1,
      annotationOverlaySize.width ||
        (typeof fallbackCanvasWidth === "number" ? fallbackCanvasWidth : 800),
    );
    const resolvedAnnotationOverlayHeight = Math.max(
      1,
      annotationOverlaySize.height ||
        (typeof fallbackCanvasHeight === "number" ? fallbackCanvasHeight : 600),
    );

    useEffect(() => {
      if (!isAnnotationMode && selectedAnnotationTool !== null) {
        setSelectedAnnotationTool(null);
      }
    }, [isAnnotationMode, selectedAnnotationTool]);

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
          dispatchAppEvent(APP_EVENT.CANVAS_ADD_COMPONENT, eventDetail);
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

      window.addEventListener(APP_EVENT.SHORTCUT_QUICK_ADD, handleShortcut);
      return () => {
        window.removeEventListener(APP_EVENT.SHORTCUT_QUICK_ADD, handleShortcut);
      };
    }, []);

    useEffect(() => {
      if (typeof window === "undefined") {
        return undefined;
      }

      const handleOverlayClose: EventListener = () => {
        handleCloseQuickAdd();
      };

      window.addEventListener(
        APP_EVENT.QUICK_ADD_OVERLAY_CLOSE,
        handleOverlayClose,
      );
      return () => {
        window.removeEventListener(
          APP_EVENT.QUICK_ADD_OVERLAY_CLOSE,
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

      window.addEventListener(
        APP_EVENT.CANVAS_ADD_COMPONENT,
        handleCanvasAddComponent as EventListener,
      );
      return () => {
        window.removeEventListener(
          APP_EVENT.CANVAS_ADD_COMPONENT,
          handleCanvasAddComponent as EventListener,
        );
      };
    }, [handleCloseQuickAdd]);

    const handleBrowseTemplates = useCallback(() => {
      // Open pattern library modal
      if (typeof window !== "undefined") {
        dispatchAppEvent(APP_EVENT.SHOW_PATTERN_LIBRARY, undefined);
      }
    }, []);

    const handleQuickAddFromEmpty = useCallback(() => {
      setQuickAddActive(true);
      setQuickAddContext({ forceOpen: true });
    }, []);

    // Annotation handlers
    const handleAnnotationCreate = useCallback((annotation: CanvasAnnotation | Partial<Annotation>) => {
      // Handle both CanvasAnnotation and Partial<Annotation> types
      const normalized = 'type' in annotation && annotation.type
        ? (annotation as Annotation)
        : canvasAnnotationToContract(annotation as CanvasAnnotation);

      if (import.meta.env.DEV) {
        console.log('[CanvasContent] Creating annotation:', {
          id: normalized.id,
          type: normalized.type,
          position: { x: normalized.x, y: normalized.y },
        });
      }

      canvasActions.addAnnotation(normalized);
    }, [canvasActions]);

    const handleAnnotationUpdate = useCallback((annotation: CanvasAnnotation) => {
      const normalized = canvasAnnotationToContract(annotation);
      canvasActions.updateAnnotation(normalized);
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
        setAnnotationToEdit({
          ...annotation,
          replies: annotation.replies ?? [],
        });
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

    const handleAnnotationMove = useCallback(
      (annotationId: string, position: { x: number; y: number }) => {
        const existing = annotations.find((item) => item.id === annotationId);
        if (!existing) return;
        canvasActions.updateAnnotation({
          ...existing,
          ...position,
        });
      },
      [annotations, canvasActions],
    );

    const handleAnnotationSidebarUpdate = useCallback(
      (annotation: Annotation) => {
        canvasActions.updateAnnotation(annotation);
      },
      [canvasActions],
    );

    const handleAnnotationDuplicate = useCallback(
      (annotation: Annotation) => {
        canvasActions.addAnnotation({
          ...annotation,
          id: newAnnotationId(),
          x: annotation.x + 32,
          y: annotation.y + 32,
          timestamp: Date.now(),
          resolved: false,
        });
      },
      [canvasActions],
    );

    const handleStrokeComplete = useCallback(
      (stroke: DrawingStroke) => {
        canvasActions.addDrawing(stroke);
      },
      [canvasActions],
    );

    const handleStrokeDelete = useCallback(
      (strokeId: string) => {
        canvasActions.deleteDrawing(strokeId);
      },
      [canvasActions],
    );

    // Additional drawing handlers for DrawingToolbar
    const handleDrawingToolSelect = useCallback((tool: any) => {
      canvasActions.setDrawingTool(tool);
    }, [canvasActions]);

    const handleDrawingColorChange = useCallback((color: string) => {
      canvasActions.setDrawingColor(color);
    }, [canvasActions]);

    const handleDrawingSizeChange = useCallback((size: number) => {
      canvasActions.setDrawingSize(size);
    }, [canvasActions]);

    const handleDrawingSettingsChange = useCallback(
      (settings: Partial<DrawingSettings>) => {
        canvasActions.updateDrawingSettings(settings);
      },
      [canvasActions],
    );

    const handleClearAllDrawings = useCallback(() => {
      canvasActions.clearDrawings();
    }, [canvasActions]);

    const handleExitMode = useCallback(() => {
      canvasActions.setCanvasMode("select");
      canvasActions.setDrawingTool(null);
      setSelectedAnnotationTool(null);
    }, [canvasActions, setSelectedAnnotationTool]);

    const runAutoLayout = useCallback(() => {
      const { components: currentComponents } = useCanvasStore.getState();
      if (currentComponents.length === 0) {
        return;
      }

      const movableComponents = currentComponents.filter(
        (component) => !component.locked,
      );

      if (movableComponents.length === 0) {
        showCanvasToast(
          "info",
          "Auto-layout skipped because all components are locked.",
        );
        return;
      }

      const categorize = (component: DesignComponent): string => {
        const normalizedType = String(component.type || "").toLowerCase();
        if (
          normalizedType.includes("ui") ||
          normalizedType.includes("frontend") ||
          normalizedType.includes("client")
        ) {
          return "ui";
        }
        if (
          normalizedType.includes("service") ||
          normalizedType.includes("api") ||
          normalizedType.includes("logic")
        ) {
          return "services";
        }
        if (
          normalizedType.includes("db") ||
          normalizedType.includes("data") ||
          normalizedType.includes("cache") ||
          normalizedType.includes("storage")
        ) {
          return "data";
        }
        return "others";
      };

      const layoutOrder: Array<"ui" | "services" | "data" | "others"> = [
        "ui",
        "services",
        "data",
        "others",
      ];

      const grouped = new Map<string, DesignComponent[]>();
      layoutOrder.forEach((category) => grouped.set(category, []));

      movableComponents.forEach((component) => {
        const category = categorize(component);
        if (!grouped.has(category)) {
          grouped.set(category, []);
        }
        grouped.get(category)!.push(component);
      });

      const updatedPositions = new Map<string, { x: number; y: number }>();
      let currentY = 0;
      const verticalSpacing = 260;
      const horizontalSpacing = 80;

      layoutOrder.forEach((category) => {
        const groupComponents = grouped.get(category);
        if (!groupComponents || groupComponents.length === 0) {
          return;
        }

        const sorted = [...groupComponents].sort((a, b) =>
          (a.label ?? a.id).localeCompare(b.label ?? b.id),
        );

        let currentX = 0;
        const rowHeight = Math.max(
          ...sorted.map((component) => component.height ?? 140),
        );

        sorted.forEach((component) => {
          const width = component.width ?? 220;
          updatedPositions.set(component.id, { x: currentX, y: currentY });
          currentX += width + horizontalSpacing;
        });

        currentY += rowHeight + verticalSpacing;
      });

      if (updatedPositions.size === 0) {
        return;
      }

      const nextComponents = currentComponents.map((component) => {
        const nextPosition = updatedPositions.get(component.id);
        return nextPosition ? { ...component, ...nextPosition } : component;
      });

      canvasActions.setComponents(nextComponents);

      requestAnimationFrame(() => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
      });
    }, [canvasActions]);

    // Toggle annotation sidebar when annotation mode is active
    useEffect(() => {
      if (isAnnotationMode && annotations.length > 0) {
        setShowAnnotationSidebar(true);
      } else if (!isAnnotationMode) {
        setShowAnnotationSidebar(false);
      }
    }, [isAnnotationMode, annotations.length]);

    useEffect(() => {
      if (typeof window === "undefined") return;

      const updateLayerElements = (
        selector: string,
        visible: boolean,
        opacityValue: number,
      ) => {
        const elements = document.querySelectorAll<HTMLElement>(selector);
        elements.forEach((element) => {
          element.style.opacity = visible ? opacityValue.toString() : "0";
          element.style.pointerEvents = visible ? "auto" : "none";
        });
      };

      updateLayerElements(
        ".react-flow__edges",
        connectionsVisible,
        connectionsOpacity,
      );
      updateLayerElements(
        ".react-flow__nodes",
        componentsVisible,
        componentsOpacity,
      );
      updateLayerElements(
        "[data-layer=info-card]",
        infoCardsVisible,
        infoCardsOpacity,
      );
    }, [
      componentsOpacity,
      componentsVisible,
      connectionsOpacity,
      connectionsVisible,
      infoCardsOpacity,
      infoCardsVisible,
    ]);

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
          let lockedExcluded = false;
          const selectedIds = comps
            .filter(c => {
              // Skip locked components in drag selection
              if (c.locked) {
                lockedExcluded = true;
                return false;
              }

              const cRight = c.x + (c.width || 220);
              const cBottom = c.y + (c.height || 140);
              const boxRight = box.x + box.width;
              const boxBottom = box.y + box.height;
              return !(c.x > boxRight || cRight < box.x || c.y > boxBottom || cBottom < box.y);
            })
            .map(c => c.id);
          canvasActions.setSelectedComponents(selectedIds);

          if (lockedExcluded) {
            showCanvasToast(
              "info",
              "Locked components were skipped. Unlock with Ctrl+Alt+Shift+L to include them.",
            );
          }
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

    // Event-to-store bridge for keyboard shortcuts (shortcutBus integration)
    useEffect(() => {
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
        dispatchAppEvent(APP_EVENT.CANVAS_FIT_BOUNDS, {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          padding: 0.2,
        });
      };

      // Subscribe to shortcutBus for all shortcut events
      const unsubDuplicate = shortcutBus.on('shortcut:duplicate', handleDuplicate);
      const unsubGroup = shortcutBus.on('shortcut:group', handleGroup);
      const unsubUngroup = shortcutBus.on('shortcut:ungroup', handleUngroup);
      const unsubLock = shortcutBus.on('shortcut:lock-components', handleLock);
      const unsubUnlock = shortcutBus.on('shortcut:unlock-components', handleUnlock);
      const unsubAlignLeft = shortcutBus.on('shortcut:align-left', handleAlignLeft);
      const unsubAlignRight = shortcutBus.on('shortcut:align-right', handleAlignRight);
      const unsubAlignTop = shortcutBus.on('shortcut:align-top', handleAlignTop);
      const unsubAlignBottom = shortcutBus.on('shortcut:align-bottom', handleAlignBottom);
      const unsubSelectAll = shortcutBus.on('shortcut:select-all', handleSelectAll);
      const unsubClearSelection = shortcutBus.on('shortcut:clear-selection', handleClearSelection);
      const unsubExitDrawMode = shortcutBus.on('shortcut:exit-draw-mode', handleExitDrawMode);
      const unsubZoomToSelection = shortcutBus.on('shortcut:zoom-to-selection', handleZoomToSelection);

      // Backwards compatibility: keep window event listeners for now
      if (typeof window !== "undefined") {
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
      }

      return () => {
        // Unsubscribe from shortcutBus
        unsubDuplicate();
        unsubGroup();
        unsubUngroup();
        unsubLock();
        unsubUnlock();
        unsubAlignLeft();
        unsubAlignRight();
        unsubAlignTop();
        unsubAlignBottom();
        unsubSelectAll();
        unsubClearSelection();
        unsubExitDrawMode();
        unsubZoomToSelection();

        // Clean up window event listeners
        if (typeof window !== "undefined") {
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
        }
      };
    }, [canvasActions]);

    useEffect(() => {
      if (typeof window === "undefined") {
        return;
      }

      const handleFitBounds = (
        event: Event,
      ): void => {
        const detail = (event as CustomEvent<{
          x: number;
          y: number;
          width: number;
          height: number;
          padding?: number;
        }>).detail;
        if (!detail || !reactFlowInstanceRef.current) {
          return;
        }
        reactFlowInstanceRef.current.fitBounds(
          {
            x: detail.x,
            y: detail.y,
            width: detail.width,
            height: detail.height,
          },
          {
            padding: detail.padding ?? 0.2,
            duration: 400,
          },
        );
      };

      const handleFitView = () => {
        reactFlowInstanceRef.current?.fitView({ padding: 0.2, duration: 400 });
      };

      const handleZoomIn = () => {
        reactFlowInstanceRef.current?.zoomIn({ duration: 200 });
      };

      const handleZoomOut = () => {
        reactFlowInstanceRef.current?.zoomOut({ duration: 200 });
      };

      const handleAutoLayoutEvent = () => {
        runAutoLayout();
      };

      window.addEventListener(
        APP_EVENT.CANVAS_FIT_BOUNDS,
        handleFitBounds as EventListener,
      );
      window.addEventListener("canvas:fit-view", handleFitView);
      window.addEventListener("canvas:zoom-in", handleZoomIn);
      window.addEventListener("canvas:zoom-out", handleZoomOut);
      window.addEventListener("canvas:auto-layout", handleAutoLayoutEvent);

      return () => {
        window.removeEventListener(
          APP_EVENT.CANVAS_FIT_BOUNDS,
          handleFitBounds as EventListener,
        );
        window.removeEventListener("canvas:fit-view", handleFitView);
        window.removeEventListener("canvas:zoom-in", handleZoomIn);
        window.removeEventListener("canvas:zoom-out", handleZoomOut);
        window.removeEventListener("canvas:auto-layout", handleAutoLayoutEvent);
      };
    }, [runAutoLayout]);

    return (
      <>
        <ReactFlowCanvas
          {...canvasProps}
          onViewportChange={handleViewportChange}
          onReactFlowInit={(instance) => {
            reactFlowInstanceRef.current = instance;
          }}
        />

        {/* Selection and alignment overlays */}
        <SelectionBox viewport={viewport} />
        <ComponentGroupOverlay viewport={viewport} />
        <AlignmentGuides viewport={viewport} />
        <AlignmentToolbar
          className="absolute top-20 left-1/2 -translate-x-1/2"
          style={{ zIndex: overlayZIndex.toolbar }}
        />

        {/* Annotation render layer */}
        <AnnotationLayer
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          viewport={viewport}
          visible={annotationsVisible}
          opacity={annotationsOpacity}
          className="absolute inset-0"
          data-testid="annotation-layer"
          onSelect={(annotation) => {
            setSelectedAnnotationId(annotation.id);
            setAnnotationToEdit({
              ...annotation,
              replies: annotation.replies ?? [],
            });
          }}
          onDoubleClick={(annotation) => {
            setAnnotationToEdit({
              ...annotation,
              replies: annotation.replies ?? [],
            });
          }}
          onMove={handleAnnotationMove}
          style={{
            zIndex: overlayZIndex.annotationLayer,
            pointerEvents: annotationsVisible ? "auto" : "none",
          }}
        />

        {/* Drawing overlay */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: overlayZIndex.drawingOverlay,
            opacity: drawingsOpacity,
            pointerEvents: canvasMode === "draw" ? "auto" : "none",
          }}
        >
          <DrawingOverlay
            strokes={drawings}
            currentTool={drawingTool}
            color={drawingColor}
            size={drawingSize}
            settings={drawingSettings}
            onStrokeComplete={handleStrokeComplete}
            onStrokeDelete={handleStrokeDelete}
            enabled={canvasMode === "draw"}
          />
        </div>

        {/* Annotation creation overlay */}
        <div
          ref={annotationOverlayContainerRef}
          data-testid="annotation-overlay-container"
          className="absolute inset-0"
          style={{
            zIndex: overlayZIndex.annotationOverlay,
            pointerEvents: isAnnotationMode ? "auto" : "none",
            opacity: annotationsOpacity,
            backgroundColor: isAnnotationMode
              ? "rgba(59, 130, 246, 0.08)"
              : "transparent",
            transition: "background-color 120ms ease",
          }}
        >
          <CanvasAnnotationOverlay
            width={resolvedAnnotationOverlayWidth}
            height={resolvedAnnotationOverlayHeight}
            selectedTool={selectedAnnotationTool || undefined}
            isActive={isAnnotationMode}
            viewportZoom={viewport.zoom}
            annotations={annotations}
            onAnnotationCreate={handleAnnotationCreate}
            onAnnotationUpdate={handleAnnotationUpdate}
            onAnnotationDelete={handleAnnotationDelete}
            onAnnotationSelect={(annotation) => {
              if (annotation) {
                setSelectedAnnotationId(annotation.id);
                setAnnotationToEdit({
                  ...annotation,
                  replies: annotation.replies ?? [],
                });
              } else {
                setSelectedAnnotationId(null);
                setAnnotationToEdit(null);
              }
            }}
          />
        </div>

        <div
          className="absolute top-4 left-1/2 w-full max-w-5xl -translate-x-1/2 px-4"
          style={{ zIndex: overlayZIndex.toolbar }}
        >
          <UnifiedToolbar
            annotationTool={selectedAnnotationTool}
            onAnnotationToolChange={(tool) => {
              if (tool) {
                setSelectedAnnotationTool(tool);
                canvasActions.setCanvasMode("annotation");
              } else {
                handleExitMode();
              }
            }}
            isLayerPanelOpen={showLayerPanel}
            onToggleLayerPanel={() => setShowLayerPanel((value) => !value)}
            annotationSidebarVisible={showAnnotationSidebar}
            onToggleAnnotationSidebar={() =>
              setShowAnnotationSidebar((value) => !value)
            }
          />
        </div>

        {canvasMode === "draw" && (
          <div
            className="pointer-events-auto absolute left-1/2 top-[96px] -translate-x-1/2"
            style={{ zIndex: overlayZIndex.toolbar }}
          >
            <DrawingToolbar
              selectedTool={drawingTool}
              onToolSelect={handleDrawingToolSelect}
              color={drawingColor}
              onColorChange={handleDrawingColorChange}
              size={drawingSize}
              onSizeChange={handleDrawingSizeChange}
              settings={drawingSettings}
              onSettingsChange={handleDrawingSettingsChange}
              strokeCount={drawings.length}
              onClearAll={handleClearAllDrawings}
            />
          </div>
        )}

        <ModeIndicator
          mode={canvasMode}
          onExit={handleExitMode}
          className="absolute top-4 right-4"
          style={{ zIndex: overlayZIndex.toolbar }}
        />

        {showLayerPanel && (
          <div
            className="absolute top-[120px] right-5"
            style={{ zIndex: overlayZIndex.toolbar }}
          >
            <LayerPanel />
          </div>
        )}

        {/* Annotation Sidebar */}
        {showAnnotationSidebar && (
          <div
            className="absolute top-0 right-0 h-full w-80"
            style={{ zIndex: overlayZIndex.toolbar }}
          >
            <AnnotationSidebar
              annotations={annotations}
              selectedAnnotation={selectedAnnotationId}
              onAnnotationSelect={handleAnnotationSelect}
              onAnnotationDelete={handleAnnotationDelete}
              onAnnotationFocus={handleAnnotationFocus}
              onAnnotationUpdate={handleAnnotationSidebarUpdate}
              onAnnotationDuplicate={handleAnnotationDuplicate}
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
