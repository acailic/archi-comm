// src/packages/ui/components/LoggingViewer.tsx
// Compact in-app log viewer panel powered by the centralized logger
// Designed for quick access in dev scenarios or embedded diagnostics

import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@ui/components/ui/card';
import { Button } from '@ui/components/ui/button';
import { Input } from '@ui/components/ui/input';
import { logger, LogLevel } from '@/lib/logging/logger';

export interface LoggingViewerProps {
  title?: string;
  className?: string;
  initialLevel?: LogLevel | 'all';
  initialScope?: string | 'all';
}

export const LoggingViewer: React.FC<LoggingViewerProps> = ({
  title = 'Logs',
  className = '',
  initialLevel = 'all',
  initialScope = 'all',
}) => {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LogLevel | 'all'>(initialLevel);
  const [scope, setScope] = useState<string | 'all'>(initialScope);
  const [tick, setTick] = useState(0);

  const entries = useMemo(() => {
    const levelFilter = level === 'all' ? undefined : level;
    const scopeFilter = scope === 'all' ? undefined : scope;
    return logger.getFilteredLogs({ level: levelFilter, scope: scopeFilter, search });
  }, [level, scope, search, tick]);

  const onClear = useCallback(() => {
    logger.clearLogs();
    setTick(x => x + 1);
  }, []);

  const onExport = useCallback(() => {
    const data = logger.exportLogs('json');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archicomm-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const levelClass = (name: string) => {
    switch (name) {
      case 'ERROR':
      case 'FATAL':
        return 'text-red-600';
      case 'WARN':
        return 'text-yellow-600';
      case 'INFO':
        return 'text-blue-600';
      case 'DEBUG':
        return 'text-purple-600';
      case 'TRACE':
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className={className}>
      <CardHeader className='pb-2'>
        <div className='flex items-center justify-between gap-2'>
          <CardTitle className='text-sm'>{title}</CardTitle>
          <div className='flex items-center gap-2'>
            <Button size='sm' variant='outline' onClick={onExport}>
              Export
            </Button>
            <Button size='sm' variant='outline' onClick={onClear}>
              Clear
            </Button>
          </div>
        </div>

        <div className='flex gap-2 mt-2'>
          <Input
            placeholder='Search logs...'
            value={search}
            onChange={e => setSearch(e.target.value)}
            className='h-8 text-sm'
          />
          <select
            className='border rounded px-2 text-sm h-8'
            value={level === 'all' ? 'all' : LogLevel[level]}
            onChange={e => {
              const v = e.target.value.toUpperCase();
              setLevel(v === 'ALL' ? 'all' : (LogLevel as any)[v]);
            }}
          >
            <option value='all'>All Levels</option>
            <option value='TRACE'>Trace</option>
            <option value='DEBUG'>Debug</option>
            <option value='INFO'>Info</option>
            <option value='WARN'>Warn</option>
            <option value='ERROR'>Error</option>
            <option value='FATAL'>Fatal</option>
          </select>
          <Input
            placeholder='Scope (or "all")'
            value={scope || ''}
            onChange={e => setScope((e.target.value as any) || 'all')}
            className='h-8 text-sm w-40'
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className='max-h-96 overflow-auto divide-y text-sm'>
          {entries.length === 0 ? (
            <div className='text-center text-gray-500 py-8'>No logs</div>
          ) : (
            entries.map((e: any, idx: number) => (
              <div key={`${e.timestamp}-${idx}`} className='py-2 px-1 hover:bg-muted/40'>
                <div className='flex items-start gap-2'>
                  <span className='text-xs text-gray-500 min-w-20 font-mono'>
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`text-xs font-medium min-w-12 ${levelClass(e.levelName)}`}>
                    {e.levelName}
                  </span>
                  {e.scope && (
                    <span className='text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700'>
                      {e.scope}
                    </span>
                  )}
                  <div className='flex-1'>
                    <div>{e.message}</div>
                    {e.data && (
                      <pre className='mt-1 text-xs bg-muted p-2 rounded overflow-x-auto'>
                        {(() => {
                          try {
                            return JSON.stringify(e.data, null, 2);
                          } catch {
                            return String(e.data);
                          }
                        })()}
                      </pre>
                    )}
                    {e.stack && (
                      <details className='mt-1'>
                        <summary className='text-xs text-muted-foreground cursor-pointer'>Stack</summary>
                        <pre className='text-[11px] bg-muted p-2 rounded overflow-x-auto'>{e.stack}</pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LoggingViewer;

