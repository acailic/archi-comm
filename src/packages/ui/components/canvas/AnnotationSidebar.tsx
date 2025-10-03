/**
 * src/packages/ui/components/canvas/AnnotationSidebar.tsx
 * Sidebar for viewing and managing all canvas annotations
 * Provides search, filter, and navigation features for annotations
 * RELEVANT FILES: CanvasAnnotations.ts, AnnotationToolbar.tsx, DesignCanvas.tsx
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Filter, MessageSquare, FileText, Tag, ArrowRight, Highlighter, X, ChevronRight } from 'lucide-react';
import { cn } from '@core/utils';

export type AnnotationType = 'comment' | 'note' | 'label' | 'arrow' | 'highlight';

export interface Annotation {
  id: string;
  type: AnnotationType;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
  author?: string;
}

export interface AnnotationSidebarProps {
  annotations: Annotation[];
  selectedAnnotation: string | null;
  onAnnotationSelect: (annotationId: string) => void;
  onAnnotationDelete: (annotationId: string) => void;
  onAnnotationFocus: (annotationId: string) => void;
  className?: string;
}

const annotationIcons: Record<AnnotationType, React.ComponentType<{ size?: number; className?: string }>> = {
  comment: MessageSquare,
  note: FileText,
  label: Tag,
  arrow: ArrowRight,
  highlight: Highlighter,
};

const annotationColors: Record<AnnotationType, { bg: string; text: string; border: string }> = {
  comment: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  note: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  label: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  arrow: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  highlight: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
};

export const AnnotationSidebar: React.FC<AnnotationSidebarProps> = ({
  annotations,
  selectedAnnotation,
  onAnnotationSelect,
  onAnnotationDelete,
  onAnnotationFocus,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AnnotationType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'type'>('newest');

  // Filter and sort annotations
  const filteredAnnotations = useMemo(() => {
    let filtered = annotations;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ann =>
        ann.content.toLowerCase().includes(query) ||
        ann.author?.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(ann => ann.type === filterType);
    }

    // Apply sorting
    const sorted = [...filtered];
    if (sortBy === 'newest') {
      sorted.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sortBy === 'type') {
      sorted.sort((a, b) => a.type.localeCompare(b.type));
    }

    return sorted;
  }, [annotations, searchQuery, filterType, sortBy]);

  // Get annotation counts by type
  const annotationCounts = useMemo(() => {
    const counts: Record<AnnotationType, number> = {
      comment: 0,
      note: 0,
      label: 0,
      arrow: 0,
      highlight: 0,
    };
    annotations.forEach(ann => {
      counts[ann.type]++;
    });
    return counts;
  }, [annotations]);

  const handleAnnotationClick = useCallback((annotationId: string) => {
    onAnnotationSelect(annotationId);
    onAnnotationFocus(annotationId);
  }, [onAnnotationSelect, onAnnotationFocus]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  const truncateContent = (content: string, maxLength: number = 80): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div
      className={cn(
        'annotation-sidebar flex flex-col h-full bg-white border-l border-gray-200',
        className
      )}
      role="complementary"
      aria-label="Annotations panel"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Annotations ({annotations.length})
        </h2>

        {/* Search bar */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search annotations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-9 pr-3 py-2',
              'border border-gray-300 rounded-md',
              'text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFilterType('all')}
            className={cn(
              'px-2 py-1 text-xs rounded-md transition-colors',
              filterType === 'all'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            All ({annotations.length})
          </button>
          {(Object.keys(annotationIcons) as AnnotationType[]).map(type => {
            const Icon = annotationIcons[type];
            const count = annotationCounts[type];
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  'px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1',
                  filterType === type
                    ? `${annotationColors[type].bg} ${annotationColors[type].text} font-medium`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <Icon size={12} />
                {count}
              </button>
            );
          })}
        </div>

        {/* Sort options */}
        <div className="mt-3">
          <label className="text-xs text-gray-600 mb-1 block">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'type')}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="type">By type</option>
          </select>
        </div>
      </div>

      {/* Annotation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare size={48} className="text-gray-300 mb-3" />
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              {searchQuery || filterType !== 'all' ? 'No annotations found' : 'No annotations yet'}
            </h3>
            <p className="text-xs text-gray-500">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Use the annotation tools to add comments, notes, or labels'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAnnotations.map(annotation => {
              const Icon = annotationIcons[annotation.type];
              const colors = annotationColors[annotation.type];
              const isSelected = selectedAnnotation === annotation.id;

              return (
                <div
                  key={annotation.id}
                  onClick={() => handleAnnotationClick(annotation.id)}
                  className={cn(
                    'p-3 cursor-pointer transition-colors',
                    'hover:bg-gray-50',
                    isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  )}
                  role="button"
                  tabIndex={0}
                  aria-label={`${annotation.type} annotation`}
                >
                  <div className="flex items-start gap-2">
                    {/* Icon */}
                    <div className={cn('p-1.5 rounded', colors.bg)}>
                      <Icon size={14} className={colors.text} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-900 capitalize">
                          {annotation.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(annotation.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1 leading-tight">
                        {truncateContent(annotation.content)}
                      </p>
                      {annotation.author && (
                        <span className="text-xs text-gray-500">
                          by {annotation.author}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnnotationFocus(annotation.id);
                        }}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        title="Focus on canvas"
                        aria-label="Focus annotation on canvas"
                      >
                        <ChevronRight size={14} className="text-gray-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnnotationDelete(annotation.id);
                        }}
                        className="p-1 rounded hover:bg-red-100 transition-colors"
                        title="Delete annotation"
                        aria-label="Delete annotation"
                      >
                        <X size={14} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {annotations.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {filteredAnnotations.length} of {annotations.length} shown
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationSidebar;
