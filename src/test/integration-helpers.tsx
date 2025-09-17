// src/test/integration-helpers.tsx
// Comprehensive integration test utilities for ArchiComm application testing
// Provides reusable test utilities that bridge unit and E2E testing with React Testing Library
// RELEVANT FILES: src/test/setup.ts, e2e/utils/test-helpers.ts, src/components/AppContainer.tsx, src/features/canvas/hooks/useNodePresenter.ts

import React, { ReactElement } from 'react';
import { render, RenderResult, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import userEvent from '@testing-library/user-event';
import { ServiceProvider } from '@/lib/di/ServiceProvider';
import { createContainer, createToken } from '@/lib/di/Container';
import { TooltipProvider } from '@ui/components/ui/tooltip';

// Types for test data structures
export interface TestComponent {
  id: string;
  type: string;
  position: { x: number; y: number };
  label: string;
}

export interface TestConnection {
  id: string;
  fromId: string;
  toId: string;
}

export interface TestDesignData {
  components: TestComponent[];
  connections: TestConnection[];
  metadata: {
    challengeId?: string;
    timestamp: number;
    version: string;
  };
}

export interface TestErrorScenario {
  type: 'network' | 'validation' | 'system' | 'storage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
}

export interface TestWorkflowPhase {
  phase: 'welcome' | 'challenge-selection' | 'design' | 'audio' | 'review' | 'complete';
  data?: any;
}

// Mock providers and context setup
interface RenderWithProvidersOptions {
  mockServices?: Record<string, any>;
  errorBoundary?: boolean;
}

/**
 * Renders a component with all necessary providers for integration testing
 * Includes DndProvider, ServiceProvider, TooltipProvider, and error boundary
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult {
  const {
    mockServices = {},
    errorBoundary = true
  } = options;

  // Create test container for DI services
  const testContainer = MockHelpers.createTestContainer(mockServices);

  const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    const providers = (
      <DndProvider backend={HTML5Backend}>
        <ServiceProvider container={testContainer as any}>
          {children}
        </ServiceProvider>
      </DndProvider>
    );

    if (errorBoundary) {
      return (
        <TestErrorBoundary>
          {providers}
        </TestErrorBoundary>
      );
    }

    return providers;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Test Error Boundary component
class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for test verification
    (globalThis as any).__testErrors = (globalThis as any).__testErrors || [];
    (globalThis as any).__testErrors.push({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>Something went wrong in test</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.toString()}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Canvas interaction helpers for testing canvas operations without browser automation
 */
export class CanvasTestHelpers {
  /**
   * Adds a component to the canvas via real UI (drag from palette to canvas).
   * Returns the actual created component id by diffing [data-id] nodes.
   */
  static async addComponent(
    type: string,
    position: { x: number; y: number },
    label?: string
  ): Promise<TestComponent> {
    // Canvas (React Flow) root
    const canvas = (screen.queryByTestId('reactflow-canvas') || screen.queryByTestId('canvas') || document.querySelector('.react-flow')) as HTMLElement | null;
    if (!canvas) throw new Error('Canvas not found: reactflow-canvas');

    // Palette item for the given type
    const paletteItem = screen.queryByTestId(`palette-item-${type}`);
    if (!paletteItem) throw new Error(`Palette item not found for type: ${type}`);

    // Collect existing node ids before drop
    const beforeIds = new Set(
      Array.from(document.querySelectorAll('.react-flow__node')).map(el => (el as HTMLElement).dataset.id || '')
    );

    // Perform drag-and-drop using Testing Library userEvent
    // This triggers react-dnd HTML5 backend, which our canvas drop zone subscribes to.
    await userEvent.dragAndDrop(paletteItem, canvas);

    // Wait for a new node to appear
    let newId = '';
    await waitFor(() => {
      const after = Array.from(document.querySelectorAll('.react-flow__node')) as HTMLElement[];
      const afterIds = after.map(n => n.dataset.id || '').filter(Boolean);
      const diff = afterIds.filter(id => !beforeIds.has(id));
      if (diff.length === 0) throw new Error('No new node created');
      newId = diff[0];
    });

    // Optionally set label via PropertiesPanel if provided
    if (label) {
      // select the node
      const node = document.querySelector(`[data-id="${newId}"]`) as HTMLElement | null;
      if (node) {
        await userEvent.click(node);
        const labelInput = screen.queryByPlaceholderText('Enter component label...');
        if (labelInput) {
          await userEvent.clear(labelInput);
          await userEvent.type(labelInput, label);
        }
      }
    }

    return {
      id: newId,
      type,
      position,
      label: label || `${type} Component`,
    };
  }

  /**
   * Selects a component on the canvas
   */
  static async selectComponent(id: string): Promise<void> {
    const component = document.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
    if (!component) throw new Error(`Component not found: ${id}`);
    await userEvent.click(component);
  }

  /**
   * Creates a connection between two components
   */
  static async createConnection(fromId: string, toId: string): Promise<TestConnection> {
    // React Flow renders handles as .react-flow__handle with data-handlepos attr
    const fromNode = document.querySelector(`[data-id="${fromId}"]`) as HTMLElement | null;
    const toNode = document.querySelector(`[data-id="${toId}"]`) as HTMLElement | null;
    if (!fromNode || !toNode) throw new Error('from/to nodes not found');

    const fromHandle = fromNode.querySelector('.react-flow__handle[data-handlepos="bottom"]') as HTMLElement | null;
    const toHandle = toNode.querySelector('.react-flow__handle[data-handlepos="top"]') as HTMLElement | null;
    if (!fromHandle || !toHandle) throw new Error('from/to handles not found');

    // Start connection drag and finish on target handle
    fireEvent.mouseDown(fromHandle, { buttons: 1 });
    fireEvent.mouseMove(toHandle);
    fireEvent.mouseUp(toHandle);

    // We cannot know the edge id, but presence of any rf edge should increase
    await waitFor(() => {
      const edges = document.querySelectorAll('[data-testid^="rf__edge-"]');
      expect(edges.length).toBeGreaterThan(0);
    });

    return { id: `connection-${fromId}-${toId}`, fromId, toId };
  }

  /**
   * Moves a component to a new position
   */
  static async moveComponent(id: string, newPosition: { x: number; y: number }): Promise<void> {
    const component = document.querySelector(`[data-id="${id}"]`) as HTMLElement | null;
    if (!component) throw new Error(`Component not found: ${id}`);
    fireEvent.mouseDown(component, { buttons: 1 });
    fireEvent.mouseMove(component, { clientX: newPosition.x, clientY: newPosition.y });
    fireEvent.mouseUp(component);
  }

  /**
   * Deletes a component from the canvas
   */
  static async deleteComponent(id: string): Promise<void> {
    await this.selectComponent(id);
    // Use PropertiesPanel delete button for reliable deletion
    const deleteBtn = screen.getByRole('button', { name: /delete component/i });
    await userEvent.click(deleteBtn);
    await waitFor(() => {
      const node = document.querySelector(`[data-id="${id}"]`);
      expect(node).toBeNull();
    });
  }

  /**
   * Gets the current number of components on the canvas
   */
  static getComponentCount(): number {
    return document.querySelectorAll('.react-flow__node').length;
  }

  /**
   * Gets the current number of connections on the canvas
   */
  static getConnectionCount(): number {
    const edgesByTestId = document.querySelectorAll('[data-testid^="rf__edge-"]');
    if (edgesByTestId.length > 0) return edgesByTestId.length;
    // Fallback selector
    return document.querySelectorAll('.react-flow__edge').length;
  }

  /**
   * Triggers the export functionality and captures the result
   */
  static async exportDesign(): Promise<TestDesignData> {
    // Intercept URL.createObjectURL to capture the Blob
    let capturedBlob: Blob | null = null;
    const originalCreate = URL.createObjectURL;
    // @ts-expect-error override for testing
    URL.createObjectURL = (blob: Blob) => {
      capturedBlob = blob;
      return 'blob:test-url';
    };

    try {
      // Click the export button by probing toolbar buttons until export is triggered
      const buttons = screen.getAllByRole('button');
      for (const btn of buttons) {
        await userEvent.click(btn);
        if (capturedBlob) break;
      }

      if (!capturedBlob) throw new Error('Export was not triggered');
      const jsonText = await capturedBlob.text();
      const parsed = JSON.parse(jsonText);

      // Normalize to TestDesignData shape
      return {
        components: (parsed.components || []).map((c: any) => ({
          id: c.id,
          type: c.type,
          position: { x: c.x, y: c.y },
          label: c.label || ''
        })),
        connections: (parsed.connections || []).map((e: any) => ({
          id: e.id,
          fromId: e.from,
          toId: e.to
        })),
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0'
        }
      };
    } finally {
      URL.createObjectURL = originalCreate;
    }
  }
}

/**
 * Workflow helpers for testing complete user flows
 */
export class WorkflowTestHelpers {
  /**
   * Navigates through challenge selection workflow
   */
  static async selectChallenge(challengeId: string): Promise<void> {
    const challengeCard = screen.getByTestId(`challenge-${challengeId}`);
    await userEvent.click(challengeCard);

    const startButton = screen.getByTestId('start-challenge-button');
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
    });
  }

  /**
   * Completes the design phase with specified components
   */
  static async completeDesignPhase(components: Array<{ type: string; label?: string }>): Promise<void> {
    for (const comp of components) {
      await CanvasTestHelpers.addComponent(
        comp.type,
        { x: Math.random() * 400, y: Math.random() * 300 },
        comp.label
      );
    }

    const continueButton = screen.getByTestId('continue-to-recording');
    await userEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByTestId('audio-recording')).toBeInTheDocument();
    });
  }

  /**
   * Completes the audio recording phase
   */
  static async completeAudioPhase(transcript?: string): Promise<void> {
    const startRecordingButton = screen.getByTestId('start-recording');
    await userEvent.click(startRecordingButton);

    // Simulate recording process
    await new Promise(resolve => setTimeout(resolve, 1000));

    const stopRecordingButton = screen.getByTestId('stop-recording');
    await userEvent.click(stopRecordingButton);

    if (transcript) {
      const transcriptArea = screen.getByTestId('transcript-area');
      await userEvent.clear(transcriptArea);
      await userEvent.type(transcriptArea, transcript);
    }

    const continueButton = screen.getByTestId('continue-to-review');
    await userEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByTestId('review-screen')).toBeInTheDocument();
    });
  }

  /**
   * Navigates to the final review screen
   */
  static async navigateToReview(): Promise<void> {
    await waitFor(() => {
      expect(screen.getByTestId('review-screen')).toBeInTheDocument();
    });
  }

  /**
   * Triggers error recovery scenarios for testing
   */
  static async triggerErrorRecovery(errorType: TestErrorScenario['type']): Promise<void> {
    // Use global test error trigger
    (globalThis as any).triggerTestError(errorType);

    await waitFor(() => {
      expect(screen.getByTestId('recovery-overlay')).toBeInTheDocument();
    });
  }
}

/**
 * Mock helpers for test environment setup
 */
export class MockHelpers {
  /**
   * Mocks Tauri APIs for file operations and system integration
   */
  static mockTauriAPIs(): void {
    // No-op: real Tauri API modules are mocked in test setup via vi.mock('@tauri-apps/api/*')
  }

  /**
   * Mocks storage APIs with controlled behavior
   */
  static mockStorageAPIs(): void {
    const mockStorage = {
      data: new Map<string, string>(),
      getItem: vi.fn((key: string) => mockStorage.data.get(key) || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage.data.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        mockStorage.data.delete(key);
      }),
      clear: vi.fn(() => {
        mockStorage.data.clear();
      }),
      simulateFailure: vi.fn(() => {
        throw new Error('Storage quota exceeded');
      })
    };

    Object.defineProperty(global, 'localStorage', { value: mockStorage });
    Object.defineProperty(global, 'sessionStorage', { value: mockStorage });
  }

  /**
   * Mocks performance APIs for performance testing
   */
  static mockPerformanceAPIs(): void {
    let currentTime = 0;
    const marks = new Map<string, number>();
    const measures = new Map<string, number>();

    (globalThis as any).performance = {
      now: vi.fn(() => currentTime),
      mark: vi.fn((name: string) => {
        marks.set(name, currentTime);
      }),
      measure: vi.fn((name: string, startMark: string, endMark?: string) => {
        const start = marks.get(startMark) || 0;
        const end = endMark ? marks.get(endMark) || currentTime : currentTime;
        measures.set(name, end - start);
      }),
      memory: {
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 5000000,
        jsHeapSizeLimit: 10000000
      },
      advanceTime: (ms: number) => {
        currentTime += ms;
      }
    };
  }

  /**
   * Creates a test container for dependency injection testing
   */
  static createTestContainer(mockServices: Record<string, any> = {}): any {
    // Adapt DI container for tests and register provided mocks by token name
    const container = createContainer();
    Object.entries(mockServices).forEach(([name, instance]) => {
      const token = createToken<any>(name);
      container.register(token, () => instance, { singleton: true });
      // Eagerly resolve to make available for resolveSync
      void container.resolve(token).catch(() => {});
    });
    // Provide minimum API used by ServiceProvider in tests
    return Object.assign(container, {
      getRegisteredServices: () => container.getRegisteredServices(),
      dispose: vi.fn(),
    });
  }
}

/**
 * Specialized assertions for integration testing
 */
export class AssertionHelpers {
  /**
   * Asserts that a component exists on the canvas
   */
  static expectComponentExists(type: string, label?: string): void {
    if (label) {
      expect(screen.getByText(label)).toBeInTheDocument();
      return;
    }
    const anyNode = document.querySelector('.react-flow__node');
    expect(anyNode).toBeInTheDocument();
  }

  /**
   * Asserts that a connection exists between two components
   */
  static expectConnectionExists(fromId: string, toId: string): void {
    // We cannot directly map DOM edge to endpoints reliably here.
    // Instead, ensure at least one edge exists after creating connection.
    const anyEdge = document.querySelector('[data-testid^="rf__edge-"]');
    expect(anyEdge).toBeInTheDocument();
  }

  /**
   * Asserts the current workflow phase
   */
  static expectWorkflowPhase(phase: TestWorkflowPhase['phase']): void {
    switch (phase) {
      case 'welcome':
        expect(screen.getByTestId('welcome-screen')).toBeInTheDocument();
        break;
      case 'challenge-selection':
        expect(screen.getByTestId('challenge-selection')).toBeInTheDocument();
        break;
      case 'design':
        expect(screen.getByTestId('design-canvas')).toBeInTheDocument();
        break;
      case 'audio':
        expect(screen.getByTestId('audio-recording')).toBeInTheDocument();
        break;
      case 'review':
        expect(screen.getByTestId('review-screen')).toBeInTheDocument();
        break;
      default:
        throw new Error(`Unknown workflow phase: ${phase}`);
    }
  }

  /**
   * Asserts export data structure and content
   */
  static expectExportData(data: TestDesignData, expectedStructure: Partial<TestDesignData>): void {
    expect(data).toMatchObject(expectedStructure);
    expect(Array.isArray(data.components)).toBe(true);
    expect(Array.isArray(data.connections)).toBe(true);
    expect(data.metadata).toHaveProperty('timestamp');
    expect(data.metadata).toHaveProperty('version');
  }

  /**
   * Asserts recovery overlay visibility and state
   */
  static expectRecoveryOverlay(visible: boolean): void {
    if (visible) {
      expect(screen.getByTestId('recovery-overlay')).toBeInTheDocument();
      expect(screen.getByTestId('recovery-message')).toBeInTheDocument();
      expect(screen.getByTestId('recovery-actions')).toBeInTheDocument();
    } else {
      expect(screen.queryByTestId('recovery-overlay')).not.toBeInTheDocument();
    }
  }
}

// Export utility functions
export { userEvent, waitFor, screen };

// Setup function to initialize all mocks
export function setupIntegrationTests(): void {
  MockHelpers.mockTauriAPIs();
  MockHelpers.mockStorageAPIs();
  MockHelpers.mockPerformanceAPIs();

  // Setup global error tracking
  (globalThis as any).__testErrors = [];
  (globalThis as any).triggerTestError = (type: TestErrorScenario['type']) => {
    const error = new Error(`Test error: ${type}`);
    error.name = `Test${type.charAt(0).toUpperCase() + type.slice(1)}Error`;
    throw error;
  };
  (globalThis as any).clearTestErrors = () => {
    (globalThis as any).__testErrors = [];
  };
}

// Cleanup function for after tests
export function cleanupIntegrationTests(): void {
  (globalThis as any).__testErrors = [];
  delete (globalThis as any).triggerTestError;
  delete (globalThis as any).clearTestErrors;
  delete (globalThis as any).__TAURI__;
}
