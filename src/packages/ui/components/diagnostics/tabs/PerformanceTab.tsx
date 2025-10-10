// src/components/diagnostics/tabs/PerformanceTab.tsx
// Performance metrics tab for developer diagnostics
// Shows real-time performance data, FPS, render time, memory usage, and health scores
// RELEVANT FILES: ../../../hooks/usePerformanceMonitoring.ts, DeveloperDiagnosticsPage.tsx, ../../../lib/performance/

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Gauge,
  MemoryStick,
  RefreshCcw,
  Zap,
} from 'lucide-react';

import {
  getCanvasCircuitBreakerSnapshot,
  resetCanvasCircuitBreaker,
  subscribeToCanvasCircuitBreaker,
  useCanvasStore,
} from '@/stores/canvasStore';
import performanceMonitor from '@/shared/utils/performanceMonitor';

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
  const [rateLimiter, setRateLimiter] = useState(() =>
    getCanvasCircuitBreakerSnapshot(),
  );
  const [systemMetrics, setSystemMetrics] = useState(() =>
    performanceMonitor.getSystemMetrics(),
  );
  const [fps, setFps] = useState(() => performanceMonitor.getCurrentFPS());
  const [memoryUsage, setMemoryUsage] = useState<{
    usedMB: number | null;
    totalMB: number | null;
  }>(() => getBrowserMemoryUsage());

  const canvasStats = useCanvasStore((state) => ({
    components: state.components.length,
    connections: state.connections.length,
    annotations: state.annotations.length,
    drawings: state.drawings.length,
    animationsEnabled: state.animationsEnabled,
    droppedComponentId: state.droppedComponentId,
    snappingComponentId: state.snappingComponentId,
    flowingConnections: state.flowingConnectionIds.length,
    draggedComponentId: state.draggedComponentId,
  }));

  useEffect(() => {
    const unsubscribe = subscribeToCanvasCircuitBreaker((snapshot) => {
      setRateLimiter(snapshot);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((metrics) => {
      setSystemMetrics(metrics);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let rafId: number;
    const updateFps = () => {
      setFps(performanceMonitor.getCurrentFPS());
      rafId = requestAnimationFrame(updateFps);
    };

    if (typeof window !== 'undefined') {
      rafId = requestAnimationFrame(updateFps);
    }

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !(performance as any).memory) {
      return;
    }

    const interval = window.setInterval(() => {
      setMemoryUsage(getBrowserMemoryUsage());
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  const resetPerformanceMetrics = useCallback(() => {
    performanceMonitor.reset();
    setSystemMetrics(performanceMonitor.getSystemMetrics());
  }, []);

  const exportDiagnostics = useCallback(() => {
    const payload = {
      generatedAt: new Date().toISOString(),
      rateLimiter,
      systemMetrics,
      fps,
      memoryUsage,
      canvas: canvasStats,
    };
    triggerDownload(
      `archicomm-performance-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
    );
  }, [rateLimiter, systemMetrics, fps, memoryUsage, canvasStats]);

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Performance Overview</h3>
        <div className='flex items-center space-x-2'>
          <button
            onClick={resetPerformanceMetrics}
            className='px-3 py-1 text-sm bg-muted text-foreground rounded hover:bg-muted/80 flex items-center gap-2'
          >
            <RefreshCcw className='w-4 h-4' />
            Reset Baseline
          </button>
          <button
            onClick={resetCanvasCircuitBreaker}
            className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600'
          >
            Reset Rate Limiter
          </button>
          <button
            onClick={exportDiagnostics}
            className='px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600'
          >
            Export Diagnostics
          </button>
        </div>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-2'>
            <Zap className='w-4 h-4 text-green-500' />
            <span className='text-sm font-medium'>FPS</span>
          </div>
          <div className='text-2xl font-bold'>{fps}</div>
          <div className='text-xs text-muted-foreground'>Frames per second</div>
        </div>

        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-2'>
            <Clock className='w-4 h-4 text-yellow-500' />
            <span className='text-sm font-medium'>Slow Components</span>
          </div>
          <div className='text-2xl font-bold'>
            {formatMetric(systemMetrics.slowComponents ?? 0)}
          </div>
          <div className='text-xs text-muted-foreground'>Over 16ms average render</div>
        </div>

        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-2'>
            <MemoryStick className='w-4 h-4 text-red-500' />
            <span className='text-sm font-medium'>Memory</span>
          </div>
          <div className='text-2xl font-bold'>
            {memoryUsage.usedMB !== null
              ? `${memoryUsage.usedMB.toFixed(1)} MB`
              : 'Unavailable'}
          </div>
          <div className='text-xs text-muted-foreground'>Heap memory usage</div>
        </div>

        <div className='bg-card border border-border rounded-lg p-4'>
          <div className='flex items-center space-x-2 mb-2'>
            <Activity className='w-4 h-4 text-blue-500' />
            <span className='text-sm font-medium'>Health Score</span>
          </div>
          <div className='text-2xl font-bold'>{systemMetrics.overallScore}</div>
          <div className='text-xs text-muted-foreground'>Overall performance</div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <div className='bg-card border border-border rounded-lg p-4 space-y-4'>
          <h4 className='font-medium flex items-center gap-2'>
            <Gauge className='w-4 h-4 text-blue-500' /> Rate Limiter Status
          </h4>
          <div className='grid grid-cols-2 gap-3 text-sm'>
            <Metric label='Status' value={rateLimiter.open ? 'Cooling down' : 'Active'} />
            <Metric
              label='Updates in Window'
              value={rateLimiter.updatesInWindow}
            />
            <Metric label='Total Updates' value={rateLimiter.totalUpdates} />
            <Metric label='Dropped Updates' value={rateLimiter.droppedUpdates} />
            <Metric
              label='Last Action'
              value={rateLimiter.lastAction ?? 'None'}
              span={2}
            />
            <Metric
              label='Detector'
              value={rateLimiter.detectorFlagged ? rateLimiter.detectorSeverity : 'Normal'}
            />
            <Metric
              label='Reset In'
              value={formatCooldown(rateLimiter.openUntil)}
            />
          </div>
        </div>

        <div className='bg-card border border-border rounded-lg p-4 space-y-4'>
          <h4 className='font-medium flex items-center gap-2'>
            <BarChart3 className='w-4 h-4 text-blue-500' /> Canvas Snapshot
          </h4>
          <div className='grid grid-cols-2 gap-3 text-sm'>
            <Metric label='Components' value={canvasStats.components} />
            <Metric label='Connections' value={canvasStats.connections} />
            <Metric label='Annotations' value={canvasStats.annotations} />
            <Metric label='Drawings' value={canvasStats.drawings} />
            <Metric
              label='Flowing Edges'
              value={canvasStats.flowingConnections}
            />
            <Metric
              label='Animations'
              value={canvasStats.animationsEnabled ? 'Enabled' : 'Disabled'}
            />
            <Metric
              label='Unstable Callbacks'
              value={systemMetrics.unstableCallbacks}
            />
            <Metric
              label='Active Drag'
              value={canvasStats.draggedComponentId ?? 'None'}
              span={2}
            />
            <Metric
              label='Snap Indicator'
              value={canvasStats.snappingComponentId ?? 'Inactive'}
              span={2}
            />
          </div>
        </div>
      </div>

      {systemMetrics.recommendations.length > 0 && (
        <div className='bg-card border border-border rounded-lg p-4 space-y-3'>
          <h4 className='font-medium flex items-center gap-2'>
            <AlertTriangle className='w-4 h-4 text-amber-500' />
            Recommendations
          </h4>
          <ul className='space-y-2 text-sm text-muted-foreground list-disc list-inside'>
            {systemMetrics.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

interface MetricProps {
  label: string;
  value: React.ReactNode;
  span?: number;
}

const Metric: React.FC<MetricProps> = ({ label, value, span = 1 }) => (
  <div className={`flex flex-col ${span === 2 ? 'col-span-2' : ''}`}>
    <span className='text-xs text-muted-foreground'>{label}</span>
    <span className='font-medium text-sm text-foreground'>{value}</span>
  </div>
);

function getBrowserMemoryUsage(): { usedMB: number | null; totalMB: number | null } {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      usedMB: memory.usedJSHeapSize / 1024 / 1024,
      totalMB: memory.totalJSHeapSize / 1024 / 1024,
    };
  }

  return { usedMB: null, totalMB: null };
}

function formatCooldown(openUntil: number | null): string {
  if (!openUntil) {
    return 'Ready';
  }

  const remaining = openUntil - Date.now();
  if (remaining <= 0) {
    return 'Ready';
  }

  return `${Math.ceil(remaining / 1000)}s`;
}

function formatMetric(value: number, suffix?: string): string {
  if (Number.isNaN(value)) {
    return '—';
  }
  return suffix ? `${value} ${suffix}` : `${value}`;
}
