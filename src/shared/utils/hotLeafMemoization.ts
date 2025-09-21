/**
 * Hot Leaf Memoization Utilities
 * Specialized memoization utilities for high-frequency "hot leaf" components
 * Builds on existing memoization.ts utilities with patterns optimized for repeated elements
 */

import React from 'react';
import { shallow } from 'zustand/shallow';
import { createMemoizedComponent, equalityFunctions } from './memoization';
import { componentOptimizer } from '@/lib/performance/ComponentOptimizer';
import { reactProfilerIntegration } from '@/lib/performance/ReactProfilerIntegration';

export interface HotLeafConfig {
  equalityFn?: (prev: any, next: any) => boolean;
  trackPerformance?: boolean;
  displayName?: string;
  debugMode?: boolean;
  frequencyThreshold?: number;
}

export interface ListItemConfig extends HotLeafConfig {
  keyExtractor?: (item: any, index: number) => string;
  itemEqualityFn?: (prev: any, next: any) => boolean;
  virtualizeThreshold?: number;
}

export interface CanvasNodeConfig extends HotLeafConfig {
  positionSensitive?: boolean;
  styleSensitive?: boolean;
  interactionSensitive?: boolean;
}

/**
 * Creates a memoized component optimized for list items, rows, and repeated elements
 * Uses specialized equality functions for common list item patterns
 */
export function createHotLeafComponent<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  config: HotLeafConfig = {}
): React.MemoExoticComponent<React.ComponentType<P>> {
  const {
    equalityFn = equalityFunctions.mixed,
    trackPerformance = true,
    displayName,
    debugMode = false,
    frequencyThreshold = 5
  } = config;

  // Create performance-tracked component if enabled
  let WrappedComponent = Component;

  if (trackPerformance) {
    WrappedComponent = reactProfilerIntegration.withHotLeafProfiling(Component, displayName);
  }

  // Create memoized version with hot leaf specific optimizations
  const MemoizedComponent = createMemoizedComponent(
    WrappedComponent,
    (prev: P, next: P) => {
      // Fast path for identical references
      if (prev === next) return true;

      // Hot leaf specific optimizations
      if (debugMode && import.meta.env.DEV) {
        const start = performance.now();
        const result = equalityFn(prev, next);
        const duration = performance.now() - start;

        if (duration > 1) {
          console.warn(`[hotLeafMemoization] Slow equality check in ${displayName}: ${duration.toFixed(2)}ms`);
        }

        return result;
      }

      return equalityFn(prev, next);
    },
    displayName || `HotLeaf(${Component.displayName || Component.name})`
  );

  // Add render frequency monitoring in development
  if (import.meta.env.DEV) {
    const originalRender = MemoizedComponent.type;
    (MemoizedComponent as any).type = React.forwardRef<any, P>((props, ref) => {
      const renderCount = React.useRef(0);
      renderCount.current++;

      if (renderCount.current % frequencyThreshold === 0) {
        console.debug(
          `[hotLeafMemoization] ${displayName} rendered ${renderCount.current} times`,
          { props, threshold: frequencyThreshold }
        );
      }

      return React.createElement(originalRender, { ...props, ref });
    });
  }

  return MemoizedComponent;
}

/**
 * Specialized memoization for list items with key-based optimization
 * Optimized for components that render lists of items (rows, cards, etc.)
 */
export function createListItemComponent<TItem, P extends { item: TItem; index: number }>(
  Component: React.ComponentType<P>,
  config: ListItemConfig = {}
): React.MemoExoticComponent<React.ComponentType<P>> {
  const {
    keyExtractor = (item: any, index: number) => `${index}`,
    itemEqualityFn = shallow,
    virtualizeThreshold = 100,
    ...hotLeafConfig
  } = config;

  // Create equality function optimized for list items
  const listItemEquality = (prev: P, next: P): boolean => {
    // Fast path: if indices are different, items are different
    if (prev.index !== next.index) return false;

    // Check if items are equal
    if (!itemEqualityFn(prev.item, next.item)) return false;

    // Check other props (excluding item and index)
    const { item: prevItem, index: prevIndex, ...prevRest } = prev;
    const { item: nextItem, index: nextIndex, ...nextRest } = next;

    return shallow(prevRest, nextRest);
  };

  return createHotLeafComponent(Component, {
    ...hotLeafConfig,
    equalityFn: listItemEquality,
    displayName: hotLeafConfig.displayName || `ListItem(${Component.displayName || Component.name})`,
  });
}

/**
 * Specialized memoization for canvas nodes with position and interaction optimizations
 * Optimized for canvas elements that have position, style, and interaction state
 */
export function createCanvasNodeComponent<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  config: CanvasNodeConfig = {}
): React.MemoExoticComponent<React.ComponentType<P>> {
  const {
    positionSensitive = true,
    styleSensitive = true,
    interactionSensitive = true,
    ...hotLeafConfig
  } = config;

  // Create canvas-specific equality function
  const canvasNodeEquality = (prev: P, next: P): boolean => {
    // Check critical canvas properties first
    if (prev.id !== next.id) return false;

    // Position checks (optimized for frequent position updates)
    if (positionSensitive && prev.position !== next.position) {
      if (typeof prev.position === 'object' && typeof next.position === 'object') {
        if (prev.position?.x !== next.position?.x || prev.position?.y !== next.position?.y) {
          return false;
        }
      } else {
        return false;
      }
    }

    // Style checks (for visual updates)
    if (styleSensitive && !shallow(prev.style, next.style)) {
      return false;
    }

    // Interaction checks (for selection, hover, etc.)
    if (interactionSensitive) {
      const interactionProps = ['selected', 'hovered', 'dragging', 'editing', 'focused'];
      if (interactionProps.some(prop => prev[prop] !== next[prop])) {
        return false;
      }
    }

    // Deep equality for remaining props
    return shallow(prev, next);
  };

  return createHotLeafComponent(Component, {
    ...hotLeafConfig,
    equalityFn: canvasNodeEquality,
    displayName: hotLeafConfig.displayName || `CanvasNode(${Component.displayName || Component.name})`,
    trackPerformance: true, // Always track performance for canvas nodes
  });
}

/**
 * Creates a memoized component optimized for table cells and grid items
 * Specialized for components that render in tabular layouts
 */
export function createGridCellComponent<P extends { row: any; column: any; value: any }>(
  Component: React.ComponentType<P>,
  config: HotLeafConfig = {}
): React.MemoExoticComponent<React.ComponentType<P>> {
  const gridCellEquality = (prev: P, next: P): boolean => {
    // Fast path for value changes (most common)
    if (prev.value !== next.value) return false;

    // Check row/column identity
    if (prev.row !== next.row || prev.column !== next.column) return false;

    // Shallow check for other props
    const { row: prevRow, column: prevColumn, value: prevValue, ...prevRest } = prev;
    const { row: nextRow, column: nextColumn, value: nextValue, ...nextRest } = next;

    return shallow(prevRest, nextRest);
  };

  return createHotLeafComponent(Component, {
    ...config,
    equalityFn: gridCellEquality,
    displayName: config.displayName || `GridCell(${Component.displayName || Component.name})`,
  });
}

/**
 * Factory for creating memoized components with automatic hot leaf detection
 * Analyzes render patterns and applies appropriate optimization strategies
 */
export function createSmartMemoizedComponent<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  config: HotLeafConfig & {
    autoDetect?: boolean;
    analysisWindow?: number;
  } = {}
): React.MemoExoticComponent<React.ComponentType<P>> {
  const {
    autoDetect = true,
    analysisWindow = 10,
    frequencyThreshold = 5,
    ...hotLeafConfig
  } = config;

  if (!autoDetect) {
    return createHotLeafComponent(Component, hotLeafConfig);
  }

  // Create a component that analyzes its own render patterns
  const AnalyzingComponent = React.forwardRef<any, P>((props, ref) => {
    const renderCount = React.useRef(0);
    const renderTimes = React.useRef<number[]>([]);
    const isHotLeaf = React.useRef<boolean | null>(null);

    renderCount.current++;
    const now = performance.now();
    renderTimes.current.push(now);

    // Keep only recent render times
    if (renderTimes.current.length > analysisWindow) {
      renderTimes.current.shift();
    }

    // Analyze render frequency after analysis window
    if (renderCount.current === analysisWindow && isHotLeaf.current === null) {
      const windowDuration = renderTimes.current[renderTimes.current.length - 1] - renderTimes.current[0];
      const rendersPerSecond = (analysisWindow / windowDuration) * 1000;

      isHotLeaf.current = rendersPerSecond > frequencyThreshold;

      if (import.meta.env.DEV) {
        console.debug(
          `[createSmartMemoizedComponent] Analysis complete for ${Component.displayName || Component.name}`,
          {
            rendersPerSecond: rendersPerSecond.toFixed(2),
            isHotLeaf: isHotLeaf.current,
            totalRenders: renderCount.current,
            windowDuration: windowDuration.toFixed(2),
          }
        );
      }
    }

    return React.createElement(Component, { ...props, ref });
  });

  return createHotLeafComponent(AnalyzingComponent, hotLeafConfig);
}

/**
 * Utility for analyzing component render patterns and suggesting optimizations
 */
export function analyzeComponentPerformance(
  componentName: string,
  renderCount: number,
  renderDuration: number
): {
  isHotLeaf: boolean;
  optimizationSuggestions: string[];
  performanceScore: number;
} {
  const isHotLeaf = renderCount > 10 || renderDuration > 16;
  const suggestions: string[] = [];
  let score = 100;

  if (renderCount > 20) {
    suggestions.push('Consider using React.memo with appropriate equality function');
    score -= 20;
  }

  if (renderDuration > 16) {
    suggestions.push('Render duration exceeds one frame - consider optimization');
    score -= 30;
  }

  if (renderCount > 50) {
    suggestions.push('Very high render frequency - implement hot leaf memoization');
    score -= 40;
  }

  if (renderDuration > 50) {
    suggestions.push('Render duration is very slow - break down component or virtualize');
    score -= 50;
  }

  return {
    isHotLeaf,
    optimizationSuggestions: suggestions,
    performanceScore: Math.max(0, score),
  };
}

/**
 * Higher-order component for automatically applying hot leaf optimizations
 */
export function withHotLeafOptimization<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  config: HotLeafConfig = {}
) {
  const displayName = config.displayName || `WithHotLeaf(${Component.displayName || Component.name})`;

  return createHotLeafComponent(Component, {
    trackPerformance: true,
    debugMode: import.meta.env.DEV,
    ...config,
    displayName,
  });
}

/**
 * Hook for memoizing expensive computations in hot leaf components
 */
export function useHotLeafMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  config?: {
    expensiveThreshold?: number;
    componentName?: string;
  }
): T {
  const { expensiveThreshold = 5, componentName = 'UnknownComponent' } = config || {};

  return React.useMemo(() => {
    if (import.meta.env.DEV) {
      const start = performance.now();
      const result = factory();
      const duration = performance.now() - start;

      if (duration > expensiveThreshold) {
        console.warn(
          `[useHotLeafMemo] Expensive computation in ${componentName}: ${duration.toFixed(2)}ms`
        );

        // Record with component optimizer
        componentOptimizer.recordSample({
          componentId: componentName,
          duration,
          timestamp: performance.now(),
          commitType: 'update',
          propsChanged: ['memo-computation'],
        });
      }

      return result;
    }

    return factory();
  }, deps);
}

/**
 * Development utilities for hot leaf analysis
 */
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).__HOT_LEAF_UTILITIES__ = {
    analyzeComponent: analyzeComponentPerformance,
    createListItem: createListItemComponent,
    createCanvasNode: createCanvasNodeComponent,
    createGridCell: createGridCellComponent,
    withOptimization: withHotLeafOptimization,
  };
}

export default {
  createHotLeafComponent,
  createListItemComponent,
  createCanvasNodeComponent,
  createGridCellComponent,
  createSmartMemoizedComponent,
  analyzeComponentPerformance,
  withHotLeafOptimization,
  useHotLeafMemo,
};
