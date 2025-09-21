/**
 * Component Lazy Loader - Centralized lazy loading system for heavy UI components
 * Extends existing lazy loading infrastructure to handle more components beyond recharts and tiptap
 * Provides loading states, error boundaries, and performance tracking
 */

import React from 'react';
import { componentOptimizer } from '@/lib/performance/ComponentOptimizer';

export interface LazyLoadConfig {
  /**
   * Component name for debugging and tracking
   */
  name: string;

  /**
   * Preload the component immediately
   */
  preload?: boolean;

  /**
   * Timeout for loading (in ms)
   */
  timeout?: number;

  /**
   * Retry attempts on failure
   */
  retries?: number;

  /**
   * Enable performance tracking
   */
  trackPerformance?: boolean;

  /**
   * Cache the loaded component
   */
  cache?: boolean;

  /**
   * Dependencies to load alongside the main component
   */
  dependencies?: string[];
}

export interface LazyComponentState {
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
  component: React.ComponentType<any> | null;
  loadStartTime: number | null;
  loadEndTime: number | null;
  retryCount: number;
}

interface LoaderEntry {
  promise: Promise<any> | null;
  loader: () => Promise<any>;
  config: LazyLoadConfig;
  state: LazyComponentState;
}

class ComponentLazyLoader {
  private static instance: ComponentLazyLoader | null = null;
  private loaders = new Map<string, LoaderEntry>();
  private preloadQueue: string[] = [];
  private isPreloading = false;

  static getInstance(): ComponentLazyLoader {
    if (!ComponentLazyLoader.instance) {
      ComponentLazyLoader.instance = new ComponentLazyLoader();
    }
    return ComponentLazyLoader.instance;
  }

  /**
   * Register a lazy-loadable component
   */
  register<T = any>(
    name: string,
    loader: () => Promise<T>,
    config: LazyLoadConfig = {}
  ): void {
    const finalConfig: LazyLoadConfig = {
      name,
      preload: false,
      timeout: 10000,
      retries: 2,
      trackPerformance: true,
      cache: true,
      dependencies: [],
      ...config,
    };

    const entry: LoaderEntry = {
      promise: null,
      loader,
      config: finalConfig,
      state: {
        isLoading: false,
        isLoaded: false,
        error: null,
        component: null,
        loadStartTime: null,
        loadEndTime: null,
        retryCount: 0,
      },
    };

    this.loaders.set(name, entry);

    // Add to preload queue if requested
    if (finalConfig.preload) {
      this.preloadQueue.push(name);
      this.processPreloadQueue();
    }

    if (import.meta.env.DEV) {
      console.debug(`[ComponentLazyLoader] Registered component: ${name}`, {
        config: finalConfig,
        preloadQueued: finalConfig.preload,
      });
    }
  }

  /**
   * Load a component by name
   */
  async load<T = any>(name: string): Promise<T> {
    const entry = this.loaders.get(name);
    if (!entry) {
      throw new Error(`Component "${name}" not registered`);
    }

    // Return cached result if available
    if (entry.config.cache && entry.state.isLoaded && entry.state.component) {
      return entry.state.component as T;
    }

    // Return existing promise if already loading
    if (entry.promise) {
      return entry.promise;
    }

    // Start loading
    entry.state.isLoading = true;
    entry.state.loadStartTime = performance.now();
    entry.state.error = null;

    entry.promise = this.performLoad(entry);

    try {
      const result = await entry.promise;
      entry.state.isLoaded = true;
      entry.state.isLoading = false;
      entry.state.loadEndTime = performance.now();
      entry.state.component = result;

      // Track performance
      if (entry.config.trackPerformance && entry.state.loadStartTime) {
        const loadTime = entry.state.loadEndTime! - entry.state.loadStartTime;
        this.trackLoadPerformance(name, loadTime, entry.state.retryCount);
      }

      if (import.meta.env.DEV) {
        const loadTime = entry.state.loadEndTime! - entry.state.loadStartTime!;
        console.debug(`[ComponentLazyLoader] Loaded component: ${name}`, {
          loadTime: `${loadTime.toFixed(2)}ms`,
          retries: entry.state.retryCount,
          cached: entry.config.cache,
        });
      }

      return result;
    } catch (error) {
      entry.state.isLoading = false;
      entry.state.error = error as Error;
      entry.promise = null; // Clear promise to allow retry

      console.error(`[ComponentLazyLoader] Failed to load component: ${name}`, error);
      throw error;
    }
  }

  /**
   * Preload a component without returning it
   */
  async preload(name: string): Promise<void> {
    try {
      await this.load(name);
    } catch (error) {
      console.warn(`[ComponentLazyLoader] Preload failed for: ${name}`, error);
    }
  }

  /**
   * Preload multiple components
   */
  async preloadMultiple(names: string[]): Promise<void> {
    const promises = names.map(name => this.preload(name));
    await Promise.allSettled(promises);
  }

  /**
   * Get component state
   */
  getState(name: string): LazyComponentState | null {
    const entry = this.loaders.get(name);
    return entry ? { ...entry.state } : null;
  }

  /**
   * Check if component is loaded
   */
  isLoaded(name: string): boolean {
    const entry = this.loaders.get(name);
    return entry ? entry.state.isLoaded : false;
  }

  /**
   * Check if component is loading
   */
  isLoading(name: string): boolean {
    const entry = this.loaders.get(name);
    return entry ? entry.state.isLoading : false;
  }

  /**
   * Get all registered component names
   */
  getRegisteredComponents(): string[] {
    return Array.from(this.loaders.keys());
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    total: number;
    loaded: number;
    loading: number;
    failed: number;
    performance: Array<{
      name: string;
      loadTime: number;
      retries: number;
    }>;
  } {
    const entries = Array.from(this.loaders.values());
    const total = entries.length;
    const loaded = entries.filter(e => e.state.isLoaded).length;
    const loading = entries.filter(e => e.state.isLoading).length;
    const failed = entries.filter(e => e.state.error !== null).length;

    const performance = entries
      .filter(e => e.state.loadStartTime && e.state.loadEndTime)
      .map(e => ({
        name: e.config.name,
        loadTime: e.state.loadEndTime! - e.state.loadStartTime!,
        retries: e.state.retryCount,
      }))
      .sort((a, b) => b.loadTime - a.loadTime);

    return { total, loaded, loading, failed, performance };
  }

  /**
   * Clear cache for a component
   */
  clearCache(name: string): void {
    const entry = this.loaders.get(name);
    if (entry) {
      entry.state.isLoaded = false;
      entry.state.component = null;
      entry.promise = null;
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.loaders.forEach((entry, name) => {
      this.clearCache(name);
    });
  }

  private async performLoad<T>(entry: LoaderEntry): Promise<T> {
    const { loader, config } = entry;

    // Load dependencies first
    if (config.dependencies && config.dependencies.length > 0) {
      await Promise.all(config.dependencies.map(dep => this.load(dep)));
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= (config.retries || 0); attempt++) {
      try {
        // Apply timeout if configured
        const loadPromise = loader();
        const timeoutPromise = config.timeout
          ? new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Loading timeout after ${config.timeout}ms`)), config.timeout)
            )
          : null;

        const result = timeoutPromise
          ? await Promise.race([loadPromise, timeoutPromise])
          : await loadPromise;

        // Extract default export if it's a module
        return (result as any)?.default || result;
      } catch (error) {
        lastError = error as Error;
        entry.state.retryCount = attempt + 1;

        if (attempt < (config.retries || 0)) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));

          if (import.meta.env.DEV) {
            console.warn(`[ComponentLazyLoader] Retry ${attempt + 1}/${config.retries} for ${config.name}`, error);
          }
        }
      }
    }

    throw lastError || new Error(`Failed to load component: ${config.name}`);
  }

  private trackLoadPerformance(name: string, loadTime: number, retries: number): void {
    if (componentOptimizer) {
      componentOptimizer.recordSample({
        componentId: `LazyLoader:${name}`,
        duration: loadTime,
        timestamp: Date.now(),
        commitType: 'mount',
        propsChanged: ['initial-load'],
      });
    }
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    try {
      // Process queue in batches to avoid overwhelming the system
      const batchSize = 3;
      while (this.preloadQueue.length > 0) {
        const batch = this.preloadQueue.splice(0, batchSize);
        await Promise.allSettled(batch.map(name => this.preload(name)));

        // Small delay between batches
        if (this.preloadQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.isPreloading = false;
    }
  }
}

// Singleton instance
export const componentLazyLoader = ComponentLazyLoader.getInstance();

// Pre-register common heavy components
export function registerCommonComponents(): void {
  // Radix UI components
  componentLazyLoader.register(
    'radix-ui-dropdown',
    () => import('@radix-ui/react-dropdown-menu'),
    { name: 'radix-ui-dropdown', preload: false }
  );

  componentLazyLoader.register(
    'radix-ui-dialog',
    () => import('@radix-ui/react-dialog'),
    { name: 'radix-ui-dialog', preload: false }
  );

  componentLazyLoader.register(
    'radix-ui-tooltip',
    () => import('@radix-ui/react-tooltip'),
    { name: 'radix-ui-tooltip', preload: false }
  );

  componentLazyLoader.register(
    'radix-ui-popover',
    () => import('@radix-ui/react-popover'),
    { name: 'radix-ui-popover', preload: false }
  );

  // Form components
  componentLazyLoader.register(
    'react-hook-form',
    () => import('react-hook-form'),
    { name: 'react-hook-form', preload: false }
  );

  componentLazyLoader.register(
    'zod',
    () => import('zod'),
    { name: 'zod', preload: false }
  );

  // Monaco Editor
  componentLazyLoader.register(
    'monaco-editor',
    () => import('@monaco-editor/react'),
    { name: 'monaco-editor', preload: false, timeout: 15000 }
  );

  // Chart libraries
  componentLazyLoader.register(
    'recharts',
    () => import('recharts'),
    { name: 'recharts', preload: false }
  );

  componentLazyLoader.register(
    'd3',
    () => import('d3'),
    { name: 'd3', preload: false, timeout: 15000 }
  );

  // TipTap editor (use existing infrastructure)
  componentLazyLoader.register(
    'tiptap-react',
    () => import('@tiptap/react'),
    { name: 'tiptap-react', preload: false }
  );

  componentLazyLoader.register(
    'tiptap-starter-kit',
    () => import('@tiptap/starter-kit'),
    { name: 'tiptap-starter-kit', preload: false, dependencies: ['tiptap-react'] }
  );

  // Icon libraries
  componentLazyLoader.register(
    'lucide-react',
    () => import('lucide-react'),
    { name: 'lucide-react', preload: true } // Icons are commonly used
  );

  componentLazyLoader.register(
    'react-icons',
    () => import('react-icons'),
    { name: 'react-icons', preload: false }
  );

  // Date/time components
  componentLazyLoader.register(
    'date-fns',
    () => import('date-fns'),
    { name: 'date-fns', preload: false }
  );

  // File handling
  componentLazyLoader.register(
    'react-dropzone',
    () => import('react-dropzone'),
    { name: 'react-dropzone', preload: false }
  );

  // Animation libraries
  componentLazyLoader.register(
    'framer-motion',
    () => import('framer-motion'),
    { name: 'framer-motion', preload: false }
  );

  componentLazyLoader.register(
    'lottie-react',
    () => import('lottie-react'),
    { name: 'lottie-react', preload: false }
  );

  if (import.meta.env.DEV) {
    console.debug('[ComponentLazyLoader] Common components registered');
  }
}

// React hook for using lazy-loaded components
export function useLazyComponent<T = any>(name: string): {
  component: T | null;
  isLoading: boolean;
  isLoaded: boolean;
  error: Error | null;
  load: () => Promise<T>;
  reload: () => Promise<T>;
} {
  const [state, setState] = React.useState<LazyComponentState>(() => {
    const currentState = componentLazyLoader.getState(name);
    return currentState || {
      isLoading: false,
      isLoaded: false,
      error: null,
      component: null,
      loadStartTime: null,
      loadEndTime: null,
      retryCount: 0,
    };
  });

  const load = React.useCallback(async (): Promise<T> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      const component = await componentLazyLoader.load<T>(name);
      const newState = componentLazyLoader.getState(name);
      if (newState) {
        setState(newState);
      }
      return component;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false, error: error as Error }));
      throw error;
    }
  }, [name]);

  const reload = React.useCallback(async (): Promise<T> => {
    componentLazyLoader.clearCache(name);
    return load();
  }, [name, load]);

  // Auto-load if component is already loaded
  React.useEffect(() => {
    const currentState = componentLazyLoader.getState(name);
    if (currentState && currentState.isLoaded) {
      setState(currentState);
    }
  }, [name]);

  return {
    component: state.component as T,
    isLoading: state.isLoading,
    isLoaded: state.isLoaded,
    error: state.error,
    load,
    reload,
  };
}

// React hook for preloading components on component mount
export function usePreloadComponents(names: string[]): void {
  React.useEffect(() => {
    componentLazyLoader.preloadMultiple(names);
  }, [names]);
}

// Development tools
if (import.meta.env.DEV) {
  (window as any).__COMPONENT_LAZY_LOADER__ = {
    getInstance: () => componentLazyLoader,
    getStats: () => componentLazyLoader.getStats(),
    preload: (name: string) => componentLazyLoader.preload(name),
    clearCache: (name: string) => componentLazyLoader.clearCache(name),
    clearAllCaches: () => componentLazyLoader.clearAllCaches(),
  };
}

// Initialize common components on module load
registerCommonComponents();

export default ComponentLazyLoader;