/**
 * Advanced virtualization hooks for React components
 * Provides efficient rendering for large lists and complex UI structures
 */

import { useMemo, useCallback, useRef, useEffect } from 'react';
import { shallow } from 'zustand/shallow';

export interface VirtualizationConfig {
  itemHeight?: number;
  itemWidth?: number;
  overscan?: number;
  threshold?: number;
  enabled?: boolean;
}

export interface VirtualItem<T = any> {
  index: number;
  item: T;
  isVisible: boolean;
  style: React.CSSProperties;
}

export interface ViewportInfo {
  startIndex: number;
  endIndex: number;
  offsetY: number;
  offsetX: number;
  visibleHeight: number;
  visibleWidth: number;
}

/**
 * Virtualizes a list of items for efficient rendering
 * Only renders items that are currently visible in the viewport
 */
export function useListVirtualization<T>(
  items: T[],
  config: VirtualizationConfig & {
    containerHeight: number;
    containerWidth?: number;
    getItemId?: (item: T, index: number) => string;
  }
): {
  virtualItems: VirtualItem<T>[];
  totalHeight: number;
  totalWidth: number;
  viewportInfo: ViewportInfo;
  scrollToIndex: (index: number) => void;
} {
  const {
    itemHeight = 50,
    itemWidth = 200,
    overscan = 5,
    threshold = 10,
    enabled = true,
    containerHeight,
    containerWidth = itemWidth,
    getItemId = (_, index) => index.toString()
  } = config;

  const scrollElementRef = useRef<HTMLElement | null>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);

  // Calculate visible range
  const viewportInfo = useMemo(() => {
    if (!enabled || items.length === 0) {
      return {
        startIndex: 0,
        endIndex: items.length - 1,
        offsetY: 0,
        offsetX: 0,
        visibleHeight: containerHeight,
        visibleWidth: containerWidth
      };
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

    return {
      startIndex,
      endIndex,
      offsetY: startIndex * itemHeight,
      offsetX: 0,
      visibleHeight: containerHeight,
      visibleWidth: containerWidth
    };
  }, [enabled, items.length, scrollTop, itemHeight, containerHeight, containerWidth, overscan]);

  // Create virtual items
  const virtualItems = useMemo(() => {
    if (!enabled || items.length < threshold) {
      return items.map((item, index) => ({
        index,
        item,
        isVisible: true,
        style: {
          position: 'absolute' as const,
          top: index * itemHeight,
          left: 0,
          height: itemHeight,
          width: itemWidth
        }
      }));
    }

    const result: VirtualItem<T>[] = [];

    for (let i = viewportInfo.startIndex; i <= viewportInfo.endIndex; i++) {
      result.push({
        index: i,
        item: items[i],
        isVisible: true,
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          left: 0,
          height: itemHeight,
          width: itemWidth,
          transform: `translateY(${viewportInfo.offsetY}px)`
        }
      });
    }

    return result;
  }, [enabled, items, viewportInfo, itemHeight, itemWidth, threshold]);

  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);
  const totalWidth = useMemo(() => itemWidth, [itemWidth]);

  const scrollToIndex = useCallback((index: number) => {
    if (scrollElementRef.current) {
      const targetScrollTop = index * itemHeight;
      scrollElementRef.current.scrollTop = targetScrollTop;
      setScrollTop(targetScrollTop);
    }
  }, [itemHeight]);

  // Scroll event handler
  const handleScroll = useCallback((event: Event) => {
    if (event.target instanceof HTMLElement) {
      setScrollTop(event.target.scrollTop);
      setScrollLeft(event.target.scrollLeft);
    }
  }, []);

  return {
    virtualItems,
    totalHeight,
    totalWidth,
    viewportInfo,
    scrollToIndex
  };
}

/**
 * Virtualizes a 2D grid of items
 * Efficient for large tables or grid layouts
 */
export function useGridVirtualization<T>(
  items: T[][],
  config: VirtualizationConfig & {
    containerHeight: number;
    containerWidth: number;
    rowHeight?: number;
    columnWidth?: number;
  }
): {
  virtualRows: Array<{
    rowIndex: number;
    columns: VirtualItem<T>[];
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  totalWidth: number;
} {
  const {
    rowHeight = 50,
    columnWidth = 100,
    overscan = 2,
    threshold = 20,
    enabled = true,
    containerHeight,
    containerWidth
  } = config;

  const [scrollTop, setScrollTop] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);

  const rowCount = items.length;
  const columnCount = items[0]?.length || 0;

  // Calculate visible row range
  const visibleRowRange = useMemo(() => {
    if (!enabled || rowCount < threshold) {
      return { start: 0, end: rowCount - 1 };
    }

    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRows = Math.ceil(containerHeight / rowHeight);
    const end = Math.min(rowCount - 1, start + visibleRows + overscan * 2);

    return { start, end };
  }, [enabled, rowCount, scrollTop, rowHeight, containerHeight, overscan, threshold]);

  // Calculate visible column range
  const visibleColumnRange = useMemo(() => {
    if (!enabled || columnCount < threshold) {
      return { start: 0, end: columnCount - 1 };
    }

    const start = Math.max(0, Math.floor(scrollLeft / columnWidth) - overscan);
    const visibleColumns = Math.ceil(containerWidth / columnWidth);
    const end = Math.min(columnCount - 1, start + visibleColumns + overscan * 2);

    return { start, end };
  }, [enabled, columnCount, scrollLeft, columnWidth, containerWidth, overscan, threshold]);

  // Create virtual rows and columns
  const virtualRows = useMemo(() => {
    const result = [];

    for (let rowIndex = visibleRowRange.start; rowIndex <= visibleRowRange.end; rowIndex++) {
      const row = items[rowIndex];
      if (!row) continue;

      const columns: VirtualItem<T>[] = [];

      for (let colIndex = visibleColumnRange.start; colIndex <= visibleColumnRange.end; colIndex++) {
        const item = row[colIndex];
        if (item === undefined) continue;

        columns.push({
          index: colIndex,
          item,
          isVisible: true,
          style: {
            position: 'absolute' as const,
            left: colIndex * columnWidth,
            width: columnWidth,
            height: rowHeight
          }
        });
      }

      result.push({
        rowIndex,
        columns,
        style: {
          position: 'absolute' as const,
          top: rowIndex * rowHeight,
          left: 0,
          width: columnCount * columnWidth,
          height: rowHeight
        }
      });
    }

    return result;
  }, [items, visibleRowRange, visibleColumnRange, rowHeight, columnWidth, columnCount]);

  const totalHeight = useMemo(() => rowCount * rowHeight, [rowCount, rowHeight]);
  const totalWidth = useMemo(() => columnCount * columnWidth, [columnCount, columnWidth]);

  return {
    virtualRows,
    totalHeight,
    totalWidth
  };
}

/**
 * Virtualizes canvas elements based on viewport
 * Optimized for 2D canvas-like components
 */
export function useCanvasVirtualization<T extends { x: number; y: number; width?: number; height?: number }>(
  items: T[],
  viewport: {
    x: number;
    y: number;
    zoom: number;
    width: number;
    height: number;
  },
  config: {
    bufferZone?: number;
    enabled?: boolean;
    minZoomThreshold?: number;
  } = {}
): {
  visibleItems: T[];
  culledCount: number;
  performance: {
    totalItems: number;
    visibleItems: number;
    cullingRatio: number;
  };
} {
  const {
    bufferZone = 100,
    enabled = true,
    minZoomThreshold = 0.1
  } = config;

  return useMemo(() => {
    if (!enabled || viewport.zoom < minZoomThreshold) {
      return {
        visibleItems: items,
        culledCount: 0,
        performance: {
          totalItems: items.length,
          visibleItems: items.length,
          cullingRatio: 0
        }
      };
    }

    // Calculate viewport bounds with buffer
    const viewportLeft = viewport.x - bufferZone;
    const viewportRight = viewport.x + viewport.width + bufferZone;
    const viewportTop = viewport.y - bufferZone;
    const viewportBottom = viewport.y + viewport.height + bufferZone;

    const visibleItems = items.filter(item => {
      const itemLeft = item.x;
      const itemRight = item.x + (item.width || 0);
      const itemTop = item.y;
      const itemBottom = item.y + (item.height || 0);

      // Check if item intersects with viewport
      return !(
        itemRight < viewportLeft ||
        itemLeft > viewportRight ||
        itemBottom < viewportTop ||
        itemTop > viewportBottom
      );
    });

    const culledCount = items.length - visibleItems.length;

    return {
      visibleItems,
      culledCount,
      performance: {
        totalItems: items.length,
        visibleItems: visibleItems.length,
        cullingRatio: culledCount / items.length
      }
    };
  }, [items, viewport, bufferZone, enabled, minZoomThreshold]);
}

/**
 * Hook for component-level virtualization
 * Automatically determines when to enable virtualization based on performance metrics
 */
export function useSmartVirtualization<T>(
  items: T[],
  renderThreshold: number = 50,
  performanceThreshold: number = 16 // 60fps target
): {
  shouldVirtualize: boolean;
  config: VirtualizationConfig;
  performance: {
    renderTime: number;
    itemCount: number;
    recommendation: 'none' | 'list' | 'grid' | 'canvas';
  };
} {
  const renderTimeRef = useRef<number[]>([]);
  const lastRenderTime = useRef(0);

  // Track render performance
  useEffect(() => {
    const start = performance.now();

    return () => {
      const duration = performance.now() - start;
      renderTimeRef.current.push(duration);

      // Keep only recent measurements
      if (renderTimeRef.current.length > 10) {
        renderTimeRef.current.shift();
      }

      lastRenderTime.current = duration;
    };
  });

  return useMemo(() => {
    const avgRenderTime = renderTimeRef.current.length > 0
      ? renderTimeRef.current.reduce((sum, time) => sum + time, 0) / renderTimeRef.current.length
      : 0;

    const shouldVirtualize = items.length > renderThreshold || avgRenderTime > performanceThreshold;

    let recommendation: 'none' | 'list' | 'grid' | 'canvas' = 'none';

    if (shouldVirtualize) {
      if (items.length > 1000) {
        recommendation = 'canvas';
      } else if (items.length > 200) {
        recommendation = 'grid';
      } else {
        recommendation = 'list';
      }
    }

    return {
      shouldVirtualize,
      config: {
        enabled: shouldVirtualize,
        threshold: renderThreshold,
        overscan: Math.max(5, Math.ceil(items.length * 0.1))
      },
      performance: {
        renderTime: avgRenderTime,
        itemCount: items.length,
        recommendation
      }
    };
  }, [items.length, renderThreshold, performanceThreshold]);
}

import React from 'react';
export default {
  useListVirtualization,
  useGridVirtualization,
  useCanvasVirtualization,
  useSmartVirtualization
};