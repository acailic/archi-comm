/**
 * Virtualized Component Palette - Efficiently renders large component lists
 * Uses useListVirtualization hook for optimal performance with many components
 * Replaces current ComponentPalette with virtualized rendering
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import { useListVirtualization } from '@/shared/hooks/useVirtualization';
import { useSmartMemo } from '@/shared/hooks/performance/useSmartMemo';
import { useStableContracts } from '@/shared/hooks/performance/useStableContracts';
import { componentOptimizer } from '@/lib/performance/ComponentOptimizer';
import { reactProfilerIntegration } from '@/lib/performance/ReactProfilerIntegration';

export interface ComponentPaletteItem {
  id: string;
  type: string;
  label: string;
  description?: string;
  icon?: string;
  category: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface VirtualizedComponentPaletteProps {
  components: ComponentPaletteItem[];
  onComponentSelect?: (component: ComponentPaletteItem) => void;
  onComponentDragStart?: (component: ComponentPaletteItem, event: React.DragEvent) => void;
  selectedComponentId?: string;
  searchQuery?: string;
  categoryFilter?: string;
  containerHeight: number;
  containerWidth?: number;
  itemHeight?: number;
  groupByCategory?: boolean;
  enableVirtualization?: boolean;
  virtualizationThreshold?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface GroupedComponents {
  category: string;
  components: ComponentPaletteItem[];
  startIndex: number;
  endIndex: number;
}

// Single component item renderer
const ComponentPaletteItemRenderer: React.FC<{
  component: ComponentPaletteItem;
  style: React.CSSProperties;
  isSelected: boolean;
  onSelect: (component: ComponentPaletteItem) => void;
  onDragStart: (component: ComponentPaletteItem, event: React.DragEvent) => void;
}> = React.memo(({ component, style, isSelected, onSelect, onDragStart }) => {
  const handleClick = useCallback(() => {
    onSelect(component);
  }, [component, onSelect]);

  const handleDragStart = useCallback((event: React.DragEvent) => {
    onDragStart(component, event);
  }, [component, onDragStart]);

  const stableProps = useStableContracts({
    component,
    style,
    isSelected,
    onSelect,
    onDragStart,
  }, {
    componentName: 'ComponentPaletteItemRenderer',
  });

  return (
    <div
      style={stableProps.style}
      className={`component-palette-item ${stableProps.isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      draggable
      onDragStart={handleDragStart}
      data-component-id={stableProps.component.id}
      data-component-type={stableProps.component.type}
      role="button"
      tabIndex={0}
      aria-label={`${stableProps.component.label} component`}
      aria-selected={stableProps.isSelected}
    >
      {stableProps.component.icon && (
        <div className="component-icon">
          <i className={stableProps.component.icon} aria-hidden="true" />
        </div>
      )}
      <div className="component-info">
        <div className="component-label">{stableProps.component.label}</div>
        {stableProps.component.description && (
          <div className="component-description">{stableProps.component.description}</div>
        )}
        <div className="component-type">{stableProps.component.type}</div>
      </div>
    </div>
  );
});

ComponentPaletteItemRenderer.displayName = 'ComponentPaletteItemRenderer';

// Category header renderer for grouped view
const CategoryHeaderRenderer: React.FC<{
  category: string;
  style: React.CSSProperties;
  componentCount: number;
}> = React.memo(({ category, style, componentCount }) => (
  <div
    style={style}
    className="component-palette-category-header"
    role="heading"
    aria-level={3}
  >
    <h3>{category}</h3>
    <span className="component-count">({componentCount})</span>
  </div>
));

CategoryHeaderRenderer.displayName = 'CategoryHeaderRenderer';

export const VirtualizedComponentPalette: React.FC<VirtualizedComponentPaletteProps> = ({
  components,
  onComponentSelect,
  onComponentDragStart,
  selectedComponentId,
  searchQuery = '',
  categoryFilter,
  containerHeight,
  containerWidth = 250,
  itemHeight = 80,
  groupByCategory = false,
  enableVirtualization = true,
  virtualizationThreshold = 50,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Filter and search components
  const filteredComponents = useSmartMemo(() => {
    let filtered = components;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(component =>
        component.label.toLowerCase().includes(query) ||
        component.type.toLowerCase().includes(query) ||
        component.description?.toLowerCase().includes(query) ||
        component.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(component => component.category === categoryFilter);
    }

    return filtered;
  }, [components, searchQuery, categoryFilter], {
    componentName: 'VirtualizedComponentPalette',
    strategy: 'mixed',
  });

  // Group components by category if needed
  const groupedComponents = useSmartMemo(() => {
    if (!groupByCategory) {
      return null;
    }

    const groups = new Map<string, ComponentPaletteItem[]>();

    filteredComponents.forEach(component => {
      const category = component.category || 'Uncategorized';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(component);
    });

    const result: GroupedComponents[] = [];
    let currentIndex = 0;

    groups.forEach((categoryComponents, category) => {
      result.push({
        category,
        components: categoryComponents,
        startIndex: currentIndex,
        endIndex: currentIndex + categoryComponents.length,
      });
      currentIndex += categoryComponents.length + 1; // +1 for header
    });

    return result;
  }, [filteredComponents, groupByCategory], {
    componentName: 'VirtualizedComponentPalette',
    strategy: 'deep',
  });

  // Create flat list for virtualization (including headers if grouped)
  const flattenedItems = useSmartMemo(() => {
    if (!groupByCategory || !groupedComponents) {
      return filteredComponents.map((component, index) => ({
        type: 'component' as const,
        component,
        index,
      }));
    }

    const items: Array<{
      type: 'header' | 'component';
      component?: ComponentPaletteItem;
      category?: string;
      componentCount?: number;
      index: number;
    }> = [];

    let index = 0;
    groupedComponents.forEach(group => {
      // Add category header
      items.push({
        type: 'header',
        category: group.category,
        componentCount: group.components.length,
        index: index++,
      });

      // Add components in category
      group.components.forEach(component => {
        items.push({
          type: 'component',
          component,
          index: index++,
        });
      });
    });

    return items;
  }, [filteredComponents, groupedComponents, groupByCategory], {
    componentName: 'VirtualizedComponentPalette',
    strategy: 'deep',
  });

  // Determine if virtualization should be enabled
  const shouldVirtualize = enableVirtualization && flattenedItems.length > virtualizationThreshold;

  // Virtualization configuration
  const virtualizationConfig = useMemo(() => ({
    itemHeight,
    overscan: 5,
    threshold: virtualizationThreshold,
    enabled: shouldVirtualize,
    containerHeight,
    containerWidth,
    getItemId: (item: any, index: number) => {
      if (item.type === 'header') {
        return `header-${item.category}`;
      }
      return item.component?.id || `item-${index}`;
    },
  }), [itemHeight, virtualizationThreshold, shouldVirtualize, containerHeight, containerWidth]);

  // Use virtualization hook
  const { virtualItems, totalHeight, scrollToIndex } = useListVirtualization(
    flattenedItems,
    virtualizationConfig
  );

  // Stable callback handlers
  const stableCallbacks = useStableContracts({
    onComponentSelect: onComponentSelect || (() => {}),
    onComponentDragStart: onComponentDragStart || (() => {}),
  }, {
    componentName: 'VirtualizedComponentPalette',
  });

  // Scroll event handler
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    setScrollTop(target.scrollTop);
  }, []);

  // Scroll to specific component
  const scrollToComponent = useCallback((componentId: string) => {
    const itemIndex = flattenedItems.findIndex(item =>
      item.type === 'component' && item.component?.id === componentId
    );

    if (itemIndex !== -1) {
      scrollToIndex(itemIndex);
    }
  }, [flattenedItems, scrollToIndex]);

  // Auto-scroll to selected component
  React.useEffect(() => {
    if (selectedComponentId) {
      scrollToComponent(selectedComponentId);
    }
  }, [selectedComponentId, scrollToComponent]);

  // Render virtual items
  const renderVirtualItem = useCallback((virtualItem: any) => {
    const item = virtualItem.item;

    if (item.type === 'header') {
      return (
        <CategoryHeaderRenderer
          key={`header-${item.category}`}
          category={item.category}
          componentCount={item.componentCount}
          style={virtualItem.style}
        />
      );
    }

    if (item.type === 'component' && item.component) {
      const isSelected = item.component.id === selectedComponentId;

      return (
        <ComponentPaletteItemRenderer
          key={item.component.id}
          component={item.component}
          style={virtualItem.style}
          isSelected={isSelected}
          onSelect={stableCallbacks.onComponentSelect}
          onDragStart={stableCallbacks.onComponentDragStart}
        />
      );
    }

    return null;
  }, [selectedComponentId, stableCallbacks]);

  // Performance tracking
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      componentOptimizer.recordSample({
        componentId: 'VirtualizedComponentPalette',
        duration: performance.now(),
        timestamp: Date.now(),
        commitType: 'update',
        propsChanged: ['components', 'searchQuery', 'categoryFilter'],
      });
    }
  }, [components, searchQuery, categoryFilter]);

  const containerStyle = useMemo(() => ({
    ...style,
    height: containerHeight,
    width: containerWidth,
    overflow: 'auto',
    position: 'relative' as const,
  }), [style, containerHeight, containerWidth]);

  if (!shouldVirtualize) {
    // Render without virtualization for small lists
    return (
      <div
        ref={containerRef}
        className={`component-palette ${className || ''}`}
        style={containerStyle}
        onScroll={handleScroll}
        role="listbox"
        aria-label="Component palette"
      >
        <div style={{ height: totalHeight }}>
          {flattenedItems.map((item, index) => {
            if (item.type === 'header') {
              return (
                <CategoryHeaderRenderer
                  key={`header-${item.category}`}
                  category={item.category!}
                  componentCount={item.componentCount!}
                  style={{
                    position: 'absolute',
                    top: index * itemHeight,
                    left: 0,
                    width: containerWidth,
                    height: itemHeight,
                  }}
                />
              );
            }

            if (item.type === 'component' && item.component) {
              const isSelected = item.component.id === selectedComponentId;

              return (
                <ComponentPaletteItemRenderer
                  key={item.component.id}
                  component={item.component}
                  style={{
                    position: 'absolute',
                    top: index * itemHeight,
                    left: 0,
                    width: containerWidth,
                    height: itemHeight,
                  }}
                  isSelected={isSelected}
                  onSelect={stableCallbacks.onComponentSelect}
                  onDragStart={stableCallbacks.onComponentDragStart}
                />
              );
            }

            return null;
          })}
        </div>
      </div>
    );
  }

  // Render with virtualization
  return (
    <div
      ref={containerRef}
      className={`component-palette virtualized ${className || ''}`}
      style={containerStyle}
      onScroll={handleScroll}
      role="listbox"
      aria-label="Component palette"
      data-virtualized="true"
      data-total-items={flattenedItems.length}
      data-visible-items={virtualItems.length}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualItems.map(renderVirtualItem)}
      </div>

      {/* Performance indicator in development */}
      {import.meta.env.DEV && (
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
          Virtual: {virtualItems.length}/{flattenedItems.length}
        </div>
      )}
    </div>
  );
};

// HOC for automatic React Profiler integration
export const ProfiledVirtualizedComponentPalette = reactProfilerIntegration.withHotLeafProfiling(
  VirtualizedComponentPalette,
  'VirtualizedComponentPalette'
);

export default VirtualizedComponentPalette;