/**
 * src/features/canvas/components/ConnectionSvgLayer.tsx
 * Component for rendering SVG connection lines between components
 * Handles different connection styles and visual states
 * RELEVANT FILES: CanvasArea.tsx, connection-paths.ts, component-styles.ts
 */

import type { Connection, DesignComponent } from '@/shared/contracts';
import { useMemo } from 'react';
import { getConnectionPath } from '../utils/connection-paths';

interface ConnectionSvgLayerProps {
  connections: Connection[];
  components: DesignComponent[];
  connectionStyle: 'straight' | 'curved' | 'stepped';
  selectedConnection: string | null;
  connectionStart: string | null;
  onConnectionSelect: (id: string, x: number, y: number) => void;
}

export function ConnectionSvgLayer({
  connections,
  components,
  connectionStyle,
  selectedConnection,
  connectionStart,
  onConnectionSelect
}: ConnectionSvgLayerProps) {
  const connectionColors = useMemo(() => ({
    data: 'hsl(var(--blue-500))',
    control: 'hsl(var(--purple-500))',
    sync: 'hsl(var(--green-500))',
    async: 'hsl(var(--orange-500))'
  }), []);

  return (
    <svg
      className="absolute inset-0 pointer-events-auto"
      width="100%"
      height="100%"
      onClick={(e) => {
        // Deselect when clicking empty space
        if (e.target === e.currentTarget) {
          onConnectionSelect('', 0, 0);
        }
      }}
    >
      <defs>
        {/* Arrow marker definitions */}
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerUnits="strokeWidth"
          markerWidth="10"
          markerHeight="10"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>

        {/* Glow filter for selected connections */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Render connections */}
      {connections.map((connection) => {
        const path = getConnectionPath(connection, components, connectionStyle);
        if (!path) return null;

        // Calculate label position
        const midPoint = path
          .split('L')
          .map(coord => coord.replace('M', '').split(' '))
          .map(([x, y]) => ({ x: parseFloat(x), y: parseFloat(y) }))
          .reduce((acc, curr, i, arr) => {
            if (i === 0) return curr;
            const prev = arr[i - 1];
            return {
              x: (prev.x + curr.x) / 2,
              y: (prev.y + curr.y) / 2
            };
          });

        const isSelected = selectedConnection === connection.id;
        const isStartConnection = connectionStart === connection.from;
        const color = connectionColors[connection.type] || 'hsl(var(--primary))';
        const strokeDasharray = connection.type === 'async' ? '5,5' : undefined;

        return (
          <g key={connection.id}>
            {/* Connection path */}
            <path
              d={path}
              stroke={color}
              strokeWidth={isSelected ? 3 : 2}
              fill="none"
              strokeDasharray={strokeDasharray}
              className={isSelected ? 'filter-glow transition-all duration-200' : 'transition-all duration-200'}
              style={{
                filter: isSelected ? 'url(#glow)' : undefined,
                opacity: isStartConnection ? 0.5 : 1,
                cursor: 'pointer'
              }}
              markerEnd="url(#arrow)"
              onClick={(e) => {
                e.stopPropagation();
                onConnectionSelect(
                  connection.id,
                  e.clientX,
                  e.clientY
                );
              }}
            />

            {/* Connection label */}
            <g
              transform={`translate(${midPoint.x}, ${midPoint.y})`}
              className="cursor-pointer select-none"
              onClick={(e) => {
                e.stopPropagation();
                onConnectionSelect(
                  connection.id,
                  e.clientX,
                  e.clientY
                );
              }}
            >
              <rect
                x="-30"
                y="-10"
                width="60"
                height="20"
                rx="4"
                className={`
                  fill-background/90 stroke-border
                  ${isSelected ? 'stroke-2 filter-glow' : 'stroke-1'}
                `}
              />
              <text
                className="text-xs fill-foreground pointer-events-none select-none"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {connection.label}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
