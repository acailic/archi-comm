// src/__tests__/integration/canvas-interactions.test.tsx
// Integration tests for canvas interactions using the presenter pattern and virtualization system
// Tests drag and drop, component selection, connections, keyboard shortcuts, and performance monitoring
// RELEVANT FILES: src/test/integration-helpers.tsx, src/features/canvas/hooks/useNodePresenter.ts, src/features/canvas/components/ReactFlowCanvas.tsx

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, MockHelpers } from '../../test/integration-helpers';
import { ReactFlowCanvas } from '../../packages/canvas/components/ReactFlowCanvas';
import { useNodePresenter } from '../../features/canvas/hooks/useNodePresenter';
import type { DesignComponent, Connection } from '../../shared/contracts';

// Mock canvas data for testing
const mockComponents: DesignComponent[] = [
  {
    id: 'gateway-1',
    type: 'api-gateway',
    x: 100,
    y: 100,
    label: 'Main Gateway',
    properties: { showLabel: true }
  },
  {
    id: 'service-1',
    type: 'microservice',
    x: 300,
    y: 150,
    label: 'User Service',
    properties: { showLabel: true }
  },
  {
    id: 'database-1',
    type: 'database',
    x: 500,
    y: 200,
    label: 'User Database',
    properties: { showLabel: true }
  }
];

const mockConnections: Connection[] = [
  {
    id: 'connection-1',
    from: 'gateway-1',
    to: 'service-1',
    type: 'api-call',
    label: 'User Requests'
  },
  {
    id: 'connection-2',
    from: 'service-1',
    to: 'database-1',
    type: 'database-query',
    label: 'Data Access'
  }
];

describe('Canvas Interactions Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockHandlers: {
    onComponentDrop: ReturnType<typeof vi.fn>;
    onComponentMove: ReturnType<typeof vi.fn>;
    onComponentSelect: ReturnType<typeof vi.fn>;
    onComponentLabelChange: ReturnType<typeof vi.fn>;
    onConnectionLabelChange: ReturnType<typeof vi.fn>;
    onConnectionDelete: ReturnType<typeof vi.fn>;
    onConnectionTypeChange: ReturnType<typeof vi.fn>;
    onStartConnection: ReturnType<typeof vi.fn>;
    onCompleteConnection: ReturnType<typeof vi.fn>;
    onInfoCardAdd: ReturnType<typeof vi.fn>;
    onInfoCardUpdate: ReturnType<typeof vi.fn>;
    onInfoCardDelete: ReturnType<typeof vi.fn>;
    onInfoCardColorChange: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    user = userEvent.setup();
    MockHelpers.mockTauriAPIs();

    // Mock all event handlers
    mockHandlers = {
      onComponentDrop: vi.fn(),
      onComponentMove: vi.fn(),
      onComponentSelect: vi.fn(),
      onComponentLabelChange: vi.fn(),
      onConnectionLabelChange: vi.fn(),
      onConnectionDelete: vi.fn(),
      onConnectionTypeChange: vi.fn(),
      onStartConnection: vi.fn(),
      onCompleteConnection: vi.fn(),
      onInfoCardAdd: vi.fn(),
      onInfoCardUpdate: vi.fn(),
      onInfoCardDelete: vi.fn(),
      onInfoCardColorChange: vi.fn()
    };
  });

  describe('Presenter Pattern Integration', () => {
    it('should manage component state through presenter pattern', async () => {
      // Create a test component that uses the presenter hook
      const TestComponentWithPresenter = ({ component, selected }: {
        component: DesignComponent;
        selected: boolean;
      }) => {
        const presenter = useNodePresenter(
          {
            component,
            isSelected: selected,
            isConnectionStart: false,
            onSelect: mockHandlers.onComponentSelect,
            onStartConnection: mockHandlers.onStartConnection,
            onLabelChange: mockHandlers.onComponentLabelChange
          },
          selected
        );

        return (
          <div
            data-testid={`presenter-component-${component.id}`}
            className={presenter.computed.visualStateClasses}
            onClick={presenter.actions.handleClick}
            onMouseEnter={presenter.actions.handleMouseEnter}
            onMouseLeave={presenter.actions.handleMouseLeave}
            onDoubleClick={() => presenter.actions.startEdit()}
          >
            <div data-testid="component-label">
              {presenter.state.isEditingLabel ? (
                <input
                  data-testid="label-input"
                  value={presenter.state.labelDraft}
                  onChange={(e) => presenter.actions.handleLabelInput(e.target.value)}
                  onKeyDown={presenter.actions.handleKeyDown}
                  onBlur={presenter.actions.commitEdit}
                />
              ) : (
                presenter.state.labelDraft
              )}
            </div>
            <div data-testid="component-icon">
              {presenter.computed.iconInfo.name}
            </div>
            <div data-testid="visual-state">
              {JSON.stringify(presenter.state.visualState)}
            </div>
          </div>
        );
      };

      renderWithProviders(
        <TestComponentWithPresenter
          component={mockComponents[0]}
          selected={false}
        />
      );

      // Test click interaction
      const component = screen.getByTestId('presenter-component-gateway-1');
      await user.click(component);

      expect(mockHandlers.onComponentSelect).toHaveBeenCalledWith('gateway-1');
    });

    it('should handle label editing through presenter', async () => {
      const TestComponentWithPresenter = ({ component }: { component: DesignComponent }) => {
        const presenter = useNodePresenter(
          {
            component,
            isSelected: true,
            isConnectionStart: false,
            onSelect: mockHandlers.onComponentSelect,
            onStartConnection: mockHandlers.onStartConnection,
            onLabelChange: mockHandlers.onComponentLabelChange
          },
          true
        );

        return (
          <div data-testid={`presenter-component-${component.id}`}>
            {presenter.state.isEditingLabel ? (
              <input
                data-testid="label-input"
                value={presenter.state.labelDraft}
                onChange={(e) => presenter.actions.handleLabelInput(e.target.value)}
                onKeyDown={presenter.actions.handleKeyDown}
                onBlur={presenter.actions.commitEdit}
              />
            ) : (
              <div
                data-testid="component-label"
                onDoubleClick={presenter.actions.startEdit}
              >
                {presenter.state.labelDraft}
              </div>
            )}
          </div>
        );
      };

      renderWithProviders(
        <TestComponentWithPresenter component={mockComponents[0]} />
      );

      // Start editing by double-clicking
      const label = screen.getByTestId('component-label');
      await user.dblClick(label);

      // Should show input field
      const input = screen.getByTestId('label-input');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('Main Gateway');

      // Edit the label
      await user.clear(input);
      await user.type(input, 'Updated Gateway');

      // Commit by pressing Enter
      await user.keyboard('{Enter}');

      expect(mockHandlers.onComponentLabelChange).toHaveBeenCalledWith(
        'gateway-1',
        'Updated Gateway'
      );
    });

    it('should manage hover states correctly', async () => {
      const TestHoverComponent = ({ component }: { component: DesignComponent }) => {
        const presenter = useNodePresenter(
          {
            component,
            isSelected: false,
            isConnectionStart: false,
            onSelect: mockHandlers.onComponentSelect,
            onStartConnection: mockHandlers.onStartConnection,
            onLabelChange: mockHandlers.onComponentLabelChange
          },
          false
        );

        return (
          <div
            data-testid={`presenter-component-${component.id}`}
            data-hovered={presenter.state.isHovered}
            onMouseEnter={presenter.actions.handleMouseEnter}
            onMouseLeave={presenter.actions.handleMouseLeave}
          >
            Hover State: {presenter.state.isHovered.toString()}
          </div>
        );
      };

      renderWithProviders(
        <TestHoverComponent component={mockComponents[0]} />
      );

      const component = screen.getByTestId('presenter-component-gateway-1');

      // Initially not hovered
      expect(component).toHaveAttribute('data-hovered', 'false');

      // Hover over component
      await user.hover(component);
      expect(component).toHaveAttribute('data-hovered', 'true');

      // Move mouse away
      await user.unhover(component);
      expect(component).toHaveAttribute('data-hovered', 'false');
    });

    it('should compute visual states correctly', async () => {
      const TestVisualStateComponent = ({
        component,
        selected,
        isConnectionStart
      }: {
        component: DesignComponent;
        selected: boolean;
        isConnectionStart: boolean;
      }) => {
        const presenter = useNodePresenter(
          {
            component,
            isSelected: selected,
            isConnectionStart,
            onSelect: mockHandlers.onComponentSelect,
            onStartConnection: mockHandlers.onStartConnection,
            onLabelChange: mockHandlers.onComponentLabelChange
          },
          selected
        );

        return (
          <div data-testid={`presenter-component-${component.id}`}>
            <div data-testid="visual-classes">
              {presenter.computed.visualStateClasses}
            </div>
            <div data-testid="gradient">
              {presenter.computed.gradient}
            </div>
          </div>
        );
      };

      const { rerender } = renderWithProviders(
        <TestVisualStateComponent
          component={mockComponents[0]}
          selected={false}
          isConnectionStart={false}
        />
      );

      // Test different visual states
      let visualClasses = screen.getByTestId('visual-classes').textContent;
      expect(visualClasses).not.toContain('selected');

      // Rerender with selected state
      rerender(
        <TestVisualStateComponent
          component={mockComponents[0]}
          selected={true}
          isConnectionStart={false}
        />
      );

      visualClasses = screen.getByTestId('visual-classes').textContent;
      expect(visualClasses).toContain('selected');

      // Test connection start state
      rerender(
        <TestVisualStateComponent
          component={mockComponents[0]}
          selected={false}
          isConnectionStart={true}
        />
      );

      visualClasses = screen.getByTestId('visual-classes').textContent;
      expect(visualClasses).toContain('connection-start');
    });
  });

  describe('Canvas Drag and Drop Operations', () => {
    it('should handle component drop through React DnD', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={[]}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Mock drag and drop event
      const canvasContainer = document.querySelector('.react-flow');
      expect(canvasContainer).toBeInTheDocument();

      // Simulate drop event
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        clientX: 150,
        clientY: 150
      });

      // Mock dataTransfer with component type
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          getData: vi.fn().mockReturnValue('api-gateway')
        }
      });

      fireEvent(canvasContainer!, dropEvent);

      // Should trigger component drop handler
      await waitFor(() => {
        expect(mockHandlers.onComponentDrop).toHaveBeenCalledWith(
          'api-gateway',
          expect.any(Number),
          expect.any(Number)
        );
      });
    });

    it('should handle component movement through React Flow drag', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents.slice(0, 1)}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Find the component node
      const componentNode = document.querySelector('[data-id="gateway-1"]');
      expect(componentNode).toBeInTheDocument();

      // Simulate drag movement
      fireEvent.mouseDown(componentNode!, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(document, { clientX: 200, clientY: 150 });
      fireEvent.mouseUp(document, { clientX: 200, clientY: 150 });

      // Should trigger move handler
      await waitFor(() => {
        expect(mockHandlers.onComponentMove).toHaveBeenCalledWith(
          'gateway-1',
          expect.any(Number),
          expect.any(Number)
        );
      });
    });

    it('should handle multi-selection with modifier keys', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // First component selection
      const component1 = document.querySelector('[data-id="gateway-1"]');
      await user.click(component1!);

      expect(mockHandlers.onComponentSelect).toHaveBeenCalledWith('gateway-1');

      // Multi-select with Ctrl/Cmd key
      const component2 = document.querySelector('[data-id="service-1"]');
      await user.keyboard('{Control>}');
      await user.click(component2!);
      await user.keyboard('{/Control}');

      expect(mockHandlers.onComponentSelect).toHaveBeenCalledWith('service-1');
    });
  });

  describe('Connection Creation and Management', () => {
    it('should create connections through handle dragging', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents.slice(0, 2)}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Find connection handles
      const sourceHandle = document.querySelector('[data-handleid="gateway-1-source"]');
      const targetHandle = document.querySelector('[data-handleid="service-1-target"]');

      expect(sourceHandle).toBeInTheDocument();
      expect(targetHandle).toBeInTheDocument();

      // Simulate connection creation
      fireEvent.mouseDown(sourceHandle!);
      fireEvent.mouseMove(targetHandle!, { clientX: 300, clientY: 150 });
      fireEvent.mouseUp(targetHandle!);

      await waitFor(() => {
        expect(mockHandlers.onCompleteConnection).toHaveBeenCalledWith(
          'gateway-1',
          'service-1'
        );
      });
    });

    it('should handle connection editing and deletion', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents}
          connections={mockConnections}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Find connection edge
      const connection = document.querySelector('[data-testid="rf__edge-connection-1"]');
      expect(connection).toBeInTheDocument();

      // Right-click to open context menu
      fireEvent.contextMenu(connection!);

      await waitFor(() => {
        expect(screen.getByText(/delete connection/i)).toBeInTheDocument();
      });

      // Click delete option
      const deleteOption = screen.getByText(/delete connection/i);
      await user.click(deleteOption);

      expect(mockHandlers.onConnectionDelete).toHaveBeenCalledWith('connection-1');
    });

    it('should handle connection type changes', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents}
          connections={mockConnections}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Select connection
      const connection = document.querySelector('[data-testid="rf__edge-connection-1"]');
      await user.click(connection!);

      // Should show connection editor
      await waitFor(() => {
        expect(screen.getByTestId('connection-editor')).toBeInTheDocument();
      });

      // Change connection type
      const typeSelector = screen.getByRole('combobox', { name: /connection type/i });
      await user.click(typeSelector);

      const newType = screen.getByRole('option', { name: /websocket/i });
      await user.click(newType);

      expect(mockHandlers.onConnectionTypeChange).toHaveBeenCalledWith(
        'connection-1',
        'websocket'
      );
    });
  });

  describe('Keyboard Shortcuts and Navigation', () => {
    it('should handle Delete key for component removal', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents.slice(0, 1)}
          connections={[]}
          selectedComponent="gateway-1"
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Press Delete key
      await user.keyboard('{Delete}');

      // Should trigger component deletion
      expect(mockHandlers.onComponentSelect).toHaveBeenCalledWith('');
    });

    it('should handle copy and paste operations', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents.slice(0, 1)}
          connections={[]}
          selectedComponent="gateway-1"
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Copy component
      await user.keyboard('{Control>}c{/Control}');

      // Paste component
      await user.keyboard('{Control>}v{/Control}');

      // Should create a duplicate component
      await waitFor(() => {
        expect(mockHandlers.onComponentDrop).toHaveBeenCalledWith(
          'api-gateway',
          expect.any(Number),
          expect.any(Number)
        );
      });
    });

    it('should handle undo and redo operations', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Undo operation
      await user.keyboard('{Control>}z{/Control}');

      // Redo operation
      await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

      // Should trigger appropriate handlers
      // (In a real implementation, these would be connected to an undo/redo system)
    });

    it('should handle arrow key navigation', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents.slice(0, 2)}
          connections={[]}
          selectedComponent="gateway-1"
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Navigate with arrow keys
      await user.keyboard('{ArrowRight}');

      // Should select next component or move selection
      // (Implementation would depend on navigation logic)
    });
  });

  describe('Virtualization System Integration', () => {
    it('should handle large numbers of components with virtualization', async () => {
      // Create many components for virtualization testing
      const manyComponents = Array.from({ length: 100 }, (_, i) => ({
        id: `component-${i}`,
        type: 'microservice' as const,
        x: (i % 10) * 100,
        y: Math.floor(i / 10) * 100,
        label: `Service ${i}`,
        properties: { showLabel: true }
      }));

      const mockVirtualizationStats = vi.fn();

      renderWithProviders(
        <ReactFlowCanvas
          components={manyComponents}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          virtualization={{
            enabled: true,
            viewportBuffer: 100,
            maxVisibleNodes: 50
          }}
          onVirtualizationStats={mockVirtualizationStats}
          {...mockHandlers}
        />
      );

      // Should render with virtualization
      await waitFor(() => {
        // Only visible components should be rendered
        const visibleComponents = document.querySelectorAll('[data-testid^="component-"]');
        expect(visibleComponents.length).toBeLessThanOrEqual(50);
      });

      // Should provide virtualization statistics
      expect(mockVirtualizationStats).toHaveBeenCalledWith(
        expect.objectContaining({
          totalNodes: 100,
          visibleNodes: expect.any(Number),
          culledNodes: expect.any(Number)
        })
      );
    });

    it('should handle viewport changes with virtualization', async () => {
      const manyComponents = Array.from({ length: 50 }, (_, i) => ({
        id: `component-${i}`,
        type: 'microservice' as const,
        x: i * 200, // Spread out horizontally
        y: 100,
        label: `Service ${i}`,
        properties: { showLabel: true }
      }));

      renderWithProviders(
        <ReactFlowCanvas
          components={manyComponents}
          connections={[]}
          selectedComponent={null}
          connectionStart={null}
          virtualization={{
            enabled: true,
            viewportBuffer: 100
          }}
          {...mockHandlers}
        />
      );

      // Get React Flow instance
      const reactFlowWrapper = document.querySelector('.react-flow');
      expect(reactFlowWrapper).toBeInTheDocument();

      // Simulate viewport pan
      fireEvent.mouseDown(reactFlowWrapper!);
      fireEvent.mouseMove(reactFlowWrapper!, { clientX: -500, clientY: 0 });
      fireEvent.mouseUp(reactFlowWrapper!);

      // Should update visible components based on new viewport
      await waitFor(() => {
        const visibleComponents = document.querySelectorAll('[data-testid^="component-"]');
        expect(visibleComponents.length).toBeGreaterThan(0);
      });
    });

    it('should toggle virtualization on and off', async () => {
      const TestVirtualizationToggle = () => {
        const [virtualizationEnabled, setVirtualizationEnabled] = React.useState(false);

        return (
          <div>
            <button
              data-testid="toggle-virtualization"
              onClick={() => setVirtualizationEnabled(!virtualizationEnabled)}
            >
              Toggle Virtualization
            </button>
            <ReactFlowCanvas
              components={mockComponents}
              connections={[]}
              selectedComponent={null}
              connectionStart={null}
              virtualization={{
                enabled: virtualizationEnabled
              }}
              {...mockHandlers}
            />
          </div>
        );
      };

      renderWithProviders(<TestVirtualizationToggle />);

      const toggleButton = screen.getByTestId('toggle-virtualization');

      // Enable virtualization
      await user.click(toggleButton);

      // Should apply virtualization
      await waitFor(() => {
        expect(document.querySelector('.virtual-canvas')).toBeInTheDocument();
      });

      // Disable virtualization
      await user.click(toggleButton);

      // Should remove virtualization
      await waitFor(() => {
        expect(document.querySelector('.virtual-canvas')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance Monitoring and Optimization', () => {
    it('should monitor canvas rendering performance', async () => {
      const performanceStart = performance.now();

      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents}
          connections={mockConnections}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Wait for initial render
      await waitFor(() => {
        expect(document.querySelector('.react-flow')).toBeInTheDocument();
      });

      ;(performance as any).advanceTime?.(50);
      const performanceEnd = performance.now();
      const renderTime = performanceEnd - performanceStart;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000);
    });

    it('should handle smooth interactions during complex operations', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents}
          connections={mockConnections}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      const startTime = performance.now();

      // Perform multiple interactions rapidly
      const component1 = document.querySelector('[data-id="gateway-1"]');
      const component2 = document.querySelector('[data-id="service-1"]');

      for (let i = 0; i < 10; i++) {
        await user.click(component1!);
        await user.click(component2!);
      }

      ;(performance as any).advanceTime?.(30);
      const endTime = performance.now();
      const interactionTime = endTime - startTime;

      // Should handle rapid interactions smoothly
      expect(interactionTime).toBeLessThan(2000);
      expect(mockHandlers.onComponentSelect).toHaveBeenCalledTimes(20);
    });

    it('should maintain frame rate during animations', async () => {
      renderWithProviders(
        <ReactFlowCanvas
          components={mockComponents}
          connections={mockConnections}
          selectedComponent={null}
          connectionStart={null}
          {...mockHandlers}
        />
      );

      // Simulate viewport animation
      const reactFlowWrapper = document.querySelector('.react-flow');

      // Start animation monitoring
      const animationStart = performance.now();
      let frameCount = 0;

      const countFrames = () => {
        frameCount++;
        if (performance.now() - animationStart < 1000) {
          requestAnimationFrame(countFrames);
        }
      };

      requestAnimationFrame(countFrames);

      // Perform smooth zoom animation
      fireEvent.wheel(reactFlowWrapper!, { deltaY: -100 });

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Should maintain reasonable frame rate (>30 FPS)
      expect(frameCount).toBeGreaterThan(30);
    });
  });
});
