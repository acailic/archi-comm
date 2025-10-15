/**
 * src/packages/canvas/hooks/useCanvasSearch.ts
 * Hook for advanced canvas search functionality
 * Enables searching across components, connections, annotations, and frames
 * RELEVANT FILES: CanvasSearchPanel.tsx, canvasStore.ts, shared/contracts/index.ts
 */

import { useMemo, useState, useCallback } from 'react';
import type { SearchResult } from '@/shared/contracts';
import { useCanvasStore } from '@/stores/canvasStore';

export interface UseCanvasSearchOptions {
  enableFuzzySearch?: boolean;
  maxResults?: number;
}

export const useCanvasSearch = (options?: UseCanvasSearchOptions) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { components, connections, annotations } = useCanvasStore((state) => ({
    components: state.components,
    connections: state.connections,
    annotations: state.annotations,
  }));

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];

    const searchTerm = query.toLowerCase();
    const results: SearchResult[] = [];
    const maxResults = options?.maxResults ?? 20;

    // Search components
    components.forEach((component) => {
      const labelMatch = component.label?.toLowerCase().includes(searchTerm);
      const typeMatch = component.type.toLowerCase().includes(searchTerm);
      const descMatch = component.description?.toLowerCase().includes(searchTerm);

      if (labelMatch || typeMatch || descMatch) {
        results.push({
          id: component.id,
          type: 'component',
          label: component.label || component.type,
          description: component.description,
          score: labelMatch ? 1.0 : typeMatch ? 0.8 : 0.6,
          position: { x: component.x, y: component.y },
          metadata: { type: component.type },
        });
      }
    });

    // Search connections
    connections.forEach((connection) => {
      const labelMatch = connection.label?.toLowerCase().includes(searchTerm);
      const typeMatch = connection.type.toLowerCase().includes(searchTerm);

      if (labelMatch || typeMatch) {
        results.push({
          id: connection.id,
          type: 'connection',
          label: connection.label || `${connection.from} → ${connection.to}`,
          score: labelMatch ? 1.0 : 0.7,
          metadata: {
            from: connection.from,
            to: connection.to,
            connectionType: connection.type
          },
        });
      }
    });

    // Search annotations
    annotations.forEach((annotation) => {
      const contentMatch = annotation.content.toLowerCase().includes(searchTerm);

      if (contentMatch) {
        results.push({
          id: annotation.id,
          type: 'annotation',
          label: annotation.content.substring(0, 50),
          description: annotation.author,
          score: 0.8,
          position: { x: annotation.x, y: annotation.y },
          metadata: { annotationType: annotation.type },
        });
      }
    });

    // Sort by score and limit
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }, [query, components, connections, annotations, options?.maxResults]);

  const jumpToResult = useCallback((result: SearchResult) => {
    // Dispatch event for DesignCanvasCore to handle viewport navigation
    const event = new CustomEvent('canvas:search:jump-to-result', {
      detail: { result }
    });
    window.dispatchEvent(event);
  }, []);

  return {
    query,
    setQuery,
    results,
    isOpen,
    setIsOpen,
    jumpToResult,
    hasResults: results.length > 0,
  };
};
