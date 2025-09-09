import { describe, it, expect, vi } from 'vitest';
import {
  calculateComponentBounds,
  getVisibleComponents,
  isComponentInViewport,
  snapToGrid,
  type ViewportInfo,
} from '@/shared/canvasUtils';

type Comp = { id: string; x: number; y: number; width?: number; height?: number };

function makeComp(id: string, x: number, y: number, w = 220, h = 140): Comp {
  return { id, x, y, width: w, height: h };
}

describe('canvasUtils - viewport helpers', () => {
  const viewport: ViewportInfo = { x: 0, y: 0, width: 1000, height: 800 } as any;

  it('calculateComponentBounds provides defaults and matches props', () => {
    const c = { x: 10, y: 20 } as any;
    const b = calculateComponentBounds(c);
    expect(b).toEqual({ x: 10, y: 20, width: 220, height: 140 });

    const c2 = { x: 0, y: 0, width: 10, height: 10 } as any;
    const b2 = calculateComponentBounds(c2);
    expect(b2).toEqual({ x: 0, y: 0, width: 10, height: 10 });
  });

  it('isComponentInViewport detects fully inside, outside, and edges', () => {
    const inside = makeComp('a', 100, 100);
    const outside = makeComp('b', 2000, 2000);
    const touchingEdge = makeComp('c', 1000 - 220, 800 - 140);

    expect(isComponentInViewport(inside, viewport)).toBe(true);
    expect(isComponentInViewport(outside, viewport)).toBe(false);
    expect(isComponentInViewport(touchingEdge, viewport)).toBe(true);
  });

  it('getVisibleComponents returns only visible', () => {
    const comps = [
      makeComp('a', 0, 0),
      makeComp('b', 900, 700),
      makeComp('c', 2000, 0),
    ];
    const visible = getVisibleComponents(comps, viewport);
    expect(visible.map(c => c.id).sort()).toEqual(['a', 'b']);
  });

  it('handles zero-sized viewport and negative coordinates', () => {
    const comps = [makeComp('a', -50, -50), makeComp('b', 10, 10)];
    expect(getVisibleComponents(comps, { x: 0, y: 0, width: 0, height: 0 } as any)).toEqual([]);
    expect(isComponentInViewport(makeComp('n', -10, -10), { x: -20, y: -20, width: 5, height: 5 } as any)).toBe(true);
  });

  it('snapToGrid aligns to spacing', () => {
    expect(snapToGrid(11, 19, 10)).toEqual({ x: 10, y: 20 });
    expect(snapToGrid(24, 24, 20)).toEqual({ x: 20, y: 20 });
  });

  it('performance: culling 1000 components completes quickly', () => {
    const big: Comp[] = Array.from({ length: 1000 }, (_, i) => makeComp(String(i), (i % 50) * 50, Math.floor(i / 50) * 30));
    const start = performance.now();
    const res = getVisibleComponents(big, viewport);
    const dur = performance.now() - start;
    expect(res.length).toBeGreaterThan(0);
    // Budget: < 1ms on typical dev boxes, allow some slack in CI
    expect(dur).toBeLessThan(5);
  });
});

