import React from 'react';
import {
  Eye,
  EyeOff,
  Layers,
  Move3d,
  PenSquare,
  Shapes,
  StickyNote,
  Waypoints,
} from 'lucide-react';

import { cn } from '@core/utils';
import { Button } from '@ui/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/ui/card';
import { Slider } from '@ui/components/ui/slider';
import {
  useCanvasActions,
  useLayerOpacity,
  useLayerVisibility,
} from '@/stores/canvasStore';

const layerMetadata = {
  components: {
    label: 'Components',
    description: 'Primary nodes and groups',
    icon: Shapes,
  },
  connections: {
    label: 'Connections',
    description: 'Edges and flows',
    icon: Waypoints,
  },
  drawings: {
    label: 'Drawings',
    description: 'Freehand notes and highlights',
    icon: PenSquare,
  },
  annotations: {
    label: 'Annotations',
    description: 'Comments, notes, and highlights',
    icon: StickyNote,
  },
  infoCards: {
    label: 'Info Cards',
    description: 'Inline documentation cards',
    icon: Move3d,
  },
} as const;

type LayerKey = keyof typeof layerMetadata;

interface LayerPanelProps {
  className?: string;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ className }) => {
  const canvasActions = useCanvasActions();
  const layers = Object.keys(layerMetadata) as LayerKey[];
  const layerVisibility = {
    components: useLayerVisibility('components'),
    connections: useLayerVisibility('connections'),
    drawings: useLayerVisibility('drawings'),
    annotations: useLayerVisibility('annotations'),
    infoCards: useLayerVisibility('infoCards'),
  } satisfies Record<LayerKey, boolean>;
  const layerOpacity = {
    components: useLayerOpacity('components'),
    connections: useLayerOpacity('connections'),
    drawings: useLayerOpacity('drawings'),
    annotations: useLayerOpacity('annotations'),
    infoCards: useLayerOpacity('infoCards'),
  } satisfies Record<LayerKey, number>;

  return (
    <Card className={cn('w-72 bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75', className)}>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-3'>
        <div className='flex items-center gap-2'>
          <Layers className='h-4 w-4 text-muted-foreground' />
          <CardTitle className='text-sm font-semibold tracking-wide uppercase'>Layers</CardTitle>
        </div>
        <div className='flex gap-1'>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='h-7 px-2 text-[11px] font-semibold'
            onClick={() => canvasActions.toggleAllLayers(true)}
          >
            Show all
          </Button>
          <Button
            type='button'
            size='sm'
            variant='ghost'
            className='h-7 px-2 text-[11px] font-semibold'
            onClick={() => canvasActions.toggleAllLayers(false)}
          >
            Hide all
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-3 pt-0'>
        {layers.map((layerKey) => {
          const meta = layerMetadata[layerKey];
          const visible = layerVisibility[layerKey];
          const opacity = layerOpacity[layerKey];
          const Icon = meta.icon;

          return (
            <div
              key={layerKey}
              className='flex flex-col rounded-lg border border-border/70 bg-muted/30 p-3 transition-colors'
            >
              <div className='flex items-start justify-between gap-2'>
                <div>
                  <div className='flex items-center gap-2'>
                    <span className='inline-flex h-7 w-7 items-center justify-center rounded-md bg-background/90 shadow-inner'>
                      <Icon className='h-4 w-4 text-muted-foreground' />
                    </span>
                    <div>
                      <p className='text-sm font-semibold text-foreground'>{meta.label}</p>
                      <p className='text-xs text-muted-foreground'>{meta.description}</p>
                    </div>
                  </div>
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label={visible ? `Hide ${meta.label}` : `Show ${meta.label}`}
                  onClick={() => canvasActions.setLayerVisibility(layerKey, !visible)}
                >
                  {visible ? <Eye className='h-4 w-4' /> : <EyeOff className='h-4 w-4' />}
                </Button>
              </div>

              <div className='mt-3 flex items-center gap-3'>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={[Math.round(opacity * 100)]}
                  onValueChange={(value) =>
                    canvasActions.setLayerOpacity(layerKey, value[0] / 100)
                  }
                  aria-label={`${meta.label} opacity`}
                />
                <span className='w-10 text-right text-xs font-medium text-muted-foreground'>
                  {Math.round(opacity * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

LayerPanel.displayName = 'LayerPanel';
