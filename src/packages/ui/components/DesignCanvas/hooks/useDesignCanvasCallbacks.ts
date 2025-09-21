// src/components/DesignCanvas/hooks/useDesignCanvasCallbacks.ts
// Callback handlers for DesignCanvas component
// Manages all event handlers and actions for canvas interaction
// RELEVANT FILES: DesignCanvasCore.tsx, ../@shared/contracts.ts, ../../../lib/utils.ts, useStableCallbacks.ts

import { useEffect, useRef } from 'react';

import { useStableCallback } from '@hooks/useStableCallbacks';
import { generateId } from '@core/utils';
import type { Connection, DesignComponent, InfoCard } from '@/shared/contracts';
import { useCanvasActions } from '@/stores/canvasStore';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';

// Callback execution tracking
interface CallbackExecution {
  callbackName: string;
  timestamp: number;
  executionTime: number;
  parameters: any[];
  stateAccessCount: number;
  stateChangesTriggered: string[];
  callChain: string[];
  frequency: number;
}

interface CallbackMetrics {
  totalExecutions: number;
  averageExecutionTime: number;
  maxExecutionTime: number;
  lastExecutionTime: number;
  stateAccessPatterns: Map<string, number>;
  triggeredStateChanges: Map<string, number>;
  rapidFireCount: number;
}

const callbackExecutionHistory: CallbackExecution[] = [];
const callbackMetrics = new Map<string, CallbackMetrics>();
const MAX_EXECUTION_HISTORY = 50;
const RAPID_FIRE_THRESHOLD_MS = 100;
const activeCallChain: string[] = [];

const trackCallbackExecution = (
  callbackName: string,
  parameters: any[],
  executionFn: () => any,
  stateChangesTriggered: string[] = []
): any => {
  if (!import.meta.env.DEV) {
    return executionFn();
  }

  const startTime = performance.now();
  const timestamp = Date.now();

  // Track call chain to detect callback cascades
  activeCallChain.push(callbackName);

  // Count rapid-fire executions
  const recentExecutions = callbackExecutionHistory
    .filter(execution =>
      execution.callbackName === callbackName &&
      timestamp - execution.timestamp < RAPID_FIRE_THRESHOLD_MS
    ).length;

  let result;
  try {
    result = executionFn();
  } finally {
    const executionTime = performance.now() - startTime;
    activeCallChain.pop();

    // Record execution
    const execution: CallbackExecution = {
      callbackName,
      timestamp,
      executionTime,
      parameters: parameters.map(p => {
        if (typeof p === 'object' && p !== null) {
          return Object.keys(p).length > 5 ? `{...${Object.keys(p).length} keys}` : p;
        }
        return p;
      }),
      stateAccessCount: 0, // Will be updated by store tracking
      stateChangesTriggered,
      callChain: [...activeCallChain],
      frequency: recentExecutions + 1,
    };

    callbackExecutionHistory.push(execution);
    if (callbackExecutionHistory.length > MAX_EXECUTION_HISTORY) {
      callbackExecutionHistory.shift();
    }

    // Update metrics
    const metrics = callbackMetrics.get(callbackName) || {
      totalExecutions: 0,
      averageExecutionTime: 0,
      maxExecutionTime: 0,
      lastExecutionTime: 0,
      stateAccessPatterns: new Map(),
      triggeredStateChanges: new Map(),
      rapidFireCount: 0,
    };

    metrics.totalExecutions += 1;
    metrics.averageExecutionTime =
      (metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime) / metrics.totalExecutions;
    metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime);
    metrics.lastExecutionTime = executionTime;

    if (execution.frequency > 1) {
      metrics.rapidFireCount += 1;
    }

    stateChangesTriggered.forEach(stateChange => {
      metrics.triggeredStateChanges.set(
        stateChange,
        (metrics.triggeredStateChanges.get(stateChange) || 0) + 1
      );
    });

    callbackMetrics.set(callbackName, metrics);

    // Log detailed execution info for performance analysis
    if (executionTime > 5 || execution.frequency > 3 || execution.callChain.length > 2) {
      console.debug(`[DesignCanvasCallbacks] ${callbackName} execution:`, {
        executionTime: `${executionTime.toFixed(2)}ms`,
        frequency: execution.frequency,
        parameters: execution.parameters,
        callChain: execution.callChain,
        stateChangesTriggered,
        metrics: {
          totalExecutions: metrics.totalExecutions,
          averageExecutionTime: `${metrics.averageExecutionTime.toFixed(2)}ms`,
          rapidFireCount: metrics.rapidFireCount,
        },
        issues: {
          slowExecution: executionTime > 10,
          rapidFire: execution.frequency > 3,
          deepCallChain: execution.callChain.length > 2,
          manyStateChanges: stateChangesTriggered.length > 3,
        },
      });
    }

    // Record to diagnostics
    RenderLoopDiagnostics.getInstance().record('callback-execution', {
      callbackName,
      execution,
      metrics,
    });

    // Warn about potential performance issues
    if (execution.frequency > 5) {
      console.warn(`[DesignCanvasCallbacks] Rapid-fire callback detected: ${callbackName}`, {
        frequency: execution.frequency,
        suggestion: 'Consider debouncing or throttling this callback',
        recentExecutions: callbackExecutionHistory
          .filter(e => e.callbackName === callbackName)
          .slice(-5),
      });
    }

    if (executionTime > 20) {
      console.warn(`[DesignCanvasCallbacks] Slow callback execution: ${callbackName}`, {
        executionTime: `${executionTime.toFixed(2)}ms`,
        suggestion: 'Consider optimizing this callback or using async operations',
      });
    }

    if (execution.callChain.length > 3) {
      console.warn(`[DesignCanvasCallbacks] Deep callback chain detected:`, {
        callChain: execution.callChain,
        suggestion: 'Consider refactoring to avoid callback cascades',
      });
    }
  }

  return result;
};

export function useDesignCanvasCallbacks() {
  const {
    setSelectedComponent,
    setConnectionStart,
    updateComponents,
    updateConnections,
    updateInfoCards,
  } = useCanvasActions();

  const moveRaf = useRef<number | null>(null);
  const pendingMove = useRef<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (moveRaf.current && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(moveRaf.current);
      }
      moveRaf.current = null;
      pendingMove.current = null;
    };
  }, []);

  const updateComponentIfChanged = useStableCallback(
    (id: string, projector: (component: DesignComponent) => DesignComponent) => {
      return trackCallbackExecution(
        'updateComponentIfChanged',
        [id, 'projector'],
        () => {
          updateComponents(components => {
            let mutated = false;
            const next = components.map(component => {
              if (component.id !== id) {
                return component;
              }
              const projected = projector(component);
              if (projected === component) {
                return component;
              }
              mutated = true;
              return projected;
            });
            return mutated ? next : components;
          }, { source: 'updateComponentIfChanged', context: { id } });
        },
        ['updateComponents']
      );
    }
  );

  const updateConnectionIfChanged = useStableCallback(
    (id: string, projector: (connection: Connection) => Connection) => {
      return trackCallbackExecution(
        'updateConnectionIfChanged',
        [id, 'projector'],
        () => {
          updateConnections(connections => {
            let mutated = false;
            const next = connections.map(connection => {
              if (connection.id !== id) {
                return connection;
              }
              const projected = projector(connection);
              if (projected === connection) {
                return connection;
              }
              mutated = true;
              return projected;
            });
            return mutated ? next : connections;
          }, { source: 'updateConnectionIfChanged', context: { id } });
        },
        ['updateConnections']
      );
    }
  );

  const updateInfoCardIfChanged = useStableCallback(
    (id: string, projector: (infoCard: InfoCard) => InfoCard) => {
      return trackCallbackExecution(
        'updateInfoCardIfChanged',
        [id, 'projector'],
        () => {
          updateInfoCards(infoCards => {
            let mutated = false;
            const next = infoCards.map(card => {
              if (card.id !== id) {
                return card;
              }
              const projected = projector(card);
              if (projected === card) {
                return card;
              }
              mutated = true;
              return projected;
            });
            return mutated ? next : infoCards;
          }, { source: 'updateInfoCardIfChanged', context: { id } });
        },
        ['updateInfoCards']
      );
    }
  );

  const handleComponentDrop = useStableCallback(
    (componentType: DesignComponent['type'], x: number, y: number) => {
      return trackCallbackExecution(
        'handleComponentDrop',
        [componentType, x, y],
        () => {
          const newComponent: DesignComponent = {
            id: generateId(componentType),
            type: componentType,
            x,
            y,
            label: '',
            properties: { showLabel: true },
          };
          updateComponents(components => [...components, newComponent], {
            source: 'handleComponentDrop',
            context: { componentType },
          });
        },
        ['updateComponents']
      );
    }
  );

  const applyMove = useStableCallback((move: { id: string; x: number; y: number }) => {
    return trackCallbackExecution(
      'applyMove',
      [move],
      () => {
        updateComponents(components => {
          let mutated = false;
          const next = components.map(component => {
            if (component.id !== move.id) {
              return component;
            }
            if (component.x === move.x && component.y === move.y) {
              return component;
            }
            mutated = true;
            return { ...component, x: move.x, y: move.y };
          });
          return mutated ? next : components;
        }, { source: 'handleComponentMove', context: { id: move.id } });
      },
      ['updateComponents']
    );
  });

  const handleComponentMove = useStableCallback((id: string, x: number, y: number) => {
    return trackCallbackExecution(
      'handleComponentMove',
      [id, x, y],
      () => {
        if (typeof requestAnimationFrame !== 'function') {
          applyMove({ id, x, y });
          return;
        }

        const existing = pendingMove.current;
        if (existing && existing.id === id && existing.x === x && existing.y === y) {
          return;
        }

        pendingMove.current = { id, x, y };
        if (moveRaf.current) {
          return;
        }

        moveRaf.current = requestAnimationFrame(() => {
          moveRaf.current = null;
          const pending = pendingMove.current;
          pendingMove.current = null;
          if (!pending) {
            return;
          }
          applyMove(pending);
        });
      },
      ['requestAnimationFrame', 'applyMove']
    );
  });

  const handleComponentSelect = useStableCallback((id: string | null) => {
    return trackCallbackExecution(
      'handleComponentSelect',
      [id],
      () => {
        setSelectedComponent(id, { source: 'handleComponentSelect' });
      },
      ['setSelectedComponent']
    );
  });

  const handleComponentLabelChange = useStableCallback((id: string, label: string) => {
    return trackCallbackExecution(
      'handleComponentLabelChange',
      [id, label],
      () => {
        updateComponentIfChanged(id, component =>
          component.label === label ? component : { ...component, label }
        );
      },
      ['updateComponentIfChanged']
    );
  });

  const handleConnectionLabelChange = useStableCallback((id: string, label: string) => {
    return trackCallbackExecution(
      'handleConnectionLabelChange',
      [id, label],
      () => {
        updateConnectionIfChanged(id, connection =>
          connection.label === label ? connection : { ...connection, label }
        );
      },
      ['updateConnectionIfChanged']
    );
  });

  const handleConnectionDelete = useStableCallback((id: string) => {
    return trackCallbackExecution(
      'handleConnectionDelete',
      [id],
      () => {
        updateConnections(connections => {
          const next = connections.filter(connection => connection.id !== id);
          return next.length === connections.length ? connections : next;
        }, { source: 'handleConnectionDelete', context: { id } });
      },
      ['updateConnections']
    );
  });

  const handleConnectionTypeChange = useStableCallback((id: string, type: Connection['type']) => {
    return trackCallbackExecution(
      'handleConnectionTypeChange',
      [id, type],
      () => {
        updateConnectionIfChanged(id, connection =>
          connection.type === type ? connection : { ...connection, type }
        );
      },
      ['updateConnectionIfChanged']
    );
  });

  const handleConnectionVisualStyleChange = useStableCallback(
    (id: string, visualStyle: Connection['visualStyle']) => {
      return trackCallbackExecution(
        'handleConnectionVisualStyleChange',
        [id, visualStyle],
        () => {
          updateConnectionIfChanged(id, connection =>
            connection.visualStyle === visualStyle ? connection : { ...connection, visualStyle }
          );
        },
        ['updateConnectionIfChanged']
      );
    }
  );

  const handleDeleteComponent = useStableCallback((id: string) => {
    return trackCallbackExecution(
      'handleDeleteComponent',
      [id],
      () => {
        updateComponents(components => {
          const next = components.filter(component => component.id !== id);
          return next.length === components.length ? components : next;
        }, { source: 'handleDeleteComponent', context: { id } });

        updateConnections(connections => {
          const next = connections.filter(connection => connection.from !== id && connection.to !== id);
          return next.length === connections.length ? connections : next;
        }, { source: 'handleDeleteComponent', context: { id } });

        setSelectedComponent(null, { onlyIfCurrentIs: id, source: 'handleDeleteComponent' });
      },
      ['updateComponents', 'updateConnections', 'setSelectedComponent']
    );
  });

  const handleShowLabelToggle = useStableCallback((id: string, visible: boolean) => {
    return trackCallbackExecution(
      'handleShowLabelToggle',
      [id, visible],
      () => {
        updateComponentIfChanged(id, component => {
          const current = component.properties?.showLabel ?? false;
          if (current === visible) {
            return component;
          }
          return {
            ...component,
            properties: { ...component.properties, showLabel: visible } as DesignComponent['properties'],
          };
        });
      },
      ['updateComponentIfChanged']
    );
  });

  const handleStickerToggle = useStableCallback((id: string, enabled: boolean) => {
    return trackCallbackExecution(
      'handleStickerToggle',
      [id, enabled],
      () => {
        updateComponentIfChanged(id, component => {
          const current = (component.properties as Record<string, unknown> | undefined)?.sticker;
          if (current === enabled) {
            return component;
          }
          return {
            ...component,
            properties: { ...component.properties, sticker: enabled } as DesignComponent['properties'],
          };
        });
      },
      ['updateComponentIfChanged']
    );
  });

  const handleStickerEmojiChange = useStableCallback((id: string, emoji: string) => {
    return trackCallbackExecution(
      'handleStickerEmojiChange',
      [id, emoji],
      () => {
        updateComponentIfChanged(id, component => {
          const current = (component.properties as Record<string, unknown> | undefined)?.stickerEmoji;
          if (current === emoji) {
            return component;
          }
          return {
            ...component,
            properties: { ...component.properties, stickerEmoji: emoji } as DesignComponent['properties'],
          };
        });
      },
      ['updateComponentIfChanged']
    );
  });

  const handleBgColorChange = useStableCallback((id: string, color: string) => {
    return trackCallbackExecution(
      'handleBgColorChange',
      [id, color],
      () => {
        updateComponentIfChanged(id, component => {
          const current = (component.properties as Record<string, unknown> | undefined)?.bgHex;
          if (current === color) {
            return component;
          }
          return {
            ...component,
            properties: { ...component.properties, bgHex: color } as DesignComponent['properties'],
          };
        });
      },
      ['updateComponentIfChanged']
    );
  });

  const handleNodeBgChange = useStableCallback((id: string, color: string) => {
    return trackCallbackExecution(
      'handleNodeBgChange',
      [id, color],
      () => {
        updateComponentIfChanged(id, component => {
          const current = (component.properties as Record<string, unknown> | undefined)?.bodyBgHex;
          if (current === color) {
            return component;
          }
          return {
            ...component,
            properties: { ...component.properties, bodyBgHex: color } as DesignComponent['properties'],
          };
        });
      },
      ['updateComponentIfChanged']
    );
  });

  const handleInfoCardAdd = useStableCallback((x: number, y: number) => {
    return trackCallbackExecution(
      'handleInfoCardAdd',
      [x, y],
      () => {
        const newInfoCard: InfoCard = {
          id: generateId('info-card'),
          x,
          y,
          content: '',
          color: 'yellow',
          isEditing: true,
        };
        updateInfoCards(infoCards => [...infoCards, newInfoCard], {
          source: 'handleInfoCardAdd',
        });
      },
      ['updateInfoCards']
    );
  });

  const handleInfoCardUpdate = useStableCallback((id: string, content: string) => {
    return trackCallbackExecution(
      'handleInfoCardUpdate',
      [id, content],
      () => {
        updateInfoCardIfChanged(id, card => {
          if (card.content === content && card.isEditing === false) {
            return card;
          }
          return { ...card, content, isEditing: false };
        });
      },
      ['updateInfoCardIfChanged']
    );
  });

  const handleInfoCardDelete = useStableCallback((id: string) => {
    return trackCallbackExecution(
      'handleInfoCardDelete',
      [id],
      () => {
        updateInfoCards(infoCards => {
          const next = infoCards.filter(card => card.id !== id);
          return next.length === infoCards.length ? infoCards : next;
        }, { source: 'handleInfoCardDelete', context: { id } });
      },
      ['updateInfoCards']
    );
  });

  const handleInfoCardColorChange = useStableCallback((id: string, color: string) => {
    return trackCallbackExecution(
      'handleInfoCardColorChange',
      [id, color],
      () => {
        updateInfoCardIfChanged(id, card =>
          card.color === color ? card : { ...card, color: color as InfoCard['color'] }
        );
      },
      ['updateInfoCardIfChanged']
    );
  });

  const handleStartConnection = useStableCallback((id: string) => {
    return trackCallbackExecution(
      'handleStartConnection',
      [id],
      () => {
        setConnectionStart(id, { source: 'handleStartConnection' });
      },
      ['setConnectionStart']
    );
  });

  const handleCompleteConnection = useStableCallback((fromId: string, toId: string) => {
    return trackCallbackExecution(
      'handleCompleteConnection',
      [fromId, toId],
      () => {
        if (fromId !== toId) {
          updateConnections(connections => {
            const exists = connections.some(connection => connection.from === fromId && connection.to === toId);
            if (exists) {
              return connections;
            }
            const newConnection: Connection = {
              id: generateId('connection'),
              from: fromId,
              to: toId,
              label: 'Connection',
              type: 'data',
            };
            return [...connections, newConnection];
          }, { source: 'handleCompleteConnection', context: { fromId, toId } });
        }

        setConnectionStart(null, { onlyIfCurrentIs: fromId, source: 'handleCompleteConnection' });
      },
      ['updateConnections', 'setConnectionStart']
    );
  });

  // Callback metrics tracking for development
  useEffect(() => {
    if (import.meta.env.DEV) {
      const interval = setInterval(() => {
        const metricsReport = {
          totalCallbacks: callbackMetrics.size,
          callbackMetrics: Object.fromEntries(
            Array.from(callbackMetrics.entries()).map(([name, metrics]) => [
              name,
              {
                totalExecutions: metrics.totalExecutions,
                averageExecutionTime: `${metrics.averageExecutionTime.toFixed(2)}ms`,
                maxExecutionTime: `${metrics.maxExecutionTime.toFixed(2)}ms`,
                rapidFireCount: metrics.rapidFireCount,
                rapidFirePercentage: ((metrics.rapidFireCount / metrics.totalExecutions) * 100).toFixed(1) + '%',
                triggeredStateChanges: Object.fromEntries(metrics.triggeredStateChanges),
              }
            ])
          ),
          recentExecutions: callbackExecutionHistory.slice(-10),
          performanceIssues: {
            slowCallbacks: Array.from(callbackMetrics.entries())
              .filter(([, metrics]) => metrics.averageExecutionTime > 10)
              .map(([name]) => name),
            rapidFireCallbacks: Array.from(callbackMetrics.entries())
              .filter(([, metrics]) => (metrics.rapidFireCount / metrics.totalExecutions) > 0.3)
              .map(([name]) => name),
          },
        };

        if (metricsReport.performanceIssues.slowCallbacks.length > 0 ||
            metricsReport.performanceIssues.rapidFireCallbacks.length > 0) {
          console.debug('[DesignCanvasCallbacks] Periodic metrics report:', metricsReport);
        }
      }, 30000); // Report every 30 seconds

      return () => clearInterval(interval);
    }
  }, []);

  const callbacks = {
    handleComponentDrop,
    handleComponentMove,
    handleComponentSelect,
    handleComponentLabelChange,
    handleConnectionLabelChange,
    handleConnectionDelete,
    handleConnectionTypeChange,
    handleConnectionVisualStyleChange,
    handleDeleteComponent,
    handleShowLabelToggle,
    handleStickerToggle,
    handleStickerEmojiChange,
    handleBgColorChange,
    handleNodeBgChange,
    handleInfoCardAdd,
    handleInfoCardUpdate,
    handleInfoCardDelete,
    handleInfoCardColorChange,
    handleStartConnection,
    handleCompleteConnection,
  };

  // Add debug methods in development
  if (import.meta.env.DEV) {
    (callbacks as any).getCallbackMetrics = () => callbackMetrics;
    (callbacks as any).getExecutionHistory = () => callbackExecutionHistory;
    (callbacks as any).getCallbackAnalysis = () => ({
      metrics: Object.fromEntries(callbackMetrics),
      recentExecutions: callbackExecutionHistory.slice(-20),
      performanceAnalysis: {
        slowCallbacks: Array.from(callbackMetrics.entries())
          .filter(([, metrics]) => metrics.averageExecutionTime > 5)
          .sort(([, a], [, b]) => b.averageExecutionTime - a.averageExecutionTime),
        frequentCallbacks: Array.from(callbackMetrics.entries())
          .sort(([, a], [, b]) => b.totalExecutions - a.totalExecutions)
          .slice(0, 5),
        rapidFireCallbacks: Array.from(callbackMetrics.entries())
          .filter(([, metrics]) => metrics.rapidFireCount > 0)
          .sort(([, a], [, b]) => b.rapidFireCount - a.rapidFireCount),
      },
    });
  }

  return callbacks;
}
