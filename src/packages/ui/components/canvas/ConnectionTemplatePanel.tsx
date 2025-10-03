/**
 * File: src/packages/ui/components/canvas/ConnectionTemplatePanel.tsx
 * Purpose: Panel for selecting connection templates during connection creation
 * Why: Helps users choose appropriate connection types with best practices
 * Related: connection-templates.ts, connection-validation.ts, DesignCanvasCore.tsx
 */

import { useState, useMemo } from 'react';
import { Search, X, Database, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { cx } from '../../../../lib/design/design-system';
import type { ConnectionTemplate } from '../../../canvas/config/connection-templates';

interface ConnectionTemplatePanelProps {
  sourceType: string;
  targetType: string;
  templates: ConnectionTemplate[];
  onSelectTemplate: (template: ConnectionTemplate) => void;
  onCancel: () => void;
  position?: { x: number; y: number };
}

const categoryIcons = {
  'data-flow': Database,
  'control-flow': RefreshCw,
  'sync': Zap,
};

const categoryLabels = {
  'data-flow': 'Data Flow',
  'control-flow': 'Control Flow',
  'sync': 'Synchronization',
};

/**
 * Panel that shows available connection templates
 */
export function ConnectionTemplatePanel({
  sourceType,
  targetType,
  templates,
  onSelectTemplate,
  onCancel,
  position,
}: ConnectionTemplatePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter templates by search and category
  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.defaultLabel.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory);
    }

    // Filter by source/target types
    filtered = filtered.filter(t => {
      const validSource = !t.validSourceTypes || t.validSourceTypes.includes(sourceType);
      const validTarget = !t.validTargetTypes || t.validTargetTypes.includes(targetType);
      return validSource && validTarget;
    });

    return filtered;
  }, [templates, searchQuery, selectedCategory, sourceType, targetType]);

  // Group by category
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ConnectionTemplate[]> = {};
    filteredTemplates.forEach(template => {
      if (!groups[template.category]) {
        groups[template.category] = [];
      }
      groups[template.category].push(template);
    });
    return groups;
  }, [filteredTemplates]);

  const categories = Object.keys(groupedTemplates);

  return (
    <div
      className={cx(
        'fixed z-[var(--z-modal)] bg-white rounded-lg shadow-2xl border-2 border-gray-900',
        'w-[400px] max-h-[600px] flex flex-col'
      )}
      style={
        position
          ? { left: position.x, top: position.y }
          : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="font-bold text-gray-900">Choose Connection Type</h3>
          <p className="text-xs text-gray-600 mt-1">
            {sourceType} → {targetType}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 p-3 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cx(
            'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
            !selectedCategory
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          All
        </button>
        {categories.map(category => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cx(
                'px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                'flex items-center gap-1.5',
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {categoryLabels[category as keyof typeof categoryLabels]}
            </button>
          );
        })}
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No templates found. Try a different search or category.
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => onSelectTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-600">
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
        </p>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: ConnectionTemplate;
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'w-full text-left p-3 rounded-md border-2 border-gray-200',
        'hover:border-blue-500 hover:bg-blue-50 transition-all',
        'group'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
          <ArrowRight className="w-4 h-4 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-gray-900 text-sm">{template.name}</h4>
            {template.defaultLabel && (
              <span className="flex-shrink-0 px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-700">
                {template.defaultLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{template.description}</p>

          {/* Metadata badges */}
          {template.metadata && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(template.metadata).slice(0, 2).map(([key, value]) => (
                <span
                  key={key}
                  className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-xs text-gray-600"
                >
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
