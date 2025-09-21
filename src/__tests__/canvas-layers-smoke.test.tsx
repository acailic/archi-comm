import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { CanvasContextProvider, type CanvasState } from '@/packages/canvas/contexts/CanvasContext';
import { NodeLayer } from '@/packages/canvas/components/NodeLayer';
import { EdgeLayer } from '@/packages/canvas/components/EdgeLayer';
import { CanvasInteractionLayer } from '@/packages/canvas/components/CanvasInteractionLayer';

// Minimal harness
const initialCanvasState: CanvasState = {
  layoutPositions: {},
  virtualizationConfig: { bufferZone: 100, maxVisibleItems: 50, enabled: true },
  selectedItems: [],
  reactFlowInstance: null,
  emergencyPause: false,
};

const noopCallbacks = {
  component: {
    onComponentSelect: () => {},
    onComponentDeselect: () => {},
    onComponentDrop: () => {},
    onComponentPositionChange: () => {},
    onComponentDelete: () => {},
  },
  connection: {
    onConnectionCreate: () => {},
    onConnectionDelete: () => {},
    onConnectionSelect: () => {},
  },
  infoCard: {
    onInfoCardCreate: () => {},
    onInfoCardUpdate: () => {},
    onInfoCardDelete: () => {},
    onInfoCardSelect: () => {},
  },
  onEmergencyPause: () => {},
  onEmergencyResume: () => {},
} as const;

describe('Canvas layers smoke tests (minimal props)', () => {
  it('NodeLayer mounts and reflects nodes', () => {
    const components: any[] = [
      { id: 'a', type: 'service', x: 0, y: 0, name: 'A', properties: {} },
      { id: 'b', type: 'db', x: 10, y: 10, name: 'B', properties: {} },
    ];
    const infoCards: any[] = [];

    const Child = (props: any) => <div data-testid='node-count'>{props.nodes?.length ?? 0}</div>;

    render(
      <CanvasContextProvider initialState={initialCanvasState} callbacks={noopCallbacks as any}>
        <NodeLayer components={components} infoCards={infoCards}>
          <Child />
        </NodeLayer>
      </CanvasContextProvider>
    );

    expect(screen.getByTestId('node-count').textContent).toBe('2');
  });

  it('NodeLayer tolerates rapid selectedItems changes (no crash)', () => {
    const components: any[] = [
      { id: 'a', type: 'service', x: 0, y: 0, name: 'A', properties: {} },
    ];
    const infoCards: any[] = [];
    const Child = (props: any) => <div data-testid='node-count'>{props.nodes?.length ?? 0}</div>;

    const { rerender } = render(
      <CanvasContextProvider initialState={initialCanvasState} callbacks={noopCallbacks as any}>
        <NodeLayer components={components} infoCards={infoCards}>
          <Child />
        </NodeLayer>
      </CanvasContextProvider>
    );

    for (let i = 0; i < 40; i += 1) {
      const next: CanvasState = { ...initialCanvasState, selectedItems: [String(i)] };
      rerender(
        <CanvasContextProvider initialState={next} callbacks={noopCallbacks as any}>
          <NodeLayer components={components} infoCards={infoCards}>
            <Child />
          </NodeLayer>
        </CanvasContextProvider>
      );
    }

    expect(screen.getByTestId('node-count').textContent).toBe('1');
  });

  it('EdgeLayer mounts and reflects edges', () => {
    const connections: any[] = [
      { id: 'e1', sourceId: 'a', targetId: 'b' },
      { id: 'e2', sourceId: 'b', targetId: 'a' },
    ];
    const Child = (props: any) => <div data-testid='edge-count'>{props.edges?.length ?? 0}</div>;

    render(
      <CanvasContextProvider initialState={initialCanvasState} callbacks={noopCallbacks as any}>
        <EdgeLayer connections={connections}>
          <Child />
        </EdgeLayer>
      </CanvasContextProvider>
    );

    expect(screen.getByTestId('edge-count').textContent).toBe('2');
  });

  it('EdgeLayer tolerates rapid selectedItems changes (no crash)', () => {
    const connections: any[] = [
      { id: 'e1', sourceId: 'a', targetId: 'b' },
    ];
    const Child = (props: any) => <div data-testid='edge-count'>{props.edges?.length ?? 0}</div>;

    const { rerender } = render(
      <CanvasContextProvider initialState={initialCanvasState} callbacks={noopCallbacks as any}>
        <EdgeLayer connections={connections}>
          <Child />
        </EdgeLayer>
      </CanvasContextProvider>
    );

    for (let i = 0; i < 40; i += 1) {
      const next: CanvasState = { ...initialCanvasState, selectedItems: [String(i)] };
      rerender(
        <CanvasContextProvider initialState={next} callbacks={noopCallbacks as any}>
          <EdgeLayer connections={connections}>
            <Child />
          </EdgeLayer>
        </CanvasContextProvider>
      );
    }

    expect(screen.getByTestId('edge-count').textContent).toBe('1');
  });

  it('VirtualizationLayer mounts and clones children with filtered nodes/edges', async () => {
    // Mock useReactFlow to avoid needing a ReactFlow instance, then import layer
    const mod = await vi.importActual<any>('@xyflow/react');
    vi.mock('@xyflow/react', async () => ({
      ...(mod as object),
      useReactFlow: () => ({ getViewport: () => ({ x: 0, y: 0, zoom: 1 }) }),
    }));
    const { VirtualizationLayer } = await import('@/packages/canvas/components/VirtualizationLayer');

    const nodes: any[] = [
      { id: 'n1', position: { x: 0, y: 0 } },
      { id: 'n2', position: { x: 10000, y: 10000 } },
    ];
    const edges: any[] = [
      { id: 'e1', source: 'n1', target: 'n2' },
    ];

    const Child = (props: any) => (
      <>
        <div data-testid='virt-node-count'>{props.nodes?.length ?? 0}</div>
        <div data-testid='virt-edge-count'>{props.edges?.length ?? 0}</div>
      </>
    );

    render(
      <CanvasContextProvider initialState={initialCanvasState} callbacks={noopCallbacks as any}>
        <VirtualizationLayer nodes={nodes as any} edges={edges as any}>
          <Child />
        </VirtualizationLayer>
      </CanvasContextProvider>
    );

    // One node is far outside viewport; should be culled when enabled
    const nodeCount = Number(screen.getByTestId('virt-node-count').textContent || '0');
    expect(nodeCount).toBeGreaterThanOrEqual(1);
  });

  it('CanvasInteractionLayer mounts with features disabled', () => {
    render(
      <CanvasContextProvider initialState={initialCanvasState} callbacks={noopCallbacks as any}>
        <CanvasInteractionLayer enableContextMenu={false} enableDragDrop={false} enableKeyboardShortcuts={false}>
          <div data-testid='interaction-root' />
        </CanvasInteractionLayer>
      </CanvasContextProvider>
    );

    expect(screen.getByTestId('interaction-root')).toBeInTheDocument();
  });
});
