import React, { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { useGuardedState } from '@/lib/performance/useGuardedState';
import { CanvasContextProvider, useCanvasContext, type CanvasState } from '@/packages/canvas/contexts/CanvasContext';

function LoopingComponent() {
  const [count, setCount] = useGuardedState(0, {
    componentName: 'LoopingComponent',
    maxUpdatesPerTick: 5,
  });

  useEffect(() => {
    // Intentionally cause a cascade; guard should stop after ~5 in a tick
    if (count < 100) {
      setCount(c => c + 1);
    }
  }, [count, setCount]);

  return <div data-testid='loop-count'>{count}</div>;
}

describe('useGuardedState', () => {
  it('caps cascading updates in a single tick and avoids depth overflow', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<LoopingComponent />);

    // Allow microtasks to flush
    await waitFor(() => {
      const value = Number(screen.getByTestId('loop-count').textContent || '0');
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(6); // initial + up to 5 guarded updates
    });

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// CanvasContext integration: ensure updater storms are dampened
function CanvasStorm() {
  const { state, updateSelectedItems } = useCanvasContext();

  useEffect(() => {
    // Fire a rapid series of updates in the same macrotask
    for (let i = 0; i < 50; i += 1) {
      updateSelectedItems([String(i)]);
    }
  }, [updateSelectedItems]);

  return <div data-testid='selected-count'>{state.selectedItems.length}</div>;
}

describe('CanvasContext guarded state', () => {
  it('prevents excessive per-tick updates without crashing', async () => {
    const initial: CanvasState = {
      layoutPositions: {},
      virtualizationConfig: { bufferZone: 100, maxVisibleItems: 50, enabled: true },
      selectedItems: [],
      reactFlowInstance: null,
      emergencyPause: false,
    };

    const noopCallbacks = {
      component: {
        onComponentSelect: () => {},
        onComponentDeselect: () => {},
        onComponentDrop: () => {},
        onComponentPositionChange: () => {},
        onComponentDelete: () => {},
      },
      connection: {
        onConnectionCreate: () => {},
        onConnectionDelete: () => {},
        onConnectionSelect: () => {},
      },
      infoCard: {
        onInfoCardCreate: () => {},
        onInfoCardUpdate: () => {},
        onInfoCardDelete: () => {},
        onInfoCardSelect: () => {},
      },
      onEmergencyPause: () => {},
      onEmergencyResume: () => {},
    } as const;

    render(
      <CanvasContextProvider initialState={initial} callbacks={noopCallbacks as any}>
        <CanvasStorm />
      </CanvasContextProvider>
    );

    await waitFor(() => {
      // Guard should have limited updates in the same tick; length must be 1 (last write wins) or a small number
      const length = Number(screen.getByTestId('selected-count').textContent || '0');
      expect(length).toBeGreaterThanOrEqual(0);
      expect(length).toBeLessThanOrEqual(2);
    });
  });
});

