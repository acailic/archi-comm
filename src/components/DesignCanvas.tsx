// src/components/DesignCanvas.tsx
// Main design canvas component for the MVP version
// Provides simplified layout with AssignmentPanel, CanvasArea, and PropertiesPanel
// RELEVANT FILES: CanvasArea.tsx, PropertiesPanel.tsx, AssignmentPanel.tsx, SolutionHints.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ArrowLeft, Save, Download, Lightbulb, Search, Activity, Clock, Zap, Upload } from 'lucide-react';
import { ExtendedChallenge, challengeManager } from '../lib/challenge-config';
import type {
  Connection,
  DesignComponent,
  DesignData,
  Challenge,
  InfoCard,
} from '../shared/contracts';
import { ReactFlowCanvas } from '../features/canvas/components/ReactFlowCanvas';
import { AssignmentPanel } from './AssignmentPanel';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { PropertiesPanel } from './PropertiesPanel';
import { SolutionHints } from './SolutionHints';
import { CommandPalette } from './CommandPalette';
import { ResizablePanel } from './ui/ResizablePanel';
import { storage } from '@/services/storage';
import { ImportExportDropdown, useImportExportShortcuts } from './ImportExportDropdown';
import { DesignSerializer } from '@/lib/import-export/DesignSerializer';
import type { CanvasConfig } from '@/lib/import-export/types';
import { toast } from 'sonner';

interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
}

export function DesignCanvas({ challenge, initialData, onComplete, onBack }: DesignCanvasProps) {
  const [components, setComponents] = useState<DesignComponent[]>(initialData.components);
  const [connections, setConnections] = useState<Connection[]>(initialData.connections);
  const [infoCards, setInfoCards] = useState<InfoCard[]>(initialData.infoCards || []);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [sessionStartTime] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [canvasConfig, setCanvasConfig] = useState<CanvasConfig>({
    viewport: { x: 0, y: 0, zoom: 1 },
    gridConfig: {
      visible: true,
      spacing: 20,
      snapToGrid: false,
      style: 'dots',
    },
    theme: 'light',
    virtualizationEnabled: false,
  });

  // Initialize design serializer with session timing
  const serializer = React.useMemo(() => {
    const s = new DesignSerializer();
    s.setSessionStartTime(sessionStartTime);
    return s;
  }, [sessionStartTime]);

  // Update current time every second for status bar
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Get extended challenge data
  const extendedChallenge = challengeManager.getChallengeById(challenge.id) as ExtendedChallenge || challenge;

  // Create better component labels
  const formatComponentLabel = useCallback((componentType: string): string => {
    const labelMap: Record<string, string> = {
      'api-gateway': 'API Gateway',
      'load-balancer': 'Load Balancer',
      'microservice': 'Microservice',
      'database': 'Database',
      'cache': 'Cache',
      'message-queue': 'Message Queue',
      'cdn': 'CDN',
      'monitoring': 'Monitoring',
      'authentication': 'Auth Service',
      'graphql': 'GraphQL API',
      'cors': 'CORS Proxy',
      'server': 'Web Server',
      'client': 'Client App',
      'storage': 'File Storage',
      'analytics': 'Analytics',
      'search': 'Search Engine',
      'notification': 'Notifications',
      'payment': 'Payment Gateway',
      'user-service': 'User Service',
      'order-service': 'Order Service',
      'inventory-service': 'Inventory Service'
    };
    
    return labelMap[componentType] || componentType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }, []);

  const handleComponentDrop = useCallback((componentType: DesignComponent['type'], x: number, y: number) => {
    const newComponent: DesignComponent = {
      id: `${componentType}-${Date.now()}`,
      type: componentType,
      x,
      y,
      // Start with empty label; user can edit inline on canvas
      label: '',
      properties: { showLabel: true }
    };
    setComponents(prev => [...prev, newComponent]);
  }, []);

  const handleComponentMove = useCallback((id: string, x: number, y: number) => {
    setComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, x, y } : comp
    ));
  }, []);

  const handleComponentSelect = useCallback((id: string) => {
    setSelectedComponent(id);
  }, []);

  const handleComponentLabelChange = useCallback((id: string, label: string) => {
    setComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, label } : comp
    ));
  }, []);

  const handleConnectionLabelChange = useCallback((id: string, label: string) => {
    setConnections(prev => prev.map(conn => 
      conn.id === id ? { ...conn, label } : conn
    ));
  }, []);

  const handleConnectionDelete = useCallback((id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id));
  }, []);

  const handleConnectionTypeChange = useCallback((id: string, type: Connection['type']) => {
    setConnections(prev => prev.map(conn =>
      conn.id === id ? { ...conn, type } : conn
    ));
  }, []);

  const handleConnectionVisualStyleChange = useCallback((id: string, visualStyle: Connection['visualStyle']) => {
    setConnections(prev => prev.map(conn =>
      conn.id === id ? { ...conn, visualStyle } : conn
    ));
  }, []);

  const handleDeleteComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
    setConnections(prev => prev.filter(conn => conn.from !== id && conn.to !== id));
    setSelectedComponent(null);
  }, []);

  const handleShowLabelToggle = useCallback((id: string, visible: boolean) => {
    setComponents(prev => prev.map(comp => 
      comp.id === id 
        ? { ...comp, properties: { ...comp.properties, showLabel: visible } } 
        : comp
    ));
  }, []);

  const handleInfoCardAdd = useCallback((x: number, y: number) => {
    const newInfoCard: InfoCard = {
      id: `info-card-${Date.now()}`,
      x,
      y,
      content: '',
      color: 'yellow',
      isEditing: true
    };
    setInfoCards(prev => [...prev, newInfoCard]);
  }, []);

  const handleInfoCardUpdate = useCallback((id: string, content: string) => {
    setInfoCards(prev => prev.map(card => 
      card.id === id ? { ...card, content, isEditing: false } : card
    ));
  }, []);

  const handleInfoCardDelete = useCallback((id: string) => {
    setInfoCards(prev => prev.filter(card => card.id !== id));
  }, []);

  const handleInfoCardColorChange = useCallback((id: string, color: string) => {
    setInfoCards(prev => prev.map(card => 
      card.id === id ? { ...card, color: color as InfoCard['color'] } : card
    ));
  }, []);

  // Create current design data
  const currentDesignData: DesignData = React.useMemo(() => ({
    components,
    connections,
    infoCards,
    layers: [],
    metadata: {
      created: initialData.metadata?.created || new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: '1.0'
    }
  }), [components, connections, infoCards, initialData.metadata?.created]);

  // Handle import result (doesn't depend on currentDesignData)
  const handleImport = useCallback((result: any) => {
    if (result.success && result.data) {
      setComponents(result.data.components || []);
      setConnections(result.data.connections || []);
      setInfoCards(result.data.infoCards || []);

      // Update canvas config if imported
      if (result.canvas) {
        setCanvasConfig(result.canvas);
      }

      // Reset selections
      setSelectedComponent(null);
      setConnectionStart(null);

      toast.success('Design imported successfully!', {
        description: `Imported ${result.statistics.componentsImported} components and ${result.statistics.connectionsImported} connections`,
      });
    }
  }, []);

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

  const handleSave = useCallback(() => {
    void storage.setItem('archicomm-design', JSON.stringify(currentDesignData));
    toast.success('Design saved locally');
  }, [currentDesignData]);

  // Quick export handler
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
    // Save to local storage
    void storage.setItem('archicomm-design', JSON.stringify(currentDesignData));

    // Also trigger quick export
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

  const handleContinue = useCallback(() => {
    onComplete(currentDesignData);
  }, [currentDesignData, onComplete]);

  // Status bar calculations
  const timeElapsed = Math.floor((currentTime.getTime() - sessionStartTime.getTime()) / 1000 / 60);
  const componentTypes = Array.from(new Set(components.map(c => c.type))).length;
  const selectedComponentData = selectedComponent ? components.find(c => c.id === selectedComponent) : null;

  // Setup keyboard shortcuts for import/export
  useImportExportShortcuts({
    onQuickExport: handleQuickExport,
    onQuickSave: handleQuickSave,
    onImport: () => {}, // Will trigger modal from dropdown
    onCopyToClipboard: handleCopyToClipboard,
    onImportFromClipboard: handleImportFromClipboard,
  });

  return (
    <TooltipProvider>
      <DndProvider backend={HTML5Backend}>
        <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onBack}
                    className="px-3"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Back to Challenge Selection
                </TooltipContent>
              </Tooltip>
              <div>
                <h2 className="font-semibold">{challenge.title}</h2>
                <p className="text-sm text-muted-foreground">Design your system architecture</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCommandPalette(true)}
                    className="px-3"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Search Actions
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowHints(!showHints)}
                    className="bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 px-3"
                  >
                    <Lightbulb className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showHints ? 'Hide Hints' : 'Show Hints'}
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSave}
                    className="px-3"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Save Design
                </TooltipContent>
              </Tooltip>

              <ImportExportDropdown
                designData={currentDesignData}
                challenge={challenge}
                canvasConfig={canvasConfig}
                onImport={handleImport}
              />
              
              <Button onClick={handleContinue} disabled={components.length === 0}>
                Continue to Recording
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Assignment Panel - Left Sidebar */}
          <ResizablePanel 
            side="left"
            defaultWidth={320}
            minWidth={200}
            maxWidth={500}
          >
            <AssignmentPanel 
              challenge={extendedChallenge}
              progress={{
                componentsCount: components.length,
                connectionsCount: connections.length,
                timeElapsed: Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 / 60)
              }}
              currentComponents={components}
            />
          </ResizablePanel>

          {/* Canvas Area - Center */}
          <div className="flex-1 relative">
          <ReactFlowCanvas
            components={components}
            connections={connections}
            infoCards={infoCards}
            selectedComponent={selectedComponent}
            connectionStart={connectionStart}
            onComponentDrop={handleComponentDrop}
            onComponentMove={handleComponentMove}
            onComponentSelect={handleComponentSelect}
            onComponentLabelChange={handleComponentLabelChange}
            onConnectionLabelChange={handleConnectionLabelChange}
            onConnectionDelete={handleConnectionDelete}
            onConnectionTypeChange={handleConnectionTypeChange}
            onConnectionVisualStyleChange={handleConnectionVisualStyleChange}
            onStartConnection={(id: string) => setConnectionStart(id)}
            onCompleteConnection={(fromId: string, toId: string) => {
                if (fromId !== toId) {
                  const newConnection = {
                    id: `connection-${Date.now()}`,
                    from: fromId,
                    to: toId,
                    label: 'Connection',
                    type: 'data' as const
                  };
                  setConnections(prev => [...prev, newConnection]);
                }
                setConnectionStart(null);
              }}
              onInfoCardAdd={handleInfoCardAdd}
              onInfoCardUpdate={handleInfoCardUpdate}
              onInfoCardDelete={handleInfoCardDelete}
              onInfoCardColorChange={handleInfoCardColorChange}
            />
            
            {/* Solution Hints Overlay */}
            {showHints && (
              <div className="absolute top-4 right-4 w-80 z-10">
                <SolutionHints 
                  challenge={extendedChallenge}
                  currentComponents={components}
                  onClose={() => setShowHints(false)}
                />
              </div>
            )}
          </div>

          {/* Properties Panel - Right Sidebar */}
          <ResizablePanel 
            side="right"
            defaultWidth={320}
            minWidth={250}
            maxWidth={600}
          >
            <PropertiesPanel 
              selectedComponent={selectedComponent}
              components={components}
              onLabelChange={handleComponentLabelChange}
              onDelete={handleDeleteComponent}
              onShowLabelToggle={handleShowLabelToggle}
              challengeTags={Array.isArray((extendedChallenge as any)?.tags) ? (extendedChallenge as any).tags : undefined}
            />
          </ResizablePanel>
        </div>

        {/* Status Bar */}
        <div className="border-t bg-card/30 backdrop-blur-sm p-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>{components.length} Components</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{connections.length} Connections</span>
            </div>
            {infoCards.length > 0 && (
              <div className="flex items-center gap-1">
                <span>{infoCards.length} Comments</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span>{componentTypes} Types</span>
            </div>
            {selectedComponentData && (
              <div className="flex items-center gap-1 text-primary">
                <span>Selected: {selectedComponentData.label}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{timeElapsed}m elapsed</span>
            </div>
            <div className="text-xs">
              {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Command Palette */}
        <CommandPalette 
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
        />
      </div>
    </DndProvider>
    </TooltipProvider>
  );
}
