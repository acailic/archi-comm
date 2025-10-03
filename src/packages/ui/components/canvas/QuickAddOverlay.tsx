import type { DesignComponent } from "@shared/contracts";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { componentIconMap } from "../../../../lib/design/component-icons";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";

type ComponentTypeId = DesignComponent["type"];

interface QuickAddOverlayProps {
  active: boolean;
  initialQuery?: string;
  anchorPosition?: { x: number; y: number };
  onAddComponent: (
    componentType: string,
    options?: { position?: { x: number; y: number }; keepOpen?: boolean },
  ) => void;
  onRequestClose: () => void;
}

interface ComponentOption {
  type: ComponentTypeId;
  label: string;
  keywords: string[];
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  colorClass: string;
}

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 420;
const RECENTS_KEY = "archicomm.quick-add.recents";
const MAX_RECENTS = 8;

const SPECIAL_LABELS: Record<string, string> = {
  "api-gateway": "API Gateway",
  "web-app": "Web App",
  "mobile-app": "Mobile App",
  "desktop-app": "Desktop App",
  "iot-device": "IoT Device",
  "ci-cd": "CI/CD Pipeline",
  "ai-ml": "AI/ML",
  "load-balancer": "Load Balancer",
  "message-queue": "Message Queue",
  "dead-letter-queue": "Dead Letter Queue",
  "service-registry": "Service Registry",
  "data-warehouse": "Data Warehouse",
  "data-lake": "Data Lake",
  "stream-processing": "Stream Processing",
  "rest-api": "REST API",
  grpc: "gRPC",
  s3: "AWS S3",
  "blob-storage": "Blob Storage",
};

const cn = (...classes: Array<string | null | undefined | false>) =>
  classes.filter(Boolean).join(" ");

const toTitleCase = (slug: string) =>
  slug
    .split("-")
    .map((segment) => {
      if (SPECIAL_LABELS[slug]) {
        return SPECIAL_LABELS[slug];
      }

      if (segment.length <= 3) {
        return segment.toUpperCase();
      }

      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");

const getStoredRecents = (): ComponentTypeId[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is ComponentTypeId => typeof item === "string",
      );
    }
  } catch {
    // ignore parsing errors
  }
  return [];
};

const persistRecents = (recents: ComponentTypeId[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {
    // ignore storage errors
  }
};

const computePanelPosition = (
  target: { x: number; y: number },
  dimensions: { width: number; height: number },
) => {
  if (typeof window === "undefined") {
    return { x: target.x, y: target.y };
  }

  const padding = 16;
  const { innerWidth, innerHeight } = window;

  let x = target.x + 12;
  let y = target.y + 12;

  if (x + dimensions.width + padding > innerWidth) {
    x = innerWidth - dimensions.width - padding;
  }
  if (y + dimensions.height + padding > innerHeight) {
    y = innerHeight - dimensions.height - padding;
  }

  x = Math.max(padding, x);
  y = Math.max(padding, y);

  return { x, y };
};

const QuickAddOverlay: React.FC<QuickAddOverlayProps> = ({
  active,
  initialQuery = "",
  anchorPosition,
  onAddComponent,
  onRequestClose,
}) => {
  const [mounted, setMounted] = useState(false);
  const [searchValue, setSearchValue] = useState(initialQuery);
  const [cursorPosition, setCursorPosition] = useState(
    anchorPosition ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 },
  );
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 });
  const [recentTypes, setRecentTypes] = useState<ComponentTypeId[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setRecentTypes(getStoredRecents());
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    persistRecents(recentTypes.slice(0, MAX_RECENTS));
  }, [recentTypes, mounted]);

  // Update search value when initialQuery changes
  useEffect(() => {
    if (active && initialQuery !== undefined) {
      setSearchValue(initialQuery);
      setHighlightIndex(0);
    }
  }, [active, initialQuery]);

  // Update cursor position when anchorPosition changes
  useEffect(() => {
    if (anchorPosition) {
      setCursorPosition(anchorPosition);
    }
  }, [anchorPosition]);

  // Track cursor position for component insertion
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!active) return; // Only track when overlay is active

    const handleMouseMove = (event: MouseEvent) => {
      setCursorPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [active]);

  const componentOptions = useMemo<ComponentOption[]>(() => {
    const entries: ComponentOption[] = Object.values(componentIconMap).map(
      (meta) => ({
        type: meta.type,
        label: SPECIAL_LABELS[meta.type] ?? toTitleCase(meta.type),
        keywords: [
          meta.type,
          (SPECIAL_LABELS[meta.type] ?? toTitleCase(meta.type)).toLowerCase(),
        ],
        icon: meta.icon,
        colorClass: meta.color,
      }),
    );

    return entries.sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const optionsMap = useMemo(
    () =>
      new Map<ComponentTypeId, ComponentOption>(
        componentOptions.map((option) => [option.type, option]),
      ),
    [componentOptions],
  );

  const recentOptions = useMemo(() => {
    return recentTypes
      .map((type) => optionsMap.get(type))
      .filter((option): option is ComponentOption => Boolean(option))
      .slice(0, MAX_RECENTS);
  }, [recentTypes, optionsMap]);

  const filteredOptions = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return componentOptions;

    const tokens = query.split(/\s+/).filter(Boolean);
    return componentOptions.filter((option) =>
      tokens.every((token) =>
        option.keywords.some((keyword) => keyword.includes(token)),
      ),
    );
  }, [searchValue, componentOptions]);

  // Reset highlight index when filtered options change
  useEffect(() => {
    if (!active) return;
    if (filteredOptions.length === 0) {
      setHighlightIndex(-1);
      return;
    }
    setHighlightIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= filteredOptions.length) return 0;
      return prev;
    });
  }, [filteredOptions, active]);

  // Calculate and set panel position when overlay becomes active
  useEffect(() => {
    if (!active) return;

    const target = anchorPosition ?? cursorPosition;
    const placement = computePanelPosition(target, {
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
    });

    setPanelPosition(placement);
  }, [active, anchorPosition, cursorPosition]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onRequestClose();
        return;
      }

      if (filteredOptions.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0,
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1,
        );
      } else if (event.key === "Enter") {
        if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
          event.preventDefault();
          const option = filteredOptions[highlightIndex];
          if (option) {
            handleAddComponent(option.type, false); // Don't keep open by default
          }
        }
      } else if (event.key === "Enter" && event.shiftKey) {
        // Shift+Enter keeps overlay open
        if (highlightIndex >= 0 && highlightIndex < filteredOptions.length) {
          event.preventDefault();
          const option = filteredOptions[highlightIndex];
          if (option) {
            handleAddComponent(option.type, true); // Keep open
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, onRequestClose, filteredOptions, highlightIndex]);

  // Handle clicks outside the overlay
  useEffect(() => {
    if (!active) return;
    const handleClick = (event: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        onRequestClose();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [active, onRequestClose]);

  // Focus input when overlay opens
  useEffect(() => {
    if (!active) return;
    const focusTimeout = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 16);
    return () => window.clearTimeout(focusTimeout);
  }, [active]);

  const handleComponentUsage = useCallback((componentType: ComponentTypeId) => {
    setRecentTypes((prev) => {
      const next = [
        componentType,
        ...prev.filter((item) => item !== componentType),
      ];
      return next.slice(0, MAX_RECENTS);
    });
  }, []);

  const handleAddComponent = useCallback(
    (componentType: ComponentTypeId, keepOpen: boolean = false) => {
      handleComponentUsage(componentType);

      // Call the parent's onAddComponent callback
      onAddComponent(componentType, {
        position: cursorPosition,
        keepOpen,
      });

      // Only close if not keeping open
      if (!keepOpen) {
        onRequestClose();
      } else {
        // Clear search and reset to show all components
        setSearchValue("");
        setHighlightIndex(0);
      }
    },
    [handleComponentUsage, onAddComponent, onRequestClose, cursorPosition],
  );

  if (!mounted || !active) return null;

  return createPortal(
    <div className="fixed inset-0 z-[2000] pointer-events-none">
      <div
        ref={panelRef}
        style={{
          left: panelPosition.x,
          top: panelPosition.y,
          width: PANEL_WIDTH,
        }}
        className={cn(
          "pointer-events-auto absolute",
          "rounded-2xl border border-white/10 bg-slate-900/80 text-slate-100 shadow-2xl backdrop-blur-xl",
          "transition-all duration-150 ease-out",
          "focus:outline-none",
        )}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300/70">
              Quick Add
            </p>
            <p className="text-sm font-semibold text-slate-100">Components</p>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-slate-300">
            ESC to close
          </span>
        </div>

        {recentOptions.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Recently Used
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.type}
                    title={option.label}
                    onClick={() => handleAddComponent(option.type, false)}
                    className={cn(
                      "group relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10",
                      "bg-slate-800/80 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/20 hover:text-primary",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                    )}
                    type="button"
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="px-4 pt-4">
          <Input
            ref={inputRef}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search components..."
            className="h-10 border-white/10 bg-slate-900/70 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:ring-primary/60"
          />
        </div>

        <ScrollArea className="mt-3 max-h-[240px] px-2 pb-3">
          <div
            role="listbox"
            aria-activedescendant={
              highlightIndex >= 0
                ? `quick-add-option-${highlightIndex}`
                : undefined
            }
          >
            {filteredOptions.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                No components found.
              </div>
            )}

            {filteredOptions.map((option, index) => {
              const Icon = option.icon;
              const isActive = index === highlightIndex;
              return (
                <button
                  key={option.type}
                  id={`quick-add-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setHighlightIndex(index)}
                  onClick={() => handleAddComponent(option.type, false)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                    "transition-colors duration-150 focus:outline-none",
                    isActive
                      ? "border border-primary/40 bg-primary/15 text-primary"
                      : "border border-transparent hover:border-white/10 hover:bg-white/5",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-slate-900/70 text-slate-200",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs uppercase tracking-wider text-slate-400">
                      {option.type.replace(/-/g, " ")}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 opacity-0 transition-opacity group-hover:opacity-80">
                    Enter
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>,
    document.body,
  );
};

export default QuickAddOverlay;
