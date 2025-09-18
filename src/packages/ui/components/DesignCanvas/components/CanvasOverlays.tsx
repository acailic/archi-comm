import React from 'react';
import Confetti from '@ui/components/Confetti';
import type { Challenge } from '@/shared/contracts';
import { RightOverlays } from './RightOverlays';

interface CanvasOverlaysProps {
  showHints: boolean;
  onCloseHints: () => void;
  challenge: Challenge;
  currentComponents: any[];
  showCommandPalette: boolean;
  onCloseCommandPalette: () => void;
  onNavigate: () => void;
  selectedChallenge: Challenge;
  showConfetti: boolean;
  onConfettiDone: () => void;
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
        selectedChallenge={selectedChallenge}
      />
      <Confetti show={showConfetti} onDone={onConfettiDone} />
    </>
  );
}
