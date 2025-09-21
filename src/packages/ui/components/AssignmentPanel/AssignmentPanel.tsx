/**
 * Optimized Assignment Panel - Uses virtualization and lazy loading for performance
 * Implements strategic memoization and efficient rendering for assignment content
 */

import React, { Suspense, useMemo, useCallback, useState } from 'react';
import { useSmartMemo } from '@/shared/hooks/performance/useSmartMemo';
import { useStableContracts } from '@/shared/hooks/performance/useStableContracts';
import { useLazyComponent, usePreloadComponents } from '@/lib/lazy-loading/ComponentLazyLoader';
import { useListVirtualization } from '@/shared/hooks/useVirtualization';
import { reactProfilerIntegration } from '@/lib/performance/ReactProfilerIntegration';
import { componentOptimizer } from '@/lib/performance/ComponentOptimizer';
import type { Challenge, DesignComponent } from '@shared/contracts';

export interface AssignmentPanelProps {
  challenge: Challenge;
  progress: {
    componentsPlaced: number;
    connectionsCreated: number;
    completionPercentage: number;
    timeSpent: number;
  };
  currentComponents: DesignComponent[];
  className?: string;
  onRequirementClick?: (requirement: string) => void;
  onConceptClick?: (concept: string) => void;
}

interface RequirementItem {
  id: string;
  text: string;
  isCompleted: boolean;
  type: 'component' | 'connection' | 'feature';
  priority: 'high' | 'medium' | 'low';
}

// Lazy-loaded components for better performance
const LazyMarkdownRenderer = React.lazy(() =>
  import('@/packages/ui/components/common/MarkdownRenderer')
);

const LazyProgressVisualization = React.lazy(() =>
  import('@/packages/ui/components/common/ProgressVisualization')
);

// Virtualized requirement item component
const RequirementItemRenderer: React.FC<{
  requirement: RequirementItem;
  style: React.CSSProperties;
  onRequirementClick: (requirement: string) => void;
}> = React.memo(({ requirement, style, onRequirementClick }) => {
  const handleClick = useCallback(() => {
    onRequirementClick(requirement.text);
  }, [requirement.text, onRequirementClick]);

  const getPriorityColor = (priority: RequirementItem['priority']) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: RequirementItem['type']) => {
    switch (type) {
      case 'component': return '🧩';
      case 'connection': return '🔗';
      case 'feature': return '⚡';
      default: return '📋';
    }
  };

  return (
    <div
      style={{
        ...style,
        padding: '8px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className={`requirement-item ${requirement.isCompleted ? 'completed' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`Requirement: ${requirement.text}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          borderRadius: '8px',
          border: `1px solid ${requirement.isCompleted ? '#10b981' : '#e5e7eb'}`,
          backgroundColor: requirement.isCompleted ? '#f0fdf4' : '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {/* Completion checkbox */}
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '4px',
          border: `2px solid ${requirement.isCompleted ? '#10b981' : '#d1d5db'}`,
          backgroundColor: requirement.isCompleted ? '#10b981' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          {requirement.isCompleted && (
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
          )}
        </div>

        {/* Type icon */}
        <span style={{ fontSize: '16px', flexShrink: 0 }}>
          {getTypeIcon(requirement.type)}
        </span>

        {/* Requirement text */}
        <span style={{
          flex: 1,
          fontSize: '14px',
          lineHeight: '1.4',
          color: requirement.isCompleted ? '#059669' : '#374151',
          textDecoration: requirement.isCompleted ? 'line-through' : 'none',
        }}>
          {requirement.text}
        </span>

        {/* Priority indicator */}
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getPriorityColor(requirement.priority),
          flexShrink: 0,
        }} />
      </div>
    </div>
  );
});

RequirementItemRenderer.displayName = 'RequirementItemRenderer';

// Key concepts component with lazy loading
const KeyConceptsSection: React.FC<{
  concepts: string[];
  onConceptClick: (concept: string) => void;
}> = React.memo(({ concepts, onConceptClick }) => {
  if (concepts.length === 0) return null;

  return (
    <div className="key-concepts-section" style={{ marginBottom: '24px' }}>
      <h3 style={{
        fontSize: '16px',
        fontWeight: '600',
        marginBottom: '12px',
        color: '#1f2937',
      }}>
        Key Concepts
      </h3>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        {concepts.map((concept, index) => (
          <button
            key={`${concept}-${index}`}
            onClick={() => onConceptClick(concept)}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f8fafc',
              fontSize: '12px',
              fontWeight: '500',
              color: '#3b82f6',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#eff6ff';
              e.currentTarget.style.borderColor = '#3b82f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            {concept}
          </button>
        ))}
      </div>
    </div>
  );
});

KeyConceptsSection.displayName = 'KeyConceptsSection';

export const AssignmentPanel: React.FC<AssignmentPanelProps> = ({
  challenge,
  progress,
  currentComponents,
  className,
  onRequirementClick,
  onConceptClick,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    description: true,
    requirements: true,
    concepts: true,
    progress: true,
  });

  // Preload components that might be used
  usePreloadComponents(['react-hook-form', 'zod']);

  // Smart memoization for requirements processing
  const processedRequirements = useSmartMemo(() => {
    const requirements: RequirementItem[] = challenge.requirements.map((req, index) => {
      // Basic completion detection logic (can be enhanced)
      const isComponentRequirement = req.toLowerCase().includes('component') ||
                                   req.toLowerCase().includes('service') ||
                                   req.toLowerCase().includes('database');
      const isConnectionRequirement = req.toLowerCase().includes('connect') ||
                                    req.toLowerCase().includes('communication') ||
                                    req.toLowerCase().includes('flow');

      let isCompleted = false;
      let type: RequirementItem['type'] = 'feature';

      if (isComponentRequirement) {
        type = 'component';
        // Check if we have enough components
        isCompleted = currentComponents.length >= 2;
      } else if (isConnectionRequirement) {
        type = 'connection';
        // Basic completion check for connections
        isCompleted = progress.connectionsCreated > 0;
      } else {
        // Feature requirement
        isCompleted = progress.completionPercentage > 50;
      }

      // Determine priority based on keywords
      let priority: RequirementItem['priority'] = 'medium';
      if (req.toLowerCase().includes('must') || req.toLowerCase().includes('required')) {
        priority = 'high';
      } else if (req.toLowerCase().includes('optional') || req.toLowerCase().includes('consider')) {
        priority = 'low';
      }

      return {
        id: `req-${index}`,
        text: req,
        isCompleted,
        type,
        priority,
      };
    });

    return requirements;
  }, [challenge.requirements, currentComponents.length, progress], {
    componentName: 'AssignmentPanel',
    strategy: 'mixed',
    expensiveThreshold: 10,
  });

  // Stable contracts for callbacks
  const stableCallbacks = useStableContracts({
    onRequirementClick: onRequirementClick || (() => {}),
    onConceptClick: onConceptClick || (() => {}),
  }, {
    componentName: 'AssignmentPanel',
  });

  // Virtualization for requirements list
  const { virtualItems, totalHeight } = useListVirtualization(
    processedRequirements,
    {
      itemHeight: 70,
      overscan: 3,
      containerHeight: 300,
      enabled: processedRequirements.length > 10,
    }
  );

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  // Performance tracking
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      componentOptimizer.recordSample({
        componentId: 'AssignmentPanel',
        duration: performance.now(),
        timestamp: Date.now(),
        commitType: 'update',
        propsChanged: ['challenge', 'progress', 'currentComponents'],
      });
    }
  }, [challenge, progress, currentComponents]);

  const containerStyle = useMemo(() => ({
    height: '100%',
    overflowY: 'auto' as const,
    padding: '16px',
    backgroundColor: '#ffffff',
  }), []);

  return (
    <div
      className={`assignment-panel ${className || ''}`}
      style={containerStyle}
      role="complementary"
      aria-label="Assignment details and requirements"
    >
      {/* Challenge Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1f2937',
            margin: 0,
          }}>
            {challenge.title}
          </h2>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{
              padding: '4px 8px',
              borderRadius: '12px',
              backgroundColor: challenge.difficulty === 'beginner' ? '#10b981' :
                              challenge.difficulty === 'intermediate' ? '#f59e0b' : '#ef4444',
              color: 'white',
              fontSize: '12px',
              fontWeight: '500',
              textTransform: 'capitalize',
            }}>
              {challenge.difficulty}
            </span>
            <span style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '500',
            }}>
              {challenge.estimatedTime}min
            </span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {expandedSections.progress && (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => toggleSection('progress')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 0',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0,
            }}>
              Progress
            </h3>
            <span>{expandedSections.progress ? '▼' : '▶'}</span>
          </button>

          <Suspense fallback={<div>Loading progress...</div>}>
            <LazyProgressVisualization
              progress={progress}
              showDetails={true}
            />
          </Suspense>
        </div>
      )}

      {/* Description Section */}
      {expandedSections.description && (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => toggleSection('description')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 0',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0,
            }}>
              Description
            </h3>
            <span>{expandedSections.description ? '▼' : '▶'}</span>
          </button>

          <Suspense fallback={<div>Loading description...</div>}>
            <LazyMarkdownRenderer content={challenge.description} />
          </Suspense>
        </div>
      )}

      {/* Key Concepts Section */}
      {challenge.keyConcepts && challenge.keyConcepts.length > 0 && expandedSections.concepts && (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => toggleSection('concepts')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 0',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0,
            }}>
              Key Concepts
            </h3>
            <span>{expandedSections.concepts ? '▼' : '▶'}</span>
          </button>

          <KeyConceptsSection
            concepts={challenge.keyConcepts}
            onConceptClick={stableCallbacks.onConceptClick}
          />
        </div>
      )}

      {/* Requirements Section */}
      {expandedSections.requirements && (
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => toggleSection('requirements')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '8px 0',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0,
            }}>
              Requirements ({processedRequirements.filter(r => r.isCompleted).length}/{processedRequirements.length})
            </h3>
            <span>{expandedSections.requirements ? '▼' : '▶'}</span>
          </button>

          {/* Virtualized requirements list */}
          <div style={{
            height: processedRequirements.length > 10 ? '300px' : 'auto',
            position: 'relative',
            overflow: 'auto',
          }}>
            {processedRequirements.length <= 10 ? (
              // Render without virtualization for small lists
              <div>
                {processedRequirements.map((requirement, index) => (
                  <RequirementItemRenderer
                    key={requirement.id}
                    requirement={requirement}
                    style={{
                      position: 'relative',
                      height: '70px',
                      marginBottom: '8px',
                    }}
                    onRequirementClick={stableCallbacks.onRequirementClick}
                  />
                ))}
              </div>
            ) : (
              // Use virtualization for large lists
              <div style={{ height: totalHeight, position: 'relative' }}>
                {virtualItems.map((virtualItem) => (
                  <RequirementItemRenderer
                    key={virtualItem.item.id}
                    requirement={virtualItem.item}
                    style={virtualItem.style}
                    onRequirementClick={stableCallbacks.onRequirementClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance indicator in development */}
      {import.meta.env.DEV && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          fontSize: '10px',
          borderRadius: '4px',
          pointerEvents: 'none',
          zIndex: 1000,
        }}>
          Assignment Panel - {processedRequirements.length} items
          {processedRequirements.length > 10 && ' (virtualized)'}
        </div>
      )}
    </div>
  );
};

// HOC for automatic React Profiler integration
export const ProfiledAssignmentPanel = reactProfilerIntegration.withHotLeafProfiling(
  AssignmentPanel,
  'AssignmentPanel'
);

export default AssignmentPanel;