import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PerformanceMonitor, MemoryOptimizer } from '../lib/performance/PerformanceOptimizer';
import { getLogger } from '../lib/logger';
import { isDevelopment } from '../lib/environment';
import { addPerformanceError } from '../lib/errorStore';

// Types
export interface PerformanceConfig {
  /** Polling frequency in milliseconds (default: 500) */
  pollingInterval?: number;
  /** Metrics to track (default: all) */
  metricsToTrack?: string[];
  /** Performance thresholds for alerts */
  thresholds?: PerformanceThresholds;
  /** Enable automatic component lifecycle tracking */
  autoTrackLifecycle?: boolean;
  /** Enable memory usage monitoring */
  enableMemoryTracking?: boolean;
  /** Maximum number of metrics to keep in history */
  maxHistorySize?: number;
  /** Enable development mode logging */
  enableDebugLogging?: boolean;
}

export interface PerformanceThresholds {
  /** FPS threshold below which to trigger alerts */
  minFPS?: number;
  /** Maximum render time in ms before alert */
  maxRenderTime?: number;
  /** Maximum memory usage in MB before alert */
  maxMemoryUsage?: number;
  /** Maximum component render time in ms */
  maxComponentRenderTime?: number;
}

export interface PerformanceData {
  /** Current frames per second */
  fps: number;
  /** Average render time in milliseconds */
  avgRenderTime: number;
  /** Current memory usage in MB */
  memoryUsage: number;
  /** Memory pool efficiency percentage */
  poolEfficiency: number;
  /** Performance health score (0-100) */
  healthScore: number;
  /** Active measurements count */
  activeMeasurements: number;
  /** Performance history for charts */
  history: PerformanceHistoryEntry[];
}

export interface PerformanceHistoryEntry {
  timestamp: number;
  fps: number;
  renderTime: number;
  memoryUsage: number;
}

export interface PerformanceMeasurement {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceControls {
  /** Start a named performance measurement */
  startMeasurement: (name: string, metadata?: Record<string, any>) => string;
  /** End a performance measurement by ID */
  endMeasurement: (id: string) => number | null;
  /** Measure a synchronous operation */
  measureOperation: <T>(name: string, operation: () => T, metadata?: Record<string, any>) => T;
  /** Measure an asynchronous operation */
  measureAsync: <T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ) => Promise<T>;
  /** Record a custom metric */
  recordMetric: (name: string, value: number, metadata?: Record<string, any>) => void;
  /** Clear performance history */
  clearHistory: () => void;
  /** Export performance data */
  exportData: () => PerformanceExportData;
  /** Reset all measurements */
  reset: () => void;
}

export interface PerformanceExportData {
  timestamp: number;
  config: PerformanceConfig;
  data: PerformanceData;
  measurements: PerformanceMeasurement[];
  customMetrics: Record<string, number[]>;
}

export interface PerformanceAlerts {
  /** Low FPS alert */
  lowFPS?: boolean;
  /** High render time alert */
  highRenderTime?: boolean;
  /** High memory usage alert */
  highMemoryUsage?: boolean;
  /** Custom threshold alerts */
  customAlerts?: string[];
}

// Default configuration
const DEFAULT_CONFIG: Required<PerformanceConfig> = {
  pollingInterval: 500,
  metricsToTrack: ['fps', 'renderTime', 'memoryUsage', 'componentRender'],
  thresholds: {
    minFPS: 30,
    maxRenderTime: 16.67, // 60fps target
    maxMemoryUsage: 100,
    maxComponentRenderTime: 5,
  },
  autoTrackLifecycle: true,
  enableMemoryTracking: true,
  maxHistorySize: 100,
  enableDebugLogging: isDevelopment(),
};

/**
 * Custom React hook for comprehensive performance monitoring
 * Provides real-time performance metrics, measurement tools, and alerts
 */
export function usePerformanceMonitoring(config: PerformanceConfig = {}) {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const monitor = useMemo(() => PerformanceMonitor.getInstance(), []);
  const log = useMemo(() => getLogger('performance-monitor'), []);

  // State management
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    fps: 60,
    avgRenderTime: 0,
    memoryUsage: 0,
    poolEfficiency: 100,
    healthScore: 100,
    activeMeasurements: 0,
    history: [],
  });

  const [alerts, setAlerts] = useState<PerformanceAlerts>({});
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Refs for tracking
  const activeMeasurements = useRef<Map<string, PerformanceMeasurement>>(new Map());
  const customMetrics = useRef<Map<string, number[]>>(new Map());
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const measurementCounter = useRef(0);
  const lastGCTime = useRef(Date.now());

  // Memory usage calculation
  const calculateMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round((memory.usedJSHeapSize / 1024 / 1024) * 100) / 100;
    }
    return 0;
  }, []);

  // Pool efficiency calculation
  const calculatePoolEfficiency = useCallback(() => {
    // Estimate based on object pool usage
    const poolStats = MemoryOptimizer.getPoolStats?.() || { hits: 0, misses: 0 };
    const total = poolStats.hits + poolStats.misses;
    return total > 0 ? Math.round((poolStats.hits / total) * 100) : 100;
  }, []);

  // Health score calculation
  const calculateHealthScore = useCallback((data: Partial<PerformanceData>) => {
    let score = 100;

    // FPS impact (40% weight)
    if (data.fps !== undefined) {
      const fpsScore = Math.min(data.fps / 60, 1) * 40;
      score = score - 40 + fpsScore;
    }

    // Render time impact (30% weight)
    if (data.avgRenderTime !== undefined) {
      const renderScore = Math.max(0, 1 - data.avgRenderTime / 50) * 30;
      score = score - 30 + renderScore;
    }

    // Memory impact (20% weight)
    if (data.memoryUsage !== undefined) {
      const memoryScore = Math.max(0, 1 - data.memoryUsage / 200) * 20;
      score = score - 20 + memoryScore;
    }

    // Pool efficiency impact (10% weight)
    if (data.poolEfficiency !== undefined) {
      const poolScore = (data.poolEfficiency / 100) * 10;
      score = score - 10 + poolScore;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }, []);

  // Update performance data
  const updatePerformanceData = useCallback(() => {
    const fps = monitor.getCurrentFPS();
    const avgRenderTime = monitor.getAverageMetric('render');
    const memoryUsage = calculateMemoryUsage();
    const poolEfficiency = calculatePoolEfficiency();
    const activeMeasurementsCount = activeMeasurements.current.size;

    const newData: PerformanceData = {
      fps,
      avgRenderTime,
      memoryUsage,
      poolEfficiency,
      healthScore: 0, // Will be calculated below
      activeMeasurements: activeMeasurementsCount,
      history: [],
    };

    newData.healthScore = calculateHealthScore(newData);

    setPerformanceData(prevData => {
      // Update history
      const newHistory = [...prevData.history];
      newHistory.push({
        timestamp: Date.now(),
        fps,
        renderTime: avgRenderTime,
        memoryUsage,
      });

      // Limit history size
      if (newHistory.length > finalConfig.maxHistorySize) {
        newHistory.splice(0, newHistory.length - finalConfig.maxHistorySize);
      }

      return {
        ...newData,
        history: newHistory,
      };
    });

    // Check thresholds and update alerts
    const newAlerts: PerformanceAlerts = {};

    if (fps < finalConfig.thresholds.minFPS!) {
      newAlerts.lowFPS = true;
    }

    if (avgRenderTime > finalConfig.thresholds.maxRenderTime!) {
      newAlerts.highRenderTime = true;
    }

    if (memoryUsage > finalConfig.thresholds.maxMemoryUsage!) {
      newAlerts.highMemoryUsage = true;
    }

    setAlerts(newAlerts);

    // Debug logging via centralized logger
    if (finalConfig.enableDebugLogging) {
      log.debug('Performance update', {
        fps,
        avgRenderTime,
        memoryUsage,
        poolEfficiency,
        healthScore: newData.healthScore,
        alerts: newAlerts,
      });
    }

    // Add performance alerts to error store when thresholds exceeded
    if (newAlerts.lowFPS) {
      addPerformanceError(
        'Low FPS detected',
        {
          timestamp: Date.now(),
          renderTime: avgRenderTime,
          memoryUsage: (performance as any).memory?.usedJSHeapSize,
        },
        { additionalData: { fps } }
      );
      log.warn('Low FPS detected', { fps });
    }
    if (newAlerts.highRenderTime) {
      addPerformanceError('High render time', {
        timestamp: Date.now(),
        renderTime: avgRenderTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
      });
      log.warn('High render time', { avgRenderTime });
    }
    if (newAlerts.highMemoryUsage) {
      addPerformanceError(
        'High memory usage',
        {
          timestamp: Date.now(),
          renderTime: avgRenderTime,
          memoryUsage: (performance as any).memory?.usedJSHeapSize,
        },
        { additionalData: { reportedMB: memoryUsage } }
      );
      log.warn('High memory usage', { memoryUsageMB: memoryUsage });
    }
  }, [monitor, calculateMemoryUsage, calculatePoolEfficiency, calculateHealthScore, finalConfig]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    pollingInterval.current = setInterval(updatePerformanceData, finalConfig.pollingInterval);

    if (finalConfig.enableDebugLogging) {
      log.info('Performance monitoring started', { config: finalConfig });
    }
  }, [isMonitoring, updatePerformanceData, finalConfig]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!isMonitoring) return;

    setIsMonitoring(false);
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }

    if (finalConfig.enableDebugLogging) {
      log.info('Performance monitoring stopped');
    }
  }, [isMonitoring, finalConfig.enableDebugLogging]);

  // Performance controls
  const controls: PerformanceControls = useMemo(
    () => ({
      startMeasurement: (name: string, metadata?: Record<string, any>) => {
        const id = `measurement-${++measurementCounter.current}`;
        const measurement: PerformanceMeasurement = {
          id,
          name,
          startTime: performance.now(),
          metadata,
        };

        activeMeasurements.current.set(id, measurement);

        if (finalConfig.enableDebugLogging) {
          log.debug(`Started measurement: ${name}`, { id });
        }

        return id;
      },

      endMeasurement: (id: string) => {
        const measurement = activeMeasurements.current.get(id);
        if (!measurement) {
          log.warn('Measurement not found', { id });
          return null;
        }

        const endTime = performance.now();
        const duration = endTime - measurement.startTime;

        measurement.endTime = endTime;
        measurement.duration = duration;

        // Record with PerformanceMonitor
        monitor.recordMetric(measurement.name, {
          timestamp: measurement.startTime,
          duration,
          type: 'custom',
          value: duration,
        });

        activeMeasurements.current.delete(id);

        if (finalConfig.enableDebugLogging) {
          log.debug('Ended measurement', {
            name: measurement.name,
            duration: Number(duration.toFixed(2)),
          });
        }

        return duration;
      },

      measureOperation: <T>(name: string, operation: () => T, metadata?: Record<string, any>) => {
        return monitor.measure(name, operation);
      },

      measureAsync: async <T>(
        name: string,
        operation: () => Promise<T>,
        metadata?: Record<string, any>
      ) => {
        return monitor.measureAsync(name, operation);
      },

      recordMetric: (name: string, value: number, metadata?: Record<string, any>) => {
        if (!customMetrics.current.has(name)) {
          customMetrics.current.set(name, []);
        }

        const metrics = customMetrics.current.get(name)!;
        metrics.push(value);

        // Limit metric history
        if (metrics.length > finalConfig.maxHistorySize) {
          metrics.splice(0, metrics.length - finalConfig.maxHistorySize);
        }

        monitor.recordMetric(name, {
          timestamp: Date.now(),
          duration: 0,
          type: 'custom',
          value,
        });

        if (finalConfig.enableDebugLogging) {
          log.debug('Recorded metric', { name, value });
        }
      },

      clearHistory: () => {
        setPerformanceData(prev => ({ ...prev, history: [] }));
        customMetrics.current.clear();

        if (finalConfig.enableDebugLogging) {
          log.info('Performance history cleared');
        }
      },

      exportData: (): PerformanceExportData => {
        const exportData: PerformanceExportData = {
          timestamp: Date.now(),
          config: finalConfig,
          data: performanceData,
          measurements: Array.from(activeMeasurements.current.values()),
          customMetrics: Object.fromEntries(Array.from(customMetrics.current.entries())),
        };

        if (finalConfig.enableDebugLogging) {
          log.info('Performance data exported', { exportData });
        }

        return exportData;
      },

      reset: () => {
        activeMeasurements.current.clear();
        customMetrics.current.clear();
        measurementCounter.current = 0;
        setPerformanceData({
          fps: 60,
          avgRenderTime: 0,
          memoryUsage: 0,
          poolEfficiency: 100,
          healthScore: 100,
          activeMeasurements: 0,
          history: [],
        });
        setAlerts({});

        if (finalConfig.enableDebugLogging) {
          log.info('Performance monitoring reset');
        }
      },
    }),
    [monitor, performanceData, finalConfig]
  );

  // Component lifecycle tracking
  useEffect(() => {
    if (finalConfig.autoTrackLifecycle) {
      const componentName = 'usePerformanceMonitoring';
      const mountId = controls.startMeasurement(`${componentName}-mount`);

      return () => {
        controls.endMeasurement(mountId);
        controls.recordMetric(`${componentName}-unmount`, Date.now());
      };
    }
  }, [finalConfig.autoTrackLifecycle, controls]);

  // Auto-start monitoring
  useEffect(() => {
    startMonitoring();
    return stopMonitoring;
  }, [startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
      activeMeasurements.current.clear();
      customMetrics.current.clear();
    };
  }, [stopMonitoring]);

  // Memory pressure detection
  useEffect(() => {
    if (!finalConfig.enableMemoryTracking) return;

    const checkMemoryPressure = () => {
      const now = Date.now();
      const timeSinceLastGC = now - lastGCTime.current;

      // Trigger GC hint if memory usage is high and enough time has passed
      if (
        performanceData.memoryUsage > finalConfig.thresholds.maxMemoryUsage! * 0.8 &&
        timeSinceLastGC > 30000
      ) {
        // 30 seconds

        if ('gc' in window && typeof (window as any).gc === 'function') {
          (window as any).gc();
          lastGCTime.current = now;

          if (finalConfig.enableDebugLogging) {
            log.info('Triggered garbage collection due to memory pressure');
          }
        }
      }
    };

    const interval = setInterval(checkMemoryPressure, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [performanceData.memoryUsage, finalConfig]);

  return {
    /** Current performance data */
    data: performanceData,
    /** Performance alerts */
    alerts,
    /** Monitoring status */
    isMonitoring,
    /** Performance controls and measurement functions */
    controls,
    /** Start monitoring manually */
    startMonitoring,
    /** Stop monitoring manually */
    stopMonitoring,
    /** Current configuration */
    config: finalConfig,
  };
}

// Helper hooks for common patterns
export function useRenderPerformance(componentName: string) {
  const { controls } = usePerformanceMonitoring({
    autoTrackLifecycle: false,
    enableDebugLogging: true,
  });

  useEffect(() => {
    const renderId = controls.startMeasurement(`${componentName}-render`);
    return () => {
      controls.endMeasurement(renderId);
    };
  });

  return controls;
}

export function useAsyncPerformance() {
  const { controls } = usePerformanceMonitoring();

  return {
    measureAsync: controls.measureAsync,
    recordMetric: controls.recordMetric,
  };
}

export function useMemoryTracking() {
  const { data, controls } = usePerformanceMonitoring({
    enableMemoryTracking: true,
    pollingInterval: 1000,
  });

  return {
    memoryUsage: data.memoryUsage,
    poolEfficiency: data.poolEfficiency,
    recordMemoryMetric: (name: string, value: number) =>
      controls.recordMetric(`memory-${name}`, value),
  };
}
