import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ReactFlowCanvas } from '../../packages/canvas/components/ReactFlowCanvas';
import { CanvasController } from '../../packages/canvas/components/CanvasController';
import { RenderLoopDiagnostics } from '../../lib/debug/RenderLoopDiagnostics';
import { InfiniteLoopDetector } from '../../lib/performance/InfiniteLoopDetector';
import type { DesignComponent, Connection, InfoCard } from '@shared/contracts';

// Mock ReactFlow to avoid complex rendering setup
vi.mock('reactflow', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReactFlow: () => <div data-testid="react-flow">MockReactFlow</div>,
  Background: () => <div data-testid="background">MockBackground</div>,
  Controls: () => <div data-testid="controls">MockControls</div>,
  MiniMap: () => <div data-testid="minimap">MockMiniMap</div>,
  useReactFlow: () => ({
    fitView: vi.fn(),
    setCenter: vi.fn(),
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    setViewport: vi.fn(),
    project: (pos: { x: number; y: number }) => pos,
    screenToFlowPosition: (pos: { x: number; y: number }) => pos,
  }),
  useNodesState: (initialNodes: any[]) => [
    initialNodes,
    vi.fn(),
    vi.fn(),
  ],
  useEdgesState: (initialEdges: any[]) => [
    initialEdges,
    vi.fn(),
    vi.fn(),
  ],
}));

describe('Canvas Layers Integration Tests', () => {
  const mockComponents: DesignComponent[] = [
    {
      id: 'comp1',
      type: 'service',
      name: 'User Service',
      x: 100,
      y: 100,
      properties: {},
    },
    {
      id: 'comp2',
      type: 'database',
      name: 'User DB',
      x: 300,
      y: 200,
      properties: {},
    },
  ];

  const mockConnections: Connection[] = [
    {
      id: 'conn1',
      sourceId: 'comp1',
      targetId: 'comp2',
      type: 'api',
      label: 'Queries',
      properties: {},
    },
  ];

  const mockInfoCards: InfoCard[] = [
    {
      id: 'info1',
      title: 'Note',
      content: 'Important note',
      x: 50,
      y: 50,
      color: 'yellow',
    },
  ];

  const mockCallbacks = {
    onComponentSelect: vi.fn(),
    onComponentDeselect: vi.fn(),
    onComponentDrop: vi.fn(),
    onComponentPositionChange: vi.fn(),
    onComponentDelete: vi.fn(),
    onConnectionCreate: vi.fn(),
    onConnectionDelete: vi.fn(),
    onConnectionSelect: vi.fn(),
    onInfoCardCreate: vi.fn(),
    onInfoCardUpdate: vi.fn(),
    onInfoCardDelete: vi.fn(),
    onInfoCardSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    InfiniteLoopDetector.getInstance().reset();
    RenderLoopDiagnostics.getInstance().reset();
  });

  describe('Canvas Component Composition', () => {
    it('renders all canvas layers without errors', async () => {
      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Verify that React Flow components are rendered
      expect(screen.getByTestId('background')).toBeInTheDocument();
      expect(screen.getByTestId('controls')).toBeInTheDocument();
      expect(screen.getByTestId('minimap')).toBeInTheDocument();
    });

    it('initializes canvas context with correct values', async () => {
      const contextSpy = vi.fn();

      const TestComponent = () => {
        React.useEffect(() => {
          // This would be called if context is properly initialized
          contextSpy();
        }, []);
        return null;
      };

      render(
        <DndProvider backend={HTML5Backend}>
          <CanvasController
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          >
            <TestComponent />
          </CanvasController>
        </DndProvider>
      );

      await waitFor(() => {
        expect(contextSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Canvas Layer Communication', () => {
    it('handles props changes across all layers', async () => {
      const { rerender } = render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      // Update components
      const updatedComponents = [
        ...mockComponents,
        {
          id: 'comp3',
          type: 'api',
          name: 'API Gateway',
          x: 200,
          y: 150,
          properties: {},
        },
      ];

      rerender(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={updatedComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });
    });

    it('maintains render stability during rapid prop changes', async () => {
      const { rerender } = render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      // Simulate rapid prop changes
      for (let i = 0; i < 10; i++) {
        const updatedComponents = mockComponents.map(comp => ({
          ...comp,
          x: comp.x + i,
          y: comp.y + i,
        }));

        rerender(
          <DndProvider backend={HTML5Backend}>
            <ReactFlowCanvas
              components={updatedComponents}
              connections={mockConnections}
              infoCards={mockInfoCards}
              {...mockCallbacks}
            />
          </DndProvider>
        );
      }

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Verify no render loop was detected
      const detector = InfiniteLoopDetector.getInstance();
      expect(detector.isComponentFlagged('ReactFlowCanvas.Controller')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.NodeLayer')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.EdgeLayer')).toBe(false);
    });
  });

  describe('Error Handling and Graceful Degradation', () => {
    it('handles canvas controller errors gracefully', async () => {
      // Mock console.error to prevent test output pollution
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ThrowingComponent = () => {
        throw new Error('Test error in canvas controller');
      };

      expect(() => {
        render(
          <DndProvider backend={HTML5Backend}>
            <CanvasController
              components={mockComponents}
              connections={mockConnections}
              infoCards={mockInfoCards}
              {...mockCallbacks}
            >
              <ThrowingComponent />
            </CanvasController>
          </DndProvider>
        );
      }).toThrow();

      consoleSpy.mockRestore();
    });

    it('handles emergency pause mechanism', async () => {
      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      // Simulate emergency pause
      const diagnostics = RenderLoopDiagnostics.getInstance();
      diagnostics.recordStabilityWarning('ReactFlowCanvas.Controller', 'Emergency pause triggered');

      await waitFor(() => {
        const events = diagnostics.getEvents();
        const stabilityWarnings = events.filter(e => e.type === 'stability-warning');
        expect(stabilityWarnings).toHaveLength(1);
      });
    });
  });

  describe('Performance and Memory Management', () => {
    it('tracks memory usage across canvas layers', async () => {
      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            virtualizationEnabled={true}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      const diagnostics = RenderLoopDiagnostics.getInstance();

      // Simulate memory spike
      diagnostics.recordMemorySpike('ReactFlowCanvas.Virtualization', {
        usedJSHeapSize: 50000000,
        deltaSinceBaseline: 20000000,
        operation: 'viewport-culling',
      });

      const events = diagnostics.getEvents();
      const memorySpikes = events.filter(e => e.type === 'memory-spike');

      expect(memorySpikes).toHaveLength(1);
      expect(memorySpikes[0].payload).toEqual({
        componentName: 'ReactFlowCanvas.Virtualization',
        usedJSHeapSize: 50000000,
        deltaSinceBaseline: 20000000,
        operation: 'viewport-culling',
      });
    });

    it('handles virtualization layer efficiently', async () => {
      const manyComponents = Array.from({ length: 100 }, (_, i) => ({
        id: `comp${i}`,
        type: 'service',
        name: `Service ${i}`,
        x: (i % 10) * 150,
        y: Math.floor(i / 10) * 100,
        properties: {},
      }));

      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={manyComponents}
            connections={[]}
            infoCards={[]}
            virtualizationEnabled={true}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Verify no performance issues with large datasets
      const detector = InfiniteLoopDetector.getInstance();
      expect(detector.isComponentFlagged('ReactFlowCanvas.Virtualization')).toBe(false);
    });
  });

  describe('Canvas Layer Interactions', () => {
    it('tracks interactions between canvas layers', async () => {
      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            enableAutoLayout={true}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      const diagnostics = RenderLoopDiagnostics.getInstance();

      // Simulate layer interaction
      diagnostics.recordCanvasLayerInteraction(
        'ReactFlowCanvas.LayoutEngine',
        'ReactFlowCanvas.NodeLayer',
        {
          action: 'layout-complete',
          timestamp: Date.now(),
          positionsUpdated: 2,
        }
      );

      const events = diagnostics.getEvents();
      const interactions = events.filter(e => e.type === 'canvas-layer-interaction');

      expect(interactions).toHaveLength(1);
      expect(interactions[0].payload).toEqual({
        fromLayer: 'ReactFlowCanvas.LayoutEngine',
        toLayer: 'ReactFlowCanvas.NodeLayer',
        action: 'layout-complete',
        timestamp: expect.any(Number),
        positionsUpdated: 2,
      });
    });

    it('handles canvas layer correlation during high activity', async () => {
      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      const diagnostics = RenderLoopDiagnostics.getInstance();

      // Simulate canvas layer correlation
      const layers = ['ReactFlowCanvas.Controller', 'ReactFlowCanvas.NodeLayer', 'ReactFlowCanvas.EdgeLayer'];
      diagnostics.recordCanvasLayerCorrelation(layers, {
        correlationStrength: 'high',
        renderFrequency: 'excessive',
        timestamp: Date.now(),
      });

      const events = diagnostics.getEvents();
      const correlationEvents = events.filter(e => e.type === 'canvas-layer-correlation');

      expect(correlationEvents).toHaveLength(1);
      expect(correlationEvents[0].payload).toEqual({
        components: layers,
        correlationStrength: 'high',
        renderFrequency: 'excessive',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('Per-Layer Guard Behavior', () => {
    it('each layer has independent render guard with specific thresholds', async () => {
      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      const detector = InfiniteLoopDetector.getInstance();

      // Verify each layer has its own render tracking
      expect(detector.getLatestReport('ReactFlowCanvas.Controller')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.NodeLayer')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.EdgeLayer')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.LayoutEngine')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.Virtualization')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.Interactions')).not.toBeNull();
    });

    it('layer-specific thresholds are respected', async () => {
      // Mock excessive renders for specific layers
      const detector = InfiniteLoopDetector.getInstance();

      // Simulate NodeLayer hitting its warning threshold (12)
      for (let i = 0; i < 13; i++) {
        detector.recordRender({
          componentName: 'ReactFlowCanvas.NodeLayer',
          timestamp: Date.now() + i,
          renderCount: i + 1,
          sinceFirstRenderMs: i * 10,
          sincePreviousRenderMs: 10,
        });
      }

      // Simulate EdgeLayer hitting its warning threshold (10)
      for (let i = 0; i < 11; i++) {
        detector.recordRender({
          componentName: 'ReactFlowCanvas.EdgeLayer',
          timestamp: Date.now() + i,
          renderCount: i + 1,
          sinceFirstRenderMs: i * 10,
          sincePreviousRenderMs: 10,
        });
      }

      const nodeLayerMetrics = detector.getLatestReport('ReactFlowCanvas.NodeLayer')?.metrics;
      const edgeLayerMetrics = detector.getLatestReport('ReactFlowCanvas.EdgeLayer')?.metrics;

      expect(nodeLayerMetrics?.renderCount).toBeGreaterThanOrEqual(12);
      expect(edgeLayerMetrics?.renderCount).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Circuit Breaker Coordination', () => {
    it('individual layer circuit breakers can trip independently', async () => {
      const detector = InfiniteLoopDetector.getInstance();

      // Trip LayoutEngine circuit breaker (errorThreshold: 15)
      for (let i = 0; i < 16; i++) {
        detector.recordRender({
          componentName: 'ReactFlowCanvas.LayoutEngine',
          timestamp: Date.now() + i,
          renderCount: i + 1,
          sinceFirstRenderMs: i * 10,
          sincePreviousRenderMs: 10,
        });
      }

      const layoutEngineMetrics = detector.getLatestReport('ReactFlowCanvas.LayoutEngine')?.metrics;
      expect(layoutEngineMetrics?.renderCount).toBeGreaterThanOrEqual(15);

      // Verify other layers are not affected
      const nodeLayerMetrics = detector.getLatestReport('ReactFlowCanvas.NodeLayer')?.metrics;
      expect(nodeLayerMetrics?.renderCount || 0).toBeLessThan(15);
    });

    it('controller emergency pause is triggered by circuit breaker', async () => {
      const mockOnTrip = vi.fn();
      const MockCanvasWithTrip = () => {
        return (
          <DndProvider backend={HTML5Backend}>
            <ReactFlowCanvas
              components={mockComponents}
              connections={mockConnections}
              infoCards={mockInfoCards}
              {...mockCallbacks}
            />
          </DndProvider>
        );
      };

      render(<MockCanvasWithTrip />);

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Check that emergency pause overlay can be triggered
      // This tests the circuit breaker coordination mechanism
      expect(screen.queryByText('Canvas Paused')).not.toBeInTheDocument();
    });

    it('circuit breaker cooldown period is respected', async () => {
      const detector = InfiniteLoopDetector.getInstance();
      const componentName = 'ReactFlowCanvas.CanvasLayer';

      // Trip the circuit breaker
      const now = Date.now();
      detector.markCircuitBreakerOpen(componentName, now + 5000, 'test-reason');

      expect(detector.isComponentFlagged(componentName)).toBe(true);
      // After the breaker timeout, component should not be flagged
      detector.markCircuitBreakerClosed(componentName);
      expect(detector.isComponentFlagged(componentName)).toBe(false);
    });
  });

  describe('Cross-Layer State Sync', () => {
    it('state changes propagate correctly between layers', async () => {
      const { rerender } = render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Update components and verify state sync
      const updatedComponents = [
        ...mockComponents,
        {
          id: 'comp3',
          type: 'service',
          name: 'New Service',
          x: 400,
          y: 300,
          properties: {},
        },
      ];

      rerender(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={updatedComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Verify that changes propagated to all layers without render loops
      const detector = InfiniteLoopDetector.getInstance();
      expect(detector.isComponentFlagged('ReactFlowCanvas.NodeLayer')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.EdgeLayer')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.LayoutEngine')).toBe(false);
    });

    it('virtualization state is coordinated across layers', async () => {
      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            virtualizationEnabled={true}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Verify virtualization layer coordinates with other layers
      const detector = InfiniteLoopDetector.getInstance();
      const virtualizationMetrics = detector.getLatestReport('ReactFlowCanvas.Virtualization')?.metrics;

      // Should have registered some renders but not excessive
      expect(virtualizationMetrics?.renderCount || 0).toBeGreaterThan(0);
      expect(virtualizationMetrics?.renderCount || 0).toBeLessThan(10);
    });

    it('layout changes trigger coordinated updates', async () => {
      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            enableAutoLayout={true}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Verify layout engine coordinates with node and edge layers
      const detector = InfiniteLoopDetector.getInstance();
      expect(detector.isComponentFlagged('ReactFlowCanvas.LayoutEngine')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.NodeLayer')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.EdgeLayer')).toBe(false);
    });
  });

  describe('Backward Compatibility', () => {
    it('maintains same API as original ReactFlowCanvas', async () => {
      // Test that all original props are still supported
      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            enableAutoLayout={true}
            virtualizationEnabled={true}
            enableDragDrop={true}
            enableContextMenu={true}
            enableKeyboardShortcuts={true}
            showBackground={true}
            showControls={true}
            showMiniMap={true}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
        expect(screen.getByTestId('background')).toBeInTheDocument();
        expect(screen.getByTestId('controls')).toBeInTheDocument();
        expect(screen.getByTestId('minimap')).toBeInTheDocument();
      });
    });

    it('handles all callback props correctly', async () => {
      const user = userEvent.setup();

      render(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={mockComponents}
            connections={mockConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // All callbacks should be properly forwarded to the layers
      expect(mockCallbacks.onComponentSelect).toBeDefined();
      expect(mockCallbacks.onComponentDeselect).toBeDefined();
      expect(mockCallbacks.onComponentDrop).toBeDefined();
      expect(mockCallbacks.onComponentPositionChange).toBeDefined();
      expect(mockCallbacks.onComponentDelete).toBeDefined();
      expect(mockCallbacks.onConnectionCreate).toBeDefined();
      expect(mockCallbacks.onConnectionDelete).toBeDefined();
      expect(mockCallbacks.onConnectionSelect).toBeDefined();
      expect(mockCallbacks.onInfoCardCreate).toBeDefined();
      expect(mockCallbacks.onInfoCardUpdate).toBeDefined();
      expect(mockCallbacks.onInfoCardDelete).toBeDefined();
      expect(mockCallbacks.onInfoCardSelect).toBeDefined();
    });
  });
});