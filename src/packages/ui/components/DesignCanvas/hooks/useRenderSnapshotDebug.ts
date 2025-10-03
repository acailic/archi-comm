import { useRef } from 'react';
import { renderDebugLogger } from '@/lib/debug/RenderDebugLogger';
import { RenderLoopDiagnostics } from '@/lib/debug/RenderLoopDiagnostics';

// Enhanced snapshot comparison and analysis
interface DetailedSnapshotComparison {
  property: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue: any;
  newValue: any;
  impact: 'high' | 'medium' | 'low';
  changeSize: number;
  isSignificant: boolean;
}

interface RenderTriggerAnalysis {
  triggerType: 'prop-change' | 'state-change' | 'context-change' | 'parent-render' | 'forced-update';
  triggerSource: string;
  confidence: number;
  evidence: string[];
  relatedChanges: DetailedSnapshotComparison[];
}

interface RenderPatternAnalysis {
  isOscillating: boolean;
  oscillationPeriod?: number;
  isRapidFire: boolean;
  rapidFireCount: number;
  pattern: 'stable' | 'growing' | 'declining' | 'chaotic';
  predictedNextRender?: number;
}

interface RenderGuardMetrics {
  renderCount: number;
  sincePreviousRenderMs: number;
  sinceFirstRenderMs: number;
  circuitBreakerActive: boolean;
  shouldPause: boolean;
  memorySample?: {
    usedJSHeapSize?: number;
    deltaSinceBaseline?: number;
  } | null;
}

const analyzeSnapshotComparison = (
  currentSnapshot: any,
  previousSnapshot: any
): DetailedSnapshotComparison[] => {
  const changes: DetailedSnapshotComparison[] = [];
  const allKeys = new Set([
    ...Object.keys(currentSnapshot || {}),
    ...Object.keys(previousSnapshot || {}),
  ]);

  allKeys.forEach(key => {
    const currentValue = currentSnapshot?.[key];
    const previousValue = previousSnapshot?.[key];

    let changeType: DetailedSnapshotComparison['changeType'] = 'unchanged';
    let impact: DetailedSnapshotComparison['impact'] = 'low';
    let changeSize = 0;
    let isSignificant = false;

    if (previousValue === undefined && currentValue !== undefined) {
      changeType = 'added';
      impact = 'medium';
      changeSize = 1;
      isSignificant = true;
    } else if (previousValue !== undefined && currentValue === undefined) {
      changeType = 'removed';
      impact = 'medium';
      changeSize = 1;
      isSignificant = true;
    } else if (previousValue !== currentValue) {
      changeType = 'modified';
      changeSize = calculateChangeSize(previousValue, currentValue);
      impact = calculateImpact(key, previousValue, currentValue, changeSize);
      isSignificant = impact !== 'low';
    }

    changes.push({
      property: key,
      changeType,
      oldValue: previousValue,
      newValue: currentValue,
      impact,
      changeSize,
      isSignificant,
    });
  });

  return changes;
};

const calculateChangeSize = (oldValue: any, newValue: any): number => {
  if (typeof oldValue === 'number' && typeof newValue === 'number') {
    return Math.abs(newValue - oldValue);
  }
  if (typeof oldValue === 'string' && typeof newValue === 'string') {
    return Math.abs(newValue.length - oldValue.length);
  }
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    return Math.abs(newValue.length - oldValue.length);
  }
  if (typeof oldValue === 'object' && typeof newValue === 'object' && oldValue && newValue) {
    const oldKeys = Object.keys(oldValue).length;
    const newKeys = Object.keys(newValue).length;
    return Math.abs(newKeys - oldKeys);
  }
  return oldValue === newValue ? 0 : 1;
};

const calculateImpact = (key: string, oldValue: any, newValue: any, changeSize: number): 'high' | 'medium' | 'low' => {
  // High impact changes
  if (key.includes('Length') && changeSize > 10) return 'high';
  if (key === 'selectedComponent' && oldValue !== newValue) return 'high';
  if (key === 'isSynced' && oldValue !== newValue) return 'high';

  // Medium impact changes
  if (key.includes('Length') && changeSize > 0) return 'medium';
  if (key === 'challengeId' && oldValue !== newValue) return 'medium';

  // Low impact changes
  return 'low';
};

const analyzeRenderTrigger = (
  changes: DetailedSnapshotComparison[],
  renderGuard: RenderGuardMetrics
): RenderTriggerAnalysis => {
  const significantChanges = changes.filter(change => change.isSignificant);
  const evidence: string[] = [];
  let triggerType: RenderTriggerAnalysis['triggerType'] = 'forced-update';
  let triggerSource = 'unknown';
  let confidence = 0.3;

  // Analyze state changes
  const stateChanges = significantChanges.filter(change =>
    change.property.includes('Length') || change.property === 'selectedComponent'
  );

  if (stateChanges.length > 0) {
    triggerType = 'state-change';
    triggerSource = stateChanges[0].property;
    confidence = 0.8;
    evidence.push(`State change detected in ${stateChanges.map(c => c.property).join(', ')}`);
  }

  // Analyze sync state changes
  const syncChange = significantChanges.find(change => change.property === 'isSynced');
  if (syncChange) {
    triggerType = 'state-change';
    triggerSource = 'initialSync';
    confidence = 0.9;
    evidence.push(`Initial sync state changed: ${syncChange.oldValue} → ${syncChange.newValue}`);
  }

  // Analyze render frequency for forced updates
  if (renderGuard.sincePreviousRenderMs < 16) {
    evidence.push(`Rapid render detected (${renderGuard.sincePreviousRenderMs}ms since previous)`);
    confidence = Math.max(confidence, 0.6);
  }

  // Analyze render count patterns
  if (renderGuard.renderCount > 50) {
    evidence.push(`High render count detected (${renderGuard.renderCount})`);
  }

  return {
    triggerType,
    triggerSource,
    confidence,
    evidence,
    relatedChanges: significantChanges,
  };
};

const analyzeRenderPattern = (
  renderHistory: Array<{ timestamp: number; changes: DetailedSnapshotComparison[] }>,
  renderGuard: RenderGuardMetrics
): RenderPatternAnalysis => {
  const recentRenders = renderHistory.slice(-10);
  let isOscillating = false;
  let oscillationPeriod: number | undefined;
  let isRapidFire = false;
  let rapidFireCount = 0;
  let pattern: RenderPatternAnalysis['pattern'] = 'stable';

  // Analyze render timing
  if (recentRenders.length >= 3) {
    const intervals = recentRenders.slice(1).map((render, index) =>
      render.timestamp - recentRenders[index].timestamp
    );

    rapidFireCount = intervals.filter(interval => interval < 50).length;
    isRapidFire = rapidFireCount >= 3;

    // Check for oscillation patterns
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const intervalVariance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;

    if (intervalVariance < avgInterval * 0.2 && avgInterval < 100) {
      isOscillating = true;
      oscillationPeriod = avgInterval;
    }
  }

  // Analyze change patterns
  if (recentRenders.length >= 5) {
    const changeCounts = recentRenders.map(render => render.changes.filter(c => c.isSignificant).length);
    const isGrowing = changeCounts.every((count, index) => index === 0 || count >= changeCounts[index - 1]);
    const isDeclining = changeCounts.every((count, index) => index === 0 || count <= changeCounts[index - 1]);
    const maxChangeCount = Math.max(...changeCounts);
    const minChangeCount = Math.min(...changeCounts);

    if (isGrowing && maxChangeCount > minChangeCount * 2) {
      pattern = 'growing';
    } else if (isDeclining && maxChangeCount > minChangeCount * 2) {
      pattern = 'declining';
    } else if (maxChangeCount - minChangeCount > 5) {
      pattern = 'chaotic';
    } else {
      pattern = 'stable';
    }
  }

  const predictedNextRender = oscillationPeriod
    ? Date.now() + oscillationPeriod
    : renderGuard.sincePreviousRenderMs > 0
      ? Date.now() + renderGuard.sincePreviousRenderMs
      : undefined;

  return {
    isOscillating,
    oscillationPeriod,
    isRapidFire,
    rapidFireCount,
    pattern,
    predictedNextRender,
  };
};

interface RenderSnapshotParams {
  components: any[];
  connections: any[];
  infoCards: any[];
  selectedComponent: string | null;
  challengeId: string;
  isSynced: boolean;
  renderGuard: RenderGuardMetrics;
  lastRenderSnapshotRef: React.MutableRefObject<{
    componentsLength: number;
    connectionsLength: number;
    infoCardsLength: number;
    selectedComponent: string | null;
    challengeId: string;
    isSynced: boolean;
  } | null>;
}

export function useRenderSnapshotDebug({
  components,
  connections,
  infoCards,
  selectedComponent,
  challengeId,
  isSynced,
  renderGuard,
  lastRenderSnapshotRef,
}: RenderSnapshotParams) {
  const renderHistoryRef = useRef<Array<{ timestamp: number; changes: DetailedSnapshotComparison[]; renderCount: number }>>([]);
  const triggerAnalysisHistoryRef = useRef<RenderTriggerAnalysis[]>([]);
  const renderOptimizationSuggestionsRef = useRef<Set<string>>(new Set());

  if (import.meta.env.DEV) {
    const snapshot = {
      componentsLength: components.length,
      connectionsLength: connections.length,
      infoCardsLength: infoCards.length,
      selectedComponent,
      challengeId,
      isSynced,
    };
    const previousSnapshot = lastRenderSnapshotRef.current;

    if (previousSnapshot) {
      // Enhanced detailed snapshot comparison
      const detailedChanges = analyzeSnapshotComparison(snapshot, previousSnapshot);
      const significantChanges = detailedChanges.filter(change => change.isSignificant);

      // Analyze render trigger
      const triggerAnalysis = analyzeRenderTrigger(detailedChanges, renderGuard);
      triggerAnalysisHistoryRef.current.push(triggerAnalysis);
      if (triggerAnalysisHistoryRef.current.length > 20) {
        triggerAnalysisHistoryRef.current.shift();
      }

      // Add to render history
      renderHistoryRef.current.push({
        timestamp: Date.now(),
        changes: detailedChanges,
        renderCount: renderGuard.renderCount,
      });
      if (renderHistoryRef.current.length > 50) {
        renderHistoryRef.current.shift();
      }

      // Analyze render patterns
      const patternAnalysis = analyzeRenderPattern(renderHistoryRef.current, renderGuard);

      if (significantChanges.length > 0) {
        // Enhanced logging with detailed analysis
        console.debug(
          `[DesignCanvasCore] render #${renderGuard.renderCount} (detailed analysis)`,
          {
            renderTiming: {
              sincePreviousRenderMs: renderGuard.sincePreviousRenderMs,
              sinceFirstRenderMs: renderGuard.sinceFirstRenderMs,
              renderFrequency: (renderGuard.renderCount / (renderGuard.sinceFirstRenderMs / 1000)).toFixed(2) + '/sec',
            },
            significantChanges: significantChanges.map(change => ({
              property: change.property,
              changeType: change.changeType,
              impact: change.impact,
              changeSize: change.changeSize,
              oldValue: change.oldValue,
              newValue: change.newValue,
            })),
            triggerAnalysis: {
              type: triggerAnalysis.triggerType,
              source: triggerAnalysis.triggerSource,
              confidence: `${(triggerAnalysis.confidence * 100).toFixed(1)}%`,
              evidence: triggerAnalysis.evidence,
            },
            patternAnalysis: {
              pattern: patternAnalysis.pattern,
              isOscillating: patternAnalysis.isOscillating,
              oscillationPeriod: patternAnalysis.oscillationPeriod ? `${patternAnalysis.oscillationPeriod}ms` : undefined,
              isRapidFire: patternAnalysis.isRapidFire,
              rapidFireCount: patternAnalysis.rapidFireCount,
            },
            performanceInsights: {
              slowRender: renderGuard.sincePreviousRenderMs > 16,
              circuitBreakerActive: renderGuard.circuitBreakerActive,
              shouldPause: renderGuard.shouldPause,
              memoryUsage: renderGuard.memorySample?.usedJSHeapSize
                ? `${(renderGuard.memorySample.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`
                : undefined,
            },
          }
        );

        // Generate optimization suggestions
        const suggestions = generateOptimizationSuggestions(
          significantChanges,
          triggerAnalysis,
          patternAnalysis,
          renderGuard
        );

        suggestions.forEach(suggestion => {
          if (!renderOptimizationSuggestionsRef.current.has(suggestion)) {
            renderOptimizationSuggestionsRef.current.add(suggestion);
            console.warn('[DesignCanvasCore] Optimization suggestion:', suggestion);
          }
        });

        // Clear suggestions periodically
        if (renderGuard.renderCount % 50 === 0) {
          renderOptimizationSuggestionsRef.current.clear();
        }
      }

      // Log to render debug system
      renderDebugLogger.logRender({
        componentName: 'DesignCanvasCore',
        renderCount: renderGuard.renderCount,
        renderDuration: renderGuard.sincePreviousRenderMs,
        triggerReason: triggerAnalysis.triggerSource,
        propChanges: detailedChanges.map(change => ({
          propName: change.property,
          oldValue: change.oldValue,
          newValue: change.newValue,
          changeType: change.changeType === 'modified' ?
            (Array.isArray(change.newValue) ? 'array' :
             typeof change.newValue === 'object' ? 'object' :
             typeof change.newValue === 'function' ? 'function' : 'primitive') : 'primitive',
          isDeepChange: change.changeType !== 'unchanged',
          changeSize: change.changeSize,
        })),
        performanceMetrics: {
          renderDuration: renderGuard.sincePreviousRenderMs,
          componentUpdateTime: renderGuard.sincePreviousRenderMs,
          diffTime: 0,
          reconciliationTime: 0,
          memoryUsage: renderGuard.memorySample?.usedJSHeapSize,
          memoryDelta: renderGuard.memorySample?.deltaSinceBaseline,
        },
        renderPhase: renderGuard.renderCount === 1 ? 'mount' : 'update',
      });

      // Record diagnostics
      RenderLoopDiagnostics.getInstance().recordRenderSnapshotAnalysis('DesignCanvasCore', {
        renderCount: renderGuard.renderCount,
        significantChanges: significantChanges.length,
        triggerAnalysis,
        patternAnalysis,
        optimizationSuggestions: Array.from(renderOptimizationSuggestionsRef.current),
      });

      // Advanced pattern detection and warnings
      if (patternAnalysis.isOscillating && patternAnalysis.oscillationPeriod && patternAnalysis.oscillationPeriod < 100) {
        console.warn('[DesignCanvasCore] Oscillating render pattern detected:', {
          period: `${patternAnalysis.oscillationPeriod}ms`,
          renderCount: renderGuard.renderCount,
          suggestion: 'Consider implementing debouncing or state batching',
        });
      }

      if (patternAnalysis.isRapidFire && patternAnalysis.rapidFireCount > 5) {
        console.warn('[DesignCanvasCore] Rapid-fire rendering detected:', {
          rapidFireCount: patternAnalysis.rapidFireCount,
          renderCount: renderGuard.renderCount,
          suggestion: 'Consider using React.useDeferredValue or React.startTransition',
        });
      }

      if (triggerAnalysis.confidence < 0.5) {
        console.warn('[DesignCanvasCore] Unclear render trigger detected:', {
          confidence: `${(triggerAnalysis.confidence * 100).toFixed(1)}%`,
          evidence: triggerAnalysis.evidence,
          suggestion: 'Consider adding more specific tracking or using React DevTools Profiler',
        });
      }
    }

    lastRenderSnapshotRef.current = snapshot;
  }
}

const generateOptimizationSuggestions = (
  changes: DetailedSnapshotComparison[],
  triggerAnalysis: RenderTriggerAnalysis,
  patternAnalysis: RenderPatternAnalysis,
  renderGuard: RenderGuardMetrics
): string[] => {
  const suggestions: string[] = [];

  // Suggest memoization for frequent length changes
  const lengthChanges = changes.filter(change => change.property.includes('Length') && change.isSignificant);
  if (lengthChanges.length > 0 && renderGuard.renderCount > 20) {
    suggestions.push(`Consider memoizing components that depend on ${lengthChanges.map(c => c.property).join(', ')} to prevent unnecessary re-renders`);
  }

  // Suggest state optimization for rapid fire patterns
  if (patternAnalysis.isRapidFire) {
    suggestions.push('Consider batching state updates or using React.useDeferredValue for non-urgent updates');
  }

  // Suggest prop stability for oscillating patterns
  if (patternAnalysis.isOscillating) {
    suggestions.push('Consider stabilizing props and callbacks with useCallback/useMemo to prevent oscillating renders');
  }

  if (triggerAnalysis.triggerType === 'prop-change') {
    suggestions.push(
      `Consider memoizing props related to ${triggerAnalysis.relatedChanges.map(change => change.property).join(', ') || 'frequent prop updates'} to reduce prop-driven renders`
    );
  }

  if (triggerAnalysis.triggerType === 'forced-update' && triggerAnalysis.confidence < 0.6) {
    suggestions.push('Investigate forced updates; review refs or external subscriptions that may trigger renders');
  }

  // Suggest selective subscriptions for high-impact state changes
  const highImpactChanges = changes.filter(change => change.impact === 'high');
  if (highImpactChanges.length > 2) {
    suggestions.push('Consider splitting this component or using more selective state subscriptions');
  }

  // Suggest performance optimization for slow renders
  if (renderGuard.sincePreviousRenderMs > 16) {
    suggestions.push('Consider lazy loading, virtualization, or component splitting to improve render performance');
  }

  // Suggest circuit breaker configuration
  if (renderGuard.renderCount > 100 && !renderGuard.circuitBreakerActive) {
    suggestions.push('Consider implementing render throttling or circuit breaker patterns for this component');
  }

  return suggestions;
};
