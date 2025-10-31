// src/__tests__/security/ai-tauri-fence.test.ts
// Unit tests to verify AI provider calls are hard-fenced to Tauri desktop
// Ensures no network calls to external AI APIs occur when isTauri() returns false
// RELEVANT FILES: src/lib/services/CanvasAIService.ts, src/lib/api/ai.ts, src/lib/platform/tauri.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the isTauri function to control environment
vi.mock('@/lib/platform/tauri', () => ({
  isTauri: vi.fn(),
}));

describe('AI Provider Tauri Fence Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CanvasAIService', () => {
    it('should not call OpenAI API when isTauri() is false', async () => {
      // Arrange: Mock isTauri to return false (web environment)
      const { isTauri } = await import('@/lib/platform/tauri');
      vi.mocked(isTauri).mockReturnValue(false);

      // Mock fetch to detect if it's called
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Act: Import and use CanvasAIService
      const { canvasAIService } = await import('@/lib/services/CanvasAIService');
      
      const result = await canvasAIService.generateDiagramFromText({
        prompt: 'Create a simple web app architecture',
        context: {
          components: [],
          connections: [],
          selectedComponentIds: [],
        },
      });

      // Assert: Verify no fetch call to OpenAI API was made
      expect(fetchSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('api.openai.com'),
        expect.anything()
      );

      // Assert: Should return mock response instead
      expect(result.success).toBe(true);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);

      fetchSpy.mockRestore();
    });

    it('should not call Anthropic API when isTauri() is false', async () => {
      // Arrange: Mock isTauri to return false (web environment)
      const { isTauri } = await import('@/lib/platform/tauri');
      vi.mocked(isTauri).mockReturnValue(false);

      // Mock fetch to detect if it's called
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Act: Import and use CanvasAIService
      const { canvasAIService } = await import('@/lib/services/CanvasAIService');
      
      const result = await canvasAIService.executeInstruction({
        prompt: 'Add a database component',
        context: {
          components: [],
          connections: [],
          selectedComponentIds: [],
        },
        mode: 'update',
      });

      // Assert: Verify no fetch call to Anthropic API was made
      expect(fetchSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('api.anthropic.com'),
        expect.anything()
      );

      // Assert: Should return mock response
      expect(result.actions).toBeDefined();

      fetchSpy.mockRestore();
    });

    it('should return early with mock data when isTauri() is false', async () => {
      // Arrange: Mock isTauri to return false
      const { isTauri } = await import('@/lib/platform/tauri');
      vi.mocked(isTauri).mockReturnValue(false);

      // Act
      const { canvasAIService } = await import('@/lib/services/CanvasAIService');
      
      const result = await canvasAIService.analyzeDesign({
        components: [],
        connections: [],
        selectedComponentIds: [],
      });

      // Assert: Should return success with mock analysis
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
    });
  });

  describe('AI API (reviewSolution)', () => {
    it('should throw error when isTauri() is false', async () => {
      // Arrange: Mock isTauri to return false
      const { isTauri } = await import('@/lib/platform/tauri');
      vi.mocked(isTauri).mockReturnValue(false);

      // Mock fetch to ensure it's not called
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Act & Assert: Should throw error
      const { reviewSolution } = await import('@/lib/api/ai');
      
      await expect(
        reviewSolution('task-123', 'My solution text')
      ).rejects.toThrow('AI provider calls are only available in the desktop application');

      // Assert: Verify no fetch call was made
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it('should not attempt network calls when isTauri() is false', async () => {
      // Arrange: Mock isTauri to return false
      const { isTauri } = await import('@/lib/platform/tauri');
      vi.mocked(isTauri).mockReturnValue(false);

      // Mock fetch and track all calls
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Act: Try to call reviewSolution
      const { reviewSolution } = await import('@/lib/api/ai');
      
      try {
        await reviewSolution('task-456', 'Another solution');
      } catch (error) {
        // Expected to throw
      }

      // Assert: Verify NO fetch calls were made to any AI provider
      const fetchCalls = fetchSpy.mock.calls;
      const aiProviderCalls = fetchCalls.filter(([url]) => 
        typeof url === 'string' && (
          url.includes('api.openai.com') ||
          url.includes('api.anthropic.com') ||
          url.includes('generativelanguage.googleapis.com')
        )
      );

      expect(aiProviderCalls.length).toBe(0);

      fetchSpy.mockRestore();
    });
  });

  describe('AIConfigService', () => {
    it('should block connection test when isTauri() is false', async () => {
      // Arrange: Mock isTauri to return false
      const { isTauri } = await import('@/lib/platform/tauri');
      vi.mocked(isTauri).mockReturnValue(false);

      // Mock fetch to ensure it's not called
      const fetchSpy = vi.spyOn(global, 'fetch');

      // Act
      const { aiConfigService } = await import('@/lib/services/AIConfigService');
      
      const result = await aiConfigService.testConnection('sk-test-key-12345');

      // Assert: Should fail with specific error message
      expect(result.success).toBe(false);
      expect(result.error).toContain('only available in desktop app');

      // Assert: Verify no fetch call was made
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });
  });
});
