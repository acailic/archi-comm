/**
 * src/packages/ui/components/canvas/NavigationBreadcrumbs.tsx
 * Navigation breadcrumbs for canvas history and viewport navigation
 * Enables quick jumping between canvas views and frame hierarchy
 * RELEVANT FILES: useFrameManagement.ts, canvasStore.ts, shared/contracts/index.ts
 */

import React from 'react';
import type { NavigationHistoryEntry } from '@/shared/contracts';

export interface NavigationBreadcrumbsProps {
  history: NavigationHistoryEntry[];
  currentIndex: number;
  onNavigate?: (entry: NavigationHistoryEntry) => void;
  maxVisible?: number;
}

export const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({
  history,
  currentIndex,
  onNavigate,
  maxVisible = 5,
}) => {
  // TODO: Implement breadcrumb navigation with:
  // - History tracking
  // - Back/forward navigation
  // - Frame hierarchy display
  // - Viewport bookmarks
  // - Truncation for long histories

  if (history.length === 0) {
    return null;
  }

  const visibleHistory = history.slice(Math.max(0, history.length - maxVisible));

  return (
    <div
      className="navigation-breadcrumbs"
      style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 12px',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        zIndex: 100,
        maxWidth: '600px',
        overflow: 'hidden',
      }}
    >
      {visibleHistory.map((entry, index) => {
        const isLast = index === visibleHistory.length - 1;
        const isCurrent = history.length - maxVisible + index === currentIndex;

        return (
          <React.Fragment key={entry.id}>
            <button
              onClick={() => onNavigate?.(entry)}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: isCurrent ? '#3b82f6' : 'transparent',
                color: isCurrent ? 'white' : '#374151',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isCurrent ? 600 : 400,
                whiteSpace: 'nowrap',
              }}
            >
              {entry.label}
            </button>
            {!isLast && (
              <span style={{ color: '#9ca3af', fontSize: '12px' }}>›</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
