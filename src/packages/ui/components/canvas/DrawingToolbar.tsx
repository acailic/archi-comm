/**
 * File: src/packages/ui/components/canvas/DrawingToolbar.tsx
 * Purpose: Toolbar component for drawing tools, colors, and stroke settings
 * Why: Provides intuitive drawing controls similar to annotation toolbar
 * Related: AnnotationToolbar.tsx, drawing-utils.ts, canvasStore.ts
 */

import * as Popover from "@radix-ui/react-popover";
import * as Slider from "@radix-ui/react-slider";
import { Eraser, Highlighter, Pencil, Trash2 } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { cx } from "../../../../lib/design/design-system";
import type { DrawingTool } from "../../../../shared/contracts";

interface DrawingToolbarProps {
  selectedTool: DrawingTool;
  onToolSelect: (tool: DrawingTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  size: number;
  onSizeChange: (size: number) => void;
  strokeCount?: number;
  onClearAll?: () => void;
  className?: string;
}

const PRESET_COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Purple", value: "#a855f7" },
  { name: "Orange", value: "#f97316" },
  { name: "White", value: "#ffffff" },
];

const DRAWING_TOOLS = [
  {
    id: "pen" as const,
    icon: Pencil,
    label: "Pen (P)",
    tooltip: "Draw with pen tool",
  },
  {
    id: "eraser" as const,
    icon: Eraser,
    label: "Eraser (E)",
    tooltip: "Erase strokes",
  },
  {
    id: "highlighter" as const,
    icon: Highlighter,
    label: "Highlighter (H)",
    tooltip: "Highlight with semi-transparent strokes",
  },
];

const SIZE_PRESETS = [
  { label: "Thin", value: 2 },
  { label: "Medium", value: 4 },
  { label: "Thick", value: 8 },
  { label: "Extra Thick", value: 12 },
];

/**
 * Drawing toolbar component
 */
const DrawingToolbarComponent: React.FC<DrawingToolbarProps> = ({
  selectedTool,
  onToolSelect,
  color,
  onColorChange,
  size,
  onSizeChange,
  strokeCount = 0,
  onClearAll,
  className,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleToolSelect = useCallback(
    (tool: DrawingTool) => {
      onToolSelect(tool);
    },
    [onToolSelect],
  );

  const handleColorSelect = useCallback(
    (newColor: string) => {
      onColorChange(newColor);
    },
    [onColorChange],
  );

  const handleSizeChange = useCallback(
    (values: number[]) => {
      onSizeChange(values[0]);
    },
    [onSizeChange],
  );

  const handleClearAll = useCallback(() => {
    if (onClearAll) {
      setShowClearConfirm(true);
    }
  }, [onClearAll]);

  const confirmClearAll = useCallback(() => {
    if (onClearAll) {
      onClearAll();
    }
    setShowClearConfirm(false);
  }, [onClearAll]);

  return (
    <div
      className={cx(
        "flex items-center gap-3 p-3 bg-white border-2 border-gray-900 rounded-lg shadow-lg",
        className,
      )}
    >
      {/* Tool Selection */}
      <div className="flex items-center gap-1">
        {DRAWING_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = selectedTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => handleToolSelect(tool.id)}
              className={cx(
                "flex items-center justify-center w-9 h-9 rounded-md border-2 transition-all duration-200",
                isActive
                  ? "bg-blue-500 border-blue-600 text-white shadow-md"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400",
              )}
              title={tool.tooltip}
              aria-label={tool.label}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}

        {/* Exit drawing mode */}
        <button
          onClick={() => handleToolSelect(null)}
          className={cx(
            "flex items-center justify-center w-9 h-9 rounded-md border-2 transition-all duration-200",
            selectedTool === null
              ? "bg-blue-500 border-blue-600 text-white shadow-md"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400",
          )}
          title="Exit drawing mode"
          aria-label="Exit drawing mode"
        >
          ×
        </button>
      </div>

      {/* Color Picker */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-300 rounded-md hover:border-gray-400 transition-colors"
            title="Change color"
          >
            <div
              className="w-4 h-4 rounded border border-gray-400"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-medium">Color</span>
          </button>
        </Popover.Trigger>
        <Popover.Content
          className="p-3 bg-white border-2 border-gray-900 rounded-lg shadow-lg z-50"
          sideOffset={8}
        >
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor.value}
                onClick={() => handleColorSelect(presetColor.value)}
                className={cx(
                  "w-8 h-8 rounded border-2 transition-all duration-200",
                  color === presetColor.value
                    ? "border-blue-500 shadow-md scale-110"
                    : "border-gray-400 hover:border-gray-600",
                  presetColor.value === "#ffffff" && "border-gray-600",
                )}
                style={{ backgroundColor: presetColor.value }}
                title={presetColor.name}
                aria-label={`Select ${presetColor.name}`}
              />
            ))}
          </div>
        </Popover.Content>
      </Popover.Root>

      {/* Size Selector */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-gray-300 rounded-md hover:border-gray-400 transition-colors"
            title="Change stroke size"
          >
            <div className="flex items-center justify-center w-4 h-4">
              <div
                className="rounded-full bg-gray-700"
                style={{
                  width: `${Math.min(size / 2, 8)}px`,
                  height: `${Math.min(size / 2, 8)}px`,
                }}
              />
            </div>
            <span className="text-sm font-medium">{size}px</span>
          </button>
        </Popover.Trigger>
        <Popover.Content
          className="p-3 bg-white border-2 border-gray-900 rounded-lg shadow-lg z-50 w-48"
          sideOffset={8}
        >
          <div className="space-y-3">
            {/* Size Presets */}
            <div className="flex gap-1">
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => onSizeChange(preset.value)}
                  className={cx(
                    "px-2 py-1 text-xs rounded border transition-colors",
                    size === preset.value
                      ? "bg-blue-500 text-white border-blue-600"
                      : "bg-white border-gray-300 hover:border-gray-400",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Size Slider */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">
                Custom Size: {size}px
              </label>
              <Slider.Root
                className="relative flex items-center select-none touch-none w-full h-5"
                value={[size]}
                onValueChange={handleSizeChange}
                max={20}
                min={1}
                step={1}
              >
                <Slider.Track className="bg-gray-200 relative grow rounded-full h-2">
                  <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50" />
              </Slider.Root>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>

      {/* Stroke Count Badge */}
      {strokeCount > 0 && (
        <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
          {strokeCount} stroke{strokeCount !== 1 ? "s" : ""}
        </div>
      )}

      {/* Clear All */}
      <Popover.Root open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <Popover.Trigger asChild>
          <button
            onClick={handleClearAll}
            disabled={strokeCount === 0}
            className={cx(
              "flex items-center justify-center w-9 h-9 rounded-md border-2 transition-all duration-200",
              strokeCount === 0
                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400",
            )}
            title="Clear all drawings"
            aria-label="Clear all drawings"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </Popover.Trigger>
        <Popover.Content
          className="p-3 bg-white border-2 border-gray-900 rounded-lg shadow-lg z-50"
          sideOffset={8}
        >
          <div className="space-y-3">
            <p className="text-sm font-medium">Clear all drawings?</p>
            <p className="text-xs text-gray-600">
              This will permanently delete all {strokeCount} drawing
              {strokeCount !== 1 ? "s" : ""}.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmClearAll}
                className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Root>
    </div>
  );
};

export const DrawingToolbar = memo(DrawingToolbarComponent);
