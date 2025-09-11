'use client';

import { ChevronDown, ChevronRight, Copy, FileText } from 'lucide-react';
import React, { Suspense, useState } from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
} from './ui/sidebar';
import type { Challenge } from '@/shared/contracts';
// Lazy-load and memoize ComponentPalette to improve performance
const ComponentPalette = React.lazy(() =>
  import('./ComponentPalette').then(m => ({ default: React.memo(m.ComponentPalette) }))
);

interface VerticalSidebarProps {
  challenge?: Challenge;
}

export function VerticalSidebar({ challenge }: VerticalSidebarProps) {
  const [showAssignment, setShowAssignment] = useState(true);

  const copyAssignment = async () => {
    try {
      if (!challenge) return;
      // Build text content with safe fallbacks
      let text = `${challenge.title || ''}\n\n${challenge.description || ''}`;

      // Only add requirements if they exist and are an array
      if (Array.isArray(challenge.requirements) && challenge.requirements.length > 0) {
        text += `\n\nRequirements:\n- ${challenge.requirements.join('\n- ')}`;
      }

      // Handle clipboard API availability
      if (!navigator?.clipboard?.writeText) {
        // Silently fail - user will notice copy didn't work
        return;
      }

      await navigator.clipboard.writeText(text);
    } catch {
      // Silently fail - user will notice if copy didn't work
    }
  };

  return (
    // Solid sidebar with explicit width so it always renders
    <Sidebar
      side='left'
      variant='sidebar'
      collapsible='none'
      className='h-full sidebar-width lg:sidebar-width-lg layout-sidebar-stable shrink-0 border-r lg:border-b-0 border-b bg-card/50'
    >
      <SidebarContent className='flex flex-col h-full'>
        {/* Assignment summary */}
        {challenge && (
          <SidebarGroup>
            <SidebarGroupLabel className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <FileText className='w-4 h-4' />
                Assignment
              </div>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 px-2'
                onClick={() => setShowAssignment(v => !v)}
                aria-pressed={showAssignment}
                aria-label={showAssignment ? 'Hide assignment' : 'Show assignment'}
              >
                {showAssignment ? (
                  <ChevronDown className='w-4 h-4' />
                ) : (
                  <ChevronRight className='w-4 h-4' />
                )}
              </Button>
            </SidebarGroupLabel>
            {showAssignment && (
              <div className='bg-accent/10 rounded-lg p-3 mx-2 mb-2 border-l-2 border-primary/20 layout-stable'>
                <div className='text-base font-semibold leading-tight text-primary'>{challenge.title}</div>
                <div className='text-xs text-muted-foreground leading-snug'>
                  {challenge.description}
                </div>
                {challenge.requirements?.length > 0 && (
                  <div className='mt-2'>
                    <div className='text-xs font-medium mb-1'>Requirements</div>
                    <ScrollArea className='h-28 rounded border bg-card/50'>
                      <ul className='p-2 text-xs space-y-1.5 list-disc ml-4'>
                        {challenge.requirements.map((req, i) => (
                          <li key={`${req}-${i}`} className='leading-snug text-foreground/90'>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
                <div className='flex justify-end pt-1'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => void copyAssignment()}
                    className='h-7 px-2'
                  >
                    <Copy className='w-3.5 h-3.5 mr-1' />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </SidebarGroup>
        )}

        <SidebarGroup className='flex-1 px-1.5 layout-stable'>
          <SidebarGroupLabel className='flex items-center justify-between text-primary'>Component Library</SidebarGroupLabel>
          <div className='flex-1 p-1.5 layout-container-stable'>
            <Suspense
              fallback={
                <div className='text-xs text-muted-foreground p-2'>Loading components…</div>
              }
            >
              <ComponentPalette />
            </Suspense>
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
