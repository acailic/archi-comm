/**
 * src/features/canvas/components/ConnectionEditorPopover.tsx
 * Popover component for editing connection properties
 * Handles connection label editing and type selection
 * RELEVANT FILES: CanvasArea.tsx, useConnectionEditor.ts
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Connection } from '@/shared/contracts';
import * as Popover from '@radix-ui/react-popover';
import {
    ArrowRight,
    LinkIcon,
    Loader2,
    Trash2Icon,
    Zap
} from 'lucide-react';
import React from 'react';

interface ConnectionEditorPopoverProps {
  selectedConnection: Connection;
  x: number;
  y: number;
  onLabelChange: (id: string, label: string) => void;
  onTypeChange: (id: string, type: Connection['type']) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ConnectionEditorPopover({
  selectedConnection,
  x,
  y,
  onLabelChange,
  onTypeChange,
  onDelete,
  onClose
}: ConnectionEditorPopoverProps) {
  const connectionTypes: Array<{ value: Connection['type']; label: string; icon: React.ReactNode }> = [
    { value: 'data', label: 'Data Flow', icon: <ArrowRight className="w-4 h-4" /> },
    { value: 'control', label: 'Control Flow', icon: <Zap className="w-4 h-4" /> },
    { value: 'sync', label: 'Synchronous', icon: <LinkIcon className="w-4 h-4" /> },
    { value: 'async', label: 'Asynchronous', icon: <Loader2 className="w-4 h-4" /> }
  ];

  return (
    <Popover.Root open={true} onOpenChange={open => !open && onClose()}>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          className={cn(
            'z-50 w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
          style={{
            position: 'absolute',
            left: x,
            top: y
          }}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="connectionLabel">Connection Label</Label>
              <Input
                id="connectionLabel"
                value={selectedConnection.label}
                onChange={e => onLabelChange(selectedConnection.id, e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connectionType">Connection Type</Label>
              <Select
                value={selectedConnection.type}
                onValueChange={value => onTypeChange(selectedConnection.id, value as Connection['type'])}
              >
                <SelectTrigger id="connectionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connectionTypes.map(({ value, label, icon }) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        {icon}
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(selectedConnection.id)}
              >
                <Trash2Icon className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>

          <Popover.Arrow className="fill-popover" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
