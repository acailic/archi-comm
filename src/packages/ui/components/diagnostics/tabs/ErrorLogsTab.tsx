// src/components/diagnostics/tabs/ErrorLogsTab.tsx
// Error logs tab for developer diagnostics
// Shows error list with filtering by search, category, and severity with resolution functionality
// RELEVANT FILES: ../../../lib/logging/errorStore.ts, DeveloperDiagnosticsPage.tsx, ../../../lib/logging/logger.ts

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Bug,
  CheckCircle,
} from 'lucide-react';
import { errorStore } from '@/lib/logging/errorStore';

// Utility: trigger a file download from string/Blob data
const triggerDownload = (
  filename: string,
  data: BlobPart | BlobPart[],
  mimeType: string = 'application/json'
) => {
  try {
    const blob = new Blob(Array.isArray(data) ? data : [data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore cleanup errors
      }
      try {
        document.body.removeChild(a);
      } catch {
        // Ignore cleanup errors
      }
    }, 150);
  } catch (err) {
    console.error('Failed to trigger download', err);
  }
};

export const ErrorLogsTab: React.FC = () => {
  const [errors, setErrors] = useState(errorStore.getState().errors);
  const [filter, setFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    const unsubscribe = errorStore.subscribe(state => {
      setErrors(state.errors);
    });
    return unsubscribe;
  }, []);

  const filteredErrors = useMemo(() => {
    const filterLower = (filter || '').toLowerCase();
    return errors.filter(error => {
      const message = (error.message ?? '').toLowerCase();
      const stack = (error.stack ?? '').toLowerCase();
      const matchesSearch =
        !filterLower || message.includes(filterLower) || stack.includes(filterLower);
      const matchesCategory = categoryFilter === 'all' || error.category === categoryFilter;
      const matchesSeverity = severityFilter === 'all' || error.severity === severityFilter;
      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [errors, filter, categoryFilter, severityFilter]);

  const clearErrors = useCallback(() => {
    errorStore.clearErrors();
  }, []);

  const exportErrors = useCallback(() => {
    const data = errorStore.exportErrors();
    triggerDownload(`error-logs-${Date.now()}.json`, data);
  }, []);

  const resolveError = useCallback((errorId: string) => {
    errorStore.resolveError(errorId);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Error Logs</h3>
        <div className='flex items-center space-x-2'>
          <button
            onClick={exportErrors}
            className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600'
          >
            Export
          </button>
          <button
            onClick={clearErrors}
            className='px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600'
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap gap-4'>
        <div className='flex-1 min-w-64'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <input
              type='text'
              placeholder='Search errors...'
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-border rounded-md'
            />
          </div>
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className='px-3 py-2 border border-border rounded-md'
        >
          <option value='all'>All Categories</option>
          <option value='react'>React</option>
          <option value='global'>Global</option>
          <option value='performance'>Performance</option>
          <option value='network'>Network</option>
          <option value='unknown'>Unknown</option>
        </select>

        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value)}
          className='px-3 py-2 border border-border rounded-md'
        >
          <option value='all'>All Severities</option>
          <option value='critical'>Critical</option>
          <option value='high'>High</option>
          <option value='medium'>Medium</option>
          <option value='low'>Low</option>
        </select>
      </div>

      {/* Error List */}
      <div className='space-y-3'>
        {filteredErrors.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            <Bug className='w-12 h-12 mx-auto mb-2 opacity-50' />
            <p>No errors found</p>
          </div>
        ) : (
          filteredErrors.map(error => (
            <div
              key={error.id}
              className={`border rounded-lg p-4 ${error.resolved ? 'opacity-50' : ''}`}
            >
              <div className='flex items-start justify-between mb-2'>
                <div className='flex items-center space-x-2'>
                  <span
                    className={`px-2 py-1 text-xs rounded border ${getSeverityColor(error.severity)}`}
                  >
                    {error.severity.toUpperCase()}
                  </span>
                  <span className='px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded'>
                    {error.category}
                  </span>
                  {error.count > 1 && (
                    <span className='px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded'>
                      {error.count}x
                    </span>
                  )}
                  {error.resolved && <CheckCircle className='w-4 h-4 text-green-500' />}
                </div>
                <div className='flex items-center space-x-2'>
                  <span className='text-xs text-muted-foreground'>
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </span>
                  {!error.resolved && (
                    <button
                      onClick={() => resolveError(error.id)}
                      className='text-xs text-green-600 hover:text-green-700'
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>

              <div className='mb-2'>
                <p className='font-medium text-sm'>{error.message}</p>
              </div>

              {error.stack && (
                <details className='mt-2'>
                  <summary className='text-xs text-muted-foreground cursor-pointer'>
                    Stack trace
                  </summary>
                  <pre className='text-xs bg-muted p-2 rounded mt-1 overflow-x-auto'>
                    {error.stack}
                  </pre>
                </details>
              )}

              {error.context && Object.keys(error.context).length > 0 && (
                <details className='mt-2'>
                  <summary className='text-xs text-muted-foreground cursor-pointer'>
                    Context
                  </summary>
                  <pre className='text-xs bg-muted p-2 rounded mt-1 overflow-x-auto'>
                    {JSON.stringify(error.context, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};