/**
 * src/features/canvas/components/CustomEdge.tsx
 * Custom React Flow edge component that replicates ConnectionSvgLayer functionality
 * Supports different connection styles, colors, labels, and click handling
 * RELEVANT FILES: ConnectionSvgLayer.tsx, connection-paths.ts, rf-adapters.ts
 */

import type { Connection } from "@/shared/contracts";
import { useStableStyleEx } from "@/shared/hooks/useStableLiterals";
import { createHotLeafComponent } from "@/shared/utils/hotLeafMemoization";
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
} from "@xyflow/react";
import React, { useId, useMemo } from "react";

interface CustomEdgeData {
  connection: Connection;
  connectionStyle: "straight" | "curved" | "stepped";
  isSelected: boolean;
  isStartConnection: boolean;
  onConnectionSelect: (id: string | null, x?: number, y?: number) => void;
}

export interface CustomEdgeProps extends EdgeProps {
  data: CustomEdgeData;
}

function CustomEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: CustomEdgeProps) {
  const uniqueId = useId();
  const arrowId = `arrow-${uniqueId}`;
  const glowId = `glow-${uniqueId}`;

  const {
    connection,
    connectionStyle,
    isSelected,
    isStartConnection,
    onConnectionSelect,
  } = data;

  // Connection colors mapping - High contrast black/white theme
  const connectionColors = useMemo(
    () => ({
      data: "#374151", // gray-700 - High contrast
      control: "#1f2937", // gray-800 - Darker for control flows
      sync: "#111827", // gray-900 - Darkest for sync
      async: "#4b5563", // gray-600 - Medium for async
    }),
    []
  );

  // Visual style colors for queue message flows - High contrast
  const visualStyleColors = useMemo(
    () => ({
      default: null, // Use connection type color
      ack: "#059669", // emerald-600 - Dark green for success
      retry: "#ea580c", // orange-600 - Dark orange for retry
      error: "#dc2626", // red-600 - Dark red for error
    }),
    []
  );

  // Generate the appropriate path based on connection style
  const [edgePath, labelX, labelY] = useMemo(() => {
    const pathParams = {
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    };

    switch (connectionStyle) {
      case "straight":
        return getStraightPath(pathParams);
      case "stepped":
        return getSmoothStepPath({ ...pathParams, borderRadius: 0 });
      case "curved":
      default:
        return getBezierPath(pathParams);
    }
  }, [
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    connectionStyle,
  ]);

  // Edge styling
  const visualStyleColor = connection.visualStyle
    ? visualStyleColors[
        connection.visualStyle as keyof typeof visualStyleColors
      ]
    : null;

  const color =
    visualStyleColor ||
    connectionColors[connection.type as keyof typeof connectionColors] ||
    "#3b82f6";

  // Determine stroke dash array based on visual style and connection type
  const getStrokeDashArray = () => {
    if (connection.visualStyle && connection.visualStyle !== "default") {
      return "8,4"; // Dashed lines for queue message flows (ACK, retry, error)
    }
    return connection.type === "async" ? "5,5" : undefined;
  };

  const strokeDasharray = getStrokeDashArray();
  const strokeWidth = isSelected ? 4 : 3; // Thicker lines for better visibility
  const opacity = isStartConnection ? 0.6 : 1; // Better contrast for connection preview

  // Stable styles for better performance
  const svgContainerStyle = useStableStyleEx(
    () => ({ position: "absolute" as const }),
    []
  );

  const edgeStyle = useStableStyleEx(
    () => ({
      ...style,
      stroke: color,
      strokeWidth,
      strokeDasharray,
      opacity,
      strokeOpacity: 1,
      fill: "none",
      vectorEffect: "non-scaling-stroke" as const,
      filter: isSelected ? `url(#${glowId})` : undefined,
      cursor: "pointer" as const,
    }),
    [style, color, strokeWidth, strokeDasharray, opacity, isSelected, glowId]
  );

  const labelContainerStyle = useStableStyleEx(
    () => ({
      position: "absolute" as const,
      transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
      pointerEvents: "all" as const,
    }),
    [labelX, labelY]
  );

  const labelStyle = useStableStyleEx(
    () => ({
      filter: isSelected ? `url(#${glowId})` : undefined,
    }),
    [isSelected, glowId]
  );

  // Handle edge click
  const handleEdgeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onConnectionSelect(connection.id, labelX, labelY);
  };

  return (
    <>
      {/* SVG Definitions for markers and filters */}
      <svg width="0" height="0" style={svgContainerStyle}>
        <defs>
          <marker
            id={arrowId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerUnits="strokeWidth"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>

          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={`url(#${arrowId})`}
        onClick={handleEdgeClick}
        className={
          isSelected
            ? "transition-all duration-200"
            : "transition-all duration-200"
        }
      />

      {/* Edge label using EdgeLabelRenderer for proper positioning */}
      {connection.label && (
        <EdgeLabelRenderer>
          <div
            style={labelContainerStyle}
            className="cursor-pointer select-none"
            onClick={handleEdgeClick}
          >
            <div
              className={`
                px-3 py-1 rounded bg-background/90 border border-border text-xs
                ${isSelected ? "border-2 shadow-lg" : "border-1"}
                transition-all duration-200
              `}
              style={labelStyle}
            >
              {connection.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Custom equality function for edge props
const edgePropsEquality = (
  prev: CustomEdgeProps,
  next: CustomEdgeProps
): boolean => {
  // Check critical edge properties
  if (prev.id !== next.id) return false;
  if (prev.sourceX !== next.sourceX || prev.sourceY !== next.sourceY)
    return false;
  if (prev.targetX !== next.targetX || prev.targetY !== next.targetY)
    return false;
  if (
    prev.sourcePosition !== next.sourcePosition ||
    prev.targetPosition !== next.targetPosition
  )
    return false;

  // Check data properties that affect rendering
  if (prev.data.connection.id !== next.data.connection.id) return false;
  if (prev.data.connectionStyle !== next.data.connectionStyle) return false;
  if (prev.data.isSelected !== next.data.isSelected) return false;
  if (prev.data.isStartConnection !== next.data.isStartConnection) return false;
  if (prev.data.connection.type !== next.data.connection.type) return false;
  if (prev.data.connection.label !== next.data.connection.label) return false;
  if (prev.data.connection.visualStyle !== next.data.connection.visualStyle)
    return false;

  // Check other props
  if (prev.markerEnd !== next.markerEnd) return false;

  return true;
};

// Create optimized edge component with hot-leaf memoization
export const CustomEdge = createHotLeafComponent(CustomEdgeInner, {
  equalityFn: edgePropsEquality,
  trackPerformance: true,
  displayName: "CustomEdge",
  debugMode: import.meta.env.DEV,
  frequencyThreshold: 10, // Edges can re-render frequently during interactions
});

// Export default for React Flow edge types registration
export default CustomEdge;
