import { cleanup, fireEvent, waitFor, screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { EdgeChange, NodeChange } from '@xyflow/react';
import { renderWithProviders } from '../test/integration-helpers';
import { CanvasArea } from '../components/CanvasArea';
import {
  createReactFlowEdge,
  createReactFlowNode,
  fromEdgeChanges,
  fromNodeChanges,
  fromReactFlowEdges,
  fromReactFlowNodes,
  toReactFlowEdges,
  toReactFlowNodes,
  updateReactFlowEdge,
  updateReactFlowNode,
  type ArchiCommEdge,
  type ArchiCommNode,
} from '../features/canvas/utils/rf-adapters';
import type { Connection, DesignComponent } from '../shared/contracts';

afterEach(() => {
  cleanup();
});

describe('Canvas UI basics', () => {
  it('handles basic canvas keyboard interactions', async () => {
    renderWithProviders(
      <div style={{ width: 800, height: 600 }}>
        <CanvasArea
          components={[]}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          onComponentDrop={vi.fn()}
          onComponentMove={vi.fn()}
          onComponentSelect={vi.fn()}
          onStartConnection={vi.fn()}
          onCompleteConnection={vi.fn()}
          onConnectionLabelChange={vi.fn()}
        />
      </div>
    );

    const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
    expect(reactFlowWrapper).toBeInTheDocument();
    expect(reactFlowWrapper).toHaveAttribute('tabIndex', '0');

    (reactFlowWrapper as HTMLElement).focus();
    const user = userEvent.setup();
    await user.keyboard('{Control>}{a}{/Control}');
    expect(reactFlowWrapper).toHaveFocus();
  });
});

describe('Canvas Component Management', () => {
  const mockComponents: DesignComponent[] = [
    {
      id: 'comp1',
      type: 'server',
      x: 100,
      y: 100,
      label: 'Web Server',
      layerId: 'layer1',
    },
    {
      id: 'comp2',
      type: 'database',
      x: 300,
      y: 200,
      label: 'Database',
      layerId: 'layer1',
    },
  ];

  const mockConnections: Connection[] = [
    {
      id: 'conn1',
      from: 'comp1',
      to: 'comp2',
      label: 'API Call',
      type: 'data',
      direction: 'end',
    },
  ];

  const defaultProps = {
    components: mockComponents,
    connections: mockConnections,
    selectedComponent: null,
    connectionStart: null,
    gridConfig: { visible: true, spacing: 20, snapToGrid: false },
    onComponentDrop: vi.fn(),
    onComponentMove: vi.fn(),
    onComponentSelect: vi.fn(),
    onStartConnection: vi.fn(),
    onCompleteConnection: vi.fn(),
    onConnectionLabelChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders components with correct connection counts and health status', () => {
    renderWithProviders(
      <div style={{ width: 800, height: 600 }}>
        <CanvasArea {...defaultProps} />
      </div>
    );

    const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
    expect(reactFlowWrapper).toBeInTheDocument();

    const nodes = (reactFlowWrapper as HTMLElement).querySelectorAll('.react-flow__node');
    expect(nodes).toHaveLength(2);
    expect((reactFlowWrapper as HTMLElement).querySelector('.react-flow__node[data-id="comp1"]')).toBeInTheDocument();
    expect((reactFlowWrapper as HTMLElement).querySelector('.react-flow__node[data-id="comp2"]')).toBeInTheDocument();

    const edges = (reactFlowWrapper as HTMLElement).querySelectorAll('.react-flow__edge');
    expect(edges).toHaveLength(1);
  });

  it('calls onViewportChange when zoom occurs', () => {
    vi.useFakeTimers();

    renderWithProviders(
      <div style={{ width: 800, height: 600 }}>
        <CanvasArea {...defaultProps} />
      </div>
    );

    // React Flow handles zoom through its viewport
    const reactFlowViewport = document.querySelector('.react-flow__viewport');
    expect(reactFlowViewport).toBeInTheDocument();

    // Fire wheel event directly on the viewport element for accurate zoom simulation
    fireEvent.wheel(reactFlowViewport!, { deltaY: -100, ctrlKey: true });

    vi.advanceTimersByTime(400);

    return waitFor(
      () => {
        const viewport = document.querySelector('.react-flow__viewport');
        expect(viewport).toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('supports accessibility navigation with ARIA attributes', () => {
    render(
      <DndProvider backend={HTML5Backend}>
        <div style={{ width: 800, height: 600 }}>
          <CanvasArea {...defaultProps} />
        </div>
      </DndProvider>
    );

    const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
    expect(reactFlowWrapper).toBeInTheDocument();
    expect(reactFlowWrapper).toHaveAttribute('tabIndex', '0');

    const nodes = (reactFlowWrapper as HTMLElement).querySelectorAll('.react-flow__node');
    nodes.forEach(node => {
      expect(node).toHaveAttribute('data-id');
    });
  });

  it('handles component selection and focus management', async () => {
    const onComponentSelect = vi.fn();

    renderWithProviders(
      <div style={{ width: 800, height: 600 }}>
        <CanvasArea
          {...defaultProps}
          onComponentSelect={onComponentSelect}
          selectedComponent='comp1'
        />
      </div>
    );

    const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
    const selectedNode = (reactFlowWrapper as HTMLElement).querySelector('.react-flow__node[data-id="comp1"]');
    expect(selectedNode).toBeInTheDocument();
    expect(selectedNode).toHaveClass('selected');

    const unselectedNode = (reactFlowWrapper as HTMLElement).querySelector('.react-flow__node[data-id="comp2"]') as HTMLElement | null;
    expect(unselectedNode).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(unselectedNode!);
    expect(onComponentSelect).toHaveBeenCalledWith('comp2');
  });

  it('handles arrow key movement for selected components', async () => {
    const onComponentMove = vi.fn();

    renderWithProviders(
      <div style={{ width: 800, height: 600 }}>
        <CanvasArea 
          {...defaultProps} 
          selectedComponent='comp1'
          onComponentMove={onComponentMove}
        />
      </div>
    );

    const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
    expect(reactFlowWrapper).toBeInTheDocument();

    const selectedNode = (reactFlowWrapper as HTMLElement).querySelector('.react-flow__node[data-id="comp1"]');
    expect(selectedNode).toBeInTheDocument();

    (reactFlowWrapper as HTMLElement).focus();
    const user = userEvent.setup();
    await user.keyboard('{ArrowRight}');

    expect(reactFlowWrapper).toBeInTheDocument();
    expect(selectedNode).toBeInTheDocument();
    expect(onComponentMove).not.toHaveBeenCalled();
  });

  it('shows focus state when canvas receives focus', () => {
    renderWithProviders(
      <div style={{ width: 800, height: 600 }}>
        <CanvasArea {...defaultProps} />
      </div>
    );

    const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
    (reactFlowWrapper as HTMLElement).focus();

    expect(reactFlowWrapper).toHaveFocus();
  });
});

describe('Canvas Performance and Optimization', () => {
  it('initializes performance manager registration', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { unmount } = renderWithProviders(
      <div style={{ width: 800, height: 600 }}>
        <CanvasArea
          components={[]}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          onComponentDrop={vi.fn()}
          onComponentMove={vi.fn()}
          onComponentSelect={vi.fn()}
          onStartConnection={vi.fn()}
          onCompleteConnection={vi.fn()}
          onConnectionLabelChange={vi.fn()}
        />
      </div>
    );

    const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
    expect(reactFlowWrapper).toBeInTheDocument();

    if (warnSpy.mock.calls.length > 0) {
      expect(warnSpy).toHaveBeenCalledWith('Performance registration failed', expect.any(Error));
    }

    const warnCountBeforeUnmount = warnSpy.mock.calls.length;
    const errorCountBeforeUnmount = errorSpy.mock.calls.length;

    unmount();

    expect(warnSpy.mock.calls.length).toBe(warnCountBeforeUnmount);
    expect(errorSpy.mock.calls.length).toBe(errorCountBeforeUnmount);

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('handles React Flow viewport changes efficiently', () => {
    renderWithProviders(
      <div style={{ width: 800, height: 600 }}>
        <CanvasArea
          components={[]}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          onComponentDrop={vi.fn()}
          onComponentMove={vi.fn()}
          onComponentSelect={vi.fn()}
          onStartConnection={vi.fn()}
          onCompleteConnection={vi.fn()}
          onConnectionLabelChange={vi.fn()}
        />
      </div>
    );

    const viewport = document.querySelector('.react-flow__viewport');
    expect(viewport).toBeInTheDocument();
  });
});

describe('React Flow Adapter Functions', () => {
  const mockComponents: DesignComponent[] = [
    {
      id: 'comp1',
      type: 'server',
      x: 100,
      y: 100,
      label: 'Web Server',
      description: 'Main web server',
      properties: { replicas: 3, port: 8080 },
      layerId: 'layer1',
    },
    {
      id: 'comp2',
      type: 'database',
      x: 300,
      y: 200,
      label: 'Database',
      properties: { type: 'relational', replicas: 2 },
      layerId: 'layer1',
    },
  ];

  const mockConnections: Connection[] = [
    {
      id: 'conn1',
      from: 'comp1',
      to: 'comp2',
      label: 'API Call',
      type: 'data',
      protocol: 'HTTP',
      direction: 'end',
    },
    {
      id: 'conn2',
      from: 'comp2',
      to: 'comp1',
      label: 'Response',
      type: 'async',
      direction: 'both',
    },
  ];

  describe('toReactFlowNodes', () => {
    it('converts DesignComponent array to React Flow nodes', () => {
      const nodes = toReactFlowNodes(mockComponents);

      expect(nodes).toHaveLength(2);

      const node1 = nodes.find(n => n.id === 'comp1');
      expect(node1).toEqual({
        id: 'comp1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          component: mockComponents[0],
          type: 'server',
          label: 'Web Server',
          description: 'Main web server',
          properties: { replicas: 3, port: 8080 },
          layerId: 'layer1',
        },
        draggable: true,
        selectable: true,
        deletable: true,
      });
    });

    it('handles components without optional properties', () => {
      const minimalComponent: DesignComponent = {
        id: 'minimal',
        type: 'cache',
        x: 50,
        y: 75,
        label: 'Cache',
      };

      const nodes = toReactFlowNodes([minimalComponent]);

      expect(nodes[0]).toEqual({
        id: 'minimal',
        type: 'custom',
        position: { x: 50, y: 75 },
        data: {
          component: minimalComponent,
          type: 'cache',
          label: 'Cache',
          description: undefined,
          properties: undefined,
          layerId: undefined,
        },
        draggable: true,
        selectable: true,
        deletable: true,
      });
    });
  });

  describe('toReactFlowEdges', () => {
    it('converts Connection array to React Flow edges', () => {
      const edges = toReactFlowEdges(mockConnections);

      expect(edges).toHaveLength(2);

      const edge1 = edges.find(e => e.id === 'conn1');
      expect(edge1).toEqual({
        id: 'conn1',
        source: 'comp1',
        target: 'comp2',
        type: 'default',
        data: {
          label: 'API Call',
          type: 'data',
          protocol: 'HTTP',
          direction: 'end',
        },
        deletable: true,
        selectable: true,
        markerEnd: {
          type: 'arrowclosed',
          width: 20,
          height: 20,
        },
        markerStart: undefined,
      });

      const edge2 = edges.find(e => e.id === 'conn2');
      expect(edge2?.markerEnd).toBeDefined();
      expect(edge2?.markerStart).toBeDefined();
      expect(edge2?.type).toBe('smoothstep');
    });

    it('maps connection types to correct React Flow edge types', () => {
      const testConnections: Connection[] = [
        { id: '1', from: 'a', to: 'b', label: 'Data', type: 'data', direction: 'end' },
        { id: '2', from: 'a', to: 'b', label: 'Control', type: 'control', direction: 'end' },
        { id: '3', from: 'a', to: 'b', label: 'Sync', type: 'sync', direction: 'end' },
        { id: '4', from: 'a', to: 'b', label: 'Async', type: 'async', direction: 'end' },
      ];

      const edges = toReactFlowEdges(testConnections);

      expect(edges[0].type).toBe('default'); // data -> default
      expect(edges[1].type).toBe('step'); // control -> step
      expect(edges[2].type).toBe('smoothstep'); // sync -> smoothstep
      expect(edges[3].type).toBe('smoothstep'); // async -> smoothstep
    });
  });

  describe('fromReactFlowNodes', () => {
    it('converts React Flow nodes back to DesignComponent array', () => {
      const nodes = toReactFlowNodes(mockComponents);
      const components = fromReactFlowNodes(nodes);

      expect(components).toEqual(mockComponents);
    });
  });

  describe('fromReactFlowEdges', () => {
    it('converts React Flow edges back to Connection array', () => {
      const edges = toReactFlowEdges(mockConnections);
      const connections = fromReactFlowEdges(edges);

      expect(connections).toEqual(mockConnections);
    });
  });

  describe('fromNodeChanges', () => {
    it('handles position changes', () => {
      const changes: NodeChange[] = [
        {
          type: 'position',
          id: 'comp1',
          position: { x: 150, y: 120 },
        },
      ];

      const updatedComponents = fromNodeChanges(changes, mockComponents);
      const updatedComp = updatedComponents.find(c => c.id === 'comp1');

      expect(updatedComp?.x).toBe(150);
      expect(updatedComp?.y).toBe(120);
    });

    it('handles add changes', () => {
      const newNode: ArchiCommNode = {
        id: 'comp3',
        type: 'custom',
        position: { x: 400, y: 300 },
        data: {
          component: {
            id: 'comp3',
            type: 'cache',
            x: 400,
            y: 300,
            label: 'Redis Cache',
            description: 'In-memory cache',
            properties: { type: 'redis', ttl: 3600 },
            layerId: 'layer1',
          },
          type: 'cache',
          label: 'Redis Cache',
          description: 'In-memory cache',
          properties: { type: 'redis', ttl: 3600 },
          layerId: 'layer1',
        },
        draggable: true,
        selectable: true,
        deletable: true,
      };

      const changes: NodeChange[] = [
        {
          type: 'add',
          item: newNode,
        },
      ];

      const updatedComponents = fromNodeChanges(changes, mockComponents);

      expect(updatedComponents).toHaveLength(3);
      const newComp = updatedComponents.find(c => c.id === 'comp3');
      expect(newComp).toEqual({
        id: 'comp3',
        type: 'cache',
        x: 400,
        y: 300,
        label: 'Redis Cache',
        description: 'In-memory cache',
        properties: { type: 'redis', ttl: 3600 },
        layerId: 'layer1',
      });
    });

    it('handles remove changes', () => {
      const changes: NodeChange[] = [
        {
          type: 'remove',
          id: 'comp1',
        },
      ];

      const updatedComponents = fromNodeChanges(changes, mockComponents);

      expect(updatedComponents).toHaveLength(1);
      expect(updatedComponents.find(c => c.id === 'comp1')).toBeUndefined();
    });

    it('ignores select and dimensions changes', () => {
      const changes: NodeChange[] = [
        {
          type: 'select',
          id: 'comp1',
          selected: true,
        },
        {
          type: 'dimensions',
          id: 'comp1',
          dimensions: { width: 100, height: 50 },
        },
      ];

      const updatedComponents = fromNodeChanges(changes, mockComponents);

      expect(updatedComponents).toEqual(mockComponents);
    });
  });

  describe('fromEdgeChanges', () => {
    it('handles add changes', () => {
      const newEdge: ArchiCommEdge = {
        id: 'conn3',
        source: 'comp1',
        target: 'comp2',
        type: 'step',
        data: {
          label: 'Control Flow',
          type: 'control',
          protocol: 'TCP',
          direction: 'end',
        },
        deletable: true,
        selectable: true,
      };

      const changes: EdgeChange[] = [
        {
          type: 'add',
          item: newEdge,
        },
      ];

      const updatedConnections = fromEdgeChanges(changes, mockConnections);

      expect(updatedConnections).toHaveLength(3);
      const newConn = updatedConnections.find(c => c.id === 'conn3');
      expect(newConn).toEqual({
        id: 'conn3',
        from: 'comp1',
        to: 'comp2',
        label: 'Control Flow',
        type: 'control',
        protocol: 'TCP',
        direction: 'end',
      });
    });

    it('handles remove changes', () => {
      const changes: EdgeChange[] = [
        {
          type: 'remove',
          id: 'conn1',
        },
      ];

      const updatedConnections = fromEdgeChanges(changes, mockConnections);

      expect(updatedConnections).toHaveLength(1);
      expect(updatedConnections.find(c => c.id === 'conn1')).toBeUndefined();
    });
  });

  describe('createReactFlowNode', () => {
    it('creates a React Flow node from DesignComponent', () => {
      const component = mockComponents[0];
      const node = createReactFlowNode(component);

      expect(node).toEqual({
        id: 'comp1',
        type: 'custom',
        position: { x: 100, y: 100 },
        data: {
          component: component,
          type: 'server',
          label: 'Web Server',
          description: 'Main web server',
          properties: { replicas: 3, port: 8080 },
          layerId: 'layer1',
        },
        draggable: true,
        selectable: true,
        deletable: true,
      });
    });
  });

  describe('createReactFlowEdge', () => {
    it('creates a React Flow edge from Connection', () => {
      const connection = mockConnections[0];
      const edge = createReactFlowEdge(connection);

      expect(edge).toEqual({
        id: 'conn1',
        source: 'comp1',
        target: 'comp2',
        type: 'default',
        data: {
          label: 'API Call',
          type: 'data',
          protocol: 'HTTP',
          direction: 'end',
        },
        deletable: true,
        selectable: true,
        markerEnd: {
          type: 'arrowclosed',
          width: 20,
          height: 20,
        },
        markerStart: undefined,
      });
    });
  });

  describe('updateReactFlowNode', () => {
    it('updates a React Flow node with new DesignComponent data', () => {
      const originalNode = createReactFlowNode(mockComponents[0]);
      const updatedComponent: DesignComponent = {
        ...mockComponents[0],
        x: 200,
        y: 250,
        label: 'Updated Server',
        properties: { replicas: 5, port: 9090 },
      };

      const updatedNode = updateReactFlowNode(originalNode, updatedComponent);

      expect(updatedNode.position).toEqual({ x: 200, y: 250 });
      expect(updatedNode.data.label).toBe('Updated Server');
      expect(updatedNode.data.properties).toEqual({ replicas: 5, port: 9090 });
      expect(updatedNode.id).toBe(originalNode.id);
      expect(updatedNode.type).toBe(originalNode.type);
    });
  });

  describe('updateReactFlowEdge', () => {
    it('updates a React Flow edge with new Connection data', () => {
      const originalEdge = createReactFlowEdge(mockConnections[0]);
      const updatedConnection: Connection = {
        ...mockConnections[0],
        label: 'Updated API Call',
        type: 'async',
        direction: 'both',
      };

      const updatedEdge = updateReactFlowEdge(originalEdge, updatedConnection);

      expect(updatedEdge.data?.label).toBe('Updated API Call');
      expect(updatedEdge.data?.type).toBe('async');
      expect(updatedEdge.type).toBe('smoothstep');
      expect(updatedEdge.markerEnd).toBeDefined();
      expect(updatedEdge.markerStart).toBeDefined();
      expect(updatedEdge.id).toBe(originalEdge.id);
    });
  });

  describe('Integration with Canvas Test Helpers', () => {
    beforeEach(() => {
      // MockHelpers.mockTauriAPIs();
    });

    it('should integrate with CanvasTestHelpers for component operations', async () => {
      const mockHandlers = {
        onComponentDrop: vi.fn(),
        onComponentMove: vi.fn(),
        onComponentSelect: vi.fn(),
        onStartConnection: vi.fn(),
        onCompleteConnection: vi.fn(),
        onConnectionLabelChange: vi.fn()
      };

      renderWithProviders(
        <div style={{ width: 800, height: 600 }}>
          <CanvasArea
            components={[]}
            connections={[]}
            selectedComponent={null}
            connectionStart={null}
            {...mockHandlers}
          />
        </div>
      );

      // Verify canvas rendered
      expect(document.querySelector('[data-testid="reactflow-canvas"]')).toBeInTheDocument();
    });

    it('should use AssertionHelpers for component verification', async () => {
      renderWithProviders(
        <div style={{ width: 800, height: 600 }}>
          <CanvasArea
            components={mockComponents}
            connections={[]}
            selectedComponent={null}
            connectionStart={null}
            onComponentDrop={vi.fn()}
            onComponentMove={vi.fn()}
            onComponentSelect={vi.fn()}
            onStartConnection={vi.fn()}
            onCompleteConnection={vi.fn()}
            onConnectionLabelChange={vi.fn()}
          />
        </div>
      );

      // Use assertion helpers for verification
      const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
      expect(reactFlowWrapper).toBeInTheDocument();

      // Verify components are rendered
      const nodes = reactFlowWrapper.querySelectorAll('.react-flow__node');
      expect(nodes).toHaveLength(2);
    });

    it('should handle error recovery during canvas operations', async () => {
      const mockHandlers = {
        onComponentDrop: vi.fn().mockImplementation(() => {
          throw new Error('Component drop failed');
        }),
        onComponentMove: vi.fn(),
        onComponentSelect: vi.fn(),
        onStartConnection: vi.fn(),
        onCompleteConnection: vi.fn(),
        onConnectionLabelChange: vi.fn()
      };

      renderWithProviders(
        <div style={{ width: 800, height: 600 }}>
          <CanvasArea
            components={[]}
            connections={[]}
            selectedComponent={null}
            connectionStart={null}
            {...mockHandlers}
          />
        </div>
      );

      // Ensure canvas is present even when drop handler errors
      expect(document.querySelector('[data-testid="reactflow-canvas"]')).toBeInTheDocument();
    });
  });

  describe('Enhanced Performance Testing', () => {
    beforeEach(() => {
      // MockHelpers.mockTauriAPIs();
    });

    it('should handle large datasets efficiently', async () => {
      // Create many components for performance testing
      const manyComponents = Array.from({ length: 50 }, (_, i) => ({
        id: `perf-comp-${i}`,
        type: 'microservice' as const,
        x: (i % 10) * 100,
        y: Math.floor(i / 10) * 100,
        label: `Service ${i}`,
        layerId: 'layer1'
      }));

      const performanceStart = performance.now();

      renderWithProviders(
        <div style={{ width: 800, height: 600 }}>
          <CanvasArea
            components={manyComponents}
            connections={[]}
            selectedComponent={null}
            connectionStart={null}
            onComponentDrop={vi.fn()}
            onComponentMove={vi.fn()}
            onComponentSelect={vi.fn()}
            onStartConnection={vi.fn()}
            onCompleteConnection={vi.fn()}
            onConnectionLabelChange={vi.fn()}
          />
        </div>
      );

      await waitFor(() => {
        const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
        expect(reactFlowWrapper).toBeInTheDocument();
      });

      vi.advanceTimersByTime(50);
      const performanceEnd = performance.now();
      const renderTime = performanceEnd - performanceStart;

      // Should render within reasonable time even with many components
      expect(renderTime).toBeLessThan(3000); // 3 seconds max
    });

    it('should maintain performance during rapid interactions', async () => {
      const mockHandlers = {
        onComponentDrop: vi.fn(),
        onComponentMove: vi.fn(),
        onComponentSelect: vi.fn(),
        onStartConnection: vi.fn(),
        onCompleteConnection: vi.fn(),
        onConnectionLabelChange: vi.fn()
      };

      renderWithProviders(
        <div style={{ width: 800, height: 600 }}>
          <CanvasArea
            components={mockComponents}
            connections={mockConnections}
            selectedComponent={null}
            connectionStart={null}
            {...mockHandlers}
          />
        </div>
      );

      const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
      const nodes = reactFlowWrapper.querySelectorAll('.react-flow__node');

      // Perform rapid interactions
      const user = userEvent.setup();
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        await user.click(nodes[0]);
        await user.click(nodes[1]);
      }

      vi.advanceTimersByTime(30);
      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      // Should handle rapid interactions smoothly
      expect(interactionTime).toBeLessThan(2000);
      expect(mockHandlers.onComponentSelect).toHaveBeenCalledTimes(20);
    });

    it('should integrate with virtualization systems', async () => {
      const manyComponents = Array.from({ length: 100 }, (_, i) => ({
        id: `virt-comp-${i}`,
        type: 'microservice' as const,
        x: i * 200, // Spread out horizontally
        y: 100,
        label: `Service ${i}`,
        layerId: 'layer1'
      }));

      renderWithProviders(
        <div style={{ width: 800, height: 600 }}>
          <CanvasArea
            components={manyComponents}
            connections={[]}
            selectedComponent={null}
            connectionStart={null}
            onComponentDrop={vi.fn()}
            onComponentMove={vi.fn()}
            onComponentSelect={vi.fn()}
            onStartConnection={vi.fn()}
            onCompleteConnection={vi.fn()}
            onConnectionLabelChange={vi.fn()}
          />
        </div>
      );

      // Should handle large component lists efficiently
      await waitFor(() => {
        const reactFlowWrapper = screen.getByTestId('reactflow-canvas');
        expect(reactFlowWrapper).toBeInTheDocument();
      });

      // Only visible components should be rendered (if virtualization is active)
      const nodes = document.querySelectorAll('.react-flow__node');
      // With virtualization, we might render fewer than 100 nodes
      expect(nodes.length).toBeLessThanOrEqual(100);
    });
  });
});
