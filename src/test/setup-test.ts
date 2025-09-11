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
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
  useNodesState: vi.fn(() => [[], vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn()]),
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
}));
