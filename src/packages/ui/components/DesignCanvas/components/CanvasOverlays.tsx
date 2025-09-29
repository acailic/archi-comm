
import Confetti from '@ui/components/Confetti';
import type { Challenge } from '@/shared/contracts';
import type { PerformanceBudgetStatus } from '../hooks/useDesignCanvasPerformance';
import { RightOverlays } from './RightOverlays';

interface CanvasOverlaysProps {
  showHints: boolean;
  onCloseHints: () => void;
  challenge: Challenge;
  currentComponents: any[];
  showCommandPalette: boolean;
  onCloseCommandPalette: () => void;
  onNavigate?: () => void;
  selectedChallenge?: Challenge;
  showConfetti: boolean;
  onConfettiDone: () => void;
  budgetStatus?: PerformanceBudgetStatus;
}

export function CanvasOverlays({
  showHints,
  onCloseHints,
  challenge,
  currentComponents,
  showCommandPalette,
  onCloseCommandPalette,
  onNavigate,
  selectedChallenge,
  showConfetti,
  onConfettiDone,
  budgetStatus,
}: CanvasOverlaysProps) {
  return (
    <>
      <RightOverlays
        showHints={showHints}
        onCloseHints={onCloseHints}
        challenge={challenge}
        currentComponents={currentComponents}
        showCommandPalette={showCommandPalette}
        onCloseCommandPalette={onCloseCommandPalette}
        onNavigate={onNavigate}
        selectedChallenge={selectedChallenge ?? challenge}
      />
      {budgetStatus?.overBudget && (
        <div className='absolute bottom-4 right-4 z-10 rounded-md bg-amber-500/10 border border-amber-500/40 px-3 py-2 text-xs text-amber-900 shadow-sm'>
          High render activity detected ({budgetStatus.rendersPerMinute}/
          {budgetStatus.limit} rpm). Consider pausing heavy updates.
        </div>
      )}
      <Confetti show={showConfetti} onDone={onConfettiDone} />
    </>
  );
}
