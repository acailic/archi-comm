// src/__tests__/components/DesignCanvas.infiniteLoop.test.tsx
// Comprehensive test suite to prevent infinite render loops in DesignCanvas
// Tests sync operations, error boundaries, and render guard functionality
// RELEVANT FILES: src/components/DesignCanvas.tsx, src/hooks/useInitialCanvasSync.ts, src/stores/canvasStore.ts

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DesignCanvas } from '@ui/components/DesignCanvas';
import { useCanvasStore } from '@/stores/canvasStore';
import type { Challenge, DesignData } from '@/shared/contracts';

// Mock dependencies
vi.mock('@/stores/canvasStore');
vi.mock('@/hooks/useInitialCanvasSync');
vi.mock('@/hooks/usePerformanceMonitor');
vi.mock('@/lib/challenge-config');
vi.mock('@services/storage');

// Mock HTML5Backend for DnD
vi.mock('react-dnd-html5-backend', () => ({
  HTML5Backend: {},
}));

// Mock React Flow
vi.mock('@canvas/components/ReactFlowCanvas', () => ({
  ReactFlowCanvas: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="react-flow-canvas">{children}</div>
  ),
  CANVAS_NODE_REGISTRY: new Map(),
  registerCanvasNodeType: vi.fn(),
}));

// Mock other components
vi.mock('@ui/components/AssignmentPanel', () => ({
  AssignmentPanel: () => <div data-testid="assignment-panel">Assignment Panel</div>,
}));

vi.mock('@ui/components/PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties-panel">Properties Panel</div>,
}));

vi.mock('@ui/components/StatusBar', () => ({
  StatusBar: () => <div data-testid="status-bar">Status Bar</div>,
}));

vi.mock('@ui/components/CommandPalette', () => ({
  CommandPalette: () => <div data-testid="command-palette">Command Palette</div>,
}));

vi.mock('@ui/components/ImportExportDropdown', () => ({
  ImportExportDropdown: () => <div data-testid="import-export">Import/Export</div>,
  useImportExportShortcuts: () => {},
}));

vi.mock('@ui/components/SolutionHints', () => ({
  SolutionHints: () => <div data-testid="solution-hints">Solution Hints</div>,
}));

vi.mock('@ui/components/Confetti', () => ({
  default: () => <div data-testid="confetti">Confetti</div>,
}));

describe('DesignCanvas Infinite Loop Prevention', () => {
  // Test data
  const mockChallenge: Challenge = {
    id: 'test-challenge',
    title: 'Test Challenge',
    description: 'Test description',
    difficulty: 'Medium',
    requirements: ['Requirement 1', 'Requirement 2'],
  };

  const mockInitialData: DesignData = {
    schemaVersion: 1,
    components: [
      {
        id: 'comp1',
        type: 'microservice',
        x: 100,
        y: 100,
        label: 'Service 1',
        properties: { showLabel: true },
      },
    ],
    connections: [
      {
        id: 'conn1',
        from: 'comp1',
        to: 'comp1',
        label: 'Self connection',
        type: 'data',
      },
    ],
    infoCards: [],
    layers: [],
    metadata: { version: '1.0' },
  };

  const mockCanvasActions = {
    setComponents: vi.fn(),
    setConnections: vi.fn(),
    setInfoCards: vi.fn(),
    setSelectedComponent: vi.fn(),
    setConnectionStart: vi.fn(),
    setVisualTheme: vi.fn(),
    updateComponents: vi.fn(),
    updateConnections: vi.fn(),
    updateInfoCards: vi.fn(),
    updateCanvasData: vi.fn(),
    resetCanvas: vi.fn(),
  };

  const mockUseCanvasStore = vi.mocked(useCanvasStore);

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock canvas store selectors
    mockUseCanvasStore.mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        const mockState = {
          components: mockInitialData.components,
          connections: mockInitialData.connections,
          infoCards: mockInitialData.infoCards,
          selectedComponent: null,
          connectionStart: null,
          visualTheme: 'serious' as const,
          ...mockCanvasActions,
        };
        return selector(mockState);
      }
      return mockCanvasActions;
    });

    // Mock useInitialCanvasSync
    vi.doMock('@/hooks/useInitialCanvasSync', () => ({
      useInitialCanvasSync: vi.fn(() => ({
        isSynced: true,
        lastSyncedChallengeId: 'test-challenge',
      })),
    }));

    // Suppress console warnings during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Sync Operations', () => {
    it('should mount without triggering infinite loops', async () => {
      const onComplete = vi.fn();
      const onBack = vi.fn();

      render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockInitialData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      // Wait for initial render to complete
      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Verify that sync was called but not excessively
      expect(mockCanvasActions.updateCanvasData).toHaveBeenCalledTimes(0); // Should use useInitialCanvasSync instead
    });

    it('should handle rapid challenge switching without loops', async () => {
      const onComplete = vi.fn();
      const onBack = vi.fn();

      const { rerender } = render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockInitialData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      // Switch challenges rapidly
      const newChallenge = { ...mockChallenge, id: 'new-challenge' };

      act(() => {
        rerender(
          <DesignCanvas
            challenge={newChallenge}
            initialData={mockInitialData}
            onComplete={onComplete}
            onBack={onBack}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Should not cause excessive re-renders
      expect(console.warn).not.toHaveBeenCalledWith(
        expect.stringMatching(/High render count/)
      );
    });

    it('should handle empty initial data gracefully', async () => {
      const emptyData: DesignData = {
        schemaVersion: 1,
        components: [],
        connections: [],
        infoCards: [],
        layers: [],
        metadata: { version: '1.0' },
      };

      const onComplete = vi.fn();
      const onBack = vi.fn();

      render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={emptyData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Should render without issues
      expect(screen.getByText('Test Challenge')).toBeInTheDocument();
    });
  });

  describe('Render Guard Protection', () => {
    it('should detect and prevent excessive renders in development', async () => {
      // Set NODE_ENV to development for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock a component that causes excessive renders
      const ProblematicComponent = () => {
        const [, setCount] = React.useState(0);

        // This would normally cause an infinite loop
        React.useEffect(() => {
          setCount(c => c + 1);
        });

        return (
          <DesignCanvas
            challenge={mockChallenge}
            initialData={mockInitialData}
            onComplete={vi.fn()}
            onBack={vi.fn()}
          />
        );
      };

      // This should throw an error due to render guard
      await expect(async () => {
        render(<ProblematicComponent />);

        // Wait for potential infinite loop
        await new Promise(resolve => setTimeout(resolve, 100));
      }).rejects.toThrow(/Maximum render limit exceeded/);

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });

    it('should not interfere with normal rendering in production', async () => {
      // Set NODE_ENV to production for this test
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const onComplete = vi.fn();
      const onBack = vi.fn();

      render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockInitialData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Should render normally in production
      expect(screen.getByText('Test Challenge')).toBeInTheDocument();
      expect(console.warn).not.toHaveBeenCalled();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Store Synchronization', () => {
    it('should use imperative store access for sync operations', async () => {
      const onComplete = vi.fn();
      const onBack = vi.fn();

      // Mock useInitialCanvasSync to track calls
      const mockSync = vi.fn(() => ({ isSynced: false, lastSyncedChallengeId: null }));
      vi.doMock('@/hooks/useInitialCanvasSync', () => ({
        useInitialCanvasSync: mockSync,
      }));

      render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockInitialData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Verify that sync hook was called with correct parameters
      expect(mockSync).toHaveBeenCalledWith({
        initialData: {
          components: mockInitialData.components,
          connections: mockInitialData.connections,
          infoCards: mockInitialData.infoCards,
        },
        challengeId: 'test-challenge',
        enabled: true,
      });
    });

    it('should not trigger re-renders when sync completes', async () => {
      let renderCount = 0;

      const TestWrapper = () => {
        renderCount++;
        return (
          <DesignCanvas
            challenge={mockChallenge}
            initialData={mockInitialData}
            onComplete={vi.fn()}
            onBack={vi.fn()}
          />
        );
      };

      render(<TestWrapper />);

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Wait a bit more to ensure no additional renders
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should have rendered only once (initial render)
      expect(renderCount).toBe(1);
    });
  });

  describe('Error Recovery', () => {
    it('should recover gracefully from sync errors', async () => {
      // Mock sync hook to simulate error
      vi.doMock('@/hooks/useInitialCanvasSync', () => ({
        useInitialCanvasSync: vi.fn(() => {
          throw new Error('Sync failed');
        }),
      }));

      const onComplete = vi.fn();
      const onBack = vi.fn();

      // Should not crash the entire component
      expect(() => {
        render(
          <DesignCanvas
            challenge={mockChallenge}
            initialData={mockInitialData}
            onComplete={onComplete}
            onBack={onBack}
          />
        );
      }).not.toThrow();
    });

    it('should handle malformed initial data', async () => {
      const malformedData = {
        ...mockInitialData,
        components: [
          {
            // Missing required fields
            id: 'bad-component',
            type: 'unknown-type',
          } as any,
        ],
      };

      const onComplete = vi.fn();
      const onBack = vi.fn();

      render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={malformedData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Should render despite malformed data
      expect(screen.getByText('Test Challenge')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track render performance metrics', async () => {
      const mockPerformanceMonitor = vi.fn();
      vi.doMock('@/hooks/usePerformanceMonitor', () => ({
        usePerformanceMonitor: mockPerformanceMonitor,
      }));

      const onComplete = vi.fn();
      const onBack = vi.fn();

      render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockInitialData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Should have initialized performance monitoring
      expect(mockPerformanceMonitor).toHaveBeenCalledWith('DesignCanvas');
    });

    it('should not interfere with normal component lifecycle', async () => {
      const onComplete = vi.fn();
      const onBack = vi.fn();

      const { unmount } = render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockInitialData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Integration with Store', () => {
    it('should use selective subscriptions to prevent unnecessary re-renders', async () => {
      const onComplete = vi.fn();
      const onBack = vi.fn();

      render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockInitialData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Verify that store selectors were used (not full store subscriptions)
      expect(mockUseCanvasStore).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle concurrent store updates gracefully', async () => {
      const onComplete = vi.fn();
      const onBack = vi.fn();

      render(
        <DesignCanvas
          challenge={mockChallenge}
          initialData={mockInitialData}
          onComplete={onComplete}
          onBack={onBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow-canvas')).toBeInTheDocument();
      });

      // Simulate rapid store updates
      act(() => {
        mockCanvasActions.updateComponents([]);
        mockCanvasActions.updateConnections([]);
        mockCanvasActions.updateInfoCards([]);
      });

      // Should not cause infinite loops
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringMatching(/Infinite render loop detected/)
      );
    });
  });
});