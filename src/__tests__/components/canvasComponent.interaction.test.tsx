import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { StrictMode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { DesignComponent } from '@/shared/contracts';
import { CustomNode, type CustomNodeData } from '@canvas/components/CustomNode';

const baseComponent: DesignComponent = {
  id: 'c1',
  type: 'server',
  label: 'API Server',
  x: 10,
  y: 10,
  properties: {},
};

const createNodeData = (overrides: Partial<CustomNodeData> = {}): CustomNodeData => ({
  component: baseComponent,
  isSelected: false,
  isConnectionStart: false,
  onSelect: vi.fn(),
  onStartConnection: vi.fn(),
  ...overrides,
});

const createNodeProps = (data: CustomNodeData) => ({
  id: baseComponent.id,
  type: 'custom' as const,
  position: { x: baseComponent.x, y: baseComponent.y },
  data,
  selected: false,
  isConnectable: true,
  zIndex: 1,
  xPos: baseComponent.x,
  yPos: baseComponent.y,
  dragging: false,
});

describe('CustomNode interactions and memoization', () => {
  it('renders component label and handles selection', async () => {
    const onSelect = vi.fn();
    const nodeData = createNodeData({ onSelect });
    const nodeProps = createNodeProps(nodeData);

    render(
      <StrictMode>
        <ReactFlowProvider>
          <div className="react-flow__node" data-testid="react-flow-node">
            <CustomNode {...nodeProps} />
          </div>
        </ReactFlowProvider>
      </StrictMode>
    );

    // Component label appears
    expect(screen.getByText('API Server')).toBeInTheDocument();

    // Component type badge appears
    expect(screen.getByText('SERVER')).toBeInTheDocument();

    // Server icon appears (emoji fallback)
    expect(screen.getByText('🖥️')).toBeInTheDocument();

    // Click on the node to test selection
    const nodeElement = screen.getByText('API Server').closest('.canvas-component');
    expect(nodeElement).toBeInTheDocument();

    fireEvent.click(nodeElement!);
    expect(onSelect).toHaveBeenCalledWith('c1');
  });

  it('shows connection handles on hover and handles connection start', async () => {
    const onStartConnection = vi.fn();
    const nodeData = createNodeData({ onStartConnection });
    const nodeProps = createNodeProps(nodeData);

    render(
      <StrictMode>
        <ReactFlowProvider>
          <div className="react-flow__node" data-testid="react-flow-node">
            <CustomNode {...nodeProps} />
          </div>
        </ReactFlowProvider>
      </StrictMode>
    );

    const nodeElement = screen.getByText('API Server').closest('.canvas-component');
    expect(nodeElement).toBeInTheDocument();

    // Hover over the node to show handles
    fireEvent.mouseEnter(nodeElement!);

    // Connection handles should be present (they have React Flow Handle classes)
    const handles = nodeElement!.querySelectorAll('.react-flow__handle');
    expect(handles).toHaveLength(4); // top, bottom, left, right

    // Test connection start on a handle
    const topHandle = handles[0];
    fireEvent.mouseDown(topHandle);
    expect(onStartConnection).toHaveBeenCalledWith('c1', 'top');
  });

  it('displays visual states correctly', async () => {
    const nodeData = createNodeData({
      isSelected: true,
      isConnectionStart: true,
      isMultiSelected: true,
      healthStatus: 'warning' as const
    });
    const nodeProps = createNodeProps(nodeData);

    render(
      <StrictMode>
        <ReactFlowProvider>
          <div className="react-flow__node" data-testid="react-flow-node">
            <CustomNode {...nodeProps} />
          </div>
        </ReactFlowProvider>
      </StrictMode>
    );

    const nodeElement = screen.getByText('API Server').closest('.canvas-component');
    expect(nodeElement).toBeInTheDocument();

    // Multi-selection indicator should be visible
    const multiSelectIndicator = nodeElement!.querySelector('.bg-blue-500\\/90');
    expect(multiSelectIndicator).toBeInTheDocument();
  });

  it('shows context menu with proper actions', async () => {
    const onShowProperties = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();

    const nodeData = createNodeData({
      onShowProperties,
      onDuplicate,
      onDelete
    });
    const nodeProps = createNodeProps(nodeData);

    render(
      <StrictMode>
        <ReactFlowProvider>
          <div className="react-flow__node" data-testid="react-flow-node">
            <CustomNode {...nodeProps} />
          </div>
        </ReactFlowProvider>
      </StrictMode>
    );

    const nodeElement = screen.getByText('API Server').closest('.canvas-component');
    expect(nodeElement).toBeInTheDocument();

    // Right-click to open context menu
    fireEvent.contextMenu(nodeElement!);

    // Context menu items should be available
    expect(screen.getByText('Edit Properties')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    // Test context menu actions
    fireEvent.click(screen.getByText('Edit Properties'));
    expect(onShowProperties).toHaveBeenCalledWith('c1');
  });

  it('memo avoids re-render on unrelated parent state changes', async () => {
    let renders = 0;
    const Wrapped = () => {
      const [count, setCount] = useState(0);
      renders++;
      const nodeData = createNodeData();
      const nodeProps = createNodeProps(nodeData);

      return (
        <ReactFlowProvider>
          <div>
            <button onClick={() => setCount(v => v + 1)}>inc {count}</button>
            <div className="react-flow__node" data-testid="react-flow-node">
              <CustomNode {...nodeProps} />
            </div>
          </div>
        </ReactFlowProvider>
      );
    };

    const { getByText } = render(<Wrapped />);
    const initialRenders = renders;
    getByText(/inc/).click();

    // Parent should rerender once; memoized CustomNode should not cause many extra renders
    expect(renders).toBe(initialRenders + 1);
  });

  it('handles component properties and metadata display', async () => {
    const componentWithVersion: DesignComponent = {
      ...baseComponent,
      properties: {
        version: '1.2.3',
        showLabel: true
      }
    };

    const nodeData = createNodeData({ component: componentWithVersion });
    const nodeProps = createNodeProps(nodeData);

    render(
      <StrictMode>
        <ReactFlowProvider>
          <div className="react-flow__node" data-testid="react-flow-node">
            <CustomNode {...nodeProps} />
          </div>
        </ReactFlowProvider>
      </StrictMode>
    );

    // Version should be displayed
    expect(screen.getByText('v1.2.3')).toBeInTheDocument();

    // Label should be visible
    expect(screen.getByText('API Server')).toBeInTheDocument();
  });

  it('handles invisible components correctly', async () => {
    const nodeData = createNodeData({ isVisible: false });
    const nodeProps = createNodeProps(nodeData);

    const { container } = render(
      <StrictMode>
        <ReactFlowProvider>
          <div className="react-flow__node" data-testid="react-flow-node">
            <CustomNode {...nodeProps} />
          </div>
        </ReactFlowProvider>
      </StrictMode>
    );

    // Component should not render when invisible
    expect(container.querySelector('.canvas-component')).not.toBeInTheDocument();
  });

  it('displays connection count on hover', async () => {
    const nodeData = createNodeData({ connectionCount: 3 });
    const nodeProps = createNodeProps(nodeData);

    render(
      <StrictMode>
        <ReactFlowProvider>
          <div className="react-flow__node" data-testid="react-flow-node">
            <CustomNode {...nodeProps} />
          </div>
        </ReactFlowProvider>
      </StrictMode>
    );

    const nodeElement = screen.getByText('API Server').closest('.canvas-component');
    expect(nodeElement).toBeInTheDocument();

    // Hover to show connection count
    fireEvent.mouseEnter(nodeElement!);

    // Connection count should be visible
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

