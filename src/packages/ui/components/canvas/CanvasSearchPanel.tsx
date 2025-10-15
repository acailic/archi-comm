/**
 * src/packages/ui/components/canvas/CanvasSearchPanel.tsx
 * Advanced search panel for finding canvas elements
 * Supports searching components, connections, annotations, and frames
 * RELEVANT FILES: useCanvasSearch.ts, canvasStore.ts, shared/contracts/index.ts
 */

import React from 'react';
import type { SearchResult } from '@/shared/contracts';
import { useCanvasSearch } from '@/packages/canvas/hooks/useCanvasSearch';

export interface CanvasSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onResultSelect?: (result: SearchResult) => void;
}

export const CanvasSearchPanel: React.FC<CanvasSearchPanelProps> = ({
  isOpen,
  onClose,
  onResultSelect,
}) => {
  const { query, setQuery, results, jumpToResult } = useCanvasSearch();

  if (!isOpen) {
    return null;
  }

  const handleResultClick = (result: SearchResult) => {
    jumpToResult(result);
    onResultSelect?.(result);
  };

  return (
    <div
      className="canvas-search-panel"
      style={{
        position: 'absolute',
        top: 60,
        right: 20,
        width: 320,
        maxHeight: '60vh',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search canvas..."
            autoFocus
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {results.length === 0 && query && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
            No results found
          </div>
        )}
        {results.length === 0 && !query && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
            Start typing to search...
          </div>
        )}
        {results.map((result) => (
          <div
            key={result.id}
            onClick={() => handleResultClick(result)}
            style={{
              padding: '8px 12px',
              marginBottom: '4px',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: '#f9fafb',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
              {result.label}
            </div>
            {result.description && (
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {result.description}
              </div>
            )}
            <div
              style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 6px',
                fontSize: '10px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                textTransform: 'uppercase',
              }}
            >
              {result.type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
