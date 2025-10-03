import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuickConnect } from '../../packages/canvas/hooks/useQuickConnect';
import { useCanvasStore } from '../../stores/canvasStore';
import { resetTestStores } from '../../test/react-testing-utils';
import {
  createTestComponent,
  createTestConnection,
  setupCanvasStore,
  mockConsoleWarn,
} from './test-helpers';
import type { DesignComponent, Connection } from '../../shared/contracts';

describe('Quick Connect Integration', () => {
  const mockOnConnectionCreate = vi.fn();

  const getComponents = (): DesignComponent[] => [
    createTestComponent('comp-1', 'client'),
    createTestComponent('comp-2', 'api-gateway'),
    createTestComponent('comp-3', 'database'),
    createTestComponent('comp-4', 'server'),
  ];

  beforeEach(() => {
    resetTestStores();
    vi.clearAllMocks();
    setupCanvasStore(getComponents(), []);
  });

  const renderQuickConnect = () => renderHook(() => useQuickConnect(mockOnConnectionCreate));

  describe('Hook Initialization', () => {
    it('should expose initial state defaults', () => {
      const { result } = renderHook(() => useQuickConnect());

      expect(result.current.isQuickConnectMode).toBe(false);
      expect(result.current.quickConnectSource).toBeNull();
      expect(result.current.quickConnectPreview).toBeNull();
    });

    it('should provide full quick connect API', () => {
      const { result } = renderHook(() => useQuickConnect());

      expect(typeof result.current.startQuickConnect).toBe('function');
      expect(typeof result.current.completeQuickConnect).toBe('function');
      expect(typeof result.current.cancelQuickConnect).toBe('function');
      expect(typeof result.current.updatePreview).toBe('function');
      expect(typeof result.current.isValidTarget).toBe('function');
    });
  });

  describe('Starting Quick Connect', () => {
    it('should enable quick-connect mode and set source', () => {
      const { result } = renderQuickConnect();

      act(() => {
        result.current.startQuickConnect('comp-1');
      });

      expect(result.current.isQuickConnectMode).toBe(true);
      expect(result.current.quickConnectSource).toBe('comp-1');
      expect(useCanvasStore.getState().canvasMode).toBe('quick-connect');
    });

    it('should update source when starting from a different component', () => {
      const { result } = renderQuickConnect();

      act(() => {
        result.current.startQuickConnect('comp-1');
        result.current.startQuickConnect('comp-2');
      });

      expect(result.current.quickConnectSource).toBe('comp-2');
    });
  });

  describe('Completing Quick Connect', () => {
    it('should create connection for valid target and reset state', () => {
      const { result } = renderQuickConnect();

      act(() => {
        result.current.startQuickConnect('comp-1');
        result.current.completeQuickConnect('comp-2');
      });

      expect(mockOnConnectionCreate).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'comp-1', to: 'comp-2', type: 'data' }),
      );
      expect(result.current.quickConnectSource).toBeNull();
      expect(result.current.quickConnectPreview).toBeNull();
      expect(result.current.isQuickConnectMode).toBe(false);
      expect(useCanvasStore.getState().canvasMode).toBe('select');
    });

    const connectionTypeScenarios: Array<Connection['type']> = ['data', 'control', 'async'];

    test.each(connectionTypeScenarios)('should respect %s default connection type', (type) => {
      resetTestStores();
      setupCanvasStore(getComponents(), []);

      act(() => {
        useCanvasStore.getState().setDefaultConnectionType(type);
      });

      const { result } = renderQuickConnect();

      act(() => {
        result.current.startQuickConnect('comp-1');
        result.current.completeQuickConnect('comp-2');
      });

      expect(mockOnConnectionCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({ type }),
      );
    });
  });

  describe('Connection Validation', () => {
    interface InvalidScenario {
      name: string;
      setup?: () => void;
      target: string;
      expectedError: string;
    }

    const invalidScenarios: InvalidScenario[] = [
      {
        name: 'self-connection',
        target: 'comp-1',
        expectedError: 'Cannot connect component to itself',
      },
      {
        name: 'duplicate connection',
        setup: () => {
          setupCanvasStore(getComponents(), [
            createTestConnection('conn-1', 'comp-1', 'comp-2'),
          ]);
        },
        target: 'comp-2',
        expectedError: 'Connection already exists',
      },
    ];

    test.each(invalidScenarios)('should reject %s', ({ setup, target, expectedError }) => {
      setup?.();
      const { spy, restore } = mockConsoleWarn();
      const { result } = renderQuickConnect();

      act(() => {
        result.current.startQuickConnect('comp-1');
        result.current.completeQuickConnect(target);
      });

      expect(mockOnConnectionCreate).not.toHaveBeenCalled();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining(expectedError));
      expect(result.current.quickConnectSource).toBe('comp-1');
      expect(result.current.isQuickConnectMode).toBe(true);
      restore();
    });
  });

  describe('State Management', () => {
    it('should cancel quick connect and reset state', () => {
      const { result } = renderQuickConnect();

      act(() => {
        result.current.startQuickConnect('comp-1');
        result.current.updatePreview({ x: 100, y: 200 });
        result.current.cancelQuickConnect();
      });

      expect(result.current.quickConnectSource).toBeNull();
      expect(result.current.quickConnectPreview).toBeNull();
      expect(result.current.isQuickConnectMode).toBe(false);
    });

    it('should update preview while in quick-connect mode', () => {
      const { result } = renderQuickConnect();

      act(() => {
        result.current.startQuickConnect('comp-1');
        result.current.updatePreview({ x: 320, y: 480 });
      });

      expect(result.current.quickConnectPreview).toEqual({ x: 320, y: 480 });
    });

    it('should stay in sync with canvas store state', () => {
      const { result } = renderHook(() => useQuickConnect());

      act(() => {
        useCanvasStore.getState().setCanvasMode('quick-connect');
        useCanvasStore.getState().setQuickConnectSource('comp-2');
      });

      expect(result.current.isQuickConnectMode).toBe(true);
      expect(result.current.quickConnectSource).toBe('comp-2');
      expect(result.current.isValidTarget('comp-3')).toBe(true);
    });
  });
});
