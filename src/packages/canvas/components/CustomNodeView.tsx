/**
 * src/features/canvas/components/CustomNodeView.tsx
 * Pure presentation component for rendering node UI without business logic
 * Receives all data and handlers from useNodePresenter hook following presenter pattern
 * RELEVANT FILES: CustomNode.tsx, useNodePresenter.ts, component-styles.ts, ComponentIcon.tsx
 */

import { Handle, Position } from "@xyflow/react";
import { Suspense, memo } from "react";
import { getComponentIcon } from "../../../lib/design/component-icons";
import { cx } from "../../../lib/design/design-system";
import type { DesignComponent } from "../../../shared/contracts";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "../../ui/components/ui/context-menu";
import type { UseNodePresenterResult } from "../hooks/useNodePresenter";
import type { CustomNodeData } from "../types";
import { getHealthIndicator } from "../utils/component-styles";

function defaultStickerForType(type: string): string {
  const map: Record<string, string> = {
    "api-gateway": "🚀",
    "load-balancer": "🎯",
    server: "🧩",
    microservice: "📦",
    database: "🧪",
    postgresql: "🧪",
    mongodb: "🧪",
    cache: "⚡",
    redis: "⚡",
    "message-queue": "🌈",
    monitoring: "📈",
    security: "🛡️",
  };
  return map[type] || "⭐";
}

// Component Icon utility - keeping it local as it's simple
const ComponentIcon = ({
  type,
  className,
}: {
  type: DesignComponent["type"];
  className?: string;
}) => {
  const iconMapping = getComponentIcon(type);
  const IconComponent = iconMapping.icon;

  return <IconComponent className={className} />;
};

interface CustomNodeViewProps {
  presenter: UseNodePresenterResult;
  nodeData: CustomNodeData;
  selected: boolean;
}

function CustomNodeViewInner({
  presenter,
  nodeData,
  selected,
}: CustomNodeViewProps) {
  const { state, actions, computed } = presenter;
  const {
    component,
    isSelected,
    isMultiSelected = false,
    isVisible = true,
    connectionCount = 0,
    healthStatus: healthStatusProp,
    onDuplicate,
    onBringToFront,
    onSendToBack,
    onCopy,
    onShowProperties,
    onDelete,
    visualTheme = "serious",
  } = nodeData;
  const playful = visualTheme === "playful";

  // Hide component if not visible
  if (!isVisible) {
    return null;
  }

  // Get icon info for background color
  const iconInfo = getComponentIcon(component.type);
  // Create visible background color class based on icon color
  const getSubtleBackgroundColor = (colorClass: string) => {
    // Extract color name and create a more visible variant
    const colorMatch = colorClass.match(/bg-(\w+)-(\d+)/);
    if (colorMatch) {
      const [, color, intensity] = colorMatch;
      return `bg-${color}-100/60`; // More visible background with higher opacity
    }
    return "bg-gray-100/60"; // fallback
  };
  const customHex = (component.properties as any)?.bgHex as string | undefined;
  const bodyBgHex = (component.properties as any)?.bodyBgHex as
    | string
    | undefined;
  const subtleHeaderBg = customHex
    ? ""
    : getSubtleBackgroundColor(iconInfo.color);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={cx(
            "w-56 h-36 cursor-move group canvas-component touch-friendly relative overflow-hidden",
            "border-2 border-gray-900 bg-white shadow-lg", // High contrast black border, white background
            selected || state.visualState.isSelected
              ? "border-black shadow-2xl ring-4 ring-gray-300"
              : "border-gray-800 shadow-md hover:shadow-xl",
            "transition-all duration-200 hover:shadow-2xl hover:border-black",
            playful ? "hover:scale-105" : ""
          )}
          onMouseEnter={actions.handleMouseEnter}
          onMouseLeave={actions.handleMouseLeave}
        >
          <div
            className={cx(
              "w-full h-full rounded-lg bg-white border border-gray-900",
              playful ? "ring-2 ring-gray-400" : ""
            )}
            style={bodyBgHex ? { background: bodyBgHex } : undefined}
          >
            <div
              className={cx(
                "w-full h-12 rounded-t-lg flex items-center justify-between px-3 text-white shadow-md relative",
                "border-b border-gray-300 bg-gray-900", // High contrast black header
                playful
                  ? "overflow-hidden bg-gradient-to-r from-gray-800 to-gray-900"
                  : ""
              )}
            >
              {/* Background overlay */}
              {customHex && (
                <div
                  className="absolute inset-0 opacity-75"
                  style={{ background: customHex }}
                />
              )}
              {playful && (
                <div
                  className="absolute inset-0 opacity-70"
                  style={{
                    background:
                      "linear-gradient(120deg, hsla(280,90%,60%,0.25), hsla(200,90%,60%,0.25), hsla(340,90%,60%,0.25))",
                    backgroundSize: "200% 200%",
                    animation: "archiGradientShift 6s ease-in-out infinite",
                  }}
                />
              )}

              {/* Subtle glass effect */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

              {/* Icon container - larger and more prominent */}
              <Suspense
                fallback={
                  <div className="w-8 h-8 rounded-lg bg-white/40 animate-pulse" />
                }
              >
                <div
                  className={cx(
                    "w-8 h-8 rounded-lg flex items-center justify-center shadow-md relative z-10",
                    "bg-white border-2 border-gray-600", // White background with dark border
                    playful ? "ring-2 ring-gray-400 animate-pulse" : "",
                    "transform hover:scale-110 transition-transform duration-200"
                  )}
                >
                  <ComponentIcon
                    type={component.type}
                    className="w-5 h-5 text-gray-900 drop-shadow-sm"
                  />
                </div>
              </Suspense>

              {/* Component title - in header now */}
              <div className="flex-1 mx-3 relative z-10">
                <div
                  className={cx(
                    "text-sm font-bold text-white truncate",
                    "drop-shadow-sm"
                  )}
                >
                  {component.label ||
                    `${component.type.charAt(0).toUpperCase() + component.type.slice(1).replace(/-/g, " ")}`}
                </div>
                {component.description && (
                  <div className="text-xs text-white/80 truncate">
                    {component.description}
                  </div>
                )}
              </div>

              {/* Health status indicator - more prominent */}
              <div className="text-sm opacity-95 relative z-10 flex items-center">
                {getHealthIndicator(healthStatusProp || state.healthStatus)}
              </div>
            </div>
            <div className="px-3 py-2 text-center relative flex-1 flex flex-col justify-center bg-white">
              {/* Component metadata and status */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
                {component.properties?.version && (
                  <span className="px-2 py-1 bg-white rounded-full border border-gray-800 text-gray-900 font-medium">
                    v{component.properties.version}
                  </span>
                )}
                {connectionCount > 0 && (
                  <span className="px-2 py-1 bg-white rounded-full border border-gray-800 text-gray-900 font-medium flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-gray-900" />
                    {connectionCount}
                  </span>
                )}
              </div>

              {/* Playful sparkles on hover */}
              {playful && state.isHovered && (
                <div className="pointer-events-none absolute inset-0">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        position: "absolute",
                        left: `${((i * 17) % 90) + 5}%`,
                        top: `${10 + ((i * 7) % 60)}%`,
                        width: 4,
                        height: 4,
                        borderRadius: 999,
                        background: [
                          "#f59e0b",
                          "#22c55e",
                          "#3b82f6",
                          "#a855f7",
                        ][i % 4],
                        opacity: 0.8,
                        animation: `archiSparkle ${900 + i * 60}ms ease-out ${i * 40}ms both`,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Playful sticker badge */}
              {((component.properties as any)?.sticker ||
                (component.properties as any)?.stickerEmoji ||
                (playful &&
                  !((component.properties as any)?.sticker === false))) && (
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center border-2 border-primary/20">
                  <span role="img" aria-label="sticker" className="text-lg">
                    {(component.properties as any)?.stickerEmoji ||
                      defaultStickerForType(component.type)}
                  </span>
                </div>
              )}

              {/* Enhanced status indicators */}
              {isMultiSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-500 shadow-lg ring-2 ring-white/50 flex items-center justify-center animate-pulse">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* React Flow Handles for connection points */}
          {/* React Flow Handles for connection points - Enhanced for better visibility */}
          <Handle
            type="target"
            position={Position.Top}
            id="top"
            className={cx(
              "w-5 h-5 rounded-full cursor-crosshair border-3 border-gray-900 bg-white shadow-lg transition-all duration-200 nodrag",
              "hover:bg-gray-100 hover:shadow-xl hover:scale-125 hover:border-black",
              isSelected || state.visualState.isConnectionStart
                ? "opacity-100 scale-125 bg-gray-200 ring-4 ring-gray-400/50 border-black"
                : "opacity-60 group-hover:opacity-100 group-hover:scale-110",
              playful ? "animate-pulse" : ""
            )}
            style={{
              top: "-10px",
              boxShadow:
                "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              actions.handleStartConnection("top");
            }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="bottom"
            className={cx(
              "w-5 h-5 rounded-full cursor-crosshair border-3 border-gray-900 bg-white shadow-lg transition-all duration-200 nodrag",
              "hover:bg-gray-100 hover:shadow-xl hover:scale-125 hover:border-black",
              isSelected || state.visualState.isConnectionStart
                ? "opacity-100 scale-125 bg-gray-200 ring-4 ring-gray-400/50 border-black"
                : "opacity-60 group-hover:opacity-100 group-hover:scale-110",
              playful ? "animate-pulse" : ""
            )}
            style={{
              bottom: "-10px",
              boxShadow:
                "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              actions.handleStartConnection("bottom");
            }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="left"
            className={cx(
              "w-5 h-5 rounded-full cursor-crosshair border-3 border-gray-900 bg-white shadow-lg transition-all duration-200 nodrag",
              "hover:bg-gray-100 hover:shadow-xl hover:scale-125 hover:border-black",
              isSelected || state.visualState.isConnectionStart
                ? "opacity-100 scale-125 bg-gray-200 ring-4 ring-gray-400/50 border-black"
                : "opacity-60 group-hover:opacity-100 group-hover:scale-110",
              playful ? "animate-pulse" : ""
            )}
            style={{
              left: "-10px",
              boxShadow:
                "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              actions.handleStartConnection("left");
            }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            className={cx(
              "w-5 h-5 rounded-full cursor-crosshair border-3 border-gray-900 bg-white shadow-lg transition-all duration-200 nodrag",
              "hover:bg-gray-100 hover:shadow-xl hover:scale-125 hover:border-black",
              isSelected || state.visualState.isConnectionStart
                ? "opacity-100 scale-125 bg-gray-200 ring-4 ring-gray-400/50 border-black"
                : "opacity-60 group-hover:opacity-100 group-hover:scale-110",
              playful ? "animate-pulse" : ""
            )}
            style={{
              right: "-10px",
              boxShadow:
                "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              actions.handleStartConnection("right");
            }}
          />
        </div>
      </ContextMenuTrigger>
      {playful && (
        <style>{`
          @keyframes archiGradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes archiSparkle {
            0% { transform: translateY(0) scale(0.8); opacity: 0.0; }
            20% { opacity: 0.9; }
            100% { transform: translateY(-10px) scale(1); opacity: 0; }
          }
        `}</style>
      )}
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onShowProperties?.(component.id)}>
          Edit Properties
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDuplicate?.(component.id)}>
          Duplicate
          <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onCopy?.(component.id)}>
          Copy
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onBringToFront?.(component.id)}>
          Bring to Front
          <ContextMenuShortcut>Ctrl+Shift+]</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onSendToBack?.(component.id)}>
          Send to Back
          <ContextMenuShortcut>Ctrl+Shift+[</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => onDelete?.(component.id)}
          className="text-destructive focus:text-destructive"
        >
          Delete
          <ContextMenuShortcut>Del</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Shallow comparison function to prevent unnecessary re-renders
const arePropsEqual = (
  prevProps: CustomNodeViewProps,
  nextProps: CustomNodeViewProps
): boolean => {
  // Compare basic props
  if (prevProps.selected !== nextProps.selected) return false;

  // Compare nodeData shallow
  const prevData = prevProps.nodeData;
  const nextData = nextProps.nodeData;
  if (
    prevData.component.id !== nextData.component.id ||
    prevData.component.label !== nextData.component.label ||
    prevData.component.type !== nextData.component.type ||
    prevData.isSelected !== nextData.isSelected ||
    prevData.isMultiSelected !== nextData.isMultiSelected ||
    prevData.isConnectionStart !== nextData.isConnectionStart ||
    prevData.healthStatus !== nextData.healthStatus
  ) {
    return false;
  }

  // For presenter, we rely on the useMemo optimization in useNodePresenter
  // to provide stable references, so we can do reference equality check
  return prevProps.presenter === nextProps.presenter;
};

export const CustomNodeView = memo(CustomNodeViewInner, arePropsEqual);

// Set displayName for better debugging
CustomNodeView.displayName = "CustomNodeView";
