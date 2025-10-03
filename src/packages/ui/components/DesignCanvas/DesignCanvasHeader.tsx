// src/components/DesignCanvas/DesignCanvasHeader.tsx
// Header section for DesignCanvas component
// Contains back button, challenge title, action buttons, and continue button
// RELEVANT FILES: DesignCanvasCore.tsx, ../ImportExportDropdown.tsx, ../ui/button.tsx, ../@shared/contracts.ts

import { ImportExportDropdown } from '@ui/components/ImportExportDropdown';
import { Button } from '@ui/components/ui/button';
import type { CanvasConfig } from '@/lib/import-export/types';
import type { Challenge, DesignData } from '@/shared/contracts';
import { ArrowLeft, Lightbulb, Save, Search, Settings as SettingsIcon, MessageSquare } from 'lucide-react';


interface DesignCanvasHeaderProps {
  challenge: Challenge;
  showHints: boolean;
  components: any[];
  currentDesignData: DesignData;
  canvasConfig: CanvasConfig;
  onBack: () => void;
  onContinue: () => void;
  onToggleHints: () => void;
  onSave: () => void;
  onShowCommandPalette: () => void;
  onImport: (result: any) => void;
  showAnnotationSidebar?: boolean;
  onToggleAnnotationSidebar?: () => void;
  annotationCount?: number;
}

export function DesignCanvasHeader({
  challenge,
  showHints,
  components,
  currentDesignData,
  canvasConfig,
  onBack,
  onContinue,
  onToggleHints,
  onSave,
  onShowCommandPalette,
  onImport,
  showAnnotationSidebar,
  onToggleAnnotationSidebar,
  annotationCount = 0,
}: DesignCanvasHeaderProps) {
  return (
    <div className='border-b bg-card/50 backdrop-blur-sm p-4'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onBack}
            className='px-3'
            aria-label='Back to Challenge Selection'
            title='Back to Challenge Selection'
          >
            <ArrowLeft className='w-4 h-4' />
          </Button>
          <div>
            <h1 className='font-semibold text-lg'>{challenge.title}</h1>
            <p className='text-sm text-muted-foreground'>Design your system architecture</p>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={onShowCommandPalette}
            className='px-3'
            aria-label='Search Actions'
            title='Search Actions'
          >
            <Search className='w-4 h-4' />
          </Button>

          <Button
            variant='outline'
            size='sm'
            onClick={onToggleHints}
            className='bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700 px-3'
            aria-label={showHints ? 'Hide Hints' : 'Show Hints'}
            title={showHints ? 'Hide Hints' : 'Show Hints'}
            aria-pressed={showHints}
          >
            <Lightbulb className='w-4 h-4' />
          </Button>

          {onToggleAnnotationSidebar && (
            <Button
              variant='outline'
              size='sm'
              onClick={onToggleAnnotationSidebar}
              className={`px-3 relative ${showAnnotationSidebar ? 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' : ''}`}
              aria-label='Toggle Annotations Sidebar'
              title='Show/Hide Annotations (Shift+A)'
              aria-pressed={showAnnotationSidebar}
            >
              <MessageSquare className='w-4 h-4' />
              {annotationCount > 0 && (
                <span className='absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>
                  {annotationCount}
                </span>
              )}
            </Button>
          )}

          <Button
            variant='outline'
            size='sm'
            onClick={onSave}
            className='px-3'
            aria-label='Save Design'
            title='Save Design'
          >
            <Save className='w-4 h-4' />
          </Button>

          <ImportExportDropdown
            designData={currentDesignData}
            challenge={challenge}
            canvasConfig={canvasConfig}
            onImport={onImport}
          />
          <Button
            variant='outline'
            size='sm'
            onClick={() => window.dispatchEvent(new CustomEvent('navigate:config'))}
            className='px-3'
            aria-label='Settings'
            title='Settings'
          >
            <SettingsIcon className='w-4 h-4' />
          </Button>

          <Button onClick={onContinue} disabled={components.length === 0}>
            Continue to Recording
          </Button>
        </div>
      </div>
    </div>
  );
}
