/**
 * src/features/canvas/hooks/useConnectionEditor.ts
 * Custom hook for managing connection editing state and operations
 * Handles selection, updates, and validation of connections
 * RELEVANT FILES: CanvasArea.tsx, ConnectionEditorPopover.tsx
 */

import type { Connection } from '@/shared/contracts';
import { useCallback, useState } from 'react';

interface UseConnectionEditorProps {
  connections: Connection[];
  onConnectionLabelChange: (id: string, label: string) => void;
  onConnectionTypeChange: (id: string, type: Connection['type']) => void;
  onConnectionDelete: (id: string) => void;
}

interface UseConnectionEditorResult {
  selectedConnection: Connection | null;
  popoverPosition: { x: number; y: number } | null;
  handleConnectionSelect: (id: string, x: number, y: number) => void;
  handleConnectionUpdate: {
    onLabelChange: (id: string, label: string) => void;
    onTypeChange: (id: string, type: Connection['type']) => void;
    onDelete: (id: string) => void;
  };
  closeEditor: () => void;
}

export function useConnectionEditor({
  connections,
  onConnectionLabelChange,
  onConnectionTypeChange,
  onConnectionDelete
}: UseConnectionEditorProps): UseConnectionEditorResult {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);

  const selectedConnection = selectedConnectionId
    ? connections.find(c => c.id === selectedConnectionId) || null
    : null;

  const handleConnectionSelect = useCallback((id: string, x: number, y: number) => {
    setSelectedConnectionId(id);
    setPopoverPosition({ x, y });
  }, []);

  const handleConnectionUpdate = {
    onLabelChange: useCallback((id: string, label: string) => {
      if (label.trim()) {
        onConnectionLabelChange(id, label.trim());
      }
    }, [onConnectionLabelChange]),

    onTypeChange: useCallback((id: string, type: Connection['type']) => {
      onConnectionTypeChange(id, type);
    }, [onConnectionTypeChange]),

    onDelete: useCallback((id: string) => {
      onConnectionDelete(id);
      setSelectedConnectionId(null);
      setPopoverPosition(null);
    }, [onConnectionDelete])
  };

  const closeEditor = useCallback(() => {
    setSelectedConnectionId(null);
    setPopoverPosition(null);
  }, []);

  return {
    selectedConnection,
    popoverPosition,
    handleConnectionSelect,
    handleConnectionUpdate,
    closeEditor
  };
}
