import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toPng } from 'html-to-image';
import { useKeyboardShortcuts } from '../lib/shortcuts/KeyboardShortcuts';
import { Button } from './ui/button';
import { CanvasArea } from './CanvasArea';
import { SolutionHints } from './SolutionHints';
import { Challenge, DesignComponent, Connection, DesignData } from '../App';
import { ExtendedChallenge, challengeManager } from '../lib/challenge-config';
import { ArrowLeft, Save, Download, Image, Lightbulb } from 'lucide-react';
import { SmartTooltip } from './ui/SmartTooltip';

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
  const [commentMode, setCommentMode] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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
    setSelectedComponent(id);
  }, []);

  const handleStartConnection = useCallback((id: string) => {
    setConnectionStart(id);
  }, []);

  const handleCompleteConnection = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    const newConnection: Connection = {
      id: `connection-${Date.now()}`,
      from: fromId,
      to: toId,
      label: 'Connection',
      type: 'data',
      direction: 'end'
    };
    setConnections(prev => [...prev, newConnection]);
    setConnectionStart(null);
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

  const handleConnectionDirectionChange = useCallback((id: string, direction: Connection['direction']) => {
    setConnections(prev => prev.map(conn => 
      conn.id === id ? { ...conn, direction } : conn
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

  const handleExportImage = useCallback(async () => {
    if (!canvasRef.current) return;
    
    try {
      // Temporarily hide UI overlays for clean export
      canvasRef.current.classList.add('export-mode');
      
      // Capture the canvas as PNG
      const dataUrl = await toPng(canvasRef.current, {
        quality: 1.0,
        pixelRatio: 2
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${challenge.id}-design.png`;
      link.click();
      
    } catch (error) {
      console.error('Failed to export image:', error);
    } finally {
      // Restore UI overlays
      if (canvasRef.current) {
        canvasRef.current.classList.remove('export-mode');
      }
    }
  }, [challenge.id]);

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

  // Keyboard shortcuts integration
  useEffect(() => {
    const handleSaveProject = () => {
      handleSave();
    };

    const handleDeleteSelected = () => {
      if (selectedComponent) {
        handleDeleteComponent(selectedComponent);
      }
    };

    const handleAddComponent = () => {
      // Focus on component palette or show component picker
      console.log('Add component shortcut triggered');
    };

    const handleUndo = () => {
      // Placeholder for undo functionality
      console.log('Undo shortcut triggered - not yet implemented');
    };

    const handleRedo = () => {
      // Placeholder for redo functionality  
      console.log('Redo shortcut triggered - not yet implemented');
    };

    const handleNewProject = () => {
      // Reset canvas state
      setComponents([]);
      setConnections([]);
      setSelectedComponent(null);
      setConnectionStart(null);
    };

    // Comment-related event handlers
    const handleAddComment = () => {
      setCommentMode('comment');
    };

    const handleAddNote = () => {
      setCommentMode('note');
    };

    const handleAddLabel = () => {
      setCommentMode('label');
    };

    const handleAddArrow = () => {
      setCommentMode('arrow');
    };

    const handleAddHighlight = () => {
      setCommentMode('highlight');
    };

    // Add event listeners for canvas-specific shortcuts
    window.addEventListener('shortcut:save-project', handleSaveProject);
    window.addEventListener('shortcut:delete-selected', handleDeleteSelected);
    window.addEventListener('shortcut:add-component', handleAddComponent);
    window.addEventListener('shortcut:undo', handleUndo);
    window.addEventListener('shortcut:redo', handleRedo);
    window.addEventListener('shortcut:new-project', handleNewProject);
    
    // Add event listeners for comment-related shortcuts
    window.addEventListener('shortcut:add-comment', handleAddComment);
    window.addEventListener('shortcut:add-note', handleAddNote);
    window.addEventListener('shortcut:add-label', handleAddLabel);
    window.addEventListener('shortcut:add-arrow', handleAddArrow);
    window.addEventListener('shortcut:add-highlight', handleAddHighlight);

    return () => {
      // Cleanup event listeners
      window.removeEventListener('shortcut:save-project', handleSaveProject);
      window.removeEventListener('shortcut:delete-selected', handleDeleteSelected);
      window.removeEventListener('shortcut:add-component', handleAddComponent);
      window.removeEventListener('shortcut:undo', handleUndo);
      window.removeEventListener('shortcut:redo', handleRedo);
      window.removeEventListener('shortcut:new-project', handleNewProject);
      
      // Cleanup comment-related event listeners
      window.removeEventListener('shortcut:add-comment', handleAddComment);
      window.removeEventListener('shortcut:add-note', handleAddNote);
      window.removeEventListener('shortcut:add-label', handleAddLabel);
      window.removeEventListener('shortcut:add-arrow', handleAddArrow);
      window.removeEventListener('shortcut:add-highlight', handleAddHighlight);
    };
  }, [selectedComponent, handleSave, handleDeleteComponent, setComponents, setConnections, setSelectedComponent, setConnectionStart]);

  // Initialize keyboard shortcuts hook
  useKeyboardShortcuts([]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col">
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
              <SmartTooltip content="Save Design" shortcut="Ctrl+S">
                <Button variant="outline" size="icon" onClick={handleSave}>
                  <Save className="w-4 h-4" />
                  <span className="sr-only">Save Design</span>
                </Button>
              </SmartTooltip>
              <SmartTooltip content="Export Design" shortcut="Ctrl+E">
                <Button variant="outline" size="icon" onClick={handleExport}>
                  <Download className="w-4 h-4" />
                  <span className="sr-only">Export Design</span>
                </Button>
              </SmartTooltip>
              <SmartTooltip content="Export as PNG" shortcut="Ctrl+Shift+E">
                <Button variant="outline" size="icon" onClick={handleExportImage}>
                  <Image className="w-4 h-4" />
                  <span className="sr-only">Export as PNG</span>
                </Button>
              </SmartTooltip>
              <Button onClick={handleContinue} disabled={components.length === 0}>
                Continue to Recording
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          <div className="flex-1">
            <CanvasArea
              ref={canvasRef}
              components={components}
              connections={connections}
              selectedComponent={selectedComponent}
              connectionStart={connectionStart}
              commentMode={commentMode}
              isCommentModeActive={!!commentMode}
              onComponentDrop={handleComponentDrop}
              onComponentMove={handleComponentMove}
              onComponentSelect={handleComponentSelect}
              onConnectionLabelChange={handleConnectionLabelChange}
              onConnectionDelete={handleConnectionDelete}
              onConnectionTypeChange={handleConnectionTypeChange}
              onConnectionDirectionChange={handleConnectionDirectionChange}
              onStartConnection={handleStartConnection}
              onCompleteConnection={handleCompleteConnection}
            />
          </div>
          
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
    </DndProvider>
  );
}
