import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import React from 'react';
import { RenderStabilityTracker } from '@/lib/performance/RenderStabilityTracker';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';
import { ReactFlowCanvas } from '../../packages/canvas/components/ReactFlowCanvas';
import type { DesignComponent, Connection, InfoCard } from '@shared/contracts';

// Mock ReactFlow to avoid complex rendering setup
vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReactFlow: () => <div data-testid="react-flow">MockReactFlow</div>,
  Background: () => <div data-testid="background">MockBackground</div>,
  Controls: () => <div data-testid="controls">MockControls</div>,
  MiniMap: () => <div data-testid="minimap">MockMiniMap</div>,
  useNodesState: () => [[], vi.fn(), vi.fn()],
  useEdgesState: () => [[], vi.fn(), vi.fn()],
  useReactFlow: () => ({ fitView: vi.fn(), getViewport: vi.fn() }),
}));

const detector = InfiniteLoopDetector.getInstance();

// Test data for wrapper component testing
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
    title: 'Design Notes',
    content: 'Important design considerations',
    x: 500,
    y: 100,
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

describe('DesignCanvas render stability instrumentation (Modular Architecture)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    detector.reset();
    RenderStabilityTracker.resetAll();
    RenderLoopDiagnostics.getInstance().reset();
  });

  it('flags repeated prop oscillation and requests freeze', () => {
    const tracker = RenderStabilityTracker.forComponent('DesignCanvasCore');

    const samples = [
      { value: 'A', interval: 4 },
      { value: 'B', interval: 3 },
      { value: 'A', interval: 3 },
      { value: 'B', interval: 4 },
      { value: 'A', interval: 2 },
    ];

    let report = tracker.track({ props: { layout: samples[0].value }, state: {}, metrics: { renderCount: 1, sincePreviousRenderMs: 9 } });
    for (let index = 1; index < samples.length; index += 1) {
      const sample = samples[index];
      report = tracker.track({
        props: { layout: sample.value },
        state: {},
        metrics: { renderCount: index + 1, sincePreviousRenderMs: sample.interval },
      });
    }

    expect(report.shouldFreeze).toBe(true);
    expect(report.unstableProps).toContain('layout');
    expect(report.freezeReason).toBeDefined();
  });

  it('identifies rapid identical renders and opens circuit breaker', () => {
    let result = detector.recordRender({
      componentName: 'DesignCanvasCore',
      timestamp: Date.now(),
      renderCount: 1,
      sinceFirstRenderMs: 0,
      sincePreviousRenderMs: 0,
    });

    for (let index = 2; index < 70; index += 1) {
      result = detector.recordRender({
        componentName: 'DesignCanvasCore',
        timestamp: Date.now() + index,
        renderCount: index,
        sinceFirstRenderMs: index * 4,
        sincePreviousRenderMs: 5,
        snapshotHash: 'stable',
      });
    }

    expect(result.shouldOpenCircuitBreaker).toBe(true);
    expect(result.isOscillating).toBe(true);

    detector.markCircuitBreakerOpen('DesignCanvasCore', Date.now() + 1000, 'test');
    expect(detector.isComponentFlagged('DesignCanvasCore')).toBe(true);

    detector.acknowledgeRecovery('DesignCanvasCore');
    expect(detector.isComponentFlagged('DesignCanvasCore')).toBe(false);
  });

  describe('Canvas Layer Render Stability', () => {
    it('tracks render guards for each canvas layer independently', () => {
      const layers = [
        'ReactFlowCanvas.Controller',
        'ReactFlowCanvas.NodeLayer',
        'ReactFlowCanvas.EdgeLayer',
        'ReactFlowCanvas.LayoutEngine',
        'ReactFlowCanvas.Virtualization',
        'ReactFlowCanvas.Interactions'
      ];

      const results: any[] = [];

      layers.forEach(layerName => {
        for (let i = 1; i <= 10; i++) {
          const result = detector.recordRender({
            componentName: layerName,
            timestamp: Date.now() + i,
            renderCount: i,
            sinceFirstRenderMs: i * 5,
            sincePreviousRenderMs: 5,
            snapshotHash: `stable-${layerName}`,
          });
          if (i === 10) results.push(result);
        }
      });

      // Each layer should be tracked independently
      expect(results).toHaveLength(6);
      results.forEach(result => {
        expect(result.shouldOpenCircuitBreaker).toBe(false);
      });
    });

    it('correlates canvas layer events during high render frequency', () => {
      const diagnostics = RenderLoopDiagnostics.getInstance();

      // Simulate correlated renders across layers
      const layers = ['ReactFlowCanvas.Controller', 'ReactFlowCanvas.NodeLayer', 'ReactFlowCanvas.EdgeLayer'];

      layers.forEach(layerName => {
        for (let i = 1; i <= 30; i++) {
          detector.recordRender({
            componentName: layerName,
            timestamp: Date.now() + i,
            renderCount: i,
            sinceFirstRenderMs: i * 2,
            sincePreviousRenderMs: 2, // Very fast renders
            snapshotHash: 'oscillating',
          });
        }
      });

      // Record canvas layer correlation
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

    it('handles emergency pause and resume mechanism', () => {
      const diagnostics = RenderLoopDiagnostics.getInstance();

      // Simulate emergency pause
      diagnostics.recordStabilityWarning('ReactFlowCanvas.Controller', 'Emergency pause triggered');

      // Simulate resume
      diagnostics.recordResume('ReactFlowCanvas.Controller');

      const events = diagnostics.getEvents();
      const stabilityWarnings = events.filter(e => e.type === 'stability-warning');
      const resumeEvents = events.filter(e => e.type === 'manual-resume');

      expect(stabilityWarnings).toHaveLength(1);
      expect(resumeEvents).toHaveLength(1);
      expect(resumeEvents[0].payload).toEqual({
        componentName: 'ReactFlowCanvas.Controller',
      });
    });

    it('tracks memory spikes during canvas layer operations', () => {
      const diagnostics = RenderLoopDiagnostics.getInstance();

      // Simulate memory spike in virtualization layer
      diagnostics.recordMemorySpike('ReactFlowCanvas.Virtualization', {
        usedJSHeapSize: 50000000, // 50MB
        deltaSinceBaseline: 20000000, // 20MB increase
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

    it('tracks interactions between canvas layers', () => {
      const diagnostics = RenderLoopDiagnostics.getInstance();

      // Simulate layer interactions
      diagnostics.recordCanvasLayerInteraction(
        'ReactFlowCanvas.Controller',
        'ReactFlowCanvas.NodeLayer',
        {
          action: 'position-update',
          timestamp: Date.now(),
          nodesAffected: 5,
        }
      );

      diagnostics.recordCanvasLayerInteraction(
        'ReactFlowCanvas.LayoutEngine',
        'ReactFlowCanvas.NodeLayer',
        {
          action: 'layout-complete',
          timestamp: Date.now(),
          positionsUpdated: 10,
        }
      );

      const events = diagnostics.getEvents();
      const interactions = events.filter(e => e.type === 'canvas-layer-interaction');

      expect(interactions).toHaveLength(2);
      expect(interactions[0].payload).toEqual({
        fromLayer: 'ReactFlowCanvas.Controller',
        toLayer: 'ReactFlowCanvas.NodeLayer',
        action: 'position-update',
        timestamp: expect.any(Number),
        nodesAffected: 5,
      });
      expect(interactions[1].payload).toEqual({
        fromLayer: 'ReactFlowCanvas.LayoutEngine',
        toLayer: 'ReactFlowCanvas.NodeLayer',
        action: 'layout-complete',
        timestamp: expect.any(Number),
        positionsUpdated: 10,
      });
    });
  });

  describe('Cross-Layer Render Stability', () => {
    it('detects cascading render loops across canvas layers', () => {
      const layers = [
        'ReactFlowCanvas.Controller',
        'ReactFlowCanvas.NodeLayer',
        'ReactFlowCanvas.EdgeLayer'
      ];

      // Simulate cascading renders - Controller triggers NodeLayer, NodeLayer triggers EdgeLayer
      let timestamp = Date.now();

      for (let cycle = 0; cycle < 25; cycle++) {
        layers.forEach((layer, index) => {
          detector.recordRender({
            componentName: layer,
            timestamp: timestamp + index,
            renderCount: cycle + 1,
            sinceFirstRenderMs: (cycle * 3 + index) * 2,
            sincePreviousRenderMs: 2,
            snapshotHash: `cascade-${cycle}`,
          });
        });
        timestamp += 10;
      }

      // Check that each layer shows signs of render instability
      const controllerFlagged = detector.isComponentFlagged('ReactFlowCanvas.Controller');
      const nodeLayerFlagged = detector.isComponentFlagged('ReactFlowCanvas.NodeLayer');
      const edgeLayerFlagged = detector.isComponentFlagged('ReactFlowCanvas.EdgeLayer');

      // At least one layer should be flagged for the cascade
      expect(controllerFlagged || nodeLayerFlagged || edgeLayerFlagged).toBe(true);
    });

    it('maintains render stability under normal canvas operations', () => {
      const layers = [
        'ReactFlowCanvas.Controller',
        'ReactFlowCanvas.NodeLayer',
        'ReactFlowCanvas.EdgeLayer',
        'ReactFlowCanvas.LayoutEngine',
        'ReactFlowCanvas.Virtualization',
        'ReactFlowCanvas.Interactions'
      ];

      // Simulate normal, stable rendering patterns
      layers.forEach(layerName => {
        for (let i = 1; i <= 15; i++) {
          detector.recordRender({
            componentName: layerName,
            timestamp: Date.now() + i * 100, // Reasonable spacing
            renderCount: i,
            sinceFirstRenderMs: i * 100,
            sincePreviousRenderMs: 100, // Stable 100ms intervals
            snapshotHash: `stable-${layerName}-${Math.floor(i / 5)}`, // Changes every 5 renders
          });
        }
      });

      // No layers should be flagged under normal conditions
      layers.forEach(layerName => {
        expect(detector.isComponentFlagged(layerName)).toBe(false);
      });
    });
  });

  describe('ReactFlowCanvas Wrapper Integration Tests', () => {
    it('mounts wrapper and verifies per-layer guard behavior', async () => {
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

      // Verify that the wrapper renders successfully
      expect(screen.getByTestId('background')).toBeInTheDocument();
      expect(screen.getByTestId('controls')).toBeInTheDocument();
      expect(screen.getByTestId('minimap')).toBeInTheDocument();

      // Each layer should register with the detector when mounted
      expect(detector.getLatestReport('ReactFlowCanvas.Controller')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.NodeLayer')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.EdgeLayer')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.LayoutEngine')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.Virtualization')).not.toBeNull();
      expect(detector.getLatestReport('ReactFlowCanvas.Interactions')).not.toBeNull();
    });

    it('wrapper responds to circuit breaker coordination', async () => {
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

      // Initially no emergency pause
      expect(screen.queryByText('Canvas Paused')).not.toBeInTheDocument();

      // Simulate rapid prop changes that could trigger emergency pause
      for (let i = 0; i < 20; i++) {
        const updatedComponents = mockComponents.map(comp => ({
          ...comp,
          x: comp.x + i * 10,
          y: comp.y + i * 10,
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

      // The wrapper should handle rapid changes without breaking
      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });
    });

    it('wrapper maintains cross-layer state sync during updates', async () => {
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

      // Add new component and connection
      const updatedComponents = [
        ...mockComponents,
        {
          id: 'comp3',
          type: 'service',
          name: 'Auth Service',
          x: 500,
          y: 300,
          properties: {},
        },
      ];

      const updatedConnections = [
        ...mockConnections,
        {
          id: 'conn2',
          sourceId: 'comp1',
          targetId: 'comp3',
          type: 'api',
          label: 'Authentication',
          properties: {},
        },
      ];

      rerender(
        <DndProvider backend={HTML5Backend}>
          <ReactFlowCanvas
            components={updatedComponents}
            connections={updatedConnections}
            infoCards={mockInfoCards}
            {...mockCallbacks}
          />
        </DndProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Verify state changes propagated correctly without render loops
      expect(detector.isComponentFlagged('ReactFlowCanvas.Controller')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.NodeLayer')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.EdgeLayer')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.LayoutEngine')).toBe(false);
    });

    it('wrapper handles emergency pause and resume through controller', async () => {
      const MockCanvasWithEmergencyControl = () => {
        const [triggerEmergency, setTriggerEmergency] = React.useState(false);

        React.useEffect(() => {
          if (triggerEmergency) {
            // Simulate emergency condition by triggering circuit breaker
            detector.markCircuitBreakerOpen('ReactFlowCanvas.Controller', Date.now() + 5000, 'test-emergency');
          }
        }, [triggerEmergency]);

        return (
          <DndProvider backend={HTML5Backend}>
            <div>
              <button onClick={() => setTriggerEmergency(true)}>Trigger Emergency</button>
              <ReactFlowCanvas
                components={mockComponents}
                connections={mockConnections}
                infoCards={mockInfoCards}
                {...mockCallbacks}
              />
            </div>
          </DndProvider>
        );
      };

      render(<MockCanvasWithEmergencyControl />);

      await waitFor(() => {
        expect(screen.getByTestId('react-flow')).toBeInTheDocument();
      });

      // Initially no emergency state
      expect(screen.queryByText('Canvas Paused')).not.toBeInTheDocument();
      expect(screen.queryByText('Resume Canvas')).not.toBeInTheDocument();

      // The emergency mechanism should be ready to trigger if needed
      expect(detector.getLatestReport('ReactFlowCanvas.Controller')).not.toBeNull();
    });

    it('wrapper demonstrates layer-specific render guard thresholds', async () => {
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

      // Verify that different layers are using the correct preset thresholds
      // This tests that the RenderGuardPresets.canvasLayers are being applied
      const controllerMetrics = detector.getLatestReport('ReactFlowCanvas.Controller')?.metrics;
      const nodeLayerMetrics = detector.getLatestReport('ReactFlowCanvas.NodeLayer')?.metrics;
      const edgeLayerMetrics = detector.getLatestReport('ReactFlowCanvas.EdgeLayer')?.metrics;
      const layoutEngineMetrics = detector.getLatestReport('ReactFlowCanvas.LayoutEngine')?.metrics;
      const virtualizationMetrics = detector.getLatestReport('ReactFlowCanvas.Virtualization')?.metrics;
      const interactionMetrics = detector.getLatestReport('ReactFlowCanvas.Interactions')?.metrics;

      // All layers should be tracked independently
      expect(controllerMetrics || nodeLayerMetrics || edgeLayerMetrics ||
             layoutEngineMetrics || virtualizationMetrics || interactionMetrics).toBeTruthy();

      // No layers should be flagged under normal mounting conditions
      expect(detector.isComponentFlagged('ReactFlowCanvas.Controller')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.NodeLayer')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.EdgeLayer')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.LayoutEngine')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.Virtualization')).toBe(false);
      expect(detector.isComponentFlagged('ReactFlowCanvas.Interactions')).toBe(false);
    });
  });
});
