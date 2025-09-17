import { useEffect, useRef, useCallback, useState } from 'react';
import { useAutoSave } from './useAutoSave';
import { CanvasPerformanceManager, type CanvasPerformanceConfig } from '@/lib/performance/CanvasPerformanceManager';
import { useCanvas } from '@services/canvas/CanvasOrchestrator';

interface UseCanvasIntegrationOptions {
  canvasId: string;
  performanceConfig?: Partial<CanvasPerformanceConfig>;
  enableAutoSave?: boolean;
  autoSaveDelay?: number;
  enablePerformanceMonitoring?: boolean;
  enableErrorRecovery?: boolean;
  onError?: (error: Error) => void;
}

interface CanvasIntegrationState {
  isReady: boolean;
  performanceManager: CanvasPerformanceManager | null;
  qualityLevel: number;
  fps: number;
  memoryUsage: number;
  errorCount: number;
  lastError: Error | null;
}

interface CanvasIntegrationActions {
  registerCanvas: (canvas: HTMLCanvasElement, type?: 'svg' | 'canvas2d' | 'webgl') => void;
  unregisterCanvas: () => void;
  optimizePerformance: () => void;
  resetErrors: () => void;
  forceQualityLevel: (level: number) => void;
  triggerSave: () => void;
}

export interface UseCanvasIntegrationReturn {
  state: CanvasIntegrationState;
  actions: CanvasIntegrationActions;
  orchestrator: ReturnType<typeof useCanvas>;
}

/**
 * Comprehensive hook that integrates all canvas-related functionality
 * including CanvasOrchestrator, CanvasPerformanceManager, auto-save, and error handling
 */
export function useCanvasIntegration(options: UseCanvasIntegrationOptions): UseCanvasIntegrationReturn {
  const {
    canvasId,
    performanceConfig = {},
    enableAutoSave = true,
    autoSaveDelay = 2000,
    enablePerformanceMonitoring = true,
    enableErrorRecovery = true,
    onError
  } = options;

  // Get canvas orchestrator
  const orchestrator = useCanvas();

  // Performance manager instance
  const [performanceManager, setPerformanceManager] = useState<CanvasPerformanceManager | null>(null);
  
  // Integration state
  const [state, setState] = useState<CanvasIntegrationState>({
    isReady: false,
    performanceManager: null,
    qualityLevel: 1.0,
    fps: 60,
    memoryUsage: 0,
    errorCount: 0,
    lastError: null
  });

  // Refs for cleanup and error tracking
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const errorCountRef = useRef(0);
  const performanceListenerRef = useRef<((event: string, data: any) => void) | null>(null);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save integration with debouncing to prevent excessive calls
  const createSaveData = useCallback(() => {
    return {
      components: orchestrator.components,
      connections: orchestrator.connections,
      layers: orchestrator.layers,
      gridConfig: orchestrator.gridConfig,
      activeTool: orchestrator.activeTool,
      metadata: {
        lastModified: new Date().toISOString(),
        canvasId,
        version: '1.0'
      }
    };
  }, [orchestrator, canvasId]);

  // Use a ref to prevent createSaveData from causing re-renders
  const saveDataRef = useRef(createSaveData());

  // Update save data ref only when necessary
  useEffect(() => {
    saveDataRef.current = createSaveData();
  }, [createSaveData]);

  const { forceSave, isSaving, status: saveStatus } = useAutoSave(
    enableAutoSave ? saveDataRef.current : null,
    async (data) => {
      // This would typically save through a persistence service
      console.log('Auto-saving canvas data:', data);
    },
    { delay: autoSaveDelay, enabled: enableAutoSave }
  );

  // Initialize performance manager
  useEffect(() => {
    if (!enablePerformanceMonitoring) return;

    try {
      const manager = CanvasPerformanceManager.getInstance({
        mode: 'balanced',
        enableWorkers: true,
        enableOffscreenCanvas: true,
        adaptiveQuality: true,
        debugMode: false,
        ...performanceConfig
      });

      setPerformanceManager(manager);
      
      setState(prev => ({
        ...prev,
        performanceManager: manager,
        qualityLevel: manager.getCurrentQualityLevel()
      }));

      // Set up performance event listener
      const listener = (event: string, data: any) => {
        switch (event) {
          case 'qualityAdjusted':
            setState(prev => ({
              ...prev,
              qualityLevel: data.level
            }));
            break;
          case 'systemRegistered':
            setState(prev => ({ ...prev, isReady: true }));
            break;
          case 'systemUnregistered':
            setState(prev => ({ ...prev, isReady: false }));
            break;
        }
      };

      manager.addEventListener(listener);
      performanceListenerRef.current = listener;

      return () => {
        if (performanceListenerRef.current) {
          manager.removeEventListener(performanceListenerRef.current);
        }
      };
    } catch (error) {
      console.error('Failed to initialize CanvasPerformanceManager:', error);
      handleError(error instanceof Error ? error : new Error('Performance manager initialization failed'));
    }
  }, [enablePerformanceMonitoring, JSON.stringify(performanceConfig)]);

  // Set up metrics monitoring with throttling to prevent excessive updates
  useEffect(() => {
    if (!performanceManager || !enablePerformanceMonitoring) return;

    let lastUpdateTime = 0;
    const THROTTLE_MS = 1000; // Update metrics at most once per second

    const updateMetrics = () => {
      const now = Date.now();
      if (now - lastUpdateTime < THROTTLE_MS) return;
      lastUpdateTime = now;

      try {
        const aggregated = performanceManager.getAggregatedMetrics();
        setState(prev => ({
          ...prev,
          fps: aggregated.averageFPS,
          memoryUsage: aggregated.totalMemoryUsage,
          qualityLevel: performanceManager.getCurrentQualityLevel()
        }));
      } catch (error) {
        console.warn('Failed to update performance metrics:', error);
      }
    };

    // Update metrics every second, but throttled
    metricsIntervalRef.current = setInterval(updateMetrics, 1000);

    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, [performanceManager, enablePerformanceMonitoring]);

  // Error handling
  const handleError = useCallback((error: Error) => {
    errorCountRef.current += 1;
    
    setState(prev => ({
      ...prev,
      errorCount: errorCountRef.current,
      lastError: error
    }));

    if (onError) {
      onError(error);
    }

    // Attempt error recovery if enabled
    if (enableErrorRecovery && performanceManager) {
      try {
        // Implement basic error recovery strategies
        if (error.message.includes('worker')) {
          performanceManager.updateConfig({ enableWorkers: false });
        } else if (error.message.includes('webgl') || error.message.includes('context')) {
          performanceManager.updateConfig({ enableOffscreenCanvas: false });
        } else if (error.message.includes('memory')) {
          performanceManager.updateConfig({ 
            mode: 'performance',
            maxMemoryUsage: 256 
          });
        }
      } catch (recoveryError) {
        console.error('Error recovery failed:', recoveryError);
      }
    }
  }, [onError, enableErrorRecovery, performanceManager]);

  // Actions
  const registerCanvas = useCallback((canvas: HTMLCanvasElement, type: 'svg' | 'canvas2d' | 'webgl' = 'canvas2d') => {
    if (!performanceManager) {
      console.warn('Performance manager not initialized');
      return;
    }

    try {
      canvasRef.current = canvas;
      performanceManager.registerCanvasSystem(canvasId, canvas, type);
      
      setState(prev => ({ ...prev, isReady: true }));
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Canvas registration failed'));
    }
  }, [performanceManager, canvasId, handleError]);

  const unregisterCanvas = useCallback(() => {
    if (!performanceManager) return;

    try {
      performanceManager.unregisterCanvasSystem(canvasId);
      canvasRef.current = null;
      
      setState(prev => ({ ...prev, isReady: false }));
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Canvas unregistration failed'));
    }
  }, [performanceManager, canvasId, handleError]);

  const optimizePerformance = useCallback(() => {
    if (!performanceManager) return;

    try {
      performanceManager.optimizePerformance();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Performance optimization failed'));
    }
  }, [performanceManager, handleError]);

  const resetErrors = useCallback(() => {
    errorCountRef.current = 0;
    setState(prev => ({
      ...prev,
      errorCount: 0,
      lastError: null
    }));
  }, []);

  const forceQualityLevel = useCallback((level: number) => {
    if (!performanceManager) return;

    try {
      performanceManager.setAdaptiveQuality(false);
      // Note: This would require adding a method to force quality level
      // For now, we'll update our local state
      setState(prev => ({ ...prev, qualityLevel: level }));
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Quality level adjustment failed'));
    }
  }, [performanceManager, handleError]);

  const triggerSave = useCallback(() => {
    try {
      forceSave();
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Save operation failed'));
    }
  }, [forceSave, handleError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
      
      if (performanceManager && performanceListenerRef.current) {
        performanceManager.removeEventListener(performanceListenerRef.current);
      }
      
      // Unregister canvas if still registered
      if (canvasRef.current && performanceManager) {
        try {
          performanceManager.unregisterCanvasSystem(canvasId);
        } catch (error) {
          console.warn('Failed to cleanup canvas registration:', error);
        }
      }
    };
  }, [performanceManager, canvasId]);

  // Global error boundary integration
  useEffect(() => {
    if (!enableErrorRecovery) return;

    const handleGlobalError = (event: ErrorEvent) => {
      if (event.filename?.includes('canvas') || event.message.includes('canvas')) {
        handleError(new Error(event.message));
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && typeof event.reason === 'object' && 
          'message' in event.reason && 
          event.reason.message?.includes('canvas')) {
        handleError(event.reason);
      }
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [enableErrorRecovery, handleError]);

  const actions: CanvasIntegrationActions = {
    registerCanvas,
    unregisterCanvas,
    optimizePerformance,
    resetErrors,
    forceQualityLevel,
    triggerSave
  };

  return {
    state,
    actions,
    orchestrator
  };
}

export default useCanvasIntegration;