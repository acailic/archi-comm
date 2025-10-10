import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { CanvasSettingsPanel } from '@/packages/ui/components/canvas/CanvasSettingsPanel';
import { performanceMonitor } from '@/shared/utils/performanceMonitor';

const toggleGrid = vi.fn();
const toggleSnapToGrid = vi.fn();
const setGridSpacing = vi.fn();
const toggleMinimap = vi.fn();
const toggleAnimations = vi.fn();
const setAnimationSpeed = vi.fn();
const toggleSmartRouting = vi.fn();
const toggleConnectionBundling = vi.fn();
const setDefaultConnectionType = vi.fn();
const setDefaultPathStyle = vi.fn();

const mockState = {
  gridEnabled: true,
  snapToGrid: false,
  gridSpacing: 40,
  showMinimap: true,
  animationsEnabled: true,
  animationSpeed: 1,
  smartRouting: false,
  bundleConnections: false,
  defaultConnectionType: 'data' as const,
  defaultPathStyle: 'straight' as const,
  toggleGrid,
  toggleSnapToGrid,
  setGridSpacing,
  toggleMinimap,
  toggleAnimations,
  setAnimationSpeed,
  toggleSmartRouting,
  toggleConnectionBundling,
  setDefaultConnectionType,
  setDefaultPathStyle,
};

vi.mock('@/stores/canvasStore', async () => {
  const actual = await vi.importActual<typeof import('@/stores/canvasStore')>('@/stores/canvasStore');
  return {
    ...actual,
    useCanvasStore: (selector: (state: typeof mockState) => any) => selector(mockState),
  };
});

describe('CanvasSettingsPanel', () => {
  beforeEach(() => {
    vi.spyOn(performanceMonitor, 'getSystemMetrics').mockReturnValue({
      totalComponents: 3,
      slowComponents: 1,
      unstableCallbacks: 0,
      memoryPressure: 'low',
      overallScore: 92,
      recommendations: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('renders control values from the canvas store and toggles settings', async () => {
    const user = userEvent.setup();

    render(<CanvasSettingsPanel isOpen onClose={vi.fn()} />);

    const gridSwitch = screen.getByLabelText('Toggle canvas grid');
    expect(gridSwitch).toHaveAttribute('data-state', 'checked');

    await user.click(gridSwitch);
    expect(toggleGrid).toHaveBeenCalled();

    const smartRoutingSwitch = screen.getByLabelText('Toggle smart routing');
    await user.click(smartRoutingSwitch);
    expect(toggleSmartRouting).toHaveBeenCalled();

    await user.click(screen.getByLabelText('Choose default connection type'));
    await user.click(screen.getByRole('option', { name: 'Control' }));
    expect(setDefaultConnectionType).toHaveBeenCalledWith('control');
  });
});
