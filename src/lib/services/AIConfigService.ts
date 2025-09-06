import { appDataDir, join } from '@tauri-apps/api/path';
import { createDir, readTextFile, writeTextFile, exists } from '@tauri-apps/api/fs';
import { isTauri } from '../tauri';
import { 
  AIConfig, 
  AIProvider, 
  ConnectionTestResult, 
  getDefaultConfig, 
  validateApiKeyFormat,
  AIConfigSchema
} from '../types/AIConfig';

export class AIConfigService {
  private static instance: AIConfigService;
  private configPath: string | null = null;
  private config: AIConfig | null = null;

  private constructor() {}

  static getInstance(): AIConfigService {
    if (!AIConfigService.instance) {
      AIConfigService.instance = new AIConfigService();
    }
    return AIConfigService.instance;
  }

  private async getConfigPath(): Promise<string> {
    if (this.configPath) return this.configPath;

    if (!isTauri()) {
      this.configPath = 'ai-config.json';
      return this.configPath;
    }

    const baseDir = await appDataDir();
    const configDir = await join(baseDir, 'archicomm', 'config');
    this.configPath = await join(configDir, 'ai-config.json');
    return this.configPath;
  }

  private async ensureConfigDirectory(): Promise<void> {
    if (!isTauri()) return;

    const configPath = await this.getConfigPath();
    const configDir = configPath.substring(0, configPath.lastIndexOf('/'));
    
    try {
      await createDir(configDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create config directory:', error);
    }
  }

  private encryptApiKey(apiKey: string): string {
    if (!apiKey) return '';
    
    // Simple XOR encryption with base64 encoding for local storage
    const key = 'archicomm-ai-config-2024';
    let encrypted = '';
    
    for (let i = 0; i < apiKey.length; i++) {
      const charCode = apiKey.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      encrypted += String.fromCharCode(charCode);
    }
    
    return btoa(encrypted);
  }

  private decryptApiKey(encryptedKey: string): string {
    if (!encryptedKey) return '';
    
    try {
      const key = 'archicomm-ai-config-2024';
      const encrypted = atob(encryptedKey);
      let decrypted = '';
      
      for (let i = 0; i < encrypted.length; i++) {
        const charCode = encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return '';
    }
  }

  private encryptConfig(config: AIConfig): any {
    return {
      ...config,
      openai: {
        ...config.openai,
        apiKey: this.encryptApiKey(config.openai.apiKey)
      },
      gemini: {
        ...config.gemini,
        apiKey: this.encryptApiKey(config.gemini.apiKey)
      },
      claude: {
        ...config.claude,
        apiKey: this.encryptApiKey(config.claude.apiKey)
      }
    };
  }

  private decryptConfig(encryptedConfig: any): AIConfig {
    return {
      ...encryptedConfig,
      openai: {
        ...encryptedConfig.openai,
        apiKey: this.decryptApiKey(encryptedConfig.openai.apiKey)
      },
      gemini: {
        ...encryptedConfig.gemini,
        apiKey: this.decryptApiKey(encryptedConfig.gemini.apiKey)
      },
      claude: {
        ...encryptedConfig.claude,
        apiKey: this.decryptApiKey(encryptedConfig.claude.apiKey)
      }
    };
  }

  async loadConfig(): Promise<AIConfig> {
    if (this.config) return this.config;

    try {
      const configPath = await this.getConfigPath();
      
      if (isTauri()) {
        const fileExists = await exists(configPath);
        if (!fileExists) {
          this.config = getDefaultConfig();
          return this.config;
        }

        const fileContent = await readTextFile(configPath);
        const encryptedConfig = JSON.parse(fileContent);
        this.config = this.decryptConfig(encryptedConfig);
      } else {
        // Web environment - use localStorage
        const storedConfig = localStorage.getItem('ai-config');
        if (!storedConfig) {
          this.config = getDefaultConfig();
          return this.config;
        }

        const encryptedConfig = JSON.parse(storedConfig);
        this.config = this.decryptConfig(encryptedConfig);
      }

      // Validate config structure and merge with defaults if needed
      try {
        AIConfigSchema.parse(this.config);
      } catch (validationError) {
        console.warn('Config validation failed, using defaults:', validationError);
        this.config = getDefaultConfig();
      }

      return this.config;
    } catch (error) {
      console.error('Failed to load AI config:', error);
      this.config = getDefaultConfig();
      return this.config;
    }
  }

  async saveConfig(config: AIConfig): Promise<void> {
    try {
      // Validate config before saving
      AIConfigSchema.parse(config);

      const encryptedConfig = this.encryptConfig(config);
      const configJson = JSON.stringify(encryptedConfig, null, 2);

      if (isTauri()) {
        await this.ensureConfigDirectory();
        const configPath = await this.getConfigPath();
        await writeTextFile(configPath, configJson);
      } else {
        // Web environment - use localStorage
        localStorage.setItem('ai-config', configJson);
      }

      this.config = config;
    } catch (error) {
      console.error('Failed to save AI config:', error);
      throw new Error('Failed to save AI configuration');
    }
  }

  async testConnection(provider: AIProvider, apiKey?: string): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    const config = await this.loadConfig();
    const keyToTest = apiKey || config[provider].apiKey;

    if (!keyToTest) {
      return {
        success: false,
        error: 'API key is required',
        responseTime: Date.now() - startTime
      };
    }

    if (!validateApiKeyFormat(provider, keyToTest)) {
      return {
        success: false,
        error: 'Invalid API key format',
        responseTime: Date.now() - startTime
      };
    }

    try {
      if (!isTauri()) {
        return {
          success: false,
          error: 'AI connection tests are only available in desktop app.',
          responseTime: Date.now() - startTime
        };
      }
      const result = await this.makeTestRequest(provider, keyToTest, config[provider].selectedModel);
      return {
        ...result,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        responseTime: Date.now() - startTime
      };
    }
  }

  private async makeTestRequest(provider: AIProvider, apiKey: string, model: string): Promise<ConnectionTestResult> {
    const testMessage = 'Hello, this is a test message. Please respond with "Test successful".';

    switch (provider) {
      case AIProvider.OPENAI:
        return this.testOpenAI(apiKey, model, testMessage);
      
      case AIProvider.GEMINI:
        return this.testGemini(apiKey, model, testMessage);
      
      case AIProvider.CLAUDE:
        return this.testClaude(apiKey, model, testMessage);
      
      default:
        return {
          success: false,
          error: 'Unsupported provider'
        };
    }
  }

  private async testOpenAI(apiKey: string, model: string, message: string): Promise<ConnectionTestResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: message }],
          max_tokens: 50,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        model: data.model
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  private async testGemini(apiKey: string, model: string, message: string): Promise<ConnectionTestResult> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: message }]
          }],
          generationConfig: {
            maxOutputTokens: 50,
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        model: model
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  private async testClaude(apiKey: string, model: string, message: string): Promise<ConnectionTestResult> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: 50,
          temperature: 0.1,
          messages: [{ role: 'user', content: message }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        model: data.model
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  async resetToDefaults(): Promise<void> {
    this.config = getDefaultConfig();
    await this.saveConfig(this.config);
  }

  async getEnabledProviders(): Promise<AIProvider[]> {
    const config = await this.loadConfig();
    return Object.entries(config)
      .filter(([key, value]) => 
        key !== 'defaultProvider' && 
        value.enabled && 
        value.apiKey && 
        value.selectedModel?.trim()
      )
      .map(([key]) => key as AIProvider);
  }

  async getDefaultProvider(): Promise<AIProvider | null> {
    const config = await this.loadConfig();
    const enabledProviders = await this.getEnabledProviders();
    
    if (enabledProviders.includes(config.defaultProvider)) {
      return config.defaultProvider;
    }
    
    return enabledProviders.length > 0 ? enabledProviders[0] : null;
  }

  validateApiKey(provider: AIProvider, apiKey: string): boolean {
    return validateApiKeyFormat(provider, apiKey);
  }
}

export const aiConfigService = AIConfigService.getInstance();