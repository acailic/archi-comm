/**
 * ArchiComm Canvas Performance Manager
 * Specialized performance manager for coordinating canvas operations across different systems
 */

import {
  PerformanceMonitor,
  CanvasOptimizer,
  MemoryOptimizer,
  OptimizedEventSystem,
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

    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.eventSystem = new OptimizedEventSystem();
    this.capabilities = this.detectSystemCapabilities();

    this.initializeDefaultBudgets();
    this.startPerformanceMonitoring();
    this.adaptConfigurationToCapabilities();
  }

  getWorkerCapacity(): number {
    const hc = (typeof navigator !== 'undefined' && (navigator as any).hardwareConcurrency) || 4;
    return Math.max(1, hc - 1);
  }

  /**
   * Register a canvas system for performance management
   */
  registerCanvasSystem(
    id: string,
    canvas: HTMLCanvasElement,
    type: 'svg' | 'canvas2d' | 'webgl' = 'canvas2d'
  ): CanvasOptimizer {
    // Create optimizer for this canvas
    const optimizer = new CanvasOptimizer(canvas);
    this.optimizers.set(id, optimizer);

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

    // Initialize worker if enabled and supported
    if (this.config.enableWorkers && this.capabilities.supportsWorkers) {
      this.initializeWorker(id, canvas);
    }

    this.notifyListeners('systemRegistered', { id, type });
    return optimizer;
  }

  /**
   * Unregister a canvas system
   */
  unregisterCanvasSystem(id: string): void {
    // Cleanup optimizer
    const optimizer = this.optimizers.get(id);
    if (optimizer) {
      // Cleanup optimizer resources
      this.optimizers.delete(id);
    }

    // Cleanup worker
    const worker = this.workers.get(id);
    if (worker) {
      try {
        worker.terminate();
      } catch {}
      this.workers.delete(id);
      this.processWorkerQueue();
    }

    // Cleanup metrics
    this.systemMetrics.delete(id);
    this.performanceBudgets.delete(id);

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
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Cleanup all optimizers
    this.optimizers.clear();

    // Terminate all workers
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();

    // Clear metrics and recommendations
    this.systemMetrics.clear();
    this.recommendations = [];
    this.listeners.clear();
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
    if (!this.capabilities.supportsWorkers) return;

    // Capacity check
    const capacity = this.getWorkerCapacity();
    if (this.workers.size >= capacity) {
      this.workerQueue.push({ id, canvas });
      this.performanceMonitor.recordMetric('worker-queue-length', {
        timestamp: Date.now(),
        duration: 0,
        type: 'queue',
        value: this.workerQueue.length,
      });
      return;
    }

    try {
      const worker = this.idleWorkers.pop() || new Worker(new URL('./canvas-renderer.ts', import.meta.url), { type: 'module' });

      worker.onmessage = event => {
        this.handleWorkerMessage(id, event.data);
      };

      worker.onerror = error => {
        console.warn(`Worker for canvas ${id} failed:`, error);
        this.workers.delete(id);
      };

      // Initialize worker with canvas
      if (this.capabilities.supportsOffscreenCanvas) {
        try {
          const offscreen = canvas.transferControlToOffscreen();
          worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen]);
        } catch (error) {
          console.warn(`Failed to transfer control to offscreen for canvas ${id}:`, error);
        }
      }

      this.workers.set(id, worker);
      this.processWorkerQueue();
    } catch (error) {
      console.warn(`Failed to create worker for canvas ${id}:`, error);
    }
  }

  private processWorkerQueue() {
    const capacity = this.getWorkerCapacity();
    while (this.workerQueue.length > 0 && this.workers.size < capacity) {
      const next = this.workerQueue.shift()!;
      this.initializeWorker(next.id, next.canvas);
    }
    this.performanceMonitor.recordMetric('worker-queue-length', {
      timestamp: Date.now(),
      duration: 0,
      type: 'queue',
      value: this.workerQueue.length,
    });
  }

  private handleWorkerMessage(id: string, message: any): void {
    switch (message.type) {
      case 'renderComplete':
        this.performanceMonitor.recordMetric(`${id}-worker-render`, {
          timestamp: Date.now(),
          duration: message.duration,
          type: 'worker-render',
          value: message.duration,
        });
        break;
      case 'error':
        console.error(`Worker error for canvas ${id}:`, message.error);
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
    registerCanvas: (id: string, canvas: HTMLCanvasElement, type?: 'svg' | 'canvas2d' | 'webgl') =>
      manager.registerCanvasSystem(id, canvas, type),
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
