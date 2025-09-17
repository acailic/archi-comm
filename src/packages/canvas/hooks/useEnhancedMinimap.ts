// src/features/canvas/hooks/useEnhancedMinimap.ts
// Custom hook for managing enhanced minimap state and interactions
// Provides state management, event handlers, and performance optimizations
// RELEVANT FILES: src/features/canvas/utils/minimap-utils.ts, src/lib/performance/PerformanceOptimizer.ts, src/features/canvas/components/EnhancedMiniMap.tsx

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useReactFlow, useOnViewportChange } from '@xyflow/react';
import type { DesignComponent } from '../../../shared/contracts';
import { useOptimizedCallback, useOptimizedMemo } from '@/lib/performance/PerformanceOptimizer';
import {
  getComponentColor,
  getNodeStrokeColor,
  calculateMinimapDimensions,
  formatZoomPercentage,
  isMinimapInteractive,
  createMinimapConfig,
  clampZoom,
  calculateZoomStep,
  type MinimapConfig,
  type MinimapDimensions,
  ANIMATION_DURATIONS,
} from '../utils/minimap-utils';

/**
 * Props for the useEnhancedMinimap hook
 */
export interface UseEnhancedMinimapProps {
  components: DesignComponent[];
  canvasSize?: { width: number; height: number };
  initialVisible?: boolean;
  onZoomChange?: (zoom: number, centerX?: number, centerY?: number) => void;
  onPanTo?: (x: number, y: number) => void;
}

/**
 * Return type for the useEnhancedMinimap hook
 */
export interface UseEnhancedMinimapReturn {
  // State
  isVisible: boolean;
  zoomLevel: number;
  dimensions: MinimapDimensions;
  config: MinimapConfig;

  // Handlers
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleToggleVisibility: () => void;
  handleMinimapClick: (event: React.MouseEvent) => void;

  // Computed properties
  nodeColorFunction: (node: any) => string;
  strokeColorFunction: (node: any) => string;
  formattedZoom: string;
  isInteractive: boolean;

  // Responsive properties
  isMobile: boolean;
  shouldShowControls: boolean;
}

/**
 * Custom hook for enhanced minimap functionality
 */
export function useEnhancedMinimap({
  components,
  canvasSize = { width: 1000, height: 600 },
  initialVisible = true,
  onZoomChange,
  onPanTo,
}: UseEnhancedMinimapProps): UseEnhancedMinimapReturn {
  const reactFlowInstance = useReactFlow();

  // Early return if ReactFlow is not yet initialized
  const isReactFlowReady = Boolean(reactFlowInstance);

  // State management
  const [isVisible, setIsVisible] = useState(initialVisible);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Responsive state
  const [isMobile, setIsMobile] = useState(false);

  // Update mobile state based on screen size
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Get current viewport and update zoom level
  useEffect(() => {
    if (!isReactFlowReady) return;

    const viewport = reactFlowInstance?.getViewport?.();
    if (viewport) {
      setZoomLevel(viewport.zoom);
    }
  }, [reactFlowInstance, isReactFlowReady]);

  // Subscribe to viewport changes to keep zoom level in sync
  useOnViewportChange({
    onChange: ({ zoom }) => setZoomLevel(zoom),
  });

  // Optimized dimension calculations
  const dimensions = useOptimizedMemo(() => {
    return calculateMinimapDimensions(canvasSize);
  }, [canvasSize.width, canvasSize.height]);

  // Optimized configuration
  const config = useOptimizedMemo(() => {
    return createMinimapConfig();
  }, [isMobile]);

  // Optimized component color mapping
  const componentColorMap = useOptimizedMemo(() => {
    const colorMap = new Map<string, string>();
    components.forEach(component => {
      colorMap.set(component.id, getComponentColor(component.type));
    });
    return colorMap;
  }, [components]);

  // Node color function with memoization
  const nodeColorFunction = useCallback(
    (node: any) => {
      return componentColorMap.get(node.id) || getComponentColor('monitoring');
    },
    [componentColorMap]
  );

  // Node stroke color function
  const strokeColorFunction = useCallback(
    (node: any) => {
      return getNodeStrokeColor(node);
    },
    []
  );

  // Optimized zoom in handler
  const handleZoomIn = useOptimizedCallback(() => {
    if (!isReactFlowReady || !reactFlowInstance) return;

    const viewport = reactFlowInstance?.getViewport?.();
    if (!viewport) return;

    const step = calculateZoomStep(viewport.zoom);
    const newZoom = clampZoom(viewport.zoom + step);

    if (onZoomChange) {
      onZoomChange(newZoom, viewport.x + dimensions.width / 2, viewport.y + dimensions.height / 2);
    } else {
      reactFlowInstance?.setViewport?.({
        ...viewport,
        zoom: newZoom,
      });
    }
    setZoomLevel(newZoom);
  }, [reactFlowInstance, onZoomChange, dimensions.width, dimensions.height, isReactFlowReady]);

  // Optimized zoom out handler
  const handleZoomOut = useOptimizedCallback(() => {
    if (!isReactFlowReady || !reactFlowInstance) return;

    const viewport = reactFlowInstance?.getViewport?.();
    if (!viewport) return;

    const step = calculateZoomStep(viewport.zoom);
    const newZoom = clampZoom(viewport.zoom - step);

    if (onZoomChange) {
      onZoomChange(newZoom, viewport.x + dimensions.width / 2, viewport.y + dimensions.height / 2);
    } else {
      reactFlowInstance?.setViewport?.({
        ...viewport,
        zoom: newZoom,
      });
    }
    setZoomLevel(newZoom);
  }, [reactFlowInstance, onZoomChange, dimensions.width, dimensions.height, isReactFlowReady]);

  // Visibility toggle handler
  const handleToggleVisibility = useOptimizedCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible]);

  // Minimap click handler for navigation
  const handleMinimapClick = useOptimizedCallback((event: React.MouseEvent) => {
    if (!isReactFlowReady || !reactFlowInstance || !onPanTo) return;

    const minimapRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - minimapRect.left;
    const y = event.clientY - minimapRect.top;

    // Convert minimap coordinates to world coordinates
    const scaleX = canvasSize.width / dimensions.width;
    const scaleY = canvasSize.height / dimensions.height;

    const worldX = x * scaleX;
    const worldY = y * scaleY;

    onPanTo(worldX, worldY);
  }, [reactFlowInstance, onPanTo, canvasSize, dimensions, isReactFlowReady]);

  // Computed properties
  const formattedZoom = useMemo(() => {
    return formatZoomPercentage(zoomLevel);
  }, [zoomLevel]);

  const isInteractive = useMemo(() => {
    return isMinimapInteractive();
  }, []);

  const shouldShowControls = useMemo(() => {
    return !isMobile || isInteractive;
  }, [isMobile, isInteractive]);

  return {
    // State
    isVisible,
    zoomLevel,
    dimensions,
    config,

    // Handlers
    handleZoomIn,
    handleZoomOut,
    handleToggleVisibility,
    handleMinimapClick,

    // Computed properties
    nodeColorFunction,
    strokeColorFunction,
    formattedZoom,
    isInteractive,

    // Responsive properties
    isMobile,
    shouldShowControls,
  };
}

/**
 * Hook for debounced viewport updates to improve performance
 */
export function useViewportDebounce(
  onViewportChange: ((viewport: any) => void) | undefined,
  delay = 100
) {
  const [debouncedCallback] = useState(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    return (viewport: any) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        if (onViewportChange) {
          onViewportChange(viewport);
        }
      }, delay);
    };
  });

  return debouncedCallback;
}

/**
 * Hook for responsive minimap behavior
 */
export function useMinimapResponsive() {
  const [screenSize, setScreenSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = screenSize.width < 768;
  const isTablet = screenSize.width >= 768 && screenSize.width < 1024;
  const isDesktop = screenSize.width >= 1024;

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
  };
}
