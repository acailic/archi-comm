export function snapToGrid(x: number, y: number, spacing: number): { x: number; y: number } {
  return {
    x: Math.round(x / spacing) * spacing,
    y: Math.round(y / spacing) * spacing,
  };
}

// Viewport culling utilities
export interface ViewportInfo {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesignComponentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Spatial index powered by RBush for fast culling / hit-tests
// These helpers are optional; consumers can keep using the simple functions above.
type IndexedItem<T> = { minX: number; minY: number; maxX: number; maxY: number; item: T };
// Use a loose typing to avoid requiring @types/rbush in all environments
type RBushIndex<T> = any;

/**
 * Build a spatial index for a list of components.
 */
export function buildComponentSpatialIndex<T extends { x: number; y: number; width?: number; height?: number }>(
  components: T[]
): RBushIndex<T> {
  // Lazy import to avoid bundling RBush in environments that don't use it
  const RBush = require('rbush');
  const tree: RBushIndex<T> = new RBush();
  const items: IndexedItem<T>[] = components.map(c => {
    const b = calculateComponentBounds(c);
    return { minX: b.x, minY: b.y, maxX: b.x + b.width, maxY: b.y + b.height, item: c };
  });
  tree.load(items);
  return tree;
}

/**
 * Query visible components using the spatial index.
 */
export function getVisibleComponentsIndexed<T extends { x: number; y: number; width?: number; height?: number }>(
  index: RBushIndex<T>,
  viewport: ViewportInfo,
  padding = 0
): T[] {
  if (!viewport || viewport.width === 0 || viewport.height === 0) return [] as T[];
  const minX = viewport.x - padding;
  const minY = viewport.y - padding;
  const maxX = viewport.x + viewport.width + padding;
  const maxY = viewport.y + viewport.height + padding;
  const hits = index.search({ minX, minY, maxX, maxY }) as unknown as IndexedItem<T>[];
  return hits.map(h => h.item);
}

/**
 * Hit-test at a point using the spatial index.
 */
export function hitTestIndexed<T extends { x: number; y: number; width?: number; height?: number }>(
  index: RBushIndex<T>,
  x: number,
  y: number
): T[] {
  const hits = index.search({ minX: x, minY: y, maxX: x, maxY: y }) as unknown as IndexedItem<T>[];
  return hits.map(h => h.item);
}

// Lightweight bounds cache to avoid repeated object allocations during culling
const boundsCache = new WeakMap<any, DesignComponentBounds>();

export function calculateComponentBounds(component: { x: number; y: number; width?: number; height?: number }): DesignComponentBounds {
  const cached = boundsCache.get(component as any);
  if (cached) return cached;
  // Provide sensible defaults if width/height are not specified
  const width = component.width ?? 220;
  const height = component.height ?? 140;
  const bounds = { x: component.x, y: component.y, width, height };
  try {
    boundsCache.set(component as any, bounds);
  } catch {
    // WeakMap.set can fail if component is not an object, ignore silently
  }
  return bounds;
}

export function isComponentInViewport(component: { x: number; y: number; width?: number; height?: number }, viewport: ViewportInfo, padding = 0): boolean {
  const c = calculateComponentBounds(component);
  const vx = viewport.x - padding;
  const vy = viewport.y - padding;
  const vw = viewport.width + padding * 2;
  const vh = viewport.height + padding * 2;
  return !(
    c.x + c.width < vx ||
    c.x > vx + vw ||
    c.y + c.height < vy ||
    c.y > vy + vh
  );
}

export function getVisibleComponents<T extends { x: number; y: number; width?: number; height?: number }>(
  components: T[],
  viewport: ViewportInfo,
  padding = 0
): T[] {
  if (!viewport || viewport.width === 0 || viewport.height === 0) return [] as T[];
  // Fast-path: small arrays
  if (components.length <= 8) {
    return components.filter(c => isComponentInViewport(c, viewport, padding));
  }
  const result: T[] = [];
  for (let i = 0; i < components.length; i++) {
    const c = components[i];
    if (isComponentInViewport(c, viewport, padding)) result.push(c);
  }
  return result;
}

// Helper to clear cached bounds (useful in tests)
// Note: cache uses WeakMap for automatic GC; no manual clear API
