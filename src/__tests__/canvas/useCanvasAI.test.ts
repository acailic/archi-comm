import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasAI } from '@/packages/canvas/hooks/useCanvasAI';
import { useCanvasStore } from '@/stores/canvasStore';
import type { CanvasAIInstructionResponse } from '@/shared/contracts';

vi.mock('@/lib/services/CanvasAIService', () => {
  const executeInstruction = vi.fn();
  const generateDiagramFromText = vi.fn();
  const getDesignSuggestions = vi.fn();
  const analyzeDesign = vi.fn();

  return {
    canvasAIService: {
      executeInstruction,
      generateDiagramFromText,
      getDesignSuggestions,
      analyzeDesign,
    },
  };
});

import { canvasAIService } from '@/lib/services/CanvasAIService';

const mockedCanvasAIService = vi.mocked(canvasAIService, true);

describe('useCanvasAI', () => {
  beforeEach(() => {
    mockedCanvasAIService.executeInstruction.mockReset();
    mockedCanvasAIService.generateDiagramFromText.mockReset();
    mockedCanvasAIService.getDesignSuggestions.mockReset();
    mockedCanvasAIService.analyzeDesign.mockReset();

    useCanvasStore.setState({
      components: [],
      connections: [],
      selectedComponentIds: [],
    });
  });

  it('applies AI instruction actions to the canvas store', async () => {
    const mockInstruction: CanvasAIInstructionResponse = {
      actions: [
        {
          type: 'add_component',
          component: { id: 'user', label: 'User', type: 'actor', x: 100, y: 140 },
        },
        {
          type: 'add_component',
          component: { id: 'api', label: 'API Gateway', type: 'service', x: 340, y: 140 },
        },
        {
          type: 'add_connection',
          connection: { from: 'user', to: 'api', type: 'sync', label: 'requests' },
        },
      ],
      warnings: [],
      createdAt: Date.now(),
    };

    mockedCanvasAIService.executeInstruction.mockResolvedValue(mockInstruction);

    const { result } = renderHook(() => useCanvasAI());

    let instruction: CanvasAIInstructionResponse | null = null;
    await act(async () => {
      instruction = await result.current.runInstruction('Add a user calling the API');
    });

    expect(mockedCanvasAIService.executeInstruction).toHaveBeenCalledTimes(1);
    expect(instruction).not.toBeNull();

    let applyResult;
    act(() => {
      applyResult = result.current.applyInstruction(instruction);
    });

    expect(applyResult.success).toBe(true);
    const state = useCanvasStore.getState();
    expect(state.components).toHaveLength(2);
    expect(state.connections).toHaveLength(1);

    const userComponent = state.components.find(component => component.label === 'User');
    const apiComponent = state.components.find(component => component.label === 'API Gateway');
    expect(userComponent).toBeDefined();
    expect(apiComponent).toBeDefined();

    const [connection] = state.connections;
    expect(connection.from).toBe(userComponent?.id);
    expect(connection.to).toBe(apiComponent?.id);
  });
});
