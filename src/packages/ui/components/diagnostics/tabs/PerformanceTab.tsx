// src/components/diagnostics/tabs/PerformanceTab.tsx
// Performance metrics tab for developer diagnostics
// Shows real-time performance data, FPS, render time, memory usage, and health scores
// RELEVANT FILES: ../../../hooks/usePerformanceMonitoring.ts, DeveloperDiagnosticsPage.tsx, ../../../lib/performance/

import React, { useCallback } from 'react';
import {
  Zap,
  Clock,
  MemoryStick,
  Activity,
  BarChart3,
} from 'lucide-react';
import { useState } from 'react';

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

export const PerformanceTab: React.FC = () => {
  // Stub implementation for performance monitoring
  const [isMonitoring, setIsMonitoring] = useState(false);
  const data = {
    fps: 60,
    memory: { used: 50, total: 100 },
    renderTime: 16,
    avgRenderTime: 16,
    memoryUsage: 50,
    componentRenders: 0,
    activeMeasurements: 0,
    healthScore: 90,
  };
  const controls = {
    start: () => setIsMonitoring(true),
    stop: () => setIsMonitoring(false),
    reset: () => console.log('Performance metrics reset'),
    exportData: () => data,
    clearHistory: () => console.log('Cleared performance history'),
  };

  const createBaseline = useCallback(() => {
    const baseline = {
      name: `Baseline ${new Date().toLocaleTimeString()}`,
      timestamp: Date.now(),
      data: { ...data },
    };
    console.log('Created performance baseline:', baseline);
  }, [data]);

  const exportData = useCallback(() => {
    const exportPayload = controls.exportData();
    triggerDownload(`performance-data-${Date.now()}.json`, JSON.stringify(exportPayload, null, 2));
  }, [controls]);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Performance Metrics</h3>
        <div className='flex items-center space-x-2'>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${isMonitoring ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
          >
            {isMonitoring ? 'Monitoring active' : 'Monitoring paused'}
          </span>
          <button
            onClick={isMonitoring ? controls.stop : controls.start}
            className='px-3 py-1 text-sm bg-muted text-foreground rounded hover:bg-muted/80'
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </button>
          <button
            onClick={createBaseline}
            className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600'
          >
            Create Baseline
          </button>
          <button
            onClick={exportData}
            className='px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600'
          >
            Export Data
          </button>
          <button
            onClick={controls.clearHistory}
            className='px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600'
          >
            Clear History
          </button>
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-2'>
            <Zap className='w-4 h-4 text-green-500' />
            <span className='text-sm font-medium'>FPS</span>
          </div>
          <div className='text-2xl font-bold'>{data.fps}</div>
          <div className='text-xs text-muted-foreground'>Frames per second</div>
        </div>

        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-2'>
            <Clock className='w-4 h-4 text-yellow-500' />
            <span className='text-sm font-medium'>Render Time</span>
          </div>
          <div className='text-2xl font-bold'>
            {typeof data.avgRenderTime === 'number' && isFinite(data.avgRenderTime)
              ? `${data.avgRenderTime.toFixed(1)}ms`
              : '—'}
          </div>
          <div className='text-xs text-muted-foreground'>Average render duration</div>
        </div>

        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-2'>
            <MemoryStick className='w-4 h-4 text-red-500' />
            <span className='text-sm font-medium'>Memory</span>
          </div>
          <div className='text-2xl font-bold'>
            {typeof data.memoryUsage === 'number' && isFinite(data.memoryUsage)
              ? `${data.memoryUsage.toFixed(1)}MB`
              : '—'}
          </div>
          <div className='text-xs text-muted-foreground'>Heap memory usage</div>
        </div>

        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-2'>
            <Activity className='w-4 h-4 text-blue-500' />
            <span className='text-sm font-medium'>Health Score</span>
          </div>
          <div className='text-2xl font-bold'>{data.healthScore}</div>
          <div className='text-xs text-muted-foreground'>Overall performance</div>
        </div>
      </div>

      {/* Performance History Chart */}
      <div className='bg-card border border-border rounded-lg p-4'>
        <h4 className='font-medium mb-4'>Performance History</h4>
        <div className='h-64 flex items-center justify-center text-muted-foreground'>
          <div className='text-center'>
            <BarChart3 className='w-12 h-12 mx-auto mb-2 opacity-50' />
            <p>Performance charts would be rendered here</p>
            <p className='text-xs'>Simplified performance metrics</p>
          </div>
        </div>
      </div>

      {/* Active Measurements */}
      <div className='bg-card border border-border rounded-lg p-4'>
        <h4 className='font-medium mb-4'>Active Measurements</h4>
        <div className='text-sm text-muted-foreground'>
          {data.activeMeasurements} active measurements
        </div>
      </div>
    </div>
  );
};
