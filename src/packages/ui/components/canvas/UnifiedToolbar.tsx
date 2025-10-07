import { useCallback, useEffect, useMemo, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { AnimatePresence, motion } from 'framer-motion';
import type { AnnotationTool } from './AnnotationToolbar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ColorPicker } from '../ui/color-picker';
import { Slider } from '../ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  useCanvasActions,
  useCanvasAnnotations,
  useCanvasDrawings,
  useCanvasMode,
  useCanRedoDrawing,
  useCanUndoDrawing,
  useDrawingColor,
  useDrawingSize,
  useDrawingTool,
  useLayerOpacity,
  useLayerVisibility,
} from '@/stores/canvasStore';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Highlighter,
  Layers,
  MessageSquare,
  Pencil,
  Redo2,
  StickyNote,
  Tag,
  Trash2,
  Undo2,
  Wand2,
} from 'lucide-react';
import { cx } from '@/lib/design/design-system';

type UnifiedToolbarMode = 'draw' | 'annotate';

export interface UnifiedToolbarProps {
  annotationTool: AnnotationTool | null;
  onAnnotationToolChange: (tool: AnnotationTool | null) => void;
  isLayerPanelOpen?: boolean;
  onToggleLayerPanel?: () => void;
  annotationSidebarVisible?: boolean;
  onToggleAnnotationSidebar?: () => void;
  className?: string;
}

const drawTools = [
  {
    id: 'pen' as const,
    icon: Pencil,
    label: 'Pen',
    shortcut: 'P',
    description: 'Freehand pen tool',
  },
  {
    id: 'highlighter' as const,
    icon: Highlighter,
    label: 'Highlighter',
    shortcut: 'H',
    description: 'Semi-transparent highlighter',
  },
  {
    id: 'eraser' as const,
    icon: Wand2,
    label: 'Eraser',
    shortcut: 'E',
    description: 'Erase individual strokes',
  },
];

const annotationTools = [
  {
    id: 'comment' as AnnotationTool,
    icon: MessageSquare,
    label: 'Comment',
    shortcut: 'Alt+C',
    description: 'Add a threaded comment',
  },
  {
    id: 'note' as AnnotationTool,
    icon: StickyNote,
    label: 'Note',
    shortcut: 'Alt+N',
    description: 'Post-it style sticky note',
  },
  {
    id: 'label' as AnnotationTool,
    icon: Tag,
    label: 'Label',
    shortcut: 'Alt+L',
    description: 'Tag areas with labels',
  },
  {
    id: 'arrow' as AnnotationTool,
    icon: ArrowRight,
    label: 'Arrow',
    shortcut: 'Alt+A',
    description: 'Directional arrow annotation',
  },
  {
    id: 'highlight' as AnnotationTool,
    icon: Highlighter,
    label: 'Highlight',
    shortcut: 'Alt+H',
    description: 'Highlight an area on the canvas',
  },
];

export const UnifiedToolbar: React.FC<UnifiedToolbarProps> = ({
  annotationTool,
  onAnnotationToolChange,
  isLayerPanelOpen = false,
  onToggleLayerPanel,
  annotationSidebarVisible = false,
  onToggleAnnotationSidebar,
  className,
}) => {
  const canvasMode = useCanvasMode();
  const drawings = useCanvasDrawings();
  const annotations = useCanvasAnnotations();
  const drawingTool = useDrawingTool();
  const drawingColor = useDrawingColor();
  const drawingSize = useDrawingSize();
  const canUndo = useCanUndoDrawing();
  const canRedo = useCanRedoDrawing();
  const drawingsVisible = useLayerVisibility('drawings');
  const annotationsVisible = useLayerVisibility('annotations');
  const drawingOpacity = useLayerOpacity('drawings');
  const annotationOpacity = useLayerOpacity('annotations');
  const canvasActions = useCanvasActions();
  const [confirmTarget, setConfirmTarget] = useState<UnifiedToolbarMode | null>(null);
  const [mode, setMode] = useState<UnifiedToolbarMode>(
    canvasMode === 'annotation' ? 'annotate' : 'draw'
  );

  useEffect(() => {
    setMode(canvasMode === 'annotation' ? 'annotate' : 'draw');
  }, [canvasMode]);

  const strokeCount = drawings.length;
  const annotationCount = annotations.length;

  const handleModeChange = useCallback(
    (value: UnifiedToolbarMode) => {
      setMode(value);
      if (value === 'draw') {
        canvasActions.setCanvasMode('draw');
        onAnnotationToolChange(null);
      } else {
        canvasActions.setCanvasMode('annotation');
        canvasActions.setDrawingTool(null, { silent: true });
      }
    },
    [canvasActions, onAnnotationToolChange]
  );

  const handleDrawingToolSelect = useCallback(
    (tool: typeof drawTools[number]['id']) => {
      canvasActions.setDrawingTool(tool, { silent: true });
      if (tool !== null) {
        canvasActions.setCanvasMode('draw');
      }
    },
    [canvasActions]
  );

  const handleDrawingColorChange = useCallback(
    (color: string) => {
      canvasActions.setDrawingColor(color, { silent: true });
    },
    [canvasActions]
  );

  const handleDrawingSizeChange = useCallback(
    (size: number[]) => {
      canvasActions.setDrawingSize(size[0], { silent: true });
    },
    [canvasActions]
  );

  const handleAnnotationToolSelect = useCallback(
    (tool: AnnotationTool) => {
      const nextTool = annotationTool === tool ? null : tool;
      onAnnotationToolChange(nextTool);
      canvasActions.setCanvasMode('annotation');
    },
    [annotationTool, canvasActions, onAnnotationToolChange]
  );

  const handleClearAll = useCallback(() => {
    if (confirmTarget === 'draw') {
      canvasActions.deleteAllDrawings();
    } else if (confirmTarget === 'annotate') {
      canvasActions.deleteAllAnnotations();
    }
    setConfirmTarget(null);
  }, [canvasActions, confirmTarget]);

  const drawToolButtons = useMemo(
    () =>
      drawTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = drawingTool === tool.id;
        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant={isActive ? 'default' : 'ghost'}
                size='icon'
                onClick={() => handleDrawingToolSelect(tool.id)}
                aria-pressed={isActive}
                aria-label={`${tool.label} tool (${tool.shortcut})`}
                className={cx(
                  'rounded-lg border transition-all duration-200',
                  isActive ? 'border-primary shadow-sm' : 'border-transparent'
                )}
              >
                <Icon className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom'>
              <div className='flex flex-col gap-1'>
                <span className='font-medium'>{tool.label}</span>
                <span className='text-xs text-muted-foreground'>{tool.description}</span>
                <span className='text-[10px] uppercase tracking-wide text-muted-foreground/90'>
                  Shortcut • {tool.shortcut}
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }),
    [drawingTool, handleDrawingToolSelect]
  );

  const annotationToolButtons = useMemo(
    () =>
      annotationTools.map((tool) => {
        const Icon = tool.icon;
        const isActive = annotationTool === tool.id;
        return (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant={isActive ? 'default' : 'ghost'}
                size='icon'
                onClick={() => handleAnnotationToolSelect(tool.id)}
                aria-pressed={isActive}
                aria-label={`${tool.label} tool (${tool.shortcut})`}
                className={cx(
                  'rounded-lg border transition-all duration-200',
                  isActive ? 'border-primary shadow-sm' : 'border-transparent'
                )}
              >
                <Icon className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom'>
              <div className='flex flex-col gap-1'>
                <span className='font-medium'>{tool.label}</span>
                <span className='text-xs text-muted-foreground'>{tool.description}</span>
                <span className='text-[10px] uppercase tracking-wide text-muted-foreground/90'>
                  Shortcut • {tool.shortcut}
                </span>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }),
    [annotationTool, handleAnnotationToolSelect]
  );

  return (
    <TooltipProvider>
      <div
        className={cx(
          'flex max-w-full flex-col gap-3 rounded-2xl border border-border bg-background/95 px-5 py-4 shadow-xl backdrop-blur-xl',
          'ring-1 ring-black/5',
          'w-[min(640px,calc(100vw-2rem))]',
          className
        )}
        style={{ zIndex: 20 }}
        role='region'
        aria-label='Canvas tools'
      >
        <Tabs.Root value={mode} onValueChange={handleModeChange} orientation='horizontal'>
          <div className='flex items-center justify-between gap-4'>
            <Tabs.List className='flex items-center gap-2 rounded-xl bg-muted/40 p-1'>
              <Tabs.Trigger
                value='draw'
                className='flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm'
              >
                Draw
                <Badge variant='secondary' className='ml-1 h-5 px-1.5 text-[11px] font-semibold'>
                  {strokeCount}
                </Badge>
              </Tabs.Trigger>
              <Tabs.Trigger
                value='annotate'
                className='flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm'
              >
                Annotate
                <Badge variant='secondary' className='ml-1 h-5 px-1.5 text-[11px] font-semibold'>
                  {annotationCount}
                </Badge>
              </Tabs.Trigger>
            </Tabs.List>

            <div className='flex items-center gap-2'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={onToggleLayerPanel}
                    aria-label='Toggle layer panel'
                  >
                    <Layers className={cx('h-4 w-4', isLayerPanelOpen ? 'text-primary' : undefined)} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='bottom'>Toggle layer panel (Ctrl/Cmd + Shift + L)</TooltipContent>
              </Tooltip>

              {onToggleAnnotationSidebar && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      onClick={onToggleAnnotationSidebar}
                      aria-label='Toggle annotation sidebar'
                    >
                      <MessageSquare
                        className={cx(
                          'h-4 w-4',
                          annotationSidebarVisible ? 'text-primary' : undefined
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side='bottom'>Toggle annotation sidebar (Alt + Shift + A)</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          <Tabs.Content
            value='draw'
            forceMount
            className='data-[state=inactive]:hidden'
          >
            <AnimatePresence mode='wait'>
              {mode === 'draw' && (
                <motion.div
                  key='draw-panel'
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className='flex flex-col gap-3'
                >
                  <div className='flex flex-wrap items-center gap-2'>{drawToolButtons}</div>

                  <div className='flex flex-wrap items-center gap-4'>
                    <div className='flex items-center gap-3'>
                      <span className='text-xs font-semibold uppercase text-muted-foreground'>Color</span>
                      <ColorPicker value={drawingColor} onChange={handleDrawingColorChange} />
                    </div>

                    <div className='flex items-center gap-3'>
                      <span className='text-xs font-semibold uppercase text-muted-foreground'>Size</span>
                      <Slider
                        min={1}
                        max={20}
                        step={1}
                        value={[drawingSize]}
                        onValueChange={handleDrawingSizeChange}
                        className='w-36'
                        aria-label='Brush size'
                      />
                      <span className='text-xs font-medium text-muted-foreground'>{drawingSize}px</span>
                    </div>

                    <div className='flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground'>
                      <span>{strokeCount} strokes</span>
                    </div>
                  </div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => canvasActions.setLayerVisibility('drawings', !drawingsVisible)}
                        >
                          {drawingsVisible ? <Eye className='mr-2 h-4 w-4' /> : <EyeOff className='mr-2 h-4 w-4' />}
                          {drawingsVisible ? 'Hide drawings' : 'Show drawings'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side='bottom'>Ctrl/Cmd + 3</TooltipContent>
                    </Tooltip>

                    <div className='flex items-center gap-2 rounded-md border border-border px-2 py-1'>
                      <span className='text-xs text-muted-foreground'>Opacity</span>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[Math.round(drawingOpacity * 100)]}
                        onValueChange={(value) =>
                          canvasActions.setLayerOpacity('drawings', value[0] / 100)
                        }
                        className='w-24'
                      />
                      <span className='text-xs font-medium text-muted-foreground'>
                        {Math.round(drawingOpacity * 100)}%
                      </span>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => setConfirmTarget('draw')}
                            disabled={strokeCount === 0}
                          >
                            <Trash2 className='mr-2 h-4 w-4' /> Clear all
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side='bottom'>Ctrl/Cmd + Shift + D</TooltipContent>
                    </Tooltip>

                    <div className='ml-auto flex items-center gap-1'>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => canvasActions.undoDrawing()}
                              disabled={!canUndo}
                              aria-label='Undo drawing'
                            >
                              <Undo2 className='h-4 w-4' />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side='bottom'>Ctrl/Cmd + Z</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              type='button'
                              variant='ghost'
                              size='icon'
                              onClick={() => canvasActions.redoDrawing()}
                              disabled={!canRedo}
                              aria-label='Redo drawing'
                            >
                              <Redo2 className='h-4 w-4' />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side='bottom'>Ctrl/Cmd + Shift + Z</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Tabs.Content>

          <Tabs.Content
            value='annotate'
            forceMount
            className='data-[state=inactive]:hidden'
          >
            <AnimatePresence mode='wait'>
              {mode === 'annotate' && (
                <motion.div
                  key='annotate-panel'
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className='flex flex-col gap-3'
                >
                  <div className='flex flex-wrap items-center gap-2'>{annotationToolButtons}</div>

                  <div className='flex flex-wrap items-center gap-2'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          onClick={() => canvasActions.setLayerVisibility('annotations', !annotationsVisible)}
                        >
                          {annotationsVisible ? (
                            <Eye className='mr-2 h-4 w-4' />
                          ) : (
                            <EyeOff className='mr-2 h-4 w-4' />
                          )}
                          {annotationsVisible ? 'Hide annotations' : 'Show annotations'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side='bottom'>Ctrl/Cmd + 4</TooltipContent>
                    </Tooltip>

                    <div className='flex items-center gap-2 rounded-md border border-border px-2 py-1'>
                      <span className='text-xs text-muted-foreground'>Opacity</span>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[Math.round(annotationOpacity * 100)]}
                        onValueChange={(value) =>
                          canvasActions.setLayerOpacity('annotations', value[0] / 100)
                        }
                        className='w-24'
                      />
                      <span className='text-xs font-medium text-muted-foreground'>
                        {Math.round(annotationOpacity * 100)}%
                      </span>
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => setConfirmTarget('annotate')}
                            disabled={annotationCount === 0}
                          >
                            <Trash2 className='mr-2 h-4 w-4' /> Clear all
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side='bottom'>Ctrl/Cmd + Shift + A</TooltipContent>
                    </Tooltip>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <AlertDialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget === 'draw' ? 'Clear all drawings?' : 'Clear all annotations?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All {confirmTarget === 'draw' ? 'drawing strokes' : 'annotations'}
              will be permanently removed from the canvas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearAll}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

UnifiedToolbar.displayName = 'UnifiedToolbar';
