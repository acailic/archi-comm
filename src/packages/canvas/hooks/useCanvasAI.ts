/**
 * src/packages/canvas/hooks/useCanvasAI.ts
 * Hook for AI-powered canvas features including diagram generation and assistance.
 * Wires the CanvasAIService into the canvas store and normalises AI actions.
 * RELEVANT FILES: CanvasAIService.ts, AIAssistantPanel.tsx, TextToDiagramModal.tsx, canvasStore.ts
 */

import { useCallback, useState } from 'react';
import { canvasAIService, type CanvasAIDiagramRequest } from '@/lib/services/CanvasAIService';
import { newComponentId, newConnectionId } from '@/lib/utils/id';
import { useCanvasActions, useCanvasStore } from '@/stores/canvasStore';
import type {
  AIAssistantResponse,
  TextToDiagramOptions,
  AIDiagramSuggestion,
  CanvasAIInstructionRequest,
  CanvasAIInstructionResponse,
  CanvasAIInstructionContext,
  CanvasAIAction,
  CanvasAIComponentDraft,
  CanvasAIConnectionDraft,
  DesignComponent,
  Connection,
} from '@/shared/contracts';

export interface ApplyActionsResult {
  success: boolean;
  message: string;
  addedComponents: number;
  addedConnections: number;
  updatedComponents: number;
  updatedConnections: number;
  removedComponents: number;
  removedConnections: number;
  warnings: string[];
}

const DEFAULT_COMPONENT_WIDTH = 160;
const DEFAULT_COMPONENT_HEIGHT = 96;

const computeFallbackPosition = (index: number) => {
  const column = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 240 + column * 240,
    y: 180 + row * 180,
  };
};

const ensureProperties = (properties?: CanvasAIComponentDraft['properties']) => {
  if (!properties || typeof properties !== 'object') {
    return {};
  }
  return { ...properties };
};

export const useCanvasAI = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIAssistantResponse | null>(null);
  const [lastInstruction, setLastInstruction] = useState<CanvasAIInstructionResponse | null>(null);

  // Subscribe to relevant store slices to react to updates.
  useCanvasStore(state => ({
    components: state.components,
    connections: state.connections,
    selectedComponentIds: state.selectedComponentIds,
  }));

  const canvasActions = useCanvasActions();

  const buildContext = useCallback((): CanvasAIInstructionContext => {
    const state = useCanvasStore.getState();
    return {
      components: state.components,
      connections: state.connections,
      selectedComponentIds: state.selectedComponentIds,
    };
  }, []);

  const applyActions = useCallback(
    (actions: CanvasAIAction[]): ApplyActionsResult => {
      const state = useCanvasStore.getState();

      const componentMap = new Map(
        state.components.map(component => [
          component.id,
          { ...component, properties: { ...(component.properties ?? {}) } },
        ]),
      );

      const connectionMap = new Map(
        state.connections.map(connection => [connection.id, { ...connection }]),
      );

      const aliasToRealId = new Map<string, string>();
      const deferred: Array<{ action: CanvasAIAction; index: number }> = [];
      const warnings: string[] = [];

      let addedComponents = 0;
      let addedConnections = 0;
      let updatedComponents = 0;
      let updatedConnections = 0;
      let removedComponents = 0;
      let removedConnections = 0;

      const resolveComponentId = (id?: string) => {
        if (!id) return undefined;
        return aliasToRealId.get(id) || id;
      };

      const processAction = (
        action: CanvasAIAction,
        index: number,
        isRetry = false,
      ): boolean => {
        switch (action.type) {
          case 'add_component': {
            const alias = action.component.id || `ai-component-${aliasToRealId.size + 1}`;
            const position = computeFallbackPosition(aliasToRealId.size);
            const x = typeof action.component.x === 'number' ? action.component.x : position.x;
            const y = typeof action.component.y === 'number' ? action.component.y : position.y;
            const width =
              typeof action.component.width === 'number'
                ? action.component.width
                : DEFAULT_COMPONENT_WIDTH;
            const height =
              typeof action.component.height === 'number'
                ? action.component.height
                : DEFAULT_COMPONENT_HEIGHT;

            const newId = newComponentId();
            aliasToRealId.set(alias, newId);

            const component = {
              id: newId,
              type: (action.component.type as DesignComponent['type']) || 'component',
              label: action.component.label || 'AI Component',
              x,
              y,
              width,
              height,
              properties: ensureProperties(action.component.properties),
            };

            componentMap.set(newId, component);
            addedComponents += 1;
            return true;
          }

          case 'update_component': {
            const resolvedId = resolveComponentId(action.componentId);
            if (!resolvedId || !componentMap.has(resolvedId)) {
              if (isRetry) {
                warnings.push(
                  `Unable to update component "${action.componentId}" because it was not found.`,
                );
              }
              return false;
            }

            const component = componentMap.get(resolvedId)!;
            const patch = action.patch;

            if (patch.label) component.label = patch.label;
            if (patch.type) component.type = patch.type as DesignComponent['type'];
            if (typeof patch.x === 'number') component.x = patch.x;
            if (typeof patch.y === 'number') component.y = patch.y;
            if (typeof patch.width === 'number') component.width = patch.width;
            if (typeof patch.height === 'number') component.height = patch.height;
            if (patch.properties) {
              component.properties = {
                ...component.properties,
                ...ensureProperties(patch.properties),
              };
            }

            componentMap.set(resolvedId, component);
            updatedComponents += 1;
            return true;
          }

          case 'remove_component': {
            const resolvedId = resolveComponentId(action.componentId);
            if (!resolvedId || !componentMap.has(resolvedId)) {
              if (isRetry) {
                warnings.push(
                  `Unable to remove component "${action.componentId}" because it was not found.`,
                );
              }
              return false;
            }

            componentMap.delete(resolvedId);
            removedComponents += 1;

            // Cascade delete connections that reference this component.
            Array.from(connectionMap.entries()).forEach(([connectionId, connection]) => {
              if (connection.from === resolvedId || connection.to === resolvedId) {
                connectionMap.delete(connectionId);
                removedConnections += 1;
              }
            });

            return true;
          }

          case 'add_connection': {
            const fromId = resolveComponentId(action.connection.from);
            const toId = resolveComponentId(action.connection.to);

            if (!fromId || !toId) {
              if (!isRetry) {
                return false;
              }
              warnings.push(
                `Skipping connection "${action.connection.label ?? ''}" because endpoints could not be resolved (${action.connection.from} -> ${action.connection.to}).`,
              );
              return true;
            }

            const connectionId =
              action.connection.id && !connectionMap.has(action.connection.id)
                ? action.connection.id
                : newConnectionId();

            const connection = {
              id: connectionId,
              from: fromId,
              to: toId,
              type: (action.connection.type as Connection['type']) || 'data',
              label: action.connection.label || '',
            };

            connectionMap.set(connectionId, connection);
            addedConnections += 1;
            return true;
          }

          case 'update_connection': {
            const resolvedId = action.connectionId;
            if (!resolvedId || !connectionMap.has(resolvedId)) {
              if (isRetry) {
                warnings.push(
                  `Unable to update connection "${action.connectionId}" because it was not found.`,
                );
              }
              return false;
            }

            const connection = connectionMap.get(resolvedId)!;
            const patch = action.patch;

            if (patch.label) connection.label = patch.label;
            if (patch.type) connection.type = patch.type as Connection['type'];

            if (patch.from) {
              const fromId = resolveComponentId(patch.from);
              if (fromId) connection.from = fromId;
            }
            if (patch.to) {
              const toId = resolveComponentId(patch.to);
              if (toId) connection.to = toId;
            }

            connectionMap.set(resolvedId, connection);
            updatedConnections += 1;
            return true;
          }

          case 'remove_connection': {
            if (!connectionMap.has(action.connectionId)) {
              if (isRetry) {
                warnings.push(
                  `Unable to remove connection "${action.connectionId}" because it was not found.`,
                );
              }
              return false;
            }

            connectionMap.delete(action.connectionId);
            removedConnections += 1;
            return true;
          }

          case 'annotate': {
            warnings.push(
              `Annotation "${action.message}" was not applied automatically (not yet supported).`,
            );
            return true;
          }

          default: {
            warnings.push(`Unrecognised action type "${(action as any).type}" at index ${index}.`);
            return true;
          }
        }
      };

      actions.forEach((action, index) => {
        const processed = processAction(action, index);
        if (!processed) {
          deferred.push({ action, index });
        }
      });

      if (deferred.length > 0) {
        deferred.forEach(({ action, index }) => {
          const processed = processAction(action, index, true);
          if (!processed) {
            warnings.push(
              `Skipping action of type "${action.type}" at index ${index} due to unresolved dependencies.`,
            );
          }
        });
      }

      const updatedComponentsList = Array.from(componentMap.values());
      const updatedConnectionsList = Array.from(connectionMap.values());

      canvasActions.updateCanvasData({
        components: updatedComponentsList,
        connections: updatedConnectionsList,
      });

      const summaryParts: string[] = [];
      if (addedComponents) summaryParts.push(`${addedComponents} component(s) added`);
      if (updatedComponents) summaryParts.push(`${updatedComponents} component(s) updated`);
      if (removedComponents) summaryParts.push(`${removedComponents} component(s) removed`);
      if (addedConnections) summaryParts.push(`${addedConnections} connection(s) added`);
      if (updatedConnections) summaryParts.push(`${updatedConnections} connection(s) updated`);
      if (removedConnections) summaryParts.push(`${removedConnections} connection(s) removed`);

      return {
        success: summaryParts.length > 0,
        message: summaryParts.length > 0 ? summaryParts.join(', ') : 'No changes applied',
        addedComponents,
        addedConnections,
        updatedComponents,
        updatedConnections,
        removedComponents,
        removedConnections,
        warnings,
      };
    },
    [canvasActions],
  );

  const generateDiagramFromText = useCallback(
    async (prompt: string, options: TextToDiagramOptions = {}): Promise<AIAssistantResponse> => {
      setIsGenerating(true);
      setLastResponse(null);
      setLastInstruction(null);

      try {
        const request: CanvasAIDiagramRequest = {
          prompt,
          options,
          context: buildContext(),
        };

        const response = await canvasAIService.generateDiagramFromText(request);
        setLastResponse(response);
        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to generate diagram from AI provider.';
        const failure: AIAssistantResponse = {
          success: false,
          message: 'Failed to generate diagram',
          error: message,
        };
        setLastResponse(failure);
        return failure;
      } finally {
        setIsGenerating(false);
      }
    },
    [buildContext],
  );

  const getDesignSuggestions = useCallback(async (): Promise<AIAssistantResponse> => {
    setIsGenerating(true);
    setLastResponse(null);

    try {
      const response = await canvasAIService.getDesignSuggestions(buildContext());
      setLastResponse(response);
      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to fetch AI design suggestions.';
      const failure: AIAssistantResponse = {
        success: false,
        message: 'Failed to get suggestions',
        error: message,
      };
      setLastResponse(failure);
      return failure;
    } finally {
      setIsGenerating(false);
    }
  }, [buildContext]);

  const analyzeDesign = useCallback(async (): Promise<AIAssistantResponse> => {
    setIsGenerating(true);
    setLastResponse(null);

    try {
      const response = await canvasAIService.analyzeDesign(buildContext());
      setLastResponse(response);
      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to analyse current design with AI.';
      const failure: AIAssistantResponse = {
        success: false,
        message: 'Failed to analyze design',
        error: message,
      };
      setLastResponse(failure);
      return failure;
    } finally {
      setIsGenerating(false);
    }
  }, [buildContext]);

  const applySuggestion = useCallback(
    (suggestion: AIDiagramSuggestion) => {
      const actions: CanvasAIAction[] = [
        ...suggestion.components.map(component => ({
          type: 'add_component' as const,
          component: component as CanvasAIComponentDraft,
        })),
        ...suggestion.connections.map(connection => ({
          type: 'add_connection' as const,
          connection: connection as CanvasAIConnectionDraft,
        })),
      ];

      const result = applyActions(actions);
      return {
        success: result.success,
        message: suggestion.explanation || result.message,
        warnings: result.warnings,
      };
    },
    [applyActions],
  );

  const runInstruction = useCallback(
    async (
      prompt: string,
      overrides: Partial<CanvasAIInstructionRequest> = {},
    ): Promise<CanvasAIInstructionResponse> => {
      setIsGenerating(true);
      setLastResponse(null);

      try {
        const response = await canvasAIService.executeInstruction({
          prompt,
          context: buildContext(),
          allowPartial: true,
          mode: overrides.mode ?? 'update',
          ...overrides,
        });

        setLastInstruction(response);
        setLastResponse({
          success: response.actions.length > 0,
          message:
            response.summary ||
            response.reasoning ||
            (response.actions.length > 0
              ? 'AI generated canvas updates.'
              : 'AI did not return actionable steps.'),
          error: response.actions.length === 0 ? 'No changes proposed.' : undefined,
        });
        return response;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to process instruction with AI.';
        const failure: CanvasAIInstructionResponse = {
          actions: [],
          warnings: [message],
          createdAt: Date.now(),
        };
        setLastInstruction(failure);
        setLastResponse({
          success: false,
          message: 'Failed to process AI instruction',
          error: message,
        });
        throw error instanceof Error ? error : new Error(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [buildContext],
  );

  const applyInstruction = useCallback(
    (instruction?: CanvasAIInstructionResponse | null): ApplyActionsResult => {
      if (!instruction) {
        return {
          success: false,
          message: 'No AI instruction available to apply.',
          addedComponents: 0,
          addedConnections: 0,
          updatedComponents: 0,
          updatedConnections: 0,
          removedComponents: 0,
          removedConnections: 0,
          warnings: ['No instruction found.'],
        };
      }

      const result = applyActions(instruction.actions);
      const combinedWarnings = [...(instruction.warnings ?? []), ...result.warnings];

      const merged: ApplyActionsResult = {
        ...result,
        warnings: combinedWarnings,
      };

      setLastInstruction(instruction);
      return merged;
    },
    [applyActions],
  );

  return {
    isGenerating,
    lastResponse,
    lastInstruction,
    generateDiagramFromText,
    getDesignSuggestions,
    analyzeDesign,
    applySuggestion,
    runInstruction,
    applyInstruction,
    clearLastResponse: () => setLastResponse(null),
    clearLastInstruction: () => setLastInstruction(null),
  };
};
