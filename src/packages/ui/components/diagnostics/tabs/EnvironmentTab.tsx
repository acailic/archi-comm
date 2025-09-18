// src/components/diagnostics/tabs/EnvironmentTab.tsx
// Environment information tab for developer diagnostics
// Shows environment details, feature flags, build info, and canvas performance metrics
// RELEVANT FILES: ../../../lib/config/environment.ts, ../../../lib/performance/CanvasPerformanceManager.ts, ../../../hooks/usePerformanceMonitoring.ts, DeveloperDiagnosticsPage.tsx

import React, { useCallback, useMemo } from 'react';
import {
  Copy,
  Monitor,
  Settings,
  Zap,
  BarChart3,
} from 'lucide-react';
import {
  isDevelopment,
  isProduction,
  isTauriEnvironment,
  isWebEnvironment,
  RUNTIME_ENV,
  FEATURES,
  CONFIG,
} from '@/lib/config/environment';
import { getCanvasPerformanceManager } from '@/lib/performance/CanvasPerformanceManager';

export const EnvironmentTab: React.FC = () => {
  const environmentData = useMemo(
    () => ({
      runtime: {
        environment: RUNTIME_ENV,
        isDevelopment: isDevelopment(),
        isProduction: isProduction(),
        isTauri: isTauriEnvironment(),
        isWeb: isWebEnvironment(),
      },
      features: FEATURES,
      config: CONFIG,
      buildInfo: {
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV,
        prod: import.meta.env.PROD,
        ssr: import.meta.env.SSR,
        baseUrl: import.meta.env.BASE_URL,
      },
    }),
    []
  );

  const copyToClipboard = useCallback(async (data: any) => {
    const text = JSON.stringify(data, null, 2);
    try {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        window.alert('Copied to clipboard');
        return;
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        window.alert('Copied to clipboard');
      } else {
        window.alert('Failed to copy');
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
      window.alert('Failed to copy');
    }
  }, []);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Environment Information</h3>
        <button
          onClick={() => copyToClipboard(environmentData)}
          className='flex items-center space-x-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90'
        >
          <Copy className='w-4 h-4' />
          <span>Copy All</span>
        </button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Canvas Performance */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <BarChart3 className='w-4 h-4 text-emerald-600' />
            <h4 className='font-medium'>Canvas Performance</h4>
          </div>
          {(() => {
            try {
              const mgr = getCanvasPerformanceManager();
              const agg = mgr.getAggregatedMetrics();
              return (
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'><span className='text-muted-foreground'>Avg FPS:</span><span className='font-mono'>{Math.round(agg.averageFPS)}</span></div>
                  <div className='flex justify-between'><span className='text-muted-foreground'>Perf Score:</span><span className='font-mono'>{Math.round(agg.performanceScore)}</span></div>
                  <div className='flex justify-between'><span className='text-muted-foreground'>Active Workers:</span><span className='font-mono'>{agg.activeWorkers}</span></div>
                  <div className='flex justify-between'><span className='text-muted-foreground'>Total Memory (MB):</span><span className='font-mono'>{agg.totalMemoryUsage.toFixed(1)}</span></div>
                  <div className='pt-2'>
                    <button
                      onClick={() => {
                        const payload = JSON.stringify(mgr.exportPerformanceData(), null, 2);
                        try {
                          const blob = new Blob([payload], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `archicomm-diagnostics-${Date.now()}.json`;
                          document.body.appendChild(a);
                          a.click();
                          setTimeout(() => URL.revokeObjectURL(url), 1000);
                          document.body.removeChild(a);
                        } catch {
                          // Ignore download errors
                        }
                      }}
                      className='px-3 py-1 text-xs rounded bg-emerald-600 text-white hover:bg-emerald-700'
                    >Export Diagnostics</button>
                  </div>
                </div>
              );
            } catch (e) {
              return <div className='text-sm text-muted-foreground'>Performance manager not initialized.</div>;
            }
          })()}
        </div>

        {/* Runtime Environment */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <Monitor className='w-4 h-4 text-blue-500' />
            <h4 className='font-medium'>Runtime Environment</h4>
          </div>
          <div className='space-y-2 text-sm'>
            {Object.entries(environmentData.runtime).map(([key, value]) => (
              <div key={key} className='flex justify-between'>
                <span className='text-muted-foreground'>{key}:</span>
                <span className={`font-mono ${value ? 'text-green-600' : 'text-red-600'}`}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Build Information */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <Settings className='w-4 h-4 text-purple-500' />
            <h4 className='font-medium'>Build Information</h4>
          </div>
          <div className='space-y-2 text-sm'>
            {Object.entries(environmentData.buildInfo).map(([key, value]) => (
              <div key={key} className='flex justify-between'>
                <span className='text-muted-foreground'>{key}:</span>
                <span className='font-mono'>{String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Flags */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <Zap className='w-4 h-4 text-yellow-500' />
            <h4 className='font-medium'>Feature Flags</h4>
          </div>
          <div className='space-y-2 text-sm'>
            {Object.entries(environmentData.features).map(([key, value]) => (
              <div key={key} className='flex justify-between items-center'>
                <span className='text-muted-foreground'>{key}:</span>
                <div className='flex items-center space-x-2'>
                  <span
                    className={`w-2 h-2 rounded-full ${value ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span className='font-mono'>{String(value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration */}
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-3'>
            <Settings className='w-4 h-4 text-gray-500' />
            <h4 className='font-medium'>Configuration</h4>
          </div>
          <div className='space-y-2 text-sm max-h-48 overflow-y-auto'>
            <pre className='text-xs bg-muted p-2 rounded font-mono'>
              {JSON.stringify(environmentData.config, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};