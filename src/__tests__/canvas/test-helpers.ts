import { vi, expect, type MockInstance } from 'vitest';
import { act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { resetTestStores } from '../../test/react-testing-utils';
import type { DesignComponent, Connection, ConnectionType } from '../../shared/contracts';

type ConsoleWarnMock = MockInstance<typeof console.warn>;

const DEFAULT_COMPONENT_TYPES = [
  'server',
  'database',
  'api-gateway',
  'cache',
  'client',
  'load-balancer',
];

const CONNECTION_TYPE_SEQUENCE: ConnectionType[] = ['data', 'control', 'sync', 'async'];

export function createTestComponent(
  id: string,
  type: string,
  overrides: Partial<DesignComponent> = {},
): DesignComponent {
  const component: DesignComponent = {
    id,
    type,
    x: 100,
    y: 100,
    label: '',
    description: '',
    properties: {},
    ...overrides,
  };

  return component;
}

export function createTestConnection(
  id: string,
  from: string,
  to: string,
  type: ConnectionType = 'data',
  overrides: Partial<Connection> = {},
): Connection {
  const connection: Connection = {
    id,
    from,
    to,
    label: '',
    type,
    ...overrides,
  };

  return connection;
}

export function generateComponents(count: number, typePattern: string[] = DEFAULT_COMPONENT_TYPES): DesignComponent[] {
  return Array.from({ length: count }, (_, index) =>
    createTestComponent(
      `component-${index + 1}`,
      typePattern[index % typePattern.length],
      {
        x: Math.floor(Math.random() * 2000),
        y: Math.floor(Math.random() * 2000),
        properties: {
          name: `Component ${index + 1}`,
          description: `Generated component ${index + 1}`,
        } as Record<string, unknown>,
      },
    ),
  );
}

export function generateConnections(components: DesignComponent[], count: number): Connection[] {
  if (components.length < 2) {
    return [];
  }

  return Array.from({ length: count }, (_, index) => {
    const source = components[index % components.length];
    const target = components[(index + 1) % components.length];
    const type = CONNECTION_TYPE_SEQUENCE[index % CONNECTION_TYPE_SEQUENCE.length];

    return createTestConnection(`connection-${index + 1}`, source.id, target.id, type);
  });
}

export function mockConsoleWarn(): { spy: ConsoleWarnMock; restore: () => void } {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

  return {
    spy,
    restore: () => {
      spy.mockRestore();
    },
  };
}

export function withConsoleMock<T>(fn: () => T): T {
  const { restore } = mockConsoleWarn();

  try {
    return fn();
  } finally {
    restore();
  }
}

export function expectButtonActive(
  button: HTMLElement,
  options: { activeClass?: string } = {},
): void {
  expect(button).toHaveAttribute('aria-pressed', 'true');

  if (options.activeClass) {
    expect(button).toHaveClass(options.activeClass);
    return;
  }

  const className = button.className;
  expect(className).toMatch(/(bg-blue-500|ring-blue-500)/);
}

export function expectButtonInactive(
  button: HTMLElement,
  options: { inactiveClass?: string } = {},
): void {
  expect(button).toHaveAttribute('aria-pressed', 'false');

  if (options.inactiveClass) {
    expect(button).toHaveClass(options.inactiveClass);
    return;
  }

  expect(button).toHaveClass('bg-white');
}

export function expectButtonAccessible(button: HTMLElement, expectedLabel: string | RegExp, expectedTitle?: string): void {
  expect(button).toBeEnabled();

  const ariaLabel = button.getAttribute('aria-label') ?? '';
  if (expectedLabel instanceof RegExp) {
    expect(ariaLabel).toMatch(expectedLabel);
  } else {
    expect(ariaLabel).toBe(expectedLabel);
  }

  if (expectedTitle) {
    expect(button).toHaveAttribute('title', expectedTitle);
  }
}

export function setupCanvasStore(
  components: DesignComponent[] = [],
  connections: Connection[] = [],
): void {
  resetTestStores();

  act(() => {
    useCanvasStore.setState({
      components,
      connections,
    });
  });
}

export function getStoreSnapshot(): {
  components: DesignComponent[];
  connections: Connection[];
  canvasMode: ReturnType<typeof useCanvasStore.getState>['canvasMode'];
  updateVersion: ReturnType<typeof useCanvasStore.getState>['updateVersion'];
  lastUpdatedAt: ReturnType<typeof useCanvasStore.getState>['lastUpdatedAt'];
} {
  const state = useCanvasStore.getState();

  return {
    components: state.components,
    connections: state.connections,
    canvasMode: state.canvasMode,
    updateVersion: state.updateVersion,
    lastUpdatedAt: state.lastUpdatedAt,
  };
}

export function measureTime(fn: () => void): number {
  const start = performance.now();
  fn();
  const end = performance.now();

  return end - start;
}

export function expectWithinBudget(duration: number, budget: number, label = 'Operation'): void {
  if (duration > budget * 1.5) {
    console.warn(`[Performance Warning] ${label} exceeded budget by more than 50% (${duration.toFixed(2)}ms > ${budget}ms)`);
  }

  expect(duration).toBeLessThanOrEqual(budget);
}

export function testModeToggle(modeName: string, modeValue: string): {
  name: string;
  mode: string;
  label: RegExp;
} {
  return {
    name: modeName,
    mode: modeValue,
    label: new RegExp(modeName.replace(/-/g, ' '), 'i'),
  };
}

export function testToolButton(toolName: string, toolValue: string): {
  name: string;
  tool: string;
  ariaLabel: string;
  color: string;
} {
  return {
    name: toolName,
    tool: toolValue,
    ariaLabel: `${toolName} tool`,
    color: `bg-${toolName}-200`,
  };
}
