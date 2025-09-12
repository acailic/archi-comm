import '@testing-library/jest-dom';
import { vi } from 'vitest';
import './mock-tauri';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock React Flow
vi.mock('@xyflow/react', () => ({
  ReactFlow: vi.fn(({ children, nodes = [], edges = [], onFocus, ...props }: any) => {
    const React = require('react');
    
    // Create mock nodes
    const mockNodes = nodes.map((node: any) => 
      React.createElement('div', {
        key: node.id,
        className: `react-flow__node ${node.data?.isSelected || (node.data?.component?.id === props.selectedComponent) ? 'selected' : ''}`,
        'data-id': node.id,
      })
    );
    
    // Create mock edges  
    const mockEdges = edges.map((edge: any) =>
      React.createElement('div', {
        key: edge.id, 
        className: 'react-flow__edge',
        'data-id': edge.id,
      })
    );
    
    return React.createElement('div', {
      className: 'react-flow',
      tabIndex: 0,
      'data-testid': 'react-flow',
      onFocus: (e: any) => {
        // Add focused class on focus
        e.target.classList.add('react-flow__focused');
        onFocus && onFocus(e);
      },
      ...props
    }, 
      React.createElement('div', { className: 'react-flow__viewport' }, 
        ...mockNodes,
        ...mockEdges,
        children
      )
    );
  }),
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
  useNodesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useReactFlow: vi.fn(() => ({
    getNode: () => null,
    getEdge: () => null,
    getNodes: () => [],
    getEdges: () => [],
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    addNodes: vi.fn(),
    addEdges: vi.fn(),
    project: vi.fn(),
    getIntersectingNodes: vi.fn(),
    screenToFlowPosition: vi.fn(() => ({ x: 0, y: 0 })),
    fitView: vi.fn(),
  })),
  Handle: vi.fn(() => null),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
  MarkerType: {
    Arrow: 'arrow',
    ArrowClosed: 'arrowclosed',
  },
  NodeTypes: {},
  EdgeTypes: {},
  Controls: vi.fn(() => null),
  MiniMap: vi.fn(() => null),
  Background: vi.fn(() => null),
  BackgroundVariant: {
    Dots: 'dots',
    Lines: 'lines',
  },
  Panel: ({ children }: { children: React.ReactNode }) => children,
}));
