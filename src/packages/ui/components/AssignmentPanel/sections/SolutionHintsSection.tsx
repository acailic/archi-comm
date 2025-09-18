import React from 'react';
import { Lightbulb } from 'lucide-react';
import { CollapsibleSection } from '../CollapsibleSection';
import { Badge } from '../../ui/badge';
import type { ExtendedChallenge } from '@/lib/config/challenge-config';

interface SolutionHintsSectionProps {
  extendedChallenge: ExtendedChallenge;
  isExpanded: boolean;
  onToggle: () => void;
}

export function SolutionHintsSection({
  extendedChallenge,
  isExpanded,
  onToggle
}: SolutionHintsSectionProps) {
  return (
    <CollapsibleSection
      title={
        <div className='flex items-center gap-2'>
          Solution Hints
          <Badge variant='outline' className='text-xs'>
            {extendedChallenge.solutionHints?.length || 0}
          </Badge>
        </div>
      }
      icon={Lightbulb}
      isExpanded={isExpanded}
      onToggle={onToggle}
      className="border-l-4 border-l-amber-500"
    >
      <div className='space-y-3'>
        {extendedChallenge.solutionHints && extendedChallenge.solutionHints.length > 0 ? (
          extendedChallenge.solutionHints.map((hint, index) => (
            <div
              key={hint.id || index}
              className='bg-amber-50/50 border border-amber-200/50 p-3 rounded text-sm'
            >
              <div className='flex items-start gap-2'>
                <div className='w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-medium flex-shrink-0 mt-0.5'>
                  {index + 1}
                </div>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <div className='font-medium text-amber-800'>{hint.title}</div>
                    <Badge
                      variant='outline'
                      className='text-xs px-1.5 py-0.5 bg-amber-100/50 border-amber-300 text-amber-700'
                    >
                      {hint.type}
                    </Badge>
                    <Badge
                      variant={
                        hint.difficulty === 'beginner'
                          ? 'secondary'
                          : hint.difficulty === 'advanced'
                            ? 'destructive'
                            : 'default'
                      }
                      className='text-xs px-1.5 py-0.5'
                    >
                      {hint.difficulty}
                    </Badge>
                  </div>
                  <div className='text-amber-700/80 text-xs leading-relaxed'>
                    {hint.content}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className='text-center text-muted-foreground text-sm py-6'>
            No hints available for this challenge yet.
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}