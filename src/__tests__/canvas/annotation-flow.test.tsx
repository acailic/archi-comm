import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CanvasAnnotationOverlay } from '@/packages/ui/components/overlays/CanvasAnnotationOverlay';
import { AnnotationLayer } from '@/packages/canvas/components/AnnotationLayer';
import type { Annotation } from '@/shared/contracts';

const baseAnnotation: Annotation = {
  id: 'ann-1',
  type: 'comment',
  content: 'New comment',
  x: 120,
  y: 220,
  width: 200,
  height: 120,
  timestamp: Date.now(),
  author: 'Tester',
  resolved: false,
  visible: true,
  style: {},
};

describe('CanvasAnnotationOverlay', () => {
  it('creates a new annotation when clicking with an active tool', () => {
    const createSpy = vi.fn();
    const selectSpy = vi.fn();
    const projectPointer = vi.fn(() => ({ x: 160, y: 260 }));

    const { getByTestId } = render(
      <CanvasAnnotationOverlay
        annotations={[]}
        selectedTool="comment"
        isActive
        viewportZoom={1}
        projectPointer={projectPointer}
        onAnnotationCreate={createSpy}
        onAnnotationSelect={selectSpy}
      />,
    );

    fireEvent.click(getByTestId('annotation-overlay'));

    expect(projectPointer).toHaveBeenCalled();
    expect(createSpy).toHaveBeenCalledTimes(1);

    const created = createSpy.mock.calls[0][0] as Annotation;
    expect(created.type).toBe('comment');
    expect(created.x).toBe(160);
    expect(created.y).toBe(260);
    expect(selectSpy).toHaveBeenCalledWith(created.id);
  });

  it('selects an existing annotation when clicking inside its bounds', () => {
    const selectSpy = vi.fn();
    const createSpy = vi.fn();

    const annotations = [
      {
        ...baseAnnotation,
        width: 240,
        height: 160,
      },
    ];

    const { getByTestId } = render(
      <CanvasAnnotationOverlay
        annotations={annotations}
        selectedTool="note"
        isActive
        viewportZoom={1}
        projectPointer={() => ({ x: 150, y: 250 })}
        onAnnotationCreate={createSpy}
        onAnnotationSelect={selectSpy}
      />,
    );

    fireEvent.click(getByTestId('annotation-overlay'));

    expect(createSpy).not.toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalledWith('ann-1');
  });
});

describe('AnnotationLayer', () => {
  it('renders annotation content and highlights the selected marker', () => {
    const annotations: Annotation[] = [
      baseAnnotation,
      {
        ...baseAnnotation,
        id: 'ann-2',
        type: 'label',
        content: 'Label annotation',
        x: 320,
        y: 160,
        width: 140,
        height: 48,
      },
    ];

    const { getByText } = render(
      <AnnotationLayer
        annotations={annotations}
        viewport={{ x: 0, y: 0, zoom: 1 }}
        selectedAnnotationId="ann-2"
        highlightedAnnotationId="ann-1"
        onSelect={vi.fn()}
      />,
    );

    expect(getByText('New comment')).toBeInTheDocument();
    expect(getByText('Label annotation')).toBeInTheDocument();
  });
});
