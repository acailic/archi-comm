import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ComponentPalette } from './ComponentPalette';
import { CanvasArea } from './CanvasArea';
import { SolutionHints } from './SolutionHints';
import { Challenge, DesignComponent, Connection, DesignData } from '../App';
import { ExtendedChallenge, challengeManager } from '../lib/challenge-config';
import { ArrowLeft, Save, Download, Lightbulb } from 'lucide-react';

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
  const [connectionMode, setConnectionMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [sessionStartTime] = useState<Date>(new Date());
  const [designProgress, setDesignProgress] = useState({
    componentsCount: 0,
    connectionsCount: 0,
    timeElapsed: 0
  });

  // Get extended challenge data
  const extendedChallenge = challengeManager.getChallengeById(challenge.id) as ExtendedChallenge || challenge;

  const handleComponentDrop = useCallback((componentType: DesignComponent['type'], x: number, y: number) => {
    const newComponent: DesignComponent = {
      id: `${componentType}-${Date.now()}`,
      type: componentType,
      x,
      y,
      label: componentType.charAt(0).toUpperCase() + componentType.slice(1).replace('-', ' ')
    };
    setComponents(prev => [...prev, newComponent]);
  }, []);

  const handleComponentMove = useCallback((id: string, x: number, y: number) => {
    setComponents(prev => prev.map(comp => 
      comp.id === id ? { ...comp, x, y } : comp
    ));
  }, []);

  const handleComponentSelect = useCallback((id: string) => {
    if (connectionMode) {
      if (!connectionStart) {
        setConnectionStart(id);
      } else if (connectionStart !== id) {
        const newConnection: Connection = {
          id: `connection-${Date.now()}`,
          from: connectionStart,
          to: id,
          label: 'Connection',
          type: 'data'
        };
        setConnections(prev => [...prev, newConnection]);
        setConnectionStart(null);
        setConnectionMode(false);
      }
    } else {
      setSelectedComponent(id);
    }
  }, [connectionMode, connectionStart]);

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
    link.click();
    URL.revokeObjectURL(url);
  }, [components, connections, challenge.id]);

  const handleContinue = useCallback(() => {
    const designData: DesignData = {
      components,
      connections,
      metadata: {
        created: initialData.metadata.created,
        lastModified: new Date().toISOString(),
        version: '1.0'
      }
    };
    onComplete(designData);
  }, [components, connections, initialData.metadata.created, onComplete]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h2>{challenge.title}</h2>
                <p className="text-sm text-muted-foreground">{challenge.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowHints(!showHints)}
                className="bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700"
              >
                <Lightbulb className="w-4 h-4 mr-2" />
                {showHints ? 'Hide Hints' : 'Show Hints'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleContinue} disabled={components.length === 0}>
                Continue to Recording
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Component Palette & Tools Sidebar */}
          <div className="w-80 border-r bg-card/30 backdrop-blur-sm flex flex-col">
            {/* Component Library */}
            <div className="flex-1 p-4">
              <ComponentPalette />
            </div>
            
            {/* Tools Section */}
            <div className="border-t border-border/30 p-4 space-y-4">
              {/* Connection Controls */}
              <Card className="bg-card/50 backdrop-blur-sm border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    Connections
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button
                    variant={connectionMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setConnectionMode(!connectionMode);
                      setConnectionStart(null);
                    }}
                    className="w-full"
                  >
                    {connectionMode ? 'Cancel Connection' : 'Add Connection'}
                  </Button>
                  {connectionMode && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Click two components to connect them
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Selected Component Properties */}
              {selectedComponent && (
                <Card className="bg-card/50 backdrop-blur-sm border-border/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent"></div>
                      Properties
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {(() => {
                      const component = components.find(c => c.id === selectedComponent);
                      if (!component) return null;
                      
                      return (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium block mb-1">Label</label>
                            <Input
                              value={component.label}
                              onChange={(e) => handleComponentLabelChange(component.id, e.target.value)}
                              size="sm"
                              className="text-xs"
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteComponent(component.id)}
                            className="w-full text-xs"
                          >
                            Delete Component
                          </Button>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 flex">
            <div className="flex-1">
              <CanvasArea
                components={components}
                connections={connections}
                selectedComponent={selectedComponent}
                connectionStart={connectionStart}
                onComponentDrop={handleComponentDrop}
                onComponentMove={handleComponentMove}
                onComponentSelect={handleComponentSelect}
                onConnectionLabelChange={handleConnectionLabelChange}
                onConnectionDelete={handleConnectionDelete}
                onConnectionTypeChange={handleConnectionTypeChange}
              />
            </div>
            
            {/* Solution Hints Panel */}
            {showHints && (
              <div className="w-80 border-l bg-card/30 backdrop-blur-sm">
                <SolutionHints 
                  challenge={extendedChallenge}
                  currentComponents={components}
                  onClose={() => setShowHints(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}