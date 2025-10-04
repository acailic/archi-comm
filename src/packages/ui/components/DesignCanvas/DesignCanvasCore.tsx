import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { shallow } from "zustand/shallow";

import {
  ExtendedChallenge,
  challengeManager,
} from "../../../../lib/config/challenge-config";
import type { Challenge, DesignData, Connection } from "../../../../shared/contracts";
import { useOptimizedSelector } from "../../../../shared/hooks/useOptimizedSelector";
import { useCanvasStore } from "../../../../stores/canvasStore";

import { AssignmentPanel } from "../AssignmentPanel";
import { StatusBar } from "../layout/StatusBar";
import { PropertiesPanel } from "../PropertiesPanel";

import { useInitialCanvasSync } from "../../../../shared/hooks/useInitialCanvasSync";
import { useDesignCanvasCallbacks } from "./hooks/useDesignCanvasCallbacks";
import { useDesignCanvasEffects } from "./hooks/useDesignCanvasEffects";
import { useDesignCanvasImportExport } from "./hooks/useDesignCanvasImportExport";
import { useDesignCanvasState } from "./hooks/useDesignCanvasState";
import { useStatusBarMetrics } from "./hooks/useStatusBarMetrics";
import { useCanvasKeyboardNavigation } from "./hooks/useCanvasKeyboardNavigation";

import { SimpleCanvas } from "../../../canvas/SimpleCanvas";
import { CanvasOverlays } from "./components/CanvasOverlays";
import { DesignCanvasLayout } from "./components/DesignCanvasLayout";
import { DesignCanvasHeader } from "./DesignCanvasHeader";
import { AnnotationToolbar } from "../canvas/AnnotationToolbar";
import { AnnotationSidebar } from "../canvas/AnnotationSidebar";
import { CanvasToolbar } from "../canvas/CanvasToolbar";
import { QuickConnectOverlay } from "../canvas/QuickConnectOverlay";
import { CanvasOnboardingTour } from "../canvas/CanvasOnboardingTour";
import { CanvasContextualHelp } from "../canvas/CanvasContextualHelp";
import { ConnectionTemplatePanel } from "../canvas/ConnectionTemplatePanel";
import { QuickValidationPanel } from "../canvas/QuickValidationPanel";
import { CanvasSelfAssessment } from "../canvas/CanvasSelfAssessment";
import { KeyboardShortcutsReference } from "../canvas/KeyboardShortcutsReference";
import type { Annotation } from "../../../../shared/contracts";
import { useQuickConnect } from "../../../canvas/hooks/useQuickConnect";
import {
  getTemplatesForComponentPair,
  applyTemplate,
  addToRecentlyUsed,
  type ConnectionTemplate,
} from "../../../canvas/config/connection-templates";

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

  // Annotation state
  const [annotations, setAnnotations] = useState<Annotation[]>(initialData.annotations ?? []);
  const [selectedAnnotationTool, setSelectedAnnotationTool] = useState<Annotation['type'] | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [showAnnotationSidebar, setShowAnnotationSidebar] = useState(false);

  // Connection template state
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{ from: string; to: string } | null>(null);

  // Validation and assessment overlay state
  const [showValidation, setShowValidation] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);

  // Keyboard shortcuts modal state
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [shortcutsInitialSection, setShortcutsInitialSection] = useState<string | undefined>();
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
    [initialData.components, initialData.connections, initialData.infoCards]
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
    []
  );

  const {
    components,
    connections,
    infoCards,
    selectedComponentId,
    connectionStart,
  } =
    useOptimizedSelector(
      canvasSource,
      (state: any) => ({
        components: state.components,
        connections: state.connections,
        infoCards: state.infoCards,
        selectedComponentId: state.selectedComponent,
        connectionStart: state.connectionStart,
      }),
      { debugLabel: "DesignCanvas.canvasState", equalityFn: shallow }
    );

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

  const layers = useMemo(
    () => (Array.isArray(initialData.layers) ? initialData.layers : []),
    [initialData.layers]
  );

  const metadata = useMemo(() => {
    const created = initialData.metadata?.created ?? new Date().toISOString();
    return {
      created,
      lastModified: initialData.metadata?.lastModified ?? created,
      version: initialData.metadata?.version ?? "1.0",
    } satisfies DesignData["metadata"];
  }, [initialData.metadata]);

  const currentDesignData = useMemo<DesignData>(
    () => ({
      components,
      connections,
      infoCards,
      annotations,
      layers,
      metadata,
    }),
    [components, connections, infoCards, annotations, layers, metadata]
  );

  const handleAnnotationsImported = useCallback((importedAnnotations: Annotation[]) => {
    setAnnotations(importedAnnotations);
  }, []);

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
    [handleQuickExport]
  );
  const quickSaveCurrentDesign = useCallback(
    () => handleQuickSave(currentDesignDataRef.current),
    [handleQuickSave]
  );
  const copyCurrentDesign = useCallback(
    () => handleCopyToClipboard(currentDesignDataRef.current),
    [handleCopyToClipboard]
  );
  const saveCurrentDesign = useCallback(
    () => handleSave(currentDesignDataRef.current),
    [handleSave]
  );
  const handleContinue = useCallback(
    () => onComplete(currentDesignData),
    [onComplete, currentDesignData]
  );

  // Handlers for optional flow
  const handleSkipToReview = useCallback(() => {
    if (onSkipToReview) {
      // Save current design data before skipping
      onComplete(currentDesignData);
      onSkipToReview();
    }
  }, [onSkipToReview, onComplete, currentDesignData]);

  const handleFinishAndExport = useCallback(() => {
    if (onFinishAndExport) {
      // Save current design data before finishing
      onComplete(currentDesignData);
      onFinishAndExport();
    }
  }, [onFinishAndExport, onComplete, currentDesignData]);

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

  const extendedChallenge = useMemo<ExtendedChallenge>(
    () =>
      (challengeManager.getChallengeById(challenge.id) as ExtendedChallenge) ??
      challenge,
    [challenge]
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
    onZoomIn: () => {}, // TODO: implement zoom
    onZoomOut: () => {}, // TODO: implement zoom
    onFitView: () => {}, // TODO: implement fit view
    onSetCanvasMode: (mode) => useCanvasStore.getState().setCanvasMode(mode),
    onHelp: () => {
      setShortcutsInitialSection(undefined);
      setShortcutsHighlight(['onHelp']);
      setShowKeyboardShortcuts(true);
    },
  });

  // Listen for custom event to open keyboard shortcuts modal
  useEffect(() => {
    const handleOpenShortcuts = (event: Event) => {
      const customEvent = event as CustomEvent<{ section?: string }>;
      setShortcutsInitialSection(customEvent.detail?.section);
      setShortcutsHighlight([]);
      setShowKeyboardShortcuts(true);
    };

    window.addEventListener('open-keyboard-shortcuts', handleOpenShortcuts);
    return () => {
      window.removeEventListener('open-keyboard-shortcuts', handleOpenShortcuts);
    };
  }, []);

  // Annotation callbacks
  const handleAnnotationToolSelect = useCallback((tool: Annotation['type'] | null) => {
    setSelectedAnnotationTool(tool);
  }, []);

  const handleAnnotationCreate = useCallback((x: number, y: number, type: Annotation['type']) => {
    const newAnnotation: Annotation = {
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: '',
      x,
      y,
      width: 200,
      height: 100,
      timestamp: Date.now(),
    };
    setAnnotations(prev => [...prev, newAnnotation]);
    setSelectedAnnotationId(newAnnotation.id);
    setSelectedAnnotationTool(null);
    markDesignModified();
  }, [markDesignModified]);

  const handleAnnotationSelect = useCallback((id: string | null) => {
    setSelectedAnnotationId(id);
  }, []);

  const handleAnnotationDelete = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
    markDesignModified();
  }, [selectedAnnotationId, markDesignModified]);

  const handleAnnotationUpdate = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    markDesignModified();
  }, [markDesignModified]);

  const handleAnnotationFocus = useCallback((id: string) => {
    setSelectedAnnotationId(id);
    // TODO: Implement scroll to annotation using React Flow's fitView
  }, []);

  // Connection template handlers
  const handleTemplateSelect = useCallback((template: ConnectionTemplate) => {
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
      type: connectionData.type || 'data',
      label: connectionData.label || '',
      visualStyle: connectionData.visualStyle,
      metadata: connectionData.metadata,
    };

    // Update the store with the new connection
    useCanvasStore.getState().updateConnections(
      (connections) => [...connections, newConnection]
    );

    // Close template panel
    setShowTemplatePanel(false);
    setPendingConnection(null);
  }, [pendingConnection]);

  const handleTemplatePanelCancel = useCallback(() => {
    setShowTemplatePanel(false);
    setPendingConnection(null);
  }, []);

  // Get available templates for pending connection
  const availableTemplates = useMemo(() => {
    if (!pendingConnection) return [];

    const sourceComponent = components.find(c => c.id === pendingConnection.from);
    const targetComponent = components.find(c => c.id === pendingConnection.to);

    if (!sourceComponent || !targetComponent) return [];

    return getTemplatesForComponentPair(
      sourceComponent.type,
      targetComponent.type
    );
  }, [pendingConnection, components]);

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
            onToggleAnnotationSidebar={() => setShowAnnotationSidebar(prev => !prev)}
            annotationCount={annotations.length}
            onSkipToReview={onSkipToReview ? handleSkipToReview : undefined}
            onFinishAndExport={onFinishAndExport ? handleFinishAndExport : undefined}
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
          <div className="relative w-full h-full">
            {/* Canvas Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[var(--z-toolbar)]" data-tour="canvas-toolbar">
              <CanvasToolbar
                onFitView={() => {
                  // TODO: Implement fit view using React Flow
                }}
                onAutoLayout={() => {
                  // TODO: Implement auto layout
                }}
                onToggleSettings={() => {
                  // TODO: Implement settings panel
                }}
                onQuickValidate={() => setShowValidation(true)}
                onSelfAssessment={() => setShowAssessment(true)}
                onExportJSON={() => {
                  handleQuickExport(currentDesignData);
                }}
                onExportPNG={() => {
                  // TODO: Implement PNG export
                }}
                onShowHelp={(section) => {
                  setShortcutsInitialSection(section);
                  // Set highlighted shortcuts based on section
                  const highlights: Record<string, string[]> = {
                    'Canvas Modes': ['onSetCanvasMode'],
                    'View': ['onToggleGrid', 'onToggleMinimap'],
                    'Animation': ['onToggleAnimations'],
                    'Layout': ['onUndo', 'onRedo', 'onFitView'],
                    'Validation': [],
                    'Export': [],
                    'Settings': [],
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
                    console.warn('Failed to attach self-assessment to export:', error);
                  }

                  handleQuickExport(exportData);
                }}
              />
            </div>

            <SimpleCanvas
              components={components}
              connections={connections}
              selectedComponent={selectedComponentId ?? null}
              connectionStart={quickConnect.quickConnectSource ?? connectionStart ?? null}
              selectedAnnotationTool={selectedAnnotationTool}
              onConnectionStart={(id) => {
                // In quick-connect mode, use the quick-connect hook
                if (quickConnect.isQuickConnectMode) {
                  quickConnect.startQuickConnect(id);
                } else {
                  handleStartConnection(id);
                }
              }}
              onComponentSelect={handleComponentSelect}
              onComponentMove={(id, x, y) => handleComponentMove(id, x, y)}
              onComponentDelete={handleDeleteComponent}
              onConnectionCreate={(connection) => {
                // In quick-connect mode, connections are created via the hook
                if (quickConnect.isQuickConnectMode && quickConnect.quickConnectSource) {
                  quickConnect.completeQuickConnect(connection.to);
                } else {
                  handleCompleteConnection(connection.from, connection.to);
                }
              }}
              onConnectionDelete={handleConnectionDelete}
              onComponentDrop={handleComponentDrop}
              onAnnotationCreate={handleAnnotationCreate}
              onQuickConnectPreviewUpdate={quickConnect.updatePreview}
            />

            {/* Quick Connect Overlay */}
            {quickConnect.isQuickConnectMode && quickConnect.quickConnectSource && (
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
                sourceType={components.find(c => c.id === pendingConnection.from)?.type || ''}
                targetType={components.find(c => c.id === pendingConnection.to)?.type || ''}
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
                onRunFullReview={() => {
                  setShowValidation(false);
                  if (onSkipToReview) {
                    onComplete(currentDesignData);
                    onSkipToReview();
                  }
                }}
              />
            )}

            {/* Self-Assessment Overlay */}
            {showAssessment && (
              <CanvasSelfAssessment
                isOpen={showAssessment}
                onClose={() => setShowAssessment(false)}
                challenge={extendedChallenge}
                designData={currentDesignData}
                onComplete={(assessment) => {
                  // Assessment is saved to localStorage by the component
                  console.log('Self-assessment completed:', assessment);
                }}
              />
            )}
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
  next: DesignCanvasProps
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
  designCanvasPropsEqual
);

DesignCanvas.displayName = "DesignCanvas";
