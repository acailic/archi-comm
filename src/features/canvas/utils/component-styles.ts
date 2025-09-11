/**
 * src/features/canvas/utils/component-styles.ts
 * Utility functions for managing component visual styles
 * Provides consistent styling across canvas components
 * RELEVANT FILES: CanvasComponent.tsx, design-system.ts
 */

import { type DesignComponent } from '@/shared/contracts';
import { cn } from '@/lib/utils';

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
  isDragPreview
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
export function getArchitecturalStyling(componentType: DesignComponent['type']): ArchitecturalStyling {
  const styles: Record<string, ArchitecturalStyling> = {
    'load-balancer': {
      borderColor: 'border-purple-500',
      iconColor: 'text-purple-600',
      gradient: 'from-purple-500 to-purple-700'
    },
    'api-gateway': {
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-600',
      gradient: 'from-blue-500 to-blue-700'
    },
    'database': {
      borderColor: 'border-green-500',
      iconColor: 'text-green-600',
      gradient: 'from-green-500 to-green-700'
    },
    'cache': {
      borderColor: 'border-orange-500',
      iconColor: 'text-orange-600',
      gradient: 'from-orange-500 to-orange-700'
    },
    'microservice': {
      borderColor: 'border-indigo-500',
      iconColor: 'text-indigo-600',
      gradient: 'from-indigo-500 to-indigo-700'
    },
    'message-queue': {
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-600',
      gradient: 'from-yellow-500 to-yellow-700'
    }
  };

  return styles[componentType] || {
    borderColor: 'border-gray-300',
    iconColor: 'text-gray-600',
    gradient: 'from-gray-500 to-gray-700'
  };
}

/**
 * Get component health indicator
 */
export function getHealthIndicator(healthStatus: 'healthy' | 'warning' | 'error'): string {
  const indicators = {
    healthy: '🟢',
    warning: '🟡',
    error: '🔴'
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