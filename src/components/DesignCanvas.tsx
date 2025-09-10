// src/components/DesignCanvas.tsx
// Main design canvas component for the MVP version
// Provides simplified layout with AssignmentPanel, CanvasArea, and PropertiesPanel
// RELEVANT FILES: CanvasArea.tsx, PropertiesPanel.tsx, AssignmentPanel.tsx, SolutionHints.tsx

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ArrowLeft, Save, Download, Lightbulb } from 'lucide-react';
import { ExtendedChallenge, challengeManager } from '../lib/challenge-config';
import type {
  Connection,
  DesignComponent,
  DesignData,
  Challenge,
} from '../shared/contracts';
import { AssignmentPanel } from './AssignmentPanel';
import { CanvasArea } from './CanvasArea';
import { PropertiesPanel } from './PropertiesPanel';
import { SolutionHints } from './SolutionHints';

interface DesignCanvasProps {
  challenge: Challenge;
  initialData: DesignData;
  onComplete: (data: DesignData) => void;
  onBack: () => void;
}

export function DesignCanvas({ challenge, initialData, onComplete, onBack }: DesignCanvasProps) {
  const [components, setComponents] = useState<DesignComponent[]>(initialData.components);
  const [connections, setConnections] = useState<Connection[]>(initialData.connections);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [sessionStartTime] = useState<Date>(new Date());

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
      label: formatComponentLabel(componentType)
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

  const handleDeleteComponent = useCallback((id: string) => {
    setComponents(prev => prev.filter(comp => comp.id !== id));
    setConnections(prev => prev.filter(conn => conn.from !== id && conn.to !== id));
    setSelectedComponent(null);
  }, []);

  const handleSave = useCallback(() => {
    const designData = { components, connections };
    localStorage.setItem('archicomm-design', JSON.stringify(designData));
  }, [components, connections]);

  const handleExport = useCallback(() => {
    const designData = { components, connections };
    const dataStr = JSON.stringify(designData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${challenge.id}-design.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [components, connections, challenge.id]);

  const handleContinue = useCallback(() => {
    const designData: DesignData = {
      components,
      connections,
      layers: [],
      metadata: {
        created: initialData.metadata?.created || new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0'
      }
    };
    onComplete(designData);
  }, [components, connections, initialData.metadata.created, onComplete]);

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
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExport}
                    className="px-3"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Export Design
                </TooltipContent>
              </Tooltip>
              
              <Button onClick={handleContinue}>
                Continue to Recording
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Assignment Panel - Left Sidebar */}
          <AssignmentPanel 
            challenge={extendedChallenge}
            progress={{
              componentsCount: components.length,
              connectionsCount: connections.length,
              timeElapsed: Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 / 60)
            }}
            currentComponents={components}
          />

          {/* Canvas Area - Center */}
          <div className="flex-1 relative">
            <CanvasArea
              components={components}
              connections={connections}
              layers={[]}
              activeLayerId={null}
              selectedComponent={selectedComponent}
              connectionStart={connectionStart}
              onComponentDrop={handleComponentDrop}
              onComponentMove={handleComponentMove}
              onComponentSelect={handleComponentSelect}
              onConnectionLabelChange={handleConnectionLabelChange}
              onConnectionDelete={handleConnectionDelete}
              onConnectionTypeChange={handleConnectionTypeChange}
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
          <PropertiesPanel 
            selectedComponent={selectedComponent}
            components={components}
            onLabelChange={handleComponentLabelChange}
            onDelete={handleDeleteComponent}
          />
        </div>
      </div>
    </DndProvider>
    </TooltipProvider>
  );
}