// src/components/ConfigPage.tsx
// Configuration page for canvas and application settings
// Houses controls that were moved from the canvas for cleaner interface
// RELEVANT FILES: AppContainer.tsx, ReactFlowCanvas.tsx, CommandPalette.tsx, DesignCanvas.tsx

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Settings, Paintbrush, Zap, Save, Mic, Shield, Monitor } from 'lucide-react';
import { loadSettings, saveSettings } from '@/modules/settings';

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
  // Persisted settings state
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [audioSettings, setAudioSettings] = useState({
    preferredRecordingEngine: 'auto',
    preferredTranscriptionEngine: 'auto',
    realtimeTranscription: false,
    quality: 'medium',
  });
  const [telemetrySettings, setTelemetrySettings] = useState({
    enabled: true,
    errorReporting: true,
    performanceMetrics: true,
  });

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const s = loadSettings();
      setAudioSettings({ ...s.audio });
      setTelemetrySettings({ ...s.telemetry });
      setSettingsLoaded(true);
    } catch (e) {
      console.warn('Failed to load settings for ConfigPage:', e);
    }
  }, []);

  const persist = (next: any) => {
    try {
      const s = loadSettings();
      saveSettings({ ...(s as any), ...next });
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
  };

  const handleConnectionStyleChange = (style: 'straight' | 'curved' | 'stepped') => {
    setLocalConnectionStyle(style);
    onConnectionStyleChange?.(style);
  };

  const handleVirtualizationToggle = (enabled: boolean) => {
    setLocalVirtualization(enabled);
    onVirtualizationToggle?.(enabled);
  };

  const handleSaveAll = () => {
    try {
      const currentSettings = loadSettings();
      saveSettings({
        ...currentSettings,
        audio: audioSettings,
        telemetry: telemetrySettings,
      });
      // You could add a toast notification here
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className='w-full h-full bg-background flex flex-col'>
      {/* Header */}
      <div className='flex items-center justify-between p-6 border-b'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='sm' onClick={onBack} className='gap-2'>
            <ArrowLeft className='w-4 h-4' />
            Back
          </Button>
          <div className='flex items-center gap-2'>
            <Settings className='w-5 h-5' />
            <h1 className='text-xl font-semibold'>Settings</h1>
          </div>
        </div>
        <Button onClick={handleSaveAll} className='gap-2'>
          <Save className='w-4 h-4' />
          Save All
        </Button>
      </div>

      {/* Content with Tabs */}
      <div className='flex-1 p-6'>
        <Tabs defaultValue='audio' className='w-full h-full'>
          <TabsList className='inline-flex h-10 items-center justify-start w-auto p-1'>
            <TabsTrigger value='audio' className='gap-2'>
              <Mic className='w-4 h-4' />
              Audio
            </TabsTrigger>
            <TabsTrigger value='appearance' className='gap-2'>
              <Paintbrush className='w-4 h-4' />
              Appearance
            </TabsTrigger>
            <TabsTrigger value='performance' className='gap-2'>
              <Zap className='w-4 h-4' />
              Performance
            </TabsTrigger>
            <TabsTrigger value='privacy' className='gap-2'>
              <Shield className='w-4 h-4' />
              Privacy
            </TabsTrigger>
          </TabsList>

          <div className='mt-6 overflow-auto'>
            <TabsContent value='audio' className='space-y-6'>
        {/* Audio Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Audio Settings</CardTitle>
            <CardDescription>Configure audio recording and transcription</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <div className='grid gap-2 max-w-md'>
              <label className='text-sm font-medium'>Recording Engine</label>
              <Select
                value={audioSettings.preferredRecordingEngine}
                onValueChange={(v) => {
                  const next = { ...audioSettings, preferredRecordingEngine: v } as any;
                  setAudioSettings(next);
                  persist({ audio: next });
                }}
              >
                <SelectTrigger className='w-60'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='auto'>Auto</SelectItem>
                  <SelectItem value='media-recorder'>MediaRecorder</SelectItem>
                  <SelectItem value='recordrtc'>RecordRTC</SelectItem>
                  <SelectItem value='native'>Native (desktop)</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>Prefered engine when multiple are available.</p>
            </div>

            <div className='grid gap-2 max-w-md'>
              <label className='text-sm font-medium'>Transcription Engine</label>
              <Select
                value={audioSettings.preferredTranscriptionEngine}
                onValueChange={(v) => {
                  const next = { ...audioSettings, preferredTranscriptionEngine: v } as any;
                  setAudioSettings(next);
                  persist({ audio: next });
                }}
              >
                <SelectTrigger className='w-60'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='auto'>Auto</SelectItem>
                  <SelectItem value='whisper-rs'>Whisper-rs</SelectItem>
                  <SelectItem value='whisper-wasm'>Whisper WASM</SelectItem>
                  <SelectItem value='web-speech'>Web Speech</SelectItem>
                  <SelectItem value='transformers'>Transformers.js</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>Choose transcription preference if supported.</p>
            </div>

            <div className='flex items-center justify-between max-w-md'>
              <div>
                <div className='text-sm font-medium'>Realtime Transcription</div>
                <div className='text-xs text-muted-foreground'>Show live transcript while recording</div>
              </div>
              <Switch
                checked={audioSettings.realtimeTranscription}
                onCheckedChange={(checked) => {
                  const next = { ...audioSettings, realtimeTranscription: checked };
                  setAudioSettings(next);
                  persist({ audio: next });
                }}
              />
            </div>

            <div className='grid gap-2 max-w-md'>
              <label className='text-sm font-medium'>Audio Quality</label>
              <Select
                value={audioSettings.quality}
                onValueChange={(v) => {
                  const next = { ...audioSettings, quality: v } as any;
                  setAudioSettings(next);
                  persist({ audio: next });
                }}
              >
                <SelectTrigger className='w-60'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>Low</SelectItem>
                  <SelectItem value='medium'>Medium</SelectItem>
                  <SelectItem value='high'>High</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>Impacts file size and transcription speed.</p>
            </div>
          </CardContent>
        </Card>

            </TabsContent>

            <TabsContent value='appearance' className='space-y-6'>
        {/* Themes & Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Themes & Appearance</CardTitle>
            <CardDescription>Customize canvas visuals</CardDescription>
          </CardHeader>
          <CardContent className='grid gap-4'>
            <div className='grid gap-2 max-w-md'>
              <label className='text-sm font-medium'>Canvas Theme</label>
              <Select
                value={loadSettings().appearance.canvasTheme}
                onValueChange={(v) => {
                  const s = loadSettings();
                  saveSettings({ ...s, appearance: { ...s.appearance, canvasTheme: v as 'serious' | 'playful' } });
                  window.dispatchEvent(new CustomEvent('settings:appearance-updated', { detail: { canvasTheme: v } }));
                }}
              >
                <SelectTrigger className='w-60'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='serious'>Serious</SelectItem>
                  <SelectItem value='playful'>Playful</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-xs text-muted-foreground'>Affects node accents and subtle animations.</p>
            </div>
          </CardContent>
        </Card>
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
            </TabsContent>

            <TabsContent value='performance' className='space-y-6'>

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

            </TabsContent>

            <TabsContent value='privacy' className='space-y-6'>
        {/* Telemetry Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Telemetry</CardTitle>
            <CardDescription>Control analytics and diagnostics collection</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between max-w-md'>
              <div>
                <div className='text-sm font-medium'>Enable Telemetry</div>
                <div className='text-xs text-muted-foreground'>Anonymous usage analytics</div>
              </div>
              <Switch
                checked={telemetrySettings.enabled}
                onCheckedChange={(checked) => {
                  const next = { ...telemetrySettings, enabled: checked };
                  setTelemetrySettings(next);
                  persist({ telemetry: next, workflow: { ...loadSettings().workflow, trackUsageAnalytics: checked } });
                }}
              />
            </div>

            <div className='flex items-center justify-between max-w-md'>
              <div>
                <div className='text-sm font-medium'>Error Reporting</div>
                <div className='text-xs text-muted-foreground'>Send crash and error diagnostics</div>
              </div>
              <Switch
                checked={telemetrySettings.errorReporting}
                onCheckedChange={(checked) => {
                  const next = { ...telemetrySettings, errorReporting: checked };
                  setTelemetrySettings(next);
                  persist({ telemetry: next });
                }}
              />
            </div>

            <div className='flex items-center justify-between max-w-md'>
              <div>
                <div className='text-sm font-medium'>Performance Metrics</div>
                <div className='text-xs text-muted-foreground'>Collect FPS and memory metrics</div>
              </div>
              <Switch
                checked={telemetrySettings.performanceMetrics}
                onCheckedChange={(checked) => {
                  const next = { ...telemetrySettings, performanceMetrics: checked };
                  setTelemetrySettings(next);
                  persist({ telemetry: next });
                }}
              />
            </div>
          </CardContent>
        </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
