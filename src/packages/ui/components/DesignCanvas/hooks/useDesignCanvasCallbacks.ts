// src/components/DesignCanvas/hooks/useDesignCanvasCallbacks.ts
// Callback handlers for DesignCanvas component
// Manages all event handlers and actions for canvas interaction
// RELEVANT FILES: DesignCanvasCore.tsx, ../../../shared/contracts.ts, ../../../lib/utils.ts, useStableCallbacks.ts

import { useStableCallback } from '@/hooks/useStableCallbacks';
import { generateId } from '@core/utils';
import type { Connection, DesignComponent, InfoCard } from '@/shared/contracts';
import {
  useCanvasActions,
} from '@/stores/canvasStore';

export function useDesignCanvasCallbacks() {
  const {
    setSelectedComponent,
    setConnectionStart,
    updateComponents,
    updateConnections,
    updateInfoCards,
  } = useCanvasActions();

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
    updateComponents(components =>
      components.map(comp => (comp.id === id ? { ...comp, x, y } : comp))
    );
  });

  const handleComponentSelect = useStableCallback((id: string | null) => {
    setSelectedComponent(id);
  });

  const handleComponentLabelChange = useStableCallback((id: string, label: string) => {
    updateComponents(components =>
      components.map(comp => (comp.id === id ? { ...comp, label } : comp))
    );
  });

  const handleConnectionLabelChange = useStableCallback((id: string, label: string) => {
    updateConnections(connections =>
      connections.map(conn => (conn.id === id ? { ...conn, label } : conn))
    );
  });

  const handleConnectionDelete = useStableCallback((id: string) => {
    updateConnections(connections => connections.filter(conn => conn.id !== id));
  });

  const handleConnectionTypeChange = useStableCallback((id: string, type: Connection['type']) => {
    updateConnections(connections =>
      connections.map(conn => (conn.id === id ? { ...conn, type } : conn))
    );
  });

  const handleConnectionVisualStyleChange = useStableCallback(
    (id: string, visualStyle: Connection['visualStyle']) => {
      updateConnections(connections =>
        connections.map(conn => (conn.id === id ? { ...conn, visualStyle } : conn))
      );
    }
  );

  const handleDeleteComponent = useStableCallback((id: string) => {
    updateComponents(components => components.filter(comp => comp.id !== id));
    updateConnections(connections =>
      connections.filter(conn => conn.from !== id && conn.to !== id)
    );
    setSelectedComponent(null);
  });

  const handleShowLabelToggle = useStableCallback((id: string, visible: boolean) => {
    updateComponents(components =>
      components.map(comp =>
        comp.id === id ? { ...comp, properties: { ...comp.properties, showLabel: visible } } : comp
      )
    );
  });

  const handleStickerToggle = useStableCallback((id: string, enabled: boolean) => {
    updateComponents(components =>
      components.map(comp =>
        comp.id === id
          ? { ...comp, properties: { ...comp.properties, sticker: enabled } as any }
          : comp
      )
    );
  });

  const handleStickerEmojiChange = useStableCallback((id: string, emoji: string) => {
    updateComponents(components =>
      components.map(comp =>
        comp.id === id
          ? { ...comp, properties: { ...comp.properties, stickerEmoji: emoji } as any }
          : comp
      )
    );
  });

  const handleBgColorChange = useStableCallback((id: string, color: string) => {
    updateComponents(components =>
      components.map(comp =>
        comp.id === id ? { ...comp, properties: { ...comp.properties, bgHex: color } as any } : comp
      )
    );
  });

  const handleNodeBgChange = useStableCallback((id: string, color: string) => {
    updateComponents(components =>
      components.map(comp =>
        comp.id === id
          ? { ...comp, properties: { ...comp.properties, bodyBgHex: color } as any }
          : comp
      )
    );
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
    updateInfoCards(infoCards =>
      infoCards.map(card => (card.id === id ? { ...card, content, isEditing: false } : card))
    );
  });

  const handleInfoCardDelete = useStableCallback((id: string) => {
    updateInfoCards(infoCards => infoCards.filter(card => card.id !== id));
  });

  const handleInfoCardColorChange = useStableCallback((id: string, color: string) => {
    updateInfoCards(infoCards =>
      infoCards.map(card =>
        card.id === id ? { ...card, color: color as InfoCard['color'] } : card
      )
    );
  });

  const handleStartConnection = useStableCallback((id: string) => {
    setConnectionStart(id);
  });

  const handleCompleteConnection = useStableCallback((fromId: string, toId: string) => {
    if (fromId !== toId) {
      const newConnection = {
        id: generateId('connection'),
        from: fromId,
        to: toId,
        label: 'Connection',
        type: 'data' as const,
      };
      updateConnections(connections => [...connections, newConnection]);
    }
    setConnectionStart(null);
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