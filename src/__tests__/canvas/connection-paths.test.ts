import { describe, expect, it } from 'vitest';

import { getConnectionPath } from '@/packages/canvas/utils/connection-paths';
import type { Connection, DesignComponent } from '@/shared/contracts';

const createComponent = (id: string, x: number, y: number): DesignComponent => ({
  id,
  type: 'service',
  x,
  y,
  label: id,
  properties: {},
});

const createConnection = (from: string, to: string): Connection => ({
  id: `${from}-${to}`,
  from,
  to,
  label: `${from} to ${to}`,
  type: 'data',
  direction: 'end',
});

const extractStraightPathPoints = (path: string | null) => {
  expect(path).toBeDefined();
  const match = path!.match(/^M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)$/);
  expect(match).not.toBeNull();
  const [, startX, startY, endX, endY] = match!;
  return {
    startX: Number(startX),
    startY: Number(startY),
    endX: Number(endX),
    endY: Number(endY),
  };
};

describe('connection-paths', () => {
  it('prefers horizontal handles when the target is to the right', () => {
    const source = createComponent('a', 0, 0);
    const target = createComponent('b', 400, 0);
    const connection = createConnection('a', 'b');

    const points = extractStraightPathPoints(
      getConnectionPath(connection, [source, target], 'straight')
    );

    expect(points.startX).toBeCloseTo(220);
    expect(points.startY).toBeCloseTo(70);
    expect(points.endX).toBeCloseTo(400);
    expect(points.endY).toBeCloseTo(70);
  });

  it('prefers horizontal handles when the target is to the left', () => {
    const source = createComponent('a', 400, 0);
    const target = createComponent('b', 0, 0);
    const connection = createConnection('a', 'b');

    const points = extractStraightPathPoints(
      getConnectionPath(connection, [source, target], 'straight')
    );

    expect(points.startX).toBeCloseTo(400);
    expect(points.startY).toBeCloseTo(70);
    expect(points.endX).toBeCloseTo(220);
    expect(points.endY).toBeCloseTo(70);
  });

  it('prefers vertical handles when the target is below', () => {
    const source = createComponent('a', 0, 0);
    const target = createComponent('b', 0, 400);
    const connection = createConnection('a', 'b');

    const points = extractStraightPathPoints(
      getConnectionPath(connection, [source, target], 'straight')
    );

    expect(points.startX).toBeCloseTo(110);
    expect(points.startY).toBeCloseTo(140);
    expect(points.endX).toBeCloseTo(110);
    expect(points.endY).toBeCloseTo(400);
  });

  it('prefers vertical handles when the target is above', () => {
    const source = createComponent('a', 0, 400);
    const target = createComponent('b', 0, 0);
    const connection = createConnection('a', 'b');

    const points = extractStraightPathPoints(
      getConnectionPath(connection, [source, target], 'straight')
    );

    expect(points.startX).toBeCloseTo(110);
    expect(points.startY).toBeCloseTo(400);
    expect(points.endX).toBeCloseTo(110);
    expect(points.endY).toBeCloseTo(140);
  });
});
