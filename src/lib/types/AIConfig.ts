import { z } from 'zod';

export enum AIProvider {
  OPENAI = 'openai',
  GEMINI = 'gemini',
  CLAUDE = 'claude'
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  maxTokens: number;
}

export interface AISettings {
  temperature?: number;
  maxTokens?: number;
}

export interface AIProviderConfig {
  apiKey: string;
  enabled: boolean;
}

export interface AIConfig {
  openai: AIProviderConfig;
  gemini: AIProviderConfig;
  claude: AIProviderConfig;
  preferredProvider: AIProvider;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  responseTime?: number;
  model?: string;
}

// Default model
export const DEFAULT_MODEL = 'gpt-3.5-turbo';

// Available models for community use
export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective for most tasks',
    maxTokens: 4096,
  },
];

// Default settings
export const DEFAULT_SETTINGS: AISettings = {
  temperature: 0.7,
  maxTokens: 1000,
};

// Zod schemas for validation
export const AISettingsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
});

export const AIProviderConfigSchema = z
  .object({
    apiKey: z.string(),
    enabled: z.boolean(),
  })
  .refine(
    data => {
      // If provider is enabled, API key is required
      if (data.enabled && data.apiKey.trim() === '') {
        return false;
      }
      return true;
    },
    {
      message: 'API key is required when AI is enabled',
      path: ['apiKey'],
    }
  );

export const AIConfigSchema = z.object({
  openai: AIProviderConfigSchema,
  gemini: AIProviderConfigSchema,
  claude: AIProviderConfigSchema,
  preferredProvider: z.nativeEnum(AIProvider).optional().default(AIProvider.OPENAI),
});

export const ConnectionTestResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  responseTime: z.number().optional(),
  model: z.string().optional(),
});

// API key validation patterns
export const API_KEY_PATTERNS = {
  [AIProvider.OPENAI]: /^sk-(?:proj-)?[a-zA-Z0-9-]+$/,
  [AIProvider.GEMINI]: /^AIzaSy[a-zA-Z0-9-]{32,}$/,
  [AIProvider.CLAUDE]: /^sk-ant-api03-[a-zA-Z0-9-]{32,}$/
};

// Utility function to get default config
export function getDefaultConfig(): AIConfig {
  return {
    openai: {
      apiKey: '',
      enabled: false,
    },
    gemini: {
      apiKey: '',
      enabled: false,
    },
    claude: {
      apiKey: '',
      enabled: false,
    },
    preferredProvider: AIProvider.OPENAI,
  };
}

// Utility function to validate API key format
export function validateApiKeyFormat(provider: AIProvider, apiKey: string): boolean {
  const pattern = API_KEY_PATTERNS[provider];
  return pattern ? pattern.test(apiKey.trim()) : false;
}
