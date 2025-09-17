// src/features/canvas/components/ReactFlowCanvas.tsx
// React Flow-based canvas component that replaces CanvasArea.tsx
// Maintains the same props interface for drop-in compatibility and includes optional virtualization support

import { shallowEqual } from '@core/utils';
import type {
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  NodeTypes,
  Connection as ReactFlowConnection,
  Viewport,
} from '@xyflow/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';

import {
  Background,
  BackgroundVariant,
  Controls,
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
} from '@ui/components/ui/context-menu';
import type { Connection, DesignComponent, InfoCard, VisualStyle } from '../../../shared/contracts';
import { useConnectionEditor } from '../hooks/useConnectionEditor';
import { computeLayout } from '../utils/auto-layout';
import { toReactFlowEdges } from '../utils/rf-adapters';
import type { VirtualizationConfig, VirtualizationStats } from '../utils/virtualization';
// --- Types for canvas nodes ---
import { componentIconMap } from '@/lib/component-icons';
import type { CustomNodeData } from '../types';
import { ConnectionEditorPopover } from './ConnectionEditorPopover';
import { CustomEdge } from './CustomEdge';
import { CustomNode } from './CustomNode';
import { EnhancedMiniMap } from './EnhancedMiniMap';
import { InfoCard as InfoCardComponent, InfoCardData } from './InfoCard';
type CanvasNode = Node<CustomNodeData | InfoCardData>;

export const CANVAS_NODE_REGISTRY: Set<DesignComponent['type']> = new Set(
  Object.keys(componentIconMap) as DesignComponent['type'][]
);

export const registerCanvasNodeType = (type: DesignComponent['type']) => {
  if (!CANVAS_NODE_REGISTRY.has(type)) {
    CANVAS_NODE_REGISTRY.add(type);
  }
};

// Virtualization imports
import { VirtualCanvas } from './VirtualCanvas';
// import { CanvasPerformanceManager } from '../../../lib/performance/CanvasPerformanceManager';

export interface ReactFlowCanvasProps {
  components: DesignComponent[];
  connections: Connection[];
  infoCards?: InfoCard[];
  selectedComponent: string | null;
  connectionStart: string | null;
  visualTheme?: 'serious' | 'playful';
  onComponentDrop: (type: DesignComponent['type'], x: number, y: number) => void;
  onComponentMove: (id: string, x: number, y: number) => void;
  onComponentSelect: (id: string | null) => void;
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
  visualTheme,
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

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

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

  // Render guard to catch infinite render loops (dev only)
  const renderGuardRef = useRef({ count: 0, windowStart: Date.now() });
  if (process.env.NODE_ENV !== 'production') {
    const now = Date.now();
    const windowMs = 4000;
    const guard = renderGuardRef.current;
    if (now - guard.windowStart > windowMs) {
      guard.windowStart = now;
      guard.count = 0;
    }
    guard.count++;

    if (guard.count > 20) {
      console.warn('ReactFlowCanvas: High render count detected:', {
        count: guard.count,
        componentsLength: components.length,
        connectionsLength: connections.length,
        selectedComponent,
        connectionStart,
      });
    }

    if (guard.count > 50) {
      console.error('ReactFlowCanvas: Potential infinite render loop detected', {
        renderCount: guard.count,
        stackTrace: new Error().stack,
      });
    }
  }

  const virtualizationBufferZone = virtualization?.bufferZone;
  const virtualizationMaxVisibleItems = virtualization?.maxVisibleItems;
  const virtualizationEnablePerformanceMonitoring = virtualization?.enablePerformanceMonitoring;
  const virtualizationDebugMode = virtualization?.debugMode;

  // Merged virtualization configuration with stable dependencies (Comment 1)
  // Dependencies are individual primitive values to prevent unnecessary recomputations
  // when the virtualization object reference changes but values remain the same
  const virtualizationConfig = useMemo(
    () => ({
      bufferZone: virtualizationBufferZone,
      maxVisibleItems: virtualizationMaxVisibleItems,
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

  // --- Stable callback refs ---
  const stableCallbacks = useRef({
    onComponentSelect,
    onStartConnection,
    onComponentLabelChange,
    visualTheme,
    selectedComponent,
    connectionStart,
    onInfoCardUpdate,
    onInfoCardDelete,
    onInfoCardColorChange,
  });
  useEffect(() => {
    stableCallbacks.current = {
      onComponentSelect,
      onStartConnection,
      onComponentLabelChange,
      visualTheme,
      selectedComponent,
      connectionStart,
      onInfoCardUpdate,
      onInfoCardDelete,
      onInfoCardColorChange,
    };
  }, [
    onComponentSelect,
    onStartConnection,
    onComponentLabelChange,
    visualTheme,
    selectedComponent,
    connectionStart,
    onInfoCardUpdate,
    onInfoCardDelete,
    onInfoCardColorChange,
  ]);

  const createEnhancedNodes = useCallback(
    (components: DesignComponent[]) => {
      const {
        onComponentSelect,
        onStartConnection,
        onComponentLabelChange,
        visualTheme,
        selectedComponent,
        connectionStart,
      } = stableCallbacks.current;
      return components.map(component => {
        const pos = layoutPositions[component.id] ?? { x: component.x, y: component.y };
        registerCanvasNodeType(component.type);
        return {
          id: component.id,
          type: 'custom',
          position: { x: pos.x, y: pos.y },
          data: {
            component,
            isSelected: selectedComponent === component.id,
            isConnectionStart: connectionStart === component.id,
            visualTheme,
            onSelect: onComponentSelect,
            onStartConnection: (id: string, _position?: 'top' | 'bottom' | 'left' | 'right') =>
              onStartConnection(id),
            onLabelChange: onComponentLabelChange ?? (() => {}),
          },
          draggable: true,
          selectable: true,
          deletable: true,
        };
      });
    },
    [layoutPositions]
  );

  // Convert info cards to React Flow nodes
  const createInfoCardNodes = useCallback(
    (infoCards: InfoCard[]) => {
      const { onInfoCardUpdate, onInfoCardDelete, onInfoCardColorChange } = stableCallbacks.current;
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
    [] // No dependencies since we use stableCallbacks ref
  );

  // Memoize initial nodes using only direct inputs to reduce unnecessary recalculations
  const initialNodes = useMemo(
    () => [...createEnhancedNodes(components), ...createInfoCardNodes(infoCards)],
    [components, infoCards, createEnhancedNodes, createInfoCardNodes]
  );
  // Initial edges will be set after useConnectionEditor hook

  // React Flow state with generics (Comment 1)
  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>(initialNodes as CanvasNode[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Sync external data changes with React Flow state
  // Keep ReactFlow state in sync with external data; depend on the same direct inputs
  const syncedNodes = useMemo(
    () => [...createEnhancedNodes(components), ...createInfoCardNodes(infoCards)],
    [components, infoCards, createEnhancedNodes, createInfoCardNodes]
  );
  // syncedEdges will be defined after useConnectionEditor hook

  // Update React Flow state when external data changes (Comment 4)
  useEffect(() => {
    setNodes(cur => (shallowEqual(cur, syncedNodes) ? cur : syncedNodes));
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
        // Only auto-fit view if this is the initial layout and user hasn't manually adjusted zoom
        if (
          components.length > 0 &&
          (!viewport || (viewport.zoom === 1 && viewport.x === 0 && viewport.y === 0))
        ) {
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
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [autoLayout, layoutDirection, components, connections, viewport, reactFlowInstance]);

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

  const syncedEdges = useMemo(
    () => createEnhancedEdges(connections),
    [createEnhancedEdges, connections]
  );

  // Update React Flow edges when external data changes (Comment 4)
  useEffect(() => {
    setEdges(cur => (shallowEqual(cur, syncedEdges) ? cur : syncedEdges));
  }, [syncedEdges, setEdges]);

  // Handle React Flow node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      // Type assertion for React Flow compatibility
      onNodesChange(changes);

      // Handle any custom logic for specific change types
      for (const change of changes) {
        if (change.type === 'remove') {
          // Node deletion is handled by React Flow and onNodeDragStop
          // No additional custom logic needed here
        }
        // Position updates are handled on drag stop to avoid duplicates
      }
    },
    [onNodesChange]
  );

  // Handle React Flow edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Let React Flow handle all changes to maintain internal state
      onEdgesChange(changes);

      // Handle any custom logic for specific change types
      for (const change of changes) {
        if (change.type === 'remove' && onConnectionDelete) {
          onConnectionDelete(change.id);
        }
        // Other edge change types are handled by React Flow automatically
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
        onComponentSelect(null);
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
        const edgeElement = (event.currentTarget || event.target) as SVGElement;
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
        components={components}
        connections={connections}
        infoCards={infoCards}
        selectedComponent={selectedComponent}
        connectionStart={connectionStart}
        onComponentDrop={onComponentDrop}
        onComponentMove={onComponentMove}
        onComponentSelect={onComponentSelect}
        onComponentLabelChange={onComponentLabelChange}
        onConnectionLabelChange={onConnectionLabelChange}
        onConnectionDelete={onConnectionDelete}
        onConnectionTypeChange={onConnectionTypeChange}
        onStartConnection={onStartConnection}
        onCompleteConnection={onCompleteConnection}
        onInfoCardAdd={onInfoCardAdd}
        onInfoCardUpdate={onInfoCardUpdate}
        onInfoCardDelete={onInfoCardDelete}
        onInfoCardColorChange={onInfoCardColorChange}
        gridStyle={gridStyle}
        snapToGrid={snapToGrid}
        gridSpacing={gridSpacing}
        showConnectors={showConnectors}
        autoLayout={autoLayout}
        layoutDirection={layoutDirection}
        virtualizationConfig={virtualizationConfig}
        onVirtualizationStatsChange={onVirtualizationStatsChange}
        viewport={viewport}
        onViewportChange={onViewportChange}
      />
    );
  }

  // Default non-virtualized rendering
  // Comment 2: Unify nodeTypes typing

  const nodeTypes: NodeTypes = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    custom: CustomNode as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    infoCard: InfoCardComponent as any,
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setCanvasRef}
          className='relative w-full h-full bg-muted/10'
          data-testid='canvas-root'
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
            nodeTypes={nodeTypes}
            edgeTypes={{
              custom: CustomEdge,
            }}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
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

// Error boundary for virtualization fallback (Comment 3)
class VirtualizationErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; components: DesignComponent[] },
  { hasError: boolean }
> {
  constructor(props: {
    children: React.ReactNode;
    fallback: React.ReactNode;
    components: DesignComponent[];
  }) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(_error: Error) {
    return { hasError: true };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Virtualization error, falling back to standard rendering:', error, errorInfo);
  }

  public override componentDidUpdate(prevProps: { components: DesignComponent[] }) {
    // Reset error state if relevant props change, allowing for recovery
    if (this.state.hasError && prevProps.components !== this.props.components) {
      this.setState({ hasError: false });
    }
  }

  public override render() {
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
