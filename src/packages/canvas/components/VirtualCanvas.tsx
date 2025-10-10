/**
 * /src/features/canvas/components/VirtualCanvas.tsx
 * Main virtual rendering system that implements viewport-based component culling and level-of-detail rendering
 * Provides performance optimization for large datasets while maintaining full React Flow compatibility
 * RELEVANT FILES: src/features/canvas/components/ReactFlowCanvas.tsx, src/features/canvas/hooks/useVirtualization.ts, src/features/canvas/utils/virtualization.ts, src/lib/performance/CanvasPerformanceManager.ts
 */

import type { Edge, Node } from '@xyflow/react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import React, { useEffect, useMemo, useRef } from 'react';

import { CanvasPerformanceManager } from '@/lib/performance/CanvasPerformanceManager';
import { BoundingBoxImpl } from '@/lib/spatial/RTree';
import type { Connection, DesignComponent, InfoCard } from '@shared/contracts';
import { useConnectionEditor } from '../hooks/useConnectionEditor';
import {
  useLevelOfDetail,
  useSpatialIndex,
  useViewportTracking,
  useVirtualizationPerformance,
  useVisibleItems,
} from '../hooks/useVirtualization.tsx';
import { toReactFlowEdges } from '../utils/rf-adapters';
import {
  DEFAULT_VIRTUALIZATION_CONFIG,
  logVirtualizationStats,
  VirtualizationConfig,
  VirtualizationStats,
} from '../utils/virtualization';
import { ConnectionEditorPopover } from './ConnectionEditorPopover';
import { CustomEdge } from './CustomEdge';
import { CustomNode } from './CustomNode';
import { InfoCard as InfoCardComponent } from './InfoCard';

// Virtualization imports

// Extended props interface that includes virtualization options
export interface VirtualCanvasProps {
  viewport?: { x: number; y: number; zoom: number };
  onViewportChange?: (vp: { x: number; y: number; zoom: number }) => void;
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
  onConnectionVisualStyleChange?: (id: string, visualStyle: Connection['visualStyle']) => void;
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
  autoLayout?: boolean;
  layoutDirection?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
  // Virtualization-specific props
  virtualizationConfig?: Partial<VirtualizationConfig>;
  onVirtualizationStatsChange?: (stats: VirtualizationStats) => void;
}

// Performance statistics display component
const VirtualizationStatsOverlay: React.FC<{
  stats: VirtualizationStats;
  isVisible: boolean;
}> = ({ stats, isVisible }) => {
  if (!isVisible) return null;

  return (
    <Panel
      position='top-right'
      className='bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg p-3 text-sm'
    >
      <h4 className='font-semibold mb-2 text-foreground'>Virtualization Stats</h4>
      <div className='space-y-1 text-muted-foreground'>
        <div>
          Components: {stats.visibleComponents}/{stats.totalComponents}
        </div>
        <div>
          Connections: {stats.visibleConnections}/{stats.totalConnections}
        </div>
        <div>Query Time: {stats.queryTime.toFixed(1)}ms</div>
        <div>FPS: {stats.fps.toFixed(1)}</div>
        <div>Quality: {(stats.qualityLevel * 100).toFixed(0)}%</div>
      </div>
    </Panel>
  );
};

// Internal virtualized canvas implementation
const VirtualCanvasInternal: React.FC<VirtualCanvasProps> = ({
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
  onStartConnection,
  onCompleteConnection,
  onInfoCardAdd,
  onInfoCardUpdate,
  onInfoCardDelete,
  onInfoCardColorChange,
  gridStyle = 'dots',
  snapToGrid = false,
  gridSpacing = 20,
  // showConnectors, autoLayout, layoutDirection are accepted for compatibility but not used in virtualization
  virtualizationConfig,
  onVirtualizationStatsChange,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const performanceManager = useMemo(() => CanvasPerformanceManager.getInstance(), []);

  // Merge configuration with defaults
  const config = useMemo(
    () => ({ ...DEFAULT_VIRTUALIZATION_CONFIG, ...virtualizationConfig }),
    [virtualizationConfig]
  );

  // Viewport tracking with configurable buffer zone
  const { viewport, visibleBounds } = useViewportTracking({
    bufferZone: config.bufferZone,
    debounceMs: 50,
    containerRef: canvasRef,
  });

  // Spatial indexing for efficient viewport queries
  const spatialIndex = useSpatialIndex(components, connections, {
    enabled: config.enableSpatialIndex,
    rebuildThreshold: 50,
  });

  // Level-of-detail configuration based on zoom
  const lodResult = useLevelOfDetail(viewport.zoom, {
    thresholds: config.lodThresholds,
    enabled: config.enabled,
  });

  // Query visible items with performance limiting
  const { visibleComponents, visibleConnections, totalVisible, isLimited } = useVisibleItems(
    spatialIndex,
    visibleBounds,
    { enabled: config.enabled, thresholds: config.lodThresholds },
    {
      maxItems: config.maxVisibleItems,
      priorityRadius: 500,
    }
  );

  // Performance monitoring
  const { metrics } = useVirtualizationPerformance('virtual-canvas');

  // Connection editor hook
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
    onConnectionVisualStyleChange: undefined, // VirtualCanvas doesn't handle this yet
    onConnectionDelete: onConnectionDelete ?? (() => {}),
  });

  // Create React Flow nodes from visible components and info cards
  const visibleNodes = useMemo((): Node[] => {
    const componentsToRender = config.enabled
      ? visibleComponents.map(item => item.data)
      : components;

    // Component nodes
    const componentNodes = componentsToRender.map(component => ({
      id: component.id,
      type: 'custom',
      position: { x: component.x, y: component.y },
      data: {
        component,
        isSelected: selectedComponent === component.id,
        isConnectionStart: connectionStart === component.id,
        showLabel: lodResult.shouldShowLabels,
        showDetails: lodResult.shouldShowDetails,
        qualityLevel: lodResult.qualityMultiplier,
        onLabelChange: onComponentLabelChange,
        onSelect: onComponentSelect,
        onStartConnection: onStartConnection,
      },
      selectable: true,
      draggable: true,
    }));

    // Info card nodes
    const infoCardNodes = (infoCards || []).map(infoCard => ({
      id: infoCard.id,
      type: 'infoCard',
      position: { x: infoCard.x, y: infoCard.y },
      data: {
        id: infoCard.id,
        content: infoCard.content,
        color: infoCard.color ?? 'yellow',
        isEditing: infoCard.isEditing ?? false,
        onContentChange: onInfoCardUpdate ?? (() => {}),
        onDelete: onInfoCardDelete ?? (() => {}),
        onStartEdit: (_id: string) => {},
        onFinishEdit: (_id: string) => {},
        onColorChange: onInfoCardColorChange ?? (() => {}),
      },
      draggable: true,
      selectable: true,
      deletable: true,
    }));

    return [...componentNodes, ...infoCardNodes];
  }, [
    config.enabled,
    visibleComponents,
    components,
    selectedComponent,
    connectionStart,
    lodResult,
    onComponentLabelChange,
    onComponentSelect,
    onStartConnection,
    infoCards,
    onInfoCardUpdate,
    onInfoCardDelete,
    onInfoCardColorChange,
  ]);

  // Create React Flow edges from visible connections
  const visibleEdges = useMemo((): Edge[] => {
    const connectionsToRender = config.enabled
      ? visibleConnections.map(item => item.data)
      : connections;

    // Get visible node IDs to filter edges
    const visibleNodeIds = new Set(visibleNodes.map(node => node.id));

    // Filter connections to only include those with both endpoints visible
    const filteredConnections = connectionsToRender.filter(
      connection => visibleNodeIds.has(connection.from) && visibleNodeIds.has(connection.to)
    );

    return toReactFlowEdges(filteredConnections).map(edge => ({
      ...edge,
      type: 'custom',
      data: {
        ...edge.data,
        showLabel: lodResult.shouldShowLabels,
        showDetails: lodResult.shouldShowDetails,
        qualityLevel: lodResult.qualityMultiplier,
        onConnectionSelect: handleConnectionSelect,
      },
    }));
  }, [
    config.enabled,
    visibleConnections,
    connections,
    visibleNodes,
    lodResult,
    handleConnectionSelect,
  ]);

  // Node types
  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
      infoCard: InfoCardComponent,
    }),
    []
  );
  const edgeTypes = useMemo(() => ({ custom: CustomEdge }), []);

  // Update virtualization statistics
  useEffect(() => {
    if (!config.enabled) return;

    const currentStats: VirtualizationStats = {
      visibleComponents: visibleNodes.length,
      visibleConnections: visibleEdges.length,
      totalComponents: components.length,
      totalConnections: connections.length,
      queryTime: metrics.queryTime,
      renderTime: metrics.renderTime,
      memoryUsage: metrics.memoryUsage,
      fps: metrics.fps,
      qualityLevel: lodResult.qualityMultiplier,
    };

    // Notify parent component of stats changes
    if (onVirtualizationStatsChange) {
      onVirtualizationStatsChange(currentStats);
    }

    // Log stats in debug mode
    if (config.debugMode) {
      logVirtualizationStats(currentStats);
    }

    // Update performance manager metrics
    if (config.enablePerformanceMonitoring) {
      performanceManager.updateReactFlowCounts(
        'virtual-canvas',
        visibleNodes.length,
        visibleEdges.length
      );
    }
  }, [
    config.enabled,
    config.debugMode,
    config.enablePerformanceMonitoring,
    visibleNodes.length,
    visibleEdges.length,
    components.length,
    connections.length,
    metrics.queryTime,
    metrics.renderTime,
    metrics.fps,
    metrics.memoryUsage,
    lodResult.qualityMultiplier,
    onVirtualizationStatsChange,
    performanceManager,
  ]);

  // Create component map for efficient lookup during drag operations
  const componentMap = useMemo(
    () => new Map(components.map(c => [c.id, c])),
    [components]
  );

  // Handle node position changes (component movement)
  const handleNodesChange = React.useCallback(
    (changes: any[]) => {
      changes.forEach(change => {
        if (change.type === 'position' && change.position && change.dragging === false) {
          onComponentMove(change.id, change.position.x, change.position.y);

          // Update spatial index with new position
          if (spatialIndex.isReady) {
            const component = componentMap.get(change.id);
            if (component) {
              const newBounds = BoundingBoxImpl.fromComponent({
                ...component,
                x: change.position.x,
                y: change.position.y,
              });
              spatialIndex.updateItem(change.id, newBounds);
            }
          }
        }
      });
    },
    [onComponentMove, spatialIndex, componentMap]
  );

  // Handle connection creation
  const handleConnect = React.useCallback(
    (connection: any) => {
      if (connection.source && connection.target) {
        onCompleteConnection(connection.source, connection.target);
      }
    },
    [onCompleteConnection]
  );

  // Handle selection changes
  const handleSelectionChange = React.useCallback(
    (params: { nodes: any[]; edges: any[] }) => {
      const { nodes: selectedNodes } = params;
      if (selectedNodes.length > 0) {
        onComponentSelect(selectedNodes[0].id);
      }
    },
    [onComponentSelect]
  );

  // Handle pane context menu
  const handlePaneContextMenu = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!onInfoCardAdd || !canvasRef.current || !reactFlowInstance) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - canvasRect.left,
        y: event.clientY - canvasRect.top,
      });

      // Only call if it's a right-click on empty canvas
      const target = event.target as HTMLElement;
      if (
        target.classList.contains('react-flow__pane') ||
        target.classList.contains('react-flow__renderer')
      ) {
        onInfoCardAdd(position.x, position.y);
      }
    },
    [onInfoCardAdd, reactFlowInstance]
  );

  // Handle edge clicks
  const handleEdgeClick = React.useCallback(
    (event: React.MouseEvent, edge: any) => {
      event.stopPropagation();
      const connection = connections.find(conn => conn.id === edge.id);
      if (connection) {
        handleConnectionSelect(connection.id);
      }
    },
    [connections, handleConnectionSelect]
  );

  // Handle drop events for new components
  const handleDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !canvasRef.current || !reactFlowInstance) return;

      const canvasRect = canvasRef.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - canvasRect.left,
        y: event.clientY - canvasRect.top,
      });

      onComponentDrop(type as DesignComponent['type'], position.x, position.y);
    },
    [onComponentDrop, reactFlowInstance]
  );

  const handleDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div ref={canvasRef} className='w-full h-full relative'>
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onConnect={handleConnect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onSelectionChange={handleSelectionChange}
        onPaneContextMenu={handlePaneContextMenu}
        onEdgeClick={handleEdgeClick}
        fitView
        snapToGrid={snapToGrid}
        snapGrid={[gridSpacing, gridSpacing]}
        connectionMode='loose'
        defaultViewport={viewport ?? { x: 0, y: 0, zoom: 0.65 }}
        onMove={onViewportChange ? (_, vp) => onViewportChange(vp) : undefined}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
      >
        {/* Background grid */}
        <Background
          variant={gridStyle === 'dots' ? BackgroundVariant.Dots : BackgroundVariant.Lines}
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

        {/* Minimap */}
        <MiniMap
          position='bottom-left'
          nodeColor='hsl(var(--primary))'
          maskColor='hsl(var(--muted) / 0.1)'
          style={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        />

        {/* Virtualization statistics overlay (debug mode) */}
        <VirtualizationStatsOverlay
          stats={{
            visibleComponents: visibleNodes.length,
            visibleConnections: visibleEdges.length,
            totalComponents: components.length,
            totalConnections: connections.length,
            queryTime: metrics.queryTime,
            renderTime: metrics.renderTime,
            memoryUsage: metrics.memoryUsage,
            fps: metrics.fps,
            qualityLevel: lodResult.qualityMultiplier,
          }}
          isVisible={config.debugMode}
        />

        {/* Performance warning overlay */}
        {isLimited && (
          <Panel
            position='bottom-right'
            className='bg-amber-50 border border-amber-200 rounded-lg p-2 text-sm'
          >
            <div className='text-amber-800'>
              Performance mode: Showing {totalVisible}/{components.length + connections.length}{' '}
              items
            </div>
          </Panel>
        )}
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
  );
};

// Main component - assumes ReactFlowProvider is provided by parent
export const VirtualCanvas: React.FC<VirtualCanvasProps> = VirtualCanvasInternal;
