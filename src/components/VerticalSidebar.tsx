import React, { useState, Suspense } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from './ui/sidebar';
// Lazy-load and memoize ComponentPalette to improve performance
const ComponentPalette = React.lazy(() =>
  import('./ComponentPalette').then((m) => ({ default: React.memo(m.ComponentPalette) }))
);
import type { DesignComponent } from '../App';
import { FileText, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import type { Challenge } from '../App';

interface VerticalSidebarProps {
  challenge?: Challenge;
}

export function VerticalSidebar({ 
  challenge
}: VerticalSidebarProps) {
  const [showAssignment, setShowAssignment] = useState(true);

  const copyAssignment = async () => {
    try {
      if (!challenge) return;
      const text = `${challenge.title}\n\n${challenge.description}\n\nRequirements:\n- ${challenge.requirements.join('\n- ')}`;
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    // Solid sidebar with explicit width so it always renders
    <Sidebar
      side="left"
      variant="sidebar"
      collapsible="none"
      className="h-full w-80 shrink-0 border-r bg-card/50"
      style={{ width: '20rem' }}
    >
      <SidebarContent className="flex flex-col h-full">
        {/* Assignment summary */}
        {challenge && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Assignment
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setShowAssignment(v => !v)}
                aria-pressed={showAssignment}
                aria-label={showAssignment ? 'Hide assignment' : 'Show assignment'}
              >
                {showAssignment ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </SidebarGroupLabel>
            {showAssignment && (
              <div className="px-4 pb-2 space-y-2">
                <div className="text-sm font-medium leading-tight">{challenge.title}</div>
                <div className="text-xs text-muted-foreground leading-snug">{challenge.description}</div>
                {challenge.requirements?.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium mb-1">Requirements</div>
                    <ScrollArea className="h-28 rounded border bg-card/50">
                      <ul className="p-2 text-xs space-y-1">
                        {challenge.requirements.map((req, i) => (
                          <li key={`${req}-${i}`} className="flex gap-2">
                            <span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
                            <span className="leading-snug">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
                <div className="flex justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={copyAssignment} className="h-7 px-2">
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </SidebarGroup>
        )}

        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Component Library</SidebarGroupLabel>
          <div className="flex-1 p-2">
            <Suspense fallback={<div className="text-xs text-muted-foreground p-2">Loading components…</div>}>
              <ComponentPalette />
            </Suspense>
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
