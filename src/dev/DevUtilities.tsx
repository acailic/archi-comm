// src/dev/DevUtilities.tsx
// Development utilities component providing state inspector, component props viewer, and debugging tools
// Includes floating panel with real-time debugging information and JSON export functionality
// RELEVANT FILES: ./DevShortcuts.tsx, ./ScenarioViewer.tsx, @ui/components/ui/card.tsx, @ui/components/ui/button.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import {
  Monitor,
  Copy,
  Download,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Clock,
  MemoryStick,
  Zap,
  Settings,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@ui/components/ui/card';
import { Button } from '@ui/components/ui/button';
import { Badge } from '@ui/components/ui/badge';
import { Input } from '@ui/components/ui/input';
import { PropControls } from './components/PropControls';
import type { ControlsConfig, PropChangeEvent } from './types';

export interface DevUtilitiesProps {
  isStateInspectorOpen: boolean;
  isPropsViewerOpen: boolean;
  currentScenario?: any;
  scenarioState?: any;
  dynamicProps?: Record<string, any>;
  mergedProps?: Record<string, any>;
  controls?: ControlsConfig;
  onPropChange?: (event: PropChangeEvent) => void;
  onResetProps?: () => void;
  onCopyProps?: (props: Record<string, any>) => void;
  onClose: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

interface PerformanceMetrics {
  renderTime: number;
  updateCount: number;
  memoryUsage: number;
  lastRender: Date;
}

// Reusable filter helper: filters by search query and optional type
function filterObjectEntries<T extends Record<string, any>>(
  obj: T | undefined | null,
  searchQuery: string,
  filterType?: string
): Record<string, any> {
  if (!obj) return {};

  const query = searchQuery.trim().toLowerCase();
  const typeFilter = filterType && filterType !== 'all' ? filterType : null;

  const safeJSONStringify = (value: any): string => {
    const seen = new WeakSet();
    try {
      return (
        JSON.stringify(value, function replacer(_key, val) {
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) return '[Circular]';
            seen.add(val);
          }
          if (typeof val === 'function') return '[Function]';
          return val;
        })?.toLowerCase?.() ?? ''
      );
    } catch {
      try {
        return String(value).toLowerCase();
      } catch {
        return '';
      }
    }
  };

  const entries = Object.entries(obj as Record<string, any>).filter(([key, value]) => {
    const matchesSearch = query
      ? key.toLowerCase().includes(query) || safeJSONStringify(value).includes(query)
      : true;
    if (!matchesSearch) return false;
    if (typeFilter) {
      const type = Array.isArray(value) ? 'array' : typeof value;
      return type === typeFilter;
    }
    return true;
  });

  return Object.fromEntries(entries);
}

/**
 * JSON viewer component with collapsible nodes
 */
function JsonViewer({
  data,
  maxDepth = 3,
  currentDepth = 0,
}: {
  data: any;
  maxDepth?: number;
  currentDepth?: number;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpanded = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderValue = (key: string, value: any, depth: number): React.ReactNode => {
    const isExpanded = expanded[key] || depth < 2;
    const type = Array.isArray(value) ? 'array' : typeof value;

    if (value === null) return <span className='text-gray-500'>null</span>;
    if (value === undefined) return <span className='text-gray-500'>undefined</span>;

    if (type === 'object' || type === 'array') {
      if (depth >= maxDepth) {
        return <span className='text-gray-400'>{type === 'array' ? '[...]' : '{...}'}</span>;
      }

      const isEmpty = type === 'array' ? value.length === 0 : Object.keys(value).length === 0;
      if (isEmpty) {
        return <span className='text-gray-500'>{type === 'array' ? '[]' : '{}'}</span>;
      }

      return (
        <div className='ml-2'>
          <button
            onClick={() => toggleExpanded(key)}
            className='flex items-center gap-1 text-sm hover:bg-gray-100 px-1 rounded'
          >
            {isExpanded ? (
              <ChevronDown className='h-3 w-3' />
            ) : (
              <ChevronRight className='h-3 w-3' />
            )}
            <span className='text-purple-600'>{type === 'array' ? 'Array' : 'Object'}</span>
            <span className='text-gray-500 text-xs'>
              ({type === 'array' ? value.length : Object.keys(value).length})
            </span>
          </button>
          {isExpanded && (
            <div className='ml-4 border-l border-gray-200 pl-2'>
              {(type === 'array' ? value : Object.entries(value)).map((item, index) => {
                const [itemKey, itemValue] = type === 'array' ? [index, item] : item;
                const itemKeyString = `${key}.${itemKey}`;
                return (
                  <div key={itemKeyString} className='py-1'>
                    <span className='text-blue-600 text-sm font-mono'>{itemKey}:</span>{' '}
                    {renderValue(itemKeyString, itemValue, depth + 1)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (type === 'string') {
      return <span className='text-green-600'>"{value}"</span>;
    }

    if (type === 'number') {
      return <span className='text-orange-600'>{value}</span>;
    }

    if (type === 'boolean') {
      return <span className='text-purple-600'>{value.toString()}</span>;
    }

    if (type === 'function') {
      return <span className='text-gray-500'>[Function]</span>;
    }

    return <span className='text-gray-800'>{String(value)}</span>;
  };

  return (
    <div className='font-mono text-sm'>
      {Object.entries(data || {}).map(([key, value]) => (
        <div key={key} className='py-1'>
          <span className='text-blue-600 font-semibold'>{key}:</span>{' '}
          {renderValue(key, value, currentDepth)}
        </div>
      ))}
    </div>
  );
}

/**
 * Performance metrics display component
 */
function PerformancePanel({ metrics }: { metrics: PerformanceMetrics }) {
  return (
    <div className='grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg'>
      <div className='flex items-center gap-2'>
        <Clock className='h-4 w-4 text-blue-500' />
        <div>
          <div className='text-sm font-medium'>Render Time</div>
          <div className='text-xs text-gray-600'>{metrics.renderTime.toFixed(2)}ms</div>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <Zap className='h-4 w-4 text-yellow-500' />
        <div>
          <div className='text-sm font-medium'>Updates</div>
          <div className='text-xs text-gray-600'>{metrics.updateCount}</div>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <MemoryStick className='h-4 w-4 text-red-500' />
        <div>
          <div className='text-sm font-medium'>Memory</div>
          <div className='text-xs text-gray-600'>{(metrics.memoryUsage / 1024).toFixed(1)}KB</div>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        <Monitor className='h-4 w-4 text-green-500' />
        <div>
          <div className='text-sm font-medium'>Last Render</div>
          <div className='text-xs text-gray-600'>{metrics.lastRender.toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main development utilities component
 */
export function DevUtilities({
  isStateInspectorOpen,
  isPropsViewerOpen,
  currentScenario,
  scenarioState,
  dynamicProps = {},
  mergedProps = {},
  controls,
  onPropChange,
  onResetProps,
  onCopyProps,
  onClose,
  position = 'bottom-right',
}: DevUtilitiesProps) {
  const [activeTab, setActiveTab] = useState<'state' | 'props' | 'performance' | 'controls'>(
    'state'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    updateCount: 0,
    memoryUsage: 0,
    lastRender: new Date(),
  });

  // Track render start time using a ref set during render
  const renderStartRef = useRef<number>(0);
  renderStartRef.current = performance.now();

  // Measure render duration after paint without updating state in cleanup
  useLayoutEffect(() => {
    const rafId = requestAnimationFrame(() => {
      const endTime = performance.now();
      setPerformanceMetrics(prev => ({
        renderTime: endTime - renderStartRef.current,
        updateCount: prev.updateCount + 1,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        lastRender: new Date(),
      }));
    });
    return () => cancelAnimationFrame(rafId);
  }, [currentScenario, scenarioState]);

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  // Debounce search input to reduce frequent filtering
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(id);
  }, [searchQuery]);

  // Filter and search functionality (state)
  const filteredState = useMemo(() => {
    return filterObjectEntries(scenarioState || {}, debouncedSearch, filterType);
  }, [scenarioState, debouncedSearch, filterType]);

  const filteredProps = useMemo(() => {
    const props = mergedProps || currentScenario?.props || {};
    return filterObjectEntries(props, debouncedSearch, filterType);
  }, [mergedProps, currentScenario?.props, debouncedSearch, filterType]);

  // Enhanced props data with control information
  const enhancedProps = useMemo(() => {
    const props = { ...filteredProps };
    const propsWithMeta: Record<string, any> = {};

    Object.entries(props).forEach(([key, value]) => {
      const control = controls?.[key];
      propsWithMeta[key] = {
        value,
        type: Array.isArray(value) ? 'array' : typeof value,
        isModified: key in dynamicProps,
        hasControl: Boolean(control),
        controlType: control?.type,
        defaultValue: control?.defaultValue,
      };
    });

    return propsWithMeta;
  }, [filteredProps, controls, dynamicProps]);

  // Export functionality
  const handleExportData = useCallback(() => {
    const exportData = {
      scenario: currentScenario?.name || 'Unknown',
      timestamp: new Date().toISOString(),
      state: filteredState,
      props: filteredProps,
      performance: performanceMetrics,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `scenario-debug-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentScenario, filteredState, filteredProps, performanceMetrics]);

  const handleCopyData = useCallback(async () => {
    const data =
      activeTab === 'state'
        ? filteredState
        : activeTab === 'controls'
          ? mergedProps
          : filteredProps;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [activeTab, filteredState, filteredProps, mergedProps]);

  if (!isStateInspectorOpen && !isPropsViewerOpen) return null;

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 w-96 max-w-[90vw] max-h-[80vh] overflow-hidden`}
    >
      <Card className='bg-white border-gray-300 shadow-lg'>
        <CardHeader className='pb-2'>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-sm font-semibold flex items-center gap-2'>
              <Monitor className='h-4 w-4' />
              Dev Utilities
            </CardTitle>
            <Button variant='ghost' size='sm' onClick={onClose} className='h-6 w-6 p-0'>
              <X className='h-4 w-4' />
            </Button>
          </div>

          {/* Tabs */}
          <div className='flex gap-1'>
            <Button
              variant={activeTab === 'state' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setActiveTab('state')}
              className='text-xs'
            >
              State
            </Button>
            <Button
              variant={activeTab === 'props' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setActiveTab('props')}
              className='text-xs'
            >
              Props
            </Button>
            {controls && (
              <Button
                variant={activeTab === 'controls' ? 'secondary' : 'ghost'}
                size='sm'
                onClick={() => setActiveTab('controls')}
                className='text-xs'
              >
                <Settings className='h-3 w-3 mr-1' />
                Controls
              </Button>
            )}
            <Button
              variant={activeTab === 'performance' ? 'secondary' : 'ghost'}
              size='sm'
              onClick={() => setActiveTab('performance')}
              className='text-xs'
            >
              Performance
            </Button>
          </div>

          {/* Search and Filter */}
          {activeTab !== 'performance' && activeTab !== 'controls' && (
            <div className='flex gap-2'>
              <div className='relative flex-1'>
                <Search className='absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400' />
                <Input
                  placeholder='Search...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='text-xs h-8 pl-7'
                />
              </div>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className='text-xs border rounded px-2 h-8'
              >
                <option value='all'>All Types</option>
                <option value='string'>String</option>
                <option value='number'>Number</option>
                <option value='boolean'>Boolean</option>
                <option value='object'>Object</option>
                <option value='array'>Array</option>
                <option value='function'>Function</option>
              </select>
            </div>
          )}
        </CardHeader>

        <CardContent className='pt-0'>
          {/* Content based on active tab */}
          <div className='max-h-96 overflow-auto'>
            {activeTab === 'state' && (
              <div>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-xs'>
                      {Object.keys(filteredState).length} items
                    </Badge>
                    {currentScenario?.name && (
                      <Badge variant='secondary' className='text-xs'>
                        {currentScenario.name}
                      </Badge>
                    )}
                  </div>
                  <div className='flex gap-1'>
                    <Button variant='ghost' size='sm' onClick={handleCopyData} className='h-6 px-2'>
                      <Copy className='h-3 w-3' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={handleExportData}
                      className='h-6 px-2'
                    >
                      <Download className='h-3 w-3' />
                    </Button>
                  </div>
                </div>

                {Object.keys(filteredState).length === 0 ? (
                  <div className='text-center py-8 text-gray-500 text-sm'>
                    {searchQuery || filterType !== 'all'
                      ? 'No matching state found'
                      : 'No state data available'}
                  </div>
                ) : (
                  <JsonViewer data={filteredState} />
                )}
              </div>
            )}

            {activeTab === 'props' && (
              <div>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-xs'>
                      {Object.keys(filteredProps).length} props
                    </Badge>
                    {Object.keys(dynamicProps).length > 0 && (
                      <Badge variant='secondary' className='text-xs'>
                        {Object.keys(dynamicProps).length} modified
                      </Badge>
                    )}
                  </div>
                  <div className='flex gap-1'>
                    <Button variant='ghost' size='sm' onClick={handleCopyData} className='h-6 px-2'>
                      <Copy className='h-3 w-3' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={handleExportData}
                      className='h-6 px-2'
                    >
                      <Download className='h-3 w-3' />
                    </Button>
                    {controls && onResetProps && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={onResetProps}
                        className='h-6 px-2'
                        disabled={Object.keys(dynamicProps).length === 0}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                {Object.keys(filteredProps).length === 0 ? (
                  <div className='text-center py-8 text-gray-500 text-sm'>
                    {searchQuery ? 'No matching props found' : 'No props data available'}
                  </div>
                ) : (
                  <div>
                    {controls ? (
                      <div className='space-y-2'>
                        {Object.entries(enhancedProps).map(([key, propData]) => (
                          <div key={key} className='p-2 border rounded bg-gray-50'>
                            <div className='flex items-center justify-between mb-1'>
                              <span className='text-sm font-mono text-blue-600'>{key}:</span>
                              <div className='flex gap-1'>
                                {propData.isModified && (
                                  <Badge variant='secondary' className='text-xs px-1 py-0'>
                                    Modified
                                  </Badge>
                                )}
                                {propData.hasControl && (
                                  <Badge variant='outline' className='text-xs px-1 py-0'>
                                    {propData.controlType}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className='text-sm'>
                              <span
                                className={`font-mono ${
                                  propData.type === 'string'
                                    ? 'text-green-600'
                                    : propData.type === 'number'
                                      ? 'text-orange-600'
                                      : propData.type === 'boolean'
                                        ? 'text-purple-600'
                                        : 'text-gray-600'
                                }`}
                              >
                                {propData.type === 'string'
                                  ? `"${propData.value}"`
                                  : String(propData.value)}
                              </span>
                              {propData.defaultValue !== undefined &&
                                propData.defaultValue !== propData.value && (
                                  <div className='text-xs text-gray-500 mt-1'>
                                    Default:{' '}
                                    {propData.type === 'string'
                                      ? `"${propData.defaultValue}"`
                                      : String(propData.defaultValue)}
                                  </div>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <JsonViewer data={filteredProps} />
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'controls' && controls && (
              <div>
                <div className='flex items-center justify-between mb-3'>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-xs'>
                      {Object.keys(controls).length} controls
                    </Badge>
                    {Object.keys(dynamicProps).length > 0 && (
                      <Badge variant='secondary' className='text-xs'>
                        {Object.keys(dynamicProps).length} active
                      </Badge>
                    )}
                  </div>
                  <div className='flex gap-1'>
                    {onCopyProps && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => onCopyProps(mergedProps)}
                        className='h-6 px-2'
                      >
                        <Copy className='h-3 w-3' />
                      </Button>
                    )}
                    {onResetProps && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={onResetProps}
                        className='h-6 px-2'
                        disabled={Object.keys(dynamicProps).length === 0}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                <div className='max-h-64 overflow-auto'>
                  {currentScenario && onPropChange ? (
                    <PropControls
                      scenarioId={currentScenario.id}
                      controls={controls}
                      currentProps={dynamicProps}
                      defaultProps={currentScenario.defaultProps}
                      onPropChange={onPropChange}
                      onReset={onResetProps}
                      onCopy={onCopyProps}
                      className='border-none shadow-none p-0'
                    />
                  ) : (
                    <div className='text-center py-8 text-gray-500 text-sm'>
                      No interactive controls available
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'performance' && (
              <div>
                <div className='mb-4'>
                  <h4 className='text-sm font-semibold mb-2'>Performance Metrics</h4>
                  <PerformancePanel metrics={performanceMetrics} />
                </div>

                <div className='mb-4'>
                  <h4 className='text-sm font-semibold mb-2'>Memory Usage</h4>
                  <div className='bg-gray-100 rounded p-3'>
                    <div className='text-xs text-gray-600'>
                      Heap Size:{' '}
                      {((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0).toFixed(2)}{' '}
                      MB
                    </div>
                    <div className='text-xs text-gray-600'>
                      Total Heap:{' '}
                      {((performance as any).memory?.totalJSHeapSize / 1024 / 1024 || 0).toFixed(2)}{' '}
                      MB
                    </div>
                    <div className='text-xs text-gray-600'>
                      Heap Limit:{' '}
                      {((performance as any).memory?.jsHeapSizeLimit / 1024 / 1024 || 0).toFixed(2)}{' '}
                      MB
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
