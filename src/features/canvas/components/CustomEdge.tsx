/**
 * src/features/canvas/components/CustomEdge.tsx
 * Custom React Flow edge component that replicates ConnectionSvgLayer functionality
 * Supports different connection styles, colors, labels, and click handling
 * RELEVANT FILES: ConnectionSvgLayer.tsx, connection-paths.ts, rf-adapters.ts
 */

import React, { useMemo, useId } from 'react';
import { 
  BaseEdge, 
  EdgeProps, 
  getBezierPath, 
  getSmoothStepPath, 
  getStraightPath,
  EdgeLabelRenderer
} from 'reactflow';
import type { Connection } from '@/shared/contracts';

interface CustomEdgeData {
  connection: Connection;
  connectionStyle: 'straight' | 'curved' | 'stepped';
  isSelected: boolean;
  isStartConnection: boolean;
  onConnectionSelect: (id: string | null, x?: number, y?: number) => void;
}

export interface CustomEdgeProps extends EdgeProps {
  data: CustomEdgeData;
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}: CustomEdgeProps) {
  const uniqueId = useId();
  const arrowId = `arrow-${uniqueId}`;
  const glowId = `glow-${uniqueId}`;

  const {
    connection,
    connectionStyle,
    isSelected,
    isStartConnection,
    onConnectionSelect
  } = data;

  // Connection colors mapping
  const connectionColors = useMemo(() => ({
    data: 'hsl(var(--blue-500))',
    control: 'hsl(var(--purple-500))',
    sync: 'hsl(var(--green-500))',
    async: 'hsl(var(--orange-500))'
  }), []);

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
      case 'straight':
        return getStraightPath(pathParams);
      case 'stepped':
        return getSmoothStepPath({ ...pathParams, borderRadius: 0 });
      case 'curved':
      default:
        return getBezierPath(pathParams);
    }
  }, [sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, connectionStyle]);

  // Edge styling
  const color = connectionColors[connection.type as keyof typeof connectionColors] || 'hsl(var(--primary))';
  const strokeDasharray = connection.type === 'async' ? '5,5' : undefined;
  const strokeWidth = isSelected ? 3 : 2;
  const opacity = isStartConnection ? 0.5 : 1;

  // Handle edge click
  const handleEdgeClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onConnectionSelect(connection.id, labelX, labelY);
  };

  return (
    <>
      {/* SVG Definitions for markers and filters */}
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
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: color,
          strokeWidth,
          strokeDasharray,
          opacity,
          filter: isSelected ? `url(#${glowId})` : undefined,
          cursor: 'pointer'
        }}
        markerEnd={`url(#${arrowId})`}
        onClick={handleEdgeClick}
        className={isSelected ? 'transition-all duration-200' : 'transition-all duration-200'}
      />

      {/* Edge label using EdgeLabelRenderer for proper positioning */}
      {connection.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="cursor-pointer select-none"
            onClick={handleEdgeClick}
          >
            <div
              className={`
                px-3 py-1 rounded bg-background/90 border border-border text-xs
                ${isSelected ? 'border-2 shadow-lg' : 'border-1'}
                transition-all duration-200
              `}
              style={{
                filter: isSelected ? `url(#${glowId})` : undefined,
              }}
            >
              {connection.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Export default for React Flow edge types registration
export default CustomEdge;