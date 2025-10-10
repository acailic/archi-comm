import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

const trackActionMock = vi.fn();

vi.mock('@/lib/user-experience/UXOptimizer', () => ({
  useUXOptimizer: () => ({
    trackAction: trackActionMock,
  }),
}));

vi.mock('@/lib/logging/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
  }),
}));

vi.mock('@/lib/logging/errorStore', () => ({
  addError: vi.fn(),
  addPerformanceError: vi.fn(),
  errorStore: { getState: () => ({ errors: [] }) },
}));

import { useUXTracker } from '@/shared/hooks/common/useUXTracker';

afterEach(() => {
  trackActionMock.mockClear();
});

describe('useUXTracker SSR safety', () => {
  it('operates without browser globals', () => {
    const originalWindow = (globalThis as any).window;
    const originalNavigator = (globalThis as any).navigator;
    const originalPerformance = (globalThis as any).performance;

    (globalThis as any).window = undefined;
    (globalThis as any).navigator = undefined;
    (globalThis as any).performance = undefined;

    try {
      const { result } = renderHook(() => useUXTracker());

      expect(() => result.current.trackNavigation('canvas', 'home')).not.toThrow();
      expect(() =>
        result.current.trackCanvasAction('component-drop', { componentType: 'api' }, true),
      ).not.toThrow();
      expect(() =>
        result.current.trackDialogAction('open', 'help', { id: 'dialog-ssr' }),
      ).not.toThrow();
      expect(() =>
        result.current.trackKeyboardShortcut('Ctrl+S', 'save', true),
      ).not.toThrow();
      expect(() => result.current.trackPerformance('render-time', 120)).not.toThrow();
      expect(() => result.current.trackError(new Error('SSR failure test'))).not.toThrow();
    } finally {
      (globalThis as any).window = originalWindow;
      (globalThis as any).navigator = originalNavigator;
      (globalThis as any).performance = originalPerformance;
    }
  });
});
