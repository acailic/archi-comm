/**
 * src/packages/canvas/hooks/useCanvasAnimations.ts
 * Centralized hook for managing canvas animations and visual effects
 * Provides animation controls for nodes, connections, and canvas-wide effects
 * RELEVANT FILES: canvas-effects.ts, canvasStore.ts, CustomNodeView.tsx, CustomEdge.tsx
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationsEnabled, useAnimationSpeed, useCanvasComponents } from '@/stores/canvasStore';
import {
  showConfetti,
  showParticleBurst,
  showRipple,
  shakeElement,
  pulseGlow,
  animatePathDraw,
  showSparkleTrail,
  showSuccessEffect,
  showErrorEffect,
  prefersReducedMotion,
  cleanupAllEffects,
  getActiveEffectCount,
} from '../utils/canvas-effects';

export interface UseCanvasAnimationsReturn {
  // Node animations
  animateNodeEntrance: (nodeId: string) => Promise<void>;
  animateNodeExit: (nodeId: string) => Promise<void>;
  animateNodeSelection: (nodeId: string) => void;
  animateNodeDrag: (nodeId: string, isDragging: boolean) => void;

  // Connection animations
  animateConnectionDraw: (connectionId: string) => Promise<void>;
  animateConnectionFlow: (connectionId: string, direction: 'forward' | 'backward') => void;
  animateConnectionPulse: (connectionId: string) => void;

  // Canvas effects
  showSuccessEffect: (x: number, y: number) => void;
  showErrorEffect: (x: number, y: number) => void;
  showHintEffect: (elementId: string) => void;

  // Animation management
  isAnimating: boolean;
  animationsEnabled: boolean;
  toggleAnimations: () => void;
  cleanup: () => void;
}

/**
 * Hook for managing canvas animations
 */
export function useCanvasAnimations(): UseCanvasAnimationsReturn {
  const animationsEnabled = useAnimationsEnabled();
  const animationSpeed = useAnimationSpeed();
  const components = useCanvasComponents();
  const [isAnimating, setIsAnimating] = useState(false);
  const animationCountRef = useRef(0);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  // Check if animations should be disabled due to performance
  const shouldDisableAnimations = components.length > 20;

  // Update animation state
  useEffect(() => {
    setIsAnimating(animationCountRef.current > 0);
  }, []);

  /**
   * Register an active animation
   */
  const registerAnimation = useCallback((duration: number) => {
    animationCountRef.current++;
    setIsAnimating(true);

    setTimeout(() => {
      animationCountRef.current = Math.max(0, animationCountRef.current - 1);
      if (animationCountRef.current === 0) {
        setIsAnimating(false);
      }
    }, duration);
  }, []);

  /**
   * Check if animations are allowed
   */
  const areAnimationsAllowed = useCallback((): boolean => {
    return (
      animationsEnabled &&
      !prefersReducedMotion() &&
      !shouldDisableAnimations &&
      getActiveEffectCount() < 10
    );
  }, [animationsEnabled, shouldDisableAnimations]);

  /**
   * Get adjusted duration based on animation speed
   */
  const getAdjustedDuration = useCallback(
    (baseDuration: number): number => {
      return baseDuration / animationSpeed;
    },
    [animationSpeed]
  );

  /**
   * Animate node entrance with scale-in effect
   */
  const animateNodeEntrance = useCallback(
    async (nodeId: string): Promise<void> => {
      if (!areAnimationsAllowed()) return;

      const duration = getAdjustedDuration(300);
      registerAnimation(duration);

      const nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
      if (!nodeElement) return;

      nodeElement.style.transform = 'scale(0.95)';
      nodeElement.style.opacity = '0';
      nodeElement.style.transition = `transform ${duration}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${duration}ms ease-out`;

      // Trigger animation
      requestAnimationFrame(() => {
        nodeElement.style.transform = 'scale(1)';
        nodeElement.style.opacity = '1';
      });

      // Cleanup after animation
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          nodeElement.style.transform = '';
          nodeElement.style.opacity = '';
          nodeElement.style.transition = '';
          resolve();
        }, duration);
      });
    },
    [areAnimationsAllowed, getAdjustedDuration, registerAnimation]
  );

  /**
   * Animate node exit with fade-out effect
   */
  const animateNodeExit = useCallback(
    async (nodeId: string): Promise<void> => {
      if (!areAnimationsAllowed()) return;

      const duration = getAdjustedDuration(200);
      registerAnimation(duration);

      const nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
      if (!nodeElement) return;

      nodeElement.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`;
      nodeElement.style.opacity = '0';
      nodeElement.style.transform = 'scale(0.9)';

      await new Promise<void>((resolve) => {
        setTimeout(resolve, duration);
      });
    },
    [areAnimationsAllowed, getAdjustedDuration, registerAnimation]
  );

  /**
   * Animate node selection with ripple effect
   */
  const animateNodeSelection = useCallback(
    (nodeId: string): void => {
      if (!areAnimationsAllowed()) return;

      const nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
      if (!nodeElement) return;

      const rect = nodeElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      showRipple(centerX, centerY, '#3b82f6');
      registerAnimation(600);
    },
    [areAnimationsAllowed, registerAnimation]
  );

  /**
   * Animate node drag with tilt effect
   */
  const animateNodeDrag = useCallback(
    (nodeId: string, isDragging: boolean): void => {
      if (!areAnimationsAllowed()) return;

      const nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
      if (!nodeElement) return;

      if (isDragging) {
        nodeElement.style.transform = 'rotate(2deg) scale(1.02)';
        nodeElement.style.transition = 'transform 150ms ease-out';
      } else {
        nodeElement.style.transform = '';
        nodeElement.style.transition = 'transform 200ms ease-out';
      }
    },
    [areAnimationsAllowed]
  );

  /**
   * Animate connection drawing
   */
  const animateConnectionDraw = useCallback(
    async (connectionId: string): Promise<void> => {
      if (!areAnimationsAllowed()) return;

      const duration = getAdjustedDuration(500);
      registerAnimation(duration);

      const pathElement = document.querySelector(
        `[data-id="${connectionId}"] path`
      ) as SVGPathElement;
      if (!pathElement) return;

      await animatePathDraw(pathElement, duration);
    },
    [areAnimationsAllowed, getAdjustedDuration, registerAnimation]
  );

  /**
   * Animate connection flow with moving particles
   */
  const animateConnectionFlow = useCallback(
    (connectionId: string, direction: 'forward' | 'backward'): void => {
      if (!areAnimationsAllowed()) return;

      const pathElement = document.querySelector(
        `[data-id="${connectionId}"] path`
      ) as SVGPathElement;
      if (!pathElement) return;

      const length = pathElement.getTotalLength();
      const particleCount = 5;
      const points: { x: number; y: number }[] = [];

      for (let i = 0; i < particleCount; i++) {
        const distance = direction === 'forward'
          ? (length * i) / particleCount
          : length - (length * i) / particleCount;
        const point = pathElement.getPointAtLength(distance);
        points.push({ x: point.x, y: point.y });
      }

      showSparkleTrail(points, '#3b82f6');
      registerAnimation(1000);
    },
    [areAnimationsAllowed, registerAnimation]
  );

  /**
   * Animate connection pulse effect
   */
  const animateConnectionPulse = useCallback(
    (connectionId: string): void => {
      if (!areAnimationsAllowed()) return;

      const edgeElement = document.querySelector(`[data-id="${connectionId}"]`) as HTMLElement;
      if (!edgeElement || !edgeElement.id) return;

      const cleanup = pulseGlow(edgeElement.id, '#3b82f6', getAdjustedDuration(1000), false);
      cleanupFunctionsRef.current.push(cleanup);
      registerAnimation(1000);
    },
    [areAnimationsAllowed, getAdjustedDuration, registerAnimation]
  );

  /**
   * Show hint effect with pulsing highlight
   */
  const showHintEffect = useCallback(
    (elementId: string): void => {
      if (!areAnimationsAllowed()) return;

      const cleanup = pulseGlow(elementId, '#f59e0b', getAdjustedDuration(1500), true);
      cleanupFunctionsRef.current.push(cleanup);
      registerAnimation(1500);
    },
    [areAnimationsAllowed, getAdjustedDuration, registerAnimation]
  );

  /**
   * Cleanup all animations
   */
  const cleanup = useCallback((): void => {
    cleanupAllEffects();
    cleanupFunctionsRef.current.forEach((fn) => fn());
    cleanupFunctionsRef.current = [];
    animationCountRef.current = 0;
    setIsAnimating(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  /**
   * Toggle animations stub (actual toggle is in store)
   */
  const toggleAnimations = useCallback((): void => {
    // This is handled by the store action
    console.log('Toggle animations called');
  }, []);

  return {
    animateNodeEntrance,
    animateNodeExit,
    animateNodeSelection,
    animateNodeDrag,
    animateConnectionDraw,
    animateConnectionFlow,
    animateConnectionPulse,
    showSuccessEffect,
    showErrorEffect,
    showHintEffect,
    isAnimating,
    animationsEnabled,
    toggleAnimations,
    cleanup,
  };
}
