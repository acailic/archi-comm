import { useMemo, useRef, useCallback } from 'react';
import { shallow } from 'zustand/shallow';

import { stateManager, type UnifiedState, type UnifiedActions } from '@stores/StateManager';
import { useOptimizedSelector } from './useOptimizedSelector';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';

export interface UseUnifiedStateOptions<TSelected> {
  equalityFn?: (a: TSelected, b: TSelected) => boolean;
  trackLabel?: string;
}

export function useUnifiedState<TSelected = UnifiedState>(
  selector?: (state: UnifiedState) => TSelected,
  options?: UseUnifiedStateOptions<TSelected>
): { state: TSelected; actions: UnifiedActions } {
  // Infinite loop detection
  const renderCountRef = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const loopDetector = InfiniteLoopDetector.getInstance();

  // Track render frequency
  renderCountRef.current++;
  const now = Date.now();
  if (now - lastRenderTime.current < 100 && renderCountRef.current % 10 === 0) {
    console.warn(`useUnifiedState rendered ${renderCountRef.current} times in quick succession`);
    loopDetector.notifyRenderLoop('useUnifiedState', renderCountRef.current);
  }
  lastRenderTime.current = now;

  // Stabilize selector function if provided
  const selectorRef = useRef(selector);
  const stableSelector = useCallback((state: UnifiedState) => {
    const currentSelector = selectorRef.current;
    if (currentSelector) {
      try {
        return currentSelector(state);
      } catch (error) {
        console.error('Error in useUnifiedState selector:', error);
        // Return fallback - just the whole state
        return state as unknown as TSelected;
      }
    }
    return state as unknown as TSelected;
  }, []);

  // Update selector ref without causing re-renders
  selectorRef.current = selector;

  // Stabilize equality function
  const equalityFnRef = useRef(options?.equalityFn);
  const stableEqualityFn = useCallback((a: TSelected, b: TSelected) => {
    const currentEqualityFn = equalityFnRef.current ?? (selector ? shallow : Object.is);
    try {
      return currentEqualityFn(a, b);
    } catch (error) {
      console.error('Error in useUnifiedState equality function:', error);
      // Fallback to reference equality
      return a === b;
    }
  }, [selector]);

  // Update equality function ref without causing re-renders
  equalityFnRef.current = options?.equalityFn;

  const state = useOptimizedSelector(
    stateManager.getSource(),
    stableSelector,
    {
      equalityFn: stableEqualityFn,
      debugLabel: options?.trackLabel ?? 'useUnifiedState',
    }
  );

  // Ensure actions object is truly stable
  const actionsRef = useRef<UnifiedActions | null>(null);
  if (!actionsRef.current) {
    actionsRef.current = stateManager.getActions();
  }

  const stableActions = useMemo(() => {
    // Verify the actions haven't changed
    const currentActions = stateManager.getActions();
    if (actionsRef.current !== currentActions) {
      console.warn('StateManager actions object changed, updating reference');
      actionsRef.current = currentActions;
    }
    return actionsRef.current!;
  }, []);

  return { state, actions: stableActions };
}
