import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ui/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ui/components/ui/select';
import { Switch } from '@ui/components/ui/switch';
import { Button } from '@ui/components/ui/button';
import { Badge } from '@ui/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/components/ui/tabs';
import { Progress } from '@ui/components/ui/progress';
import { Slider } from '@ui/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@ui/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ui/components/ui/tooltip';
import {
  Activity,
  ArrowLeft,
  Clock,
  Loader2,
  Mic,
  Paintbrush,
  RefreshCcw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';

import { defaultSettings, loadSettings, saveSettings } from '@/modules/settings';

type SettingsState = typeof defaultSettings;
type TabKey = 'overview' | 'audio' | 'appearance' | 'performance' | 'privacy';

const STORAGE_KEY = 'archicomm_settings';

// Clone helpers keep defaults immutable across interactions.
const cloneSettings = (settings: SettingsState): SettingsState => ({
  ...settings,
  appearance: { ...settings.appearance },
  accessibility: { ...settings.accessibility },
  workflow: { ...settings.workflow },
  audio: { ...settings.audio },
  telemetry: { ...settings.telemetry },
  onboarding: {
    ...settings.onboarding,
    completedFlows: [...(settings.onboarding?.completedFlows ?? [])],
  },
  shortcuts: {
    ...settings.shortcuts,
    customShortcuts: { ...(settings.shortcuts?.customShortcuts ?? {}) },
  },
});

const DEFAULT_STATE: SettingsState = cloneSettings(defaultSettings as SettingsState);

const getInitialSettings = (): SettingsState => {
  if (typeof window === 'undefined') {
    return cloneSettings(DEFAULT_STATE);
  }

  try {
    return cloneSettings(loadSettings());
  } catch (error) {
    console.warn('Falling back to default settings for ConfigPage:', error);
    return cloneSettings(DEFAULT_STATE);
  }
};

const getStoredTimestamp = (): number | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed.lastUpdated === 'number' ? parsed.lastUpdated : null;
  } catch {
    return null;
  }
};

const formatRelativeTime = (timestamp: number | null): string => {
  if (!timestamp) return 'Not saved yet';

  const delta = Date.now() - timestamp;
  if (delta < 10_000) return 'moments ago';
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return 'less than a minute ago';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

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
  const [settings, setSettings] = useState<SettingsState>(() => getInitialSettings());
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => getStoredTimestamp());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [localConnectionStyle, setLocalConnectionStyle] = useState(connectionStyle);
  const [localVirtualization, setLocalVirtualization] = useState(virtualizationEnabled);

  useEffect(() => {
    setLocalConnectionStyle(connectionStyle);
  }, [connectionStyle]);

  useEffect(() => {
    setLocalVirtualization(virtualizationEnabled);
  }, [virtualizationEnabled]);

  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = window.setTimeout(() => setSaveStatus('idle'), 1800);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [saveStatus]);

  const persist = (next: SettingsState) => {
    setSaveStatus('saving');
    try {
      saveSettings(next);
      setLastSavedAt(Date.now());
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
    }
  };

  const updateSetting = <Section extends keyof SettingsState, Key extends keyof SettingsState[Section]>(
    section: Section,
    key: Key,
    value: SettingsState[Section][Key]
  ) => {
    setSettings(prev => {
      const nextSection = { ...prev[section], [key]: value } as SettingsState[Section];
      const next = { ...prev, [section]: nextSection } as SettingsState;
      persist(next);
      return next;
    });
  };

  const applyPreset = (mutator: (prev: SettingsState) => SettingsState) => {
    setSettings(prev => {
      const next = cloneSettings(mutator(prev));
      persist(next);
      return next;
    });
  };

  const handleResetToDefaults = () => {
    const defaults = cloneSettings(DEFAULT_STATE);
    setSettings(defaults);
    persist(defaults);
    setLocalConnectionStyle('curved');
    onConnectionStyleChange?.('curved');

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('settings:appearance-updated', {
          detail: { canvasTheme: defaults.appearance.canvasTheme },
        })
      );
    }
  };

  const handleSaveNow = () => persist(cloneSettings(settings));

  const handleVirtualizationToggle = (enabled: boolean) => {
    setLocalVirtualization(enabled);
    onVirtualizationToggle?.(enabled);
  };

  const handleConnectionStyleChange = (style: 'straight' | 'curved' | 'stepped') => {
    setLocalConnectionStyle(style);
    onConnectionStyleChange?.(style);
  };

  const handleCanvasThemeChange = (theme: 'serious' | 'playful') => {
    setSettings(prev => {
      const next = {
        ...prev,
        appearance: { ...prev.appearance, canvasTheme: theme },
      } as SettingsState;
      persist(next);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('settings:appearance-updated', { detail: { canvasTheme: theme } })
        );
      }
      return next;
    });
  };

  const handleTelemetryToggle = (checked: boolean) => {
    setSettings(prev => {
      const next = {
        ...prev,
        telemetry: { ...prev.telemetry, enabled: checked },
        workflow: { ...prev.workflow, trackUsageAnalytics: checked },
      } as SettingsState;
      persist(next);
      return next;
    });
  };

  const focusModePreset = (prev: SettingsState): SettingsState =>
    ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        reducedMotion: true,
        highContrast: true,
        screenReaderOptimized: true,
      },
      workflow: {
        ...prev.workflow,
        showWorkflowOptimizations: false,
        trackUsageAnalytics: false,
      },
      telemetry: {
        ...prev.telemetry,
        enabled: false,
        errorReporting: false,
        performanceMetrics: false,
      },
    }) as SettingsState;

  const performancePreset = (prev: SettingsState): SettingsState =>
    ({
      ...prev,
      workflow: {
        ...prev.workflow,
        autoSave: true,
        autoSaveInterval: Math.min(prev.workflow.autoSaveInterval, 2000),
        showWorkflowOptimizations: true,
      },
      audio: {
        ...prev.audio,
        quality: prev.audio.quality === 'low' ? 'medium' : prev.audio.quality,
      },
      telemetry: {
        ...prev.telemetry,
        enabled: true,
        performanceMetrics: true,
      },
    }) as SettingsState;

  const creatorPreset = (prev: SettingsState): SettingsState =>
    ({
      ...prev,
      audio: {
        ...prev.audio,
        realtimeTranscription: true,
        preferredRecordingEngine: prev.audio.preferredRecordingEngine,
        preferredTranscriptionEngine: prev.audio.preferredTranscriptionEngine,
        quality: 'high',
      },
      workflow: {
        ...prev.workflow,
        autoSave: true,
        autoSaveInterval: Math.min(prev.workflow.autoSaveInterval, 2500),
        showWorkflowOptimizations: true,
      },
      shortcuts: {
        ...prev.shortcuts,
        showShortcutHints: true,
      },
    }) as SettingsState;

  const autoSaveSeconds = Math.max(1, Math.round(settings.workflow.autoSaveInterval / 1000));
  const virtualizationPercent =
    virtualizationStats && virtualizationStats.totalComponents > 0
      ? Math.min(
          100,
          Math.round((virtualizationStats.visibleComponents / virtualizationStats.totalComponents) * 100)
        )
      : 100;

  const saveStatusLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'saved'
        ? 'Saved just now'
        : saveStatus === 'error'
          ? 'Save failed'
          : `Auto-save ${formatRelativeTime(lastSavedAt)}`;

  return (
    <div className='flex h-full flex-col bg-muted/10'>
      <header className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75'>
        <div className='flex flex-wrap items-center justify-between gap-3 px-6 py-4'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='sm' onClick={onBack} className='gap-2'>
              <ArrowLeft className='h-4 w-4' />
              Back
            </Button>
            <div className='space-y-1'>
              <div className='flex items-center gap-2'>
                <Settings className='h-5 w-5 text-muted-foreground' />
                <h1 className='text-xl font-semibold'>Configuration</h1>
              </div>
              <p className='text-sm text-muted-foreground'>Tune ArchiComm to match how you work best.</p>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant={saveStatus === 'error' ? 'destructive' : 'secondary'} className='uppercase tracking-wide'>
              {saveStatusLabel}
            </Badge>
            <Button variant='outline' size='sm' onClick={handleResetToDefaults} className='gap-2'>
              <RefreshCcw className='h-4 w-4' />
              Reset defaults
            </Button>
            <Button onClick={handleSaveNow} className='gap-2' disabled={saveStatus === 'saving'}>
              {saveStatus === 'saving' ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}
              Save now
            </Button>
          </div>
        </div>
      </header>

      <main className='flex-1 overflow-y-auto px-6 py-6'>
        <div className='space-y-6'>
          <Card className='border-dashed bg-muted/40'>
            <CardContent className='flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  <Sparkles className='h-4 w-4' />
                  Experience starters
                </div>
                <h2 className='text-lg font-semibold'>Pick a launch posture</h2>
                <p className='text-sm text-muted-foreground'>
                  Quick presets give you a head start. You can still fine-tune every detail below.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button variant='secondary' size='sm' className='gap-2' onClick={() => applyPreset(focusModePreset)}>
                  Focus mode
                </Button>
                <Button variant='secondary' size='sm' className='gap-2' onClick={() => applyPreset(performancePreset)}>
                  Performance
                </Button>
                <Button variant='outline' size='sm' className='gap-2' onClick={() => applyPreset(creatorPreset)}>
                  Creator
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={value => setActiveTab(value as TabKey)} className='w-full'>
            <TabsList className='flex h-auto flex-wrap items-center justify-start gap-1 rounded-xl border bg-background/60 p-1'>
              <TabsTrigger value='overview' className='gap-2'>
                <Activity className='h-4 w-4' />
                Overview
              </TabsTrigger>
              <TabsTrigger value='audio' className='gap-2'>
                <Mic className='h-4 w-4' />
                Audio
              </TabsTrigger>
              <TabsTrigger value='appearance' className='gap-2'>
                <Paintbrush className='h-4 w-4' />
                Appearance
              </TabsTrigger>
              <TabsTrigger value='performance' className='gap-2'>
                <Zap className='h-4 w-4' />
                Performance
              </TabsTrigger>
              <TabsTrigger value='privacy' className='gap-2'>
                <Shield className='h-4 w-4' />
                Privacy
              </TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='mt-6 space-y-6'>
              <Card>
                <CardHeader className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                  <div>
                    <CardTitle>System snapshot</CardTitle>
                    <CardDescription>At-a-glance health of the canvas and automation helpers.</CardDescription>
                  </div>
                  <Badge variant={localVirtualization ? 'default' : 'outline'} className='gap-1'>
                    {localVirtualization ? 'Performance boosted' : 'Standard rendering'}
                  </Badge>
                </CardHeader>
                <CardContent className='grid gap-6 lg:grid-cols-2'>
                  <div className='space-y-4 rounded-lg border bg-muted/40 p-4'>
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <p className='text-sm font-semibold'>Canvas virtualization</p>
                        <p className='text-xs text-muted-foreground'>
                          Only render visible elements to keep sprawling diagrams snappy.
                        </p>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Switch checked={localVirtualization} onCheckedChange={handleVirtualizationToggle} />
                        </TooltipTrigger>
                        <TooltipContent side='left'>Requires a canvas reload to affect existing sessions.</TooltipContent>
                      </Tooltip>
                    </div>
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between text-xs text-muted-foreground'>
                        <span>In view right now</span>
                        <span>
                          {virtualizationStats
                            ? `${virtualizationStats.visibleComponents}/${virtualizationStats.totalComponents}`
                            : 'Pending usage'}
                        </span>
                      </div>
                      <Progress value={virtualizationPercent} />
                    </div>
                  </div>

                  <div className='space-y-4 rounded-lg border bg-muted/40 p-4'>
                    <div className='flex items-start justify-between gap-4'>
                      <div>
                        <p className='text-sm font-semibold'>Auto-save cadence</p>
                        <p className='text-xs text-muted-foreground'>
                          Protect work-in-progress without breaking flow.
                        </p>
                      </div>
                      <Switch
                        checked={settings.workflow.autoSave}
                        onCheckedChange={checked => updateSetting('workflow', 'autoSave', checked)}
                      />
                    </div>
                    <div className='rounded-md border bg-background/60 p-3'>
                      <div className='flex items-center gap-2 text-sm font-medium'>
                        <Clock className='h-4 w-4' />
                        {settings.workflow.autoSave ? `Every ${autoSaveSeconds}s` : 'Paused'}
                      </div>
                      <div className='mt-3 space-y-2'>
                        <Slider
                          value={[autoSaveSeconds]}
                          min={1}
                          max={10}
                          step={1}
                          disabled={!settings.workflow.autoSave}
                          onValueChange={([value]) => updateSetting('workflow', 'autoSaveInterval', value * 1000)}
                        />
                        <p className='text-xs text-muted-foreground'>
                          {settings.workflow.autoSave
                            ? `Files sync every ${autoSaveSeconds} second${autoSaveSeconds === 1 ? '' : 's'}.`
                            : 'Turn auto-save back on to control the interval.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <AlertTitle>Pro tip</AlertTitle>
                <AlertDescription>
                  Pair virtualization with telemetry performance metrics to capture slow frames when large projects grow.
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value='audio' className='mt-6 space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Audio ingest</CardTitle>
                  <CardDescription>
                    Choose recording and transcription engines best suited to your hardware.
                  </CardDescription>
                </CardHeader>
                <CardContent className='grid gap-6 lg:grid-cols-2'>
                  <div className='space-y-3'>
                    <label className='text-sm font-medium'>Recording engine</label>
                    <Select
                      value={settings.audio.preferredRecordingEngine}
                      onValueChange={value =>
                        updateSetting(
                          'audio',
                          'preferredRecordingEngine',
                          value as (typeof settings.audio)['preferredRecordingEngine']
                        )
                      }
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select recording engine' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='auto'>Auto (smart fallback)</SelectItem>
                        <SelectItem value='media-recorder'>MediaRecorder</SelectItem>
                        <SelectItem value='recordrtc'>RecordRTC</SelectItem>
                        <SelectItem value='native'>Native desktop</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className='text-xs text-muted-foreground'>
                      Auto picks the most reliable path per platform. Override it if you notice dropouts.
                    </p>
                  </div>

                  <div className='space-y-3'>
                    <label className='text-sm font-medium'>Transcription engine</label>
                    <Select
                      value={settings.audio.preferredTranscriptionEngine}
                      onValueChange={value =>
                        updateSetting(
                          'audio',
                          'preferredTranscriptionEngine',
                          value as (typeof settings.audio)['preferredTranscriptionEngine']
                        )
                      }
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select transcription engine' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='auto'>Auto (balanced)</SelectItem>
                        <SelectItem value='whisper-rs'>Whisper-rs</SelectItem>
                        <SelectItem value='whisper-wasm'>Whisper WASM</SelectItem>
                        <SelectItem value='web-speech'>Web Speech API</SelectItem>
                        <SelectItem value='transformers'>Transformers.js</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className='text-xs text-muted-foreground'>
                      Pick Whisper for accuracy, Web Speech for speed, or keep auto to adapt on the fly.
                    </p>
                  </div>

                  <div className='space-y-4 rounded-lg border bg-muted/40 p-4 lg:col-span-2'>
                    <div className='flex flex-wrap items-start justify-between gap-4'>
                      <div>
                        <p className='text-sm font-semibold'>Realtime transcript</p>
                        <p className='text-xs text-muted-foreground'>
                          Surface captions while recording so collaborators can follow along.
                        </p>
                      </div>
                      <Switch
                        checked={settings.audio.realtimeTranscription}
                        onCheckedChange={checked => updateSetting('audio', 'realtimeTranscription', checked)}
                      />
                    </div>

                    <div className='space-y-3'>
                      <label className='text-sm font-medium'>Recording quality</label>
                      <Select
                        value={settings.audio.quality}
                        onValueChange={value =>
                          updateSetting('audio', 'quality', value as (typeof settings.audio)['quality'])
                        }
                      >
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Select audio quality' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='low'>Low – minimal bandwidth</SelectItem>
                          <SelectItem value='medium'>Medium – balanced</SelectItem>
                          <SelectItem value='high'>High – studio grade</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className='text-xs text-muted-foreground'>
                        Higher quality increases upload size but can improve downstream transcription fidelity.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='appearance' className='mt-6 space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Switch between calm focus and playful exploration aesthetics.</CardDescription>
                </CardHeader>
                <CardContent className='grid gap-6 lg:grid-cols-2'>
                  <div className='space-y-3'>
                    <label className='text-sm font-medium'>Canvas theme</label>
                    <Select
                      value={settings.appearance.canvasTheme}
                      onValueChange={value => handleCanvasThemeChange(value as 'serious' | 'playful')}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Select theme' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='serious'>Serious (minimal, contrasty)</SelectItem>
                        <SelectItem value='playful'>Playful (colorful, animated)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className='text-xs text-muted-foreground'>
                      Theme updates apply instantly so you can preview the vibe before closing this panel.
                    </p>
                  </div>

                  <div className='space-y-3'>
                    <label className='text-sm font-medium'>Connection style</label>
                    <Select
                      value={localConnectionStyle}
                      onValueChange={value => handleConnectionStyleChange(value as 'straight' | 'curved' | 'stepped')}
                    >
                      <SelectTrigger className='w-full'>
                        <SelectValue placeholder='Choose connection style' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='straight'>Straight lines</SelectItem>
                        <SelectItem value='curved'>Curved lines</SelectItem>
                        <SelectItem value='stepped'>Stepped lines</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className='text-xs text-muted-foreground'>
                      Pick a line treatment that mirrors how your systems flow—curves feel organic, stepped looks technical.
                    </p>
                  </div>

                  <div className='lg:col-span-2'>
                    <ConnectionPreview style={localConnectionStyle} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='performance' className='mt-6 space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Performance guardrails</CardTitle>
                  <CardDescription>Keep sprawling workspaces responsive as teams scale their systems.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4'>
                    <div>
                      <p className='text-sm font-semibold'>Workflow optimization hints</p>
                      <p className='text-xs text-muted-foreground'>
                        Surface in-context nudges when ArchiComm spots repetitive behaviour.
                      </p>
                    </div>
                    <Switch
                      checked={settings.workflow.showWorkflowOptimizations}
                      onCheckedChange={checked => updateSetting('workflow', 'showWorkflowOptimizations', checked)}
                    />
                  </div>

                  <div className='flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4'>
                    <div>
                      <p className='text-sm font-semibold'>Collect performance metrics</p>
                      <p className='text-xs text-muted-foreground'>
                        Capture render time and memory stats to diagnose slowdowns across large canvases.
                      </p>
                    </div>
                    <Switch
                      checked={settings.telemetry.performanceMetrics}
                      onCheckedChange={checked => updateSetting('telemetry', 'performanceMetrics', checked)}
                    />
                  </div>

                  <Alert>
                    <AlertTitle>Heads up</AlertTitle>
                    <AlertDescription>
                      Performance metrics piggyback on telemetry. Make sure analytics remain enabled in the privacy tab.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='privacy' className='mt-6 space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Telemetry & privacy</CardTitle>
                  <CardDescription>Choose what anonymous diagnostics flow back to the team.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4'>
                    <div>
                      <p className='text-sm font-semibold'>Enable telemetry</p>
                      <p className='text-xs text-muted-foreground'>Aggregated usage analytics power roadmap priorities.</p>
                    </div>
                    <Switch checked={settings.telemetry.enabled} onCheckedChange={handleTelemetryToggle} />
                  </div>

                  <div className='flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4'>
                    <div>
                      <p className='text-sm font-semibold'>Send error reports</p>
                      <p className='text-xs text-muted-foreground'>Crash details help us fix issues before they hit production.</p>
                    </div>
                    <Switch
                      checked={settings.telemetry.errorReporting}
                      onCheckedChange={checked => updateSetting('telemetry', 'errorReporting', checked)}
                    />
                  </div>

                  <div className='flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-muted/40 p-4'>
                    <div>
                      <p className='text-sm font-semibold'>Track usage analytics</p>
                      <p className='text-xs text-muted-foreground'>Requires telemetry to be enabled.</p>
                    </div>
                    <Switch
                      checked={settings.workflow.trackUsageAnalytics}
                      disabled={!settings.telemetry.enabled}
                      onCheckedChange={checked => updateSetting('workflow', 'trackUsageAnalytics', checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

const ConnectionPreview = ({ style }: { style: 'straight' | 'curved' | 'stepped' }) => {
  const path =
    style === 'straight'
      ? 'M12 52 L84 12'
      : style === 'curved'
        ? 'M12 52 C36 8, 60 96, 84 24'
        : 'M12 52 H48 V20 H84';

  return (
    <div className='rounded-xl border bg-gradient-to-br from-background to-muted/40 p-4'>
      <p className='mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Canvas preview</p>
      <svg viewBox='0 0 96 64' className='h-20 w-full text-primary/80'>
        <defs>
          <linearGradient id='connectionGradient' x1='0%' x2='100%'>
            <stop offset='0%' stopColor='currentColor' stopOpacity='0.3' />
            <stop offset='100%' stopColor='currentColor' stopOpacity='0.7' />
          </linearGradient>
        </defs>
        <circle cx='12' cy='52' r='6' fill='hsl(var(--muted-foreground))' />
        <circle cx='84' cy='24' r='6' fill='hsl(var(--primary))' />
        <path d={path} fill='none' stroke='url(#connectionGradient)' strokeWidth='4' strokeLinecap='round' />
      </svg>
    </div>
  );
};
