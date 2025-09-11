/**
 * src/lib/types/FramerMotion.ts
 * TypeScript interfaces for framer-motion dynamic imports
 * Provides type safety for dynamic loading scenarios in components like SolutionHints
 * RELEVANT FILES: src/components/SolutionHints.tsx, src/lib/lazy-imports/
 */

import type { ComponentType } from 'react';

// Core motion component props
export interface MotionProps {
  initial?: object | string | false;
  animate?: object | string;
  exit?: object | string;
  transition?: object;
  variants?: object;
  whileHover?: object;
  whileTap?: object;
  whileInView?: object;
  viewport?: object;
  layout?: boolean | string;
  layoutId?: string;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

// Motion component interface for motion.div and other motion elements
export interface MotionComponent extends ComponentType<MotionProps> {
  // Additional motion-specific methods or properties can be added here
}

// AnimatePresence component interface
export interface AnimatePresenceComponent extends ComponentType<{
  children?: React.ReactNode;
  initial?: boolean;
  mode?: 'wait' | 'sync' | 'popLayout';
  onExitComplete?: () => void;
  custom?: any;
  presenceAffectsLayout?: boolean;
}> {}

// Main framer-motion module interface
export interface FramerMotionModule {
  motion: {
    div: MotionComponent;
    span: MotionComponent;
    p: MotionComponent;
    h1: MotionComponent;
    h2: MotionComponent;
    h3: MotionComponent;
    button: MotionComponent;
    section: MotionComponent;
    article: MotionComponent;
    [key: string]: MotionComponent;
  };
  AnimatePresence: AnimatePresenceComponent;
  useAnimation?: () => any;
  useMotionValue?: (initial: number) => any;
  useTransform?: (value: any, input: number[], output: any[]) => any;
  useDragControls?: () => any;
  useInView?: (ref: React.RefObject<Element>, options?: object) => boolean;
}

// Animation variants type
export interface AnimationVariants {
  [key: string]: {
    [property: string]: any;
  };
}

// Transition configuration
export interface TransitionConfig {
  duration?: number;
  delay?: number;
  ease?: string | number[] | ((t: number) => number);
  times?: number[];
  repeat?: number;
  repeatType?: 'loop' | 'reverse' | 'mirror';
  repeatDelay?: number;
  type?: 'spring' | 'tween' | 'keyframes' | 'inertia';
  bounce?: number;
  damping?: number;
  mass?: number;
  stiffness?: number;
  velocity?: number;
  restSpeed?: number;
  restDelta?: number;
}

// Viewport configuration for scroll-triggered animations
export interface ViewportConfig {
  root?: React.RefObject<Element>;
  once?: boolean;
  margin?: string;
  amount?: 'some' | 'all' | number;
}

// Dynamic import result type for error handling
export interface FramerMotionImportResult {
  success: boolean;
  module?: FramerMotionModule;
  error?: Error;
}

// Utility types for component state management
export type AnimationState = 'idle' | 'loading' | 'animating' | 'error';

export interface AnimationControls {
  start: (definition?: any) => Promise<void>;
  stop: () => void;
  set: (definition: any) => void;
}

// Type guards for checking loaded components
export function isMotionModule(module: any): module is FramerMotionModule {
  return (
    module &&
    typeof module === 'object' &&
    'motion' in module &&
    'AnimatePresence' in module &&
    typeof module.motion === 'object' &&
    typeof module.AnimatePresence === 'function'
  );
}

export function isValidMotionProps(props: any): props is MotionProps {
  return (
    props &&
    typeof props === 'object' &&
    (props.initial !== undefined ||
      props.animate !== undefined ||
      props.exit !== undefined ||
      props.transition !== undefined)
  );
}

// Helper types for common animation patterns
export type FadeVariants = {
  hidden: { opacity: number };
  visible: { opacity: number };
};

export type SlideVariants = {
  hidden: { x?: number; y?: number; opacity?: number };
  visible: { x: number; y: number; opacity: number };
};

export type ScaleVariants = {
  hidden: { scale: number; opacity?: number };
  visible: { scale: number; opacity: number };
};

// Export commonly used animation presets
export const FADE_VARIANTS: FadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

export const SLIDE_UP_VARIANTS: SlideVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

export const SCALE_VARIANTS: ScaleVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { scale: 1, opacity: 1 }
};

// Default transition configurations
export const DEFAULT_TRANSITION: TransitionConfig = {
  duration: 0.3,
  ease: 'easeOut'
};

export const SPRING_TRANSITION: TransitionConfig = {
  type: 'spring',
  stiffness: 300,
  damping: 30
};