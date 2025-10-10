import { useMemo } from "react";
import type { CSSProperties } from "react";
import { MessageSquare, Pencil, X } from "lucide-react";
import { cn } from "@/lib/design/design-system";
import type { CanvasMode } from "@/stores/canvasStore";

interface ModeIndicatorProps {
  mode: CanvasMode;
  onExit?: () => void;
  className?: string;
  style?: CSSProperties;
}

const MODE_COPY: Partial<
  Record<
    CanvasMode,
    {
      label: string;
      instruction: string;
      accent: string;
      Icon: typeof Pencil;
    }
  >
> = {
  draw: {
    label: "Drawing mode",
    instruction: "Click and drag to draw. Press ESC to exit.",
    accent: "bg-purple-500",
    Icon: Pencil,
  },
  annotation: {
    label: "Annotation mode",
    instruction: "Click anywhere to place an annotation. Press ESC to exit.",
    accent: "bg-blue-500",
    Icon: MessageSquare,
  },
};

export const ModeIndicator: React.FC<ModeIndicatorProps> = ({
  mode,
  onExit,
  className,
  style,
}) => {
  const config = useMemo(() => MODE_COPY[mode], [mode]);

  if (!config) {
    return null;
  }

  const { label, instruction, accent, Icon } = config;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-white/20 px-4 py-2.5 text-white shadow-lg",
        "backdrop-blur-sm",
        accent,
        className,
      )}
      role="status"
      aria-live="polite"
      style={style}
    >
      <Icon size={18} aria-hidden="true" className="flex-shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold leading-none">{label}</span>
        <span className="text-xs leading-tight opacity-90">{instruction}</span>
      </div>
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="ml-2 rounded p-1 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          aria-label="Exit mode"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

ModeIndicator.displayName = "ModeIndicator";
