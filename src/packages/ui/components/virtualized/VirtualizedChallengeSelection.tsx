/**
 * Virtualized Challenge Selection - Efficiently renders large challenge grids
 * Uses useGridVirtualization hook for optimal performance with many challenges
 * Replaces current ChallengeSelection with virtualized grid rendering
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import { useGridVirtualization } from '@/shared/hooks/useVirtualization';
import { componentOptimizer } from '@/lib/performance/ComponentOptimizer';
import { reactProfilerIntegration } from '@/lib/performance/ReactProfilerIntegration';
import type { Challenge } from '@shared/contracts';

export interface VirtualizedChallengeSelectionProps {
  challenges: Challenge[];
  onChallengeSelect?: (challenge: Challenge) => void;
  onChallengePreview?: (challenge: Challenge) => void;
  selectedChallengeId?: string;
  searchQuery?: string;
  difficultyFilter?: 'beginner' | 'intermediate' | 'advanced';
  categoryFilter?: 'system-design' | 'architecture' | 'scaling';
  containerHeight: number;
  containerWidth: number;
  cardWidth?: number;
  cardHeight?: number;
  columnsPerRow?: number;
  enableVirtualization?: boolean;
  virtualizationThreshold?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface ChallengeGridItem {
  challenge: Challenge;
  row: number;
  column: number;
  index: number;
}

// Single challenge card renderer
const ChallengeCardRenderer: React.FC<{
  challenge: Challenge;
  style: React.CSSProperties;
  isSelected: boolean;
  onSelect: (challenge: Challenge) => void;
  onPreview: (challenge: Challenge) => void;
}> = React.memo(({ challenge, style, isSelected, onSelect, onPreview }) => {
  const handleClick = useCallback(() => {
    onSelect(challenge);
  }, [challenge, onSelect]);

  const handleMouseEnter = useCallback(() => {
    onPreview(challenge);
  }, [challenge, onPreview]);

  const getDifficultyColor = (difficulty: Challenge['difficulty']) => {
    switch (difficulty) {
      case 'beginner': return '#10b981';
      case 'intermediate': return '#f59e0b';
      case 'advanced': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: Challenge['category']) => {
    switch (category) {
      case 'system-design': return '🏗️';
      case 'architecture': return '🏛️';
      case 'scaling': return '📈';
      default: return '💡';
    }
  };

  const stableProps = useMemo(() => ({
    challenge,
    style,
    isSelected,
    onSelect,
    onPreview,
  }), [challenge, style, isSelected, onSelect, onPreview]);

  return (
    <div
      style={{
        ...stableProps.style,
        padding: '8px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className={`challenge-card ${stableProps.isSelected ? 'selected' : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        data-challenge-id={stableProps.challenge.id}
        role="button"
        tabIndex={0}
        aria-label={`${stableProps.challenge.title} challenge`}
        aria-selected={stableProps.isSelected}
        style={{
          width: '100%',
          height: '100%',
          border: `2px solid ${stableProps.isSelected ? '#3b82f6' : '#e5e7eb'}`,
          borderRadius: '8px',
          padding: '16px',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxSizing: 'border-box',
          boxShadow: stableProps.isSelected ? '0 4px 12px rgba(59, 130, 246, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '8px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '20px' }}>
              {getCategoryIcon(stableProps.challenge.category)}
            </span>
            <div style={{
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: getDifficultyColor(stableProps.challenge.difficulty),
              color: 'white',
              fontSize: '12px',
              fontWeight: '500',
              textTransform: 'capitalize',
            }}>
              {stableProps.challenge.difficulty}
            </div>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '500',
          }}>
            {stableProps.challenge.estimatedTime}min
          </div>
        </div>

        {/* Title */}
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#1f2937',
          lineHeight: '1.4',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {stableProps.challenge.title}
        </h3>

        {/* Description */}
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280',
          lineHeight: '1.4',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          flex: 1,
        }}>
          {stableProps.challenge.description}
        </p>

        {/* Footer */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginTop: 'auto',
        }}>
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            textTransform: 'capitalize',
          }}>
            {stableProps.challenge.category.replace('-', ' ')}
          </div>
          {stableProps.challenge.keyConcepts && stableProps.challenge.keyConcepts.length > 0 && (
            <div style={{
              fontSize: '12px',
              color: '#3b82f6',
              fontWeight: '500',
            }}>
              {stableProps.challenge.keyConcepts.length} concepts
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ChallengeCardRenderer.displayName = 'ChallengeCardRenderer';

export const VirtualizedChallengeSelection: React.FC<VirtualizedChallengeSelectionProps> = ({
  challenges,
  onChallengeSelect,
  onChallengePreview,
  selectedChallengeId,
  searchQuery = '',
  difficultyFilter,
  categoryFilter,
  containerHeight,
  containerWidth,
  cardWidth = 280,
  cardHeight = 200,
  columnsPerRow,
  enableVirtualization = true,
  virtualizationThreshold = 20,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Calculate columns per row based on container width and card width
  const actualColumnsPerRow = columnsPerRow || Math.floor(containerWidth / cardWidth);

  // Filter challenges
  const filteredChallenges = useMemo(() => {
    let filtered = challenges;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(challenge =>
        challenge.title.toLowerCase().includes(query) ||
        challenge.description.toLowerCase().includes(query) ||
        challenge.keyConcepts?.some(concept => concept.toLowerCase().includes(query))
      );
    }

    // Apply difficulty filter
    if (difficultyFilter) {
      filtered = filtered.filter(challenge => challenge.difficulty === difficultyFilter);
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(challenge => challenge.category === categoryFilter);
    }

    return filtered;
  }, [challenges, searchQuery, difficultyFilter, categoryFilter]);

  // Convert flat list to 2D grid structure
  const challengeGrid = useMemo(() => {
    const grid: Challenge[][] = [];
    const totalRows = Math.ceil(filteredChallenges.length / actualColumnsPerRow);

    for (let row = 0; row < totalRows; row++) {
      const rowChallenges: Challenge[] = [];
      for (let col = 0; col < actualColumnsPerRow; col++) {
        const index = row * actualColumnsPerRow + col;
        if (index < filteredChallenges.length) {
          rowChallenges.push(filteredChallenges[index]);
        }
      }
      grid.push(rowChallenges);
    }

    return grid;
  }, [filteredChallenges, actualColumnsPerRow]);

  // Determine if virtualization should be enabled
  const shouldVirtualize = enableVirtualization &&
    filteredChallenges.length > virtualizationThreshold &&
    challengeGrid.length > 5; // Only virtualize if we have more than 5 rows

  // Virtualization configuration
  const virtualizationConfig = useMemo(() => ({
    rowHeight: cardHeight + 16, // Add padding
    columnWidth: cardWidth,
    overscan: 2,
    threshold: virtualizationThreshold,
    enabled: shouldVirtualize,
    containerHeight,
    containerWidth,
  }), [cardHeight, cardWidth, virtualizationThreshold, shouldVirtualize, containerHeight, containerWidth]);

  // Use grid virtualization hook
  const { virtualRows, totalHeight, totalWidth } = useGridVirtualization(
    challengeGrid,
    virtualizationConfig
  );

  // Stable callback handlers
  const stableCallbacks = useMemo(() => ({
    onChallengeSelect: onChallengeSelect || (() => {}),
    onChallengePreview: onChallengePreview || (() => {}),
  }), [onChallengeSelect, onChallengePreview]);

  // Scroll event handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollTop(target.scrollTop);
    setScrollLeft(target.scrollLeft);
  }, []);

  // Scroll to specific challenge
  const scrollToChallenge = useCallback((challengeId: string) => {
    const challengeIndex = filteredChallenges.findIndex(challenge => challenge.id === challengeId);
    if (challengeIndex !== -1) {
      const row = Math.floor(challengeIndex / actualColumnsPerRow);
      const targetScrollTop = row * (cardHeight + 16);

      if (containerRef.current) {
        containerRef.current.scrollTop = targetScrollTop;
        setScrollTop(targetScrollTop);
      }
    }
  }, [filteredChallenges, actualColumnsPerRow, cardHeight]);

  // Auto-scroll to selected challenge
  React.useEffect(() => {
    if (selectedChallengeId) {
      scrollToChallenge(selectedChallengeId);
    }
  }, [selectedChallengeId, scrollToChallenge]);

  // Render virtual row
  const renderVirtualRow = useCallback((virtualRow: any) => {
    const { rowIndex, columns, style: rowStyle } = virtualRow;

    return (
      <div
        key={`row-${rowIndex}`}
        style={rowStyle}
        className="challenge-grid-row"
      >
        {columns.map((virtualColumn: any) => {
          const challenge = virtualColumn.item;
          const isSelected = challenge.id === selectedChallengeId;

          return (
            <ChallengeCardRenderer
              key={challenge.id}
              challenge={challenge}
              style={virtualColumn.style}
              isSelected={isSelected}
              onSelect={stableCallbacks.onChallengeSelect}
              onPreview={stableCallbacks.onChallengePreview}
            />
          );
        })}
      </div>
    );
  }, [selectedChallengeId, stableCallbacks]);

  // Performance tracking
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      componentOptimizer.recordSample({
        componentId: 'VirtualizedChallengeSelection',
        duration: performance.now(),
        timestamp: Date.now(),
        commitType: 'update',
        propsChanged: ['challenges', 'searchQuery', 'difficultyFilter', 'categoryFilter'],
      });
    }
  }, [challenges, searchQuery, difficultyFilter, categoryFilter]);

  const containerStyle = useMemo(() => ({
    ...style,
    height: containerHeight,
    width: containerWidth,
    overflow: 'auto',
    position: 'relative' as const,
  }), [style, containerHeight, containerWidth]);

  if (!shouldVirtualize) {
    // Render without virtualization for small grids
    return (
      <div
        ref={containerRef}
        className={`challenge-selection ${className || ''}`}
        style={containerStyle}
        onScroll={handleScroll}
        role="grid"
        aria-label="Challenge selection grid"
      >
        <div
          style={{
            height: totalHeight,
            width: totalWidth,
            position: 'relative',
          }}
        >
          {challengeGrid.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              style={{
                position: 'absolute',
                top: rowIndex * (cardHeight + 16),
                left: 0,
                width: totalWidth,
                height: cardHeight + 16,
                display: 'flex',
              }}
              role="row"
            >
              {row.map((challenge, colIndex) => {
                const isSelected = challenge.id === selectedChallengeId;

                return (
                  <ChallengeCardRenderer
                    key={challenge.id}
                    challenge={challenge}
                    style={{
                      position: 'absolute',
                      left: colIndex * cardWidth,
                      width: cardWidth,
                      height: cardHeight + 16,
                    }}
                    isSelected={isSelected}
                    onSelect={stableCallbacks.onChallengeSelect}
                    onPreview={stableCallbacks.onChallengePreview}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render with virtualization
  return (
    <div
      ref={containerRef}
      className={`challenge-selection virtualized ${className || ''}`}
      style={containerStyle}
      onScroll={handleScroll}
      role="grid"
      aria-label="Challenge selection grid"
      data-virtualized="true"
      data-total-challenges={filteredChallenges.length}
      data-visible-rows={virtualRows.length}
    >
      <div
        style={{
          height: totalHeight,
          width: totalWidth,
          position: 'relative',
        }}
      >
        {virtualRows.map(renderVirtualRow)}
      </div>

      {/* Empty state */}
      {filteredChallenges.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: '#6b7280',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
            No challenges found
          </h3>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Performance indicator in development */}
      {import.meta.env.DEV && shouldVirtualize && (
        <div className="virtualization-stats" style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          fontSize: '10px',
          borderRadius: '0 0 0 4px',
          pointerEvents: 'none',
        }}>
          Virtual: {virtualRows.length}/{challengeGrid.length} rows
        </div>
      )}
    </div>
  );
};

// HOC for automatic React Profiler integration
export const ProfiledVirtualizedChallengeSelection = reactProfilerIntegration.withHotLeafProfiling(
  VirtualizedChallengeSelection,
  'VirtualizedChallengeSelection'
);

export default VirtualizedChallengeSelection;