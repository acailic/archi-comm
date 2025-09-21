/**
 * Development-only performance monitoring component
 * Displays real-time performance metrics for React rendering optimization
 */

import React, { useState, useEffect } from 'react';
import { performanceMonitor, type SystemPerformanceMetrics } from '@/shared/utils/performanceMonitor';

interface PerformanceMonitorProps {
  isVisible: boolean;
  onToggle: () => void;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isVisible,
  onToggle
}) => {
  const [metrics, setMetrics] = useState<SystemPerformanceMetrics | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      setMetrics(performanceMonitor.getSystemMetrics());
    };

    // Initial load
    updateMetrics();

    // Subscribe to updates
    const unsubscribe = performanceMonitor.subscribe(setMetrics);

    // Reduce polling frequency to every 5 seconds to reduce load
    const interval = setInterval(updateMetrics, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isVisible]);

  if (!isVisible || !metrics) return null;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMemoryColor = (pressure: string) => {
    switch (pressure) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white shadow-lg border border-gray-200 rounded-lg max-w-sm">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-gray-700">Performance</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-gray-700 text-xs"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
          <button
            onClick={onToggle}
            className="p-1 text-gray-500 hover:text-gray-700 text-xs"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Compact View */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Score:</span>
            <span className={`ml-1 font-medium ${getScoreColor(metrics.overallScore)}`}>
              {metrics.overallScore}/100
            </span>
          </div>
          <div>
            <span className="text-gray-500">Memory:</span>
            <span className={`ml-1 font-medium ${getMemoryColor(metrics.memoryPressure)}`}>
              {metrics.memoryPressure}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Components:</span>
            <span className="ml-1 font-medium text-gray-700">
              {metrics.activeComponents}/{metrics.totalComponents}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Issues:</span>
            <span className="ml-1 font-medium text-gray-700">
              {metrics.slowComponents + metrics.unstableCallbacks}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-3 space-y-3">
          {/* Detailed Metrics */}
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">Component Performance</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Components:</span>
                <span className="font-medium">{metrics.totalComponents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Active Components:</span>
                <span className="font-medium">{metrics.activeComponents}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Slow Components:</span>
                <span className={`font-medium ${metrics.slowComponents > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.slowComponents}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Unstable Callbacks:</span>
                <span className={`font-medium ${metrics.unstableCallbacks > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {metrics.unstableCallbacks}
                </span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {metrics.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-2">Recommendations</h4>
              <div className="space-y-1">
                {metrics.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="text-xs text-gray-600 p-2 bg-yellow-50 rounded border-l-2 border-yellow-400">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const report = performanceMonitor.generatePerformanceReport();
                console.log(report);
                console.info('📊 Performance report logged to console');
              }}
              className="flex-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
            >
              Log Report
            </button>
            <button
              onClick={() => {
                performanceMonitor.reset();
                console.info('🔄 Performance metrics reset');
              }}
              className="flex-1 px-2 py-1 text-xs bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook to manage performance monitor visibility
export const usePerformanceMonitorVisibility = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle with Ctrl+Shift+P (or Cmd+Shift+P on Mac)
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };

    if (import.meta.env.DEV) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  return {
    isVisible,
    toggle: () => setIsVisible(prev => !prev),
    show: () => setIsVisible(true),
    hide: () => setIsVisible(false)
  };
};