import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { performanceMonitor } from '@/shared/utils/performanceMonitor';
import {
  useCanvasStore,
  type PathStyle,
} from '@/stores/canvasStore';
import type { Connection } from '@/shared/contracts';
import { useVirtualizationConfig } from '@/packages/canvas/hooks/useCanvasConfig';

interface CanvasSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONNECTION_TYPE_OPTIONS: Connection['type'][] = ['data', 'control', 'sync', 'async'];
const PATH_STYLE_OPTIONS: PathStyle[] = ['straight', 'curved', 'stepped'];

export function CanvasSettingsPanel({ isOpen, onClose }: CanvasSettingsPanelProps) {
  const {
    gridEnabled,
    snapToGrid,
    gridSpacing,
    showMinimap,
    animationsEnabled,
    animationSpeed,
    smartRouting,
    bundleConnections,
    defaultConnectionType,
    defaultPathStyle,
    toggleGrid,
    toggleSnapToGrid,
    setGridSpacing,
    toggleMinimap,
    toggleAnimations,
    setAnimationSpeed,
    toggleSmartRouting,
    toggleConnectionBundling,
    setDefaultConnectionType,
    setDefaultPathStyle,
  } = useCanvasStore(
    state => ({
      gridEnabled: state.gridEnabled,
      snapToGrid: state.snapToGrid,
      gridSpacing: state.gridSpacing,
      showMinimap: state.showMinimap,
      animationsEnabled: state.animationsEnabled,
      animationSpeed: state.animationSpeed,
      smartRouting: state.smartRouting,
      bundleConnections: state.bundleConnections,
      defaultConnectionType: state.defaultConnectionType,
      defaultPathStyle: state.defaultPathStyle,
      toggleGrid: state.toggleGrid,
      toggleSnapToGrid: state.toggleSnapToGrid,
      setGridSpacing: state.setGridSpacing,
      toggleMinimap: state.toggleMinimap,
      toggleAnimations: state.toggleAnimations,
      setAnimationSpeed: state.setAnimationSpeed,
      toggleSmartRouting: state.toggleSmartRouting,
      toggleConnectionBundling: state.toggleConnectionBundling,
      setDefaultConnectionType: state.setDefaultConnectionType,
      setDefaultPathStyle: state.setDefaultPathStyle,
    }),
    shallow
  );

  // Use the advanced canvas configuration hook for virtualization settings
  const {
    virtualization,
    updateVirtualization,
    isEnabled,
    nodeThreshold,
    edgeThreshold,
    buffer,
    overscanPx,
    onlyRenderVisibleElements,
  } = useVirtualizationConfig();

  const metrics = useMemo(() => {
    try {
      return performanceMonitor.getSystemMetrics();
    } catch (error) {
      console.warn('[CanvasSettingsPanel] Failed to resolve performance metrics', error);
      return null;
    }
  }, [animationsEnabled, smartRouting, bundleConnections, gridEnabled]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={open => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent side='right' className='w-[380px] sm:w-[420px] overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>Canvas Settings</SheetTitle>
          <SheetDescription>
            Fine-tune grid, connection, and animation preferences for a personalized canvas experience.
          </SheetDescription>
        </SheetHeader>

        <div className='mt-6 space-y-8'>
          <section className='space-y-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h3 className='text-sm font-medium text-slate-900'>Grid & snapping</h3>
                <p className='text-sm text-slate-500'>Control alignment guides and spacing for precise layouts.</p>
              </div>
            </div>

            <div className='flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2'>
              <div>
                <Label htmlFor='canvas-grid-toggle' className='text-sm font-medium text-slate-800'>Show canvas grid</Label>
                <p className='text-xs text-slate-500'>Display grid background to guide component placement.</p>
              </div>
              <Switch id='canvas-grid-toggle' checked={gridEnabled} onCheckedChange={() => toggleGrid()} aria-label='Toggle canvas grid' />
            </div>

            <div className='flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2'>
              <div>
                <Label htmlFor='snap-to-grid-toggle' className='text-sm font-medium text-slate-800'>Snap to grid</Label>
                <p className='text-xs text-slate-500'>Automatically align components to the grid spacing.</p>
              </div>
              <Switch
                id='snap-to-grid-toggle'
                checked={snapToGrid}
                onCheckedChange={() => toggleSnapToGrid()}
                aria-label='Toggle snap to grid'
              />
            </div>

            <div className='rounded-lg border border-slate-200 px-3 py-3'>
              <div className='flex items-center justify-between gap-4'>
                <Label htmlFor='grid-spacing-slider' className='text-sm font-medium text-slate-800'>Grid spacing</Label>
                <Badge variant='outline' className='font-mono text-xs'>{gridSpacing}px</Badge>
              </div>
              <Slider
                id='grid-spacing-slider'
                value={[gridSpacing]}
                onValueChange={([value]) => setGridSpacing(value)}
                min={10}
                max={100}
                step={5}
                className='mt-4'
                aria-label='Adjust grid spacing'
              />
            </div>
          </section>

          <section className='space-y-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h3 className='text-sm font-medium text-slate-900'>Connections</h3>
                <p className='text-sm text-slate-500'>Adjust default pathing and routing for new connections.</p>
              </div>
            </div>

            <div className='grid gap-3 rounded-lg border border-slate-200 px-3 py-3'>
              <Label htmlFor='connection-type-select' className='text-sm font-medium text-slate-800'>Default connection type</Label>
              <Select
                value={defaultConnectionType}
                onValueChange={value => setDefaultConnectionType(value as Connection['type'])}
              >
                <SelectTrigger id='connection-type-select' aria-label='Choose default connection type'>
                  <SelectValue placeholder='Select a connection type' />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-3 rounded-lg border border-slate-200 px-3 py-3'>
              <Label htmlFor='path-style-select' className='text-sm font-medium text-slate-800'>Default path style</Label>
              <Select value={defaultPathStyle} onValueChange={value => setDefaultPathStyle(value as PathStyle)}>
                <SelectTrigger id='path-style-select' aria-label='Choose connection path style'>
                  <SelectValue placeholder='Select a path style' />
                </SelectTrigger>
                <SelectContent>
                  {PATH_STYLE_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-3'>
              <div className='flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2'>
                <div>
                  <Label htmlFor='smart-routing-toggle' className='text-sm font-medium text-slate-800'>Smart routing</Label>
                  <p className='text-xs text-slate-500'>Route lines around nodes to keep diagrams readable.</p>
                </div>
                <Switch
                  id='smart-routing-toggle'
                  checked={smartRouting}
                  onCheckedChange={() => toggleSmartRouting()}
                  aria-label='Toggle smart routing'
                />
              </div>

              <div className='flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2'>
                <div>
                  <Label htmlFor='bundle-connections-toggle' className='text-sm font-medium text-slate-800'>Bundle parallel connections</Label>
                  <p className='text-xs text-slate-500'>Group similar connections to reduce visual clutter.</p>
                </div>
                <Switch
                  id='bundle-connections-toggle'
                  checked={bundleConnections}
                  onCheckedChange={() => toggleConnectionBundling()}
                  aria-label='Toggle connection bundling'
                />
              </div>
            </div>
          </section>

          <section className='space-y-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h3 className='text-sm font-medium text-slate-900'>Animations</h3>
                <p className='text-sm text-slate-500'>Balance motion and performance for your workflow.</p>
              </div>
            </div>

            <div className='flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2'>
              <div>
                <Label htmlFor='animations-toggle' className='text-sm font-medium text-slate-800'>Enable canvas animations</Label>
                <p className='text-xs text-slate-500'>Smooth transitions for drag, zoom, and selection.</p>
              </div>
              <Switch
                id='animations-toggle'
                checked={animationsEnabled}
                onCheckedChange={() => toggleAnimations()}
                aria-label='Toggle canvas animations'
              />
            </div>

            <div className='rounded-lg border border-slate-200 px-3 py-3'>
              <div className='flex items-center justify-between gap-4'>
                <Label htmlFor='animation-speed-slider' className='text-sm font-medium text-slate-800'>Animation speed</Label>
                <Badge variant='outline' className='font-mono text-xs'>×{animationSpeed.toFixed(1)}</Badge>
              </div>
              <Slider
                id='animation-speed-slider'
                value={[animationSpeed]}
                onValueChange={([value]) => setAnimationSpeed(value)}
                min={0.5}
                max={2}
                step={0.1}
                className='mt-4'
                aria-label='Adjust animation speed'
              />
            </div>

            <div className='flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2'>
              <div>
                <Label htmlFor='minimap-toggle' className='text-sm font-medium text-slate-800'>Show minimap</Label>
                <p className='text-xs text-slate-500'>Display a miniature view to navigate complex diagrams.</p>
              </div>
              <Switch
                id='minimap-toggle'
                checked={showMinimap}
                onCheckedChange={() => toggleMinimap()}
                aria-label='Toggle minimap visibility'
              />
            </div>
          </section>

          <section className='space-y-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h3 className='text-sm font-medium text-slate-900'>Virtualization</h3>
                <p className='text-sm text-slate-500'>Optimize rendering performance for large diagrams.</p>
              </div>
            </div>

            <div className='flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2'>
              <div>
                <Label htmlFor='virtualization-toggle' className='text-sm font-medium text-slate-800'>Enable virtualization</Label>
                <p className='text-xs text-slate-500'>Only render visible components and connections to improve performance.</p>
              </div>
              <Switch
                id='virtualization-toggle'
                checked={isEnabled}
                onCheckedChange={(enabled) => updateVirtualization({ enabled })}
                aria-label='Toggle virtualization'
              />
            </div>

            <div className='rounded-lg border border-slate-200 px-3 py-3'>
              <div className='flex items-center justify-between gap-4'>
                <Label htmlFor='node-threshold-slider' className='text-sm font-medium text-slate-800'>Node threshold</Label>
                <Badge variant='outline' className='font-mono text-xs'>{nodeThreshold}</Badge>
              </div>
              <Slider
                id='node-threshold-slider'
                value={[nodeThreshold]}
                onValueChange={([value]) => updateVirtualization({ nodeThreshold: value })}
                min={100}
                max={2000}
                step={50}
                className='mt-4'
                aria-label='Adjust node virtualization threshold'
              />
              <p className='text-xs text-slate-500 mt-2'>Enable virtualization when node count exceeds this threshold.</p>
            </div>

            <div className='rounded-lg border border-slate-200 px-3 py-3'>
              <div className='flex items-center justify-between gap-4'>
                <Label htmlFor='edge-threshold-slider' className='text-sm font-medium text-slate-800'>Edge threshold</Label>
                <Badge variant='outline' className='font-mono text-xs'>{edgeThreshold}</Badge>
              </div>
              <Slider
                id='edge-threshold-slider'
                value={[edgeThreshold]}
                onValueChange={([value]) => updateVirtualization({ edgeThreshold: value })}
                min={200}
                max={5000}
                step={100}
                className='mt-4'
                aria-label='Adjust edge virtualization threshold'
              />
              <p className='text-xs text-slate-500 mt-2'>Enable virtualization when edge count exceeds this threshold.</p>
            </div>

            <div className='rounded-lg border border-slate-200 px-3 py-3'>
              <div className='flex items-center justify-between gap-4'>
                <Label htmlFor='buffer-slider' className='text-sm font-medium text-slate-800'>Buffer zone</Label>
                <Badge variant='outline' className='font-mono text-xs'>{buffer}px</Badge>
              </div>
              <Slider
                id='buffer-slider'
                value={[buffer]}
                onValueChange={([value]) => updateVirtualization({ buffer: value })}
                min={50}
                max={500}
                step={25}
                className='mt-4'
                aria-label='Adjust virtualization buffer zone'
              />
              <p className='text-xs text-slate-500 mt-2'>Extra area around viewport to render for smooth scrolling.</p>
            </div>

            <div className='rounded-lg border border-slate-200 px-3 py-3'>
              <div className='flex items-center justify-between gap-4'>
                <Label htmlFor='overscan-slider' className='text-sm font-medium text-slate-800'>Overscan</Label>
                <Badge variant='outline' className='font-mono text-xs'>{overscanPx}px</Badge>
              </div>
              <Slider
                id='overscan-slider'
                value={[overscanPx]}
                onValueChange={([value]) => updateVirtualization({ overscanPx: value })}
                min={0}
                max={200}
                step={10}
                className='mt-4'
                aria-label='Adjust virtualization overscan'
              />
              <p className='text-xs text-slate-500 mt-2'>Additional pixels to render beyond viewport for smoother scrolling.</p>
            </div>

            <div className='flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2'>
              <div>
                <Label htmlFor='visible-only-toggle' className='text-sm font-medium text-slate-800'>Render visible elements only</Label>
                <p className='text-xs text-slate-500'>Only render elements currently visible in the viewport.</p>
              </div>
              <Switch
                id='visible-only-toggle'
                checked={onlyRenderVisibleElements}
                onCheckedChange={(enabled) => updateVirtualization({ onlyRenderVisibleElements: enabled })}
                aria-label='Toggle visible elements only rendering'
              />
            </div>
          </section>

          <section className='space-y-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <h3 className='text-sm font-medium text-slate-900'>Performance Metrics</h3>
                <p className='text-sm text-slate-500'>Monitor canvas performance and identify bottlenecks.</p>
              </div>
            </div>

            {metrics ? (
              <div className='grid gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700'>
                <div className='flex items-center justify-between'>
                  <span>Total components</span>
                  <span className='font-medium'>{metrics.totalComponents}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Slow components</span>
                  <span className='font-medium'>{metrics.slowComponents}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Unstable callbacks</span>
                  <span className='font-medium'>{metrics.unstableCallbacks}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span>Overall score</span>
                  <Badge
                    variant='outline'
                    className={
                      metrics.overallScore > 80
                        ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                        : metrics.overallScore > 60
                          ? 'border-amber-500 text-amber-700 bg-amber-50'
                          : 'border-rose-500 text-rose-700 bg-rose-50'
                    }
                  >
                    {metrics.overallScore}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className='text-sm text-slate-500'>Performance metrics are unavailable in this environment.</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

CanvasSettingsPanel.displayName = 'CanvasSettingsPanel';
