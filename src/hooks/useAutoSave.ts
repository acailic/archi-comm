import { useCallback, useRef, useState, useEffect } from 'react';

interface UseAutoSaveOptions {
  delay?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn<T> {
  isSaving: boolean;
  forceSave: () => void;
  cancelAutoSave: () => void;
}

/**
 * Reusable auto-save hook that follows the established patterns from App.tsx
 * Provides debounced saving with deep comparison to avoid unnecessary saves
 */
export function useAutoSave<T>(
  data: T | null | undefined,
  onSave: (data: T) => Promise<void> | void,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn<T> {
  const { delay = 3000, enabled = true } = options;
  
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const onSaveRef = useRef(onSave);

  // Update the callback ref when onSave changes
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const performSave = useCallback(async (dataToSave: T) => {
    if (!dataToSave) return;
    
    setIsSaving(true);
    try {
      await onSaveRef.current(dataToSave);
      if (process.env.NODE_ENV === 'development') {
        console.log('Auto-save completed successfully');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Could emit an error event here if needed
    } finally {
      setIsSaving(false);
    }
  }, []);

  const forceSave = useCallback(() => {
    if (!data || !enabled) return;
    
    // Clear any pending auto-save
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    
    // Perform immediate save
    performSave(data);
    lastSaveDataRef.current = JSON.stringify(data);
  }, [data, enabled, performSave]);

  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, []);

  // Auto-save effect - triggers when data changes
  useEffect(() => {
    if (!data || !enabled) {
      return;
    }

    // Deep comparison using JSON.stringify (same as App.tsx pattern)
    const currentDataString = JSON.stringify(data);
    
    // Only save if data actually changed
    if (currentDataString !== lastSaveDataRef.current) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for debounced save
      autoSaveTimeoutRef.current = setTimeout(() => {
        performSave(data);
        lastSaveDataRef.current = currentDataString;
      }, delay);
    }
  }, [data, enabled, delay, performSave]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    forceSave,
    cancelAutoSave
  };
}