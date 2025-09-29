import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type Connection as ReactFlowConnection,
  type DefaultEdgeOptions,
  type Edge as ReactFlowEdge,
  type EdgeChange,
  type FitViewOptions,
  type Node as ReactFlowNode,
  type NodeChange,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
  type Viewport,
  useViewport,
} from '@xyflow/react';
import type { DesignComponent, Connection as DesignConnection } from '@shared/contracts';
import { deepEqual, generateId } from '@/packages/core/utils';
import { LRUCache } from '@/lib/performance/LRUCache';
import { componentOptimizer } from '@/lib/performance/ComponentOptimizer';
import { addPerformanceError, addError } from '@/lib/logging/errorStore';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { useRenderGuard } from '@/lib/performance/RenderGuard';
import { useCanvasActions, useCanvasStore } from '@/stores/canvasStore';
import { shallow } from 'zustand/shallow';

type QualityLevel = 'high' | 'medium' | 'low';
type EdgePathStrategy = 'bezier' | 'smoothstep' | 'straight';

interface CanvasNodeData {
  component: DesignComponent;
  selected: boolean;
  label: string;
  description?: string;
  theme?: 'serious' | 'playful';
}

interface CanvasEdgeData {
  connection: DesignConnection;
  quality: QualityLevel;
  pathStrategy: EdgePathStrategy;
  visualPriority: number;
}

interface UseOptimizedCanvasConfig {
  virtualizationThreshold: number;
  virtualizationBufferPx: number;
  virtualizationOverscanPx: number;
  viewportDebounceMs: number;
  positionChangeDebounceMs: number;
  zoomChangeDebounceMs: number;
  performanceTracking: boolean;
  maxNodeCacheSize: number;
  maxEdgeCacheSize: number;
  highDensityEdgeStrategy: EdgePathStrategy;
  forceVirtualization?: boolean;
}

interface UseOptimizedCanvasCallbacks {
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  onConnect?: OnConnect;
  onCreateConnection?: (connection: DesignConnection) => void;
  onSelectionChange?: (selection: { nodeIds: string[]; edgeIds: string[] }) => void;
  onViewportChange?: (viewport: Viewport) => void;
  onPerformanceEvent?: (payload: {
    metrics: ReturnType<typeof componentOptimizer.getMetrics>;
    insights: ReturnType<typeof componentOptimizer.getInsights>;
  }) => void;
}

interface UseOptimizedCanvasParams {
  components: DesignComponent[];
  connections: DesignConnection[];
  selectedComponentId?: string | null;
  config?: Partial<UseOptimizedCanvasConfig>;
  callbacks?: UseOptimizedCanvasCallbacks;
  reactFlowInstance?: ReactFlowInstance | null;
  viewportSize?: { width: number; height: number };
  debugLabel?: string;
}

interface VirtualizationSummary {
  enabled: boolean;
  visibleNodeCount: number;
  totalNodeCount: number;
  threshold: number;
}

interface UseOptimizedCanvasResult {
  nodes: ReactFlowNode<CanvasNodeData>[];
  edges: ReactFlowEdge<CanvasEdgeData>[];
  reactFlowProps: {
    nodes: ReactFlowNode<CanvasNodeData>[];
    edges: ReactFlowEdge<CanvasEdgeData>[];
    onlyRenderVisibleElements: boolean;
    nodeOrigin: [number, number];
    fitViewOptions: FitViewOptions;
    defaultEdgeOptions: DefaultEdgeOptions;
    proOptions: { hideAttribution: boolean };
  };
  handlers: {
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    onSelectionChange: (payload: { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] }) => void;
  };
  selection: {
    nodeIds: Set<string>;
    edgeIds: Set<string>;
    version: number;
  };
  viewport: {
    current: Viewport;
    debounced: Viewport;
  };
  performance: {
    metrics: ReturnType<typeof componentOptimizer.getMetrics>;
    insights: ReturnType<typeof componentOptimizer.getInsights>;
    qualityLevel: QualityLevel;
    edgePathStrategy: EdgePathStrategy;
    virtualization: VirtualizationSummary;
  };
  config: UseOptimizedCanvasConfig;
}

type SelectionChangeHandler = (params: { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] }) => void;

interface DebouncedFunction<T extends (...args: any[]) => void> {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
}

const COMPONENT_ID = 'useOptimizedCanvas';
const DEFAULT_VIEWPORT_SIZE = { width: 1280, height: 800 };
const APPROX_NODE_SIZE = 180;
const WINDOW = typeof window !== 'undefined' ? window : undefined;

const DEFAULT_CONFIG: UseOptimizedCanvasConfig = {
  virtualizationThreshold: 50,
  virtualizationBufferPx: 160,
  virtualizationOverscanPx: 220,
  viewportDebounceMs: 100,
  positionChangeDebounceMs: 32,
  zoomChangeDebounceMs: 85,
  performanceTracking: true,
  maxNodeCacheSize: 1000,
  maxEdgeCacheSize: 600,
  highDensityEdgeStrategy: 'straight',
};

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

function arraysDeepEqual<T extends object>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (!deepEqual(a[i] as object, b[i] as object)) {
      return false;
    }
  }
  return true;
}

function useStableArray<T extends object>(value: readonly T[]): readonly T[] {
  const ref = useRef(value);
  if (!arraysDeepEqual(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
}

function createComponentSignature(component: DesignComponent, selected: boolean): string {
  return [
    component.id,
    component.type,
    component.x,
    component.y,
    component.label,
    component.description ?? '',
    component.layerId ?? '',
    JSON.stringify(component.properties ?? {}),
    selected ? '1' : '0',
  ].join('|');
}

function createConnectionSignature(
  connection: DesignConnection,
  quality: QualityLevel,
  strategy: EdgePathStrategy
): string {
  return [
    connection.id,
    connection.from,
    connection.to,
    connection.type,
    connection.label ?? '',
    connection.protocol ?? '',
    connection.direction ?? 'none',
    connection.visualStyle ?? 'default',
    quality,
    strategy,
  ].join('|');
}

function mapConnectionTypeToPriority(type: DesignConnection['type']): number {
  switch (type) {
    case 'control':
      return 2;
    case 'sync':
      return 1.5;
    case 'async':
      return 1.25;
    default:
      return 1;
  }
}

function createDebouncedFunction<T extends (...args: any[]) => void>(
  fn: T,
  wait: number
): DebouncedFunction<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) {
        fn(...lastArgs);
        lastArgs = null;
      }
    }, wait);
  };

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };

  return debounced;
}

function computeVisibleComponentIds(
  components: readonly DesignComponent[],
  viewport: Viewport,
  viewportSize: { width: number; height: number },
  bufferPx: number,
  overscanPx: number
): Set<string> {
  const visible = new Set<string>();
  const zoom = viewport.zoom || 1;
  const translateX = viewport.x || 0;
  const translateY = viewport.y || 0;
  const width = viewportSize.width;
  const height = viewportSize.height;

  for (const component of components) {
    const screenX = component.x * zoom + translateX;
    const screenY = component.y * zoom + translateY;
    const expandedSizeX = (APPROX_NODE_SIZE + bufferPx + overscanPx) * zoom;
    const expandedSizeY = (APPROX_NODE_SIZE + bufferPx + overscanPx) * zoom;

    const intersectsHorizontally =
      screenX + expandedSizeX >= -bufferPx && screenX - expandedSizeX <= width + bufferPx;
    const intersectsVertically =
      screenY + expandedSizeY >= -bufferPx && screenY - expandedSizeY <= height + bufferPx;

    if (intersectsHorizontally && intersectsVertically) {
      visible.add(component.id);
    }
  }

  return visible;
}

function computeQualityLevel(
  nodeCount: number,
  edgeCount: number,
  metrics: ReturnType<typeof componentOptimizer.getMetrics>
): QualityLevel {
  if (metrics.renderCount > 0) {
    if (metrics.averageDuration > 26 || metrics.slowRenderCount > 8) {
      return 'low';
    }
    if (metrics.averageDuration > 18 || metrics.slowRenderCount > 4) {
      return 'medium';
    }
  }

  if (nodeCount > 220 || edgeCount > 260) {
    return 'low';
  }
  if (nodeCount > 130 || edgeCount > 150) {
    return 'medium';
  }
  return 'high';
}

function computeEdgeStrategy(
  edgeCount: number,
  quality: QualityLevel,
  configPreference: EdgePathStrategy
): EdgePathStrategy {
  if (quality === 'low' || edgeCount > 200) {
    return 'straight';
  }
  if (edgeCount > 120) {
    return configPreference;
  }
  if (quality === 'high') {
    return 'bezier';
  }
  return 'smoothstep';
}

export function useOptimizedCanvas({
  components,
  connections,
  selectedComponentId = null,
  config,
  callbacks,
  reactFlowInstance,
  viewportSize = WINDOW
    ? { width: WINDOW.innerWidth, height: WINDOW.innerHeight }
    : DEFAULT_VIEWPORT_SIZE,
  debugLabel = 'OptimizedCanvas',
}: UseOptimizedCanvasParams): UseOptimizedCanvasResult {
  const mergedConfig = useMemo<UseOptimizedCanvasConfig>(() => {
    const merged = { ...DEFAULT_CONFIG, ...config };
    if (config?.maxNodeCacheSize) {
      merged.maxNodeCacheSize = Math.max(50, config.maxNodeCacheSize);
    }
    if (config?.maxEdgeCacheSize) {
      merged.maxEdgeCacheSize = Math.max(50, config.maxEdgeCacheSize);
    }
    return merged;
  }, [config]);

  const renderStartRef = useRef(now());
  renderStartRef.current = now();

  const stableComponents = useStableArray(components);
  const stableConnections = useStableArray(connections);

  const viewport = useViewport();
  const [debouncedViewport, setDebouncedViewport] = useState<Viewport>(viewport);

  const nodeCacheRef = useRef<LRUCache<string, ReactFlowNode<CanvasNodeData>>>(
    new LRUCache<string, ReactFlowNode<CanvasNodeData>>(mergedConfig.maxNodeCacheSize)
  );
  const edgeCacheRef = useRef<LRUCache<string, ReactFlowEdge<CanvasEdgeData>>>(
    new LRUCache<string, ReactFlowEdge<CanvasEdgeData>>(mergedConfig.maxEdgeCacheSize)
  );

  useEffect(() => {
    if (nodeCacheRef.current.maxSize !== mergedConfig.maxNodeCacheSize) {
      nodeCacheRef.current = new LRUCache<string, ReactFlowNode<CanvasNodeData>>(
        mergedConfig.maxNodeCacheSize
      );
    }
  }, [mergedConfig.maxNodeCacheSize]);

  useEffect(() => {
    if (edgeCacheRef.current.maxSize !== mergedConfig.maxEdgeCacheSize) {
      edgeCacheRef.current = new LRUCache<string, ReactFlowEdge<CanvasEdgeData>>(
        mergedConfig.maxEdgeCacheSize
      );
    }
  }, [mergedConfig.maxEdgeCacheSize]);

  const selectionRef = useRef<{ nodes: Set<string>; edges: Set<string> }>({
    nodes: new Set<string>(),
    edges: new Set<string>(),
  });
  const [selectionVersion, setSelectionVersion] = useState(0);

  const bumpSelectionVersion = useCallback(() => {
    setSelectionVersion(prev => (prev + 1) % Number.MAX_SAFE_INTEGER);
  }, []);

  const canvasActions = useCanvasActions();
  const canvasSnapshot = useCanvasStore(
    useCallback(
      state => ({
        components: state.components,
        connections: state.connections,
        selectedComponent: state.selectedComponent,
      }),
      []
    ),
    shallow
  );

  useEffect(() => {
    if (!arraysDeepEqual(canvasSnapshot.components, stableComponents as DesignComponent[])) {
      canvasActions.setComponents(stableComponents as DesignComponent[], { silent: true });
    }
    if (!arraysDeepEqual(canvasSnapshot.connections, stableConnections as DesignConnection[])) {
      canvasActions.setConnections(stableConnections as DesignConnection[], { silent: true });
    }
    if (canvasSnapshot.selectedComponent !== selectedComponentId) {
      canvasActions.setSelectedComponent(selectedComponentId ?? null, { silent: true });
    }
  }, [
    canvasActions,
    canvasSnapshot.components,
    canvasSnapshot.connections,
    canvasSnapshot.selectedComponent,
    selectedComponentId,
    stableComponents,
    stableConnections,
  ]);

  useEffect(() => {
    const selection = selectionRef.current.nodes;
    if (selectedComponentId && !selection.has(selectedComponentId)) {
      selection.clear();
      selection.add(selectedComponentId);
      bumpSelectionVersion();
    }
    if (!selectedComponentId && selection.size > 0) {
      selection.clear();
      bumpSelectionVersion();
    }
  }, [selectedComponentId, bumpSelectionVersion]);

  const latestCallbacksRef = useRef<Required<UseOptimizedCanvasCallbacks>>({
    onNodesChange: undefined,
    onEdgesChange: undefined,
    onConnect: undefined,
    onCreateConnection: undefined,
    onSelectionChange: undefined,
    onViewportChange: undefined,
    onPerformanceEvent: undefined,
  });

  useEffect(() => {
    latestCallbacksRef.current = {
      onNodesChange: callbacks?.onNodesChange,
      onEdgesChange: callbacks?.onEdgesChange,
      onConnect: callbacks?.onConnect,
      onCreateConnection: callbacks?.onCreateConnection,
      onSelectionChange: callbacks?.onSelectionChange,
      onViewportChange: callbacks?.onViewportChange,
      onPerformanceEvent: callbacks?.onPerformanceEvent,
    };
  }, [callbacks]);

  const viewportDebounce = useMemo(
    () =>
      createDebouncedFunction(
        (nextViewport: Viewport) => {
          setDebouncedViewport(nextViewport);
          latestCallbacksRef.current.onViewportChange?.(nextViewport);
        },
        mergedConfig.viewportDebounceMs
      ),
    [mergedConfig.viewportDebounceMs]
  );

  useEffect(() => {
    viewportDebounce(viewport);
    return () => {
      viewportDebounce.cancel();
    };
  }, [viewport, viewportDebounce]);

  const renderGuard = useRenderGuard('useOptimizedCanvas', {
    suppressErrors: true,
    warningThreshold: 45,
    errorThreshold: 90,
    context: () => ({
      nodes: stableComponents.length,
      edges: stableConnections.length,
      virtualization: mergedConfig.forceVirtualization ?? undefined,
    }),
  });

  const virtualizationInfo = useMemo(() => {
    const shouldVirtualize =
      mergedConfig.forceVirtualization ??
      stableComponents.length > mergedConfig.virtualizationThreshold;
    const safeViewportSize = viewportSize ?? DEFAULT_VIEWPORT_SIZE;
    const visibleIds = shouldVirtualize
      ? computeVisibleComponentIds(
          stableComponents,
          viewport,
          safeViewportSize,
          mergedConfig.virtualizationBufferPx,
          mergedConfig.virtualizationOverscanPx
        )
      : new Set<string>();
    return {
      enabled: shouldVirtualize,
      visibleComponentIds: visibleIds,
    };
  }, [
    mergedConfig.forceVirtualization,
    mergedConfig.virtualizationBufferPx,
    mergedConfig.virtualizationOverscanPx,
    mergedConfig.virtualizationThreshold,
    stableComponents,
    viewport,
    viewportSize,
  ]);

  const lastGoodNodesRef = useRef<ReactFlowNode<CanvasNodeData>[]>([]);
  const lastGoodEdgesRef = useRef<ReactFlowEdge<CanvasEdgeData>[]>([]);

  const nodes = useMemo(() => {
    if (renderGuard.shouldPause) {
      return lastGoodNodesRef.current;
    }

    const selection = selectionRef.current.nodes;
    const nodesResult: ReactFlowNode<CanvasNodeData>[] = [];
    const nodeCache = nodeCacheRef.current;

    try {
      for (const component of stableComponents) {
        if (
          virtualizationInfo.enabled &&
          !virtualizationInfo.visibleComponentIds.has(component.id)
        ) {
          continue;
        }

        const selected = selection.has(component.id);
        const cacheKey = createComponentSignature(component, selected);
        const cached = nodeCache.get(cacheKey);
        if (cached) {
          nodesResult.push(cached);
          continue;
        }

        const node: ReactFlowNode<CanvasNodeData> = {
          id: component.id,
          type: 'optimizedNode',
          position: { x: component.x, y: component.y },
          data: {
            component,
            selected,
            label: component.label,
            description: component.description,
            theme: canvasSnapshot?.visualTheme,
          },
          draggable: true,
          selectable: true,
          parentNode: component.layerId ?? undefined,
        };

        nodeCache.set(cacheKey, node);
        nodesResult.push(node);
      }
      lastGoodNodesRef.current = nodesResult;
      return nodesResult;
    } catch (error) {
      addError(error instanceof Error ? error : new Error(String(error)), 'performance', {
        additionalData: { scope: 'useOptimizedCanvas::nodes' },
      });
      return lastGoodNodesRef.current;
    }
  }, [
    canvasSnapshot?.visualTheme,
    renderGuard.shouldPause,
    stableComponents,
    virtualizationInfo.enabled,
    virtualizationInfo.visibleComponentIds,
  ]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, ReactFlowNode<CanvasNodeData>>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const metricsStateRef = useRef({
    metricsVersion: 0,
    isMounted: true,
  });

  useEffect(
    () => () => {
      metricsStateRef.current.isMounted = false;
    },
    []
  );

  const performanceMetrics = useMemo(
    () => componentOptimizer.getMetrics(COMPONENT_ID),
    [metricsStateRef.current.metricsVersion]
  );
  const performanceInsights = useMemo(
    () => componentOptimizer.getInsights(COMPONENT_ID),
    [metricsStateRef.current.metricsVersion]
  );

  const qualityLevel = useMemo(
    () => computeQualityLevel(nodes.length, stableConnections.length, performanceMetrics),
    [nodes.length, performanceMetrics, stableConnections.length]
  );

  const edgeStrategy = useMemo(
    () => computeEdgeStrategy(stableConnections.length, qualityLevel, mergedConfig.highDensityEdgeStrategy),
    [mergedConfig.highDensityEdgeStrategy, qualityLevel, stableConnections.length]
  );

  const edges = useMemo(() => {
    if (renderGuard.shouldPause) {
      return lastGoodEdgesRef.current;
    }

    const edgeCache = edgeCacheRef.current;
    const edgesResult: ReactFlowEdge<CanvasEdgeData>[] = [];

    try {
      for (const connection of stableConnections) {
        if (!nodeMap.has(connection.from) || !nodeMap.has(connection.to)) {
          continue;
        }

        if (
          virtualizationInfo.enabled &&
          !(
            virtualizationInfo.visibleComponentIds.has(connection.from) ||
            virtualizationInfo.visibleComponentIds.has(connection.to)
          )
        ) {
          continue;
        }

        const cacheKey = createConnectionSignature(connection, qualityLevel, edgeStrategy);
        const cached = edgeCache.get(cacheKey);
        if (cached) {
          edgesResult.push(cached);
          continue;
        }

        const edge: ReactFlowEdge<CanvasEdgeData> = {
          id: connection.id,
          source: connection.from,
          target: connection.to,
          animated: connection.type === 'async',
          label: connection.label,
          type: 'optimizedEdge',
          selectable: true,
          data: {
            connection,
            quality: qualityLevel,
            pathStrategy: edgeStrategy,
            visualPriority: mapConnectionTypeToPriority(connection.type),
          },
        };

        edgeCache.set(cacheKey, edge);
        edgesResult.push(edge);
      }

      lastGoodEdgesRef.current = edgesResult;
      return edgesResult;
    } catch (error) {
      addError(error instanceof Error ? error : new Error(String(error)), 'performance', {
        additionalData: { scope: 'useOptimizedCanvas::edges' },
      });
      return lastGoodEdgesRef.current;
    }
  }, [
    edgeStrategy,
    nodeMap,
    qualityLevel,
    renderGuard.shouldPause,
    stableConnections,
    virtualizationInfo.enabled,
    virtualizationInfo.visibleComponentIds,
  ]);

  const virtualizationSummary: VirtualizationSummary = useMemo(
    () => ({
      enabled: virtualizationInfo.enabled,
      visibleNodeCount: nodes.length,
      totalNodeCount: stableComponents.length,
      threshold: mergedConfig.virtualizationThreshold,
    }),
    [
      mergedConfig.virtualizationThreshold,
      nodes.length,
      stableComponents.length,
      virtualizationInfo.enabled,
    ]
  );

  const positionChangeBufferRef = useRef<NodeChange[]>([]);
  const pendingEdgeChangesRef = useRef<EdgeChange[]>([]);

  const flushNodePositionChanges = useMemo(
    () =>
      createDebouncedFunction(() => {
        if (positionChangeBufferRef.current.length === 0) return;
        const queued = [...positionChangeBufferRef.current];
        positionChangeBufferRef.current.length = 0;
        latestCallbacksRef.current.onNodesChange?.(queued);
      }, mergedConfig.positionChangeDebounceMs),
    [mergedConfig.positionChangeDebounceMs]
  );

  const flushEdgeChanges = useMemo(
    () =>
      createDebouncedFunction(() => {
        if (pendingEdgeChangesRef.current.length === 0) return;
        const queued = [...pendingEdgeChangesRef.current];
        pendingEdgeChangesRef.current.length = 0;
        latestCallbacksRef.current.onEdgesChange?.(queued);
      }, mergedConfig.zoomChangeDebounceMs),
    [mergedConfig.zoomChangeDebounceMs]
  );

  const updateSelectionState = useCallback(
    (nextNodes: ReactFlowNode[], nextEdges: ReactFlowEdge[]) => {
      const nodeSet = selectionRef.current.nodes;
      const edgeSet = selectionRef.current.edges;

      const nextNodeIds = new Set(nextNodes.map(node => node.id));
      const nextEdgeIds = new Set(nextEdges.map(edge => edge.id));

      let changed = false;

      if (nodeSet.size !== nextNodeIds.size || edgeSet.size !== nextEdgeIds.size) {
        changed = true;
      } else {
        for (const id of nodeSet) {
          if (!nextNodeIds.has(id)) {
            changed = true;
            break;
          }
        }
        if (!changed) {
          for (const id of edgeSet) {
            if (!nextEdgeIds.has(id)) {
              changed = true;
              break;
            }
          }
        }
      }

      if (changed) {
        selectionRef.current = {
          nodes: nextNodeIds,
          edges: nextEdgeIds,
        };
        bumpSelectionVersion();
        latestCallbacksRef.current.onSelectionChange?.({
          nodeIds: Array.from(nextNodeIds),
          edgeIds: Array.from(nextEdgeIds),
        });
        if (nextNodes.length === 1) {
          canvasActions.setSelectedComponent(nextNodes[0].id);
        }
        if (nextNodes.length === 0 && selectedComponentId) {
          canvasActions.setSelectedComponent(null);
        }
      }
    },
    [bumpSelectionVersion, canvasActions, selectedComponentId]
  );

  const handleNodesChange: OnNodesChange = useCallback(
    changes => {
      if (!changes || changes.length === 0) return;

      const immediateChanges: NodeChange[] = [];
      let selectionChanged = false;

      for (const change of changes) {
        if (change.type === 'position' && change.dragging) {
          positionChangeBufferRef.current.push(change);
          continue;
        }

        if (change.type === 'select') {
          selectionChanged = true;
        }

        immediateChanges.push(change);
      }

      if (positionChangeBufferRef.current.length > 0) {
        flushNodePositionChanges();
      }

      if (immediateChanges.length > 0) {
        latestCallbacksRef.current.onNodesChange?.(immediateChanges);
      }

      if (selectionChanged && reactFlowInstance) {
        const current = reactFlowInstance.getSelectedElements?.() ?? {
          nodes: reactFlowInstance.getSelectedNodes?.() ?? [],
          edges: reactFlowInstance.getSelectedEdges?.() ?? [],
        };
        updateSelectionState(current.nodes ?? [], current.edges ?? []);
      }
    },
    [flushNodePositionChanges, reactFlowInstance, updateSelectionState]
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    changes => {
      if (!changes || changes.length === 0) return;

      const immediate: EdgeChange[] = [];

      for (const change of changes) {
        if (change.type === 'select') {
          immediate.push(change);
        } else {
          pendingEdgeChangesRef.current.push(change);
        }
      }

      if (immediate.length > 0) {
        latestCallbacksRef.current.onEdgesChange?.(immediate);
      }

      if (pendingEdgeChangesRef.current.length > 0) {
        flushEdgeChanges();
      }

      if (reactFlowInstance) {
        const current = reactFlowInstance.getSelectedElements?.() ?? {
          nodes: reactFlowInstance.getSelectedNodes?.() ?? [],
          edges: reactFlowInstance.getSelectedEdges?.() ?? [],
        };
        updateSelectionState(current.nodes ?? [], current.edges ?? []);
      }
    },
    [flushEdgeChanges, reactFlowInstance, updateSelectionState]
  );

  const handleConnect: OnConnect = useCallback(
    connection => {
      latestCallbacksRef.current.onConnect?.(connection);
      if (!latestCallbacksRef.current.onCreateConnection) return;

      const domainConnection: DesignConnection = {
        id: generateId('connection'),
        from: connection.source ?? '',
        to: connection.target ?? '',
        type: 'data',
        label: connection.label ?? '',
        protocol: undefined,
        direction: 'none',
        visualStyle: 'default',
      };

      latestCallbacksRef.current.onCreateConnection(domainConnection);
    },
    []
  );

  const handleSelectionChange = useCallback<SelectionChangeHandler>(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      updateSelectionState(selectedNodes, selectedEdges);
    },
    [updateSelectionState]
  );

  useEffect(() => {
    const duration = Math.max(0, now() - renderStartRef.current);
    if (!mergedConfig.performanceTracking) return;

    const previous = metricsStateRef.current;
    const commitType = previous.metricsVersion === 0 ? 'mount' : 'update';

    const prevSnapshot = (metricsStateRef.current as unknown as {
      components?: readonly DesignComponent[];
      connections?: readonly DesignConnection[];
      selectedId?: string | null;
    }) || {};

    const changedProps: string[] = [];
    if (!arraysDeepEqual(prevSnapshot.components ?? [], stableComponents)) {
      changedProps.push('components');
    }
    if (!arraysDeepEqual(prevSnapshot.connections ?? [], stableConnections)) {
      changedProps.push('connections');
    }
    if (prevSnapshot.selectedId !== selectedComponentId) {
      changedProps.push('selectedComponentId');
    }

    componentOptimizer.recordSample({
      componentId: COMPONENT_ID,
      duration,
      timestamp: Date.now(),
      commitType,
      propsChanged: changedProps,
    });

    (metricsStateRef.current as unknown as {
      components: readonly DesignComponent[];
      connections: readonly DesignConnection[];
      selectedId: string | null;
    }).components = stableComponents;
    (metricsStateRef.current as unknown as {
      components: readonly DesignComponent[];
      connections: readonly DesignConnection[];
      selectedId: string | null;
    }).connections = stableConnections;
    (metricsStateRef.current as unknown as {
      components: readonly DesignComponent[];
      connections: readonly DesignConnection[];
      selectedId: string | null;
    }).selectedId = selectedComponentId ?? null;

    metricsStateRef.current.metricsVersion += 1;

    latestCallbacksRef.current.onPerformanceEvent?.({
      metrics: componentOptimizer.getMetrics(COMPONENT_ID),
      insights: componentOptimizer.getInsights(COMPONENT_ID),
    });

    if (duration > 32) {
      addPerformanceError(
        `useOptimizedCanvas render exceeded budget (${duration.toFixed(2)}ms)`,
        { renderTime: duration, timestamp: Date.now() },
        { additionalData: { debugLabel } }
      );
    }
  }, [
    debugLabel,
    mergedConfig.performanceTracking,
    selectedComponentId,
    stableComponents,
    stableConnections,
  ]);

  useEffect(() => {
    InfiniteLoopDetector.recordRender(COMPONENT_ID, {
      componentName: COMPONENT_ID,
      timestamp: Date.now(),
      renderCount: renderGuard.renderCount,
      sinceFirstRenderMs: renderGuard.sinceFirstRenderMs,
      sincePreviousRenderMs: renderGuard.sincePreviousRenderMs,
      context: {
        virtualization: virtualizationSummary,
        qualityLevel,
        edgeStrategy,
      },
    });
  }, [
    edgeStrategy,
    qualityLevel,
    renderGuard.renderCount,
    renderGuard.sinceFirstRenderMs,
    renderGuard.sincePreviousRenderMs,
    virtualizationSummary,
  ]);

  const fitViewOptions = useMemo<FitViewOptions>(
    () => ({
      padding: qualityLevel === 'high' ? 0.2 : 0.1,
      duration: qualityLevel === 'low' ? 0 : 200,
      includeHiddenNodes: !virtualizationSummary.enabled,
    }),
    [qualityLevel, virtualizationSummary.enabled]
  );

  const defaultEdgeOptions = useMemo<DefaultEdgeOptions>(
    () => ({
      type: 'optimizedEdge',
      animated: qualityLevel === 'high',
    }),
    [qualityLevel]
  );

  const reactFlowProps = useMemo(
    () => ({
      nodes,
      edges,
      onlyRenderVisibleElements: virtualizationSummary.enabled,
      nodeOrigin: [0.5, 0.5] as [number, number],
      fitViewOptions,
      defaultEdgeOptions,
      proOptions: { hideAttribution: true },
    }),
    [defaultEdgeOptions, edges, fitViewOptions, nodes, virtualizationSummary.enabled]
  );

  const selectionSnapshot = useMemo(
    () => ({
      nodeIds: new Set(selectionRef.current.nodes),
      edgeIds: new Set(selectionRef.current.edges),
      version: selectionVersion,
    }),
    [selectionVersion]
  );

  return {
    nodes,
    edges,
    reactFlowProps,
    handlers: {
      onNodesChange: handleNodesChange,
      onEdgesChange: handleEdgesChange,
      onConnect: handleConnect,
      onSelectionChange: handleSelectionChange,
    },
    selection: selectionSnapshot,
    viewport: {
      current: viewport,
      debounced: debouncedViewport,
    },
    performance: {
      metrics: performanceMetrics,
      insights: performanceInsights,
      qualityLevel,
      edgePathStrategy: edgeStrategy,
      virtualization: virtualizationSummary,
    },
    config: mergedConfig,
  };
}

export type { CanvasNodeData, CanvasEdgeData, UseOptimizedCanvasConfig, UseOptimizedCanvasParams };