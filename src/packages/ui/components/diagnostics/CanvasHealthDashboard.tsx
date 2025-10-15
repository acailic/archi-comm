/**
 * src/packages/ui/components/diagnostics/CanvasHealthDashboard.tsx
 * Comprehensive dashboard for canvas health and performance diagnostics
 * Shows real-time metrics, pattern detection, and optimization suggestions
 * RELEVANT FILES: CanvasPerformanceManager.ts, pattern-detection.ts, canvas-ai-assistant.ts, PerformanceIndicator.tsx
 */

import React, { useState, useEffect } from 'react';
import type { DesignComponent, Connection } from '@/shared/contracts';
import { detectPatterns } from '@/lib/canvas/pattern-detection';
import { getCanvasAISuggestions } from '@/lib/ai-tools/canvas-ai-assistant';

export interface CanvasHealthDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  components: DesignComponent[];
  connections: Connection[];
  performanceMetrics?: {
    fps: number;
    renderTime: number;
    memoryUsage: number;
  };
}

export const CanvasHealthDashboard: React.FC<CanvasHealthDashboardProps> = ({
  isOpen,
  onClose,
  components,
  connections,
  performanceMetrics,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'patterns' | 'suggestions'>('overview');

  const detectedPatterns = detectPatterns(components, connections);
  const suggestions = getCanvasAISuggestions(components, connections);

  if (!isOpen) {
    return null;
  }

  // Calculate health score (0-100)
  const calculateHealthScore = (): number => {
    let score = 100;

    // Performance penalties
    if (performanceMetrics) {
      if (performanceMetrics.fps < 30) score -= 20;
      else if (performanceMetrics.fps < 55) score -= 10;

      if (performanceMetrics.renderTime > 33) score -= 15;
      else if (performanceMetrics.renderTime > 16) score -= 5;
    }

    // Pattern detection bonuses
    if (detectedPatterns.length > 0) {
      score += Math.min(10, detectedPatterns.length * 3);
    }

    // Complexity penalties
    if (components.length > 100) score -= 10;
    if (connections.length > 200) score -= 10;

    return Math.max(0, Math.min(100, score));
  };

  const healthScore = calculateHealthScore();

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '900px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
              Canvas Health Dashboard
            </h2>
            <button
              onClick={onClose}
              style={{
                padding: '4px 12px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '24px',
              }}
            >
              ×
            </button>
          </div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
            Real-time diagnostics and optimization recommendations
          </p>
        </div>

        {/* Health Score */}
        <div
          style={{
            padding: '20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            Overall Health Score
          </div>
          <div
            style={{
              fontSize: '48px',
              fontWeight: 700,
              color: getScoreColor(healthScore),
            }}
          >
            {healthScore}
          </div>
          <div style={{ fontSize: '12px', color: '#9ca3af' }}>out of 100</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
          {(['overview', 'performance', 'patterns', 'suggestions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: '300px' }}>
          {activeTab === 'overview' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Components</div>
                  <div style={{ fontSize: '24px', fontWeight: 600 }}>{components.length}</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Connections</div>
                  <div style={{ fontSize: '24px', fontWeight: 600 }}>{connections.length}</div>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Patterns</div>
                  <div style={{ fontSize: '24px', fontWeight: 600 }}>{detectedPatterns.length}</div>
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#374151' }}>
                {suggestions.length > 0 && (
                  <p>You have {suggestions.length} optimization {suggestions.length === 1 ? 'suggestion' : 'suggestions'}.</p>
                )}
                {detectedPatterns.length > 0 && (
                  <p>Detected {detectedPatterns.length} architecture {detectedPatterns.length === 1 ? 'pattern' : 'patterns'}.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Performance Metrics</h3>
              {performanceMetrics ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 500 }}>FPS</span>
                    <span style={{ color: performanceMetrics.fps >= 55 ? '#10b981' : performanceMetrics.fps >= 30 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                      {Math.round(performanceMetrics.fps)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 500 }}>Render Time</span>
                    <span style={{ color: performanceMetrics.renderTime <= 16 ? '#10b981' : performanceMetrics.renderTime <= 33 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                      {performanceMetrics.renderTime.toFixed(1)}ms
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                    <span style={{ fontWeight: 500 }}>Memory Usage</span>
                    <span style={{ fontWeight: 600 }}>
                      {performanceMetrics.memoryUsage.toFixed(1)}MB
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                  No performance metrics available
                </div>
              )}
            </div>
          )}

          {activeTab === 'patterns' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Detected Patterns</h3>
              {detectedPatterns.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {detectedPatterns.map((pattern) => (
                    <div key={pattern.id} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 600 }}>{pattern.name}</span>
                        <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#10b98120', color: '#10b981', borderRadius: '4px', fontWeight: 600 }}>
                          {Math.round(pattern.confidence * 100)}% match
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280' }}>
                        {pattern.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                  No architecture patterns detected yet
                </div>
              )}
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Optimization Suggestions</h3>
              {suggestions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {suggestions.map((suggestion, index) => (
                    <div key={index} style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: suggestion.priority === 'high' ? '#fecaca' : suggestion.priority === 'medium' ? '#fed7aa' : '#e5e7eb',
                            color: suggestion.priority === 'high' ? '#dc2626' : suggestion.priority === 'medium' ? '#ea580c' : '#6b7280',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          {suggestion.priority}
                        </span>
                        <span style={{ fontWeight: 600 }}>{suggestion.title}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                        {suggestion.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>
                  No suggestions available - your canvas looks good!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
