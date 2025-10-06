/**
 * src/lib/events/canvasEvents.ts
 * Typed canvas event bus to replace stringly-typed window events
 * Provides type-safe event dispatching and listening with automatic cleanup
 * RELEVANT FILES: CanvasContent.tsx, CanvasInteractionLayer.tsx
 */

// Canvas event type definitions
export interface CanvasEventMap {
  // Selection events
  'canvas:selection-drag-start': { x: number; y: number };
  'canvas:selection-drag-move': { x: number; y: number; width: number; height: number };
  'canvas:selection-drag-end': void;
  'canvas:toggle-component-selection': { componentId: string };
  'canvas:select-all': void;
  'canvas:clear-selection': void;

  // Drawing mode events
  'canvas:exit-drawing-mode': void;

  // Component events
  'canvas:add-component': { componentType: string; position?: { x: number; y: number }; source?: string };
  'canvas:add-last-component': { componentType: string | null };

  // Shortcut events
  'shortcut:duplicate': void;
  'shortcut:group': void;
  'shortcut:ungroup': void;
  'shortcut:lock-components': void;
  'shortcut:unlock-components': void;
  'shortcut:align-left': void;
  'shortcut:align-right': void;
  'shortcut:align-top': void;
  'shortcut:align-bottom': void;
  'shortcut:select-all': void;
  'shortcut:clear-selection': void;
  'shortcut:exit-draw-mode': void;
  'shortcut:quick-add-component': void;
}

export type CanvasEventType = keyof CanvasEventMap;

// Type-safe event listener
export type CanvasEventListener<T extends CanvasEventType> = (
  detail: CanvasEventMap[T]
) => void;

/**
 * Canvas-scoped event bus helper
 * Provides typed event dispatching with automatic cleanup
 */
class CanvasEventBus {
  private listeners = new Map<string, Set<Function>>();

  /**
   * Add a typed event listener
   * Returns a cleanup function to remove the listener
   */
  on<T extends CanvasEventType>(
    eventType: T,
    listener: CanvasEventListener<T>
  ): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<CanvasEventMap[T]>;
      listener(customEvent.detail);
    };

    window.addEventListener(eventType, handler);

    // Track for cleanup
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Return cleanup function
    return () => {
      window.removeEventListener(eventType, handler);
      this.listeners.get(eventType)?.delete(handler);
    };
  }

  /**
   * Dispatch a typed canvas event
   */
  emit<T extends CanvasEventType>(
    eventType: T,
    ...args: CanvasEventMap[T] extends void ? [] : [CanvasEventMap[T]]
  ): void {
    const detail = args[0];
    window.dispatchEvent(
      new CustomEvent(eventType, { detail })
    );
  }

  /**
   * Remove all listeners for a specific event type
   */
  off<T extends CanvasEventType>(eventType: T): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(handler => {
        window.removeEventListener(eventType, handler as EventListener);
      });
      this.listeners.delete(eventType);
    }
  }

  /**
   * Remove all event listeners
   */
  offAll(): void {
    this.listeners.forEach((listeners, eventType) => {
      listeners.forEach(handler => {
        window.removeEventListener(eventType, handler as EventListener);
      });
    });
    this.listeners.clear();
  }
}

// Singleton instance
export const canvasEventBus = new CanvasEventBus();

// React hook for canvas events with automatic cleanup
import { useEffect } from 'react';

export function useCanvasEvent<T extends CanvasEventType>(
  eventType: T,
  listener: CanvasEventListener<T>,
  deps: React.DependencyList = []
): void {
  useEffect(() => {
    return canvasEventBus.on(eventType, listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

// Helper to emit canvas events
export function emitCanvasEvent<T extends CanvasEventType>(
  eventType: T,
  ...args: CanvasEventMap[T] extends void ? [] : [CanvasEventMap[T]]
): void {
  canvasEventBus.emit(eventType, ...args);
}
