import type { CanvasRateLimiterSnapshot } from '@/stores/canvasStore';
import type { RenderGuardPauseMetadata } from '../hooks/useDesignCanvasPerformance';

interface EmergencyPauseOverlayProps {
  emergencyPauseReason: string;
  pauseMetadata: RenderGuardPauseMetadata | null;
  onResumeAfterPause: () => void;
  storeCircuitBreakerSnapshot?: CanvasRateLimiterSnapshot | null;
}

export function EmergencyPauseOverlay({
  emergencyPauseReason,
  pauseMetadata,
  onResumeAfterPause,
  storeCircuitBreakerSnapshot,
}: EmergencyPauseOverlayProps) {
  return (
    <div className='h-full flex flex-col items-center justify-center gap-4 bg-background text-center px-6 py-8'>
      <div className='space-y-2 max-w-md'>
        <h2 className='text-xl font-semibold'>Render Loop Protection Active</h2>
        <p className='text-sm text-muted-foreground'>
          We paused canvas updates because <span className='font-medium'>{emergencyPauseReason}</span>. Any
          unsaved progress has been preserved.
        </p>
        {pauseMetadata ? (
          <p className='text-xs text-muted-foreground'>
            Triggered after {pauseMetadata.renderCount} renders.
            {pauseMetadata.resetAt
              ? ` Cooldown ends at ${new Date(pauseMetadata.resetAt).toLocaleTimeString()}.`
              : ''}
          </p>
        ) : null}
        {storeCircuitBreakerSnapshot?.open ? (
          <p className='text-xs text-muted-foreground'>
            Canvas store updates paused ({storeCircuitBreakerSnapshot.updatesInWindow} updates in the last 100ms).
          </p>
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
