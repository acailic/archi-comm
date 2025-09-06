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
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AIProviderConfig {
  apiKey: string;
  selectedModel: string;
  settings: AISettings;
  enabled: boolean;
}

export interface AIConfig {
  openai: AIProviderConfig;
  gemini: AIProviderConfig;
  claude: AIProviderConfig;
  defaultProvider: AIProvider;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  responseTime?: number;
  model?: string;
}

// Default models based on research
export const DEFAULT_MODELS = {
  [AIProvider.OPENAI]: 'gpt-4o',
  [AIProvider.GEMINI]: 'gemini-1.5-pro',
  [AIProvider.CLAUDE]: 'claude-3-sonnet-20240229'
} as const;

// Available models for each provider
export const AVAILABLE_MODELS: Record<AIProvider, AIModel[]> = {
  [AIProvider.OPENAI]: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      description: 'Most capable model, excellent for complex tasks',
      maxTokens: 128000
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      description: 'High-quality, reliable for most tasks',
      maxTokens: 8192
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      description: 'Faster and more cost-effective than GPT-4',
      maxTokens: 128000
    },
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      description: 'Fast and cost-effective for simple tasks',
      maxTokens: 4096
    }
  ],
  [AIProvider.GEMINI]: [
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      description: 'Most capable Gemini model for complex reasoning',
      maxTokens: 2097152
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      description: 'Faster and more efficient for most tasks',
      maxTokens: 1048576
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      description: 'Balanced performance for general use',
      maxTokens: 32768
    }
  ],
  [AIProvider.CLAUDE]: [
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      description: 'Most capable Claude model for complex tasks',
      maxTokens: 200000
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      description: 'Balanced performance and speed',
      maxTokens: 200000
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      description: 'Fastest and most cost-effective',
      maxTokens: 200000
    }
  ]
};

// Default settings for each provider
export const DEFAULT_SETTINGS: Record<AIProvider, AISettings> = {
  [AIProvider.OPENAI]: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0
  },
  [AIProvider.GEMINI]: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    topK: 40
  },
  [AIProvider.CLAUDE]: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1
  }
};

// Zod schemas for validation
export const AISettingsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(200000).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().min(1).max(100).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional()
});

export const AIProviderConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  selectedModel: z.string().min(1, 'Model selection is required'),
  settings: AISettingsSchema,
  enabled: z.boolean()
}).refine((data) => {
  // If provider is disabled, API key and selected model are not required
  if (!data.enabled) return true;
  return data.apiKey.length > 0 && data.selectedModel.length > 0;
}, {
  message: 'API key and model selection are required when provider is enabled',
  path: ['enabled']
});

export const AIConfigSchema = z.object({
  openai: AIProviderConfigSchema,
  gemini: AIProviderConfigSchema,
  claude: AIProviderConfigSchema,
  defaultProvider: z.nativeEnum(AIProvider)
});

export const ConnectionTestResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  responseTime: z.number().optional(),
  model: z.string().optional()
});

// API key validation patterns
export const API_KEY_PATTERNS = {
  [AIProvider.OPENAI]: /^sk-[a-zA-Z0-9]{48,}$/,
  [AIProvider.GEMINI]: /^[a-zA-Z0-9_-]{39}$/,
  [AIProvider.CLAUDE]: /^sk-ant-[a-zA-Z0-9_-]{95,}$/
} as const;

// Utility function to get default config
export function getDefaultConfig(): AIConfig {
  return {
    openai: {
      apiKey: '',
      selectedModel: DEFAULT_MODELS[AIProvider.OPENAI],
      settings: DEFAULT_SETTINGS[AIProvider.OPENAI],
      enabled: false
    },
    gemini: {
      apiKey: '',
      selectedModel: DEFAULT_MODELS[AIProvider.GEMINI],
      settings: DEFAULT_SETTINGS[AIProvider.GEMINI],
      enabled: false
    },
    claude: {
      apiKey: '',
      selectedModel: DEFAULT_MODELS[AIProvider.CLAUDE],
      settings: DEFAULT_SETTINGS[AIProvider.CLAUDE],
      enabled: false
    },
    defaultProvider: AIProvider.OPENAI
  };
}

// Utility function to validate API key format
export function validateApiKeyFormat(provider: AIProvider, apiKey: string): boolean {
  const pattern = API_KEY_PATTERNS[provider];
  return pattern.test(apiKey);
}