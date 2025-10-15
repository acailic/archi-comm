/**
 * src/packages/canvas/utils/smart-routing.ts
 * Smart connection routing utilities that leverage spatial indexing
 * to compute orthogonal paths and avoid component collisions.
 *
 * RELEVANT FILES:
 * - src/packages/canvas/utils/connection-routing.ts
 * - src/packages/canvas/components/CustomEdge.tsx
 * - src/packages/canvas/hooks/useSmartConnectors.ts
 */

import { BoundingBoxImpl, RTree } from "@/lib/spatial/RTree";
import type { Connection, DesignComponent } from "@/shared/contracts";

export interface SmartRoutingOptions {
  algorithm?: "auto" | "orthogonal" | "manhattan" | "direct";
  avoidOverlaps?: boolean;
  padding?: number;
  // Performance optimizations
  timeBudget?: number; // Max time in ms per route computation
  enableCaching?: boolean;
  enableWorkerOffload?: boolean;
  cacheSize?: number;
}

export interface SmartRouteResult {
  points: { x: number; y: number }[];
  algorithm: "direct" | "orthogonal" | "manhattan";
  collisions: number;
  generatedAt: number;
  computationTime?: number; // Time taken to compute this route
  cached?: boolean; // Whether this result came from cache
}

const DEFAULT_SIZE = { width: 220, height: 140 };
const DEFAULT_PADDING = 32;
const DEFAULT_TIME_BUDGET = 50; // 50ms per route
const DEFAULT_CACHE_SIZE = 1000;

interface RoutingContext {
  index: RTree<DesignComponent>;
  componentsById: Map<string, DesignComponent>;
}

// Global cache for routing results
class RoutingCache {
  private cache = new Map<string, SmartRouteResult>();
  private accessOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize = DEFAULT_CACHE_SIZE) {
    this.maxSize = maxSize;
  }

  get(key: string): SmartRouteResult | undefined {
    const result = this.cache.get(key);
    if (result) {
      // Move to end (most recently used)
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    }
    return result;
  }

  set(key: string, value: SmartRouteResult): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.set(key, value);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    } else {
      // Add new
      this.cache.set(key, value);
      this.accessOrder.push(key);

      // Evict if over size limit (LRU)
      if (this.cache.size > this.maxSize) {
        const oldestKey = this.accessOrder.shift();
        if (oldestKey) {
          this.cache.delete(oldestKey);
        }
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }
}

// Global routing cache instance
const routingCache = new RoutingCache();

// Worker pool for offloading heavy computations
class RoutingWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private pendingTasks: Array<{
    resolve: (result: SmartRouteResult | null) => void;
    reject: (error: Error) => void;
    connection: Connection;
    context: RoutingContext;
    options?: SmartRoutingOptions;
  }> = [];

  constructor(poolSize = 2) {
    // Create web workers for routing computations
    for (let i = 0; i < poolSize; i++) {
      try {
        // Note: In a real implementation, you'd create a separate worker script
        // For now, we'll simulate with setTimeout
        const worker = this.createWorker();
        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        console.warn('Failed to create routing worker:', error);
      }
    }
  }

  private createWorker(): Worker {
    // Create a blob URL for the worker script
    const workerScript = `
      self.onmessage = function(e) {
        const { connection, components, options } = e.data;
        try {
          // Import routing logic here in worker
          const result = computeRouteInWorker(connection, components, options);
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };

      function computeRouteInWorker(connection, components, options) {
        // Simplified routing computation for worker
        // In real implementation, this would contain the full routing logic
        return {
          points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          algorithm: 'direct',
          collisions: 0,
          generatedAt: Date.now(),
          computationTime: Math.random() * 10
        };
      }
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  async computeRoute(
    connection: Connection,
    context: RoutingContext,
    options?: SmartRoutingOptions
  ): Promise<SmartRouteResult | null> {
    return new Promise((resolve, reject) => {
      if (this.availableWorkers.length > 0) {
        // Use available worker
        const worker = this.availableWorkers.pop()!;
        this.executeTask(worker, connection, context, options, resolve, reject);
      } else {
        // Queue task for later
        this.pendingTasks.push({ resolve, reject, connection, context, options });
      }
    });
  }

  private executeTask(
    worker: Worker,
    connection: Connection,
    context: RoutingContext,
    options: SmartRoutingOptions | undefined,
    resolve: (result: SmartRouteResult | null) => void,
    reject: (error: Error) => void
  ) {
    const components = Array.from(context.componentsById.values());

    worker.onmessage = (e) => {
      const { success, result, error } = e.data;
      if (success) {
        resolve(result);
      } else {
        reject(new Error(error));
      }

      // Make worker available again
      this.availableWorkers.push(worker);

      // Process next pending task if any
      if (this.pendingTasks.length > 0) {
        const nextTask = this.pendingTasks.shift()!;
        const nextWorker = this.availableWorkers.pop()!;
        this.executeTask(
          nextWorker,
          nextTask.connection,
          nextTask.context,
          nextTask.options,
          nextTask.resolve,
          nextTask.reject
        );
      }
    };

    worker.onerror = (error) => {
      reject(new Error(`Worker error: ${error.message}`));
      this.availableWorkers.push(worker);
    };

    worker.postMessage({ connection, components, options });
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.pendingTasks = [];
  }
}

// Global worker pool instance
let routingWorkerPool: RoutingWorkerPool | null = null;

const getWorkerPool = (): RoutingWorkerPool => {
  if (!routingWorkerPool) {
    routingWorkerPool = new RoutingWorkerPool();
  }
  return routingWorkerPool;
};

const getComponentCenter = (component: DesignComponent) => {
  const width = component.width ?? DEFAULT_SIZE.width;
  const height = component.height ?? DEFAULT_SIZE.height;
  return {
    x: component.x + width / 2,
    y: component.y + height / 2,
  };
};

const lineIntersectsRect = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  rect: BoundingBoxImpl,
): boolean => {
  const rectLeft = rect.x;
  const rectRight = rect.x + rect.width;
  const rectTop = rect.y;
  const rectBottom = rect.y + rect.height;

  const startInside =
    start.x >= rectLeft &&
    start.x <= rectRight &&
    start.y >= rectTop &&
    start.y <= rectBottom;

  const endInside =
    end.x >= rectLeft &&
    end.x <= rectRight &&
    end.y >= rectTop &&
    end.y <= rectBottom;

  if (startInside || endInside) {
    return true;
  }

  const ccw = (
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
  ) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);

  const edges = [
    [
      { x: rectLeft, y: rectTop },
      { x: rectRight, y: rectTop },
    ],
    [
      { x: rectRight, y: rectTop },
      { x: rectRight, y: rectBottom },
    ],
    [
      { x: rectLeft, y: rectBottom },
      { x: rectRight, y: rectBottom },
    ],
    [
      { x: rectLeft, y: rectTop },
      { x: rectLeft, y: rectBottom },
    ],
  ];

  return edges.some(([edgeStart, edgeEnd]) => {
    const intersect =
      ccw(start, edgeStart, edgeEnd) !== ccw(end, edgeStart, edgeEnd) &&
      ccw(start, end, edgeStart) !== ccw(start, end, edgeEnd);
    return intersect;
  });
};

const countCollisions = (
  points: { x: number; y: number }[],
  context: RoutingContext,
  sourceId: string,
  targetId: string,
  padding: number,
): number => {
  let collisions = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const segmentStart = points[index];
    const segmentEnd = points[index + 1];
    const minX = Math.min(segmentStart.x, segmentEnd.x) - padding;
    const minY = Math.min(segmentStart.y, segmentEnd.y) - padding;
    const maxX = Math.max(segmentStart.x, segmentEnd.x) + padding;
    const maxY = Math.max(segmentStart.y, segmentEnd.y) + padding;

    const bounds = new BoundingBoxImpl(minX, minY, maxX - minX, maxY - minY);
    const candidates = context.index.query(bounds);

    collisions += candidates.reduce((count, candidate) => {
      const component = candidate.data;
      if (!component) return count;
      if (component.id === sourceId || component.id === targetId) return count;

      const componentBounds = BoundingBoxImpl.fromComponent(component);
      return lineIntersectsRect(segmentStart, segmentEnd, componentBounds)
        ? count + 1
        : count;
    }, 0);
  }

  return collisions;
};

const createOrthogonalPath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  variant: "horizontal-first" | "vertical-first",
  padding: number,
): { x: number; y: number }[] => {
  const waypoints: { x: number; y: number }[] = [start];
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (variant === "horizontal-first") {
    const midX = start.x + dx / 2;
    waypoints.push({ x: midX, y: start.y });
    waypoints.push({ x: midX, y: end.y });
  } else {
    const midY = start.y + dy / 2;
    waypoints.push({ x: start.x, y: midY });
    waypoints.push({ x: end.x, y: midY });
  }

  waypoints.push(end);
  return waypoints.map((point, index) => {
    if (index === 0 || index === waypoints.length - 1) {
      return point;
    }
    return { x: point.x, y: point.y };
  });
};

const createManhattanPath = (
  start: { x: number; y: number },
  end: { x: number; y: number },
  padding: number,
): { x: number; y: number }[] => {
  const points: { x: number; y: number }[] = [start];
  const midX = start.x + (end.x - start.x) / 2;
  const midY = start.y + (end.y - start.y) / 2;
  points.push({ x: midX, y: start.y });
  points.push({ x: midX, y: end.y });
  points.push(end);
  return points;
};

const buildRoutingContext = (
  components: DesignComponent[],
): RoutingContext => {
  const index = new RTree<DesignComponent>();
  const componentsById = new Map<string, DesignComponent>();
  components.forEach((component) => {
    componentsById.set(component.id, component);
    index.insert({
      id: component.id,
      bounds: BoundingBoxImpl.fromComponent(component),
      data: component,
      type: "component",
    });
  });

  return { index, componentsById };
};

const resolveEndpoint = (
  connection: Connection,
  key: "from" | "to",
  fallbackKeys: string[],
  componentsById: Map<string, DesignComponent>,
): DesignComponent | null => {
  const directId = connection[key as keyof Connection];
  if (directId && typeof directId === "string") {
    const component = componentsById.get(directId);
    if (component) {
      return component;
    }
  }

  for (const fallbackKey of fallbackKeys) {
    const candidateId = (connection as Record<string, unknown>)[fallbackKey];
    if (typeof candidateId === "string") {
      const component = componentsById.get(candidateId);
      if (component) {
        return component;
      }
    }
  }

  return null;
};

const computeRoute = async (
  connection: Connection,
  context: RoutingContext,
  options?: SmartRoutingOptions,
): Promise<SmartRouteResult | null> => {
  const startTime = performance.now();
  const timeBudget = options?.timeBudget ?? DEFAULT_TIME_BUDGET;
  const enableCaching = options?.enableCaching ?? true;
  const enableWorkerOffload = options?.enableWorkerOffload ?? false;

  // Create cache key based on connection and relevant options
  const cacheKey = enableCaching ? `${connection.id}-${JSON.stringify({
    from: connection.from,
    to: connection.to,
    algorithm: options?.algorithm,
    avoidOverlaps: options?.avoidOverlaps,
    padding: options?.padding,
    // Include component positions in cache key for spatial sensitivity
    componentPositions: Array.from(context.componentsById.values()).map(c => ({
      id: c.id,
      x: c.x,
      y: c.y,
      width: c.width,
      height: c.height
    }))
  })}` : null;

  // Check cache first
  if (cacheKey) {
    const cached = routingCache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }
  }

  // Use worker offload for heavy computations if enabled
  if (enableWorkerOffload && typeof Worker !== 'undefined') {
    try {
      const workerPool = getWorkerPool();
      const result = await workerPool.computeRoute(connection, context, options);

      if (result) {
        result.computationTime = performance.now() - startTime;
        // Cache the result
        if (cacheKey) {
          routingCache.set(cacheKey, { ...result, cached: false });
        }
        return result;
      }
    } catch (error) {
      console.warn('Worker routing failed, falling back to main thread:', error);
    }
  }

  // Fallback to main thread computation with time budget
  return computeRouteWithTimeBudget(connection, context, options, startTime, timeBudget, cacheKey);
};

const computeRouteWithTimeBudget = (
  connection: Connection,
  context: RoutingContext,
  options?: SmartRoutingOptions,
  startTime: number = performance.now(),
  timeBudget: number = DEFAULT_TIME_BUDGET,
  cacheKey?: string | null,
): SmartRouteResult | null => {
  const padding = options?.padding ?? DEFAULT_PADDING;
  const avoidOverlaps = options?.avoidOverlaps ?? true;
  const requestedAlgorithm = options?.algorithm ?? "auto";
  const generatedAt = Date.now();

  const source = resolveEndpoint(
    connection,
    "from",
    ["sourceId", "source", "sourceComponentId"],
    context.componentsById,
  );
  const target = resolveEndpoint(
    connection,
    "to",
    ["targetId", "target", "targetComponentId"],
    context.componentsById,
  );

  if (!source || !target) {
    return null;
  }

  const start = getComponentCenter(source);
  const end = getComponentCenter(target);

  const directPath = [start, end];
  const directCollisions = avoidOverlaps
    ? countCollisions(directPath, context, source.id, target.id, padding)
    : 0;

  const directResult: SmartRouteResult = {
    points: directPath,
    algorithm: "direct",
    collisions: directCollisions,
    generatedAt,
    computationTime: performance.now() - startTime,
    cached: false,
  };

  if (!avoidOverlaps || directCollisions === 0 || requestedAlgorithm === "direct") {
    if (cacheKey) {
      routingCache.set(cacheKey, directResult);
    }
    return directResult;
  }

  const candidates: SmartRouteResult[] = [];
  const currentTime = performance.now();
  const timeRemaining = timeBudget - (currentTime - startTime);

  // Prioritize algorithms based on time remaining
  const algorithmsToTry = [];

  if (requestedAlgorithm === "orthogonal" || requestedAlgorithm === "auto") {
    algorithmsToTry.push("orthogonal");
  }
  if (requestedAlgorithm === "manhattan" || requestedAlgorithm === "auto") {
    algorithmsToTry.push("manhattan");
  }

  for (const algorithm of algorithmsToTry) {
    const algorithmStartTime = performance.now();

    if (algorithm === "orthogonal") {
      // Try horizontal-first variant
      if (performance.now() - startTime < timeBudget * 0.6) { // Use 60% of budget for first variant
        const horizontal = createOrthogonalPath(start, end, "horizontal-first", padding);
        candidates.push({
          points: horizontal,
          algorithm: "orthogonal",
          collisions: countCollisions(horizontal, context, source.id, target.id, padding),
          generatedAt,
          computationTime: performance.now() - algorithmStartTime,
          cached: false,
        });
      }

      // Try vertical-first variant if time allows
      if (performance.now() - startTime < timeBudget * 0.8) { // Use up to 80% of budget
        const vertical = createOrthogonalPath(start, end, "vertical-first", padding);
        candidates.push({
          points: vertical,
          algorithm: "orthogonal",
          collisions: countCollisions(vertical, context, source.id, target.id, padding),
          generatedAt,
          computationTime: performance.now() - algorithmStartTime,
          cached: false,
        });
      }
    } else if (algorithm === "manhattan") {
      // Try manhattan if time allows
      if (performance.now() - startTime < timeBudget) {
        const manhattan = createManhattanPath(start, end, padding);
        candidates.push({
          points: manhattan,
          algorithm: "manhattan",
          collisions: countCollisions(manhattan, context, source.id, target.id, padding),
          generatedAt,
          computationTime: performance.now() - algorithmStartTime,
          cached: false,
        });
      }
    }

    // Check if we're running out of time
    if (performance.now() - startTime >= timeBudget) {
      break;
    }
  }

  if (candidates.length === 0) {
    if (cacheKey) {
      routingCache.set(cacheKey, directResult);
    }
    return directResult;
  }

  const bestCandidate = candidates.reduce<SmartRouteResult>((best, candidate) => {
    if (candidate.collisions < best.collisions) {
      return candidate;
    }
    if (candidate.collisions === best.collisions) {
      return candidate.points.length < best.points.length ? candidate : best;
    }
    return best;
  }, { ...directResult, collisions: Number.POSITIVE_INFINITY });

  const finalResult = bestCandidate.collisions >= directCollisions ? directResult : bestCandidate;
  finalResult.computationTime = performance.now() - startTime;

  // Cache the result
  if (cacheKey) {
    routingCache.set(cacheKey, finalResult);
  }

  return finalResult;
};

export const buildSmartRoutes = async (
  connections: Connection[],
  components: DesignComponent[],
  options?: SmartRoutingOptions,
) => {
  const context = buildRoutingContext(components);
  const results = new Map<string, SmartRouteResult>();

  // Process connections with concurrency control to avoid overwhelming the system
  const concurrencyLimit = options?.enableWorkerOffload ? 4 : 8; // Lower concurrency for workers
  const batches: Connection[][] = [];

  for (let i = 0; i < connections.length; i += concurrencyLimit) {
    batches.push(connections.slice(i, i + concurrencyLimit));
  }

  for (const batch of batches) {
    const batchPromises = batch.map(async (connection) => {
      const result = await computeRoute(connection, context, options);
      if (result) {
        results.set(connection.id, result);
      }
    });

    await Promise.all(batchPromises);
  }

  return results;
};

// Cache management utilities
export const clearRoutingCache = (): void => {
  routingCache.clear();
};

export const getRoutingCacheStats = () => {
  return {
    size: routingCache.size(),
    maxSize: DEFAULT_CACHE_SIZE,
  };
};

// Performance monitoring utilities
export const getRoutingPerformanceStats = (results: Map<string, SmartRouteResult>) => {
  const routeStats = Array.from(results.values());
  const totalRoutes = routeStats.length;
  const cachedRoutes = routeStats.filter(r => r.cached).length;
  const avgComputationTime = routeStats.reduce((sum, r) => sum + (r.computationTime || 0), 0) / totalRoutes;
  const totalCollisions = routeStats.reduce((sum, r) => sum + r.collisions, 0);
  const avgCollisions = totalCollisions / totalRoutes;

  return {
    totalRoutes,
    cachedRoutes,
    cacheHitRate: cachedRoutes / totalRoutes,
    avgComputationTime,
    totalCollisions,
    avgCollisions,
  };
};

// Worker pool management
export const initializeRoutingWorkers = (poolSize?: number): void => {
  if (routingWorkerPool) {
    routingWorkerPool.terminate();
  }
  routingWorkerPool = new RoutingWorkerPool(poolSize);
};

export const terminateRoutingWorkers = (): void => {
  if (routingWorkerPool) {
    routingWorkerPool.terminate();
    routingWorkerPool = null;
  }
};
