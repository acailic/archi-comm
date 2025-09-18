// src/components/diagnostics/tabs/AppLogsTab.tsx
// Application logs tab for developer diagnostics
// Shows filtered log entries with search, level, and scope filtering capabilities
// RELEVANT FILES: ../../../lib/logging/logger.ts, DeveloperDiagnosticsPage.tsx, ../../../lib/logging/errorStore.ts

import React, { useState, useCallback, useMemo } from 'react';
import {
  Search,
  FileText,
} from 'lucide-react';
import { logger, LogLevel } from '@/lib/logging/logger';

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

interface LogEntry {
  id: string;
  timestamp: number;
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  scope?: string;
  data?: any;
  stack?: string;
}

export const AppLogsTab: React.FC = () => {
  const [filter, setFilter] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const mapLevel = useCallback((val: string): LogLevel | undefined => {
    switch (val) {
      case 'trace':
        return LogLevel.TRACE;
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      case 'fatal':
        return LogLevel.FATAL;
      default:
        return undefined;
    }
  }, []);

  const filteredLogs = useMemo(() => {
    const level = mapLevel(levelFilter);
    const scope = scopeFilter === 'all' ? undefined : scopeFilter;
    const search = filter || undefined;
    // getFilteredLogs uses level as minimum severity filter
    const entries = logger.getFilteredLogs({ level, scope, search });
    // Map centralized entry type to local UI LogEntry shape
    return entries.map((e: any, idx: number) => ({
      id: `${e.timestamp}-${idx}`,
      timestamp: e.timestamp,
      level: (e.levelName || '').toLowerCase() as LogEntry['level'],
      message: e.message,
      scope: e.scope,
      data: e.data,
      stack: e.stack,
    }));
  }, [filter, levelFilter, scopeFilter, mapLevel, refreshTick]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
      case 'fatal':
        return 'text-red-600';
      case 'warn':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      case 'debug':
        return 'text-purple-600';
      case 'trace':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const exportLogs = useCallback(() => {
    const data = logger.exportLogs('json');
    triggerDownload(`application-logs-${Date.now()}.json`, data);
  }, []);

  const clearLogs = useCallback(() => {
    logger.clearLogs();
    setRefreshTick(x => x + 1);
  }, []);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Application Logs</h3>
        <div className='flex items-center space-x-2'>
          <button
            onClick={exportLogs}
            className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600'
          >
            Export
          </button>
          <button
            onClick={clearLogs}
            className='px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600'
          >
            Clear
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
              placeholder='Search logs...'
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-border rounded-md'
            />
          </div>
        </div>

        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className='px-3 py-2 border border-border rounded-md'
        >
          <option value='all'>All Levels</option>
          <option value='trace'>Trace</option>
          <option value='debug'>Debug</option>
          <option value='info'>Info</option>
          <option value='warn'>Warn</option>
          <option value='error'>Error</option>
          <option value='fatal'>Fatal</option>
        </select>

        <select
          value={scopeFilter}
          onChange={e => setScopeFilter(e.target.value)}
          className='px-3 py-2 border border-border rounded-md'
        >
          <option value='all'>All Scopes</option>
          <option value='app'>App</option>
          <option value='performance'>Performance</option>
          <option value='react'>React</option>
          <option value='network'>Network</option>
        </select>
      </div>

      {/* Log List */}
      <div className='bg-card border border-border rounded-lg'>
        <div className='max-h-96 overflow-y-auto'>
          {filteredLogs.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <FileText className='w-12 h-12 mx-auto mb-2 opacity-50' />
              <p>No logs found</p>
            </div>
          ) : (
            <div className='divide-y divide-border'>
              {filteredLogs.map(log => (
                <div key={log.id} className='p-3 hover:bg-muted/50'>
                  <div className='flex items-start space-x-3'>
                    <span className='text-xs text-muted-foreground min-w-20'>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-xs font-medium min-w-12 ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    {log.scope && (
                      <span className='text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded'>
                        {log.scope}
                      </span>
                    )}
                    <div className='flex-1'>
                      <p className='text-sm'>{log.message}</p>
                      {log.data && (
                        <details className='mt-1'>
                          <summary className='text-xs text-muted-foreground cursor-pointer'>
                            Data
                          </summary>
                          <pre className='text-xs bg-muted p-2 rounded mt-1 overflow-x-auto'>
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                      {log.stack && (
                        <details className='mt-1'>
                          <summary className='text-xs text-muted-foreground cursor-pointer'>
                            Stack
                          </summary>
                          <pre className='text-xs bg-muted p-2 rounded mt-1 overflow-x-auto'>
                            {log.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};