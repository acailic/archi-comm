import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { aiConfigService } from '../lib/services/AIConfigService';
import { 
  AIConfig, 
  AIProvider, 
  ConnectionTestResult, 
  getDefaultConfig,
  validateApiKeyFormat
} from '../lib/types/AIConfig';

interface UseAIConfigState {
  config: AIConfig;
  loading: boolean;
  saving: boolean;
  error: string | null;
  connectionTests: Record<AIProvider, ConnectionTestResult | null>;
  testingConnections: Record<AIProvider, boolean>;
}

interface UseAIConfigActions {
  loadConfig: () => Promise<void>;
  saveConfig: (config: AIConfig) => Promise<boolean>;
  testConnection: (provider: AIProvider, apiKey?: string) => Promise<ConnectionTestResult>;
  resetToDefaults: () => Promise<void>;
  validateProvider: (provider: AIProvider, config: Partial<AIConfig[AIProvider]>) => string[];
  updateProvider: (provider: AIProvider, updates: Partial<AIConfig[AIProvider]>) => void;
  clearError: () => void;
  clearTestResult: (provider: AIProvider) => void;
  getEnabledProviders: () => AIProvider[];
  isProviderConfigured: (provider: AIProvider) => boolean;
}

export interface UseAIConfigReturn extends UseAIConfigState, UseAIConfigActions {}

const initialState: UseAIConfigState = {
  config: getDefaultConfig(),
  loading: false,
  saving: false,
  error: null,
  connectionTests: {
    [AIProvider.OPENAI]: null,
    [AIProvider.GEMINI]: null,
    [AIProvider.CLAUDE]: null
  },
  testingConnections: {
    [AIProvider.OPENAI]: false,
    [AIProvider.GEMINI]: false,
    [AIProvider.CLAUDE]: false
  }
};

export function useAIConfig(): UseAIConfigReturn {
  const [state, setState] = useState<UseAIConfigState>(initialState);
  const lastSavedConfigRef = useRef<string>('');

  // Memoized selectors
  const enabledProviders = useMemo(() => {
    return Object.entries(state.config)
      .filter(([key, value]) => {
        if (key === 'defaultProvider') return false;
        const providerConfig = value as AIConfig[AIProvider];
        return providerConfig.enabled && providerConfig.apiKey.trim() !== '';
      })
      .map(([key]) => key as AIProvider);
  }, [state.config]);

  const isProviderConfigured = useCallback((provider: AIProvider) => {
    const providerConfig = state.config[provider];
    return providerConfig.enabled && 
           providerConfig.apiKey.trim() !== '' && 
           validateApiKeyFormat(provider, providerConfig.apiKey);
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
        error: error instanceof Error ? error.message : 'Failed to load configuration' 
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
        error: error instanceof Error ? error.message : 'Failed to save configuration' 
      }));
      return false;
    }
  }, []);

  // Test connection for a provider
  const testConnection = useCallback(async (
    provider: AIProvider, 
    apiKey?: string
  ): Promise<ConnectionTestResult> => {
    try {
      setState(prev => ({ 
        ...prev, 
        testingConnections: { ...prev.testingConnections, [provider]: true }
      }));

      const result = await aiConfigService.testConnection(provider, apiKey);
      
      setState(prev => ({ 
        ...prev,
        testingConnections: { ...prev.testingConnections, [provider]: false },
        connectionTests: { ...prev.connectionTests, [provider]: result }
      }));

      return result;
    } catch (error) {
      const result: ConnectionTestResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };

      setState(prev => ({ 
        ...prev,
        testingConnections: { ...prev.testingConnections, [provider]: false },
        connectionTests: { ...prev.connectionTests, [provider]: result }
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
        connectionTests: initialState.connectionTests
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        saving: false, 
        error: error instanceof Error ? error.message : 'Failed to reset configuration' 
      }));
    }
  }, []);

  // Validate provider configuration
  const validateProvider = useCallback((
    provider: AIProvider, 
    config: Partial<AIConfig[AIProvider]>
  ): string[] => {
    const errors: string[] = [];

    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('API key is required');
    } else if (!validateApiKeyFormat(provider, config.apiKey)) {
      errors.push('Invalid API key format');
    }

    if (!config.selectedModel || config.selectedModel.trim() === '') {
      errors.push('Model selection is required');
    }

    if (config.settings) {
      const { temperature, maxTokens, topP, topK, frequencyPenalty, presencePenalty } = config.settings;

      if (temperature !== undefined && (temperature < 0 || temperature > 2)) {
        errors.push('Temperature must be between 0 and 2');
      }

      if (maxTokens !== undefined && (maxTokens < 1 || maxTokens > 200000)) {
        errors.push('Max tokens must be between 1 and 200,000');
      }

      if (topP !== undefined && (topP < 0 || topP > 1)) {
        errors.push('Top P must be between 0 and 1');
      }

      if (topK !== undefined && (topK < 1 || topK > 100)) {
        errors.push('Top K must be between 1 and 100');
      }

      if (frequencyPenalty !== undefined && (frequencyPenalty < -2 || frequencyPenalty > 2)) {
        errors.push('Frequency penalty must be between -2 and 2');
      }

      if (presencePenalty !== undefined && (presencePenalty < -2 || presencePenalty > 2)) {
        errors.push('Presence penalty must be between -2 and 2');
      }
    }

    return errors;
  }, []);

  // Update a specific provider configuration
  const updateProvider = useCallback((
    provider: AIProvider, 
    updates: Partial<AIConfig[AIProvider]>
  ) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [provider]: {
          ...prev.config[provider],
          ...updates,
          settings: updates.settings ? {
            ...prev.config[provider].settings,
            ...updates.settings
          } : prev.config[provider].settings
        }
      }
    }));
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Clear test result for a provider
  const clearTestResult = useCallback((provider: AIProvider) => {
    setState(prev => ({
      ...prev,
      connectionTests: { ...prev.connectionTests, [provider]: null }
    }));
  }, []);

  // Get enabled providers list
  const getEnabledProviders = useCallback(() => enabledProviders, [enabledProviders]);

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
    connectionTests: state.connectionTests,
    testingConnections: state.testingConnections,

    // Actions
    loadConfig,
    saveConfig,
    testConnection,
    resetToDefaults,
    validateProvider,
    updateProvider,
    clearError,
    clearTestResult,
    getEnabledProviders,
    isProviderConfigured
  };
}