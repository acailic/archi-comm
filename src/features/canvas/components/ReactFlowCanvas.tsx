// src/features/canvas/components/ReactFlowCanvas.tsx
// React Flow-based canvas component that replaces CanvasArea.tsx
// Maintains the same props interface for drop-in compatibility

import type {
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  Connection as ReactFlowConnection,
} from '@xyflow/react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import type { Connection, DesignComponent, InfoCard } from '../../../shared/contracts';
import { useConnectionEditor } from '../hooks/useConnectionEditor';
import { toReactFlowEdges } from '../utils/rf-adapters';
import { ConnectionEditorPopover } from './ConnectionEditorPopover';
import { CustomEdge } from './CustomEdge';
import { CustomNode } from './CustomNode';
import { InfoCard as InfoCardComponent } from './InfoCard';
import { computeLayout } from '../utils/auto-layout';

interface ReactFlowCanvasProps {
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
}

type ConnectionStyle = 'straight' | 'curved' | 'stepped';

// Memoized SelectTrigger used by the connection style selector
const ConnectionStyleSelectTrigger = memo(function ConnectionStyleSelectTrigger() {
  return (
    <SelectTrigger className='w-32 bg-card/95 backdrop-blur-sm border-border/50'>
      <SelectValue />
    </SelectTrigger>
  );
});

// Memoized Panel content for selecting connection style
const ConnectionStylePanel = memo(function ConnectionStylePanel({
  value,
  onChange,
}: {
  value: ConnectionStyle;
  onChange: (value: ConnectionStyle) => void;
}) {
  return (
    <Panel position='top-left' className='flex gap-2'>
      <Select value={value} onValueChange={onChange}>
        <ConnectionStyleSelectTrigger />
        <SelectContent>
          <SelectItem value='straight'>Straight</SelectItem>
          <SelectItem value='curved'>Curved</SelectItem>
          <SelectItem value='stepped'>Stepped</SelectItem>
        </SelectContent>
      </Select>
    </Panel>
  );
});

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
}: ReactFlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();
  const [connectionStyle, setConnectionStyle] = useState<ConnectionStyle>('curved');
  const [layoutPositions, setLayoutPositions] = useState<Record<string, { x: number; y: number }>>({});

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
            onStartConnection: onStartConnection,
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
  const initialEdges = useMemo(() => toReactFlowEdges(connections), [connections]);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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
  const syncedEdges = useMemo(() => toReactFlowEdges(connections), [connections]);

  // Update React Flow state when external data changes
  useEffect(() => {
    setNodes(syncedNodes);
  }, [syncedNodes, setNodes]);

  useEffect(() => {
    setEdges(syncedEdges);
  }, [syncedEdges, setEdges]);

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
  }, [autoLayout, layoutDirection, components, connections, reactFlowInstance]);

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
    onConnectionDelete: onConnectionDelete ?? (() => {}),
  });

  // Handle React Flow node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const typedChanges = changes.filter(c => c.type === 'position' || c.type === 'remove');
      onNodesChange(typedChanges);
      // Note: position updates are handled on drag stop to avoid duplicates
    },
    [onNodesChange, onComponentMove]
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

  // Handle node drag for connection start
  // Node drag is handled by the custom node component

  // Map connection style to React Flow edge types
  const edgeTypes = useMemo(() => {
    const baseEdges = edges.map(edge => ({
      ...edge,
      type:
        connectionStyle === 'straight'
          ? 'default'
          : connectionStyle === 'stepped'
            ? 'step'
            : 'smoothstep',
    }));
    return baseEdges;
  }, [edges, connectionStyle]);

  // Stable handler for connection style change
  const handleConnectionStyleChange = useCallback((value: ConnectionStyle) => {
    setConnectionStyle(value);
  }, []);

  // Memoize the panel JSX to stabilize ReactFlow children
  const connectionStylePanel = useMemo(
    () => <ConnectionStylePanel value={connectionStyle} onChange={handleConnectionStyleChange} />,
    [connectionStyle]
  );

  // Background pattern based on grid style
  const backgroundVariant = gridStyle === 'dots' ? 'dots' : 'lines';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setCanvasRef}
          className='relative w-full h-full bg-muted/10'
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
            edges={edgeTypes}
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
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.1}
            maxZoom={2}
            attributionPosition='bottom-left'
            proOptions={{ hideAttribution: true }}
          >
            {/* Connection style controls */}
            {connectionStylePanel}

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
          </ReactFlow>

          {/* Connection editor popover */}
          {selectedConnection && popoverPosition && (
            <ConnectionEditorPopover
              selectedConnection={selectedConnection}
              x={popoverPosition.x}
              y={popoverPosition.y}
              onLabelChange={handleConnectionUpdate.onLabelChange}
              onTypeChange={handleConnectionUpdate.onTypeChange}
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

// Main component wrapped with ReactFlowProvider
export function ReactFlowCanvas(props: ReactFlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <ReactFlowCanvasInternal {...props} />
    </ReactFlowProvider>
  );
}
