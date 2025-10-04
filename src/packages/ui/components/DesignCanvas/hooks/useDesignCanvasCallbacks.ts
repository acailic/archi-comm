// src/components/DesignCanvas/hooks/useDesignCanvasCallbacks.ts
// Callback handlers for DesignCanvas component
// Manages all event handlers and actions for canvas interaction
// RELEVANT FILES: DesignCanvasCore.tsx, ../@shared/contracts.ts, ../../../lib/utils.ts, useStableCallbacks.ts

import { useEffect, useRef } from "react";

import { applyPreset, presetsRegistry } from "@/lib/canvas/component-presets";
import { RenderLoopDiagnostics } from "@/lib/debug/RenderLoopDiagnostics";
import { componentTypes } from "@/packages/ui/components/panels/ComponentPalette";
import type {
  Connection,
  DesignComponent,
  DrawingStroke,
  DrawingTool,
  InfoCard,
} from "@/shared/contracts";
import {
  useCanvasActions,
  useCanvasComponents,
  useCanvasConnections,
  useCanvasSelectedComponent,
} from "@/stores/canvasStore";
import { generateId } from "@core/utils";
import { useStableCallback } from "@hooks/useStableCallbacks";
type ComponentPaletteEntry = (typeof componentTypes)[number];

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 140;
const SELECTION_OFFSET = { x: 150, y: 50 };
const RECENT_PRESETS_STORAGE_KEY = "archicomm:recent-presets";
const RECENT_COMPONENT_STORAGE_KEY = "archicomm:last-component-type";
const TOAST_EVENT = "archicomm:toast";

type ToastVariant = "default" | "success" | "info" | "warning" | "destructive";

interface ToastPayload {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

type AddComponentEventDetail = {
  componentType: DesignComponent["type"];
  position?: { x: number; y: number };
  coordinateSpace?: "screen" | "canvas";
  metadata?: Partial<
    Pick<DesignComponent, "label" | "description" | "properties">
  >;
};

type AddPresetEventDetail = {
  presetId: string;
  position?: { x: number; y: number };
  coordinateSpace?: "screen" | "canvas";
};

const COMPONENT_METADATA_MAP = new Map<string, ComponentPaletteEntry>(
  componentTypes.map((entry) => [entry.type, entry]),
);

const formatComponentLabel = (value: string): string =>
  value
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const emitToast = (payload: ToastPayload) => {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: payload }));
};

const updateRecentPresetUsage = (presetId: string) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const existing = window.localStorage.getItem(RECENT_PRESETS_STORAGE_KEY);
    const parsed: string[] = existing ? JSON.parse(existing) : [];
    const next = [presetId, ...parsed.filter((id) => id !== presetId)].slice(
      0,
      8,
    );
    window.localStorage.setItem(
      RECENT_PRESETS_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch (error) {
    console.warn(
      "[DesignCanvasCallbacks] Failed to persist preset usage",
      error,
    );
  }
};

const updateLastUsedComponent = (componentType: string) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(RECENT_COMPONENT_STORAGE_KEY, componentType);
  } catch (error) {
    console.warn(
      "[DesignCanvasCallbacks] Failed to persist last component",
      error,
    );
  }
};

const componentsOverlap = (
  existing: DesignComponent[],
  incoming: DesignComponent[],
): boolean => {
  return incoming.some((candidate) =>
    existing.some((current) => {
      const deltaX = Math.abs(current.x - candidate.x);
      const deltaY = Math.abs(current.y - candidate.y);
      return deltaX < DEFAULT_NODE_WIDTH && deltaY < DEFAULT_NODE_HEIGHT;
    }),
  );
};

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
  stateChangesTriggered: string[] = [],
): any => {
  if (!import.meta.env.DEV) {
    return executionFn();
  }

  const startTime = performance.now();
  const timestamp = Date.now();

  // Track call chain to detect callback cascades
  activeCallChain.push(callbackName);

  // Count rapid-fire executions
  const recentExecutions = callbackExecutionHistory.filter(
    (execution) =>
      execution.callbackName === callbackName &&
      timestamp - execution.timestamp < RAPID_FIRE_THRESHOLD_MS,
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
      parameters: parameters.map((p) => {
        if (typeof p === "object" && p !== null) {
          return Object.keys(p).length > 5
            ? `{...${Object.keys(p).length} keys}`
            : p;
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
      (metrics.averageExecutionTime * (metrics.totalExecutions - 1) +
        executionTime) /
      metrics.totalExecutions;
    metrics.maxExecutionTime = Math.max(
      metrics.maxExecutionTime,
      executionTime,
    );
    metrics.lastExecutionTime = executionTime;

    if (execution.frequency > 1) {
      metrics.rapidFireCount += 1;
    }

    stateChangesTriggered.forEach((stateChange) => {
      metrics.triggeredStateChanges.set(
        stateChange,
        (metrics.triggeredStateChanges.get(stateChange) || 0) + 1,
      );
    });

    callbackMetrics.set(callbackName, metrics);

    // Log detailed execution info for performance analysis
    if (
      executionTime > 5 ||
      execution.frequency > 3 ||
      execution.callChain.length > 2
    ) {
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
    RenderLoopDiagnostics.getInstance().record("callback-execution", {
      callbackName,
      execution,
      metrics,
    });

    // Warn about potential performance issues
    if (execution.frequency > 5) {
      console.warn(
        `[DesignCanvasCallbacks] Rapid-fire callback detected: ${callbackName}`,
        {
          frequency: execution.frequency,
          suggestion: "Consider debouncing or throttling this callback",
          recentExecutions: callbackExecutionHistory
            .filter((e) => e.callbackName === callbackName)
            .slice(-5),
        },
      );
    }

    if (executionTime > 20) {
      console.warn(
        `[DesignCanvasCallbacks] Slow callback execution: ${callbackName}`,
        {
          executionTime: `${executionTime.toFixed(2)}ms`,
          suggestion:
            "Consider optimizing this callback or using async operations",
        },
      );
    }

    if (execution.callChain.length > 3) {
      console.warn(`[DesignCanvasCallbacks] Deep callback chain detected:`, {
        callChain: execution.callChain,
        suggestion: "Consider refactoring to avoid callback cascades",
      });
    }
  }

  return result;
};

export function useDesignCanvasCallbacks() {
  // Get stable actions - these are frozen and never change
  // Store in a ref to prevent re-renders from destructuring
  const actionsRef = useRef(useCanvasActions());
  const actions = actionsRef.current;

  // Use Zustand store selectors instead of canvas context
  const selectedComponent = useCanvasSelectedComponent();
  const selectedItems = selectedComponent ? [selectedComponent] : [];
  // TODO: reactFlowInstance should be passed as prop or retrieved differently
  const reactFlowInstance = null; // Temporary fallback
  const components = useCanvasComponents();
  const connections = useCanvasConnections();

  const componentsRef = useRef(components);
  const connectionsRef = useRef(connections);
  const selectedItemsRef = useRef(selectedItems);

  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  const moveRaf = useRef<number | null>(null);
  const pendingMove = useRef<{ id: string; x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (moveRaf.current && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(moveRaf.current);
      }
      moveRaf.current = null;
      pendingMove.current = null;
    };
  }, []);

  const updateComponentIfChanged = useStableCallback(
    (
      id: string,
      projector: (component: DesignComponent) => DesignComponent,
    ) => {
      return trackCallbackExecution(
        "updateComponentIfChanged",
        [id, "projector"],
        () => {
          actions.updateComponents(
            (components) => {
              let mutated = false;
              const next = components.map((component) => {
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
            },
            { source: "updateComponentIfChanged", context: { id } },
          );
        },
        ["updateComponents"],
      );
    },
  );

  const updateConnectionIfChanged = useStableCallback(
    (id: string, projector: (connection: Connection) => Connection) => {
      return trackCallbackExecution(
        "updateConnectionIfChanged",
        [id, "projector"],
        () => {
          actions.updateConnections(
            (connections) => {
              let mutated = false;
              const next = connections.map((connection) => {
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
            },
            { source: "updateConnectionIfChanged", context: { id } },
          );
        },
        ["updateConnections"],
      );
    },
  );

  const updateInfoCardIfChanged = useStableCallback(
    (id: string, projector: (infoCard: InfoCard) => InfoCard) => {
      return trackCallbackExecution(
        "updateInfoCardIfChanged",
        [id, "projector"],
        () => {
          actions.updateInfoCards(
            (infoCards) => {
              let mutated = false;
              const next = infoCards.map((card) => {
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
            },
            { source: "updateInfoCardIfChanged", context: { id } },
          );
        },
        ["updateInfoCards"],
      );
    },
  );

  const handleComponentDrop = useStableCallback(
    (
      componentType: DesignComponent["type"],
      x: number,
      y: number,
      options?: {
        id?: string;
        label?: string;
        description?: string;
        properties?: DesignComponent["properties"];
        width?: number;
        height?: number;
        extra?: Partial<DesignComponent>;
      },
    ) => {
      return trackCallbackExecution(
        "handleComponentDrop",
        [componentType, x, y, options ? "options" : ""],
        () => {
          const properties = options?.properties
            ? ({
                showLabel: true,
                ...options.properties,
              } as DesignComponent["properties"])
            : ({ showLabel: true } as DesignComponent["properties"]);

          const componentRecord = {
            id: options?.id ?? generateId(componentType),
            type: componentType,
            x,
            y,
            label: options?.label ?? "",
            description: options?.description,
            properties,
            ...(options?.extra ?? {}),
          } as DesignComponent & Record<string, unknown>;

          if (options?.width !== undefined) {
            componentRecord.width = options.width;
          }
          if (options?.height !== undefined) {
            componentRecord.height = options.height;
          }

          actions.updateComponents(
            (components) => [...components, componentRecord as DesignComponent],
            {
              source: "handleComponentDrop",
              context: { componentType },
            },
          );
        },
        ["updateComponents"],
      );
    },
  );

  const applyMove = useStableCallback(
    (move: { id: string; x: number; y: number }) => {
      return trackCallbackExecution(
        "applyMove",
        [move],
        () => {
          actions.updateComponents(
            (components) => {
              let mutated = false;
              const next = components.map((component) => {
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
            },
            { source: "handleComponentMove", context: { id: move.id } },
          );
        },
        ["updateComponents"],
      );
    },
  );

  const handleComponentMove = useStableCallback(
    (id: string, x: number, y: number) => {
      return trackCallbackExecution(
        "handleComponentMove",
        [id, x, y],
        () => {
          if (typeof requestAnimationFrame !== "function") {
            applyMove({ id, x, y });
            return;
          }

          const existing = pendingMove.current;
          if (
            existing &&
            existing.id === id &&
            existing.x === x &&
            existing.y === y
          ) {
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
        ["requestAnimationFrame", "applyMove"],
      );
    },
  );

  const handleComponentSelect = useStableCallback((id: string | null) => {
    return trackCallbackExecution(
      "handleComponentSelect",
      [id],
      () => {
        actions.setSelectedComponent(id, { source: "handleComponentSelect" });
      },
      ["setSelectedComponent"],
    );
  });

  const handleComponentLabelChange = useStableCallback(
    (id: string, label: string) => {
      return trackCallbackExecution(
        "handleComponentLabelChange",
        [id, label],
        () => {
          updateComponentIfChanged(id, (component) =>
            component.label === label ? component : { ...component, label },
          );
        },
        ["updateComponentIfChanged"],
      );
    },
  );

  const handleConnectionLabelChange = useStableCallback(
    (id: string, label: string) => {
      return trackCallbackExecution(
        "handleConnectionLabelChange",
        [id, label],
        () => {
          updateConnectionIfChanged(id, (connection) =>
            connection.label === label ? connection : { ...connection, label },
          );
        },
        ["updateConnectionIfChanged"],
      );
    },
  );

  const handleConnectionDelete = useStableCallback((id: string) => {
    return trackCallbackExecution(
      "handleConnectionDelete",
      [id],
      () => {
        actions.updateConnections(
          (connections) => {
            const next = connections.filter(
              (connection) => connection.id !== id,
            );
            return next.length === connections.length ? connections : next;
          },
          { source: "handleConnectionDelete", context: { id } },
        );
      },
      ["updateConnections"],
    );
  });

  const handleConnectionTypeChange = useStableCallback(
    (id: string, type: Connection["type"]) => {
      return trackCallbackExecution(
        "handleConnectionTypeChange",
        [id, type],
        () => {
          updateConnectionIfChanged(id, (connection) =>
            connection.type === type ? connection : { ...connection, type },
          );
        },
        ["updateConnectionIfChanged"],
      );
    },
  );

  const handleConnectionVisualStyleChange = useStableCallback(
    (id: string, visualStyle: Connection["visualStyle"]) => {
      return trackCallbackExecution(
        "handleConnectionVisualStyleChange",
        [id, visualStyle],
        () => {
          updateConnectionIfChanged(id, (connection) =>
            connection.visualStyle === visualStyle
              ? connection
              : { ...connection, visualStyle },
          );
        },
        ["updateConnectionIfChanged"],
      );
    },
  );

  const handleDeleteComponent = useStableCallback((id: string) => {
    return trackCallbackExecution(
      "handleDeleteComponent",
      [id],
      () => {
        actions.updateComponents(
          (components) => {
            const next = components.filter((component) => component.id !== id);
            return next.length === components.length ? components : next;
          },
          { source: "handleDeleteComponent", context: { id } },
        );

        actions.updateConnections(
          (connections) => {
            const next = connections.filter(
              (connection) => connection.from !== id && connection.to !== id,
            );
            return next.length === connections.length ? connections : next;
          },
          { source: "handleDeleteComponent", context: { id } },
        );

        actions.setSelectedComponent(null, {
          onlyIfCurrentIs: id,
          source: "handleDeleteComponent",
        });
      },
      ["updateComponents", "updateConnections", "setSelectedComponent"],
    );
  });

  const handleDuplicateComponent = useStableCallback((id: string) => {
    return trackCallbackExecution(
      "handleDuplicateComponent",
      [id],
      () => {
        actions.updateComponents(
          (components) => {
            const sourceComponent = components.find(
              (component) => component.id === id,
            );
            if (!sourceComponent) {
              return components;
            }

            // Clone the component with a new id and offset position
            const newComponent: DesignComponent = {
              ...sourceComponent,
              id: generateId(sourceComponent.type),
              x: sourceComponent.x + 50,
              y: sourceComponent.y + 50,
            };

            // Add the new component and select it
            actions.setSelectedComponent(newComponent.id, {
              source: "handleDuplicateComponent",
            });

            return [...components, newComponent];
          },
          { source: "handleDuplicateComponent", context: { id } },
        );
      },
      ["updateComponents", "setSelectedComponent"],
    );
  });

  const handleShowLabelToggle = useStableCallback(
    (id: string, visible: boolean) => {
      return trackCallbackExecution(
        "handleShowLabelToggle",
        [id, visible],
        () => {
          updateComponentIfChanged(id, (component) => {
            const current = component.properties?.showLabel ?? false;
            if (current === visible) {
              return component;
            }
            return {
              ...component,
              properties: {
                ...component.properties,
                showLabel: visible,
              } as DesignComponent["properties"],
            };
          });
        },
        ["updateComponentIfChanged"],
      );
    },
  );

  const handleStickerToggle = useStableCallback(
    (id: string, enabled: boolean) => {
      return trackCallbackExecution(
        "handleStickerToggle",
        [id, enabled],
        () => {
          updateComponentIfChanged(id, (component) => {
            const current = (
              component.properties as Record<string, unknown> | undefined
            )?.sticker;
            if (current === enabled) {
              return component;
            }
            return {
              ...component,
              properties: {
                ...component.properties,
                sticker: enabled,
              } as DesignComponent["properties"],
            };
          });
        },
        ["updateComponentIfChanged"],
      );
    },
  );

  const handleStickerEmojiChange = useStableCallback(
    (id: string, emoji: string) => {
      return trackCallbackExecution(
        "handleStickerEmojiChange",
        [id, emoji],
        () => {
          updateComponentIfChanged(id, (component) => {
            const current = (
              component.properties as Record<string, unknown> | undefined
            )?.stickerEmoji;
            if (current === emoji) {
              return component;
            }
            return {
              ...component,
              properties: {
                ...component.properties,
                stickerEmoji: emoji,
              } as DesignComponent["properties"],
            };
          });
        },
        ["updateComponentIfChanged"],
      );
    },
  );

  const handleBgColorChange = useStableCallback((id: string, color: string) => {
    return trackCallbackExecution(
      "handleBgColorChange",
      [id, color],
      () => {
        updateComponentIfChanged(id, (component) => {
          const current = (
            component.properties as Record<string, unknown> | undefined
          )?.bgHex;
          if (current === color) {
            return component;
          }
          return {
            ...component,
            properties: {
              ...component.properties,
              bgHex: color,
            } as DesignComponent["properties"],
          };
        });
      },
      ["updateComponentIfChanged"],
    );
  });

  const handleNodeBgChange = useStableCallback((id: string, color: string) => {
    return trackCallbackExecution(
      "handleNodeBgChange",
      [id, color],
      () => {
        updateComponentIfChanged(id, (component) => {
          const current = (
            component.properties as Record<string, unknown> | undefined
          )?.bodyBgHex;
          if (current === color) {
            return component;
          }
          return {
            ...component,
            properties: {
              ...component.properties,
              bodyBgHex: color,
            } as DesignComponent["properties"],
          };
        });
      },
      ["updateComponentIfChanged"],
    );
  });

  const handleInfoCardAdd = useStableCallback((x: number, y: number) => {
    return trackCallbackExecution(
      "handleInfoCardAdd",
      [x, y],
      () => {
        const newInfoCard: InfoCard = {
          id: generateId("info-card"),
          x,
          y,
          content: "",
          color: "yellow",
          isEditing: true,
        };
        actions.updateInfoCards((infoCards) => [...infoCards, newInfoCard], {
          source: "handleInfoCardAdd",
        });
      },
      ["updateInfoCards"],
    );
  });

  const handleInfoCardUpdate = useStableCallback(
    (id: string, content: string) => {
      return trackCallbackExecution(
        "handleInfoCardUpdate",
        [id, content],
        () => {
          updateInfoCardIfChanged(id, (card) => {
            if (card.content === content && card.isEditing === false) {
              return card;
            }
            return { ...card, content, isEditing: false };
          });
        },
        ["updateInfoCardIfChanged"],
      );
    },
  );

  const handleInfoCardDelete = useStableCallback((id: string) => {
    return trackCallbackExecution(
      "handleInfoCardDelete",
      [id],
      () => {
        updateInfoCards(
          (infoCards) => {
            const next = infoCards.filter((card) => card.id !== id);
            return next.length === infoCards.length ? infoCards : next;
          },
          { source: "handleInfoCardDelete", context: { id } },
        );
      },
      ["updateInfoCards"],
    );
  });

  const handleInfoCardColorChange = useStableCallback(
    (id: string, color: string) => {
      return trackCallbackExecution(
        "handleInfoCardColorChange",
        [id, color],
        () => {
          updateInfoCardIfChanged(id, (card) =>
            card.color === color
              ? card
              : { ...card, color: color as InfoCard["color"] },
          );
        },
        ["updateInfoCardIfChanged"],
      );
    },
  );

  const handleStartConnection = useStableCallback((id: string) => {
    return trackCallbackExecution(
      "handleStartConnection",
      [id],
      () => {
        actions.setConnectionStart(id, { source: "handleStartConnection" });
      },
      ["setConnectionStart"],
    );
  });

  const handleCompleteConnection = useStableCallback(
    (fromId: string, toId: string) => {
      return trackCallbackExecution(
        "handleCompleteConnection",
        [fromId, toId],
        () => {
          if (fromId !== toId) {
            actions.updateConnections(
              (connections) => {
                const exists = connections.some(
                  (connection) =>
                    connection.from === fromId && connection.to === toId,
                );
                if (exists) {
                  return connections;
                }
                const newConnection: Connection = {
                  id: generateId("connection"),
                  from: fromId,
                  to: toId,
                  label: "Connection",
                  type: "data",
                  properties: {
                    arrowEnd: true, // Arrow at the end by default
                    arrowStart: false, // No arrow at start by default
                  },
                };
                return [...connections, newConnection];
              },
              { source: "handleCompleteConnection", context: { fromId, toId } },
            );
          }

          actions.setConnectionStart(null, {
            onlyIfCurrentIs: fromId,
            source: "handleCompleteConnection",
          });
        },
        ["updateConnections", "setConnectionStart"],
      );
    },
  );

  // Callback metrics tracking for development
  useEffect((): (() => void) | undefined => {
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
                rapidFirePercentage:
                  (
                    (metrics.rapidFireCount / metrics.totalExecutions) *
                    100
                  ).toFixed(1) + "%",
                triggeredStateChanges: Object.fromEntries(
                  metrics.triggeredStateChanges,
                ),
              },
            ]),
          ),
          recentExecutions: callbackExecutionHistory.slice(-10),
          performanceIssues: {
            slowCallbacks: Array.from(callbackMetrics.entries())
              .filter(([, metrics]) => metrics.averageExecutionTime > 10)
              .map(([name]) => name),
            rapidFireCallbacks: Array.from(callbackMetrics.entries())
              .filter(
                ([, metrics]) =>
                  metrics.rapidFireCount / metrics.totalExecutions > 0.3,
              )
              .map(([name]) => name),
          },
        };

        if (
          metricsReport.performanceIssues.slowCallbacks.length > 0 ||
          metricsReport.performanceIssues.rapidFireCallbacks.length > 0
        ) {
          console.debug(
            "[DesignCanvasCallbacks] Periodic metrics report:",
            metricsReport,
          );
        }
      }, 30000); // Report every 30 seconds

      return () => clearInterval(interval);
    }
  }, []);

  // Event listener for programmatic component addition from command palette
  useEffect(() => {
    const handleAddComponent = (event: Event) => {
      const detail = (event as CustomEvent<AddComponentEventDetail>).detail;
      if (!detail?.componentType) {
        console.warn(
          "[DesignCanvasCallbacks] Missing componentType in add-component event detail",
        );
        return;
      }

      const metadata = COMPONENT_METADATA_MAP.get(detail.componentType);
      const label =
        detail.metadata?.label ??
        metadata?.label ??
        formatComponentLabel(detail.componentType);
      const description = detail.metadata?.description ?? metadata?.description;
      const incomingProperties = detail.metadata?.properties as
        | DesignComponent["properties"]
        | undefined;
      const properties = incomingProperties
        ? ({
            showLabel: true,
            ...incomingProperties,
          } as DesignComponent["properties"])
        : ({ showLabel: true } as DesignComponent["properties"]);

      const selectedComponent = (() => {
        const selected = selectedItemsRef.current ?? [];
        if (!selected.length) {
          return null;
        }
        const list = componentsRef.current ?? [];
        const map = new Map<string, DesignComponent>(
          list.map((component) => [component.id, component]),
        );
        for (const id of selected) {
          const component = map.get(id);
          if (component) {
            return component;
          }
        }
        return null;
      })();

      const position = (() => {
        if (selectedComponent) {
          return {
            x: selectedComponent.x + SELECTION_OFFSET.x,
            y: selectedComponent.y + SELECTION_OFFSET.y,
          };
        }

        if (detail.position) {
          if (detail.coordinateSpace === "canvas" || !reactFlowInstance) {
            return { x: detail.position.x, y: detail.position.y };
          }
          return reactFlowInstance.project(detail.position);
        }

        const viewportCenter = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        return reactFlowInstance
          ? reactFlowInstance.project(viewportCenter)
          : viewportCenter;
      })();

      handleComponentDrop(detail.componentType, position.x, position.y, {
        label,
        description,
        properties,
        width: DEFAULT_NODE_WIDTH,
        height: DEFAULT_NODE_HEIGHT,
      });

      updateLastUsedComponent(detail.componentType);

      const tracker = (
        actionsRef.current as unknown as {
          trackComponentUsage?: (componentType: string) => void;
        }
      ).trackComponentUsage;
      if (typeof tracker === "function") {
        tracker(detail.componentType);
      }
    };

    window.addEventListener(
      "canvas:add-component",
      handleAddComponent as EventListener,
    );

    return () => {
      window.removeEventListener(
        "canvas:add-component",
        handleAddComponent as EventListener,
      );
    };
  }, [handleComponentDrop, reactFlowInstance]);

  // Event listener for architecture preset insertion
  useEffect(() => {
    const handleAddPreset = (event: Event) => {
      const detail = (event as CustomEvent<AddPresetEventDetail>).detail;
      if (!detail?.presetId) {
        console.warn(
          "[DesignCanvasCallbacks] Missing presetId in add-preset event detail",
        );
        return;
      }

      const preset = presetsRegistry[detail.presetId];
      if (!preset) {
        emitToast({
          title: "Preset unavailable",
          description: `No preset registered for "${detail.presetId}".`,
          variant: "destructive",
        });
        return;
      }

      const basePosition = (() => {
        if (detail.position) {
          if (detail.coordinateSpace === "canvas" || !reactFlowInstance) {
            return { x: detail.position.x, y: detail.position.y };
          }
          return reactFlowInstance.project(detail.position);
        }
        const viewportCenter = {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        return reactFlowInstance
          ? reactFlowInstance.project(viewportCenter)
          : viewportCenter;
      })();

      let applied;
      try {
        applied = applyPreset(preset, basePosition);
      } catch (error) {
        console.error("[DesignCanvasCallbacks] Failed to apply preset", error);
        emitToast({
          title: "Failed to add preset",
          description:
            error instanceof Error
              ? error.message
              : "Unknown error while applying preset.",
          variant: "destructive",
        });
        return;
      }

      const existingComponents = componentsRef.current ?? [];
      const existingConnections = connectionsRef.current ?? [];

      const incomingComponents = applied.components.map((component) => {
        const properties = component.properties
          ? ({
              showLabel: true,
              ...component.properties,
            } as DesignComponent["properties"])
          : ({ showLabel: true } as DesignComponent["properties"]);

        const record = {
          id: component.id,
          type: component.type,
          x: component.x,
          y: component.y,
          label: component.label,
          description: component.description,
          properties,
        } as DesignComponent & Record<string, unknown>;

        record.width = component.width ?? DEFAULT_NODE_WIDTH;
        record.height = component.height ?? DEFAULT_NODE_HEIGHT;

        return record as DesignComponent;
      });

      const incomingConnections = applied.connections.map((connection) => ({
        ...connection,
      }));

      const overlapDetected = componentsOverlap(
        existingComponents,
        incomingComponents,
      );

      actionsRef.current.updateCanvasData(
        {
          components: [...existingComponents, ...incomingComponents],
          connections: [...existingConnections, ...incomingConnections],
        },
        { source: "handleAddPreset", context: { presetId: preset.id } },
      );

      incomingComponents.forEach((component) => {
        const tracker = (
          actionsRef.current as unknown as {
            trackComponentUsage?: (componentType: string) => void;
          }
        ).trackComponentUsage;
        if (typeof tracker === "function") {
          tracker(component.type);
        }
      });

      updateRecentPresetUsage(preset.id);

      emitToast({
        title: `Added ${preset.name} pattern`,
        description: overlapDetected
          ? "Pattern added. Some nodes overlap existing components; consider running auto-arrange."
          : "Pattern inserted successfully on the canvas.",
        variant: overlapDetected ? "info" : "success",
      });
    };

    window.addEventListener(
      "canvas:add-preset",
      handleAddPreset as EventListener,
    );

    return () => {
      window.removeEventListener(
        "canvas:add-preset",
        handleAddPreset as EventListener,
      );
    };
  }, [reactFlowInstance]);

  // Drawing callbacks
  const handleDrawingComplete = useStableCallback(
    (stroke: DrawingStroke) => {
      const callbackId = "handleDrawingComplete";
      const startTime = performance.now();

      try {
        actionsRef.current.addDrawing(stroke, {
          source: "DesignCanvas",
          context: { strokeId: stroke.id },
        });

        emitToast({
          title: "Drawing added",
          variant: "success",
        });
      } catch (error) {
        console.error("[handleDrawingComplete] Failed to add drawing:", error);
        emitToast({
          title: "Failed to add drawing",
          description: String(error),
          variant: "destructive",
        });
      } finally {
        updateCallbackMetrics(callbackId, startTime);
      }
    },
    [actionsRef],
  );

  const handleDrawingDelete = useStableCallback(
    (strokeId: string) => {
      const callbackId = "handleDrawingDelete";
      const startTime = performance.now();

      try {
        actionsRef.current.deleteDrawing(strokeId, {
          source: "DesignCanvas",
          context: { strokeId },
        });

        emitToast({
          title: "Drawing deleted",
          variant: "success",
        });
      } catch (error) {
        console.error("[handleDrawingDelete] Failed to delete drawing:", error);
        emitToast({
          title: "Failed to delete drawing",
          description: String(error),
          variant: "destructive",
        });
      } finally {
        updateCallbackMetrics(callbackId, startTime);
      }
    },
    [actionsRef],
  );

  const handleDrawingToolChange = useStableCallback(
    (tool: DrawingTool) => {
      const callbackId = "handleDrawingToolChange";
      const startTime = performance.now();

      try {
        actionsRef.current.setDrawingTool(tool, {
          source: "DesignCanvas",
          context: { tool },
        });
      } catch (error) {
        console.error(
          "[handleDrawingToolChange] Failed to change tool:",
          error,
        );
      } finally {
        updateCallbackMetrics(callbackId, startTime);
      }
    },
    [actionsRef],
  );

  const handleDrawingColorChange = useStableCallback(
    (color: string) => {
      const callbackId = "handleDrawingColorChange";
      const startTime = performance.now();

      try {
        actionsRef.current.setDrawingColor(color, {
          source: "DesignCanvas",
          context: { color },
        });
      } catch (error) {
        console.error(
          "[handleDrawingColorChange] Failed to change color:",
          error,
        );
      } finally {
        updateCallbackMetrics(callbackId, startTime);
      }
    },
    [actionsRef],
  );

  const handleDrawingSizeChange = useStableCallback(
    (size: number) => {
      const callbackId = "handleDrawingSizeChange";
      const startTime = performance.now();

      try {
        const clampedSize = Math.max(1, Math.min(20, size));
        actionsRef.current.setDrawingSize(clampedSize, {
          source: "DesignCanvas",
          context: { size: clampedSize },
        });
      } catch (error) {
        console.error(
          "[handleDrawingSizeChange] Failed to change size:",
          error,
        );
      } finally {
        updateCallbackMetrics(callbackId, startTime);
      }
    },
    [actionsRef],
  );

  const handleClearAllDrawings = useStableCallback(() => {
    const callbackId = "handleClearAllDrawings";
    const startTime = performance.now();

    try {
      actionsRef.current.clearDrawings({
        source: "DesignCanvas",
        context: { action: "clearAll" },
      });

      emitToast({
        title: "All drawings cleared",
        variant: "success",
      });
    } catch (error) {
      console.error(
        "[handleClearAllDrawings] Failed to clear drawings:",
        error,
      );
      emitToast({
        title: "Failed to clear drawings",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      updateCallbackMetrics(callbackId, startTime);
    }
  }, [actionsRef]);

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
    handleDuplicateComponent,
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
    handleDrawingComplete,
    handleDrawingDelete,
    handleDrawingToolChange,
    handleDrawingColorChange,
    handleDrawingSizeChange,
    handleClearAllDrawings,
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
          .sort(
            ([, a], [, b]) => b.averageExecutionTime - a.averageExecutionTime,
          ),
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
