// src/__tests__/integration/canvas-empty-state.test.tsx
// Integration scenario covering empty canvas delight UX and first component celebration
// RELEVANT FILES: src/packages/ui/components/DesignCanvas/components/CanvasContent.tsx, src/lib/events/appEvents.ts, src/stores/canvasStore.ts

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import React from 'react';

const dispatchAppEventMock = vi.fn();
const recordViewportChangeMock = vi.fn();

vi.mock('@/lib/events/appEvents', async () => {
  const actual = await vi.importActual<typeof import('@/lib/events/appEvents')>('@/lib/events/appEvents');
  return {
    ...actual,
    dispatchAppEvent: dispatchAppEventMock,
  };
});

vi.mock('@canvas/hooks/useCanvasPerformance', () => ({
  useCanvasPerformance: () => ({
    recordViewportChange: recordViewportChangeMock,
  }),
}));

vi.mock('@ui/components/overlays/CanvasAnnotationOverlay', () => ({
  CanvasAnnotationOverlay: () => null,
}));

vi.mock('@ui/components/canvas/UnifiedToolbar', () => ({
  UnifiedToolbar: () => <div data-testid="unified-toolbar" />,
}));

vi.mock('@ui/components/canvas/AnnotationSidebar', () => ({
  AnnotationSidebar: () => null,
}));

vi.mock('@ui/components/modals/AnnotationEditDialog', () => ({
  AnnotationEditDialog: () => null,
}));

vi.mock('@ui/components/canvas/AlignmentToolbar', () => ({
  AlignmentToolbar: () => null,
}));

vi.mock('@ui/components/canvas/SelectionBox', () => ({
  SelectionBox: () => null,
}));

vi.mock('@ui/components/canvas/AlignmentGuides', () => ({
  AlignmentGuides: () => null,
}));

vi.mock('@ui/components/canvas/ComponentGroupOverlay', () => ({
  ComponentGroupOverlay: () => null,
}));

vi.mock('@ui/components/canvas/LayerPanel', () => ({
  LayerPanel: () => null,
}));

vi.mock('@ui/components/canvas/DrawingOverlay', () => ({
  DrawingOverlay: () => null,
}));

vi.mock('@ui/components/canvas/DrawingToolbar', () => ({
  DrawingToolbar: () => null,
}));

vi.mock('@ui/components/canvas/ModeIndicator', () => ({
  ModeIndicator: () => null,
}));

vi.mock('@canvas/components/AnnotationLayer', () => ({
  AnnotationLayer: () => null,
}));

vi.mock('@lib/events/shortcutBus', () => {
  const unsubscribe = vi.fn();
  return {
    shortcutBus: {
      on: vi.fn(() => unsubscribe),
      emit: vi.fn(),
      clear: vi.fn(),
    },
  };
});

vi.mock('@ui/components/canvas/QuickAddOverlay', () => {
  return {
    __esModule: true,
    default: ({ active, onAddComponent, onRequestClose }: any) =>
      active ? (
        <div data-testid="quick-add-overlay">
          <button onClick={() => onAddComponent?.('api-gateway')}>Add Mock Component</button>
          <button onClick={onRequestClose}>Close Quick Add</button>
        </div>
      ) : null,
  };
});

import { APP_EVENT } from '@/lib/events/appEvents';
import { CanvasContent } from '@/packages/ui/components/DesignCanvas/components/CanvasContent';
import { useCanvasStore, canvasActions } from '@/stores/canvasStore';

const createCanvasProps = () => ({
  components: [],
  connections: [],
  onComponentSelect: vi.fn(),
  onComponentDeselect: vi.fn(),
  onComponentDrop: vi.fn(),
  onComponentPositionChange: vi.fn(),
  onComponentDelete: vi.fn(),
  onConnectionCreate: vi.fn(),
  onConnectionDelete: vi.fn(),
  onConnectionSelect: vi.fn(),
});

describe('CanvasContent empty canvas delight experience', () => {
  beforeEach(() => {
    dispatchAppEventMock.mockClear();
    recordViewportChangeMock.mockClear();
    canvasActions.resetCanvas();
    useCanvasStore.setState(
      {
        tourCompleted: true,
        components: [],
      },
      false,
    );
    (window as any).__ARCHICOMM_CONFETTI = vi.fn();
    (window as any).__ARCHICOMM_TOAST = vi.fn();
  });

  afterEach(() => {
    delete (window as any).__ARCHICOMM_CONFETTI;
    delete (window as any).__ARCHICOMM_TOAST;
  });

  it('displays empty state prompts, opens quick add, and celebrates the first component', async () => {
    const canvasProps = createCanvasProps();
    render(<CanvasContent canvasProps={canvasProps as any} />);

    expect(screen.getByText('Your next big idea starts here')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Browse Templates' }));
    expect(dispatchAppEventMock).toHaveBeenCalledWith(APP_EVENT.SHOW_PATTERN_LIBRARY, undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Quick Add' }));
    expect(screen.getByTestId('quick-add-overlay')).toBeInTheDocument();
    expect(screen.queryByText('Your next big idea starts here')).not.toBeInTheDocument();

    act(() => {
      canvasActions.setComponents([
        {
          id: 'comp-1',
          type: 'service',
          label: 'Gateway',
          description: 'API gateway',
          x: 200,
          y: 120,
          width: 200,
          height: 120,
          properties: {},
        },
      ]);
    });

    await waitFor(() =>
      expect(dispatchAppEventMock).toHaveBeenCalledWith(
        APP_EVENT.CANVAS_FIRST_COMPONENT_ADDED,
        { componentId: 'comp-1' },
      ),
    );

    expect((window as any).__ARCHICOMM_CONFETTI).toHaveBeenCalled();
    expect((window as any).__ARCHICOMM_TOAST).toHaveBeenCalledWith('success', 'Great start! 🎉');
  });
});
