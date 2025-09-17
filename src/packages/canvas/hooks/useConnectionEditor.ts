/**
 * src/features/canvas/hooks/useConnectionEditor.ts
 * Custom hook for managing connection editing state and operations
 * Handles selection, updates, and validation of connections
 * RELEVANT FILES: CanvasArea.tsx, ConnectionEditorPopover.tsx
 */

import type { Connection, VisualStyle } from '@/shared/contracts';
import { useCallback, useEffect, useState } from 'react';

interface UseConnectionEditorProps {
  connections: Connection[];
  onConnectionLabelChange: (id: string, label: string) => void;
  onConnectionTypeChange: (id: string, type: Connection['type']) => void;
  onConnectionVisualStyleChange?: (id: string, visualStyle: VisualStyle) => void;
  onConnectionDelete: (id: string) => void;
}

interface UseConnectionEditorResult {
  selectedConnection: Connection | null;
  popoverPosition: { x: number; y: number } | null;
  handleConnectionSelect: (id: string | null, x?: number, y?: number) => void;
  handleConnectionUpdate: {
    onLabelChange: (id: string, label: string) => void;
    onTypeChange: (id: string, type: Connection['type']) => void;
    onVisualStyleChange: (id: string, visualStyle: VisualStyle) => void;
    onDelete: (id: string) => void;
  };
  closeEditor: () => void;
  handleCanvasClick: () => void;
}

export function useConnectionEditor({
  connections,
  onConnectionLabelChange,
  onConnectionTypeChange,
  onConnectionVisualStyleChange,
  onConnectionDelete,
}: UseConnectionEditorProps): UseConnectionEditorResult {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);

  // Clear stale selections when selected connection is removed from connections array
  useEffect(() => {
    if (selectedConnectionId && !connections.find(c => c.id === selectedConnectionId)) {
      setSelectedConnectionId(null);
      setPopoverPosition(null);
    }
  }, [connections, selectedConnectionId]);

  const selectedConnection = selectedConnectionId
    ? connections.find(c => c.id === selectedConnectionId) || null
    : null;

  const handleConnectionSelect = useCallback(
    (id: string | null, x?: number, y?: number) => {
      if (id === null) {
        // Deselect connection (e.g., when clicking on canvas background)
        setSelectedConnectionId(null);
        setPopoverPosition(null);
        return;
      }

      // Validate that the connection exists
      const connection = connections.find(c => c.id === id);
      if (!connection) {
        console.warn(`Connection with id ${id} not found`);
        return;
      }

      // Set selection and position for React Flow edge
      setSelectedConnectionId(id);

      // Position popover using midpoint coordinates from CustomEdge component
      if (x !== undefined && y !== undefined) {
        setPopoverPosition({ x, y });
      } else {
        // Fallback: close popover if coordinates not provided
        setPopoverPosition(null);
      }
    },
    [connections]
  );

  const handleConnectionUpdate = {
    onLabelChange: useCallback(
      (id: string, label: string) => {
        if (label.trim()) {
          onConnectionLabelChange(id, label.trim());
        }
      },
      [onConnectionLabelChange]
    ),

    onTypeChange: useCallback(
      (id: string, type: Connection['type']) => {
        onConnectionTypeChange(id, type);
      },
      [onConnectionTypeChange]
    ),

    onVisualStyleChange: useCallback(
      (id: string, visualStyle: VisualStyle) => {
        if (onConnectionVisualStyleChange) {
          onConnectionVisualStyleChange(id, visualStyle);
        }
      },
      [onConnectionVisualStyleChange]
    ),

    onDelete: useCallback(
      (id: string) => {
        onConnectionDelete(id);
        setSelectedConnectionId(null);
        setPopoverPosition(null);
      },
      [onConnectionDelete]
    ),
  };

  const closeEditor = useCallback(() => {
    setSelectedConnectionId(null);
    setPopoverPosition(null);
  }, []);

  // Handle clicks outside of connections to deselect
  const handleCanvasClick = useCallback(() => {
    handleConnectionSelect(null);
  }, [handleConnectionSelect]);

  return {
    selectedConnection,
    popoverPosition,
    handleConnectionSelect,
    handleConnectionUpdate,
    closeEditor,
    handleCanvasClick,
  };
}
