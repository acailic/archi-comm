import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn(),
  join: vi.fn(),
}));

vi.mock('@tauri-apps/api/fs', () => ({
  createDir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  exists: vi.fn(),
}));

vi.mock('../lib/platform/tauri', () => ({
  isTauri: vi.fn(),
}));

import { appDataDir, join } from '@tauri-apps/api/path';
import { createDir, readTextFile, writeTextFile, exists } from '@tauri-apps/api/fs';
import { AIConfigService } from '../lib/services/AIConfigService';
import { AIProvider, getDefaultConfig } from '../lib/types/AIConfig';
import { isTauri } from '../lib/platform/tauri';

const mockedIsTauri = vi.mocked(isTauri);
const mockedAppDataDir = vi.mocked(appDataDir);
const mockedJoin = vi.mocked(join);
const mockedCreateDir = vi.mocked(createDir);
const mockedReadTextFile = vi.mocked(readTextFile);
const mockedWriteTextFile = vi.mocked(writeTextFile);
const mockedExists = vi.mocked(exists);

describe('AIConfigService', () => {
  let service: AIConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton instance
    (AIConfigService as any).instance = null;
    service = AIConfigService.getInstance();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('save/load roundtrip', () => {
    it('persists and decrypts API keys correctly in Tauri', async () => {
      mockedIsTauri.mockReturnValue(true);
      mockedAppDataDir.mockResolvedValue('/app/data');
      mockedJoin.mockImplementation((...parts) => parts.join('/'));
      mockedCreateDir.mockResolvedValue(undefined);
      mockedExists.mockResolvedValue(false);
      mockedReadTextFile.mockResolvedValue('{}');
      mockedWriteTextFile.mockResolvedValue(undefined);

      const testConfig = {
        ...getDefaultConfig(),
        [AIProvider.OPENAI]: {
          enabled: true,
          apiKey: 'sk-test123456789',
          selectedModel: 'gpt-4',
          settings: { temperature: 0.7, maxTokens: 2000 },
        },
      };

      await service.saveConfig(testConfig);
      expect(mockedWriteTextFile).toHaveBeenCalled();

      mockedReadTextFile.mockResolvedValue(JSON.stringify(testConfig));
      const loadedConfig = await service.loadConfig();

      expect(loadedConfig[AIProvider.OPENAI].apiKey).toBe('sk-test123456789');
    });

    it('handles web environment gracefully', async () => {
      mockedIsTauri.mockReturnValue(false);

      const testConfig = {
        ...getDefaultConfig(),
        [AIProvider.OPENAI]: {
          enabled: true,
          apiKey: 'sk-web123',
          selectedModel: 'gpt-4',
          settings: { temperature: 0.7, maxTokens: 2000 },
        },
      };

      await service.saveConfig(testConfig);
      const loadedConfig = await service.loadConfig();

      expect(loadedConfig[AIProvider.OPENAI].apiKey).toBe('sk-web123');
    });
  });

  describe('getEnabledProviders', () => {
    it('filters by enabled, apiKey, and selectedModel', async () => {
      const testConfig = {
        ...getDefaultConfig(),
        [AIProvider.OPENAI]: {
          enabled: true,
          apiKey: 'sk-test123',
          selectedModel: 'gpt-4',
          settings: { temperature: 0.7, maxTokens: 2000 },
        },
        [AIProvider.GEMINI]: {
          enabled: true,
          apiKey: 'gemini-test',
          selectedModel: '', // Empty model should exclude
          settings: { temperature: 0.7, maxTokens: 2000 },
        },
        [AIProvider.CLAUDE]: {
          enabled: false, // Disabled should exclude
          apiKey: 'claude-test',
          selectedModel: 'claude-3',
          settings: { temperature: 0.7, maxTokens: 2000 },
        },
      };

      mockedIsTauri.mockReturnValue(false);
      await service.saveConfig(testConfig);

      const enabledProviders = await service.getEnabledProviders();
      expect(enabledProviders).toEqual([AIProvider.OPENAI]);
    });
  });

  describe('getDefaultProvider', () => {
    it('returns configured default provider when enabled', async () => {
      const testConfig = {
        ...getDefaultConfig(),
        defaultProvider: AIProvider.OPENAI,
        [AIProvider.OPENAI]: {
          enabled: true,
          apiKey: 'sk-test123',
          selectedModel: 'gpt-4',
          settings: { temperature: 0.7, maxTokens: 2000 },
        },
      };

      mockedIsTauri.mockReturnValue(false);
      await service.saveConfig(testConfig);

      const defaultProvider = await service.getDefaultProvider();
      expect(defaultProvider).toBe(AIProvider.OPENAI);
    });

    it('falls back to first enabled provider when default is not enabled', async () => {
      const testConfig = {
        ...getDefaultConfig(),
        defaultProvider: AIProvider.CLAUDE, // Not enabled
        [AIProvider.OPENAI]: {
          enabled: true,
          apiKey: 'sk-test123',
          selectedModel: 'gpt-4',
          settings: { temperature: 0.7, maxTokens: 2000 },
        },
      };

      mockedIsTauri.mockReturnValue(false);
      await service.saveConfig(testConfig);

      const defaultProvider = await service.getDefaultProvider();
      expect(defaultProvider).toBe(AIProvider.OPENAI);
    });
  });

  describe('testConnection', () => {
    it('returns web guard error in non-Tauri environment', async () => {
      mockedIsTauri.mockReturnValue(false);

      const result = await service.testConnection(
        AIProvider.OPENAI,
        'sk-test123456789012345678901234567890123456789012345678'
      );
      expect(result.success).toBe(false);
      expect(result.error).toContain('desktop app');
    });
  });
});

describe('AI API functions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('reviewSolution', () => {
    it('calls direct provider when configured and Tauri', async () => {
      mockedIsTauri.mockReturnValue(true);

      // Mock the service to return OpenAI as configured
      const mockService = {
        getDefaultProvider: vi.fn().mockResolvedValue(AIProvider.OPENAI),
        loadConfig: vi.fn().mockResolvedValue({
          [AIProvider.OPENAI]: {
            enabled: true,
            apiKey: 'sk-test123',
            selectedModel: 'gpt-4',
            settings: { temperature: 0.7, maxTokens: 2000 },
          },
        }),
      };

      vi.doMock('../lib/services/AIConfigService', () => ({
        aiConfigService: mockService,
      }));

      // Mock fetch for OpenAI call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: '{"summary": "Test", "strengths": [], "risks": [], "score": 85}',
              },
            },
          ],
        }),
      });

      const { reviewSolution } = await import('../lib/api/ai');
      const result = await reviewSolution('task1', 'test solution');

      expect(result.summary).toBe('Test');
      expect(result.score).toBe(85);
    });

    it('throws error for web builds when trying direct provider', async () => {
      mockedIsTauri.mockReturnValue(false);

      const mockService = {
        getDefaultProvider: vi.fn().mockResolvedValue(AIProvider.OPENAI),
        loadConfig: vi.fn().mockResolvedValue({
          [AIProvider.OPENAI]: {
            enabled: true,
            apiKey: 'sk-test123',
            selectedModel: 'gpt-4',
            settings: { temperature: 0.7, maxTokens: 2000 },
          },
        }),
      };

      vi.doMock('../lib/services/AIConfigService', () => ({
        aiConfigService: mockService,
      }));

      const { reviewSolution } = await import('../lib/api/ai');

      await expect(reviewSolution('task1', 'test solution')).rejects.toThrow(
        'AI provider calls are only available in the desktop application'
      );
    });
  });

  describe('callAIProvider', () => {
    it('throws error in web environment', async () => {
      mockedIsTauri.mockReturnValue(false);

      const { callAIProvider } = await import('../lib/api/ai');
      const config = getDefaultConfig();

      await expect(callAIProvider(AIProvider.OPENAI, config, 'test')).rejects.toThrow(
        'AI provider calls are only available in the desktop application'
      );
    });
  });
});

describe('API key validation', () => {
  it('accepts sk-proj-... format for OpenAI', () => {
    const { validateApiKeyFormat } = require('../lib/types/AIConfig');

    expect(validateApiKeyFormat(AIProvider.OPENAI, 'sk-proj-123456789')).toBe(true);
    expect(validateApiKeyFormat(AIProvider.OPENAI, 'sk-123456789')).toBe(true);
    expect(validateApiKeyFormat(AIProvider.OPENAI, 'invalid-key')).toBe(false);
  });

  it('validates Gemini API keys', () => {
    const { validateApiKeyFormat } = require('../lib/types/AIConfig');

    expect(validateApiKeyFormat(AIProvider.GEMINI, 'AIzaSy123456789')).toBe(true);
    expect(validateApiKeyFormat(AIProvider.GEMINI, 'short')).toBe(false);
  });

  it('validates Claude API keys', () => {
    const { validateApiKeyFormat } = require('../lib/types/AIConfig');

    expect(validateApiKeyFormat(AIProvider.CLAUDE, 'sk-ant-api03-123456789')).toBe(true);
    expect(validateApiKeyFormat(AIProvider.CLAUDE, 'invalid')).toBe(false);
  });
});
