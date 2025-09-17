import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { CanvasOrchestratorProvider, useCanvas } from '@services/canvas/CanvasOrchestrator';

const initialData = {
  components: [],
  connections: [],
  layers: [{ id: 'default', name: 'Default', visible: true, order: 0 }],
  activeTool: 'select',
  gridConfig: { visible: false, spacing: 20, snapToGrid: false },
};

function Harness() {
  const ctx = useCanvas();
  return (
    <div>
      <div data-testid='comp-count'>{ctx.components.length}</div>
      <div data-testid='conn-count'>{ctx.connections.length}</div>
      <div data-testid='first-x'>{ctx.components[0]?.x ?? ''}</div>
      <button onClick={() => ctx.addComponent({ id: 'a', type: 'server', label: 'A', x: 10, y: 10 })}>add</button>
      <button onClick={() => ctx.moveComponent('a', 20, 30)}>move</button>
      <button onClick={() => ctx.addConnection({ id: 'c1', from: 'a', to: 'a', type: 'http', direction: 'end', label: '' })}>conn</button>
    </div>
  );
}

describe('Canvas services integration', () => {
  it('coordinates actions across services', async () => {
    const { getByText, getByTestId } = render(
      <CanvasOrchestratorProvider initialData={initialData as any}>
        <Harness />
      </CanvasOrchestratorProvider>
    );
 
    getByText('add').click();
    getByText('move').click();
    getByText('conn').click();
    expect(getByTestId('comp-count').textContent).toBe('1');
    expect(getByTestId('conn-count').textContent).toBe('1');
    expect(getByTestId('first-x').textContent).toBe('20');
  });
});
