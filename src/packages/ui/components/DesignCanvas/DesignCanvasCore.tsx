// src/components/DesignCanvas/DesignCanvasCore.tsx
// Core DesignCanvas component logic and orchestration
// Main component structure, hooks integration, and render guard logic
// RELEVANT FILES: DesignCanvasHeader.tsx, hooks/useDesignCanvasCallbacks.ts, hooks/useDesignCanvasState.ts, hooks/useDesignCanvasEffects.ts

import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { useInitialCanvasSync } from '@/hooks/useInitialCanvasSync';
import { useStableCallbacks, useStableCallback } from '@/hooks/useStableCallbacks';
import { storage } from '@services/storage';
import {
  useCanvasActions,
  useCanvasComponents,
  useCanvasConnectionStart,
  useCanvasConnections,
  useCanvasInfoCards,
  useCanvasSelectedComponent,
  useCanvasVisualTheme,
} from '@/stores/canvasStore';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner';
import { ReactFlowCanvas } from '@canvas/components/ReactFlowCanvas';
import { ExtendedChallenge, challengeManager } from '@/lib/challenge-config';
import type { Challenge, DesignData } from '@/shared/contracts';
import { AssignmentPanel } from '@ui/components/AssignmentPanel';
import { CommandPalette } from '@ui/components/CommandPalette';
import Confetti from '@ui/components/Confetti';
import { PropertiesPanel } from '@ui/components/PropertiesPanel';
import { SolutionHints } from '@ui/components/SolutionHints';
import { StatusBar } from '@ui/components/StatusBar';
import { ResizablePanel } from '@ui/components/ui/ResizablePanel';
import { DesignCanvasHeader } from './DesignCanvasHeader';
import { useDesignCanvasCallbacks } from './hooks/useDesignCanvasCallbacks';
import { useDesignCanvasState } from './hooks/useDesignCanvasState';
import { useDesignCanvasEffects } from './hooks/useDesignCanvasEffects';
import { DesignSerializer } from '@/lib/import-export/DesignSerializer';

export interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
}

export function DesignCanvas({ challenge, initialData, onComplete, onBack }: DesignCanvasProps) {
  usePerformanceMonitor('DesignCanvas');

  const mountedRef = useRef(false);
  const renderGuardRef = useRef({ count: 0, windowStart: Date.now() });
  const [sessionStartTime] = React.useState<Date>(new Date());

  // Mount detection
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Canvas actions and state
  const canvasActions = useCanvasActions();
  const { isSynced } = useInitialCanvasSync({
    initialData: {
      components: initialData.components || [],
      connections: initialData.connections || [],
      infoCards: initialData.infoCards || [],
    },
    challengeId: challenge.id,
    enabled: true,
  });

  // Selective subscriptions to prevent unnecessary re-renders
  const components = useCanvasComponents();
  const connections = useCanvasConnections();
  const infoCards = useCanvasInfoCards();
  const selectedComponent = useCanvasSelectedComponent();
  const connectionStart = useCanvasConnectionStart();
  const visualTheme = useCanvasVisualTheme();

  // Render guard logic
  if (process.env.NODE_ENV !== 'production') {
    const now = Date.now();
    const windowMs = 2000;
    const guard = renderGuardRef.current;
    if (now - guard.windowStart > windowMs) {
      guard.windowStart = now;
      guard.count = 0;
    }
    guard.count += 1;

    if (guard.count > 25) {
      console.warn('[DesignCanvas] High render count detected:', {
        count: guard.count,
        windowMs,
        componentsLength: components.length,
        connectionsLength: connections.length,
        selectedComponent,
        challengeId: challenge.id,
        isSynced,
        syncStatus: isSynced ? 'synced' : 'pending',
      });
    }

    if (guard.count > 50) {
      console.error(
        '[DesignCanvas] Infinite render loop detected! Rendered more than 50 times within 2s.',
        {
          renderCount: guard.count,
          challengeId: challenge.id,
          syncStatus: isSynced ? 'synced' : 'pending',
          componentsLength: components.length,
          connectionsLength: connections.length,
          stackTrace: new Error().stack,
        }
      );
      throw new Error('DesignCanvas: Maximum render limit exceeded - possible infinite loop');
    }
  }

  // Initialize state and callbacks
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

  // Create current design data with stable reference
  const currentDesignData: DesignData = useMemo(
    () => ({
      components,
      connections,
      infoCards,
      layers: [],
      metadata: {
        created: initialData.metadata?.created ?? new Date().toISOString(),
        lastModified: initialData.metadata?.lastModified ?? new Date().toISOString(),
        version: '1.0',
      },
    }),
    [components, connections, infoCards, initialData.metadata]
  );

  // Import/Export handlers
  const handleImport = useStableCallback((result: any) => {
    if (result.success && result.data) {
      canvasActions.updateCanvasData({
        components: result.data.components ?? [],
        connections: result.data.connections ?? [],
        infoCards: result.data.infoCards ?? [],
      });

      if (result.canvas) {
        setCanvasConfig(result.canvas);
      }

      canvasActions.setSelectedComponent(null);
      canvasActions.setConnectionStart(null);

      toast.success('Design imported successfully!', {
        description: `Imported ${result.statistics.componentsImported} components and ${result.statistics.connectionsImported} connections`,
      });

      markDesignModified(result.data?.metadata?.lastModified);
    }
  });

  const handleSave = useCallback(() => {
    const snapshot = buildDesignSnapshot(currentDesignData, { updateTimestamp: true });
    void storage.setItem('archicomm-design', JSON.stringify(snapshot));
    toast.success('Design saved locally');
  }, [buildDesignSnapshot, currentDesignData]);

  const handleQuickExport = useCallback(async () => {
    try {
      const filename = challenge?.title ? `${challenge.title}-design` : 'archicomm-design';
      const content = await serializer.exportDesign(currentDesignData, challenge, canvasConfig);
      await DesignSerializer.downloadFile(content, `${filename}.json`, 'application/json');

      toast.success('Design exported successfully!', {
        description: `Saved as ${filename}.json`,
      });
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }, [currentDesignData, challenge, canvasConfig, serializer]);

  const handleQuickSave = useCallback(async () => {
    void storage.setItem('archicomm-design', JSON.stringify(currentDesignData));
    await handleQuickExport();
  }, [currentDesignData, handleQuickExport]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      const content = await serializer.exportDesign(currentDesignData, challenge, canvasConfig);
      await navigator.clipboard.writeText(content);

      toast.success('Design copied to clipboard!', {
        description: 'You can now paste it anywhere',
      });
    } catch (error) {
      toast.error('Copy failed', {
        description: error instanceof Error ? error.message : 'Clipboard not available',
      });
    }
  }, [currentDesignData, challenge, canvasConfig, serializer]);

  const handleImportFromClipboard = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText.trim()) {
        toast.error('Clipboard is empty', {
          description: 'Please copy a design JSON first',
        });
        return;
      }

      const result = await serializer.importDesign(clipboardText, {
        mode: 'replace',
        handleConflicts: 'auto',
        preserveIds: false,
        preservePositions: true,
        validateComponents: true,
        importCanvas: true,
        importAnalytics: true,
      });

      if (result.success) {
        handleImport(result);
      } else {
        toast.error('Import failed', {
          description: result.errors.join('; '),
        });
      }
    } catch (error) {
      toast.error('Import failed', {
        description: error instanceof Error ? error.message : 'Clipboard read failed',
      });
    }
  }, [serializer, handleImport]);

  const handleContinue = useCallback(() => {
    onComplete(currentDesignData);
  }, [currentDesignData, onComplete]);

  // Initialize effects
  useDesignCanvasEffects({
    components,
    connections,
    infoCards,
    currentDesignData,
    handleQuickExport,
    handleQuickSave,
    handleCopyToClipboard,
    handleImportFromClipboard,
  });

  // Create stable callbacks object for ReactFlowCanvas
  const stableCanvasCallbacks = useStableCallbacks({
    onComponentDrop: callbacks.handleComponentDrop,
    onComponentMove: callbacks.handleComponentMove,
    onComponentSelect: callbacks.handleComponentSelect,
    onComponentLabelChange: callbacks.handleComponentLabelChange,
    onConnectionLabelChange: callbacks.handleConnectionLabelChange,
    onConnectionDelete: callbacks.handleConnectionDelete,
    onConnectionTypeChange: callbacks.handleConnectionTypeChange,
    onConnectionVisualStyleChange: callbacks.handleConnectionVisualStyleChange,
    onStartConnection: callbacks.handleStartConnection,
    onCompleteConnection: callbacks.handleCompleteConnection,
    onInfoCardAdd: callbacks.handleInfoCardAdd,
    onInfoCardUpdate: callbacks.handleInfoCardUpdate,
    onInfoCardDelete: callbacks.handleInfoCardDelete,
    onInfoCardColorChange: callbacks.handleInfoCardColorChange,
  });

  // Get extended challenge data
  const extendedChallenge =
    (challengeManager.getChallengeById(challenge.id) as ExtendedChallenge) || challenge;

  // Status bar calculations
  const progress = React.useMemo(
    () => ({
      componentsCount: components.length,
      connectionsCount: connections.length,
      timeElapsed: Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 / 60),
    }),
    [components.length, connections.length, sessionStartTime]
  );

  const challengeTags = React.useMemo((): string[] | undefined => {
    const tags = (extendedChallenge as any)?.tags;
    return Array.isArray(tags) ? (tags as string[]) : undefined;
  }, [extendedChallenge]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className='h-screen flex flex-col'>
        <DesignCanvasHeader
          challenge={challenge}
          showHints={showHints}
          components={components}
          currentDesignData={currentDesignData}
          canvasConfig={canvasConfig}
          onBack={onBack}
          onContinue={handleContinue}
          onToggleHints={() => setShowHints(!showHints)}
          onSave={handleSave}
          onShowCommandPalette={() => setShowCommandPalette(true)}
          onImport={handleImport}
        />

        <div className='flex-1 flex'>
          <ResizablePanel side='left' defaultWidth={320} minWidth={200} maxWidth={500}>
            <AssignmentPanel
              challenge={extendedChallenge}
              progress={progress}
              currentComponents={components}
            />
          </ResizablePanel>

          <div className='flex-1 relative'>
            <ReactFlowCanvas
              components={components}
              connections={connections}
              infoCards={infoCards}
              selectedComponent={selectedComponent}
              connectionStart={connectionStart}
              visualTheme={visualTheme}
              {...stableCanvasCallbacks}
            />

            {showHints && (
              <div className='absolute top-4 right-4 w-80 z-10'>
                <SolutionHints
                  challenge={extendedChallenge}
                  currentComponents={components}
                  onClose={() => setShowHints(false)}
                />
              </div>
            )}
          </div>

          <ResizablePanel side='right' defaultWidth={320} minWidth={250} maxWidth={600}>
            <PropertiesPanel
              selectedComponent={selectedComponent}
              components={components}
              onLabelChange={callbacks.handleComponentLabelChange}
              onDelete={callbacks.handleDeleteComponent}
              onShowLabelToggle={callbacks.handleShowLabelToggle}
              onStickerToggle={callbacks.handleStickerToggle}
              onStickerEmojiChange={callbacks.handleStickerEmojiChange}
              onBgColorChange={callbacks.handleBgColorChange}
              onNodeBgChange={callbacks.handleNodeBgChange}
              challengeTags={challengeTags}
            />
          </ResizablePanel>
        </div>

        <StatusBar
          components={components}
          connections={connections}
          infoCards={infoCards}
          selectedComponentId={selectedComponent}
          sessionStartTime={sessionStartTime}
          currentDesignData={currentDesignData}
        />

        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          currentScreen='design'
          onNavigate={() => {}}
          selectedChallenge={challenge}
        />

        <Confetti show={showConfetti} onDone={() => setShowConfetti(false)} />
      </div>
    </DndProvider>
  );
}