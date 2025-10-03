import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  Boxes,
  ChevronDown,
  ChevronRight,
  Cloud,
  Database,
  Globe,
  Layers,
  Network,
  Search,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import type { ComponentPreset } from "../../../../lib/canvas/component-presets";
import { componentPresets } from "../../../../lib/canvas/component-presets";

type PresetIconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;
type AddPresetDetail = {
  presetId: string;
  position?: { x: number; y: number };
};

interface ContextMenuState {
  presetId: string;
  menuX: number;
  menuY: number;
  pointerX: number;
  pointerY: number;
}

interface PresetCardProps {
  preset: ComponentPreset;
  icon: PresetIconComponent;
  isDragging: boolean;
  onSelect: (preset: ComponentPreset) => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>, preset: ComponentPreset) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, preset: ComponentPreset) => void;
  onDragEnd: (event: React.DragEvent<HTMLDivElement>, preset: ComponentPreset) => void;
}

const RECENT_PRESETS_STORAGE_KEY = "archicomm_recent_presets";
const PANEL_STATE_STORAGE_KEY = "archicomm_presets_panel_collapsed";
const MAX_RECENT_PRESETS = 6;

const PRESET_ICON_MAP: Record<string, PresetIconComponent> = {
  Layers,
  Network,
  Database,
  Globe,
  Workflow,
  ShieldCheck,
  Activity,
  Cloud,
};

const DEFAULT_PRESET_ICON: PresetIconComponent = Boxes;

const isBrowser = typeof window !== "undefined";
const PRESET_ID_SET = new Set(componentPresets.map((preset) => preset.id));

const loadStoredPresetIds = (): string[] => {
  if (!isBrowser) return [];
  try {
    const raw = window.localStorage.getItem(RECENT_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === "string" && PRESET_ID_SET.has(id))
      .slice(0, MAX_RECENT_PRESETS);
  } catch {
    return [];
  }
};

const loadCollapsedState = (): boolean => {
  if (!isBrowser) return false;
  try {
    const stored = window.localStorage.getItem(PANEL_STATE_STORAGE_KEY);
    if (stored === null) {
      return window.innerWidth < 720;
    }
    return stored === "true";
  } catch {
    return false;
  }
};

const persistString = (key: string, value: string) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
};

const getPresetIcon = (iconName: string | undefined): PresetIconComponent => {
  if (!iconName) return DEFAULT_PRESET_ICON;
  return PRESET_ICON_MAP[iconName] ?? DEFAULT_PRESET_ICON;
};

const formatCategory = (category: string): string =>
  category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const PresetPreview = ({ preset }: { preset: ComponentPreset }) => {
  const nodes = preset.components;
  if (!nodes.length) {
    return <div className="mt-3 h-20 w-full rounded-md bg-muted/40" />;
  }

  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const padding = 8;

  const normalizedNodes = nodes.map((node) => {
    const normalizedX = ((node.x - minX) / rangeX) * (100 - padding * 2) + padding;
    const normalizedY = ((node.y - minY) / rangeY) * (100 - padding * 2) + padding;
    return { id: node.id, x: normalizedX, y: normalizedY };
  });

  const positionMap = new Map(normalizedNodes.map((node) => [node.id, node]));

  return (
    <div className="mt-3">
      <div className="relative h-20 w-full overflow-hidden rounded-md bg-muted/50">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full text-primary/60">
          {preset.connections.map((connection, index) => {
            const source = positionMap.get(connection.from);
            const target = positionMap.get(connection.to);
            if (!source || !target) return null;

            return (
              <line
                key={`${connection.from}-${connection.to}-${index}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeOpacity={0.45}
              />
            );
          })}
        </svg>
        {normalizedNodes.map((node) => (
          <span
            key={node.id}
            className="absolute inline-flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary/90 shadow-[0_0_8px_rgba(59,130,246,0.45)]"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-background" />
          </span>
        ))}
      </div>
    </div>
  );
};

const PresetCard = React.memo(function PresetCard({
  preset,
  icon: Icon,
  isDragging,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragEnd,
}: PresetCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      title={preset.description}
      draggable
      onClick={() => onSelect(preset)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(preset);
        }
      }}
      onContextMenu={(event) => onContextMenu(event, preset)}
      onDragStart={(event) => onDragStart(event, preset)}
      onDragEnd={(event) => onDragEnd(event, preset)}
      className={`group flex h-full flex-col justify-between rounded-lg border border-border/70 bg-card/70 p-3 text-left outline-none transition-all hover:border-primary/60 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 ${
        isDragging ? "border-primary/80 opacity-70" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-sm font-semibold leading-tight">{preset.name}</h4>
            <Badge variant="secondary" className="h-5 min-w-[2rem] justify-center px-1.5 text-[10px]">
              {preset.components.length}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{preset.description}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground/80">
        <span>{formatCategory(preset.category)}</span>
        <span>{preset.connections.length} links</span>
      </div>
      <PresetPreview preset={preset} />
    </div>
  );
});

export function ComponentPresetsPanel() {
  const [collapsed, setCollapsed] = useState<boolean>(() => loadCollapsedState());
  const [searchQuery, setSearchQuery] = useState("");
  const [recentPresetIds, setRecentPresetIds] = useState<string[]>(() => loadStoredPresetIds());
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    setRecentPresetIds((previous) => previous.filter((id) => PRESET_ID_SET.has(id)));
  }, []);

  useEffect(() => {
    persistString(RECENT_PRESETS_STORAGE_KEY, JSON.stringify(recentPresetIds));
  }, [recentPresetIds]);

  useEffect(() => {
    persistString(PANEL_STATE_STORAGE_KEY, collapsed ? "true" : "false");
  }, [collapsed]);

  const trackPresetUsage = useCallback((presetId: string) => {
    setRecentPresetIds((previous) => {
      const next = [presetId, ...previous.filter((id) => id !== presetId)];
      return next.slice(0, MAX_RECENT_PRESETS);
    });
  }, []);

  const filteredPresets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return componentPresets;
    }

    return componentPresets.filter((preset) => {
      if (
        preset.name.toLowerCase().includes(query) ||
        preset.description.toLowerCase().includes(query) ||
        preset.category.toLowerCase().includes(query)
      ) {
        return true;
      }

      return preset.components.some(
        (component) =>
          component.label.toLowerCase().includes(query) ||
          component.type.toLowerCase().includes(query),
      );
    });
  }, [searchQuery]);

  const recentPresets = useMemo(() => {
    return recentPresetIds
      .map((id) => filteredPresets.find((preset) => preset.id === id))
      .filter((preset): preset is ComponentPreset => Boolean(preset));
  }, [filteredPresets, recentPresetIds]);

  const remainingPresets = useMemo(
    () => filteredPresets.filter((preset) => !recentPresetIds.includes(preset.id)),
    [filteredPresets, recentPresetIds],
  );

  const sections = useMemo(() => {
    const result: Array<{ title: string; presets: ComponentPreset[] }> = [];
    if (recentPresets.length > 0) {
      result.push({ title: "Recently Used", presets: recentPresets });
    }
    if (remainingPresets.length > 0) {
      result.push({
        title: recentPresets.length ? "All Patterns" : "Architecture Patterns",
        presets: remainingPresets,
      });
    }
    return result;
  }, [recentPresets, remainingPresets]);

  const handleToggleCollapsed = useCallback(() => {
    setCollapsed((previous) => !previous);
  }, []);

  const handleSelectPreset = useCallback(
    (preset: ComponentPreset, position?: { x: number; y: number }) => {
      setContextMenu(null);
      trackPresetUsage(preset.id);
      if (!isBrowser) return;

      const detail: AddPresetDetail = { presetId: preset.id };
      if (position) {
        detail.position = position;
      }

      window.dispatchEvent(new CustomEvent<AddPresetDetail>("canvas:add-preset", { detail }));
    },
    [trackPresetUsage],
  );

  const handleCardClick = useCallback(
    (preset: ComponentPreset) => {
      handleSelectPreset(preset);
    },
    [handleSelectPreset],
  );

  const handleCardContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, preset: ComponentPreset) => {
      event.preventDefault();
      if (!isBrowser) {
        setContextMenu({
          presetId: preset.id,
          menuX: event.clientX,
          menuY: event.clientY,
          pointerX: event.clientX,
          pointerY: event.clientY,
        });
        return;
      }

      const estimatedWidth = 200;
      const estimatedHeight = 96;
      const padding = 12;

      let menuX = event.clientX;
      let menuY = event.clientY;

      if (menuX + estimatedWidth > window.innerWidth - padding) {
        menuX = window.innerWidth - estimatedWidth - padding;
      }
      if (menuY + estimatedHeight > window.innerHeight - padding) {
        menuY = window.innerHeight - estimatedHeight - padding;
      }

      setContextMenu({
        presetId: preset.id,
        menuX: Math.max(padding, menuX),
        menuY: Math.max(padding, menuY),
        pointerX: event.clientX,
        pointerY: event.clientY,
      });
    },
    [],
  );

  const handleCardDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, preset: ComponentPreset) => {
      setContextMenu(null);
      setDraggingId(preset.id);

      if (!event.dataTransfer) return;

      event.dataTransfer.effectAllowed = "copy";
      const payload = JSON.stringify({ presetId: preset.id });

      try {
        event.dataTransfer.setData("application/x-archicomm-preset", payload);
      } catch {
        // Ignore unsupported MIME types
      }
      event.dataTransfer.setData("text/plain", preset.id);

      const target = event.currentTarget;
      if (event.dataTransfer.setDragImage && target instanceof HTMLElement) {
        event.dataTransfer.setDragImage(target, target.clientWidth / 2, target.clientHeight / 2);
      }
    },
    [],
  );

  const handleCardDragEnd = useCallback(
    (event: React.DragEvent<HTMLDivElement>, preset: ComponentPreset) => {
      setDraggingId(null);
      if (event.dataTransfer && event.dataTransfer.dropEffect !== "none") {
        trackPresetUsage(preset.id);
      }
    },
    [trackPresetUsage],
  );

  const handleContextMenuAction = useCallback(
    (action: "center" | "cursor") => {
      if (!contextMenu) return;
      const preset = componentPresets.find((item) => item.id === contextMenu.presetId);
      if (!preset) {
        setContextMenu(null);
        return;
      }

      const position =
        action === "cursor"
          ? { x: contextMenu.pointerX, y: contextMenu.pointerY }
          : undefined;

      handleSelectPreset(preset, position);
    },
    [contextMenu, handleSelectPreset],
  );

  useEffect(() => {
    if (!contextMenu || !isBrowser) return;

    const closeMenu = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest("[data-archicomm-context-menu]")) return;
      closeMenu();
    };

    window.addEventListener("blur", closeMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleClick);

    return () => {
      window.removeEventListener("blur", closeMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleClick);
    };
  }, [contextMenu]);

  const filteredCount = filteredPresets.length;

  return (
    <div className="flex h-full flex-col border-t border-border bg-card/30">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Boxes className="h-3.5 w-3.5" />
          </div>
          <span className="hidden text-xs font-semibold uppercase tracking-wide sm:block">
            Architecture Patterns
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Badge
            variant="secondary"
            className="hidden h-5 items-center justify-center px-2 text-[10px] sm:inline-flex"
          >
            {filteredCount}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleToggleCollapsed}
            aria-label={collapsed ? "Expand architecture patterns" : "Collapse architecture patterns"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border/40 px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search patterns..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-3 pb-6">
              {sections.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border/60 bg-card/50 text-center text-xs text-muted-foreground">
                  No architecture patterns match your search.
                </div>
              ) : (
                sections.map((section) => (
                  <div key={section.title}>
                    {sections.length > 1 && (
                      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                        <span>{section.title}</span>
                        <span>{section.presets.length}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {section.presets.map((preset) => (
                        <PresetCard
                          key={preset.id}
                          preset={preset}
                          icon={getPresetIcon(preset.icon)}
                          isDragging={draggingId === preset.id}
                          onSelect={handleCardClick}
                          onContextMenu={handleCardContextMenu}
                          onDragStart={handleCardDragStart}
                          onDragEnd={handleCardDragEnd}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {contextMenu && isBrowser
        ? createPortal(
            <div
              data-archicomm-context-menu
              className="fixed z-[9999]"
              style={{ left: contextMenu.menuX, top: contextMenu.menuY }}
              onClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.preventDefault()}
            >
              <div className="min-w-[180px] rounded-md border border-border bg-card/95 p-1 text-xs shadow-lg backdrop-blur">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1"
                  onClick={() => handleContextMenuAction("center")}
                >
                  <span>Insert at center</span>
                  <span className="text-[10px] uppercase text-muted-foreground">Enter</span>
                </button>
                <button
                  type="button"
                  className="mt-1 flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1"
                  onClick={() => handleContextMenuAction("cursor")}
                >
                  <span>Insert at cursor</span>
                  <span className="text-[10px] uppercase text-muted-foreground">Shift+Enter</span>
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}