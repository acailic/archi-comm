/**
 * src/features/canvas/utils/component-styles.ts
 * Utility functions for managing component visual styles
 * Provides consistent styling across canvas components
 * RELEVANT FILES: CanvasComponent.tsx, design-system.ts
 */

import { type DesignComponent } from '@/shared/contracts';
import { cn } from '@core/utils';

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
 * Get component type specific styling
 */
export function getArchitecturalStyling(
  componentType: DesignComponent['type']
): ArchitecturalStyling {
  const styles: Record<string, ArchitecturalStyling> = {
    'load-balancer': {
      borderColor: 'border-purple-500',
      iconColor: 'text-purple-600',
      gradient: 'from-purple-600 to-purple-800',
    },
    'api-gateway': {
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-600',
      gradient: 'from-blue-600 to-blue-800',
    },
    database: {
      borderColor: 'border-green-500',
      iconColor: 'text-green-600',
      gradient: 'from-green-600 to-green-800',
    },
    cache: {
      borderColor: 'border-orange-500',
      iconColor: 'text-orange-600',
      gradient: 'from-orange-600 to-orange-800',
    },
    microservice: {
      borderColor: 'border-indigo-500',
      iconColor: 'text-indigo-600',
      gradient: 'from-indigo-600 to-indigo-800',
    },
    'message-queue': {
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-600',
      gradient: 'from-yellow-600 to-yellow-800',
    },
    server: {
      borderColor: 'border-slate-500',
      iconColor: 'text-slate-600',
      gradient: 'from-slate-600 to-slate-800',
    },
    client: {
      borderColor: 'border-cyan-500',
      iconColor: 'text-cyan-600',
      gradient: 'from-cyan-600 to-cyan-800',
    },
    monitoring: {
      borderColor: 'border-pink-500',
      iconColor: 'text-pink-600',
      gradient: 'from-pink-600 to-pink-800',
    },
    storage: {
      borderColor: 'border-emerald-500',
      iconColor: 'text-emerald-600',
      gradient: 'from-emerald-600 to-emerald-800',
    },
    'edge-computing': {
      borderColor: 'border-violet-500',
      iconColor: 'text-violet-600',
      gradient: 'from-violet-600 to-violet-800',
    },
    'ai-ml': {
      borderColor: 'border-rose-500',
      iconColor: 'text-rose-600',
      gradient: 'from-rose-600 to-rose-800',
    },
    'search-engine': {
      borderColor: 'border-amber-500',
      iconColor: 'text-amber-600',
      gradient: 'from-amber-600 to-amber-800',
    },
    'external-service': {
      borderColor: 'border-teal-500',
      iconColor: 'text-teal-600',
      gradient: 'from-teal-600 to-teal-800',
    },
    'rest-api': {
      borderColor: 'border-lime-500',
      iconColor: 'text-lime-600',
      gradient: 'from-lime-600 to-lime-800',
    },
  };

  return (
    styles[componentType] || {
      borderColor: 'border-gray-400',
      iconColor: 'text-gray-600',
      gradient: 'from-gray-600 to-gray-800',
    }
  );
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
