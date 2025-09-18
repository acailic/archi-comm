import React from 'react';
import { CollapsibleSection } from '../CollapsibleSection';
import type { ExtendedChallenge } from '@/lib/challenge-config';

interface ArchitectureTemplateSectionProps {
  extendedChallenge: ExtendedChallenge;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ArchitectureTemplateSection({
  extendedChallenge,
  isExpanded,
  onToggle
}: ArchitectureTemplateSectionProps) {
  if (!extendedChallenge.architectureTemplate) {
    return null;
  }

  const template = extendedChallenge.architectureTemplate;

  return (
    <CollapsibleSection
      title="Architecture Template"
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <div className='space-y-3'>
        <div className='bg-muted/30 p-3 rounded text-sm'>
          <div className='font-medium text-foreground mb-2'>
            {template.name}
          </div>
          <div className='text-muted-foreground text-xs mb-3'>
            {template.description}
          </div>

          <div className='space-y-2'>
            <div className='text-xs font-medium text-muted-foreground'>Components:</div>
            {template.components.map((comp, index) => (
              <div key={index} className='flex items-start gap-2 text-xs'>
                <div className='w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0' />
                <div>
                  <span className='font-medium'>{comp.label}</span>
                  {comp.description && (
                    <span className='text-muted-foreground ml-2'>
                      - {comp.description}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {template.connections.length > 0 && (
            <div className='mt-3 space-y-2'>
              <div className='text-xs font-medium text-muted-foreground'>
                Key Connections:
              </div>
              {template.connections.map((conn, index) => (
                <div key={index} className='flex items-center gap-2 text-xs'>
                  <div className='w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0' />
                  <span>
                    {conn.from} → {conn.to}
                  </span>
                  <span className='text-muted-foreground'>({conn.label})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}