/**
 * src/packages/ui/components/canvas/ComponentTemplateLibrary.tsx
 * Component template library for quick diagram creation
 * Provides pre-built architecture templates for common patterns
 * RELEVANT FILES: template-library.ts, canvasStore.ts, CanvasToolbar.tsx
 */

import React, { useState, useMemo } from 'react';
import { Search, Grid, List, X, Plus } from 'lucide-react';
import { getAllTemplates, getTemplatesByCategory, searchTemplates, type DiagramTemplate } from '@/lib/canvas/template-library';
import { useCanvasActions } from '@/stores/canvasStore';
import { newComponentId, newConnectionId } from '@/lib/utils/id';
import { toast } from 'sonner';

export interface ComponentTemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ComponentTemplateLibrary: React.FC<ComponentTemplateLibraryProps> = ({
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const canvasActions = useCanvasActions();

  const templates = useMemo(() => {
    let filtered = getAllTemplates();

    if (selectedCategory !== 'all') {
      filtered = getTemplatesByCategory(selectedCategory as DiagramTemplate['category']);
    }

    if (searchQuery.trim()) {
      filtered = searchTemplates(searchQuery);
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const allTemplates = getAllTemplates();
    const cats = new Set(allTemplates.map(t => t.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const handleApplyTemplate = (template: DiagramTemplate) => {
    try {
      // Generate IDs for components and connections
      const componentsWithIds = template.components.map(component => ({
        ...component,
        id: newComponentId(),
      }));

      const connectionsWithIds = template.connections.map(connection => ({
        ...connection,
        id: newConnectionId(),
      }));

      // Apply template components and connections
      canvasActions.updateCanvasData({
        components: componentsWithIds,
        connections: connectionsWithIds,
      });

      toast.success('Template applied!', {
        description: `Applied "${template.name}" template with ${componentsWithIds.length} components`,
      });

      onClose();
    } catch (error) {
      console.error('Failed to apply template:', error);
      toast.error('Failed to apply template');
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Template Library</h2>
            <p className="text-sm text-gray-600 mt-1">Choose from pre-built architecture templates</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category === 'all' ? 'All Templates' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid/List */}
        <div className="flex-1 overflow-y-auto p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-2">
                <Grid className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No templates found</h3>
              <p className="text-gray-600">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-3'
            }>
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  viewMode={viewMode}
                  onApply={() => handleApplyTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{templates.length} template{templates.length !== 1 ? 's' : ''} available</span>
            <span>Templates help you get started quickly</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TemplateCardProps {
  template: DiagramTemplate;
  viewMode: 'grid' | 'list';
  onApply: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, viewMode, onApply }) => {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{template.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{template.components.length} components</span>
            <span>{template.connections.length} connections</span>
            <span className="capitalize">{template.category}</span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{template.tags.length - 3} more</span>
            )}
          </div>
        </div>
        <button
          onClick={onApply}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Apply
        </button>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="aspect-video bg-gray-50 rounded mb-3 flex items-center justify-center">
        {/* Placeholder for template preview */}
        <div className="text-center text-gray-400">
          <Grid className="w-8 h-8 mx-auto mb-2" />
          <span className="text-xs">Preview</span>
        </div>
      </div>

      <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
        <span>{template.components.length} components</span>
        <span>{template.connections.length} connections</span>
      </div>

      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {template.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 2 && (
          <span className="text-xs text-gray-400">+{template.tags.length - 2}</span>
        )}
      </div>

      <button
        onClick={onApply}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Apply Template
      </button>
    </div>
  );
};