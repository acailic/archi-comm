/**
 * /src/features/canvas/utils/virtualization.ts
 * Utility functions for virtualization including viewport calculations and performance optimization
 * Provides viewport calculations, LOD utilities, spatial operations, and performance monitoring
 * RELEVANT FILES: src/lib/spatial/RTree.ts, src/shared/contracts/index.ts, src/features/canvas/hooks/useVirtualization.ts
 */

import type { Viewport } from '@xyflow/react';
import { BoundingBoxImpl, RTree, SpatialItem } from '@/lib/spatial/RTree';
import type { DesignComponent } from '@shared/contracts';

// Configuration interfaces
export interface VirtualizationConfig {
  enabled: boolean;
  bufferZone: number;
  maxVisibleItems: number;
  lodThresholds: LODThreshold[];
  enableSpatialIndex: boolean;
  enablePerformanceMonitoring: boolean;
  debugMode: boolean;
}

export interface LODThreshold {
  zoom: number;
  level: LODLevel;
  showLabels: boolean;
  showDetails: boolean;
}

export interface LODConfig {
  enabled: boolean;
  thresholds: LODThreshold[];
  adaptiveQuality?: boolean;
}

export enum LODLevel {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
}

// Statistics and metrics interfaces
export interface VirtualizationStats {
  visibleComponents: number;
  visibleConnections: number;
  totalComponents: number;
  totalConnections: number;
  queryTime: number;
  renderTime: number;
  memoryUsage: number;
  fps: number;
  qualityLevel: number;
}

export interface VirtualizationMetrics {
  timestamp: number;
  viewport: Viewport;
  stats: VirtualizationStats;
  performance: {
    spatialQueryTime: number;
    renderTime: number;
    totalTime: number;
  };
  recommendations: string[];
}

// Default configuration
export const DEFAULT_VIRTUALIZATION_CONFIG: VirtualizationConfig = {
  enabled: false,
  bufferZone: 200,
  maxVisibleItems: 1000,
  lodThresholds: [
    { zoom: 0.3, level: LODLevel.LOW, showLabels: false, showDetails: false },
    { zoom: 0.8, level: LODLevel.MEDIUM, showLabels: true, showDetails: false },
    { zoom: 1.5, level: LODLevel.HIGH, showLabels: true, showDetails: true },
  ],
  enableSpatialIndex: true,
  enablePerformanceMonitoring: true,
  debugMode: false,
};

// Viewport calculation utilities
export function calculateVisibleBounds(
  viewport: Viewport,
  bufferZone: number,
  viewportWidth: number,
  viewportHeight: number
): BoundingBoxImpl {
  const { x, y, zoom } = viewport;

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
}

export function isItemVisible(
  bounds: BoundingBoxImpl,
  visibleBounds: BoundingBoxImpl
): boolean {
  return bounds.intersects(visibleBounds);
}

export function getViewportCenter(viewport: Viewport, viewportWidth: number, viewportHeight: number): {
  x: number;
  y: number;
} {
  const { x, y, zoom } = viewport;
  return {
    x: (-x + viewportWidth / 2) / zoom,
    y: (-y + viewportHeight / 2) / zoom,
  };
}

export function calculateDistanceToViewport(
  itemBounds: BoundingBoxImpl,
  viewport: Viewport,
  viewportWidth: number,
  viewportHeight: number
): number {
  const viewportCenter = getViewportCenter(viewport, viewportWidth, viewportHeight);
  const itemCenterX = itemBounds.x + itemBounds.width / 2;
  const itemCenterY = itemBounds.y + itemBounds.height / 2;

  return Math.sqrt(
    Math.pow(itemCenterX - viewportCenter.x, 2) + Math.pow(itemCenterY - viewportCenter.y, 2)
  );
}

export function getViewportArea(viewport: Viewport, viewportWidth: number, viewportHeight: number): number {
  const { zoom } = viewport;
  return (viewportWidth * viewportHeight) / (zoom * zoom);
}

// Level-of-detail utilities
export function getLODLevel(zoom: number, thresholds: LODThreshold[]): LODLevel {
  // Find the appropriate threshold based on zoom level
  for (let i = 0; i < thresholds.length; i++) {
    if (zoom <= thresholds[i].zoom) {
      return thresholds[i].level;
    }
  }
  return thresholds[thresholds.length - 1].level;
}

export function shouldShowLabels(zoom: number, config: LODConfig): boolean {
  if (!config.enabled) return true;

  const threshold = config.thresholds.find(t => zoom <= t.zoom) || config.thresholds[config.thresholds.length - 1];
  return threshold.showLabels;
}

export function shouldShowDetails(zoom: number, config: LODConfig): boolean {
  if (!config.enabled) return true;

  const threshold = config.thresholds.find(t => zoom <= t.zoom) || config.thresholds[config.thresholds.length - 1];
  return threshold.showDetails;
}

export function getQualityMultiplier(lodLevel: LODLevel): number {
  switch (lodLevel) {
    case LODLevel.LOW:
      return 0.3;
    case LODLevel.MEDIUM:
      return 0.7;
    case LODLevel.HIGH:
      return 1.0;
    default:
      return 1.0;
  }
}

export function optimizeItemsForZoom<T>(
  items: SpatialItem<T>[],
  zoom: number,
  threshold = 0.5
): SpatialItem<T>[] {
  if (zoom >= threshold) return items;

  // At low zoom levels, filter out very small items to improve performance
  const minSize = 20 / zoom; // Minimum size in world coordinates
  return items.filter(item => item.bounds.width >= minSize || item.bounds.height >= minSize);
}

// Spatial optimization utilities
export function createBoundingBox(x: number, y: number, width: number, height: number): BoundingBoxImpl {
  return new BoundingBoxImpl(x, y, width, height);
}

export function expandBounds(bounds: BoundingBoxImpl, margin: number): BoundingBoxImpl {
  return new BoundingBoxImpl(
    bounds.x - margin,
    bounds.y - margin,
    bounds.width + margin * 2,
    bounds.height + margin * 2
  );
}

export function mergeBounds(bounds1: BoundingBoxImpl, bounds2: BoundingBoxImpl): BoundingBoxImpl {
  return bounds1.union(bounds2);
}

export function boundsIntersect(bounds1: BoundingBoxImpl, bounds2: BoundingBoxImpl): boolean {
  return bounds1.intersects(bounds2);
}

export function boundsContainsPoint(
  bounds: BoundingBoxImpl,
  x: number,
  y: number
): boolean {
  return bounds.contains({ x, y });
}

export function calculateBoundsFromComponents(components: DesignComponent[]): BoundingBoxImpl {
  if (components.length === 0) {
    return new BoundingBoxImpl(0, 0, 0, 0);
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  components.forEach(component => {
    const bounds = BoundingBoxImpl.fromComponent(component);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  return new BoundingBoxImpl(minX, minY, maxX - minX, maxY - minY);
}

// Performance optimization utilities
export function batchSpatialUpdates<T>(
  updates: Array<{ id: string; bounds: BoundingBoxImpl }>,
  index: RTree<T>
): void {
  const startTime = performance.now();

  // Process updates in batches to avoid blocking the main thread
  const batchSize = 50;
  let currentBatch = 0;

  const processBatch = () => {
    const start = currentBatch * batchSize;
    const end = Math.min(start + batchSize, updates.length);

    for (let i = start; i < end; i++) {
      const update = updates[i];
      index.update(update.id, update.bounds);
    }

    currentBatch++;

    if (end < updates.length) {
      // Use requestAnimationFrame for non-blocking batch processing
      requestAnimationFrame(processBatch);
    } else {
      const duration = performance.now() - startTime;
      console.log(`Batch spatial updates completed in ${duration.toFixed(2)}ms`);
    }
  };

  processBatch();
}

export function throttleViewportUpdates(callback: Function, delay: number): Function {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: any[]) => {
    const now = performance.now();

    if (now - lastCall >= delay) {
      lastCall = now;
      callback(...args);
    } else {
      // Clear previous timeout and set a new one
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = performance.now();
        callback(...args);
      }, delay - (now - lastCall));
    }
  };
}

// Simple LRU cache for memoizing viewport queries
class LRUCache<T> {
  private capacity: number;
  private cache = new Map<string, T>();

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used item
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const queryCache = new LRUCache<SpatialItem<any>[]>(100);

export function memoizeViewportQueries<T>(
  queryFn: (bounds: BoundingBoxImpl) => SpatialItem<T>[]
): (bounds: BoundingBoxImpl) => SpatialItem<T>[] {
  return (bounds: BoundingBoxImpl) => {
    const key = `${bounds.x.toFixed(1)},${bounds.y.toFixed(1)},${bounds.width.toFixed(1)},${bounds.height.toFixed(1)}`;
    const cached = queryCache.get(key);

    if (cached) {
      return cached as SpatialItem<T>[];
    }

    const result = queryFn(bounds);
    queryCache.set(key, result);
    return result;
  };
}

export function prioritizeVisibleItems<T>(
  items: SpatialItem<T>[],
  viewport: Viewport,
  maxCount: number,
  viewportWidth: number,
  viewportHeight: number
): SpatialItem<T>[] {
  if (items.length <= maxCount) return items;

  const viewportCenter = getViewportCenter(viewport, viewportWidth, viewportHeight);

  // Sort by distance from viewport center
  const sorted = [...items].sort((a, b) => {
    const distanceA = calculateDistanceToViewport(a.bounds, viewport, viewportWidth, viewportHeight);
    const distanceB = calculateDistanceToViewport(b.bounds, viewport, viewportWidth, viewportHeight);
    return distanceA - distanceB;
  });

  return sorted.slice(0, maxCount);
}

export function optimizeRenderList<T>(
  items: T[],
  maxCount: number,
  priorityFn: (item: T) => number
): T[] {
  if (items.length <= maxCount) return items;

  // Sort by priority (higher is better)
  const sorted = [...items].sort((a, b) => priorityFn(b) - priorityFn(a));
  return sorted.slice(0, maxCount);
}

// Debugging and monitoring utilities
export function logVirtualizationStats(stats: VirtualizationStats): void {
  if (!import.meta.env.DEV) return;

  console.group('🎯 Virtualization Stats');
  console.log(`📦 Components: ${stats.visibleComponents}/${stats.totalComponents}`);
  console.log(`🔗 Connections: ${stats.visibleConnections}/${stats.totalConnections}`);
  console.log(`⏱️  Query Time: ${stats.queryTime.toFixed(2)}ms`);
  console.log(`🖼️  Render Time: ${stats.renderTime.toFixed(2)}ms`);
  console.log(`💾 Memory: ${stats.memoryUsage.toFixed(1)}MB`);
  console.log(`📊 FPS: ${stats.fps.toFixed(1)}`);
  console.log(`⭐ Quality: ${(stats.qualityLevel * 100).toFixed(0)}%`);
  console.groupEnd();
}

export function measureSpatialQueryTime<T>(queryFn: () => T): { result: T; duration: number } {
  const startTime = performance.now();
  const result = queryFn();
  const duration = performance.now() - startTime;
  return { result, duration };
}

export function validateSpatialIndex<T>(index: RTree<T>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  let isValid = true;

  try {
    const stats = index.getStats();

    if (stats.itemCount < 0) {
      errors.push('Invalid item count');
      isValid = false;
    }

    if (stats.height < 0) {
      errors.push('Invalid tree height');
      isValid = false;
    }

    // Test basic functionality
    const testBounds = new BoundingBoxImpl(0, 0, 100, 100);
    const results = index.query(testBounds);

    if (!Array.isArray(results)) {
      errors.push('Query did not return array');
      isValid = false;
    }
  } catch (error) {
    errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    isValid = false;
  }

  return { isValid, errors };
}

export function exportVirtualizationMetrics(): VirtualizationMetrics {
  return {
    timestamp: Date.now(),
    viewport: { x: 0, y: 0, zoom: 1 }, // Would be actual viewport
    stats: {
      visibleComponents: 0,
      visibleConnections: 0,
      totalComponents: 0,
      totalConnections: 0,
      queryTime: 0,
      renderTime: 0,
      memoryUsage: 0,
      fps: 60,
      qualityLevel: 1.0,
    },
    performance: {
      spatialQueryTime: 0,
      renderTime: 0,
      totalTime: 0,
    },
    recommendations: [],
  };
}

export function createPerformanceReport(metrics: VirtualizationMetrics): string {
  const { stats, performance } = metrics;
  const efficiency = stats.totalComponents > 0
    ? (stats.visibleComponents / stats.totalComponents * 100).toFixed(1)
    : '0.0';

  return `
📊 Virtualization Performance Report
Generated: ${new Date(metrics.timestamp).toLocaleString()}

📈 Rendering Efficiency:
• Visible/Total Components: ${stats.visibleComponents}/${stats.totalComponents} (${efficiency}%)
• Visible/Total Connections: ${stats.visibleConnections}/${stats.totalConnections}
• Frame Rate: ${stats.fps.toFixed(1)} FPS
• Quality Level: ${(stats.qualityLevel * 100).toFixed(0)}%

⏱️  Performance Timing:
• Spatial Query Time: ${performance.spatialQueryTime.toFixed(2)}ms
• Render Time: ${performance.renderTime.toFixed(2)}ms
• Total Time: ${performance.totalTime.toFixed(2)}ms

💾 Resource Usage:
• Memory Usage: ${stats.memoryUsage.toFixed(1)}MB

🎯 Recommendations:
${metrics.recommendations.length > 0
  ? metrics.recommendations.map(r => `• ${r}`).join('\n')
  : '• No specific recommendations at this time'}
`.trim();
}
