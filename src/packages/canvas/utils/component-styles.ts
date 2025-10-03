/**
 * src/features/canvas/utils/component-styles.ts
 * Utility functions for managing component visual styles
 * Provides consistent styling across canvas components
 * RELEVANT FILES: CanvasComponent.tsx, design-system.ts, canvas-colors.ts
 */

import { type DesignComponent } from '@/shared/contracts';
import { cn } from '@core/utils';
import { getComponentTypeColor, getHealthStatusColor } from '@/lib/design/canvas-colors';

export interface ComponentVisualState {
  isHovered: boolean;
  isSelected: boolean;
  isMultiSelected: boolean;
  isConnectionStart: boolean;
  isDragPreview: boolean;
}

export interface ArchitecturalStyling {
  borderColor: string;
  iconColor: string;
  gradient: string;
}

/**
 * Get component's visual state classes
 */
export function getComponentVisualState({
  isHovered,
  isSelected,
  isMultiSelected,
  isConnectionStart,
  isDragPreview,
}: ComponentVisualState): string {
  return cn(
    'transition-all duration-200',
    isHovered && 'scale-[1.02] shadow-lg',
    isSelected && 'ring-2 ring-primary/80 ring-offset-2 ring-offset-background shadow-xl',
    isMultiSelected && 'ring-2 ring-blue-500/70 ring-offset-2',
    isConnectionStart && 'ring-2 ring-amber-500/80 ring-offset-2 animate-pulse',
    isDragPreview && 'opacity-80 scale-[1.03] rotate-[1deg] z-50'
  );
}

/**
 * Get component type specific styling using centralized canvas colors
 */
export function getArchitecturalStyling(
  componentType: DesignComponent['type']
): ArchitecturalStyling {
  const colors = getComponentTypeColor(componentType);

  // Convert hex colors to Tailwind-compatible format
  // For now, we keep Tailwind classes but reference centralized color system
  const colorMap: Record<string, { border: string; text: string; gradient: string }> = {
    'load-balancer': { border: 'border-purple-500', text: 'text-purple-600', gradient: 'from-purple-600 to-purple-800' },
    'api-gateway': { border: 'border-blue-500', text: 'text-blue-600', gradient: 'from-blue-600 to-blue-800' },
    'database': { border: 'border-emerald-500', text: 'text-emerald-600', gradient: 'from-emerald-600 to-emerald-800' },
    'cache': { border: 'border-orange-500', text: 'text-orange-600', gradient: 'from-orange-600 to-orange-800' },
    'microservice': { border: 'border-indigo-500', text: 'text-indigo-600', gradient: 'from-indigo-600 to-indigo-800' },
    'message-queue': { border: 'border-yellow-500', text: 'text-yellow-600', gradient: 'from-yellow-600 to-yellow-800' },
    'server': { border: 'border-slate-500', text: 'text-slate-600', gradient: 'from-slate-600 to-slate-800' },
    'client': { border: 'border-cyan-500', text: 'text-cyan-600', gradient: 'from-cyan-600 to-cyan-800' },
    'monitoring': { border: 'border-pink-500', text: 'text-pink-600', gradient: 'from-pink-600 to-pink-800' },
    'storage': { border: 'border-emerald-500', text: 'text-emerald-600', gradient: 'from-emerald-600 to-emerald-800' },
    'edge-computing': { border: 'border-violet-500', text: 'text-violet-600', gradient: 'from-violet-600 to-violet-800' },
    'ai-ml': { border: 'border-rose-500', text: 'text-rose-600', gradient: 'from-rose-600 to-rose-800' },
    'search-engine': { border: 'border-amber-500', text: 'text-amber-600', gradient: 'from-amber-600 to-amber-800' },
    'external-service': { border: 'border-teal-500', text: 'text-teal-600', gradient: 'from-teal-600 to-teal-800' },
    'rest-api': { border: 'border-lime-500', text: 'text-lime-600', gradient: 'from-lime-600 to-lime-800' },
  };

  const tailwindClasses = colorMap[componentType] || {
    border: 'border-gray-400',
    text: 'text-gray-600',
    gradient: 'from-gray-600 to-gray-800'
  };

  return {
    borderColor: tailwindClasses.border,
    iconColor: tailwindClasses.text,
    gradient: tailwindClasses.gradient,
  };
}

/**
 * Get component health indicator
 */
export function getHealthIndicator(healthStatus: 'healthy' | 'warning' | 'error'): string {
  const indicators = {
    healthy: '🟢',
    warning: '🟡',
    error: '🔴',
  };
  return indicators[healthStatus];
}

/**
 * Get component background gradient class
 */
export function getComponentGradient(componentType: DesignComponent['type']): string {
  const { gradient } = getArchitecturalStyling(componentType);
  return gradient;
}
