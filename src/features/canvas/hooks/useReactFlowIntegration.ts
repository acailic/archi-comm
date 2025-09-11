/**
 * React Flow Integration Hook
 * 
 * Manages the integration between React Flow and the existing canvas state management.
 * Handles data format conversion, React Flow state management, and callback translation.
 */

import { useCallback, useMemo, useRef } from 'react';
import type { 
  Node, 
  Edge, 
  NodeChange, 
  EdgeChange, 
  Connection as ReactFlowConnection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  OnConnectStart,
  OnConnectEnd,
  ReactFlowInstance
} from '@xyflow/react';
import type { DesignComponent, Connection } from '../../../shared/contracts';
import { useUndoRedo } from '../../../hooks/useUndoRedo';
import {
  toReactFlowNodes,
  toReactFlowEdges,
  fromNodeChanges,
  fromEdgeChanges,
  type ArchiCommNode,
  type ArchiCommEdge
} from '../utils/rf-adapters';

export interface UseReactFlowIntegrationProps {
  components: DesignComponent[];
  connections: Connection[];
  onComponentMove?: (componentId: string, x: number, y: number) => void;
  onComponentSelect?: (componentId: string | null) => void;
  onComponentDelete?: (componentId: string) => void;
  onConnectionCreate?: (connection: Connection) => void;
  onConnectionDelete?: (connectionId: string) => void;
  onConnectionSelect?: (connectionId: string | null) => void;
  enableUndoRedo?: boolean;
  maxHistorySize?: number;
}

export interface UseReactFlowIntegrationReturn {
  nodes: ArchiCommNode[];
  edges: ArchiCommEdge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onConnectStart: OnConnectStart;
  onConnectEnd: OnConnectEnd;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onPaneClick: (event: React.MouseEvent) => void;
  onInit: (instance: ReactFlowInstance) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
}

interface CanvasState {
  components: DesignComponent[];
  connections: Connection[];
}

export function useReactFlowIntegration({
  components,
  connections,
  onComponentMove,
  onComponentSelect,
  onComponentDelete,
  onConnectionCreate,
  onConnectionDelete,
  onConnectionSelect,
  enableUndoRedo = true,
  maxHistorySize = 50,
}: UseReactFlowIntegrationProps): UseReactFlowIntegrationReturn {
  
  // React Flow instance reference
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
  
  // Connection creation state
  const connectionStartNode = useRef<string | null>(null);
  
  // Current canvas state for undo/redo
  const currentState: CanvasState = useMemo(() => ({
    components,
    connections,
  }), [components, connections]);

  // Undo/redo functionality
  const {
    state: historyState,
    canUndo,
    canRedo,
    pushState,
    undo: undoHistory,
    redo: redoHistory,
    clearHistory,
  } = useUndoRedo<CanvasState>(currentState, {
    maxHistorySize,
    enableGlobalShortcuts: enableUndoRedo,
  });

  // Convert domain objects to React Flow format
  const nodes = useMemo(() => toReactFlowNodes(components), [components]);
  const edges = useMemo(() => toReactFlowEdges(connections), [connections]);

  // Handle React Flow node changes
  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    // Filter out selection and dimension changes as they don't affect domain data
    const significantChanges = changes.filter(change => 
      change.type === 'position' || 
      change.type === 'add' || 
      change.type === 'remove' || 
      change.type === 'replace'
    );

    if (significantChanges.length === 0) {
      return;
    }

    // Convert React Flow changes back to domain objects
    const updatedComponents = fromNodeChanges(changes, components);
    
    // Handle specific change types
    for (const change of significantChanges) {
      switch (change.type) {
        case 'position':
          if (change.position && onComponentMove) {
            onComponentMove(change.id, change.position.x, change.position.y);
          }
          break;
          
        case 'remove':
          if (onComponentDelete) {
            onComponentDelete(change.id);
          }
          break;
      }
    }

    // Push state to history for undo/redo
    if (enableUndoRedo) {
      pushState({
        components: updatedComponents,
        connections,
      });
    }
  }, [components, connections, onComponentMove, onComponentDelete, enableUndoRedo, pushState]);

  // Handle React Flow edge changes
  const onEdgesChange: OnEdgesChange = useCallback((changes: EdgeChange[]) => {
    // Filter out selection changes as they don't affect domain data
    const significantChanges = changes.filter(change => 
      change.type === 'add' || 
      change.type === 'remove' || 
      change.type === 'replace'
    );

    if (significantChanges.length === 0) {
      return;
    }

    // Convert React Flow changes back to domain objects
    const updatedConnections = fromEdgeChanges(changes, connections);
    
    // Handle specific change types
    for (const change of significantChanges) {
      switch (change.type) {
        case 'remove':
          if (onConnectionDelete) {
            onConnectionDelete(change.id);
          }
          break;
      }
    }

    // Push state to history for undo/redo
    if (enableUndoRedo) {
      pushState({
        components,
        connections: updatedConnections,
      });
    }
  }, [components, connections, onConnectionDelete, enableUndoRedo, pushState]);

  // Handle new connection creation
  const onConnect: OnConnect = useCallback((connection: ReactFlowConnection) => {
    if (!connection.source || !connection.target) {
      return;
    }

    // Generate unique ID for the new connection
    const connectionId = `connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create new connection object
    const newConnection: Connection = {
      id: connectionId,
      from: connection.source,
      to: connection.target,
      label: 'New Connection',
      type: 'data', // Default connection type
      direction: 'end', // Default direction
    };

    // Notify parent component
    if (onConnectionCreate) {
      onConnectionCreate(newConnection);
    }

    // Push state to history for undo/redo
    if (enableUndoRedo) {
      pushState({
        components,
        connections: [...connections, newConnection],
      });
    }
  }, [components, connections, onConnectionCreate, enableUndoRedo, pushState]);

  // Handle connection start
  const onConnectStart: OnConnectStart = useCallback((_, { nodeId }) => {
    connectionStartNode.current = nodeId || null;
  }, []);

  // Handle connection end
  const onConnectEnd: OnConnectEnd = useCallback(() => {
    connectionStartNode.current = null;
  }, []);

  // Handle node clicks for selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    if (onComponentSelect) {
      onComponentSelect(node.id);
    }
  }, [onComponentSelect]);

  // Handle edge clicks for selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    if (onConnectionSelect) {
      onConnectionSelect(edge.id);
    }
  }, [onConnectionSelect]);

  // Handle pane clicks to clear selection
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (onComponentSelect) {
      onComponentSelect(null);
    }
    if (onConnectionSelect) {
      onConnectionSelect(null);
    }
  }, [onComponentSelect, onConnectionSelect]);

  // Handle React Flow initialization
  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
    
    // Fit view to show all nodes
    setTimeout(() => {
      if (nodes.length > 0) {
        instance.fitView({ padding: 0.1 });
      }
    }, 0);
  }, [nodes.length]);

  // Undo/redo wrapper functions that apply changes
  const undo = useCallback(() => {
    undoHistory();
    // Note: The actual state application would be handled by the parent component
    // through the historyState value, which would trigger re-renders with new props
  }, [undoHistory]);

  const redo = useCallback(() => {
    redoHistory();
    // Note: The actual state application would be handled by the parent component
    // through the historyState value, which would trigger re-renders with new props
  }, [redoHistory]);

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onConnectStart,
    onConnectEnd,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onInit,
    canUndo,
    canRedo,
    undo,
    redo,
    clearHistory,
  };
}

// Helper hook for managing React Flow viewport state
export function useReactFlowViewport() {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const fitView = useCallback((options?: { padding?: number; includeHiddenNodes?: boolean }) => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView(options);
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.zoomIn();
    }
  }, []);

  const zoomOut = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.zoomOut();
    }
  }, []);

  const zoomTo = useCallback((zoomLevel: number) => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.zoomTo(zoomLevel);
    }
  }, []);

  const setCenter = useCallback((x: number, y: number, options?: { zoom?: number }) => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.setCenter(x, y, options);
    }
  }, []);

  const getViewport = useCallback(() => {
    if (reactFlowInstance.current) {
      return reactFlowInstance.current.getViewport();
    }
    return { x: 0, y: 0, zoom: 1 };
  }, []);

  const setViewport = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.setViewport(viewport);
    }
  }, []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  return {
    onInit,
    fitView,
    zoomIn,
    zoomOut,
    zoomTo,
    setCenter,
    getViewport,
    setViewport,
  };
}

// Helper hook for managing React Flow selection state
export function useReactFlowSelection() {
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  const getSelectedNodes = useCallback(() => {
    if (reactFlowInstance.current) {
      return reactFlowInstance.current.getNodes().filter(node => node.selected);
    }
    return [];
  }, []);

  const getSelectedEdges = useCallback(() => {
    if (reactFlowInstance.current) {
      return reactFlowInstance.current.getEdges().filter(edge => edge.selected);
    }
    return [];
  }, []);

  const selectNodes = useCallback((nodeIds: string[]) => {
    if (reactFlowInstance.current) {
      const nodes = reactFlowInstance.current.getNodes().map(node => ({
        ...node,
        selected: nodeIds.includes(node.id),
      }));
      reactFlowInstance.current.setNodes(nodes);
    }
  }, []);

  const selectEdges = useCallback((edgeIds: string[]) => {
    if (reactFlowInstance.current) {
      const edges = reactFlowInstance.current.getEdges().map(edge => ({
        ...edge,
        selected: edgeIds.includes(edge.id),
      }));
      reactFlowInstance.current.setEdges(edges);
    }
  }, []);

  const clearSelection = useCallback(() => {
    if (reactFlowInstance.current) {
      const nodes = reactFlowInstance.current.getNodes().map(node => ({
        ...node,
        selected: false,
      }));
      const edges = reactFlowInstance.current.getEdges().map(edge => ({
        ...edge,
        selected: false,
      }));
      reactFlowInstance.current.setNodes(nodes);
      reactFlowInstance.current.setEdges(edges);
    }
  }, []);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance;
  }, []);

  return {
    onInit,
    getSelectedNodes,
    getSelectedEdges,
    selectNodes,
    selectEdges,
    clearSelection,
  };
}