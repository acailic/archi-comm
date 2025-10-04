// src/lib/animations/component-animations.ts
// Centralized animation variants library for component personality features
// Provides reusable Framer Motion animation variants for nodes, edges, and canvas interactions
// RELEVANT FILES: src/lib/design/design-system.ts, src/stores/canvasStore.ts, src/packages/canvas/components/CustomNodeView.tsx

import type { Variants, Transition } from 'framer-motion';

// Animation timing constants
export const ANIMATION_DURATION = {
  FAST: 0.15,
  NORMAL: 0.3,
  SLOW: 0.5,
  VERY_SLOW: 0.8,
} as const;

// Spring physics configurations
export const SPRING_CONFIG = {
  GENTLE: { type: 'spring' as const, damping: 20, stiffness: 300 },
  BOUNCY: { type: 'spring' as const, damping: 15, stiffness: 400 },
  SMOOTH: { type: 'spring' as const, damping: 25, stiffness: 200 },
  LANDING: { type: 'spring' as const, damping: 0.6, stiffness: 100 },
  MAGNETIC: { type: 'spring' as const, damping: 18, stiffness: 500, mass: 0.8 },
} as const;

// Easing curves
export const EASING_CURVES = {
  EASE_OUT: [0.16, 1, 0.3, 1] as [number, number, number, number],
  EASE_IN_OUT: [0.65, 0, 0.35, 1] as [number, number, number, number],
  EASE_ELASTIC: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
} as const;

// Node animation variants
export const nodeAnimations = {
  // Hover effect - scale and glow
  wakeUp: {
    initial: {
      scale: 1,
      filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
    },
    hover: {
      scale: 1.02,
      filter: 'drop-shadow(0 8px 16px rgba(59, 130, 246, 0.3))',
      transition: {
        duration: ANIMATION_DURATION.FAST,
        ease: EASING_CURVES.EASE_OUT,
      },
    },
  } satisfies Variants,

  // Landing animation when component is dropped
  landing: {
    initial: {
      scale: 0.95,
      opacity: 0.8,
    },
    animate: {
      scale: 1,
      opacity: 1,
      transition: SPRING_CONFIG.LANDING,
    },
  } satisfies Variants,

  // Drag trail effect
  dragTrail: {
    initial: {
      opacity: 0.3,
      scale: 0.98,
    },
    animate: {
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: ANIMATION_DURATION.NORMAL,
        ease: EASING_CURVES.EASE_OUT,
      },
    },
  } satisfies Variants,

  // Selection ring pulse
  selected: {
    initial: {
      boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)',
    },
    animate: {
      boxShadow: [
        '0 0 0 0 rgba(59, 130, 246, 0.4)',
        '0 0 0 4px rgba(59, 130, 246, 0.1)',
        '0 0 0 0 rgba(59, 130, 246, 0)',
      ],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  } satisfies Variants,

  // Connecting mode pulse
  connecting: {
    initial: {
      scale: 1,
      opacity: 1,
    },
    animate: {
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  } satisfies Variants,

  // Grid snap magnetic effect
  gridSnap: {
    initial: (position: { x: number; y: number }) => ({
      x: position.x,
      y: position.y,
    }),
    snap: (targetPosition: { x: number; y: number }) => ({
      x: targetPosition.x,
      y: targetPosition.y,
      transition: SPRING_CONFIG.MAGNETIC,
    }),
  } satisfies Variants,
};

// Edge/connection animation variants
export const edgeAnimations = {
  // Data flow animation
  dataFlow: {
    slow: {
      strokeDashoffset: [0, -12],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear',
      },
    },
    normal: {
      strokeDashoffset: [0, -12],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear',
      },
    },
    fast: {
      strokeDashoffset: [0, -12],
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      },
    },
  } as const,

  // Connection creation animation
  creating: {
    initial: {
      strokeDasharray: '8 4',
      strokeDashoffset: 0,
      opacity: 0.6,
    },
    animate: {
      strokeDashoffset: -12,
      opacity: 1,
      transition: {
        strokeDashoffset: {
          duration: 0.8,
          repeat: Infinity,
          ease: 'linear',
        },
        opacity: {
          duration: ANIMATION_DURATION.NORMAL,
        },
      },
    },
  } satisfies Variants,

  // Hover pulse
  pulse: {
    initial: {
      strokeWidth: 2,
      filter: 'drop-shadow(0 0 0 rgba(59, 130, 246, 0))',
    },
    hover: {
      strokeWidth: 3,
      filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))',
      transition: {
        duration: ANIMATION_DURATION.FAST,
      },
    },
  } satisfies Variants,
};

// Canvas-level animations
export const canvasAnimations = {
  // Grid snap feedback
  gridSnap: {
    initial: {
      opacity: 0,
      scale: 0.95,
    },
    snap: {
      opacity: [0, 1, 0],
      scale: [0.95, 1.02, 1],
      transition: {
        duration: ANIMATION_DURATION.NORMAL,
        ease: EASING_CURVES.EASE_OUT,
      },
    },
  } satisfies Variants,

  // Zoom transitions
  zoomIn: {
    initial: { scale: 1 },
    animate: (targetScale: number) => ({
      scale: targetScale,
      transition: SPRING_CONFIG.SMOOTH,
    }),
  } satisfies Variants,

  zoomOut: {
    initial: { scale: 1 },
    animate: (targetScale: number) => ({
      scale: targetScale,
      transition: SPRING_CONFIG.SMOOTH,
    }),
  } satisfies Variants,

  // Empty state animations
  emptyState: {
    initial: {
      opacity: 0,
      y: 20,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_DURATION.SLOW,
        ease: EASING_CURVES.EASE_OUT,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: ANIMATION_DURATION.NORMAL,
      },
    },
  } satisfies Variants,
};

// Helper function to get animation variant based on enabled state
export function getAnimationVariant<T extends Variants>(
  enabled: boolean,
  variant: T,
  staticFallback?: Record<string, any>
): T | Record<string, any> {
  if (!enabled) {
    return staticFallback || {};
  }
  return variant;
}

// Helper to create staggered children animations
export function createStaggerContainer(
  staggerDelay: number = 0.1,
  delayChildren: number = 0
): Variants {
  return {
    initial: {
      opacity: 0,
    },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };
}

// Helper to create staggered child animations
export function createStaggerChild(): Variants {
  return {
    initial: {
      opacity: 0,
      y: 10,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: ANIMATION_DURATION.NORMAL,
        ease: EASING_CURVES.EASE_OUT,
      },
    },
  };
}
