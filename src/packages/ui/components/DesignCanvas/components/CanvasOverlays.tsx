
import Confetti from '@ui/components/Confetti';
import type { Challenge } from '@/shared/contracts';
import type { PerformanceBudgetStatus } from '../hooks/useDesignCanvasPerformance';
import { RightOverlays } from './RightOverlays';
import { CanvasAnnotationOverlay } from '@/packages/ui/components/overlays/CanvasAnnotationOverlay';
import { useState, useCallback } from 'react';
import type { AnnotationTool } from '@/packages/ui/components/canvas/AnnotationToolbar';

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
  canvasWidth?: number;
  canvasHeight?: number;
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
  canvasWidth = 1920,
  canvasHeight = 1080,
}: CanvasOverlaysProps) {
  // Annotation tool state
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>(null);
  const [annotationCount, setAnnotationCount] = useState(0);

  const handleToolSelect = useCallback((tool: AnnotationTool) => {
    setSelectedTool(tool);
  }, []);

  const handleAnnotationCreate = useCallback(() => {
    setAnnotationCount(prev => prev + 1);
  }, []);

  const handleAnnotationDelete = useCallback(() => {
    setAnnotationCount(prev => Math.max(0, prev - 1));
  }, []);

  return (
    <>
      {/* Annotation overlay - covers canvas for annotation interactions */}
      <CanvasAnnotationOverlay
        width={canvasWidth}
        height={canvasHeight}
        selectedTool={selectedTool || undefined}
        isActive={selectedTool !== null}
        enableQuickConnect={true}
        targetHighlightEnabled={true}
        onAnnotationCreate={handleAnnotationCreate}
        onAnnotationDelete={handleAnnotationDelete}
      />

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
