// src/test/setup.ts

// 1. Imports
import React from 'react'; // Comment 19
import '@testing-library/jest-dom';
import { afterEach, vi, beforeEach } from 'vitest';
import { ExtendedMockStorage } from './mocks/storage'; // Comment 37
import { createTauriMocks } from './mocks/tauri'; // Comment 37
import { enhancedPerformanceMock, advanceFrame } from './mocks/performance'; // Comment 37 & 20
import { testErrorHandlers } from './mocks/error'; // Comment 37

// 2. Type definitions
interface WindowDef {
  label: string;
  title: string;
  url: string;
}

declare global {
  interface Window {
    __TAURI__: any;
    __TAURI_METADATA__: {
      __windows: WindowDef[];
      __currentWindow: WindowDef;
    };
    // For error testing
    __testErrors: any[];
    triggerTestError: (...args: any[]) => void;
    clearTestErrors: () => void;
    getTestErrors: () => any[];
  }
}

// 3. Mocks setup
// Tauri Mocks (Comment 15, 38)
const tauriMocks = createTauriMocks();

// Console Mocks (Comment 27, 28)
const originalConsole = {
  error: console.error,
  warn: console.warn,
};
const mockConsole = {
  ...console,
  error: vi.fn((...args: any[]) => {
    const firstArg = args[0];
    if (firstArg instanceof Error) { // Comment 12
      testErrorHandlers.errors.push({
        error: firstArg,
        timestamp: Date.now(),
      });
    } else {
      testErrorHandlers.errors.push({
        error: new Error(args.join(' ')),
        timestamp: Date.now(),
      });
    }
    originalConsole.error(...args);
  }),
  warn: vi.fn((...args: any[]) => {
    originalConsole.warn(...args);
  }),
};

// rAF Mocks (Comment 7, 35, 6, 36)
const rAFCallbacks = new Map<ReturnType<typeof setTimeout>, FrameRequestCallback>();
const mockRequestAnimationFrame = (callback: FrameRequestCallback): ReturnType<typeof setTimeout> => {
  const handle = setTimeout(() => {
    // advance time inside callback
    if (typeof (performance as any).advanceTime === 'function') {
      (performance as any).advanceTime(1000 / 60);
    }
    callback(performance.now());
    rAFCallbacks.delete(handle);
  }, 0);
  rAFCallbacks.set(handle, callback);
  return handle;
};

const mockCancelAnimationFrame = (id: ReturnType<typeof setTimeout>) => {
  clearTimeout(id);
  rAFCallbacks.delete(id);
};

// Mock FileList and DataTransferItemList (Comment 18)
class MockFileList {
  private files: File[] = [];
  get length(): number { return this.files.length; }
  item(index: number): File | null { return this.files[index] || null; }
  [Symbol.iterator]() { return this.files[Symbol.iterator](); }
  [index: number]: File;
}

class MockDataTransferItemList {
  private items: DataTransferItem[] = [];
  get length(): number { return this.items.length; }
  add(_data: string | File, _type?: string): DataTransferItem | null { return null; }
  clear(): void { this.items = []; }
  remove(index: number): void { this.items.splice(index, 1); }
  [Symbol.iterator]() { return this.items[Symbol.iterator](); }
  [index: number]: DataTransferItem;
}

// Mock DragEvent
class MockDragEvent extends Event {
  dataTransfer: DataTransfer;
  constructor(type: string, options?: EventInit) {
    super(type, options);
    this.dataTransfer = {
      dropEffect: 'none', effectAllowed: 'none',
      files: new MockFileList() as unknown as FileList,
      items: new MockDataTransferItemList() as unknown as DataTransferItemList,
      types: [],
      clearData: vi.fn(), getData: vi.fn(), setData: vi.fn(), setDragImage: vi.fn(),
    };
  }
}

// 4. Global stubbing (Comment 14, 29)
const extendedLocalStorage = new ExtendedMockStorage();
const extendedSessionStorage = new ExtendedMockStorage();

const mockWindow = {
  __TAURI__: tauriMocks,
  __TAURI_METADATA__: { __windows: [], __currentWindow: {} },
  ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
  matchMedia: () => ({
    matches: false, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => false,
  }),
  requestAnimationFrame: vi.fn(mockRequestAnimationFrame),
  cancelAnimationFrame: vi.fn(mockCancelAnimationFrame),
  localStorage: extendedLocalStorage,
  sessionStorage: extendedSessionStorage,
  DragEvent: MockDragEvent,
  // For error testing
  __testErrors: testErrorHandlers.errors,
  triggerTestError: testErrorHandlers.triggerTestError.bind(testErrorHandlers),
  clearTestErrors: testErrorHandlers.clearTestErrors.bind(testErrorHandlers),
  getTestErrors: testErrorHandlers.getTestErrors.bind(testErrorHandlers),
  // For performance testing
  performance: enhancedPerformanceMock,
  // For file list testing
  FileList: MockFileList,
  DataTransferItemList: MockDataTransferItemList,
};

vi.stubGlobal('window', mockWindow);
vi.stubGlobal('console', mockConsole);
// Stubbing globals that might not be on window
vi.stubGlobal('ResizeObserver', mockWindow.ResizeObserver);
vi.stubGlobal('localStorage', extendedLocalStorage);
vi.stubGlobal('sessionStorage', extendedSessionStorage);
vi.stubGlobal('DragEvent', MockDragEvent);
vi.stubGlobal('performance', enhancedPerformanceMock);
vi.stubGlobal('FileList', MockFileList); // Comment 18
vi.stubGlobal('DataTransferItemList', MockDataTransferItemList); // Comment 18

// 5. Module mocks
// Tauri ESM mocks (Comment 15, 38)
vi.mock('@tauri-apps/api/dialog', () => tauriMocks.dialog);
vi.mock('@tauri-apps/api/fs', () => tauriMocks.fs);
vi.mock('@tauri-apps/api/path', () => tauriMocks.path);

// React Flow mock (Comment 16, 17, 30, 31, 32)
vi.mock('@xyflow/react', () => {
  const React = require('react'); // require inside mock factory
  const { useState } = React;

  const ReactFlow = React.forwardRef((
    { children, nodes = [], edges = [], onFocus, ...props }: any,
    ref: React.Ref<HTMLDivElement>
  ) => {
    const classNames = [
      'react-flow',
      props.className,
    ].filter(Boolean).join(' ');

    return React.createElement(
      'div',
      {
        ref,
        className: classNames,
        tabIndex: 0,
        'data-testid': 'react-flow',
        onFocus: (e: React.FocusEvent<HTMLDivElement>) => {
          e.currentTarget.classList.add('react-flow__focused'); // Comment 30
          if (onFocus) onFocus(e);
        },
        ...props,
      },
      React.createElement(
        'div',
        { className: 'react-flow__viewport' },
        ...nodes.map((node: any) =>
          React.createElement('div', {
            key: node.id,
            // Comment 16, 31
            className: [
              'react-flow__node',
              (node.data?.isSelected || (node.data?.component?.id === props.selectedComponent)) ? 'selected' : ''
            ].filter(Boolean).join(' '),
            'data-id': node.id,
          })
        ),
        ...edges.map((edge: any) =>
          React.createElement('div', {
            key: edge.id,
            className: 'react-flow__edge',
            'data-id': edge.id,
          })
        ),
        children
      )
    );
  });
  ReactFlow.displayName = 'ReactFlow';

  return {
    ReactFlow,
    ReactFlowProvider: ({ children }: { children: React.ReactNode }) => children,
    // Comment 17, 32
    useNodesState: vi.fn((initialNodes) => {
      const [nodes, setNodes] = useState(initialNodes);
      const onNodesChange = vi.fn(); // Mock implementation if needed
      return [nodes, setNodes, onNodesChange];
    }),
    useEdgesState: vi.fn((initialEdges) => {
      const [edges, setEdges] = useState(initialEdges);
      const onEdgesChange = vi.fn(); // Mock implementation if needed
      return [edges, setEdges, onEdgesChange];
    }),
    useReactFlow: vi.fn(() => ({
      getNode: vi.fn(), getEdge: vi.fn(), getNodes: vi.fn(() => []), getEdges: vi.fn(() => []),
      setNodes: vi.fn(), setEdges: vi.fn(), addNodes: vi.fn(), addEdges: vi.fn(),
      deleteElements: vi.fn(), project: vi.fn((p: any) => p), getIntersectingNodes: vi.fn(() => []),
      screenToFlowPosition: vi.fn(() => ({ x: 0, y: 0 })), fitView: vi.fn(),
    })),
    Handle: vi.fn(() => null),
    Position: { Left: 'left', Right: 'right', Top: 'top', Bottom: 'bottom' },
    MarkerType: { Arrow: 'arrow', ArrowClosed: 'arrowclosed' },
    NodeTypes: {}, EdgeTypes: {}, Controls: vi.fn(() => null), MiniMap: vi.fn(() => null),
    Background: vi.fn(() => null), BackgroundVariant: { Dots: 'dots', Lines: 'lines' },
    Panel: ({ children }: { children: React.ReactNode }) => children,
  };
});

// 6. Cleanup hooks
beforeEach(() => {
    // Reset mocks that need resetting before each test
    vi.clearAllMocks();
    
    // Reset extended storage
    extendedLocalStorage.clear();
    extendedLocalStorage.simulateFailure(false);
    
    extendedSessionStorage.clear();
    extendedSessionStorage.simulateFailure(false);
    
    // Reset performance mock
    enhancedPerformanceMock.resetTime();
    
    // Clear test errors
    testErrorHandlers.clearTestErrors();
    
    // Reset console
    mockConsole.error.mockClear();
    mockConsole.warn.mockClear();
});

afterEach(() => {
  // Comment 28: Restore original console
  vi.stubGlobal('console', originalConsole);
  
  // Comment 13: Move resetModules to the end
  vi.resetModules();
});

// Expose advanceFrame helper globally for tests (Comment 20)
vi.stubGlobal('advanceFrame', advanceFrame);
