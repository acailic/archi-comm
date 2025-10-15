import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as env from '@/lib/config/environment';
import * as aiConfig from '@/lib/services/AIConfigService';
import { AIProvider } from '@/lib/types/AIConfig';
import { isAIAvailable, parseAIResponse, reviewSolution } from '@/lib/api/ai';

describe('AI service error handling', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('parseAIResponse handles valid JSON, malformed JSON, and plain text', () => {
    const valid = '{"summary":"ok","strengths":[],"risks":[],"score":80}';
    expect(parseAIResponse(valid).score).toBe(80);

    const wrapped = 'Here is JSON:\n{"summary":"x","strengths":[],"risks":[],"score":70}\nThanks';
    expect(parseAIResponse(wrapped).score).toBe(70);

    const plain = 'non-json text response';
    const fallback = parseAIResponse(plain);
    expect(fallback.summary).toContain('non-json');
    expect(fallback.score).toBeGreaterThan(0);
  });

  it('isAIAvailable reflects configuration state', async () => {
    vi.spyOn(aiConfig.aiConfigService, 'loadConfig').mockResolvedValue({
      openai: { enabled: true, apiKey: 'sk-123' },
      gemini: { enabled: false, apiKey: '' },
      claude: { enabled: false, apiKey: '' },
      preferredProvider: AIProvider.OPENAI,
    } as any);
    await expect(isAIAvailable()).resolves.toBe(true);

    vi.spyOn(aiConfig.aiConfigService, 'loadConfig').mockResolvedValue({
      openai: { enabled: false, apiKey: '' },
      gemini: { enabled: false, apiKey: '' },
      claude: { enabled: false, apiKey: '' },
      preferredProvider: AIProvider.OPENAI,
    } as any);
    await expect(isAIAvailable()).resolves.toBe(false);
  });

  it('reviewSolution throws informative errors on HTTP error codes', async () => {
    // Force tauri mode
    vi.spyOn(env, 'isTauriEnvironment').mockReturnValue(true);
    vi.spyOn(aiConfig.aiConfigService, 'loadConfig').mockResolvedValue({
      openai: { enabled: true, apiKey: 'sk-test' },
      gemini: { enabled: false, apiKey: '' },
      claude: { enabled: false, apiKey: '' },
      preferredProvider: AIProvider.OPENAI,
    } as any);

    const fetchMock = vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: false,
      status: 500,
    } as any);

    await expect(reviewSolution('t1', 'txt')).rejects.toThrow(/OpenAI API error: 500/);
    expect(fetchMock).toHaveBeenCalled();
  });

  it('reviewSolution handles timeout by hanging fetch', async () => {
    vi.spyOn(env, 'isTauriEnvironment').mockReturnValue(true);
    vi.spyOn(aiConfig.aiConfigService, 'loadConfig').mockResolvedValue({
      openai: { enabled: true, apiKey: 'sk-test' },
      gemini: { enabled: false, apiKey: '' },
      claude: { enabled: false, apiKey: '' },
      preferredProvider: AIProvider.OPENAI,
    } as any);

    vi.spyOn(globalThis, 'fetch' as any).mockImplementation(() => new Promise(() => {}));

    const p = reviewSolution('t1', 'txt');
    // Advance microtasks briefly then ensure promise still pending by racing with a timeout
    const timed = Promise.race([
      p,
      new Promise(resolve => setTimeout(() => resolve('timeout'), 20)),
    ]);
    await expect(timed).resolves.toBe('timeout');
  });
});
