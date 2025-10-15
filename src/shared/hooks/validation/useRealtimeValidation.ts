/**
 * src/shared/hooks/validation/useRealtimeValidation.ts
 * Real-time validation hook for immediate design feedback
 * Provides instant validation as users modify their designs
 * RELEVANT FILES: QuickValidationPanel.tsx, DesignCanvasCore.tsx, advanced-validation-engine.ts
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { DesignData } from '@/shared/contracts';
import { advancedValidationEngine } from '@/lib/validation/advanced-validation-engine';
import type { AdvancedValidationResult } from '@/lib/validation/advanced-validation-engine';

interface UseRealtimeValidationOptions {
  designData: DesignData;
  enabled?: boolean;
  debounceMs?: number;
  onValidationComplete?: (results: AdvancedValidationResult) => void;
}

interface RealtimeValidationState {
  results: AdvancedValidationResult | null;
  isValidating: boolean;
  lastValidated: number | null;
  error: string | null;
}

export function useRealtimeValidation({
  designData,
  enabled = true,
  debounceMs = 1000,
  onValidationComplete,
}: UseRealtimeValidationOptions) {
  const [state, setState] = useState<RealtimeValidationState>({
    results: null,
    isValidating: false,
    lastValidated: null,
    error: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const designHashRef = useRef<string>('');

  // Generate a simple hash of the design data for change detection
  const generateDesignHash = useCallback((design: DesignData): string => {
    const components = design.components?.map(c => `${c.id}:${c.type}:${c.label}`).sort().join('|') || '';
    const connections = design.connections?.map(c => `${c.from}:${c.to}:${c.type}`).sort().join('|') || '';
    return `${components}::${connections}`;
  }, []);

  // Run validation
  const runValidation = useCallback(async (design: DesignData) => {
    if (!enabled) return;

    setState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const engine = advancedValidationEngine.create(design);
      const results = await engine.validate();

      setState(prev => ({
        ...prev,
        results,
        isValidating: false,
        lastValidated: Date.now(),
        error: null,
      }));

      onValidationComplete?.(results);
    } catch (error) {
      console.error('Real-time validation failed:', error);
      setState(prev => ({
        ...prev,
        isValidating: false,
        error: error instanceof Error ? error.message : 'Validation failed',
      }));
    }
  }, [enabled, onValidationComplete]);

  // Debounced validation effect
  useEffect(() => {
    if (!enabled) return;

    const currentHash = generateDesignHash(designData);

    // Only run validation if design has actually changed
    if (currentHash === designHashRef.current) return;

    designHashRef.current = currentHash;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced validation
    timeoutRef.current = setTimeout(() => {
      runValidation(designData);
    }, debounceMs);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [designData, enabled, debounceMs, generateDesignHash, runValidation]);

  // Manual validation trigger
  const validateNow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    runValidation(designData);
  }, [designData, runValidation]);

  // Clear results
  const clearResults = useCallback(() => {
    setState({
      results: null,
      isValidating: false,
      lastValidated: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    validateNow,
    clearResults,
  };
}