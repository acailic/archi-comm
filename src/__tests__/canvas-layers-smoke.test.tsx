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
