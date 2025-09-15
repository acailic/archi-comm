// src/features/canvas/utils/minimap-utils.ts
// Utility functions for enhanced ReactFlow minimap functionality
// Provides component coloring, dimension calculations, and configuration helpers
// RELEVANT FILES: src/components/Minimap.tsx, src/features/canvas/components/EnhancedMiniMap.tsx, src/shared/contracts/index.ts

import type { ComponentType } from '../../../shared/contracts';

/**
 * Interface for minimap configuration
 */
export interface MinimapConfig {
  width: number;
  height: number;
  borderRadius: number;
  backdropBlur: number;
  interactive: boolean;
  showZoomControls: boolean;
}

/**
 * Interface for component type to color mapping
 */
export interface ComponentColorMap {
  [key: string]: string;
}

/**
 * Interface for minimap dimensions
 */
export interface MinimapDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

/**
 * Default color mappings for different component types
 * Based on the existing color scheme from the custom Minimap component
 */
export const DEFAULT_COMPONENT_COLORS: ComponentColorMap = {
  'api-gateway': '#3b82f6',        // Blue
  microservice: '#10b981',         // Green
  database: '#f59e0b',             // Amber
  cache: '#ef4444',                // Red
  queue: '#8b5cf6',                // Purple
  'message-queue': '#8b5cf6',      // Purple (alias)
  cdn: '#06b6d4',                  // Cyan
  'load-balancer': '#84cc16',      // Lime
  storage: '#f97316',              // Orange
  'auth-service': '#ec4899',       // Pink
  monitoring: '#6b7280',           // Gray
  server: '#3b82f6',               // Blue
  client: '#22d3ee',               // Light cyan
  'edge-computing': '#a855f7',     // Violet
  'ai-ml': '#f472b6',              // Pink
};

/**
 * Default minimap dimensions
 */
export const DEFAULT_MINIMAP_DIMENSIONS = {
  width: 180,
  height: 120,
  maxWidth: 200,
  maxHeight: 150,
  minWidth: 120,
  minHeight: 80,
} as const;

/**
 * Animation duration constants for smooth interactions
 */
export const ANIMATION_DURATIONS = {
  fast: 150,
  medium: 250,
  slow: 400,
} as const;

/**
 * Responsive breakpoints for minimap sizing
 */
export const RESPONSIVE_BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  xl: 1280,
} as const;

/**
 * Maps component types to colors with fallback support
 * Supports both light and dark theme variations
 */
export function getComponentColor(type: string): string {
  return DEFAULT_COMPONENT_COLORS[type] || DEFAULT_COMPONENT_COLORS.monitoring || '#6b7280';
}

/**
 * Determines stroke color based on node state (selected, hovered, etc.)
 * Uses theme-aware colors from CSS custom properties
 */
export function getNodeStrokeColor(node: any): string {
  if (node.selected) {
    return 'hsl(var(--primary))';
  }
  if (node.dragging) {
    return 'hsl(var(--ring))';
  }
  return 'rgba(255, 255, 255, 0.3)';
}

/**
 * Calculates optimal minimap dimensions based on canvas size
 * Maintains aspect ratio while respecting maximum dimensions
 */
export function calculateMinimapDimensions(canvasSize: {
  width: number;
  height: number;
}): MinimapDimensions {
  const { width: canvasWidth, height: canvasHeight } = canvasSize;

  // Handle edge cases
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return {
      width: DEFAULT_MINIMAP_DIMENSIONS.width,
      height: DEFAULT_MINIMAP_DIMENSIONS.height,
      aspectRatio: DEFAULT_MINIMAP_DIMENSIONS.width / DEFAULT_MINIMAP_DIMENSIONS.height,
    };
  }

  const canvasAspectRatio = canvasWidth / canvasHeight;

  // Start with default dimensions
  let { width, height } = DEFAULT_MINIMAP_DIMENSIONS;

  // Adjust based on canvas aspect ratio
  if (canvasAspectRatio > width / height) {
    // Canvas is wider - fit to width
    height = width / canvasAspectRatio;
  } else {
    // Canvas is taller - fit to height
    width = height * canvasAspectRatio;
  }

  // Enforce size constraints
  width = Math.max(
    DEFAULT_MINIMAP_DIMENSIONS.minWidth,
    Math.min(DEFAULT_MINIMAP_DIMENSIONS.maxWidth, width)
  );
  height = Math.max(
    DEFAULT_MINIMAP_DIMENSIONS.minHeight,
    Math.min(DEFAULT_MINIMAP_DIMENSIONS.maxHeight, height)
  );

  return {
    width: Math.round(width),
    height: Math.round(height),
    aspectRatio: width / height,
  };
}

/**
 * Formats zoom level for display (e.g., "150%")
 * Handles rounding and formatting consistently
 */
export function formatZoomPercentage(zoom: number): string {
  const percentage = Math.round(zoom * 100);
  return `${percentage}%`;
}

/**
 * Determines if minimap should be interactive based on device capabilities
 * Considers touch devices and accessibility preferences
 */
export function isMinimapInteractive(): boolean {
  if (typeof window === 'undefined') return true; // SSR fallback

  // Check for touch device
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

  // Interactive on non-touch devices or when motion is allowed
  return !isTouchDevice || !prefersReducedMotion;
}

/**
 * Gets responsive minimap dimensions based on screen size
 */
export function getResponsiveMinimapDimensions(): MinimapDimensions {
  if (typeof window === 'undefined') return { width: 180, height: 120, aspectRatio: 180/120 }; // SSR fallback

  const screenWidth = window.innerWidth;

  let scale = 1;

  if (screenWidth < RESPONSIVE_BREAKPOINTS.mobile) {
    scale = 0.7; // Smaller on mobile
  } else if (screenWidth < RESPONSIVE_BREAKPOINTS.tablet) {
    scale = 0.8; // Medium on tablet
  } else if (screenWidth >= RESPONSIVE_BREAKPOINTS.xl) {
    scale = 1.2; // Larger on XL screens
  }

  const baseWidth = DEFAULT_MINIMAP_DIMENSIONS.width * scale;
  const baseHeight = DEFAULT_MINIMAP_DIMENSIONS.height * scale;

  return {
    width: Math.round(baseWidth),
    height: Math.round(baseHeight),
    aspectRatio: baseWidth / baseHeight,
  };
}

/**
 * Creates a default minimap configuration with responsive sizing
 */
export function createMinimapConfig(): MinimapConfig {
  const dimensions = getResponsiveMinimapDimensions();

  return {
    width: dimensions.width,
    height: dimensions.height,
    borderRadius: 8, // matches var(--radius)
    backdropBlur: 12, // matches var(--glass-blur)
    interactive: isMinimapInteractive(),
    showZoomControls: true,
  };
}

/**
 * Gets theme-aware color for minimap viewport mask
 */
export function getViewportMaskColor(): string {
  return 'hsl(var(--muted) / 0.1)';
}

/**
 * Gets theme-aware background color for minimap
 */
export function getMinimapBackgroundColor(): string {
  return 'hsl(var(--card))';
}

/**
 * Gets theme-aware border color for minimap
 */
export function getMinimapBorderColor(): string {
  return 'hsl(var(--border))';
}

/**
 * Calculates zoom step size based on current zoom level
 * Provides more granular control at lower zoom levels
 */
export function calculateZoomStep(currentZoom: number): number {
  if (currentZoom < 0.5) return 0.1;
  if (currentZoom < 1) return 0.2;
  if (currentZoom < 2) return 0.3;
  return 0.5;
}

/**
 * Clamps zoom level to valid range with smooth boundaries
 */
export function clampZoom(zoom: number, min = 0.1, max = 2): number {
  return Math.max(min, Math.min(max, zoom));
}