import React, { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from './ui/sidebar';
import { PropertiesPanel } from './PropertiesPanel';
import type { DesignComponent, Layer } from '../App';
import { Layers, FileText, Copy, ChevronDown, ChevronRight, Trash2, GripVertical, Plus } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import type { Challenge } from '../App';

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
  challenge?: Challenge;
}

export function RightSidebar({
  selectedComponent,
  components,
  onLabelChange,
  onDelete,
  layers,
  activeLayerId,
  onCreateLayer,
  onRenameLayer,
  onDeleteLayer,
  onToggleLayerVisibility,
  onReorderLayer,
  onActiveLayerChange,
  challenge
}: RightSidebarProps) {
  const [showAssignment, setShowAssignment] = useState(true);
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [newLayerName, setNewLayerName] = useState('');

  const copyAssignment = async () => {
    try {
      if (!challenge) return;
      const text = `${challenge.title}\n\n${challenge.description}\n\nRequirements:\n- ${challenge.requirements.join('\n- ')}`;
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <Sidebar side="right" variant="inset" collapsible="none" className="h-full bg-transparent hidden lg:block">
      <SidebarContent className="flex flex-col h-full">
        {/* Properties Panel */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent"></div>
            Properties
          </SidebarGroupLabel>
          <div className="p-4">
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
          <SidebarGroupLabel className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers
          </SidebarGroupLabel>
          <div className="p-4">
            <ScrollArea className="h-32 rounded border bg-card/50">
              <div className="p-2 space-y-1">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`group flex items-center gap-2 p-2 rounded-md text-sm hover:bg-accent/50 transition-colors ${
                      activeLayerId === layer.id ? 'bg-primary/10 border border-primary/20' : ''
                    }`}
                    onClick={() => onActiveLayerChange(layer.id)}
                  >
                    <GripVertical className="w-3 h-3 text-muted-foreground cursor-grab" />
                    <Checkbox
                      checked={layer.visible}
                      onCheckedChange={() => onToggleLayerVisibility(layer.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {editingLayer === layer.id ? (
                      <Input
                        value={layer.name}
                        onChange={(e) => onRenameLayer(layer.id, e.target.value)}
                        onBlur={() => setEditingLayer(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setEditingLayer(null);
                          }
                          if (e.key === 'Escape') {
                            setEditingLayer(null);
                          }
                        }}
                        className="h-6 text-xs flex-1"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span
                        className="flex-1 cursor-pointer"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingLayer(layer.id);
                        }}
                      >
                        {layer.name}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLayer(layer.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Layer name"
                value={newLayerName}
                onChange={(e) => setNewLayerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newLayerName.trim()) {
                    onCreateLayer(newLayerName.trim());
                    setNewLayerName('');
                  }
                }}
                className="h-7 text-xs flex-1"
              />
              <Button
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  if (newLayerName.trim()) {
                    onCreateLayer(newLayerName.trim());
                    setNewLayerName('');
                  }
                }}
                disabled={!newLayerName.trim()}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Assignment Summary (Optional) */}
        {challenge && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Assignment
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setShowAssignment(v => !v)}
                aria-pressed={showAssignment}
                aria-label={showAssignment ? 'Hide assignment' : 'Show assignment'}
              >
                {showAssignment ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </Button>
            </SidebarGroupLabel>
            {showAssignment && (
              <div className="px-4 pb-2 space-y-2">
                <div className="text-sm font-medium leading-tight">{challenge.title}</div>
                <div className="text-xs text-muted-foreground leading-snug">{challenge.description}</div>
                {challenge.requirements?.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-medium mb-1">Requirements</div>
                    <ScrollArea className="h-28 rounded border bg-card/50">
                      <ul className="p-2 text-xs space-y-1">
                        {challenge.requirements.map((req, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-foreground/60" />
                            <span className="leading-snug">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  </div>
                )}
                <div className="flex justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={copyAssignment} className="h-7 px-2">
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}