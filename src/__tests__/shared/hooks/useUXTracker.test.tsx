import { describe, beforeEach, afterEach, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const trackActionMock = vi.fn();
const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('@/lib/user-experience/UXOptimizer', () => ({
  useUXOptimizer: () => ({
    trackAction: trackActionMock,
  }),
}));

vi.mock('@/lib/logging/logger', () => ({
  getLogger: () => loggerMock,
}));

vi.mock('@/lib/logging/errorStore', () => ({
  addError: vi.fn(),
  addPerformanceError: vi.fn(),
  errorStore: { subscribe: vi.fn(), getState: vi.fn() },
}));

import { useUXTracker } from '@/shared/hooks/common/useUXTracker';

describe('useUXTracker', () => {
  beforeEach(() => {
    trackActionMock.mockClear();
    loggerMock.info.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('tracks navigation events through the UX optimizer', () => {
    const { result } = renderHook(() => useUXTracker());

    result.current.trackNavigation('canvas', 'home');

    expect(trackActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'navigate',
        data: expect.objectContaining({ screen: 'canvas', previousScreen: 'home' }),
      }),
    );
  });

  it('tracks canvas actions with contextual metadata', () => {
    const { result } = renderHook(() => useUXTracker());

    result.current.trackCanvasAction('component-drop', { componentType: 'api' }, true);

    expect(trackActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'component-drop',
        context: expect.objectContaining({ page: 'design-canvas' }),
        success: true,
      }),
    );
  });

  it('tracks dialog interactions', () => {
    const { result } = renderHook(() => useUXTracker());

    result.current.trackDialogAction('accept', 'help', { id: 'dialog-1' });

    expect(trackActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'dialog-action',
        data: expect.objectContaining({ dialogType: 'help' }),
      }),
    );
  });
});
