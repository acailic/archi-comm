import React from 'react';
import type { CircuitBreakerDetails } from '@/lib/performance/RenderGuard';
import { InfiniteLoopDetector } from '@/lib/performance/InfiniteLoopDetector';

interface EmergencyPauseOverlayProps {
  emergencyPauseReason: string;
  circuitBreakerDetails: CircuitBreakerDetails | null;
  onResumeAfterPause: () => void;
}

export function EmergencyPauseOverlay({
  emergencyPauseReason,
  circuitBreakerDetails,
  onResumeAfterPause,
}: EmergencyPauseOverlayProps) {
  const latestReport = InfiniteLoopDetector.getInstance().getLatestReport('DesignCanvasCore');

  return (
    <div className='h-full flex flex-col items-center justify-center gap-4 bg-background text-center px-6 py-8'>
      <div className='space-y-2 max-w-md'>
        <h2 className='text-xl font-semibold'>Render Loop Protection Active</h2>
        <p className='text-sm text-muted-foreground'>
          We paused canvas updates because <span className='font-medium'>{emergencyPauseReason}</span>. Any
          unsaved progress has been preserved.
        </p>
        {circuitBreakerDetails ? (
          <p className='text-xs text-muted-foreground'>
            Render burst detected after {circuitBreakerDetails.renderCount} renders. Cooling down until{' '}
            {new Date(circuitBreakerDetails.until).toLocaleTimeString()}.
          </p>
        ) : null}
        {latestReport?.reason ? (
          <p className='text-xs text-muted-foreground'>Detector insight: {latestReport.reason}</p>
        ) : null}
      </div>
      <button
        type='button'
        onClick={onResumeAfterPause}
        className='px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90'
      >
        Resume Editing
      </button>
    </div>
  );
}