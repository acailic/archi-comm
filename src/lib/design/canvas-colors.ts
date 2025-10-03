/**
 * src/lib/design/canvas-colors.ts
 * Centralized canvas color system with theme support
 * Single source of truth for all canvas-related colors
 * RELEVANT FILES: CustomEdge.tsx, component-styles.ts, design-system.ts, globals.css
 */

/**
 * Connection type colors for different data flow types
 * Used in edges/connections between components
 */
export const connectionColors = {
  data: '#2563eb',      // blue-600 - Clear blue for data flows
  control: '#7c3aed',   // violet-600 - Purple for control flows
  sync: '#059669',      // emerald-600 - Green for synchronous operations
  async: '#ea580c',     // orange-600 - Orange for asynchronous operations
} as const;

/**
 * Visual style colors for queue message flows and connection states
 */
export const visualStyleColors = {
  default: null,        // Use connection type color
  ack: '#059669',       // emerald-600 - Success/acknowledgment
  retry: '#ea580c',     // orange-600 - Retry state
  error: '#dc2626',     // red-600 - Error state
} as const;

/**
 * Component type colors - maps component types to their visual identity
 * Uses Tailwind color palette for consistency
 */
export const componentTypeColors = {
  'load-balancer': {
    border: '#a855f7',    // purple-500
    icon: '#9333ea',      // purple-600
    gradient: { from: '#9333ea', to: '#6b21a8' }, // purple-600 to purple-800
  },
  'api-gateway': {
    border: '#3b82f6',    // blue-500
    icon: '#2563eb',      // blue-600
    gradient: { from: '#2563eb', to: '#1e40af' }, // blue-600 to blue-800
  },
  database: {
    border: '#10b981',    // emerald-500
    icon: '#059669',      // emerald-600
    gradient: { from: '#059669', to: '#065f46' }, // emerald-600 to emerald-800
  },
  cache: {
    border: '#f97316',    // orange-500
    icon: '#ea580c',      // orange-600
    gradient: { from: '#ea580c', to: '#9a3412' }, // orange-600 to orange-800
  },
  microservice: {
    border: '#6366f1',    // indigo-500
    icon: '#4f46e5',      // indigo-600
    gradient: { from: '#4f46e5', to: '#3730a3' }, // indigo-600 to indigo-800
  },
  'message-queue': {
    border: '#eab308',    // yellow-500
    icon: '#ca8a04',      // yellow-600
    gradient: { from: '#ca8a04', to: '#854d0e' }, // yellow-600 to yellow-800
  },
  server: {
    border: '#64748b',    // slate-500
    icon: '#475569',      // slate-600
    gradient: { from: '#475569', to: '#1e293b' }, // slate-600 to slate-800
  },
  client: {
    border: '#06b6d4',    // cyan-500
    icon: '#0891b2',      // cyan-600
    gradient: { from: '#0891b2', to: '#164e63' }, // cyan-600 to cyan-800
  },
  monitoring: {
    border: '#ec4899',    // pink-500
    icon: '#db2777',      // pink-600
    gradient: { from: '#db2777', to: '#9f1239' }, // pink-600 to pink-800
  },
  storage: {
    border: '#10b981',    // emerald-500
    icon: '#059669',      // emerald-600
    gradient: { from: '#059669', to: '#065f46' }, // emerald-600 to emerald-800
  },
  'edge-computing': {
    border: '#8b5cf6',    // violet-500
    icon: '#7c3aed',      // violet-600
    gradient: { from: '#7c3aed', to: '#5b21b6' }, // violet-600 to violet-800
  },
  'ai-ml': {
    border: '#f43f5e',    // rose-500
    icon: '#e11d48',      // rose-600
    gradient: { from: '#e11d48', to: '#9f1239' }, // rose-600 to rose-800
  },
  'search-engine': {
    border: '#f59e0b',    // amber-500
    icon: '#d97706',      // amber-600
    gradient: { from: '#d97706', to: '#92400e' }, // amber-600 to amber-800
  },
  'external-service': {
    border: '#14b8a6',    // teal-500
    icon: '#0d9488',      // teal-600
    gradient: { from: '#0d9488', to: '#115e59' }, // teal-600 to teal-800
  },
  'rest-api': {
    border: '#84cc16',    // lime-500
    icon: '#65a30d',      // lime-600
    gradient: { from: '#65a30d', to: '#3f6212' }, // lime-600 to lime-800
  },
  default: {
    border: '#9ca3af',    // gray-400
    icon: '#4b5563',      // gray-600
    gradient: { from: '#4b5563', to: '#1f2937' }, // gray-600 to gray-800
  },
} as const;

/**
 * Annotation colors for different annotation types
 */
export const annotationColors = {
  comment: {
    background: '#fef3c7',  // amber-100
    border: '#f59e0b',      // amber-500
    text: '#92400e',        // amber-800
  },
  note: {
    background: '#dbeafe',  // blue-100
    border: '#3b82f6',      // blue-500
    text: '#1e3a8a',        // blue-900
  },
  label: {
    background: '#dcfce7',  // green-100
    border: '#10b981',      // emerald-500
    text: '#065f46',        // emerald-800
  },
  arrow: {
    stroke: '#6b7280',      // gray-500
    fill: '#9ca3af',        // gray-400
  },
  highlight: {
    background: '#fef08a',  // yellow-200
    opacity: 0.6,
  },
} as const;

/**
 * Health status colors for component health indicators
 */
export const healthStatusColors = {
  healthy: '#10b981',     // emerald-500
  warning: '#f59e0b',     // amber-500
  error: '#ef4444',       // red-500
  unknown: '#6b7280',     // gray-500
} as const;

/**
 * Canvas UI colors for interface elements
 */
export const canvasUIColors = {
  selectionBox: {
    border: '#3b82f6',    // blue-500
    fill: '#3b82f620',    // blue-500 with 12% opacity
  },
  grid: {
    dot: '#e5e7eb',       // gray-200
    line: '#d1d5db',      // gray-300
  },
  handle: {
    border: '#000000',    // black
    fill: '#ffffff',      // white
    hover: '#3b82f6',     // blue-500
  },
  dragPreview: {
    opacity: 0.7,
  },
} as const;

// Type exports for TypeScript support
export type ConnectionType = keyof typeof connectionColors;
export type VisualStyleType = keyof typeof visualStyleColors;
export type ComponentType = keyof typeof componentTypeColors;
export type AnnotationType = keyof typeof annotationColors;
export type HealthStatus = keyof typeof healthStatusColors;

/**
 * Utility function to get connection color by type
 */
export function getConnectionColor(type: ConnectionType): string {
  return connectionColors[type] || connectionColors.data;
}

/**
 * Utility function to get visual style color
 */
export function getVisualStyleColor(style: VisualStyleType): string | null {
  return visualStyleColors[style];
}

/**
 * Utility function to get component type colors
 */
export function getComponentTypeColor(type: string) {
  return componentTypeColors[type as ComponentType] || componentTypeColors.default;
}

/**
 * Utility function to get annotation colors
 */
export function getAnnotationColor(type: AnnotationType) {
  return annotationColors[type] || annotationColors.comment;
}

/**
 * Utility function to get health status color
 */
export function getHealthStatusColor(status: HealthStatus): string {
  return healthStatusColors[status] || healthStatusColors.unknown;
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Create a color with opacity
 */
export function withOpacity(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Get gradient CSS string from component type
 */
export function getComponentGradientCSS(type: string): string {
  const colors = getComponentTypeColor(type);
  return `linear-gradient(to bottom right, ${colors.gradient.from}, ${colors.gradient.to})`;
}

/**
 * Export all colors for easy access
 */
export const canvasColors = {
  connection: connectionColors,
  visualStyle: visualStyleColors,
  componentType: componentTypeColors,
  annotation: annotationColors,
  healthStatus: healthStatusColors,
  ui: canvasUIColors,
  // Utility functions
  getConnectionColor,
  getVisualStyleColor,
  getComponentTypeColor,
  getAnnotationColor,
  getHealthStatusColor,
  hexToRgb,
  withOpacity,
  getComponentGradientCSS,
} as const;

export default canvasColors;
