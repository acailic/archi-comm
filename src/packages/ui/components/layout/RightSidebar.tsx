import type { DesignComponent, Layer } from "@/shared/contracts";
import {
  useCanvasActions,
  useCanvasComponents,
  useCanvasSelectedComponent,
} from "@/stores/canvasStore";
import { Button } from "@ui/components/ui/button";
import { Checkbox } from "@ui/components/ui/checkbox";
import { Input } from "@ui/components/ui/input";
import { ScrollArea } from "@ui/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@ui/components/ui/sidebar";
import { GripVertical, Layers, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ComponentPresetsPanel } from "../panels/ComponentPresetsPanel";
import { PropertiesPanel } from "../PropertiesPanel";

interface RightSidebarProps {
  selectedComponent?: string | null;
  components?: DesignComponent[];
  onLabelChange?: (id: string, label: string) => void;
  onDelete?: (id: string) => void;
  layers?: Layer[];
  activeLayerId?: string | null;
  onCreateLayer?: (name: string) => void;
  onRenameLayer?: (id: string, name: string) => void;
  onDeleteLayer?: (id: string) => void;
  onToggleLayerVisibility?: (id: string) => void;
  onReorderLayer?: (id: string, newOrder: number) => void;
  onActiveLayerChange?: (id: string | null) => void;
}

export function RightSidebar(props: RightSidebarProps) {
  const canvasActions = useCanvasActions();
  const storeSelectedComponent = useCanvasSelectedComponent();
  const storeComponents = useCanvasComponents();

  const selectedComponent =
    props.selectedComponent ?? storeSelectedComponent ?? null;
  const components = props.components ?? storeComponents;
  const onLabelChange =
    props.onLabelChange ??
    ((id: string, label: string) => {
      canvasActions.updateComponents((prev) =>
        prev.map((component) =>
          component.id === id ? { ...component, label } : component,
        ),
      );
    });
  const onDelete =
    props.onDelete ??
    ((id: string) => {
      canvasActions.updateComponents((prev) =>
        prev.filter((component) => component.id !== id),
      );
    });

  // Duplicate handler - finds component, clones it with new ID, adds offset position
  const onDuplicate = useCallback(
    (id: string) => {
      const component = components.find((c) => c.id === id);
      if (!component) return;

      const duplicatedComponent: DesignComponent = {
        ...component,
        id: `${component.id}-copy-${Date.now()}`,
        x: component.x + 50,
        y: component.y + 50,
        label: `${component.label} (Copy)`,
      };

      // Add the duplicated component using canvas store actions
      canvasActions.updateComponents((prev) => [...prev, duplicatedComponent]);
    },
    [components, canvasActions],
  );

  const layers = props.layers ?? [];
  const activeLayerId = props.activeLayerId ?? null;
  const onActiveLayerChange = props.onActiveLayerChange ?? (() => {});
  const onCreateLayer = props.onCreateLayer ?? (() => {});
  const onRenameLayer = props.onRenameLayer ?? (() => {});
  const onDeleteLayer = props.onDeleteLayer ?? (() => {});
  const onToggleLayerVisibility = props.onToggleLayerVisibility ?? (() => {});
  const onReorderLayer = props.onReorderLayer ?? (() => {});
  const [editingLayer, setEditingLayer] = useState<string | null>(null);
  const [newLayerName, setNewLayerName] = useState("");
  const [patternsExpanded, setPatternsExpanded] = useState(true);

  // Keyboard shortcut to toggle patterns panel: Shift+P
  useEffect(() => {
    const handleTogglePatterns = () => {
      setPatternsExpanded((prev) => !prev);
    };

    window.addEventListener(
      "shortcut:toggle-patterns-panel",
      handleTogglePatterns,
    );
    return () => {
      window.removeEventListener(
        "shortcut:toggle-patterns-panel",
        handleTogglePatterns,
      );
    };
  }, []);

  return (
    <Sidebar
      side="right"
      variant="inset"
      collapsible="none"
      className="h-full bg-transparent w-80 fixed right-0 top-0 layout-sidebar-stable"
    >
      <SidebarContent className="flex flex-col h-full">
        {/* Properties Panel */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            Properties
          </SidebarGroupLabel>
          <div className="p-4 layout-stable">
            <PropertiesPanel
              selectedComponent={selectedComponent}
              components={components}
              onLabelChange={onLabelChange}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          </div>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Architecture Patterns Panel */}
        <SidebarGroup>
          <SidebarGroupLabel
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setPatternsExpanded(!patternsExpanded)}
          >
            <div className="w-2 h-2 rounded-full bg-accent" />
            Patterns {patternsExpanded ? "▼" : "▶"}
          </SidebarGroupLabel>
          {patternsExpanded && (
            <div
              className="layout-stable"
              style={{ maxHeight: "400px", overflow: "hidden" }}
            >
              <ComponentPresetsPanel />
            </div>
          )}
        </SidebarGroup>

        <SidebarSeparator />

        {/* Layers Management */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Layers
          </SidebarGroupLabel>
          <div className="p-4 layout-stable">
            <ScrollArea className="h-32 rounded border bg-card/50 layout-container-stable">
              <div className="p-2 space-y-1">
                {layers.map((layer) => (
                  <div
                    key={layer.id}
                    className={`group flex items-center gap-2 p-2 rounded-md text-sm hover:bg-accent/50 transition-colors ${
                      activeLayerId === layer.id
                        ? "bg-primary/10 border border-primary/20"
                        : ""
                    }`}
                    onClick={() => onActiveLayerChange(layer.id)}
                  >
                    <div
                      className="w-3 h-3 text-muted-foreground cursor-grab flex items-center justify-center"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", layer.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedLayerId =
                          e.dataTransfer.getData("text/plain");
                        if (draggedLayerId !== layer.id) {
                          onReorderLayer(draggedLayerId, layer.order);
                        }
                      }}
                    >
                      <GripVertical className="w-3 h-3 pointer-events-none" />
                    </div>
                    <Checkbox
                      checked={layer.visible}
                      onCheckedChange={() => onToggleLayerVisibility(layer.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {editingLayer === layer.id ? (
                      <Input
                        value={layer.name}
                        onChange={(e) =>
                          onRenameLayer(layer.id, e.target.value)
                        }
                        onBlur={() => setEditingLayer(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingLayer(null);
                          }
                          if (e.key === "Escape") {
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
                  if (e.key === "Enter" && newLayerName.trim()) {
                    onCreateLayer(newLayerName.trim());
                    setNewLayerName("");
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
                    setNewLayerName("");
                  }
                }}
                disabled={!newLayerName.trim()}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
