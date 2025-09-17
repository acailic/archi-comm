// src/stores/canvas/utils/debugging.ts
// Debug logging functionality for canvas store
// Enhanced debug logging with performance tracking and stack traces
// RELEVANT FILES: ../slices/coreSlice.ts, ../slices/uiSlice.ts, validation.ts

import { deepEqual } from './validation';

// Enhanced debug logging with performance tracking and stack traces
export const debugMetrics = {
  updateCount: 0,
  lastUpdateTime: 0,
  avgEqualityCheckTime: 0,
};

export function debugLog(action: string, oldValue: any, newValue: any, source?: string) {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now();
    const changed = !deepEqual(oldValue, newValue);
    const endTime = performance.now();
    const equalityCheckTime = endTime - startTime;

    debugMetrics.updateCount++;
    debugMetrics.lastUpdateTime = Date.now();
    debugMetrics.avgEqualityCheckTime =
      (debugMetrics.avgEqualityCheckTime * (debugMetrics.updateCount - 1) + equalityCheckTime) /
      debugMetrics.updateCount;

    if (changed) {
      console.debug(`[CanvasStore] ${action}:`, {
        changed,
        oldLength: Array.isArray(oldValue) ? oldValue.length : 'N/A',
        newLength: Array.isArray(newValue) ? newValue.length : 'N/A',
        equalityCheckTime: `${equalityCheckTime.toFixed(2)}ms`,
        source: source ?? 'unknown',
        stackTrace: new Error().stack?.split('\n').slice(2, 5).join('\n'),
      });
    }

    // Log performance warnings
    if (equalityCheckTime > 5) {
      console.warn(
        `[CanvasStore] Slow equality check for ${action}: ${equalityCheckTime.toFixed(2)}ms`
      );
    }
  }
}