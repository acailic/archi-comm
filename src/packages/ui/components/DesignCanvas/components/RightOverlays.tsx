import React from 'react';
import { CommandPalette } from '@ui/components/CommandPalette';
import { SolutionHints } from '@ui/components/SolutionHints';
import type { Challenge } from '@/shared/contracts';

interface RightOverlaysProps {
  showHints: boolean;
  onCloseHints: () => void;
  challenge: Challenge;
  currentComponents: any[];
  showCommandPalette: boolean;
  onCloseCommandPalette: () => void;
  onNavigate?: () => void;
  selectedChallenge?: Challenge;
  rightContent?: React.ReactNode;
}

export function RightOverlays({
  showHints,
  onCloseHints,
  challenge,
  currentComponents,
  showCommandPalette,
  onCloseCommandPalette,
  onNavigate,
  selectedChallenge,
}: RightOverlaysProps) {
  return (
    <>
      {showHints && (
        <div className='absolute top-4 right-4 w-80 z-10'>
          <SolutionHints
            challenge={challenge}
            currentComponents={currentComponents}
            onClose={onCloseHints}
          />
        </div>
      )}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={onCloseCommandPalette}
        currentScreen='design'
        onNavigate={onNavigate ?? (() => {})}
        selectedChallenge={selectedChallenge ?? challenge}
      />
    </>
  );
}
