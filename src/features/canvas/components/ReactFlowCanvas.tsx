// src/features/canvas/components/ReactFlowCanvas.tsx
// React Flow-based canvas component that replaces CanvasArea.tsx
// Maintains the same props interface for drop-in compatibility and includes optional virtualization support

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  Connection as ReactFlowConnection,
  Viewport,
} from '@xyflow/react';
import { useDrop } from 'react-dnd';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { MessageSquare } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import type { Connection, DesignComponent, InfoCard, VisualStyle } from '../../../shared/contracts';
import { useConnectionEditor } from '../hooks/useConnectionEditor';
import { toReactFlowEdges } from '../utils/rf-adapters';
import { computeLayout } from '../utils/auto-layout';
import type { VirtualizationConfig, VirtualizationStats } from '../utils/virtualization';
import { ConnectionEditorPopover } from './ConnectionEditorPopover';
import { CustomEdge } from './CustomEdge';
import { CustomNode } from './CustomNode';
import { InfoCard as InfoCardComponent } from './InfoCard';
import { EnhancedMiniMap } from './EnhancedMiniMap';

// Virtualization imports
import { VirtualCanvas } from './VirtualCanvas';
// import { CanvasPerformanceManager } from '../../../lib/performance/CanvasPerformanceManager';

export interface ReactFlowCanvasProps {
  components: DesignComponent[];
  connections: Connection[];
  infoCards?: InfoCard[];
  selectedComponent: string | null;
  connectionStart: string | null;
  onComponentDrop: (type: DesignComponent['type'], x: number, y: number) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentSelect: (id: string) => void;
  onComponentLabelChange?: (id: string, label: string) => void;
  onConnectionLabelChange: (id: string, label: string) => void;
  onConnectionDelete?: (id: string) => void;
  onConnectionTypeChange?: (id: string, type: Connection['type']) => void;
  onConnectionVisualStyleChange?: (id: string, visualStyle: VisualStyle) => void;
  onStartConnection: (id: string) => void;
  onCompleteConnection: (fromId: string, toId: string) => void;
  onInfoCardAdd?: (x: number, y: number) => void;
  onInfoCardUpdate?: (id: string, content: string) => void;
  onInfoCardDelete?: (id: string) => void;
  onInfoCardColorChange?: (id: string, color: string) => void;
  gridStyle?: 'dots' | 'lines';
  snapToGrid?: boolean;
  gridSpacing?: number;
  showConnectors?: boolean;
  // Optional auto-layout options
  autoLayout?: boolean;
  layoutDirection?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
  // Virtualization options
  virtualization?: Partial<VirtualizationConfig>;
  enableSpatialIndex?: boolean;
  maxVisibleComponents?: number;
  onVirtualizationStats?: (stats: VirtualizationStats) => void;
}




// Internal component that uses React Flow hooks
function ReactFlowCanvasInternal({
  components,
  connections,
  infoCards = [],
  selectedComponent,
  connectionStart,
  onComponentDrop,
  onComponentMove,
  onComponentSelect,
  onComponentLabelChange,
  onConnectionLabelChange,
  onConnectionDelete,
  onConnectionTypeChange,
  onConnectionVisualStyleChange,
  onStartConnection,
  onCompleteConnection,
  onInfoCardAdd,
  onInfoCardUpdate,
  onInfoCardDelete,
  onInfoCardColorChange,
  gridStyle = 'dots',
  snapToGrid = false,
  gridSpacing = 20,
  showConnectors = true,
  autoLayout = false,
  layoutDirection = 'RIGHT',
  virtualization,
  enableSpatialIndex = false,
  maxVisibleComponents = 1000,
  onVirtualizationStats,
  // Comment 3: Props for lifted state
  viewport,
  onViewportChange,
  virtualizationEnabled,
  onVirtualizationToggle,
  virtualizationStats,
  onVirtualizationStatsChange,
}: ReactFlowCanvasProps & {
  // Additional props for lifted state
  viewport: Viewport | undefined;
  onViewportChange: (viewport: Viewport) => void;
  virtualizationEnabled: boolean;
  onVirtualizationToggle: (enabled: boolean) => void;
  virtualizationStats: VirtualizationStats | undefined;
  onVirtualizationStatsChange: (stats: VirtualizationStats) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const [layoutPositions, setLayoutPositions] = useState<Record<string, { x: number; y: number }>>(
    {}
  );

  // Calculate canvas size for enhanced minimap
  const canvasSize = useMemo(() => {
    if (components.length === 0) {
      return { width: 1000, height: 600 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    components.forEach(component => {
      const x = component.x;
      const y = component.y;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 200); // Component width
      maxY = Math.max(maxY, y + 120); // Component height
    });

    return {
      width: Math.max(1000, maxX - minX + 400), // Add padding
      height: Math.max(600, maxY - minY + 300),
    };
  }, [components]);

  // Memoize stringified versions of components and connections to stabilize useEffect dependencies
  const componentsStr = useMemo(() => JSON.stringify(components), [components]);
  const connectionsStr = useMemo(() => JSON.stringify(connections), [connections]);

  // Extract virtualization properties to avoid unnecessary re-renders due to object reference changes
  const virtualizationBufferZone = virtualization?.bufferZone;
  const virtualizationMaxVisibleItems = virtualization?.maxVisibleItems;
  const virtualizationEnablePerformanceMonitoring = virtualization?.enablePerformanceMonitoring;
  const virtualizationDebugMode = virtualization?.debugMode;

  // Merged virtualization configuration with stable dependencies (Comment 1)
  // Dependencies are individual primitive values to prevent unnecessary recomputations
  // when the virtualization object reference changes but values remain the same
  const virtualizationConfig = useMemo(
    () => ({
      bufferZone: virtualizationBufferZone ?? 200,
      maxVisibleItems: virtualizationMaxVisibleItems ?? maxVisibleComponents,
      enableSpatialIndex,
      enablePerformanceMonitoring: virtualizationEnablePerformanceMonitoring ?? true,
      debugMode: virtualizationDebugMode ?? process.env.NODE_ENV === 'development',
      enabled: virtualizationEnabled, // Explicitly set enabled to ensure toggle takes precedence
    }),
    [
      // Stable dependencies: primitive values extracted from virtualization object
      virtualizationBufferZone,
      virtualizationMaxVisibleItems,
      virtualizationEnablePerformanceMonitoring,
      virtualizationDebugMode,
      // Other stable primitive dependencies
      virtualizationEnabled,
      maxVisibleComponents,
      enableSpatialIndex,
    ]
  );

  // Convert domain objects to React Flow format with proper CustomNode data
  const createEnhancedNodes = useCallback(
    (components: DesignComponent[]) => {
      return components.map(component => {
        const pos = layoutPositions[component.id] ?? { x: component.x, y: component.y };
        return {
          id: component.id,
          type: 'custom',
          position: { x: pos.x, y: pos.y },
          data: {
            component,
            isSelected: selectedComponent === component.id,
            isConnectionStart: connectionStart === component.id,
            onSelect: onComponentSelect,
            onStartConnection: (id: string, _position?: 'top' | 'bottom' | 'left' | 'right') =>
              onStartConnection(id),
            onLabelChange: onComponentLabelChange || (() => {}),
          },
          draggable: true,
          selectable: true,
          deletable: true,
        };
      });
    },
    [
      layoutPositions,
      selectedComponent,
      connectionStart,
      onComponentSelect,
      onStartConnection,
      onComponentLabelChange,
    ]
  );

  // Convert info cards to React Flow nodes
  const createInfoCardNodes = useCallback(
    (infoCards: InfoCard[]) => {
      return infoCards.map(infoCard => ({
        id: infoCard.id,
        type: 'infoCard',
        position: { x: infoCard.x, y: infoCard.y },
        data: {
          id: infoCard.id,
          content: infoCard.content,
          color: infoCard.color || 'yellow',
          isEditing: infoCard.isEditing ?? false,
          onContentChange: onInfoCardUpdate || (() => {}),
          onDelete: onInfoCardDelete || (() => {}),
          onStartEdit: (id: string) => {
            // Handle start edit - could be used to track editing state
          },
          onFinishEdit: (id: string) => {
            // Handle finish edit - could be used to track editing state
          },
          onColorChange: onInfoCardColorChange || (() => {}),
        },
        draggable: true,
        selectable: true,
        deletable: true,
      }));
    },
    [onInfoCardUpdate, onInfoCardDelete, onInfoCardColorChange]
  );

  // Memoize initial nodes using only direct inputs to reduce unnecessary recalculations
  const initialNodes = useMemo(
    () => [...createEnhancedNodes(components), ...createInfoCardNodes(infoCards)],
    [
      // Inputs for enhanced component nodes
      components,
      layoutPositions,
      selectedComponent,
      connectionStart,
      onComponentSelect,
      onStartConnection,
      onComponentLabelChange,
      // Inputs for info card nodes
      infoCards,
      onInfoCardUpdate,
      onInfoCardDelete,
      onInfoCardColorChange,
    ]
  );
  // Initial edges will be set after useConnectionEditor hook

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Sync external data changes with React Flow state
  // Keep ReactFlow state in sync with external data; depend on the same direct inputs
  const syncedNodes = useMemo(
    () => [...createEnhancedNodes(components), ...createInfoCardNodes(infoCards)],
    [
      components,
      layoutPositions,
      selectedComponent,
      connectionStart,
      onComponentSelect,
      onStartConnection,
      onComponentLabelChange,
      infoCards,
      onInfoCardUpdate,
      onInfoCardDelete,
      onInfoCardColorChange,
    ]
  );
  // syncedEdges will be defined after useConnectionEditor hook

  // Update React Flow state when external data changes
  useEffect(() => {
    setNodes(syncedNodes);
  }, [syncedNodes, setNodes]);

  // useEffect for edges will be defined after useConnectionEditor hook

  // Compute ELK auto-layout positions when enabled
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!autoLayout) {
        setLayoutPositions({});
        return;
      }
      const map = await computeLayout(components, connections, { direction: layoutDirection });
      if (!cancelled) {
        setLayoutPositions(map);
        try {
          reactFlowInstance?.fitView?.({ padding: 0.2 });
        } catch (error) {
          // Log details to avoid silent failures and aid debugging
          console.error('ReactFlowCanvas: failed to fit view after auto-layout', {
            error,
            autoLayout,
            layoutDirection,
            nodeCount: components?.length,
            edgeCount: connections?.length,
          });
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [autoLayout, layoutDirection, componentsStr, connectionsStr, reactFlowInstance]);

  // Drag and drop setup
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'component',
      drop: (item: { type: DesignComponent['type'] }, monitor) => {
        if (!canvasRef.current || !reactFlowInstance) {
          console.warn('Missing canvasRef or reactFlowInstance');
          return;
        }

        const offset = monitor.getClientOffset();
        const canvasRect = canvasRef.current.getBoundingClientRect();

        if (offset) {
          // Convert screen coordinates to React Flow coordinates
          const localPoint = { x: offset.x - canvasRect.left, y: offset.y - canvasRect.top };
          const position = reactFlowInstance?.screenToFlowPosition
            ? reactFlowInstance.screenToFlowPosition(localPoint)
            : null;
          if (position) {
            onComponentDrop(item.type, position.x, position.y);
          }
        }
      },
      collect: monitor => ({
        isOver: monitor.isOver(),
      }),
    }),
    [onComponentDrop, reactFlowInstance]
  );

  // Create ref callback that properly integrates with useDrop
  const setCanvasRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (canvasRef.current !== node) {
        (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
      if (node) {
        drop(node);
      }
    },
    [drop]
  );

  // Connection editor setup
  const {
    selectedConnection,
    popoverPosition,
    handleConnectionSelect,
    handleConnectionUpdate,
    closeEditor,
  } = useConnectionEditor({
    connections,
    onConnectionLabelChange,
    onConnectionTypeChange: onConnectionTypeChange ?? (() => {}),
    onConnectionVisualStyleChange: onConnectionVisualStyleChange,
    onConnectionDelete: onConnectionDelete ?? (() => {}),
  });

  // Convert connections to React Flow edges with proper CustomEdge data
  const createEnhancedEdges = useCallback(
    (connections: Connection[]) => {
      return toReactFlowEdges(connections).map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          // connectionStyle is now set automatically based on connection.type in toReactFlowEdges
          isSelected: selectedConnection?.id === edge.id,
          onConnectionSelect: handleConnectionSelect,
        },
      }));
    },
    [selectedConnection, handleConnectionSelect]
  );

  const syncedEdges = useMemo(() => createEnhancedEdges(connections), [createEnhancedEdges, connections]);

  // Update React Flow edges when external data changes
  useEffect(() => {
    setEdges(syncedEdges);
  }, [syncedEdges, setEdges]);

  // Handle React Flow node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const typedChanges = changes.filter(c => c.type === 'position' || c.type === 'remove');
      onNodesChange(typedChanges);
      // Note: position updates are handled on drag stop to avoid duplicates
    },
    [onNodesChange]
  );

  // Handle React Flow edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const typedChanges = changes.filter(c => c.type === 'remove');
      onEdgesChange(typedChanges);

      // Handle edge deletions
      for (const change of changes) {
        if (change.type === 'remove' && onConnectionDelete) {
          onConnectionDelete(change.id);
        }
      }
    },
    [onEdgesChange, onConnectionDelete]
  );

  // Handle new connections
  const handleConnect = useCallback(
    (connection: ReactFlowConnection) => {
      if (connection.source && connection.target) {
        onCompleteConnection(connection.source, connection.target);
      }
    },
    [onCompleteConnection]
  );

  // Handle node selection
  const handleSelectionChange = useCallback(
    (params: { nodes: Node[] }) => {
      const { nodes: selectedNodes } = params;
      if (selectedNodes.length > 0) {
        onComponentSelect(selectedNodes[0].id);
      } else if (selectedComponent) {
        // Clear selection if no nodes are selected
        onComponentSelect('');
      }
    },
    [onComponentSelect, selectedComponent]
  );

  // Handle edge clicks for connection editing
  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();

      // Find the corresponding connection
      const connection = connections.find(conn => conn.id === edge.id);
      if (connection) {
        // Calculate position for the popover
        const edgeElement = event.target as SVGElement;
        const rect = edgeElement.getBoundingClientRect();
        const canvasRect = canvasRef.current?.getBoundingClientRect();

        if (canvasRect) {
          const x = rect.left + rect.width / 2 - canvasRect.left;
          const y = rect.top + rect.height / 2 - canvasRect.top;
          handleConnectionSelect(connection.id, x, y);
        }
      }
    },
    [connections, handleConnectionSelect]
  );

  // Handle right-click context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();

    // Only show context menu if right-clicking on empty canvas
    const target = event.target as HTMLElement;
    if (
      target.classList.contains('react-flow__pane') ||
      target.classList.contains('react-flow__renderer')
    ) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        setContextMenu({
          x: event.clientX - canvasRect.left,
          y: event.clientY - canvasRect.top,
        });
      }
    }
  }, []);

  const handleAddInfoCard = useCallback(() => {
    if (contextMenu && onInfoCardAdd && reactFlowInstance?.screenToFlowPosition) {
      // Context menu coordinates are already relative to canvas
      const position = reactFlowInstance.screenToFlowPosition({
        x: contextMenu.x,
        y: contextMenu.y,
      });
      onInfoCardAdd(position.x, position.y);
    }
    setContextMenu(null);
  }, [contextMenu, onInfoCardAdd, reactFlowInstance]);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Enhanced minimap handlers
  const handleMinimapZoomChange = useCallback(
    (zoom: number, centerX?: number, centerY?: number) => {
      if (!reactFlowInstance) return;
      if (centerX != null && centerY != null) {
        reactFlowInstance.setCenter(centerX, centerY, { zoom });
      } else {
        const current = reactFlowInstance.getViewport();
        reactFlowInstance.setViewport({ ...current, zoom });
      }
      onViewportChange(reactFlowInstance.getViewport());
    },
    [reactFlowInstance, onViewportChange]
  );

  const handleMinimapPanTo = useCallback(
    (x: number, y: number) => {
      if (!reactFlowInstance) return;
      reactFlowInstance.setCenter(x, y);
      onViewportChange(reactFlowInstance.getViewport());
    },
    [reactFlowInstance, onViewportChange]
  );

  // No longer needed - CustomEdge handles styling internally based on connectionStyle


  // Background pattern based on grid style
  const backgroundVariant = gridStyle === 'dots' ? 'dots' : 'lines';

  // Conditional rendering: use VirtualCanvas if virtualization is enabled
  if (virtualizationEnabled) {
    return (
      <VirtualCanvas
        {...{
          components,
          connections,
          infoCards,
          selectedComponent,
          connectionStart,
          onComponentDrop,
          onComponentMove,
          onComponentSelect,
          onComponentLabelChange,
          onConnectionLabelChange,
          onConnectionDelete,
          onConnectionTypeChange,
          onStartConnection,
          onCompleteConnection,
          onInfoCardAdd,
          onInfoCardUpdate,
          onInfoCardDelete,
          onInfoCardColorChange,
          gridStyle,
          snapToGrid,
          gridSpacing,
          showConnectors,
          autoLayout,
          layoutDirection,
        }}
        virtualizationConfig={virtualizationConfig}
        onVirtualizationStatsChange={onVirtualizationStatsChange}
        // Pass down lifted state
        viewport={viewport}
        onViewportChange={onViewportChange}
      />
    );
  }

  // Default non-virtualized rendering
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setCanvasRef}
          className='relative w-full h-full bg-muted/10'
          data-testid='canvas-root'
          style={{ height: '100%' }}
        >
          {/* Drop zone indicator */}
          {isOver && (
            <div className='absolute inset-0 bg-primary/5 border-2 border-dashed border-primary/30 flex items-center justify-center pointer-events-none z-50'>
              <div className='bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border'>
                <p className='text-sm font-medium'>Drop component here</p>
              </div>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onSelectionChange={handleSelectionChange}
            onEdgeClick={handleEdgeClick}
            onNodeDragStop={(_, node) => onComponentMove(node.id, node.position.x, node.position.y)}
            onNodeClick={(_, node) => onComponentSelect(node.id)}
            onPaneContextMenu={handleContextMenu}
            nodeTypes={{
              custom: CustomNode,
              infoCard: InfoCardComponent,
            }}
            edgeTypes={{
              custom: CustomEdge,
            }}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            fitView
            snapToGrid={snapToGrid}
            snapGrid={[gridSpacing, gridSpacing]}
            defaultViewport={viewport} // Use lifted state
            onMove={(_, vp) => onViewportChange(vp)} // Update lifted state
            minZoom={0.1}
            maxZoom={2}
            attributionPosition='bottom-left'
            proOptions={{ hideAttribution: true }}
            className='archicomm-reactflow'
            data-testid='reactflow-canvas'
          >

            {/* Background grid */}
            <Background
              variant={
                backgroundVariant === 'dots' ? BackgroundVariant.Dots : BackgroundVariant.Lines
              }
              gap={gridSpacing}
              size={1}
              color='hsl(var(--border))'
            />

            {/* Controls */}
            <Controls
              position='bottom-right'
              showZoom={true}
              showFitView={true}
              showInteractive={true}
            />

            {/* Enhanced Minimap */}
            <EnhancedMiniMap
              components={components}
              position='bottom-left'
              canvasSize={canvasSize}
              onZoomChange={handleMinimapZoomChange}
              onPanTo={handleMinimapPanTo}
              showZoomControls={true}
              showVisibilityToggle={false}
              interactive={true}
            />
          </ReactFlow>

          {/* Connection editor popover */}
          {selectedConnection && popoverPosition && (
            <ConnectionEditorPopover
              selectedConnection={selectedConnection}
              x={popoverPosition.x}
              y={popoverPosition.y}
              onLabelChange={handleConnectionUpdate.onLabelChange}
              onTypeChange={handleConnectionUpdate.onTypeChange}
              onVisualStyleChange={handleConnectionUpdate.onVisualStyleChange}
              onDelete={handleConnectionUpdate.onDelete}
              onClose={closeEditor}
            />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleAddInfoCard}>
          <MessageSquare className='w-4 h-4 mr-2' />
          Add Comment
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Error boundary for virtualization fallback (Comment 2)
class VirtualizationErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; components: any[] },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode; components: any[] }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Virtualization error, falling back to standard rendering:', error, errorInfo);
  }

  componentDidUpdate(prevProps: { components: any[] }) {
    // Reset error state if relevant props change, allowing for recovery
    if (this.state.hasError && prevProps.components !== this.props.components) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Main component wrapped with ReactFlowProvider and error boundary
export function ReactFlowCanvas(props: ReactFlowCanvasProps) {
  // Comment 3: Lifted state for viewport and virtualization
  const [viewport, setViewport] = useState<Viewport | undefined>(undefined);
  const [virtualizationEnabled, setVirtualizationEnabled] = useState(
    props.virtualization?.enabled ?? false
  );
  const [virtualizationStats, setVirtualizationStats] = useState<VirtualizationStats | undefined>();

  const handleVirtualizationToggle = useCallback((enabled: boolean) => {
    setVirtualizationEnabled(enabled);
  }, []);

  const handleVirtualizationStatsChange = useCallback(
    (stats: VirtualizationStats) => {
      setVirtualizationStats(stats);
      if (props.onVirtualizationStats) {
        props.onVirtualizationStats(stats);
      }
    },
    [props.onVirtualizationStats]
  );

  // Comment 4: Fix fallbackProps merge
  const fallbackProps = {
    ...props,
    virtualization: { ...props.virtualization, enabled: false },
  };

  return (
    <ReactFlowProvider>
      <VirtualizationErrorBoundary
        fallback={
          <ReactFlowCanvasInternal
            {...fallbackProps}
            viewport={viewport}
            onViewportChange={setViewport}
            virtualizationEnabled={false}
            onVirtualizationToggle={() => {}}
            virtualizationStats={undefined}
            onVirtualizationStatsChange={() => {}}
          />
        }
        components={props.components}
      >
        <ReactFlowCanvasInternal
          {...props}
          viewport={viewport}
          onViewportChange={setViewport}
          virtualizationEnabled={virtualizationEnabled}
          onVirtualizationToggle={handleVirtualizationToggle}
          virtualizationStats={virtualizationStats}
          onVirtualizationStatsChange={handleVirtualizationStatsChange}
        />
      </VirtualizationErrorBoundary>
    </ReactFlowProvider>
  );
}
