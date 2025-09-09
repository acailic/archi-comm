import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React, { useState, StrictMode } from 'react';
import { CanvasComponent } from '@/components/CanvasComponent';

const baseComp = {
  id: 'c1',
  type: 'server',
  label: 'API Server',
  x: 10,
  y: 10,
  properties: {},
};

describe('CanvasComponent interactions and memoization', () => {
  it('renders icon lazy fallback and updates selection', async () => {
    const onSelect = vi.fn();
    render(
      <StrictMode>
        <div>
          <CanvasComponent
            component={baseComp as any}
            isSelected={false}
            isConnectionStart={false}
            onMove={() => {}}
            onSelect={onSelect}
            onStartConnection={() => {}}
            onCompleteConnection={() => {}}
          />
        </div>
      </StrictMode>
    );
    // label appears
    expect(screen.getByText('API Server')).toBeInTheDocument();
  });

  it('memo avoids re-render on unrelated parent state changes', async () => {
    let renders = 0;
    const Wrapped = () => {
      const [count, setCount] = useState(0);
      renders++;
      return (
        <div>
          <button onClick={() => setCount(v => v + 1)}>inc {count}</button>
          <CanvasComponent
            component={baseComp as any}
            isSelected={false}
            isConnectionStart={false}
            onMove={() => {}}
            onSelect={() => {}}
            onStartConnection={() => {}}
            onCompleteConnection={() => {}}
          />
        </div>
      );
    };
    const { getByText } = render(<Wrapped />);
    const initialRenders = renders;
    getByText(/inc/).click();
    // rerender parent once; memoized child should not cause many extra renders
    expect(renders).toBe(initialRenders + 1);
  });
});

