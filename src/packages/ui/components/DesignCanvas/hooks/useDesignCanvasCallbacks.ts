// src/components/DesignCanvas/hooks/useDesignCanvasCallbacks.ts
// Callback handlers for DesignCanvas component
// Manages all event handlers and actions for canvas interaction
// RELEVANT FILES: DesignCanvasCore.tsx, ../../../shared/contracts.ts, ../../../lib/utils.ts, useStableCallbacks.ts

import { useEffect, useRef } from 'react';

import { useStableCallback } from '@/hooks/useStableCallbacks';
import { generateId } from '@core/utils';
import type { Connection, DesignComponent, InfoCard } from '@/shared/contracts';
import { useCanvasActions, useCanvasStore, getCanvasState } from '@/stores/canvasStore';

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
      const componentsState = useCanvasStore.getState().components;
      const target = componentsState.find(component => component.id === id);
      if (!target) {
        return;
      }

      const projected = projector(target);
      if (projected === target) {
        return;
      }

      updateComponents(components => {
        let replaced = false;
        const next = components.map(component => {
          if (component.id !== id) {
            return component;
          }
          replaced = true;
          return projected;
        });
        return replaced ? next : components;
      });
    }
  );

  const updateConnectionIfChanged = useStableCallback(
    (id: string, projector: (connection: Connection) => Connection) => {
      const connectionsState = useCanvasStore.getState().connections;
      const target = connectionsState.find(connection => connection.id === id);
      if (!target) {
        return;
      }

      const projected = projector(target);
      if (projected === target) {
        return;
      }

      updateConnections(connections => {
        let replaced = false;
        const next = connections.map(connection => {
          if (connection.id !== id) {
            return connection;
          }
          replaced = true;
          return projected;
        });
        return replaced ? next : connections;
      });
    }
  );

  const updateInfoCardIfChanged = useStableCallback(
    (id: string, projector: (infoCard: InfoCard) => InfoCard) => {
      const infoCardsState = useCanvasStore.getState().infoCards;
      const target = infoCardsState.find(card => card.id === id);
      if (!target) {
        return;
      }

      const projected = projector(target);
      if (projected === target) {
        return;
      }

      updateInfoCards(infoCards => {
        let replaced = false;
        const next = infoCards.map(card => {
          if (card.id !== id) {
            return card;
          }
          replaced = true;
          return projected;
        });
        return replaced ? next : infoCards;
      });
    }
  );

  const handleComponentDrop = useStableCallback(
    (componentType: DesignComponent['type'], x: number, y: number) => {
      const newComponent: DesignComponent = {
        id: generateId(componentType),
        type: componentType,
        x,
        y,
        label: '',
        properties: { showLabel: true },
      };
      updateComponents(components => [...components, newComponent]);
    }
  );

  const handleComponentMove = useStableCallback((id: string, x: number, y: number) => {
    const applyMove = (move: { id: string; x: number; y: number }) => {
      const current = getCanvasState().components.find(component => component.id === move.id);
      if (!current || (current.x === move.x && current.y === move.y)) {
        return;
      }

      updateComponents(components =>
        components.map(component =>
          component.id === move.id ? { ...component, x: move.x, y: move.y } : component
        )
      );
    };

    if (typeof requestAnimationFrame !== 'function') {
      applyMove({ id, x, y });
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
  });

  const handleComponentSelect = useStableCallback((id: string | null) => {
    if (useCanvasStore.getState().selectedComponent === id) {
      return;
    }
    setSelectedComponent(id);
  });

  const handleComponentLabelChange = useStableCallback((id: string, label: string) => {
    const existing = getCanvasState().components.find(component => component.id === id);
    if (!existing || existing.label === label) {
      return;
    }

    updateComponents(components =>
      components.map(component => (component.id === id ? { ...component, label } : component))
    );
  });

  const handleConnectionLabelChange = useStableCallback((id: string, label: string) => {
    const existing = getCanvasState().connections.find(connection => connection.id === id);
    if (!existing || existing.label === label) {
      return;
    }

    updateConnections(connections =>
      connections.map(connection => (connection.id === id ? { ...connection, label } : connection))
    );
  });

  const handleConnectionDelete = useStableCallback((id: string) => {
    const connectionsState = useCanvasStore.getState().connections;
    if (!connectionsState.some(conn => conn.id === id)) {
      return;
    }
    updateConnections(connections => connections.filter(conn => conn.id !== id));
  });

  const handleConnectionTypeChange = useStableCallback((id: string, type: Connection['type']) => {
    updateConnectionIfChanged(id, connection =>
      connection.type === type ? connection : { ...connection, type }
    );
  });

  const handleConnectionVisualStyleChange = useStableCallback(
    (id: string, visualStyle: Connection['visualStyle']) => {
      updateConnectionIfChanged(id, connection =>
        connection.visualStyle === visualStyle ? connection : { ...connection, visualStyle }
      );
    }
  );

  const handleDeleteComponent = useStableCallback((id: string) => {
    const state = useCanvasStore.getState();
    if (!state.components.some(comp => comp.id === id)) {
      return;
    }

    updateComponents(components => components.filter(comp => comp.id !== id));

    if (state.connections.some(conn => conn.from === id || conn.to === id)) {
      updateConnections(connections =>
        connections.filter(conn => conn.from !== id && conn.to !== id)
      );
    }

    if (state.selectedComponent === id) {
      setSelectedComponent(null);
    }
  });

  const handleShowLabelToggle = useStableCallback((id: string, visible: boolean) => {
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
  });

  const handleStickerToggle = useStableCallback((id: string, enabled: boolean) => {
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
  });

  const handleStickerEmojiChange = useStableCallback((id: string, emoji: string) => {
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
  });

  const handleBgColorChange = useStableCallback((id: string, color: string) => {
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
  });

  const handleNodeBgChange = useStableCallback((id: string, color: string) => {
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
  });

  const handleInfoCardAdd = useStableCallback((x: number, y: number) => {
    const newInfoCard: InfoCard = {
      id: generateId('info-card'),
      x,
      y,
      content: '',
      color: 'yellow',
      isEditing: true,
    };
    updateInfoCards(infoCards => [...infoCards, newInfoCard]);
  });

  const handleInfoCardUpdate = useStableCallback((id: string, content: string) => {
    updateInfoCardIfChanged(id, card => {
      if (card.content === content && card.isEditing === false) {
        return card;
      }
      return { ...card, content, isEditing: false };
    });
  });

  const handleInfoCardDelete = useStableCallback((id: string) => {
    const infoCardsState = useCanvasStore.getState().infoCards;
    if (!infoCardsState.some(card => card.id === id)) {
      return;
    }
    updateInfoCards(infoCards => infoCards.filter(card => card.id !== id));
  });

  const handleInfoCardColorChange = useStableCallback((id: string, color: string) => {
    updateInfoCardIfChanged(id, card =>
      card.color === color ? card : { ...card, color: color as InfoCard['color'] }
    );
  });

  const handleStartConnection = useStableCallback((id: string) => {
    if (useCanvasStore.getState().connectionStart === id) {
      return;
    }
    setConnectionStart(id);
  });

  const handleCompleteConnection = useStableCallback((fromId: string, toId: string) => {
    if (fromId !== toId) {
      const connectionsState = useCanvasStore.getState().connections;
      const exists = connectionsState.some(connection => connection.from === fromId && connection.to === toId);
      if (!exists) {
        const newConnection = {
          id: generateId('connection'),
          from: fromId,
          to: toId,
          label: 'Connection',
          type: 'data' as const,
        };
        updateConnections(connections => [...connections, newConnection]);
      }
    }

    if (useCanvasStore.getState().connectionStart !== null) {
      setConnectionStart(null);
    }
  });

  return {
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
}
