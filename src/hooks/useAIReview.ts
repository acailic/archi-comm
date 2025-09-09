import { useCallback, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import type { ReviewResp } from '../shared/contracts';

interface UseAIReviewOptions {
  rateLimitMs?: number;
  cache?: boolean;
}

export function useAIReview(options: UseAIReviewOptions = {}) {
  const { rateLimitMs = 3000, cache = true } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResp | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; timestamp: number; result: ReviewResp }>>([]);
  const lastCallRef = useRef<number>(0);
  const cacheRef = useRef<Map<string, ReviewResp>>(new Map());

  const review = useCallback(
    async (taskId: string, solution: string) => {
      const key = `${taskId}:${solution.slice(0, 200)}`;
      const now = Date.now();
      if (now - lastCallRef.current < rateLimitMs) {
        return; // rate limited
      }
      lastCallRef.current = now;

      if (cache && cacheRef.current.has(key)) {
        const cached = cacheRef.current.get(key) || null;
        setResult(cached);
        if (cached) {
          setHistory(prev => [{ id: `${key}:${now}`, timestamp: now, result: cached }, ...prev]);
        }
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const resp = await invoke<ReviewResp>('ai_review', { taskId, solution });
        setResult(resp);
        setHistory(prev => [{ id: `${key}:${now}`, timestamp: now, result: resp }, ...prev]);
        if (cache) cacheRef.current.set(key, resp);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [rateLimitMs, cache]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setHistory([]);
  }, []);

  const state = useMemo(
    () => ({ loading, error, result, history }),
    [loading, error, result, history]
  );

  return { ...state, review, reset };
}
