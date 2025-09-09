import { useState, useEffect, useCallback, useRef } from 'react';
import { aiConfigService } from '../lib/services/AIConfigService';
import {
  AIConfig,
  ConnectionTestResult,
  getDefaultConfig,
  validateApiKeyFormat,
} from '../lib/types/AIConfig';

interface UseAIConfigState {
  config: AIConfig;
  loading: boolean;
  saving: boolean;
  error: string | null;
  connectionTest: ConnectionTestResult | null;
  testingConnection: boolean;
}

interface UseAIConfigActions {
  loadConfig: () => Promise<void>;
  saveConfig: (config: AIConfig) => Promise<boolean>;
  testConnection: (apiKey?: string) => Promise<ConnectionTestResult>;
  resetToDefaults: () => Promise<void>;
  clearError: () => void;
  clearTestResult: () => void;
  isAIConfigured: () => boolean;
}

export interface UseAIConfigReturn extends UseAIConfigState, UseAIConfigActions {}

const initialState: UseAIConfigState = {
  config: getDefaultConfig(),
  loading: false,
  saving: false,
  error: null,
  connectionTest: null,
  testingConnection: false,
};

export function useAIConfig(): UseAIConfigReturn {
  const [state, setState] = useState<UseAIConfigState>(initialState);
  const lastSavedConfigRef = useRef<string>('');

  const isAIConfigured = useCallback(() => {
    return (
      state.config.openai.enabled &&
      state.config.openai.apiKey.trim() !== '' &&
      validateApiKeyFormat(state.config.openai.apiKey)
    );
  }, [state.config]);

  // Load configuration
  const loadConfig = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const config = await aiConfigService.loadConfig();
      setState(prev => ({ ...prev, config, loading: false }));
      lastSavedConfigRef.current = JSON.stringify(config);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load configuration',
      }));
    }
  }, []);

  // Save configuration with validation
  const saveConfig = useCallback(async (config: AIConfig): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, saving: true, error: null }));
      await aiConfigService.saveConfig(config);
      setState(prev => ({ ...prev, config, saving: false }));
      return true;
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration',
      }));
      return false;
    }
  }, []);

  // Test connection
  const testConnection = useCallback(async (apiKey?: string): Promise<ConnectionTestResult> => {
    try {
      setState(prev => ({
        ...prev,
        testingConnection: true,
      }));

      const result = await aiConfigService.testConnection(apiKey);

      setState(prev => ({
        ...prev,
        testingConnection: false,
        connectionTest: result,
      }));

      return result;
    } catch (error) {
      const result: ConnectionTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };

      setState(prev => ({
        ...prev,
        testingConnection: false,
        connectionTest: result,
      }));

      return result;
    }
  }, []);

  // Reset to default configuration
  const resetToDefaults = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, saving: true, error: null }));
      await aiConfigService.resetToDefaults();
      const config = await aiConfigService.loadConfig();
      setState(prev => ({
        ...prev,
        config,
        saving: false,
        connectionTest: null,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to reset configuration',
      }));
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear test result
  const clearTestResult = useCallback(() => {
    setState(prev => ({
      ...prev,
      connectionTest: null,
    }));
  }, []);

  // Load configuration on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Auto-save debounced configuration changes with deep comparison
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const current = JSON.stringify(state.config);
      if (current !== lastSavedConfigRef.current && !state.saving) {
        saveConfig(state.config).then(() => {
          lastSavedConfigRef.current = current;
        });
      }
    }, 2500); // 2.5 second debounce

    return () => clearTimeout(timeoutId);
  }, [state.config, state.saving, saveConfig]);

  return {
    // State
    config: state.config,
    loading: state.loading,
    saving: state.saving,
    error: state.error,
    connectionTest: state.connectionTest,
    testingConnection: state.testingConnection,

    // Actions
    loadConfig,
    saveConfig,
    testConnection,
    resetToDefaults,
    clearError,
    clearTestResult,
    isAIConfigured,
  };
}
