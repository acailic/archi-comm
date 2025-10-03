/**
 * src/packages/canvas/utils/canvas-effects.ts
 * Visual effects utilities for canvas celebrations and feedback
 * Provides confetti, particle bursts, ripples, and other animations
 * RELEVANT FILES: useCanvasAnimations.ts, canvas-colors.ts, CustomNodeView.tsx, CustomEdge.tsx
 */

import confetti from 'canvas-confetti';

export interface EffectOptions {
  duration?: number;
  particleCount?: number;
  spread?: number;
  colors?: string[];
  intensity?: number;
}

// Active effect tracking to prevent too many simultaneous effects
const activeEffects = new Set<string>();
const MAX_ACTIVE_EFFECTS = 5;
const EFFECT_THROTTLE_MS = 100;
let lastEffectTime = 0;

/**
 * Check if we should allow a new effect based on throttling and limits
 */
function shouldAllowEffect(): boolean {
  const now = Date.now();
  if (now - lastEffectTime < EFFECT_THROTTLE_MS) {
    return false;
  }
  if (activeEffects.size >= MAX_ACTIVE_EFFECTS) {
    return false;
  }
  lastEffectTime = now;
  return true;
}

/**
 * Register an active effect
 */
function registerEffect(effectId: string, duration: number): void {
  activeEffects.add(effectId);
  setTimeout(() => {
    activeEffects.delete(effectId);
  }, duration);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Show confetti effect at specified position
 */
export function showConfetti(
  x: number,
  y: number,
  options: EffectOptions = {}
): void {
  if (prefersReducedMotion() || !shouldAllowEffect()) {
    return;
  }

  const {
    duration = 1500,
    particleCount = 50,
    spread = 60,
    colors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899'],
  } = options;

  const effectId = `confetti-${Date.now()}`;
  registerEffect(effectId, duration);

  // Convert canvas coordinates to viewport normalized coordinates
  const canvas = document.querySelector('.react-flow') as HTMLElement;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const normalizedX = (x + rect.left) / window.innerWidth;
  const normalizedY = (y + rect.top) / window.innerHeight;

  confetti({
    particleCount,
    spread,
    origin: { x: normalizedX, y: normalizedY },
    colors,
    ticks: duration / 16, // ~60fps
    gravity: 1.2,
    scalar: 0.8,
    drift: 0,
  });
}

/**
 * Show particle burst effect
 */
export function showParticleBurst(
  x: number,
  y: number,
  color: string,
  count: number = 20
): void {
  if (prefersReducedMotion() || !shouldAllowEffect()) {
    return;
  }

  const effectId = `particle-${Date.now()}`;
  registerEffect(effectId, 1000);

  const canvas = document.querySelector('.react-flow') as HTMLElement;
  if (!canvas) return;

  const particles: HTMLElement[] = [];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'canvas-particle';
    particle.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: ${color};
      pointer-events: none;
      z-index: 9999;
    `;

    canvas.appendChild(particle);
    particles.push(particle);

    const angle = (Math.PI * 2 * i) / count;
    const velocity = 50 + Math.random() * 50;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;

    let posX = x;
    let posY = y;
    let opacity = 1;
    let frame = 0;
    const maxFrames = 60;

    const animate = () => {
      if (frame >= maxFrames) {
        particle.remove();
        return;
      }

      frame++;
      posX += vx * 0.016;
      posY += vy * 0.016 + frame * 0.2; // Gravity
      opacity = 1 - frame / maxFrames;

      particle.style.left = `${posX}px`;
      particle.style.top = `${posY}px`;
      particle.style.opacity = `${opacity}`;

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  // Cleanup after animation
  setTimeout(() => {
    particles.forEach(p => p.remove());
  }, 1000);
}

/**
 * Show ripple effect at position
 */
export function showRipple(x: number, y: number, color: string): void {
  if (prefersReducedMotion() || !shouldAllowEffect()) {
    return;
  }

  const effectId = `ripple-${Date.now()}`;
  registerEffect(effectId, 600);

  const canvas = document.querySelector('.react-flow') as HTMLElement;
  if (!canvas) return;

  const rippleCount = 3;

  for (let i = 0; i < rippleCount; i++) {
    setTimeout(() => {
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 0;
        height: 0;
        border: 2px solid ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9998;
        transform: translate(-50%, -50%);
        animation: ripple-expand 600ms ease-out forwards;
      `;

      canvas.appendChild(ripple);

      setTimeout(() => ripple.remove(), 600);
    }, i * 100);
  }

  // Add CSS animation if not already present
  if (!document.getElementById('ripple-animation-style')) {
    const style = document.createElement('style');
    style.id = 'ripple-animation-style';
    style.textContent = `
      @keyframes ripple-expand {
        from {
          width: 0;
          height: 0;
          opacity: 1;
        }
        to {
          width: 100px;
          height: 100px;
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Shake element by ID
 */
export function shakeElement(elementId: string, intensity: number = 10): void {
  if (prefersReducedMotion()) {
    return;
  }

  const element = document.getElementById(elementId);
  if (!element) return;

  const effectId = `shake-${elementId}-${Date.now()}`;
  registerEffect(effectId, 400);

  element.classList.add('canvas-shake');

  // Remove class after animation
  setTimeout(() => {
    element.classList.remove('canvas-shake');
  }, 400);

  // Add CSS animation if not already present
  if (!document.getElementById('shake-animation-style')) {
    const style = document.createElement('style');
    style.id = 'shake-animation-style';
    style.textContent = `
      @keyframes canvas-shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-${intensity}px); }
        20%, 40%, 60%, 80% { transform: translateX(${intensity}px); }
      }
      .canvas-shake {
        animation: canvas-shake 400ms ease-in-out;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Pulse glow effect on element
 */
export function pulseGlow(
  elementId: string,
  color: string,
  duration: number = 1000,
  loop: boolean = false
): () => void {
  if (prefersReducedMotion()) {
    return () => {};
  }

  const element = document.getElementById(elementId);
  if (!element) return () => {};

  const effectId = `glow-${elementId}-${Date.now()}`;
  registerEffect(effectId, duration);

  const originalBoxShadow = element.style.boxShadow;
  const iterationCount = loop ? 'infinite' : '1';

  element.style.animation = `pulse-glow ${duration}ms ease-in-out ${iterationCount}`;
  element.style.setProperty('--glow-color', color);

  // Add CSS animation if not already present
  if (!document.getElementById('glow-animation-style')) {
    const style = document.createElement('style');
    style.id = 'glow-animation-style';
    style.textContent = `
      @keyframes pulse-glow {
        0%, 100% {
          box-shadow: 0 0 0 0 var(--glow-color);
        }
        50% {
          box-shadow: 0 0 20px 5px var(--glow-color);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Cleanup function
  const cleanup = () => {
    element.style.animation = '';
    element.style.boxShadow = originalBoxShadow;
  };

  if (!loop) {
    setTimeout(cleanup, duration);
  }

  return cleanup;
}

/**
 * Animate SVG path drawing
 */
export function animatePathDraw(
  pathElement: SVGPathElement,
  duration: number = 500
): Promise<void> {
  if (prefersReducedMotion()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const effectId = `path-${Date.now()}`;
    registerEffect(effectId, duration);

    const length = pathElement.getTotalLength();

    // Set up the starting positions
    pathElement.style.strokeDasharray = `${length}`;
    pathElement.style.strokeDashoffset = `${length}`;
    pathElement.style.transition = `stroke-dashoffset ${duration}ms ease-in-out`;

    // Trigger the drawing animation
    requestAnimationFrame(() => {
      pathElement.style.strokeDashoffset = '0';
    });

    // Resolve when animation completes
    setTimeout(() => {
      pathElement.style.strokeDasharray = '';
      pathElement.style.strokeDashoffset = '';
      pathElement.style.transition = '';
      resolve();
    }, duration);
  });
}

/**
 * Show sparkle trail along a path
 */
export function showSparkleTrail(
  points: { x: number; y: number }[],
  color: string
): void {
  if (prefersReducedMotion() || !shouldAllowEffect() || points.length < 2) {
    return;
  }

  const effectId = `sparkle-${Date.now()}`;
  registerEffect(effectId, 1000);

  const canvas = document.querySelector('.react-flow') as HTMLElement;
  if (!canvas) return;

  points.forEach((point, index) => {
    setTimeout(() => {
      const sparkle = document.createElement('div');
      sparkle.style.cssText = `
        position: absolute;
        left: ${point.x}px;
        top: ${point.y}px;
        width: 6px;
        height: 6px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 0 10px ${color};
        animation: sparkle-fade 400ms ease-out forwards;
      `;

      canvas.appendChild(sparkle);

      setTimeout(() => sparkle.remove(), 400);
    }, index * 50);
  });

  // Add CSS animation if not already present
  if (!document.getElementById('sparkle-animation-style')) {
    const style = document.createElement('style');
    style.id = 'sparkle-animation-style';
    style.textContent = `
      @keyframes sparkle-fade {
        0% {
          opacity: 0;
          transform: scale(0);
        }
        50% {
          opacity: 1;
          transform: scale(1.2);
        }
        100% {
          opacity: 0;
          transform: scale(0.8);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Show success effect (confetti + ripple)
 */
export function showSuccessEffect(x: number, y: number): void {
  showConfetti(x, y, {
    particleCount: 30,
    spread: 50,
    colors: ['#10b981', '#34d399', '#6ee7b7'],
  });
  showRipple(x, y, '#10b981');
}

/**
 * Show error effect (shake + red flash)
 */
export function showErrorEffect(x: number, y: number): void {
  const canvas = document.querySelector('.react-flow') as HTMLElement;
  if (!canvas) return;

  // Find nearest element to shake
  const element = document.elementFromPoint(x, y) as HTMLElement;
  if (element && element.id) {
    shakeElement(element.id, 5);
  }

  // Show red ripple
  showRipple(x, y, '#ef4444');
}

/**
 * Cleanup all active effects
 */
export function cleanupAllEffects(): void {
  activeEffects.clear();

  // Remove all particle elements
  document.querySelectorAll('.canvas-particle').forEach(el => el.remove());

  // Remove all effect classes
  document.querySelectorAll('.canvas-shake').forEach(el => {
    el.classList.remove('canvas-shake');
  });
}

/**
 * Get current active effect count
 */
export function getActiveEffectCount(): number {
  return activeEffects.size;
}
