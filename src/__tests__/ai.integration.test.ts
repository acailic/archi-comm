import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/tauri';
import { reviewSolution } from '../lib/api/ai';

beforeEach(() => vi.resetAllMocks());

describe('AI review integration', () => {
  it('maps structured backend response', async () => {
    (invoke as any).mockResolvedValue({ summary: 'Looks solid', strengths: ['scaling'], risks: ['hotspot'], score: 78 });
    const res = await reviewSolution('task1', 'my solution');
    expect(res.summary).toContain('solid');
    expect(res.score).toBe(78);
  });

  it('accepts plain string content from third-party', async () => {
    (invoke as any).mockResolvedValue('Summary text from model.');
    const res = await reviewSolution('task2', 'sol');
    expect(res.summary).toMatch(/Summary text/);
  });

  it('handles unexpected shapes gracefully', async () => {
    (invoke as any).mockResolvedValue(42);
    const res = await reviewSolution('task3', 'sol');
    expect(typeof res.summary).toBe('string');
  });
});

