/**
 * src/packages/ui/components/canvas/PerformanceIndicator.tsx
 * Real-time performance indicator for canvas rendering
 * Displays FPS, render time, and memory usage
 * RELEVANT FILES: CanvasPerformanceManager.ts, useCanvasPerformance.ts
 */

import React from 'react';

export interface PerformanceIndicatorProps {
  fps?: number;
  renderTime?: number;
  memoryUsage?: number;
  nodeCount?: number;
  edgeCount?: number;
  showDetailed?: boolean;
}

export const PerformanceIndicator: React.FC<PerformanceIndicatorProps> = ({
  fps = 60,
  renderTime = 0,
  memoryUsage = 0,
  nodeCount = 0,
  edgeCount = 0,
  showDetailed = false,
}) => {
  const getFPSColor = (fps: number) => {
    if (fps >= 55) return '#10b981'; // green
    if (fps >= 30) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  const getRenderTimeColor = (ms: number) => {
    if (ms <= 16) return '#10b981'; // green (60fps)
    if (ms <= 33) return '#f59e0b'; // orange (30fps)
    return '#ef4444'; // red
  };

  return (
    <div
      className="performance-indicator"
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        padding: '8px 12px',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        borderRadius: '6px',
        fontSize: '11px',
        fontFamily: 'monospace',
        zIndex: 1000,
        minWidth: showDetailed ? '160px' : '80px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: showDetailed ? '4px' : 0 }}>
        <span style={{ color: getFPSColor(fps), fontWeight: 'bold' }}>
          {Math.round(fps)} FPS
        </span>
        {showDetailed && (
          <span style={{ color: getRenderTimeColor(renderTime) }}>
            {renderTime.toFixed(1)}ms
          </span>
        )}
      </div>

      {showDetailed && (
        <>
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
            Nodes: {nodeCount} | Edges: {edgeCount}
          </div>
          {memoryUsage > 0 && (
            <div style={{ fontSize: '10px', opacity: 0.8 }}>
              Memory: {memoryUsage.toFixed(1)}MB
            </div>
          )}
        </>
      )}
    </div>
  );
};
