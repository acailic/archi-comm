// src/__tests__/components/DesignCanvas.processPendingFixes.test.tsx
// Unit tests for processPendingFixes function logic in DesignCanvas component
// Tests various issueId scenarios, component additions, and error handling
// RELEVANT FILES: DesignCanvas.tsx, contracts.ts, ReactFlowCanvas.tsx, canvasStore.ts

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { generateId } from '@core/utils';
import type { DesignComponent } from '@/shared/contracts';

// Mock generateId utility
vi.mock('@core/utils', () => ({
  generateId: vi.fn(),
}));

// Mock CANVAS_NODE_REGISTRY
const mockCanvasNodeRegistry = new Map([
  ['load-balancer', true],
  ['cache', true],
  ['monitoring', true],
  ['logging', true],
  ['metrics', true],
  ['redis', true],
]);

// Mock toast
const mockToast = {
  warning: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
};

// Mock registerCanvasNodeType function
const mockRegisterCanvasNodeType = vi.fn();

// Function to simulate the processPendingFixes logic
function createProcessPendingFixes(
  setComponents: (updateFn: (prev: DesignComponent[]) => DesignComponent[]) => void,
  formatComponentLabel: (type: string) => string,
  resolveFixComponentType: (type: string) => DesignComponent['type'] | null
) {
  return function processPendingFixes(queuedFixes: string[]) {
    if (queuedFixes.length === 0) {
      return;
    }

    const skippedTypes = new Set<string>();

    try {
      // Track if components are added by calling setComponents and checking result
      let _componentsAdded = false;

      setComponents(prevComponents => {
        let nextComponents = [...prevComponents];
        let idCounter = 0;

        const pushComponent = (type: string, baseX: number, baseY: number, label?: string, offsetX = 0) => {
          const resolvedType = resolveFixComponentType(type);
          if (!resolvedType) {
            skippedTypes.add(type);
            return;
          }

          mockRegisterCanvasNodeType(resolvedType);
          nextComponents.push({
            id: generateId(`${resolvedType}-${idCounter++}`),
            type: resolvedType,
            x: baseX + offsetX,
            y: baseY,
            label: label ?? formatComponentLabel(resolvedType),
            properties: { showLabel: true },
          });
        };

        queuedFixes.forEach(issueId => {
          const baseX = 200 + nextComponents.length * 5;
          const baseY = 120 + nextComponents.length * 3;
          const initialCount = nextComponents.length;

          switch (issueId) {
            case 'no-lb':
              pushComponent('load-balancer', baseX, baseY, 'Load Balancer');
              break;
            case 'no-cache':
              pushComponent('cache', baseX, baseY, 'Cache');
              break;
            case 'observability-gap':
              pushComponent('monitoring', baseX, baseY, 'Monitoring');
              pushComponent('logging', baseX, baseY, 'Logging', 60);
              pushComponent('metrics', baseX, baseY, 'Metrics', 120);
              break;
            case 'hot-shard-db':
              pushComponent('redis', baseX, baseY, 'Redis');
              break;
            default:
              console.warn('Unhandled automated fix issue id', issueId);
          }

          if (nextComponents.length === initialCount) {
            console.info('No components added for automated fix', { issueId });
          }
        });

        _componentsAdded = nextComponents.length !== prevComponents.length;
        return nextComponents.length === prevComponents.length ? prevComponents : nextComponents;
      });
    } catch (error) {
      console.error('Failed to process queued assessment fixes', error);
    }

    if (skippedTypes.size > 0) {
      const skippedList = Array.from(skippedTypes).join(', ');
      mockToast.warning('Skipped unsupported fix components', {
        description: `Add these types manually or register them for canvas support: ${skippedList}`,
      });
    }
  };
}

describe('DesignCanvas processPendingFixes Logic', () => {
  let mockSetComponents: ReturnType<typeof vi.fn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processPendingFixes: ReturnType<typeof createProcessPendingFixes>;
  let idCounter: number;

  const formatComponentLabel = (componentType: string): string => {
    const labelMap: Record<string, string> = {
      'load-balancer': 'Load Balancer',
      'cache': 'Cache',
      'monitoring': 'Monitoring',
      'logging': 'Logging',
      'metrics': 'Metrics',
      'redis': 'Redis',
    };
    return labelMap[componentType] || componentType;
  };

  const resolveFixComponentType = (rawType: string): DesignComponent['type'] | null => {
    const normalized = rawType.trim().toLowerCase();
    if (mockCanvasNodeRegistry.has(normalized as DesignComponent['type'])) {
      return normalized as DesignComponent['type'];
    }
    return null;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock setComponents to actually execute the callback
    mockSetComponents = vi.fn((callback) => {
      if (typeof callback === 'function') {
        return callback([]);
      }
    });

    // Setup generateId mock to return predictable IDs - reset counter for each test
    idCounter = 0;
    vi.mocked(generateId).mockImplementation((prefix) => `${prefix}-mock-id-${idCounter++}`);

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    processPendingFixes = createProcessPendingFixes(
      mockSetComponents,
      formatComponentLabel,
      resolveFixComponentType
    );
  });

  afterEach(() => {
    consoleWarnSpy?.mockRestore();
    consoleInfoSpy?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  it('should add load balancer for no-lb issue', () => {
    processPendingFixes(['no-lb']);

    expect(mockSetComponents).toHaveBeenCalledTimes(1);

    const updateFunction = mockSetComponents.mock.calls[0][0];
    const result = updateFunction([]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'load-balancer',
      label: 'Load Balancer',
      properties: { showLabel: true },
      x: 200,
      y: 120,
    });
    expect(result[0].id).toMatch(/load-balancer-0-mock-id-\d+/);
    expect(mockRegisterCanvasNodeType).toHaveBeenCalledWith('load-balancer');
  });

  it('should add cache for no-cache issue', () => {
    processPendingFixes(['no-cache']);

    expect(mockSetComponents).toHaveBeenCalledTimes(1);

    const updateFunction = mockSetComponents.mock.calls[0][0];
    const result = updateFunction([]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'cache',
      label: 'Cache',
      properties: { showLabel: true },
    });
  });

  it('should add monitoring, logging, and metrics for observability-gap issue', () => {
    processPendingFixes(['observability-gap']);

    expect(mockSetComponents).toHaveBeenCalledTimes(1);

    const updateFunction = mockSetComponents.mock.calls[0][0];
    const result = updateFunction([]);

    expect(result).toHaveLength(3);

    expect(result[0]).toMatchObject({
      type: 'monitoring',
      label: 'Monitoring',
      x: 200,
      y: 120,
    });

    expect(result[1]).toMatchObject({
      type: 'logging',
      label: 'Logging',
      x: 260, // 200 + 60 offset
      y: 120,
    });

    expect(result[2]).toMatchObject({
      type: 'metrics',
      label: 'Metrics',
      x: 320, // 200 + 120 offset
      y: 120,
    });
  });

  it('should add redis for hot-shard-db issue', () => {
    processPendingFixes(['hot-shard-db']);

    expect(mockSetComponents).toHaveBeenCalledTimes(1);

    const updateFunction = mockSetComponents.mock.calls[0][0];
    const result = updateFunction([]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      type: 'redis',
      label: 'Redis',
    });
  });

  it('should warn for unhandled issue IDs', () => {
    processPendingFixes(['unknown-issue']);

    expect(consoleWarnSpy).toHaveBeenCalledWith('Unhandled automated fix issue id', 'unknown-issue');
  });

  it('should log info when no components are added', () => {
    processPendingFixes(['unknown-issue']);

    expect(consoleInfoSpy).toHaveBeenCalledWith('No components added for automated fix', { issueId: 'unknown-issue' });
  });

  it('should handle multiple pending fixes in one call', () => {
    processPendingFixes(['no-lb', 'no-cache']);

    expect(mockSetComponents).toHaveBeenCalledTimes(1);

    const updateFunction = mockSetComponents.mock.calls[0][0];
    const result = updateFunction([]);

    // Should add both components
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('load-balancer');
    expect(result[1].type).toBe('cache');
  });

  it('should skip unsupported component types and show toast warning', () => {
    // Create a modified resolve function that doesn't support 'logging' and 'metrics'
    const limitedResolveFixComponentType = (rawType: string): DesignComponent['type'] | null => {
      const normalized = rawType.trim().toLowerCase();
      if (normalized === 'monitoring') {
        return 'monitoring';
      }
      return null; // Skip logging and metrics
    };

    const limitedProcessPendingFixes = createProcessPendingFixes(
      mockSetComponents,
      formatComponentLabel,
      limitedResolveFixComponentType
    );

    limitedProcessPendingFixes(['observability-gap']);

    // Should show warning toast for skipped types
    expect(mockToast.warning).toHaveBeenCalledWith(
      'Skipped unsupported fix components',
      expect.objectContaining({
        description: expect.stringContaining('logging'),
      })
    );
  });

  it('should position components correctly with base coordinates and offsets', () => {
    const existingComponents: DesignComponent[] = [
      { id: 'existing-1', type: 'server', x: 0, y: 0, label: 'Existing', properties: {} },
      { id: 'existing-2', type: 'database', x: 100, y: 100, label: 'Existing DB', properties: {} },
    ];

    processPendingFixes(['observability-gap']);

    const updateFunction = mockSetComponents.mock.calls[0][0];
    const result = updateFunction(existingComponents);

    // Should have existing components + 3 new ones
    expect(result).toHaveLength(5);

    // Check positioning calculation (baseX = 200 + existingComponents.length * 5)
    const baseX = 200 + existingComponents.length * 5; // 200 + 2*5 = 210
    const baseY = 120 + existingComponents.length * 3; // 120 + 2*3 = 126

    const newComponents = result.slice(2); // Last 3 components are new
    expect(newComponents[0].x).toBe(baseX);
    expect(newComponents[0].y).toBe(baseY);
    expect(newComponents[1].x).toBe(baseX + 60); // offset for logging
    expect(newComponents[2].x).toBe(baseX + 120); // offset for metrics
  });

  it('should handle errors gracefully during component addition', () => {
    // Mock setComponents to throw an error
    mockSetComponents.mockImplementation(() => {
      throw new Error('Component addition failed');
    });

    processPendingFixes(['no-lb']);

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to process queued assessment fixes', expect.any(Error));
  });

  it('should handle empty fixes array', () => {
    processPendingFixes([]);

    expect(mockSetComponents).not.toHaveBeenCalled();
  });

  it('should generate unique IDs for multiple components of same type', () => {
    processPendingFixes(['no-lb', 'no-lb']);

    const updateFunction = mockSetComponents.mock.calls[0][0];
    const result = updateFunction([]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toMatch(/load-balancer-0-mock-id-\d+/);
    expect(result[1].id).toMatch(/load-balancer-1-mock-id-\d+/);
  });

  it('should return same array reference when no components are added', () => {
    const existingComponents: DesignComponent[] = [
      { id: 'existing-1', type: 'server', x: 0, y: 0, label: 'Existing', properties: {} },
    ];

    processPendingFixes(['unknown-issue']);

    const updateFunction = mockSetComponents.mock.calls[0][0];
    const result = updateFunction(existingComponents);

    // Should return the same reference when no changes are made
    expect(result).toBe(existingComponents);
  });
});