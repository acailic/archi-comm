import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toPng } from "html-to-image";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { shallow } from "zustand/shallow";

import {
  ExtendedChallenge,
  challengeManager,
} from "../../../../lib/config/challenge-config";
import type {
  Challenge,
  Connection,
  DesignData,
} from "../../../../shared/contracts";
import { useOptimizedSelector } from "../../../../shared/hooks/useOptimizedSelector";
import {
  useCanvasDrawings,
  useCanvasStore,
  useDrawingColor,
  useDrawingSettings,
  useDrawingSize,
  useDrawingTool,
  useCanvasActions,
} from "../../../../stores/canvasStore";
import { useCanvasOrganizationStore } from "../../../../stores/canvasOrganizationStore";

import { AssignmentPanel } from "../AssignmentPanel";
import { StatusBar } from "../layout/StatusBar";
import { PropertiesPanel } from "../PropertiesPanel";

import { useInitialCanvasSync } from "../../../../shared/hooks/useInitialCanvasSync";
import { useCanvasKeyboardNavigation } from "./hooks/useCanvasKeyboardNavigation";
import { useDesignCanvasCallbacks } from "./hooks/useDesignCanvasCallbacks";
import { useDesignCanvasEffects } from "./hooks/useDesignCanvasEffects";
import { useDesignCanvasImportExport } from "./hooks/useDesignCanvasImportExport";
import { useDesignCanvasState } from "./hooks/useDesignCanvasState";
import { useStatusBarMetrics } from "./hooks/useStatusBarMetrics";

import type { Annotation } from "../../../../shared/contracts";
import type { SearchResult } from "../../../../shared/contracts";
import {
  addToRecentlyUsed,
  applyTemplate,
  getTemplatesForComponentPair,
  type ConnectionTemplate,
} from "../../../canvas/config/connection-templates";
import { useQuickConnect } from "../../../canvas/hooks/useQuickConnect";
import { SimpleCanvas } from "../../../canvas/SimpleCanvas";
import { AnnotationSidebar } from "../canvas/AnnotationSidebar";
import { AnnotationToolbar } from "../canvas/AnnotationToolbar";
import { CanvasContextualHelp } from "../canvas/CanvasContextualHelp";
import { CanvasOnboardingTour } from "../canvas/CanvasOnboardingTour";
import { CanvasSelfAssessment } from "../canvas/CanvasSelfAssessment";
import { CanvasToolbar } from "../canvas/CanvasToolbar";
import { ConnectionTemplatePanel } from "../canvas/ConnectionTemplatePanel";
import { KeyboardShortcutsReference } from "../canvas/KeyboardShortcutsReference";
import { QuickConnectOverlay } from "../canvas/QuickConnectOverlay";
import { QuickValidationPanel } from "../canvas/QuickValidationPanel";
import { CanvasSettingsPanel } from "../canvas/CanvasSettingsPanel";
import { TextToDiagramModal } from "../modals/TextToDiagramModal";
import { AIAssistantPanel } from "../canvas/AIAssistantPanel";
import { PerformanceIndicator } from "../canvas/PerformanceIndicator";
import { FrameOverlay } from "../canvas/FrameOverlay";
import { CanvasSearchPanel } from "../canvas/CanvasSearchPanel";
import { NavigationBreadcrumbs } from "../canvas/NavigationBreadcrumbs";
import { useAnnouncer } from "@/shared/hooks/useAccessibility";
import { CanvasOverlays } from "./components/CanvasOverlays";
import { DesignCanvasLayout } from "./components/DesignCanvasLayout";
import { DesignCanvasHeader } from "./DesignCanvasHeader";
import { shortcutBus } from "@/lib/events/shortcutBus";
import {
  APP_EVENT,
  type AppEventPayloads,
  dispatchAppEvent,
} from "@/lib/events/appEvents";

export interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
  onSkipToReview?: () => void;
  onFinishAndExport?: () => void;
}

const DesignCanvasComponent: React.FC<DesignCanvasProps> = ({
  challenge,
  initialData,
  onComplete,
  onBack,
  onSkipToReview,
  onFinishAndExport,
}) => {
  const [sessionStartTime] = useState(() => new Date());
  const flushDesignDataRef = useRef<
    ((reason: string, options?: { immediate?: boolean }) => void) | undefined
  >(undefined);
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  type CanvasEventName =
    | typeof APP_EVENT.CANVAS_ZOOM_IN
    | typeof APP_EVENT.CANVAS_ZOOM_OUT
    | typeof APP_EVENT.CANVAS_FIT_VIEW
    | typeof APP_EVENT.CANVAS_FIT_BOUNDS
    | typeof APP_EVENT.CANVAS_AUTO_LAYOUT;

  const dispatchCanvasEvent = useCallback(
    <T extends CanvasEventName>(
      eventName: T,
      detail: AppEventPayloads[T],
    ) => {
      dispatchAppEvent(eventName, detail);
    },
    [],
  );

  const handleExportPng = useCallback(async () => {
    if (typeof window === "undefined" || !canvasWrapperRef.current) {
      return;
    }

    try {
      const dataUrl = await toPng(canvasWrapperRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: Math.min(2, window.devicePixelRatio || 1),
      });

      const safeTitle = (challenge.title || "archicomm-canvas")
        .replace(/\s+/g, "-")
        .toLowerCase();
      const link = document.createElement("a");
      link.download = `${safeTitle}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to export canvas as PNG", error);
      try {
        const anyWindow = window as any;
        const message = "Unable to export PNG. Please try again.";
        if (typeof anyWindow.__ARCHICOMM_TOAST === "function") {
          anyWindow.__ARCHICOMM_TOAST("error", message);
        } else if (anyWindow.toast && typeof anyWindow.toast.error === "function") {
          anyWindow.toast.error(message);
        } else if (typeof anyWindow.showToast === "function") {
          anyWindow.showToast({ type: "error", message });
        }
      } catch (_toastError) {
        // Ignore secondary errors when showing notifications
      }
    }
  }, [challenge.title]);

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>(
    initialData.annotations ?? [],
  );
  const [selectedAnnotationTool, setSelectedAnnotationTool] = useState<
    Annotation["type"] | null
  >(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<
    string | null
  >(null);
  const [highlightedAnnotationId, setHighlightedAnnotationId] =
    useState<string | null>(null);
  const [showAnnotationSidebar, setShowAnnotationSidebar] = useState(false);

  // Connection template state
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{
    from: string;
    to: string;
  } | null>(null);

  // Validation and assessment overlay state
  const [showValidation, setShowValidation] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Keyboard shortcuts modal state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [shortcutsInitialSection, setShortcutsInitialSection] = useState<
    string | undefined
  >();
  const [shortcutsHighlight, setShortcutsHighlight] = useState<string[]>([]);

  // Quick-connect hook
  const quickConnect = useQuickConnect((connection) => {
    // Show template panel for connection
    setPendingConnection({ from: connection.from, to: connection.to });
    setShowTemplatePanel(true);
  });

  const initialSyncPayload = useMemo(
    () => ({
      components: initialData.components ?? [],
      connections: initialData.connections ?? [],
      infoCards: initialData.infoCards ?? [],
    }),
    [initialData.components, initialData.connections, initialData.infoCards],
  );

  const { isSynced } = useInitialCanvasSync({
    initialData: initialSyncPayload,
    challengeId: challenge.id,
    enabled: true,
  });

  const canvasSource = useMemo(
    () => ({
      getState: useCanvasStore.getState,
      subscribe: useCanvasStore.subscribe,
    }),
    [],
  );

  // OPTIMIZED: Use individual selectors to minimize re-renders
  // Only re-render when specific slices change, not when entire canvas state changes
  const components = useOptimizedSelector(
    canvasSource,
    (state: any) => state.components,
    { debugLabel: "DesignCanvas.components", equalityFn: shallow },
  );

  const connections = useOptimizedSelector(
    canvasSource,
    (state: any) => state.connections,
    { debugLabel: "DesignCanvas.connections", equalityFn: shallow },
  );

  const infoCards = useOptimizedSelector(
    canvasSource,
    (state: any) => state.infoCards,
    { debugLabel: "DesignCanvas.infoCards", equalityFn: shallow },
  );

  const selectedComponentId = useOptimizedSelector(
    canvasSource,
    (state: any) => state.selectedComponent,
    { debugLabel: "DesignCanvas.selectedComponent" },
  );

  const connectionStart = useOptimizedSelector(
    canvasSource,
    (state: any) => state.connectionStart,
    { debugLabel: "DesignCanvas.connectionStart" },
  );

  // Drawing state
  const drawings = useCanvasDrawings();
  const drawingTool = useDrawingTool();
  const drawingColor = useDrawingColor();
  const drawingSize = useDrawingSize();
  const drawingSettings = useDrawingSettings();

  const {
    showHints,
    setShowHints,
    showCommandPalette,
    setShowCommandPalette,
    showConfetti,
    setShowConfetti,
    canvasConfig,
    setCanvasConfig,
    serializer,
    buildDesignSnapshot,
    markDesignModified,
  } = useDesignCanvasState({ initialData, sessionStartTime });

  const callbacks = useDesignCanvasCallbacks();
  const announce = useAnnouncer();
  const canvasActions = useCanvasActions();

  // Extract drawing callbacks
  const {
    handleDrawingComplete,
    handleDrawingDelete,
    handleDrawingToolChange,
    handleDrawingColorChange,
    handleDrawingSizeChange,
    handleClearAllDrawings,
  } = callbacks;

  const layers = useMemo(
    () => (Array.isArray(initialData.layers) ? initialData.layers : []),
    [initialData.layers],
  );

  const metadata = useMemo(() => {
    const created = initialData.metadata?.created ?? new Date().toISOString();
    return {
      created,
      lastModified: initialData.metadata?.lastModified ?? created,
      version: initialData.metadata?.version ?? "1.0",
    } satisfies DesignData["metadata"];
  }, [initialData.metadata]);

  // OPTIMIZED: Split currentDesignData memoization
  // Components/connections from store - memoized separately
  const coreCanvasData = useMemo(
    () => ({ components, connections, infoCards }),
    [components, connections, infoCards],
  );

  // Annotations/drawings - local state, change less frequently
  const annotationData = useMemo(
    () => ({ annotations, drawings }),
    [annotations, drawings],
  );

  // Full design data - now only recomputes when major sections change
  const currentDesignData = useMemo<DesignData>(
    () => ({
      ...coreCanvasData,
      ...annotationData,
      layers,
      metadata,
    }),
    [coreCanvasData, annotationData, layers, metadata],
  );

  const highlightedAnnotation = useMemo(() => {
    if (!highlightedAnnotationId) {
      return null;
    }
    return annotations.find(annotation => annotation.id === highlightedAnnotationId) ?? null;
  }, [annotations, highlightedAnnotationId]);

  const handleAnnotationsImported = useCallback(
    (importedAnnotations: Annotation[]) => {
      setAnnotations(importedAnnotations);
    },
    [],
  );

  const {
    handleImport,
    handleQuickExport,
    handleQuickSave,
    handleCopyToClipboard,
    handleImportFromClipboard,
    handleSave,
  } = useDesignCanvasImportExport({
    serializer,
    canvasConfig,
    challenge,
    buildDesignSnapshot,
    markDesignModified,
    setCanvasConfig,
    onAnnotationsImported: handleAnnotationsImported,
  });

  // Use refs to avoid recreating callbacks on every data change
  const currentDesignDataRef = useRef(currentDesignData);
  currentDesignDataRef.current = currentDesignData;

  const exportCurrentDesign = useCallback(
    () => handleQuickExport(currentDesignDataRef.current),
    [handleQuickExport],
  );
  const quickSaveCurrentDesign = useCallback(
    () => handleQuickSave(currentDesignDataRef.current),
    [handleQuickSave],
  );
  const copyCurrentDesign = useCallback(
    () => handleCopyToClipboard(currentDesignDataRef.current),
    [handleCopyToClipboard],
  );
  const saveCurrentDesign = useCallback(
    () => handleSave(currentDesignDataRef.current),
    [handleSave],
  );
  // OPTIMIZED: Stabilize callbacks with refs
  // These callbacks should not recreate when design data changes
  const onCompleteRef = useRef(onComplete);
  const onSkipToReviewRef = useRef(onSkipToReview);
  const onFinishAndExportRef = useRef(onFinishAndExport);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onSkipToReviewRef.current = onSkipToReview;
    onFinishAndExportRef.current = onFinishAndExport;
  });

  const handleContinue = useCallback(() => {
    onCompleteRef.current(currentDesignDataRef.current);
  }, []);

  // Handlers for optional flow
  const handleSkipToReview = useCallback(() => {
    if (onSkipToReviewRef.current) {
      // Save current design data before skipping
      onCompleteRef.current(currentDesignDataRef.current);
      onSkipToReviewRef.current();
    }
  }, []);

  const handleFinishAndExport = useCallback(() => {
    if (onFinishAndExportRef.current) {
      // Save current design data before finishing
      onCompleteRef.current(currentDesignDataRef.current);
      onFinishAndExportRef.current();
    }
  }, []);

  const designCanvasEffects = useDesignCanvasEffects({
    components,
    connections,
    infoCards,
    currentDesignData,
    handleQuickExport: exportCurrentDesign,
    handleQuickSave: quickSaveCurrentDesign,
    handleCopyToClipboard: copyCurrentDesign,
    handleImportFromClipboard,
  });

  useEffect(() => {
    flushDesignDataRef.current = designCanvasEffects.flushPendingDesign;
    return () => {
      flushDesignDataRef.current = undefined;
    };
  }, [designCanvasEffects.flushPendingDesign]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = null;
      }
    };
  }, []);

  const extendedChallenge = useMemo<ExtendedChallenge>(
    () =>
      (challengeManager.getChallengeById(challenge.id) as ExtendedChallenge) ??
      challenge,
    [challenge],
  );

  const challengeTags = useMemo<string[] | undefined>(() => {
    const tags = (extendedChallenge as ExtendedChallenge)?.tags;
    return Array.isArray(tags) ? tags : undefined;
  }, [extendedChallenge]);

  const { progress } = useStatusBarMetrics({
    components,
    connections,
    sessionStartTime,
  });

  const {
    registerReactFlowInstance,
    focusViewport,
    handleComponentDrop,
    handleComponentMove,
    handleComponentSelect,
    handleDeleteComponent,
    handleDuplicateComponent,
    handleCompleteConnection,
    handleStartConnection,
    handleConnectionDelete,
    handleInfoCardAdd,
    handleInfoCardUpdate,
    handleInfoCardDelete,
    handleComponentLabelChange,
    handleStickerEmojiChange,
    handleStickerToggle,
    handleShowLabelToggle,
    handleBgColorChange,
    handleNodeBgChange,
  } = callbacks;

  // Keyboard navigation and shortcuts
  useCanvasKeyboardNavigation({
    enabled: true,
    components,
    selectedComponentId,
    onComponentSelect: handleComponentSelect,
    onComponentDelete: handleDeleteComponent,
    onComponentDuplicate: handleDuplicateComponent,
    onComponentMove: handleComponentMove,
    onUndo: () => useCanvasStore.temporal.getState().undo(),
    onRedo: () => useCanvasStore.temporal.getState().redo(),
    onZoomIn: () =>
      dispatchCanvasEvent(APP_EVENT.CANVAS_ZOOM_IN, undefined),
    onZoomOut: () =>
      dispatchCanvasEvent(APP_EVENT.CANVAS_ZOOM_OUT, undefined),
    onFitView: () =>
      dispatchCanvasEvent(APP_EVENT.CANVAS_FIT_VIEW, undefined),
    onSetCanvasMode: (mode) => useCanvasStore.getState().setCanvasMode(mode),
    onHelp: () => {
      setShortcutsInitialSection(undefined);
      setShortcutsHighlight(["onHelp"]);
      setShowKeyboardShortcuts(true);
    },
  });

  // Listen for custom event to open keyboard shortcuts modal
  useEffect(() => {
    const handleOpenShortcuts = (event: Event) => {
      const customEvent = event as CustomEvent<
        AppEventPayloads[typeof APP_EVENT.KEYBOARD_SHORTCUTS_OPEN]
      >;
      setShortcutsInitialSection(customEvent.detail?.section);
      setShortcutsHighlight([]);
      setShowKeyboardShortcuts(true);
    };

    window.addEventListener(
      APP_EVENT.KEYBOARD_SHORTCUTS_OPEN,
      handleOpenShortcuts,
    );
    return () => {
      window.removeEventListener(
        APP_EVENT.KEYBOARD_SHORTCUTS_OPEN,
        handleOpenShortcuts,
      );
    };
  }, []);

  // World-class canvas hooks
  const frameManagement = useFrameManagement();
  const canvasSearch = useCanvasSearch();
  const frames = useCanvasOrganizationStore((state) => state.frames);
  const navigationHistory = useCanvasOrganizationStore((state) => state.navigationHistory);
  const currentHistoryIndex = useCanvasOrganizationStore((state) => state.currentHistoryIndex);  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+F: Open search
      if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        setShowSearchPanel(true);
        return;
      }

      // Ctrl+Shift+I: Toggle AI assistant
      if (event.ctrlKey && event.shiftKey && event.key === 'I') {
        event.preventDefault();
        setShowAIAssistant(prev => !prev);
        return;
      }

      // Ctrl+Shift+T: Open text-to-diagram
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        setShowTextToDiagram(true);
        return;
      }

      // Ctrl+Shift+F: Create frame from selection
      if (event.ctrlKey && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        frameManagement.createFrameFromSelection();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [frameManagement]);

  // Listen for canvas search jump-to-result events
  useEffect(() => {
    const handleSearchJump = (event: Event) => {
      const customEvent = event as CustomEvent<{ result: SearchResult }>;
      const { result } = customEvent.detail;

      // Use React Flow's fitBounds or setCenter to navigate to the result
      if (result.type === 'component') {
        const component = components.find((c: any) => c.id === result.id);
        if (component) {
          dispatchCanvasEvent(APP_EVENT.CANVAS_FIT_BOUNDS, {
            x: component.x - 100,
            y: component.y - 100,
            width: 200,
            height: 200,
            padding: 0.2,
          });
        }
      } else if (result.type === 'connection') {
        // For connections, we might need to calculate bounds of connected components
        const connection = connections.find((c: any) => c.id === result.id);
        if (connection) {
          const fromComponent = components.find((c: any) => c.id === connection.from);
          const toComponent = components.find((c: any) => c.id === connection.to);
          if (fromComponent && toComponent) {
            const minX = Math.min(fromComponent.x, toComponent.x);
            const minY = Math.min(fromComponent.y, toComponent.y);
            const maxX = Math.max(fromComponent.x + (fromComponent.width || 100), toComponent.x + (toComponent.width || 100));
            const maxY = Math.max(fromComponent.y + (fromComponent.height || 50), toComponent.y + (toComponent.height || 50));

            dispatchCanvasEvent(APP_EVENT.CANVAS_FIT_BOUNDS, {
              x: minX - 50,
              y: minY - 50,
              width: maxX - minX + 100,
              height: maxY - minY + 100,
              padding: 0.2,
            });
          }
        }
      }
    };

    window.addEventListener('canvas:search:jump-to-result', handleSearchJump);
    return () => {
      window.removeEventListener('canvas:search:jump-to-result', handleSearchJump);
    };
  }, [components, connections, dispatchCanvasEvent]);

  // Listen for search keyboard shortcuts
  useEffect(() => {
    const handleSearchShortcut = () => {
      setShowSearchPanel(true);
      // Focus the search input after a brief delay to ensure the panel is rendered
      setTimeout(() => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }, 100);
    };

    const handleSearchNext = () => {
      const results = canvasSearch.results;
      if (results.length > 0) {
        // Find current result index (this is a simplified approach - in a real implementation
        // you'd track the current result index in state)
        const currentIndex = 0; // For now, just go to the first result
        const nextIndex = (currentIndex + 1) % results.length;
        const nextResult = results[nextIndex];
        if (nextResult) {
          canvasSearch.jumpToResult(nextResult);
        }
      }
    };

    const handleSearchPrev = () => {
      const results = canvasSearch.results;
      if (results.length > 0) {
        // Find current result index
        const currentIndex = 0; // For now, just go to the last result
        const prevIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
        const prevResult = results[prevIndex];
        if (prevResult) {
          canvasSearch.jumpToResult(prevResult);
        }
      }
    };

    const unsubscribeSearch = shortcutBus.on('shortcut:search', handleSearchShortcut);
    const unsubscribeSearchNext = shortcutBus.on('shortcut:search-next', handleSearchNext);
    const unsubscribeSearchPrev = shortcutBus.on('shortcut:search-prev', handleSearchPrev);

    return () => {
      unsubscribeSearch();
      unsubscribeSearchNext();
      unsubscribeSearchPrev();
    };
  }, [canvasSearch]);

  // Annotation callbacks
  const handleAnnotationToolSelect = useCallback(
    (tool: Annotation["type"] | null) => {
      setSelectedAnnotationTool(tool);
    },
    [],
  );

  const handleAnnotationCreate = useCallback(
    (x: number, y: number, type: Annotation["type"]) => {
      const newAnnotation: Annotation = {
        id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content: "",
        x,
        y,
        width: 200,
        height: 100,
        timestamp: Date.now(),
      };
      setAnnotations((prev) => [...prev, newAnnotation]);
      setSelectedAnnotationId(newAnnotation.id);
      setSelectedAnnotationTool(null);
      markDesignModified();
    },
    [markDesignModified],
  );

  const handleAnnotationSelect = useCallback((id: string | null) => {
    setSelectedAnnotationId(id);
  }, []);

  const handleAnnotationDelete = useCallback(
    (id: string) => {
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      if (selectedAnnotationId === id) {
        setSelectedAnnotationId(null);
      }
      markDesignModified();
    },
    [selectedAnnotationId, markDesignModified],
  );

  const handleAnnotationUpdate = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      );
      markDesignModified();
    },
    [markDesignModified],
  );

  const handleAnnotationFocus = useCallback(
    (id: string) => {
      setSelectedAnnotationId(id);

      const annotation = annotations.find(item => item.id === id);
      if (!annotation) {
        return;
      }

      const width = annotation.width ?? 220;
      const height = annotation.height ?? 120;
      const centerX = annotation.x + width / 2;
      const centerY = annotation.y + height / 2;

      const viewportFocused = focusViewport(
        { x: centerX, y: centerY },
        { zoom: 1.1, duration: 320 },
      );

      if (!viewportFocused) {
        dispatchCanvasEvent(APP_EVENT.CANVAS_FIT_BOUNDS, {
          x: annotation.x - 48,
          y: annotation.y - 48,
          width: width + 96,
          height: height + 96,
          padding: 0.2,
        });
      }

      setHighlightedAnnotationId(id);
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedAnnotationId(null);
        highlightTimeoutRef.current = null;
      }, 1500);

      const message = annotation.content?.trim()
        ? `Focused annotation: ${annotation.content}`
        : `Focused ${annotation.type} annotation`;
      announce(message, "polite");
    },
    [annotations, focusViewport, dispatchCanvasEvent, announce],
  );

  // Connection template handlers
  const handleTemplateSelect = useCallback(
    (template: ConnectionTemplate) => {
      if (!pendingConnection) return;

      // Apply template to create connection with appropriate properties
      const connectionData = applyTemplate(template, {
        from: pendingConnection.from,
        to: pendingConnection.to,
      });

      // Add to recently used
      addToRecentlyUsed(template.id);

      // Create a new connection with ID
      const newConnection: Connection = {
        id: `${pendingConnection.from}-${pendingConnection.to}-${Date.now()}`,
        from: connectionData.from!,
        to: connectionData.to!,
        type: connectionData.type || "data",
        label: connectionData.label || "",
        visualStyle: connectionData.visualStyle,
        metadata: connectionData.metadata,
      };

      // Update the store with the new connection
      useCanvasStore
        .getState()
        .updateConnections((connections) => [...connections, newConnection]);

      // Close template panel
      setShowTemplatePanel(false);
      setPendingConnection(null);
    },
    [pendingConnection],
  );

  const handleTemplatePanelCancel = useCallback(() => {
    setShowTemplatePanel(false);
    setPendingConnection(null);
  }, []);

  // Get available templates for pending connection
  const availableTemplates = useMemo(() => {
    if (!pendingConnection) return [];

    const sourceComponent = components.find(
      (c) => c.id === pendingConnection.from,
    );
    const targetComponent = components.find(
      (c) => c.id === pendingConnection.to,
    );

    if (!sourceComponent || !targetComponent) return [];

    return getTemplatesForComponentPair(
      sourceComponent.type,
      targetComponent.type,
    );
  }, [pendingConnection, components]);

  // World-class canvas feature state
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showTextToDiagram, setShowTextToDiagram] = useState(false);
  const [currentViewport, setCurrentViewport] = useState<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 1 });

  return (
    <DndProvider backend={HTML5Backend}>
      <DesignCanvasLayout
        header={
          <DesignCanvasHeader
            challenge={challenge}
            showHints={showHints}
            components={components}
            currentDesignData={currentDesignData}
            canvasConfig={canvasConfig}
            onBack={onBack}
            onContinue={handleContinue}
            onToggleHints={() => setShowHints((prev: boolean) => !prev)}
            onSave={saveCurrentDesign}
            onShowCommandPalette={() => setShowCommandPalette(true)}
            onImport={handleImport}
            showAnnotationSidebar={showAnnotationSidebar}
            onToggleAnnotationSidebar={() =>
              setShowAnnotationSidebar((prev) => !prev)
            }
            annotationCount={annotations.length}
            onSkipToReview={onSkipToReview ? handleSkipToReview : undefined}
            onFinishAndExport={
              onFinishAndExport ? handleFinishAndExport : undefined
            }
          />
        }
        assignmentPanel={
          <AssignmentPanel
            challenge={extendedChallenge}
            progress={progress}
            currentComponents={components}
          />
        }
        canvas={
          <div
            ref={canvasWrapperRef}
            className="relative w-full h-full min-h-[500px]"
          >
            {/* Canvas Toolbar */}
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[var(--z-toolbar)]"
              data-tour="canvas-toolbar"
            >
              <CanvasToolbar
                onFitView={() => {
                  dispatchCanvasEvent(APP_EVENT.CANVAS_FIT_VIEW, undefined);
                }}
                onAutoLayout={() => {
                  dispatchCanvasEvent(APP_EVENT.CANVAS_AUTO_LAYOUT, undefined);
                }}
                onToggleSettings={() => setShowSettings(true)}
                onQuickValidate={() => setShowValidation(true)}
                onSelfAssessment={() => setShowAssessment(true)}
                onExportJSON={() => {
                  handleQuickExport(currentDesignData);
                }}
                onExportPNG={() => {
                  void handleExportPng();
                }}
                onShowHelp={(section) => {
                  setShortcutsInitialSection(section);
                  // Set highlighted shortcuts based on section
                  const highlights: Record<string, string[]> = {
                    "Canvas Modes": ["onSetCanvasMode"],
                    View: ["onToggleGrid", "onToggleMinimap"],
                    Animation: ["onToggleAnimations"],
                    Layout: ["onUndo", "onRedo", "onFitView"],
                    Validation: [],
                    Export: [],
                    Settings: [],
                  };
                  setShortcutsHighlight(highlights[section] || []);
                  setShowKeyboardShortcuts(true);
                }}
                onExportWithNotes={() => {
                  // Export with annotations and self-assessment
                  const exportData = {
                    ...currentDesignData,
                    annotations: annotations,
                  };

                  // Try to attach self-assessment if available
                  try {
                    const storageKey = `archicomm_self_assessment_${challenge.id}`;
                    const savedAssessment = localStorage.getItem(storageKey);
                    if (savedAssessment) {
                      const assessment = JSON.parse(savedAssessment);
                      (exportData as any).selfAssessment = assessment;
                    }
                  } catch (error) {
                    console.warn(
                      "Failed to attach self-assessment to export:",
                      error,
                    );
                  }

                  handleQuickExport(exportData);
                }}
              />
            </div>

            <ReactFlowCanvasWrapper
              components={components}
              connections={connections}
              infoCards={infoCards}
              selectedComponentId={selectedComponentId}
              onViewportChange={setCurrentViewport}
              onComponentSelect={handleComponentSelect}
              onComponentDeselect={() => handleComponentSelect(null)}
              onComponentDrop={handleComponentDrop}
              onComponentPositionChange={handleComponentMove}
              onComponentDelete={handleDeleteComponent}
              onConnectionCreate={(connection) => {
                // In quick-connect mode, connections are created via the hook
                if (
                  quickConnect.isQuickConnectMode &&
                  quickConnect.quickConnectSource
                ) {
                  quickConnect.completeQuickConnect(connection.to);
                } else {
                  handleCompleteConnection(connection.from, connection.to);
                }
              }}
              onConnectionDelete={handleConnectionDelete}
              onConnectionSelect={() => {}}
              onReactFlowInit={registerReactFlowInstance}
            />

            {/* Quick Connect Overlay */}
            {quickConnect.isQuickConnectMode &&
              quickConnect.quickConnectSource && (
                <QuickConnectOverlay
                  sourceNodeId={quickConnect.quickConnectSource}
                  previewPosition={quickConnect.quickConnectPreview}
                  isValidTarget={true}
                  onCancel={quickConnect.cancelQuickConnect}
                />
              )}
          </div>
        }
        propertiesPanel={
          <PropertiesPanel
            selectedComponent={selectedComponentId ?? null}
            components={components}
            onLabelChange={handleComponentLabelChange}
            onDelete={handleDeleteComponent}
            onDuplicate={handleDuplicateComponent}
            onShowLabelToggle={handleShowLabelToggle}
            onStickerToggle={handleStickerToggle}
            onStickerEmojiChange={handleStickerEmojiChange}
            onBgColorChange={handleBgColorChange}
            onNodeBgChange={handleNodeBgChange}
            challengeTags={challengeTags}
          />
        }
        statusBar={
          <StatusBar
            components={components}
            connections={connections}
            infoCards={infoCards}
            selectedComponentId={selectedComponentId}
            sessionStartTime={sessionStartTime}
            currentDesignData={currentDesignData}
          />
        }
        overlays={
          <>
            <CanvasOverlays
              showHints={showHints}
              onCloseHints={() => setShowHints(false)}
              challenge={extendedChallenge}
              currentComponents={components}
              showCommandPalette={showCommandPalette}
              onCloseCommandPalette={() => setShowCommandPalette(false)}
              onNavigate={() => {}}
              selectedChallenge={extendedChallenge}
              showConfetti={showConfetti}
              onConfettiDone={() => setShowConfetti(false)}
            />

            {/* Onboarding Tour */}
            <CanvasOnboardingTour />

            {/* Contextual Help */}
            <CanvasContextualHelp />

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsReference
              isOpen={showKeyboardShortcuts}
              onClose={() => {
                setShowKeyboardShortcuts(false);
                setShortcutsInitialSection(undefined);
                setShortcutsHighlight([]);
              }}
              initialSection={shortcutsInitialSection}
              highlightShortcuts={shortcutsHighlight}
            />

            {/* Connection Template Panel */}
            {showTemplatePanel && pendingConnection && (
              <ConnectionTemplatePanel
                sourceType={
                  components.find((c) => c.id === pendingConnection.from)
                    ?.type || ""
                }
                targetType={
                  components.find((c) => c.id === pendingConnection.to)?.type ||
                  ""
                }
                templates={availableTemplates}
                onSelectTemplate={handleTemplateSelect}
                onCancel={handleTemplatePanelCancel}
              />
            )}

            {/* Quick Validation Panel */}
            {showValidation && (
              <QuickValidationPanel
                isOpen={showValidation}
                onClose={() => setShowValidation(false)}
                designData={currentDesignData}
                challenge={extendedChallenge}
                onApplyFix={(fixData) => {
                  // Apply the fix to the canvas
                  if (fixData.components && fixData.components.length > 0) {
                    canvasActions.updateComponents((components) => [...components, ...(fixData.components || [])]);
                  }
                  if (fixData.connections && fixData.connections.length > 0) {
                    canvasActions.updateConnections((connections) => [...connections, ...(fixData.connections || [])]);
                  }
                }}
                onRunFullReview={() => {
                  setShowValidation(false);
                  if (onSkipToReview) {
                    onComplete(currentDesignData);
                    onSkipToReview();
                  }
                }}
              />
            )}

            <CanvasSettingsPanel
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
            />

            {/* Self-Assessment Overlay */}
            {showAssessment && (
              <CanvasSelfAssessment
                isOpen={showAssessment}
                onClose={() => setShowAssessment(false)}
                challenge={extendedChallenge}
                designData={currentDesignData}
                onComplete={(assessment) => {
                  // Assessment is saved to localStorage by the component
                  console.log("Self-assessment completed:", assessment);
                }}
              />
            )}

            {/* Frame Overlay */}
            <FrameOverlay
              frames={frames}
              viewport={currentViewport}
              onFrameSelect={frameManagement.selectFrame}
              onFrameResize={frameManagement.resizeFrame}
              onFrameMove={frameManagement.moveFrame}
            />

            {/* Canvas Search Panel */}
            <CanvasSearchPanel
              isOpen={showSearchPanel}
              onClose={() => setShowSearchPanel(false)}
              onResultSelect={(result) => {
                canvasSearch.jumpToResult(result);
                setShowSearchPanel(false);
              }}
            />

            {/* Navigation Breadcrumbs */}
            <NavigationBreadcrumbs
              history={navigationHistory}
              currentIndex={currentHistoryIndex}
              onNavigate={(entry) => {
                // Handle navigation
                console.log('Navigate to:', entry);
              }}
            />

            {/* AI Assistant Panel */}
            <AIAssistantPanel
              isOpen={showAIAssistant}
              onClose={() => setShowAIAssistant(false)}
            />

            {/* Text to Diagram Modal */}
            <TextToDiagramModal
              isOpen={showTextToDiagram}
              onClose={() => setShowTextToDiagram(false)}
            />

            {/* Performance Indicator */}
            <PerformanceIndicator
              fps={60}
              renderTime={16}
              nodeCount={components.length}
              edgeCount={connections.length}
            />
          </>
        }
        annotationToolbar={
          <AnnotationToolbar
            selectedTool={selectedAnnotationTool}
            onToolSelect={handleAnnotationToolSelect}
          />
        }
        annotationSidebar={
          showAnnotationSidebar ? (
            <AnnotationSidebar
              annotations={annotations}
              selectedAnnotation={selectedAnnotationId}
              onAnnotationSelect={handleAnnotationSelect}
              onAnnotationDelete={handleAnnotationDelete}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationFocus={handleAnnotationFocus}
            />
          ) : undefined
        }
      />
    </DndProvider>
  );
};

const designCanvasPropsEqual = (
  prev: DesignCanvasProps,
  next: DesignCanvasProps,
): boolean => {
  if (prev.challenge.id !== next.challenge.id) return false;
  if (prev.onComplete !== next.onComplete || prev.onBack !== next.onBack)
    return false;
  if (prev.initialData === next.initialData) return true;
  return (
    prev.initialData.components?.length ===
      next.initialData.components?.length &&
    prev.initialData.connections?.length ===
      next.initialData.connections?.length &&
    prev.initialData.infoCards?.length === next.initialData.infoCards?.length &&
    shallow(prev.initialData.metadata, next.initialData.metadata) &&
    shallow(prev.initialData.layers, next.initialData.layers)
  );
};

export const DesignCanvas = React.memo(
  DesignCanvasComponent,
  designCanvasPropsEqual,
);

DesignCanvas.displayName = "DesignCanvas";
