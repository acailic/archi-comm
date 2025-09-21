/**
 * Reload Tracker Utility
 * Helps track and prevent unnecessary reloads in development
 */

import React from 'react';

export interface ReloadEvent {
  timestamp: number;
  source: string;
  reason: string;
  stackTrace?: string;
}

class ReloadTracker {
  private events: ReloadEvent[] = [];
  private isTracking = false;
  private listeners: Set<(event: ReloadEvent) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Only track in development
    if (import.meta.env.DEV) {
      this.isTracking = true;
      this.setupListeners();
    }
  }

  private setupListeners() {
    // Track page unload events
    window.addEventListener('beforeunload', e => {
      this.logEvent('beforeunload', 'Page is about to unload');
    });

    // Track HMR events if available
    if (import.meta.hot) {
      import.meta.hot.on('vite:beforeUpdate', () => {
        this.logEvent('hmr', 'Vite HMR before update');
      });

      import.meta.hot.on('vite:afterUpdate', () => {
        this.logEvent('hmr', 'Vite HMR after update');
      });

      import.meta.hot.on('vite:error', error => {
        this.logEvent('hmr-error', `HMR Error: ${error.message}`, error.stack);
      });
    }

    // Track navigation events
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      this.logEvent('navigation', 'pushState called');
      return originalPushState.apply(history, args);
    };

    history.replaceState = (...args) => {
      this.logEvent('navigation', 'replaceState called');
      return originalReplaceState.apply(history, args);
    };

    window.addEventListener('popstate', () => {
      this.logEvent('navigation', 'popstate event');
    });
  }

  logEvent(source: string, reason: string, stackTrace?: string) {
    if (!this.isTracking) return;

    const event: ReloadEvent = {
      timestamp: Date.now(),
      source,
      reason,
      stackTrace,
    };

    this.events.push(event);

    // Keep only last 50 events to prevent memory leaks
    if (this.events.length > 50) {
      this.events = this.events.slice(-50);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(event));

    // Console log in development
    console.log(`🔄 Reload Event [${source}]: ${reason}`, event);
  }

  getEvents(): ReloadEvent[] {
    return [...this.events];
  }

  getRecentEvents(count = 10): ReloadEvent[] {
    return this.events.slice(-count);
  }

  clearEvents() {
    this.events = [];
  }

  onEvent(listener: (event: ReloadEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Method to check if too many reloads are happening
  isReloadingTooOften(timeWindowMs = 10000, threshold = 5): boolean {
    const now = Date.now();
    const recentEvents = this.events.filter(event => now - event.timestamp < timeWindowMs);
    return recentEvents.length >= threshold;
  }

  // Method to get reload statistics
  getStats() {
    const now = Date.now();
    const last5Min = this.events.filter(e => now - e.timestamp < 5 * 60 * 1000);
    const last1Hour = this.events.filter(e => now - e.timestamp < 60 * 60 * 1000);

    return {
      total: this.events.length,
      last5Minutes: last5Min.length,
      lastHour: last1Hour.length,
      bySource: this.events.reduce(
        (acc, event) => {
          acc[event.source] = (acc[event.source] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }
}

// Create singleton instance
export const reloadTracker = new ReloadTracker();

// Hook for React components
export const useReloadTracker = () => {
  const [events, setEvents] = React.useState<ReloadEvent[]>([]);

  React.useEffect(() => {
    setEvents(reloadTracker.getEvents());

    const unsubscribe = reloadTracker.onEvent(event => {
      setEvents(prev => [...prev, event].slice(-10)); // Keep last 10 events in state
    });

    return unsubscribe;
  }, []);

  return {
    events,
    stats: reloadTracker.getStats(),
    isReloadingTooOften: reloadTracker.isReloadingTooOften(),
    logEvent: (source: string, reason: string) => reloadTracker.logEvent(source, reason),
    clearEvents: () => {
      reloadTracker.clearEvents();
      setEvents([]);
    },
  };
};

// Development-only reload prevention utility
export const preventUnnecessaryReload = (componentName: string) => {
  if (!import.meta.env.DEV) return () => {};

  let lastRenderTime = Date.now();
  let renderCount = 0;

  return () => {
    const now = Date.now();
    renderCount++;

    if (now - lastRenderTime < 100 && renderCount > 3) {
      console.warn(
        `⚠️ ${componentName} is re-rendering too frequently (${renderCount} times in ${now - lastRenderTime}ms)`
      );
      reloadTracker.logEvent(
        'excessive-renders',
        `${componentName} rendered ${renderCount} times rapidly`
      );
    }

    if (now - lastRenderTime > 1000) {
      renderCount = 1;
    }

    lastRenderTime = now;
  };
};
