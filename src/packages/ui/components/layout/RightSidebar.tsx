import {
  GripVertical,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { PropertiesPanel } from './PropertiesPanel';
import { Button } from '@ui/components/ui/button';
import { Checkbox } from '@ui/components/ui/checkbox';
import { Input } from '@ui/components/ui/input';
import { ScrollArea } from '@ui/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@ui/components/ui/sidebar';
import type { DesignComponent, Layer } from '@/shared/contracts';
import { useCanvas } from '@services/canvas/CanvasOrchestrator';


interface RightSidebarProps {
  selectedComponent: string | null;
  components: DesignComponent[];
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
  layers: Layer[];
  activeLayerId: string | null;
  onCreateLayer: (name: string) => void;
  onRenameLayer: (id: string, name: string) => void;
  onDeleteLayer: (id: string) => void;
  onToggleLayerVisibility: (id: string) => void;
  onReorderLayer: (id: string, newOrder: number) => void;
  onActiveLayerChange: (id: string | null) => void;

}

export function RightSidebar(props: RightSidebarProps) {
  const ctx = (() => {
    try {
      return useCanvas();
    } catch {
      return null;
    }
  })();

  const selectedComponent = props.selectedComponent ?? ctx?.selectedComponentId ?? null;
  const components = props.components ?? ctx?.components ?? [];
  const onLabelChange = props.onLabelChange ?? (ctx ? (id: string, label: string) => ctx.updateComponent(id, { label }) : undefined);
  const onDelete = props.onDelete ?? (ctx ? (id: string) => ctx.deleteComponent(id) : undefined);
  const layers = props.layers ?? ctx?.layers ?? [];
  const activeLayerId = props.activeLayerId ?? ctx?.activeLayerId ?? null;
  const onActiveLayerChange = props.onActiveLayerChange ?? (ctx ? (id: string | null) => ctx.setActiveLayer(id) : undefined);
  const onCreateLayer = props.onCreateLayer ?? (ctx ? (name: string) => ctx.addLayer({ id: `layer-${Date.now()}`, name, visible: true }) : undefined);
  const onRenameLayer = props.onRenameLayer ?? (() => {});
  const onDeleteLayer = props.onDeleteLayer ?? (() => {});
  const onToggleLayerVisibility = props.onToggleLayerVisibility ?? (() => {});
  const onReorderLayer = props.onReorderLayer ?? (() => {});
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [newLayerName, setNewLayerName] = useState('');

  return (
    <Sidebar
      side='right'
      variant='inset'
      collapsible='none'
      className='h-full bg-transparent w-80 fixed right-0 top-0 layout-sidebar-stable'
    >
      <SidebarContent className='flex flex-col h-full'>
        {/* Properties Panel */}
        <SidebarGroup>
          <SidebarGroupLabel className='flex items-center gap-2'>
            <div className='w-2 h-2 rounded-full bg-accent' />
            Properties
          </SidebarGroupLabel>
          <div className='p-4 layout-stable'>
            <PropertiesPanel
              selectedComponent={selectedComponent}
              components={components}
              onLabelChange={onLabelChange}
              onDelete={onDelete}
            />
          </div>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Layers Management */}
        <SidebarGroup>
          <SidebarGroupLabel className='flex items-center gap-2'>
            <Layers className='w-4 h-4' />
            Layers
          </SidebarGroupLabel>
          <div className='p-4 layout-stable'>
            <ScrollArea className='h-32 rounded border bg-card/50 layout-container-stable'>
              <div className='p-2 space-y-1'>
                {layers.map(layer => (
                  <div
                    key={layer.id}
                    className={`group flex items-center gap-2 p-2 rounded-md text-sm hover:bg-accent/50 transition-colors ${
                      activeLayerId === layer.id ? 'bg-primary/10 border border-primary/20' : ''
                    }`}
                    onClick={() => onActiveLayerChange(layer.id)}
                  >
                    <GripVertical
                      className='w-3 h-3 text-muted-foreground cursor-grab'
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', layer.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedLayerId = e.dataTransfer.getData('text/plain');
                        if (draggedLayerId !== layer.id) {
                          onReorderLayer(draggedLayerId, layer.order);
                        }
                      }}
                      onDragEnd={() => {
                        // Clean up any drag state if needed
                      }}
                    />
                    <Checkbox
                      checked={layer.visible}
                      onCheckedChange={() => onToggleLayerVisibility(layer.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    {editingLayer === layer.id ? (
                      <Input
                        value={layer.name}
                        onChange={e => onRenameLayer(layer.id, e.target.value)}
                        onBlur={() => setEditingLayer(null)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            setEditingLayer(null);
                          }
                          if (e.key === 'Escape') {
                            setEditingLayer(null);
                          }
                        }}
                        className='h-6 text-xs flex-1'
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className='flex-1 cursor-pointer'
                        onDoubleClick={e => {
                          e.stopPropagation();
                          setEditingLayer(layer.id);
                        }}
                      >
                        {layer.name}
                      </span>
                    )}
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive'
                      onClick={e => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                    >
                      <Trash2 className='w-3 h-3' />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className='mt-2 flex gap-2'>
              <Input
                placeholder='Layer name'
                value={newLayerName}
                onChange={e => setNewLayerName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newLayerName.trim()) {
                    onCreateLayer(newLayerName.trim());
                    setNewLayerName('');
                  }
                }}
                className='h-7 text-xs flex-1'
              />
              <Button
                size='sm'
                className='h-7 px-2'
                onClick={() => {
                  if (newLayerName.trim()) {
                    onCreateLayer(newLayerName.trim());
                    setNewLayerName('');
                  }
                }}
                disabled={!newLayerName.trim()}
              >
                <Plus className='w-3 h-3' />
              </Button>
            </div>
          </div>
        </SidebarGroup>


      </SidebarContent>
    </Sidebar>
  );
}
