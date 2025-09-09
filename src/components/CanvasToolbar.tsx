import React from 'react';
import { useCanvas } from '@/services/canvas/CanvasOrchestrator';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { SmartTooltip } from './ui/SmartTooltip';
import { Minimap } from './Minimap';
import type { ViewportInfo } from '../shared/contracts';
import { cx, designSystem, getElevation } from '../lib/design-system';
import { MousePointer2, Hand, ZoomIn, MessageSquare, Grid3x3, Map, HelpCircle } from 'lucide-react';
import type { ToolType, DesignComponent, Connection, Layer } from '../shared/contracts';

interface GridConfig {
  visible: boolean;
  spacing: number;
  snapToGrid: boolean;
}

interface CanvasToolbarProps {
  // Tool selection
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;

  // Grid controls
  gridConfig: GridConfig;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onGridSpacingChange: (value: string) => void;

  // Minimap controls
  showMinimap: boolean;
  onToggleMinimap: () => void;
  viewportInfo: ViewportInfo | null;
  canvasExtents: { width: number; height: number } | null;
  onMinimapPan: (x: number, y: number) => void;
  onMinimapZoom: (zoom: number, centerX?: number, centerY?: number) => void;

  // Data for minimap rendering
  components?: DesignComponent[];
  connections?: Connection[];
  layers?: Layer[];
}

const tools = [
  {
    id: 'select' as ToolType,
    name: 'Select',
    icon: MousePointer2,
    description: 'Select and move components',
    shortcut: 'V',
  },
  {
    id: 'pan' as ToolType,
    name: 'Pan',
    icon: Hand,
    description: 'Pan around the canvas',
    shortcut: 'H',
  },
  {
    id: 'zoom' as ToolType,
    name: 'Zoom',
    icon: ZoomIn,
    description: 'Zoom in and out',
    shortcut: 'Z',
  },
  {
    id: 'annotate' as ToolType,
    name: 'Annotate',
    icon: MessageSquare,
    description: 'Add annotations',
    shortcut: 'A',
  },
];

export function CanvasToolbar(props: CanvasToolbarProps) {
  const ctx = (() => {
    try {
      return useCanvas();
    } catch {
      return null;
    }
  })();

  const activeTool = props.activeTool ?? ctx?.activeTool!;
  const onToolChange = props.onToolChange ?? ctx?.setTool!;
  const gridConfig = props.gridConfig ?? ctx?.gridConfig!;
  const onToggleGrid = props.onToggleGrid ?? (ctx ? () => ctx.setGridConfig({ ...ctx.gridConfig, visible: !ctx.gridConfig.visible }) : undefined);
  const onToggleSnapToGrid = props.onToggleSnapToGrid ?? (ctx ? () => ctx.setGridConfig({ ...ctx.gridConfig, snapToGrid: !ctx.gridConfig.snapToGrid }) : undefined);
  const onGridSpacingChange = props.onGridSpacingChange ?? (ctx ? (value: string) => ctx.setGridConfig({ ...ctx.gridConfig, spacing: parseInt(value, 10) || 20 }) : undefined);

  const showMinimap = props.showMinimap;
  const onToggleMinimap = props.onToggleMinimap;
  const viewportInfo = props.viewportInfo;
  const canvasExtents = props.canvasExtents;
  const onMinimapPan = props.onMinimapPan;
  const onMinimapZoom = props.onMinimapZoom;
  const components = props.components ?? [];
  const connections = props.connections ?? [];
  const layers = props.layers ?? [];
  return (
    <div
      className={cx(
        'sticky top-[73px] z-20',
        'px-4 py-2 border-b',
        'bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-[var(--glass-blur)]',
        getElevation(1)
      )}
      data-testid='canvas-toolbar'
      role='toolbar'
      aria-label='Canvas tools'
    >
      <div className='flex items-center justify-between gap-4'>
        {/* Left: Primary Tools */}
        <div className='flex items-center gap-2'>
          <div className='flex items-center gap-1 p-1 bg-muted/30 rounded-lg'>
            {tools.map(tool => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <SmartTooltip
                  key={tool.id}
                  content={`${tool.description} (${tool.shortcut})`}
                  shortcut={tool.shortcut}
                >
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    size='sm'
                    className={cx('h-9 w-9 p-0', isActive && 'ring-2 ring-primary/20')}
                    onClick={() => onToolChange(tool.id)}
                    aria-label={tool.description}
                    aria-pressed={isActive}
                    aria-keyshortcuts={tool.shortcut}
                    data-testid={`tool-${tool.id}`}
                  >
                    <Icon className='w-4 h-4' />
                  </Button>
                </SmartTooltip>
              );
            })}
          </div>

          {/* Active tool indicator */}
          <div className='hidden md:flex items-center gap-2 text-sm text-muted-foreground'>
            <span className='font-medium'>{tools.find(t => t.id === activeTool)?.name}</span>
            <span className='text-xs'>({tools.find(t => t.id === activeTool)?.shortcut})</span>
          </div>
        </div>

        {/* Right: Canvas Controls */}
        <div className='flex items-center gap-2'>
          {/* Grid controls */}
          <Popover>
            <PopoverTrigger asChild>
              <SmartTooltip
                content={gridConfig.visible ? 'Hide grid' : 'Show grid'}
                contextualHelp='Grid helps align components and provides visual structure to your design'
              >
                <Button
                  variant={gridConfig.visible ? 'default' : 'outline'}
                  size='sm'
                  aria-pressed={gridConfig.visible}
                  data-testid='grid-toggle'
                >
                  <Grid3x3 className='w-4 h-4 mr-2' />
                  Grid
                </Button>
              </SmartTooltip>
            </PopoverTrigger>
            <PopoverContent align='start' className='w-[220px] p-3 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>Show grid</span>
                <Button
                  variant={gridConfig.visible ? 'default' : 'outline'}
                  size='sm'
                  onClick={onToggleGrid}
                  aria-pressed={gridConfig.visible}
                >
                  {gridConfig.visible ? 'On' : 'Off'}
                </Button>
              </div>
              <div className='flex items-center justify-between'>
                <label className='inline-flex items-center gap-2 text-xs text-muted-foreground'>
                  <input
                    type='checkbox'
                    className='accent-primary'
                    checked={gridConfig.snapToGrid}
                    onChange={onToggleSnapToGrid}
                    aria-label='Snap to grid'
                  />
                  Snap to grid
                </label>
              </div>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-sm'>Spacing</span>
                <Select value={gridConfig.spacing.toString()} onValueChange={onGridSpacingChange}>
                  <SelectTrigger className='h-8 w-[100px]'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='10'>10 px</SelectItem>
                    <SelectItem value='20'>20 px</SelectItem>
                    <SelectItem value='40'>40 px</SelectItem>
                    <SelectItem value='50'>50 px</SelectItem>
                    <SelectItem value='100'>100 px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          {/* Minimap */}
          <SmartTooltip
            content={showMinimap ? 'Hide minimap overview' : 'Show minimap overview'}
            contextualHelp="Minimap provides a bird's-eye view of your entire canvas with viewport navigation and zoom controls"
          >
            <Popover open={showMinimap} onOpenChange={() => onToggleMinimap()}>
              <PopoverTrigger asChild>
                <Button
                  variant={showMinimap ? 'default' : 'outline'}
                  size='sm'
                  aria-pressed={showMinimap}
                  data-testid='minimap-toggle'
                >
                  <Map className='w-4 h-4 mr-2' />
                  Minimap
                </Button>
              </PopoverTrigger>
              <PopoverContent align='end' className='w-[300px]'>
                {!viewportInfo ? (
                  <div className='h-48 flex items-center justify-center text-sm text-muted-foreground'>
                    Preparing minimap...
                  </div>
                ) : (
                  <Minimap
                    components={components}
                    connections={connections}
                    layers={layers}
                    viewport={viewportInfo}
                    canvasExtents={canvasExtents || { width: 0, height: 0 }}
                    onPanTo={onMinimapPan}
                    onZoomTo={onMinimapZoom}
                  />
                )}
              </PopoverContent>
            </Popover>
          </SmartTooltip>

          {/* Help / Shortcuts */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' size='sm' aria-label='Keyboard shortcuts'>
                <HelpCircle className='w-4 h-4 mr-2' />
                Shortcuts
              </Button>
            </PopoverTrigger>
            <PopoverContent align='end' className='w-[320px] text-sm'>
              <div className='font-medium mb-2'>Keyboard Shortcuts</div>
              <ul className='space-y-1'>
                <li><span className='font-mono'>V</span> — Select tool</li>
                <li><span className='font-mono'>H</span> — Pan tool</li>
                <li><span className='font-mono'>Z</span> — Zoom tool</li>
                <li><span className='font-mono'>A</span> — Annotate tool</li>
                <li><span className='font-mono'>Space + Drag</span> — Pan viewport</li>
                <li><span className='font-mono'>Del / Backspace</span> — Delete selection</li>
                <li><span className='font-mono'>Ctrl/Cmd + A</span> — Select all</li>
                <li><span className='font-mono'>Arrow Keys</span> — Nudge selection</li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

export default CanvasToolbar;
