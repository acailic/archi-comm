/**
 * ArchiComm Canvas Performance Manager
 * Specialized performance manager for coordinating canvas operations across different systems
 */

import {
    CanvasOptimizer,
    OptimizedEventSystem,
    PerformanceMonitor
} from './PerformanceOptimizer';

export interface CanvasPerformanceConfig {
  mode: 'quality' | 'balanced' | 'performance';
  enableWorkers: boolean;
  enableOffscreenCanvas: boolean;
  maxMemoryUsage: number; // MB
  targetFPS: number;
  adaptiveQuality: boolean;
  debugMode: boolean;
}

export interface PerformanceBudget {
  renderTime: number; // ms
  memoryUsage: number; // MB
  fpsThreshold: number;
  complexityThreshold: number;
}

export interface CanvasSystemMetrics {
  id: string;
  type: 'svg' | 'canvas2d' | 'webgl';
  fps: number;
  renderTime: number;
  memoryUsage: number;
  complexity: number;
  workerActive: boolean;
}

export interface PerformanceRecommendation {
  type: 'warning' | 'suggestion' | 'critical';
  message: string;
  action: string;
  impact: 'low' | 'medium' | 'high';
}

export class CanvasPerformanceManager {
  private static instance: CanvasPerformanceManager;
  private config: CanvasPerformanceConfig;
  private optimizers: Map<string, CanvasOptimizer> = new Map();
  private workers: Map<string, Worker> = new Map();
  private workerQueue: Array<{ id: string; canvas: HTMLCanvasElement }> = [];
  private idleWorkers: Worker[] = [];
  private performanceMonitor: PerformanceMonitor;
  private eventSystem: OptimizedEventSystem;
  private systemMetrics: Map<string, CanvasSystemMetrics> = new Map();
  private performanceBudgets: Map<string, PerformanceBudget> = new Map();
  private recommendations: PerformanceRecommendation[] = [];
  private capabilities: SystemCapabilities;
  private listeners: Set<PerformanceEventListener> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private adaptiveQualityEnabled = true;
  private currentQualityLevel = 1.0;

  static getInstance(config?: Partial<CanvasPerformanceConfig>): CanvasPerformanceManager {
    if (!CanvasPerformanceManager.instance) {
      CanvasPerformanceManager.instance = new CanvasPerformanceManager(config);
    }
    return CanvasPerformanceManager.instance;
  }

  constructor(config?: Partial<CanvasPerformanceConfig>) {
    this.config = {
      mode: 'balanced',
      enableWorkers: true,
      enableOffscreenCanvas: true,
      maxMemoryUsage: 512,
      targetFPS: 60,
      adaptiveQuality: true,
      debugMode: false,
      ...config,
    };

    // Initialize with error handling
    try {
      this.performanceMonitor = PerformanceMonitor.getInstance();
    } catch (error) {
      console.warn('Failed to initialize PerformanceMonitor:', error);
      // Create a minimal fallback monitor
      this.performanceMonitor = {
        recordMetric: () => {},
        getCurrentFPS: () => 60,
        getMetrics: () => [],
        getAverageMetric: () => 0,
        measure: (name: string, fn: () => any) => fn(),
      } as any;
    }

    try {
      this.eventSystem = OptimizedEventSystem.getInstance();
    } catch (error) {
      console.warn('Failed to initialize OptimizedEventSystem:', error);
      this.eventSystem = {} as any; // Fallback to empty object
    }

    // Detect capabilities with comprehensive error handling
    try {
      this.capabilities = this.detectSystemCapabilities();
    } catch (error) {
      console.warn('Failed to detect system capabilities:', error);
      // Provide safe defaults
      this.capabilities = {
        supportsWorkers: false,
        supportsOffscreenCanvas: false,
        supportsWebGL: false,
        supportsImageBitmap: false,
        maxTextureSize: 2048,
        devicePixelRatio: 1,
        hardwareConcurrency: 4,
        memoryInfo: { usedJSHeapSize: 0, totalJSHeapSize: 0 },
      };
    }

    // Initialize with error handling
    try {
      this.initializeDefaultBudgets();
      this.adaptConfigurationToCapabilities();
      this.startPerformanceMonitoring();
    } catch (error) {
      console.warn('Failed to complete CanvasPerformanceManager initialization:', error);
    }

    if (this.config.debugMode) {
      console.log('CanvasPerformanceManager initialized with config:', this.config);
      console.log('System capabilities:', this.capabilities);
    }
  }

  getWorkerCapacity(): number {
    const hc = (typeof navigator !== 'undefined' && (navigator as any).hardwareConcurrency) || 4;
    return Math.max(1, hc - 1);
  }

  /**
   * Register a canvas system for performance management
   * Now accepts any HTMLElement to better support SVG-based systems
   */
  registerCanvasSystem(
    id: string,
    element: HTMLElement,
    type: 'svg' | 'canvas2d' | 'webgl' = 'svg'
  ): CanvasOptimizer {
    // Validate element type against system type
    if ((type === 'canvas2d' || type === 'webgl') && !(element instanceof HTMLCanvasElement)) {
      console.warn(`Element type mismatch: ${type} system requires HTMLCanvasElement, got ${element.tagName}`);
    }
    // Check if already registered to prevent duplicates
    if (this.optimizers.has(id)) {
      if (this.config.debugMode) {
        console.log(`Canvas system ${id} is already registered, returning existing optimizer`);
      }
      return this.optimizers.get(id)!;
    }

    // Create optimizer with appropriate mode
    try {
      const optimizer = new CanvasOptimizer(element, {
        compatibilityMode: type === 'svg'
      });
      this.optimizers.set(id, optimizer);
    } catch (error) {
      console.error(`Failed to create optimizer for ${type} system:`, error);
      throw new Error(`Canvas system registration failed for ${id}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }

    // Initialize metrics tracking
    this.systemMetrics.set(id, {
      id,
      type,
      fps: 60,
      renderTime: 0,
      memoryUsage: 0,
      complexity: 0,
      workerActive: false,
    });

    // Set up performance budget for this system
    if (!this.performanceBudgets.has(id)) {
      this.performanceBudgets.set(id, this.getDefaultBudget(type));
    }

    // Initialize worker if enabled and supported (only for HTML canvas elements)
    if (this.config.enableWorkers && this.capabilities.supportsWorkers && element instanceof HTMLCanvasElement) {
      this.initializeWorker(id, element);
    }

    if (this.config.debugMode) {
      console.log(`Canvas system ${id} registered successfully with type ${type}`);
    }

    this.notifyListeners('systemRegistered', { id, type });
    return optimizer;
  }

  /**
   * Unregister a canvas system
   */
  unregisterCanvasSystem(id: string): void {
    // Only log if registration actually exists to reduce noise
    if (!this.optimizers.has(id) && !this.workers.has(id) && !this.systemMetrics.has(id)) {
      if (this.config.debugMode) {
        console.log(`Canvas system ${id} was not registered, skipping unregister`);
      }
      return;
    }

    if (this.config.debugMode) {
      console.log(`Unregistering canvas system: ${id}`);
    }

    // Cleanup optimizer
    const optimizer = this.optimizers.get(id);
    if (optimizer) {
      try {
        // Call cleanup method if optimizer has one
        if (typeof (optimizer as any).cleanup === 'function') {
          (optimizer as any).cleanup();
        }
      } catch (cleanupError) {
        console.warn(`Error cleaning up optimizer for canvas ${id}:`, cleanupError);
      }
      this.optimizers.delete(id);
    }

    // Cleanup worker with enhanced error handling
    const worker = this.workers.get(id);
    if (worker) {
      try {
        // Send termination message first
        worker.postMessage({ type: 'terminate' });

        // Wait briefly then terminate
        setTimeout(() => {
          try {
            worker.terminate();
          } catch (terminateError) {
            if (this.config.debugMode) {
              console.warn(`Error terminating worker for canvas ${id}:`, terminateError);
            }
          }
        }, 100);

      } catch (error) {
        if (this.config.debugMode) {
          console.warn(`Error during worker cleanup for canvas ${id}:`, error);
        }

        // Force terminate as fallback
        try {
          worker.terminate();
        } catch (forceTerminateError) {
          // Silent fallback - only log in debug mode
          if (this.config.debugMode) {
            console.warn(`Error force-terminating worker for canvas ${id}:`, forceTerminateError);
          }
        }
      }

      this.workers.delete(id);

      // Remove from idle workers if present
      const idleIndex = this.idleWorkers.indexOf(worker);
      if (idleIndex !== -1) {
        this.idleWorkers.splice(idleIndex, 1);
      }

      // Process queue to initialize waiting workers
      this.processWorkerQueue();
    }

    // Remove from worker queue if present
    this.workerQueue = this.workerQueue.filter(item => item.id !== id);

    // Cleanup metrics and budgets
    this.systemMetrics.delete(id);
    this.performanceBudgets.delete(id);

    // Remove system-specific recommendations
    this.recommendations = this.recommendations.filter(
      rec => !rec.message.includes(`System ${id}`) && !rec.message.includes(`canvas ${id}`)
    );

    if (this.config.debugMode) {
      console.log(`Canvas system ${id} successfully unregistered`);
    }
    this.notifyListeners('systemUnregistered', { id });
  }

  /**
   * Get optimizer for a specific canvas system
   */
  getOptimizer(id: string): CanvasOptimizer | undefined {
    return this.optimizers.get(id);
  }

  /**
   * Update performance configuration
   */
  updateConfig(updates: Partial<CanvasPerformanceConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };

    // Apply configuration changes
    if (oldConfig.mode !== this.config.mode) {
      this.applyPerformanceMode(this.config.mode);
    }

    if (oldConfig.adaptiveQuality !== this.config.adaptiveQuality) {
      this.adaptiveQualityEnabled = this.config.adaptiveQuality;
    }

    this.notifyListeners('configUpdated', { oldConfig, newConfig: this.config });
  }

  /**
   * Set performance budget for a canvas system
   */
  setPerformanceBudget(id: string, budget: Partial<PerformanceBudget>): void {
    const currentBudget = this.performanceBudgets.get(id) || this.getDefaultBudget('canvas2d');
    this.performanceBudgets.set(id, { ...currentBudget, ...budget });
  }

  /**
   * Get current performance metrics for all systems
   */
  getPerformanceMetrics(): Map<string, CanvasSystemMetrics> {
    return new Map(this.systemMetrics);
  }

  /**
   * Get aggregated performance data
   */
  getAggregatedMetrics(): AggregatedMetrics {
    const metrics = Array.from(this.systemMetrics.values());

    if (metrics.length === 0) {
      return {
        averageFPS: 60,
        totalRenderTime: 0,
        totalMemoryUsage: 0,
        totalComplexity: 0,
        activeWorkers: 0,
        performanceScore: 100,
      };
    }

    const averageFPS = metrics.reduce((sum, m) => sum + m.fps, 0) / metrics.length;
    const totalRenderTime = metrics.reduce((sum, m) => sum + m.renderTime, 0);
    const totalMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0);
    const totalComplexity = metrics.reduce((sum, m) => sum + m.complexity, 0);
    const activeWorkers = metrics.filter(m => m.workerActive).length;

    // Calculate performance score (0-100)
    const fpsScore = Math.min(100, (averageFPS / this.config.targetFPS) * 100);
    const memoryScore = Math.max(0, 100 - (totalMemoryUsage / this.config.maxMemoryUsage) * 100);
    const performanceScore = (fpsScore + memoryScore) / 2;

    return {
      averageFPS,
      totalRenderTime,
      totalMemoryUsage,
      totalComplexity,
      activeWorkers,
      performanceScore,
    };
  }

  /**
   * Get current performance recommendations
   */
  getRecommendations(): PerformanceRecommendation[] {
    return [...this.recommendations];
  }

  /**
   * Force performance analysis and optimization
   */
  optimizePerformance(): void {
    this.performanceMonitor.measure('performance-optimization', () => {
      this.analyzePerformance();
      this.applyOptimizations();
      this.updateRecommendations();
    });
  }

  /**
   * Enable/disable adaptive quality
   */
  setAdaptiveQuality(enabled: boolean): void {
    this.adaptiveQualityEnabled = enabled;
    this.config.adaptiveQuality = enabled;

    if (!enabled) {
      this.currentQualityLevel = 1.0;
      this.applyQualityLevel(1.0);
    }
  }

  /**
   * Get current quality level (0.0 - 1.0)
   */
  getCurrentQualityLevel(): number {
    return this.currentQualityLevel;
  }

  /**
   * Get system capabilities
   */
  getSystemCapabilities(): SystemCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Add performance event listener
   */
  addEventListener(listener: PerformanceEventListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove performance event listener
   */
  removeEventListener(listener: PerformanceEventListener): void {
    this.listeners.delete(listener);
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    console.log('Starting CanvasPerformanceManager cleanup');

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Cleanup all optimizers with error handling
    this.optimizers.forEach((optimizer, id) => {
      try {
        if (typeof (optimizer as any).cleanup === 'function') {
          (optimizer as any).cleanup();
        }
      } catch (error) {
        console.warn(`Error cleaning up optimizer ${id}:`, error);
      }
    });
    this.optimizers.clear();

    // Terminate all workers gracefully
    const workerCleanupPromises: Promise<void>[] = [];

    this.workers.forEach((worker, id) => {
      const cleanupPromise = new Promise<void>((resolve) => {
        try {
          // Send termination message
          worker.postMessage({ type: 'terminate' });

          // Set timeout for graceful shutdown
          const timeout = setTimeout(() => {
            try {
              worker.terminate();
            } catch (error) {
              console.warn(`Error terminating worker ${id}:`, error);
            }
            resolve();
          }, 1000); // 1 second timeout

          // Listen for acknowledgment
          const originalHandler = worker.onmessage;
          worker.onmessage = (event) => {
            if (event.data && event.data.type === 'terminate') {
              clearTimeout(timeout);
              worker.terminate();
              resolve();
            } else if (originalHandler) {
              originalHandler(event);
            }
          };

        } catch (error) {
          console.warn(`Error during worker cleanup ${id}:`, error);
          try {
            worker.terminate();
          } catch (terminateError) {
            console.warn(`Error force-terminating worker ${id}:`, terminateError);
          }
          resolve();
        }
      });

      workerCleanupPromises.push(cleanupPromise);
    });

    // Wait for all workers to cleanup (with timeout)
    Promise.allSettled(workerCleanupPromises).then(() => {
      console.log('All workers cleaned up');
    }).catch((error) => {
      console.warn('Error during worker cleanup:', error);
    });

    this.workers.clear();
    this.idleWorkers.forEach(worker => {
      try {
        worker.terminate();
      } catch (error) {
        console.warn('Error terminating idle worker:', error);
      }
    });
    this.idleWorkers = [];
    this.workerQueue = [];

    // Clear all data structures
    this.systemMetrics.clear();
    this.performanceBudgets.clear();
    this.recommendations = [];
    this.listeners.clear();

    console.log('CanvasPerformanceManager cleanup completed');
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): PerformanceExport {
    return {
      timestamp: Date.now(),
      config: this.config,
      metrics: Object.fromEntries(this.systemMetrics),
      budgets: Object.fromEntries(this.performanceBudgets),
      recommendations: this.recommendations,
      capabilities: this.capabilities,
      aggregated: this.getAggregatedMetrics(),
    };
  }

  /**
   * Send render command to worker (new method for updated worker interface)
   */
  renderToWorker(id: string, renderData: any): void {
    const worker = this.workers.get(id);
    if (!worker) {
      console.warn(`No worker found for canvas ${id}`);
      return;
    }

    try {
      worker.postMessage({
        type: 'render',
        data: {
          ...renderData,
          qualityLevel: this.currentQualityLevel
        }
      });
    } catch (error) {
      console.error(`Failed to send render command to worker for canvas ${id}:`, error);
      this.handleWorkerFailure(id, worker);
    }
  }

  // Private methods

  private detectSystemCapabilities(): SystemCapabilities {
    return {
      supportsWorkers: typeof Worker !== 'undefined',
      supportsOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      supportsWebGL: this.checkWebGLSupport(),
      supportsImageBitmap: typeof createImageBitmap !== 'undefined',
      maxTextureSize: this.getMaxTextureSize(),
      devicePixelRatio: window.devicePixelRatio || 1,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      memoryInfo: this.getMemoryInfo(),
    };
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private getMaxTextureSize(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl');
      return gl ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 2048;
    } catch {
      return 2048;
    }
  }

  private getMemoryInfo(): any {
    // @ts-ignore - performance.memory is not in all browsers
    return (performance as any).memory || { usedJSHeapSize: 0, totalJSHeapSize: 0 };
  }

  private initializeDefaultBudgets(): void {
    const budgets = {
      svg: { renderTime: 16, memoryUsage: 100, fpsThreshold: 50, complexityThreshold: 1000 },
      canvas2d: { renderTime: 8, memoryUsage: 200, fpsThreshold: 55, complexityThreshold: 500 },
      webgl: { renderTime: 4, memoryUsage: 300, fpsThreshold: 58, complexityThreshold: 2000 },
    };

    Object.entries(budgets).forEach(([type, budget]) => {
      this.performanceBudgets.set(`default-${type}`, budget);
    });
  }

  private getDefaultBudget(type: 'svg' | 'canvas2d' | 'webgl'): PerformanceBudget {
    return (
      this.performanceBudgets.get(`default-${type}`) || {
        renderTime: 16,
        memoryUsage: 100,
        fpsThreshold: 50,
        complexityThreshold: 500,
      }
    );
  }

  private startPerformanceMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateSystemMetrics();
      this.checkPerformanceBudgets();

      if (this.adaptiveQualityEnabled) {
        this.adjustQualityLevel();
      }
    }, 500); // Monitor every 500ms
  }

  private updateSystemMetrics(): void {
    this.systemMetrics.forEach((metrics, id) => {
      // Update FPS
      metrics.fps = this.performanceMonitor.getCurrentFPS();

      // Update render time
      const renderMetrics = this.performanceMonitor.getMetrics(`${id}-render`);
      if (renderMetrics.length > 0) {
        metrics.renderTime = this.performanceMonitor.getAverageMetric(`${id}-render`);
      }

      // Update memory usage
      const memoryInfo = this.getMemoryInfo();
      metrics.memoryUsage = memoryInfo.usedJSHeapSize / (1024 * 1024); // Convert to MB

      // Update worker status
      metrics.workerActive = this.workers.has(id);
    });
  }

  private checkPerformanceBudgets(): void {
    this.systemMetrics.forEach((metrics, id) => {
      const budget = this.performanceBudgets.get(id);
      if (!budget) return;

      // Check FPS budget
      if (metrics.fps < budget.fpsThreshold) {
        this.addRecommendation({
          type: 'warning',
          message: `System ${id} FPS (${metrics.fps}) below threshold (${budget.fpsThreshold})`,
          action: 'Consider reducing visual complexity or enabling performance mode',
          impact: 'medium',
        });
      }

      // Check render time budget
      if (metrics.renderTime > budget.renderTime) {
        this.addRecommendation({
          type: 'warning',
          message: `System ${id} render time (${metrics.renderTime}ms) exceeds budget (${budget.renderTime}ms)`,
          action: 'Enable render batching or reduce draw calls',
          impact: 'high',
        });
      }

      // Check memory budget
      if (metrics.memoryUsage > budget.memoryUsage) {
        this.addRecommendation({
          type: 'critical',
          message: `System ${id} memory usage (${metrics.memoryUsage}MB) exceeds budget (${budget.memoryUsage}MB)`,
          action: 'Enable object pooling or reduce cached objects',
          impact: 'high',
        });
      }
    });
  }

  private adjustQualityLevel(): void {
    const aggregated = this.getAggregatedMetrics();
    const targetFPS = this.config.targetFPS;

    if (aggregated.averageFPS < targetFPS * 0.8) {
      // Performance is poor, reduce quality
      this.currentQualityLevel = Math.max(0.5, this.currentQualityLevel - 0.1);
      this.applyQualityLevel(this.currentQualityLevel);
    } else if (aggregated.averageFPS > targetFPS * 0.95 && this.currentQualityLevel < 1.0) {
      // Performance is good, increase quality
      this.currentQualityLevel = Math.min(1.0, this.currentQualityLevel + 0.05);
      this.applyQualityLevel(this.currentQualityLevel);
    }
  }

  private applyQualityLevel(level: number): void {
    this.optimizers.forEach((optimizer, id) => {
      // Apply quality adjustments to each optimizer
      // This would involve adjusting rendering settings, LOD, etc.
      this.notifyListeners('qualityAdjusted', { id, level });
    });
  }

  private applyPerformanceMode(mode: 'quality' | 'balanced' | 'performance'): void {
    const modeSettings = {
      quality: { qualityLevel: 1.0, enableWorkers: true, enableBatching: false },
      balanced: { qualityLevel: 0.8, enableWorkers: true, enableBatching: true },
      performance: { qualityLevel: 0.6, enableWorkers: true, enableBatching: true },
    };

    const settings = modeSettings[mode];
    this.currentQualityLevel = settings.qualityLevel;
    this.applyQualityLevel(settings.qualityLevel);

    this.notifyListeners('modeChanged', { mode, settings });
  }

  private adaptConfigurationToCapabilities(): void {
    // Disable features not supported by the system
    if (!this.capabilities.supportsWorkers) {
      this.config.enableWorkers = false;
    }

    if (!this.capabilities.supportsOffscreenCanvas) {
      this.config.enableOffscreenCanvas = false;
    }

    // Adjust memory limits based on available memory
    if (this.capabilities.memoryInfo.totalJSHeapSize > 0) {
      const availableMemory = this.capabilities.memoryInfo.totalJSHeapSize / (1024 * 1024);
      this.config.maxMemoryUsage = Math.min(this.config.maxMemoryUsage, availableMemory * 0.3);
    }
  }

  private initializeWorker(id: string, canvas: HTMLCanvasElement): void {
    // Check worker support first
    if (!this.capabilities.supportsWorkers) {
      console.log(`Workers not supported. Canvas ${id} will use main thread rendering.`);
      return;
    }

    // Capacity check with detailed logging
    const capacity = this.getWorkerCapacity();
    if (this.workers.size >= capacity) {
      console.log(`Worker capacity reached (${this.workers.size}/${capacity}). Queueing canvas ${id}.`);
      this.workerQueue.push({ id, canvas });
      this.performanceMonitor.recordMetric('worker-queue-length', {
        timestamp: Date.now(),
        duration: 0,
        type: 'queue',
        value: this.workerQueue.length,
      });

      // Add recommendation for capacity issues
      this.addRecommendation({
        type: 'warning',
        message: `Worker capacity reached. Canvas ${id} queued for later initialization.`,
        action: 'Consider reducing the number of concurrent canvas systems or upgrading hardware',
        impact: 'medium',
      });
      return;
    }

    try {
      // Create or reuse worker with enhanced error handling
      let worker: Worker;

      try {
        worker = this.idleWorkers.pop() || new Worker(new URL('./canvas-renderer.ts', import.meta.url), { type: 'module' });
      } catch (workerCreateError) {
        console.error(`Failed to create worker for canvas ${id}:`, workerCreateError);

        // Try fallback worker creation without module type
        try {
          worker = new Worker(new URL('./canvas-renderer.ts', import.meta.url));
        } catch (fallbackError) {
          console.error(`Fallback worker creation also failed for canvas ${id}:`, fallbackError);
          this.addRecommendation({
            type: 'critical',
            message: `Worker creation failed for canvas ${id}. Using fallback main thread rendering.`,
            action: 'Check browser compatibility or disable worker-based rendering',
            impact: 'high',
          });
          return;
        }
      }

      // Set up comprehensive worker event handling
      worker.onmessage = (event) => {
        try {
          this.handleWorkerMessage(id, event.data);
        } catch (messageError) {
          console.error(`Error handling worker message for canvas ${id}:`, messageError);
          this.handleWorkerFailure(id, worker);
        }
      };

      worker.onerror = (error) => {
        console.error(`Worker error for canvas ${id}:`, error);
        this.handleWorkerFailure(id, worker);
      };

      worker.onmessageerror = (error) => {
        console.error(`Worker message error for canvas ${id}:`, error);
        this.handleWorkerFailure(id, worker);
      };

      // Initialize worker with OffscreenCanvas if supported
      if (this.capabilities.supportsOffscreenCanvas) {
        try {
          // Check if canvas is still valid and attached to DOM
          if (!canvas.parentNode) {
            console.warn(`Canvas ${id} is not attached to DOM. Skipping OffscreenCanvas transfer.`);
            worker.terminate();
            return;
          }

          const offscreen = canvas.transferControlToOffscreen();

          // Set up initialization timeout
          const initTimeout = setTimeout(() => {
            console.warn(`Worker initialization timeout for canvas ${id}. Terminating worker.`);
            this.handleWorkerFailure(id, worker);
          }, 10000); // 10 second timeout

          // Send initialization message
          worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);

          // Clear timeout on successful worker registration
          const originalHandler = worker.onmessage;
          worker.onmessage = (event) => {
            if (event.data && (event.data.type === 'initialized' || event.data.type === 'renderComplete')) {
              clearTimeout(initTimeout);
              worker.onmessage = originalHandler; // Restore original handler
            }
            if (originalHandler) originalHandler(event);
          };

        } catch (transferError) {
          console.error(`Failed to transfer control to offscreen for canvas ${id}:`, transferError);
          this.addRecommendation({
            type: 'warning',
            message: `OffscreenCanvas transfer failed for canvas ${id}. Using fallback rendering.`,
            action: 'Check canvas state and browser support for OffscreenCanvas',
            impact: 'medium',
          });

          // Clean up failed worker
          try {
            worker.terminate();
          } catch (terminateError) {
            console.warn(`Error terminating failed worker for canvas ${id}:`, terminateError);
          }
          return;
        }
      } else {
        console.log(`OffscreenCanvas not supported. Worker for canvas ${id} will use alternative rendering.`);

        // Still initialize worker for other operations even without OffscreenCanvas
        worker.postMessage({ type: 'init', canvas: null });
      }

      // Successfully register worker
      this.workers.set(id, worker);

      // Update metrics to reflect active worker
      const metrics = this.systemMetrics.get(id);
      if (metrics) {
        metrics.workerActive = true;
      }

      console.log(`Successfully initialized worker for canvas ${id}`);
      this.processWorkerQueue();

    } catch (error) {
      console.error(`Unexpected error initializing worker for canvas ${id}:`, error);
      this.addRecommendation({
        type: 'critical',
        message: `Worker initialization failed for canvas ${id} due to unexpected error.`,
        action: 'Check browser console for details and consider disabling worker-based rendering',
        impact: 'high',
      });
    }
  }

  private handleWorkerFailure(id: string, worker: Worker): void {
    console.warn(`Handling worker failure for canvas ${id}`);

    try {
      // Clean up worker
      worker.terminate();
    } catch (terminateError) {
      console.warn(`Error terminating failed worker for canvas ${id}:`, terminateError);
    }

    // Remove from active workers
    this.workers.delete(id);

    // Update metrics
    const metrics = this.systemMetrics.get(id);
    if (metrics) {
      metrics.workerActive = false;
    }

    // Add performance recommendation
    this.addRecommendation({
      type: 'warning',
      message: `Worker for canvas ${id} failed and was terminated. Falling back to main thread rendering.`,
      action: 'Check worker stability or disable worker-based rendering if issues persist',
      impact: 'medium',
    });

    // Process queue in case this failure frees up capacity
    this.processWorkerQueue();
  }

  private processWorkerQueue() {
    const capacity = this.getWorkerCapacity();
    const processedCount = 0;

    while (this.workerQueue.length > 0 && this.workers.size < capacity) {
      const next = this.workerQueue.shift();
      if (!next) break;

      // Validate queued item
      if (!next.canvas?.parentNode) {
        console.warn(`Removing invalid canvas ${next.id} from worker queue`);
        continue;
      }

      try {
        this.initializeWorker(next.id, next.canvas);
      } catch (error) {
        console.error(`Failed to process queued worker for canvas ${next.id}:`, error);

        // Add to recommendations
        this.addRecommendation({
          type: 'warning',
          message: `Failed to initialize queued worker for canvas ${next.id}`,
          action: 'Check canvas state and worker compatibility',
          impact: 'medium',
        });
      }
    }

    // Update queue metrics
    this.performanceMonitor.recordMetric('worker-queue-length', {
      timestamp: Date.now(),
      duration: 0,
      type: 'queue',
      value: this.workerQueue.length,
    });

    // Log queue processing if in debug mode
    if (this.config.debugMode && this.workerQueue.length > 0) {
      console.log(`Worker queue processed. Remaining items: ${this.workerQueue.length}`);
    }
  }

  private handleWorkerMessage(id: string, message: any): void {
    if (!message || typeof message !== 'object') {
      console.warn(`Invalid worker message for canvas ${id}:`, message);
      return;
    }

    switch (message.type) {
      case 'initialized':
        console.log(`Worker initialized successfully for canvas ${id}:`, message.message);
        // Worker is ready to receive render commands
        const initMetrics = this.systemMetrics.get(id);
        if (initMetrics) {
          initMetrics.workerActive = true;
        }
        break;

      case 'renderComplete':
        // Record successful render performance
        this.performanceMonitor.recordMetric(`${id}-worker-render`, {
          timestamp: Date.now(),
          duration: message.duration || 0,
          type: 'worker-render',
          value: message.duration || 0,
        });

        // Update system metrics
        const metrics = this.systemMetrics.get(id);
        if (metrics && typeof message.duration === 'number') {
          metrics.renderTime = message.duration;
          if (typeof message.memoryUsage === 'number') {
            metrics.memoryUsage = message.memoryUsage;
          }
        }
        break;

      case 'error':
        console.error(`Worker reported error for canvas ${id}:`, message.message || 'Unknown error');

        // Record error metrics
        this.performanceMonitor.recordMetric(`${id}-worker-error`, {
          timestamp: Date.now(),
          duration: 0,
          type: 'worker-error',
          value: 1,
        });

        // Add performance recommendation for worker errors
        this.addRecommendation({
          type: 'warning',
          message: `Worker for canvas ${id} reported an error: ${message.message || 'Unknown error'}`,
          action: 'Check worker logs and consider fallback rendering',
          impact: 'medium',
        });
        break;

      case 'terminate':
        console.log(`Worker for canvas ${id} requested termination`);
        const worker = this.workers.get(id);
        if (worker) {
          this.handleWorkerFailure(id, worker);
        }
        break;

      default:
        if (this.config.debugMode) {
          console.log(`Unknown worker message type for canvas ${id}:`, message.type);
        }
        break;
    }
  }

  private analyzePerformance(): void {
    const aggregated = this.getAggregatedMetrics();

    // Analyze overall performance
    if (aggregated.performanceScore < 70) {
      this.addRecommendation({
        type: 'critical',
        message: `Overall performance score is low (${aggregated.performanceScore.toFixed(1)})`,
        action: 'Consider enabling performance mode or reducing canvas complexity',
        impact: 'high',
      });
    }

    // Analyze memory usage
    if (aggregated.totalMemoryUsage > this.config.maxMemoryUsage * 0.8) {
      this.addRecommendation({
        type: 'warning',
        message: `Memory usage approaching limit (${aggregated.totalMemoryUsage.toFixed(1)}MB)`,
        action: 'Enable object pooling and cleanup unused resources',
        impact: 'medium',
      });
    }
  }

  private applyOptimizations(): void {
    const aggregated = this.getAggregatedMetrics();

    // Auto-enable workers if performance is poor
    if (aggregated.averageFPS < this.config.targetFPS * 0.7 && this.capabilities.supportsWorkers) {
      this.systemMetrics.forEach((_, id) => {
        if (!this.workers.has(id)) {
          const optimizer = this.optimizers.get(id);
          if (optimizer) {
            // Initialize worker for this system
            // This would require access to the canvas element
          }
        }
      });
    }
  }

  private updateRecommendations(): void {
    // Clear old recommendations
    this.recommendations = [];

    // Generate new recommendations based on current state
    this.analyzePerformance();

    // Limit recommendations to prevent overwhelming the user
    this.recommendations = this.recommendations.slice(0, 5);
  }

  private addRecommendation(recommendation: PerformanceRecommendation): void {
    // Avoid duplicate recommendations
    const exists = this.recommendations.some(
      r => r.message === recommendation.message && r.type === recommendation.type
    );

    if (!exists) {
      this.recommendations.push(recommendation);
    }
  }

  private notifyListeners(event: string, data: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Performance event listener error:', error);
      }
    });
  }
}

// Types and interfaces

export interface SystemCapabilities {
  supportsWorkers: boolean;
  supportsOffscreenCanvas: boolean;
  supportsWebGL: boolean;
  supportsImageBitmap: boolean;
  maxTextureSize: number;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  memoryInfo: any;
}

export interface AggregatedMetrics {
  averageFPS: number;
  totalRenderTime: number;
  totalMemoryUsage: number;
  totalComplexity: number;
  activeWorkers: number;
  performanceScore: number;
}

export interface PerformanceExport {
  timestamp: number;
  config: CanvasPerformanceConfig;
  metrics: Record<string, CanvasSystemMetrics>;
  budgets: Record<string, PerformanceBudget>;
  recommendations: PerformanceRecommendation[];
  capabilities: SystemCapabilities;
  aggregated: AggregatedMetrics;
}

export type PerformanceEventListener = (event: string, data: any) => void;

// Utility functions for React integration

export const useCanvasPerformanceManager = (config?: Partial<CanvasPerformanceConfig>) => {
  const manager = CanvasPerformanceManager.getInstance(config);

  return {
    manager,
    registerCanvas: (id: string, element: HTMLElement, type?: 'svg' | 'canvas2d' | 'webgl') =>
      manager.registerCanvasSystem(id, element, type),
    unregisterCanvas: (id: string) => manager.unregisterCanvasSystem(id),
    getMetrics: () => manager.getAggregatedMetrics(),
    getRecommendations: () => manager.getRecommendations(),
    optimizePerformance: () => manager.optimizePerformance(),
  };
};

export const createPerformancePolicy = (
  budgets: Record<string, Partial<PerformanceBudget>>,
  config: Partial<CanvasPerformanceConfig> = {}
) => {
  const manager = CanvasPerformanceManager.getInstance(config);

  Object.entries(budgets).forEach(([id, budget]) => {
    manager.setPerformanceBudget(id, budget);
  });

  return manager;
};

// Export singleton instance getter
export const getCanvasPerformanceManager = () => CanvasPerformanceManager.getInstance();
