// src/features/canvas/components/EnhancedMiniMap.tsx
// Enhanced ReactFlow minimap component with glassmorphism design and interactive features
// Extends ReactFlow's MiniMap with advanced styling, dynamic coloring, and zoom controls
// RELEVANT FILES: src/components/Minimap.tsx, src/styles/globals.css, src/features/canvas/utils/minimap-utils.ts, src/features/canvas/hooks/useEnhancedMinimap.ts

import React, { memo, useCallback, useMemo } from 'react';
import { MiniMap, useReactFlow } from '@xyflow/react';
import { Plus, Minus, Eye, EyeOff } from 'lucide-react';
import type { DesignComponent } from '../@shared/contracts';
import { useEnhancedMinimap } from '../hooks/useEnhancedMinimap';
import {
  getMinimapBackgroundColor,
  getMinimapBorderColor,
  getViewportMaskColor,
  clampZoom,
} from '../utils/minimap-utils';
import { cn } from '@core/utils';

/**
 * Props for the EnhancedMiniMap component
 */
export interface EnhancedMiniMapProps {
  components?: DesignComponent[];
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  canvasSize?: { width: number; height: number };
  onZoomChange?: (zoom: number, centerX?: number, centerY?: number) => void;
  onPanTo?: (x: number, y: number) => void;
  initialVisible?: boolean;
  showZoomControls?: boolean;
  showVisibilityToggle?: boolean;
  interactive?: boolean;
  ariaLabel?: string;
}

/**
 * Enhanced ReactFlow minimap with glassmorphism design and interactive features
 */
export const EnhancedMiniMap = memo(function EnhancedMiniMap({
  components = [],
  position = 'bottom-left',
  className,
  canvasSize = { width: 1000, height: 600 },
  onZoomChange,
  onPanTo,
  initialVisible = true,
  showZoomControls = true,
  showVisibilityToggle = false,
  interactive = true,
  ariaLabel = 'Canvas minimap',
}: EnhancedMiniMapProps) {
  // Check if ReactFlow is available
  const reactFlowInstance = useReactFlow();

  // Enhanced minimap hook for state management
  let hookResult;
  try {
    hookResult = useEnhancedMinimap({
      components,
      canvasSize,
      initialVisible,
      onZoomChange,
      onPanTo,
    });
  } catch (error) {
    console.warn('EnhancedMiniMap: Failed to initialize hook, falling back to simple minimap', error);
    // Return a simple fallback minimap
    return (
      <div className={cn('enhanced-minimap', className)}>
        <MiniMap
          position={position}
          nodeColor={() => 'hsl(var(--primary))'}
          maskColor="hsl(var(--muted) / 0.1)"
          style={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        />
      </div>
    );
  }

  const {
    isVisible,
    zoomLevel,
    dimensions,
    config,
    handleZoomIn,
    handleZoomOut,
    handleToggleVisibility,
    handleMinimapClick,
    nodeColorFunction,
    strokeColorFunction,
    formattedZoom,
    isInteractive,
    isMobile,
    shouldShowControls,
  } = hookResult;

  // Add error boundary handling
  if (!dimensions) {
    console.warn('EnhancedMiniMap: dimensions not available, falling back to default');
    return null;
  }

  // Memoized style object for performance
  const minimapStyle = useMemo(() => ({
    backgroundColor: getMinimapBackgroundColor(),
    border: `1px solid ${getMinimapBorderColor()}`,
    borderRadius: `${config.borderRadius}px`,
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
  }), [config.borderRadius, dimensions.width, dimensions.height]);

  // Zoom control handlers with validation
  const handleZoomInClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleZoomIn();
  }, [handleZoomIn]);

  const handleZoomOutClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleZoomOut();
  }, [handleZoomOut]);

  const handleVisibilityToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleToggleVisibility();
  }, [handleToggleVisibility]);

  // Keyboard navigation support
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleZoomIn();
    }
    else if (e.key === '-' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleZoomOut();
    }
    else if ((e.key === 'M' || e.key === 'm') && (e.shiftKey)) {
      e.preventDefault();
      handleToggleVisibility();
    }
  }, [handleZoomIn, handleZoomOut, handleToggleVisibility]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Enhanced controls component
  const EnhancedControls = memo(function EnhancedControls() {
    if (!shouldShowControls || (!showZoomControls && !showVisibilityToggle)) {
      return null;
    }

    return (
      <div className="enhanced-minimap-controls">
        {showZoomControls && (
          <>
            <button
              className="enhanced-minimap-control-button"
              onClick={handleZoomInClick}
              disabled={zoomLevel >= 2}
              title={`Zoom in (${formattedZoom})`}
              aria-label="Zoom in"
            >
              <Plus size={isMobile ? 10 : 12} />
            </button>
            <button
              className="enhanced-minimap-control-button"
              onClick={handleZoomOutClick}
              disabled={zoomLevel <= 0.1}
              title={`Zoom out (${formattedZoom})`}
              aria-label="Zoom out"
            >
              <Minus size={isMobile ? 10 : 12} />
            </button>
          </>
        )}
        {showVisibilityToggle && (
          <button
            className="enhanced-minimap-control-button"
            onClick={handleVisibilityToggle}
            title={isVisible ? 'Hide minimap' : 'Show minimap'}
            aria-label={isVisible ? 'Hide minimap' : 'Show minimap'}
          >
            {isVisible ? (
              <EyeOff size={isMobile ? 10 : 12} />
            ) : (
              <Eye size={isMobile ? 10 : 12} />
            )}
          </button>
        )}
      </div>
    );
  });

  // Zoom level display component
  const ZoomDisplay = memo(function ZoomDisplay() {
    return (
      <div className="enhanced-minimap-zoom" aria-live="polite">
        {formattedZoom}
      </div>
    );
  });

  return (
    <div
      className={cn(
        'enhanced-minimap',
        'enhanced-minimap-responsive',
        'enhanced-minimap-enter',
        {
          'enhanced-minimap-interactive': interactive && isInteractive,
          'enhanced-minimap-gpu-accelerated': !isMobile,
          'enhanced-minimap-static': isMobile,
        },
        className
      )}
      style={minimapStyle}
      onClick={undefined}
      onKeyDown={handleKeyDown}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? 'button' : 'img'}
      aria-label={ariaLabel}
      aria-hidden={!isVisible}
      data-testid="enhanced-minimap"
    >
      {/* ReactFlow MiniMap with enhanced configuration */}
      <MiniMap
        position={position}
        width={dimensions.width}
        height={dimensions.height}
        nodeColor={nodeColorFunction}
        nodeStrokeColor={strokeColorFunction}
        maskColor={getViewportMaskColor()}
        nodeBorderRadius={2}
        nodeStrokeWidth={1}
        nodeClassName="enhanced-minimap-node"
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: 0,
        }}
        pannable={interactive && isInteractive}
        zoomable={interactive && isInteractive}
        inversePan={false}
        zoomStep={0.1}
        ariaLabel={undefined} // Let our container handle aria
      />

      {/* Enhanced Controls */}
      <EnhancedControls />

      {/* Zoom Level Display */}
      <ZoomDisplay />
    </div>
  );
});

/**
 * Lightweight version for mobile or performance-constrained environments
 */
export const LightweightMiniMap = memo(function LightweightMiniMap({
  components = [],
  position = 'bottom-left',
  className,
}: Pick<EnhancedMiniMapProps, 'components' | 'position' | 'className'>) {
  const nodeColorFunction = useCallback((node: any) => {
    // Simple color mapping for performance
    const componentType = components.find(c => c.id === node.id)?.type;
    return componentType === 'database' ? '#f59e0b' :
           componentType === 'microservice' ? '#10b981' :
           '#6b7280';
  }, [components]);

  return (
    <div className={cn('enhanced-minimap', className)}>
      <MiniMap
        position={position}
        nodeColor={nodeColorFunction}
        maskColor="rgba(0, 0, 0, 0.1)"
        style={{
          backgroundColor: getMinimapBackgroundColor(),
          border: `1px solid ${getMinimapBorderColor()}`,
        }}
        pannable={true}
        zoomable={false}
        nodeStrokeWidth={0}
      />
    </div>
  );
});

export default EnhancedMiniMap;
