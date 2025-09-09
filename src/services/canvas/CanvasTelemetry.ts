import { useUXTracker } from '@/hooks/useUXTracker';

export interface CanvasTelemetryApi {
  trackCanvasAction: (action: string, data?: unknown, success?: boolean) => void;
  trackPerformance: (metric: string, data?: Record<string, unknown>) => void;
  trackError: (error: Error | unknown, context?: Record<string, unknown>) => void;
  trackTemplateUsage: (template: string, data?: Record<string, unknown>) => void;
}

export function useCanvasTelemetry(): CanvasTelemetryApi {
  const { trackCanvasAction, trackPerformance, trackError } = useUXTracker();

  const api: CanvasTelemetryApi = {
    trackCanvasAction: (action, data, success) => trackCanvasAction(action as any, data as any, success),
    trackPerformance: (metric, data) => trackPerformance(metric as any, data as any),
    trackError: (err, context) => trackError(err as any, context as any),
    trackTemplateUsage: (template, data) =>
      trackCanvasAction('template-apply' as any, { template, ...(data || {}) } as any, true),
  };

  return api;
}

