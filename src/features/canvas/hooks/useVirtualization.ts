/**
 * /src/features/canvas/hooks/useVirtualization.ts
 * React hooks for managing virtualization features including viewport tracking and spatial indexing
 * Provides viewport tracking, spatial indexing, and performance optimization for large datasets
 * RELEVANT FILES: src/lib/spatial/RTree.ts, src/lib/performance/CanvasPerformanceManager.ts, src/features/canvas/components/ReactFlowCanvas.tsx, src/features/canvas/utils/virtualization.ts
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, Viewport } from '@xyflow/react';
import { useDebouncedCallback } from 'use-debounce';
import { RTree, SpatialItem, BoundingBoxImpl } from '../../../lib/spatial/RTree';
import { CanvasPerformanceManager } from '../../../lib/performance/CanvasPerformanceManager';
import type { DesignComponent, Connection } from '../../../shared/contracts';
import type {
  VirtualizationConfig,
  VirtualizationStats,
  LODThreshold,
  LODLevel,
  LODConfig,
} from '../utils/virtualization';
import { optimizeItemsForZoom, getLODLevel } from '../utils/virtualization';

export interface UseViewportTrackingOptions {
  bufferZone?: number;
  debounceMs?: number;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export interface UseViewportTrackingResult {
  viewport: Viewport;
  visibleBounds: BoundingBoxImpl;
  isViewportStable: boolean;
}

export interface UseSpatialIndexOptions {
  enabled?: boolean;
  rebuildThreshold?: number;
  sizeMap?: Map<string, { width: number; height: number }>;
}

export interface UseSpatialIndexResult<T> {
  queryVisible: (bounds: BoundingBoxImpl) => SpatialItem<T>[];
  updateItem: (id: string, bounds: BoundingBoxImpl) => boolean;
  indexStats: {
    itemCount: number;
    removeCount: number;
    height: number;
    needsRebuild: boolean;
  };
  isReady: boolean;
}

export interface UseVisibleItemsOptions {
  maxItems?: number;
  priorityRadius?: number;
}

export interface UseVisibleItemsResult<T> {
  visibleComponents: SpatialItem<DesignComponent>[];
  visibleConnections: SpatialItem<Connection>[];
  totalVisible: number;
  isLimited: boolean;
}

export interface UseLevelOfDetailOptions {
  thresholds?: LODThreshold[];
  enabled?: boolean;
}

export interface UseLevelOfDetailResult {
  currentLOD: LODLevel;
  shouldShowLabels: boolean;
  shouldShowDetails: boolean;
  qualityMultiplier: number;
}

export interface UseVirtualizationPerformanceResult {
  metrics: VirtualizationStats;
  recommendations: Array<{
    type: 'warning' | 'suggestion' | 'critical';
    message: string;
    action: string;
  }>;
  adjustQuality: (delta: number) => void;
}

/**
 * Hook for tracking React Flow viewport changes with debouncing
 */
export function useViewportTracking(
  options: UseViewportTrackingOptions = {}
): UseViewportTrackingResult {
  const { bufferZone = 200, debounceMs = 50, containerRef } = options;
  const reactFlow = useReactFlow();
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [isViewportStable, setIsViewportStable] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 });

  // Debounced viewport update handler
  const debouncedViewportUpdate = useDebouncedCallback((newViewport: Viewport) => {
    setViewport(newViewport);
    setIsViewportStable(true);
  }, debounceMs);

  // Immediate viewport change handler
  const handleViewportChange = useCallback(
    (newViewport: Viewport) => {
      setIsViewportStable(false);
      debouncedViewportUpdate(newViewport);
    },
    [debouncedViewportUpdate]
  );

  // Set up viewport change listener
  useEffect(() => {
    if (!reactFlow) return;

    const currentViewport = reactFlow.getViewport();
    setViewport(currentViewport);

    const unsubscribe = reactFlow.onViewportChange?.(handleViewportChange);
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [reactFlow, handleViewportChange]);

  // Set up ResizeObserver to track container size
  useEffect(() => {
    if (!containerRef?.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    // Set initial size
    const rect = containerRef.current.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // Calculate visible bounds with buffer zone
  const visibleBounds = useMemo(() => {
    const { x, y, zoom } = viewport;
    const { width: viewportWidth, height: viewportHeight } = containerSize;

    // Transform viewport coordinates to world coordinates
    const worldX = -x / zoom;
    const worldY = -y / zoom;
    const worldWidth = viewportWidth / zoom;
    const worldHeight = viewportHeight / zoom;

    // Expand with buffer zone
    const bufferedX = worldX - bufferZone / zoom;
    const bufferedY = worldY - bufferZone / zoom;
    const bufferedWidth = worldWidth + (bufferZone * 2) / zoom;
    const bufferedHeight = worldHeight + (bufferZone * 2) / zoom;

    return new BoundingBoxImpl(bufferedX, bufferedY, bufferedWidth, bufferedHeight);
  }, [viewport, bufferZone, containerSize]);

  return { viewport, visibleBounds, isViewportStable };
}

/**
 * Hook for managing spatial index with components and connections
 */
export function useSpatialIndex<T>(
  components: DesignComponent[],
  connections: Connection[],
  options: UseSpatialIndexOptions = {}
): UseSpatialIndexResult<T> {
  const { enabled = true, rebuildThreshold = 50, sizeMap } = options;
  const rtreeRef = useRef<RTree<T>>(new RTree<T>());
  const [isReady, setIsReady] = useState(false);
  const [indexStats, setIndexStats] = useState({
    itemCount: 0,
    removeCount: 0,
    height: 0,
    needsRebuild: false,
  });

  // Rebuild spatial index when components or connections change
  useEffect(() => {
    if (!enabled) {
      setIsReady(false);
      return;
    }

    const rebuildIndex = () => {
      const startTime = performance.now();
      const items: SpatialItem<T>[] = [];

      // Add components to spatial index
      components.forEach(component => {
        const bounds = BoundingBoxImpl.fromComponent(component, sizeMap);
        items.push({
          id: component.id,
          bounds,
          data: component as unknown as T,
          type: 'component',
        });
      });

      // Add connections to spatial index
      connections.forEach(connection => {
        const bounds = BoundingBoxImpl.fromConnection(connection, components);
        if (bounds.width > 0 && bounds.height > 0) {
          items.push({
            id: connection.id,
            bounds,
            data: connection as unknown as T,
            type: 'connection',
          });
        }
      });

      // Use bulk load for efficient initial population
      rtreeRef.current.clear();
      rtreeRef.current.bulkLoad(items);

      const duration = performance.now() - startTime;
      const stats = rtreeRef.current.getStats();
      setIndexStats(stats);
      setIsReady(true);

      // Record performance metrics
      const performanceManager = CanvasPerformanceManager.getInstance();
      performanceManager.recordReactFlowMetric(
        'spatial-index',
        'rebuild',
        duration,
        items.length
      );
    };

    rebuildIndex();
  }, [components, connections, enabled, sizeMap]);

  // Memoized query function
  const queryVisible = useCallback(
    (bounds: BoundingBoxImpl): SpatialItem<T>[] => {
      if (!enabled || !isReady) return [];

      const startTime = performance.now();
      const results = rtreeRef.current.query(bounds);
      const duration = performance.now() - startTime;

      // Record query performance
      const performanceManager = CanvasPerformanceManager.getInstance();
      performanceManager.recordReactFlowMetric(
        'spatial-index',
        'query',
        duration,
        results.length
      );

      return results;
    },
    [enabled, isReady]
  );

  // Update individual item bounds
  const updateItem = useCallback(
    (id: string, bounds: BoundingBoxImpl): boolean => {
      if (!enabled || !isReady) return false;

      const success = rtreeRef.current.update(id, bounds);
      if (success) {
        setIndexStats(rtreeRef.current.getStats());
      }

      return success;
    },
    [enabled, isReady]
  );

  return {
    queryVisible,
    updateItem,
    indexStats,
    isReady,
  };
}

/**
 * Hook for querying visible items with level-of-detail filtering
 */
export function useVisibleItems<T>(
  spatialIndex: UseSpatialIndexResult<T>,
  visibleBounds: BoundingBoxImpl,
  lodConfig: LODConfig,
  options: UseVisibleItemsOptions = {}
): UseVisibleItemsResult<T> {
  const { maxItems = 1000, priorityRadius = 500 } = options;

  return useMemo(() => {
    if (!spatialIndex.isReady) {
      return {
        visibleComponents: [],
        visibleConnections: [],
        totalVisible: 0,
        isLimited: false,
      };
    }

    const allVisible = spatialIndex.queryVisible(visibleBounds);

    // Separate components and connections
    let visibleComponents = allVisible.filter(item => item.type === 'component') as SpatialItem<DesignComponent>[];
    let visibleConnections = allVisible.filter(item => item.type === 'connection') as SpatialItem<Connection>[];

    // Apply LOD filtering if enabled
    if (lodConfig.enabled && lodConfig.thresholds.length > 0) {
      // Get current zoom level from visible bounds (approximated)
      const estimatedZoom = Math.max(0.1, Math.min(2, 1000 / visibleBounds.width));
      const currentLOD = getLODLevel(estimatedZoom, lodConfig.thresholds);

      // Filter components based on LOD
      visibleComponents = optimizeItemsForZoom(visibleComponents, estimatedZoom, 0.5);
      visibleConnections = optimizeItemsForZoom(visibleConnections, estimatedZoom, 0.5);

      // Optionally reduce max items based on LOD level
      if (currentLOD === LODLevel.LOW) {
        maxItems = Math.floor(maxItems * 0.3);
      } else if (currentLOD === LODLevel.MEDIUM) {
        maxItems = Math.floor(maxItems * 0.7);
      }
    }

    // Apply item limit if necessary
    let limitedComponents = visibleComponents;
    let limitedConnections = visibleConnections;
    let isLimited = false;

    const totalVisible = visibleComponents.length + visibleConnections.length;
    if (totalVisible > maxItems) {
      isLimited = true;

      // Calculate viewport center for priority sorting
      const viewportCenterX = visibleBounds.x + visibleBounds.width / 2;
      const viewportCenterY = visibleBounds.y + visibleBounds.height / 2;

      // Priority function: distance from viewport center
      const calculatePriority = (item: SpatialItem<any>): number => {
        const itemCenterX = item.bounds.x + item.bounds.width / 2;
        const itemCenterY = item.bounds.y + item.bounds.height / 2;
        const distance = Math.sqrt(
          Math.pow(itemCenterX - viewportCenterX, 2) + Math.pow(itemCenterY - viewportCenterY, 2)
        );
        return Math.max(0, priorityRadius - distance);
      };

      // Sort by priority and limit
      const sortedComponents = [...visibleComponents].sort(
        (a, b) => calculatePriority(b) - calculatePriority(a)
      );
      const sortedConnections = [...visibleConnections].sort(
        (a, b) => calculatePriority(b) - calculatePriority(a)
      );

      // Maintain proportional representation
      const componentRatio = visibleComponents.length / totalVisible;
      const maxComponents = Math.floor(maxItems * componentRatio);
      const maxConnections = maxItems - maxComponents;

      limitedComponents = sortedComponents.slice(0, maxComponents);
      limitedConnections = sortedConnections.slice(0, maxConnections);
    }

    return {
      visibleComponents: limitedComponents,
      visibleConnections: limitedConnections,
      totalVisible,
      isLimited,
    };
  }, [spatialIndex, visibleBounds, lodConfig, maxItems, priorityRadius]);
}

/**
 * Hook for level-of-detail calculations based on zoom level
 */
export function useLevelOfDetail(
  zoom: number,
  options: UseLevelOfDetailOptions = {}
): UseLevelOfDetailResult {
  const {
    thresholds = [
      { zoom: 0.3, level: LODLevel.LOW, showLabels: false, showDetails: false },
      { zoom: 0.8, level: LODLevel.MEDIUM, showLabels: true, showDetails: false },
      { zoom: 1.5, level: LODLevel.HIGH, showLabels: true, showDetails: true },
    ],
    enabled = true,
  } = options;

  return useMemo(() => {
    if (!enabled) {
      return {
        currentLOD: LODLevel.HIGH,
        shouldShowLabels: true,
        shouldShowDetails: true,
        qualityMultiplier: 1.0,
      };
    }

    // Find appropriate threshold based on zoom level
    let currentThreshold = thresholds[thresholds.length - 1]; // Default to highest quality
    for (let i = 0; i < thresholds.length; i++) {
      if (zoom <= thresholds[i].zoom) {
        currentThreshold = thresholds[i];
        break;
      }
    }

    // Calculate quality multiplier based on LOD level
    const qualityMultipliers = {
      [LODLevel.LOW]: 0.3,
      [LODLevel.MEDIUM]: 0.7,
      [LODLevel.HIGH]: 1.0,
    };

    return {
      currentLOD: currentThreshold.level,
      shouldShowLabels: currentThreshold.showLabels,
      shouldShowDetails: currentThreshold.showDetails,
      qualityMultiplier: qualityMultipliers[currentThreshold.level],
    };
  }, [zoom, thresholds, enabled]);
}

/**
 * Hook for virtualization performance monitoring and optimization
 */
export function useVirtualizationPerformance(
  systemId = 'virtual-canvas'
): UseVirtualizationPerformanceResult {
  const [metrics, setMetrics] = useState<VirtualizationStats>({
    visibleComponents: 0,
    visibleConnections: 0,
    totalComponents: 0,
    totalConnections: 0,
    queryTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    fps: 60,
    qualityLevel: 1.0,
  });

  const [recommendations, setRecommendations] = useState<Array<{
    type: 'warning' | 'suggestion' | 'critical';
    message: string;
    action: string;
  }>>([]);

  // Get performance manager instance
  const performanceManager = useMemo(
    () => CanvasPerformanceManager.getInstance(),
    []
  );

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      const systemMetrics = performanceManager.getPerformanceMetrics();
      const reactFlowMetrics = performanceManager.getReactFlowMetrics(systemId);
      const aggregated = performanceManager.getAggregatedMetrics();

      if (reactFlowMetrics) {
        setMetrics({
          visibleComponents: reactFlowMetrics.visibleNodeCount || 0,
          visibleConnections: reactFlowMetrics.visibleEdgeCount || 0,
          totalComponents: reactFlowMetrics.nodeCount || 0,
          totalConnections: reactFlowMetrics.edgeCount || 0,
          queryTime: 0, // Would be tracked by spatial index queries
          renderTime: reactFlowMetrics.nodeRenderTime + reactFlowMetrics.edgeRenderTime,
          memoryUsage: aggregated.totalMemoryUsage,
          fps: aggregated.averageFPS,
          qualityLevel: performanceManager.getCurrentQualityLevel(),
        });
      }

      // Generate recommendations based on performance
      const newRecommendations: Array<{
        type: 'warning' | 'suggestion' | 'critical';
        message: string;
        action: string;
      }> = [];

      if (aggregated.averageFPS < 30) {
        newRecommendations.push({
          type: 'critical',
          message: 'Frame rate is critically low',
          action: 'Reduce visible components or enable performance mode',
        });
      } else if (aggregated.averageFPS < 50) {
        newRecommendations.push({
          type: 'warning',
          message: 'Frame rate is below optimal',
          action: 'Consider enabling LOD or reducing complexity',
        });
      }

      if (aggregated.totalMemoryUsage > 512) {
        newRecommendations.push({
          type: 'warning',
          message: 'Memory usage is high',
          action: 'Enable spatial culling and object pooling',
        });
      }

      setRecommendations(newRecommendations);
    };

    const interval = setInterval(updateMetrics, 1000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [performanceManager, systemId]);

  // Quality adjustment function
  const adjustQuality = useCallback(
    (delta: number) => {
      const currentLevel = performanceManager.getCurrentQualityLevel();
      const newLevel = Math.max(0.1, Math.min(1.0, currentLevel + delta));

      // This would need to be implemented in the performance manager
      // performanceManager.setQualityLevel(newLevel);
    },
    [performanceManager]
  );

  return {
    metrics,
    recommendations,
    adjustQuality,
  };
}