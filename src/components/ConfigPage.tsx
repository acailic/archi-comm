// src/components/ConfigPage.tsx
// Configuration page for canvas and application settings
// Houses controls that were moved from the canvas for cleaner interface
// RELEVANT FILES: AppContainer.tsx, ReactFlowCanvas.tsx, CommandPalette.tsx, DesignCanvas.tsx

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Settings, Paintbrush, Zap } from 'lucide-react';

interface ConfigPageProps {
  onBack: () => void;
  connectionStyle?: 'straight' | 'curved' | 'stepped';
  onConnectionStyleChange?: (style: 'straight' | 'curved' | 'stepped') => void;
  virtualizationEnabled?: boolean;
  onVirtualizationToggle?: (enabled: boolean) => void;
  virtualizationStats?: {
    visibleComponents: number;
    totalComponents: number;
  };
}

export function ConfigPage({
  onBack,
  connectionStyle = 'curved',
  onConnectionStyleChange,
  virtualizationEnabled = false,
  onVirtualizationToggle,
  virtualizationStats,
}: ConfigPageProps) {
  const [localConnectionStyle, setLocalConnectionStyle] = useState(connectionStyle);
  const [localVirtualization, setLocalVirtualization] = useState(virtualizationEnabled);

  const handleConnectionStyleChange = (style: 'straight' | 'curved' | 'stepped') => {
    setLocalConnectionStyle(style);
    onConnectionStyleChange?.(style);
  };

  const handleVirtualizationToggle = (enabled: boolean) => {
    setLocalVirtualization(enabled);
    onVirtualizationToggle?.(enabled);
  };

  return (
    <div className='w-full h-full bg-background flex flex-col'>
      {/* Header */}
      <div className='flex items-center gap-4 p-6 border-b'>
        <Button variant='ghost' size='sm' onClick={onBack} className='gap-2'>
          <ArrowLeft className='w-4 h-4' />
          Back
        </Button>
        <div className='flex items-center gap-2'>
          <Settings className='w-5 h-5' />
          <h1 className='text-xl font-semibold'>Configuration</h1>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 p-6 space-y-6 overflow-auto'>
        {/* Canvas Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Paintbrush className='w-4 h-4' />
              Canvas Settings
            </CardTitle>
            <CardDescription>
              Configure how connections and components are displayed on the canvas
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Connection Style */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Connection Style</label>
              <Select value={localConnectionStyle} onValueChange={handleConnectionStyleChange}>
                <SelectTrigger className='w-48'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='straight'>Straight Lines</SelectItem>
                  <SelectItem value='curved'>Curved Lines</SelectItem>
                  <SelectItem value='stepped'>Stepped Lines</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>
                Choose how connections between components are drawn
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Performance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Zap className='w-4 h-4' />
              Performance Settings
            </CardTitle>
            <CardDescription>
              Optimize canvas performance for large diagrams
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Virtualization */}
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium'>Canvas Virtualization</label>
                <Switch
                  checked={localVirtualization}
                  onCheckedChange={handleVirtualizationToggle}
                />
              </div>
              {localVirtualization && virtualizationStats && (
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary' className='text-xs'>
                    {virtualizationStats.visibleComponents}/{virtualizationStats.totalComponents} visible
                  </Badge>
                </div>
              )}
              <p className='text-xs text-muted-foreground'>
                Improve performance by only rendering visible components. Recommended for diagrams with 100+ components.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Settings Placeholder */}
        <Card className='opacity-50'>
          <CardHeader>
            <CardTitle>Grid & Layout</CardTitle>
            <CardDescription>Grid settings and auto-layout options</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>Coming soon...</p>
          </CardContent>
        </Card>

        <Card className='opacity-50'>
          <CardHeader>
            <CardTitle>Themes & Appearance</CardTitle>
            <CardDescription>Customize colors and visual themes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>Coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}