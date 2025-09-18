// src/components/DesignCanvas/hooks/useDesignCanvasState.ts
// State management for DesignCanvas component
// Handles local UI state, serializer setup, and design snapshot building
// RELEVANT FILES: DesignCanvasCore.tsx, ../../../lib/import-export/DesignSerializer.ts, ../@shared/contracts.ts, useCanvasIntegration.ts

import { DesignSerializer } from '@/lib/import-export/DesignSerializer';
import type { CanvasConfig } from '@/lib/import-export/types';
import type { DesignData } from '@/shared/contracts';
import React, { useCallback, useMemo, useRef } from 'react';

interface DesignCanvasStateProps {
  initialData: DesignData;
  sessionStartTime: Date;
}

export function useDesignCanvasState({ initialData, sessionStartTime }: DesignCanvasStateProps) {
  // Local UI state (not shared in store)
  const [showHints, setShowHints] = React.useState(false);
  const [showCommandPalette, setShowCommandPalette] = React.useState(false);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [canvasConfig, setCanvasConfig] = React.useState<CanvasConfig>({
    viewport: { x: 0, y: 0, zoom: 1 },
    gridConfig: {
      visible: true,
      spacing: 20,
      snapToGrid: false,
      style: 'dots',
    },
    theme: 'light',
    virtualizationEnabled: false,
  });

  // Initialize design serializer with session timing
  const serializer = React.useMemo(() => {
    const s = new DesignSerializer();
    s.setSessionStartTime(sessionStartTime);
    return s;
  }, [sessionStartTime]);

  // Metadata refs
  const createdAtRef = useRef(initialData.metadata?.created ?? new Date().toISOString());
  const lastModifiedRef = useRef(initialData.metadata?.lastModified ?? createdAtRef.current);

  // Update metadata refs only when needed
  if (initialData.metadata?.created && initialData.metadata.created !== createdAtRef.current) {
    createdAtRef.current = initialData.metadata.created;
  }
  if (initialData.metadata?.lastModified && initialData.metadata.lastModified !== lastModifiedRef.current) {
    lastModifiedRef.current = initialData.metadata.lastModified;
  }

  const markDesignModified = useCallback((explicitTimestamp?: string) => {
    const nextTimestamp = explicitTimestamp ?? new Date().toISOString();
    lastModifiedRef.current = nextTimestamp;
  }, []);

  const buildDesignSnapshot = useCallback(
    (currentDesignData: DesignData, options?: { updateTimestamp?: boolean; explicitTimestamp?: string }) => {
      if (options?.updateTimestamp) {
        const timestamp = options.explicitTimestamp ?? new Date().toISOString();
        markDesignModified(timestamp);
        return {
          ...currentDesignData,
          metadata: {
            ...currentDesignData.metadata,
            lastModified: timestamp,
          },
        };
      }
      return currentDesignData;
    },
    [markDesignModified]
  );

  return {
    // UI state
    showHints,
    setShowHints,
    showCommandPalette,
    setShowCommandPalette,
    showConfetti,
    setShowConfetti,
    canvasConfig,
    setCanvasConfig,

    // Serializer
    serializer,

    // Metadata helpers
    createdAtRef,
    lastModifiedRef,
    markDesignModified,
    buildDesignSnapshot,
  };
}