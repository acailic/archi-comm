/**
 * File: src/packages/ui/components/canvas/QuickConnectOverlay.tsx
 * Purpose: Visual overlay showing preview line during quick-connect mode
 * Why: Provides visual feedback for connection being created
 * Related: useQuickConnect.ts, DesignCanvasCore.tsx, canvasStore.ts
 */

import { memo, useEffect, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { cx } from '../../../../lib/design/design-system';

interface QuickConnectOverlayProps {
  sourceNodeId: string;
  previewPosition: { x: number; y: number } | null;
  isValidTarget?: boolean;
  onCancel?: () => void;
}

/**
 * Renders a preview line from source node to cursor during quick-connect
 */
const QuickConnectOverlayComponent: React.FC<QuickConnectOverlayProps> = ({
  sourceNodeId,
  previewPosition,
  isValidTarget = true,
  onCancel,
}) => {
  const { getNode } = useReactFlow();
  const [sourcePosition, setSourcePosition] = useState<{ x: number; y: number } | null>(null);

  // Get source node position
  useEffect(() => {
    const sourceNode = getNode(sourceNodeId);
    if (sourceNode) {
      // Calculate center of node
      const x = sourceNode.position.x + (sourceNode.width ?? 224) / 2; // 224px = 56*4 (w-56)
      const y = sourceNode.position.y + (sourceNode.height ?? 144) / 2; // 144px = 36*4 (h-36)
      setSourcePosition({ x, y });
    }
  }, [sourceNodeId, getNode]);

  if (!sourcePosition || !previewPosition) {
    return null;
  }

  // Calculate SVG viewBox to contain both points with padding
  const minX = Math.min(sourcePosition.x, previewPosition.x) - 50;
  const minY = Math.min(sourcePosition.y, previewPosition.y) - 50;
  const maxX = Math.max(sourcePosition.x, previewPosition.x) + 50;
  const maxY = Math.max(sourcePosition.y, previewPosition.y) + 50;
  const width = maxX - minX;
  const height = maxY - minY;

  // Adjust positions relative to viewBox
  const relativeSourceX = sourcePosition.x - minX;
  const relativeSourceY = sourcePosition.y - minY;
  const relativePreviewX = previewPosition.x - minX;
  const relativePreviewY = previewPosition.y - minY;

  return (
    <div className="pointer-events-none absolute inset-0 z-[var(--z-tooltip)]">
      {/* Preview line */}
      <svg
        style={{
          position: 'absolute',
          left: minX,
          top: minY,
          width,
          height,
          overflow: 'visible',
        }}
      >
        <defs>
          {/* Gradient for line */}
          <linearGradient id="quick-connect-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isValidTarget ? '#3b82f6' : '#ef4444'} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isValidTarget ? '#3b82f6' : '#ef4444'} stopOpacity="0.4" />
          </linearGradient>

          {/* Dashed pattern */}
          <pattern id="quick-connect-dash" patternUnits="userSpaceOnUse" width="20" height="4">
            <line
              x1="0"
              y1="2"
              x2="10"
              y2="2"
              stroke={isValidTarget ? '#3b82f6' : '#ef4444'}
              strokeWidth="3"
            />
          </pattern>

          {/* Arrow marker */}
          <marker
            id="quick-connect-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10 z"
              fill={isValidTarget ? '#3b82f6' : '#ef4444'}
            />
          </marker>
        </defs>

        {/* Main line with animation */}
        <line
          x1={relativeSourceX}
          y1={relativeSourceY}
          x2={relativePreviewX}
          y2={relativePreviewY}
          stroke="url(#quick-connect-gradient)"
          strokeWidth="3"
          strokeDasharray="10 5"
          strokeLinecap="round"
          markerEnd="url(#quick-connect-arrow)"
          className={cx(
            'transition-all duration-200',
            isValidTarget ? 'opacity-90' : 'opacity-70'
          )}
        >
          <animate
            attributeName="stroke-dashoffset"
            from="15"
            to="0"
            dur="0.5s"
            repeatCount="indefinite"
          />
        </line>

        {/* Glow effect */}
        <line
          x1={relativeSourceX}
          y1={relativeSourceY}
          x2={relativePreviewX}
          y2={relativePreviewY}
          stroke={isValidTarget ? '#3b82f6' : '#ef4444'}
          strokeWidth="8"
          strokeOpacity="0.2"
          strokeLinecap="round"
          className="blur-sm"
        />

        {/* Source dot */}
        <circle
          cx={relativeSourceX}
          cy={relativeSourceY}
          r="6"
          fill={isValidTarget ? '#3b82f6' : '#ef4444'}
          className={cx(
            'transition-all',
            isValidTarget ? 'opacity-100' : 'opacity-70'
          )}
        >
          <animate
            attributeName="r"
            values="6;8;6"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>

        {/* Preview cursor dot */}
        <circle
          cx={relativePreviewX}
          cy={relativePreviewY}
          r="4"
          fill={isValidTarget ? '#3b82f6' : '#ef4444'}
          fillOpacity="0.6"
        />
      </svg>

      {/* Instruction text */}
      <div
        className={cx(
          'fixed bottom-8 left-1/2 -translate-x-1/2',
          'px-6 py-3 rounded-lg shadow-lg',
          'bg-white border-2',
          'text-sm font-medium',
          'flex items-center gap-3',
          'pointer-events-auto',
          isValidTarget ? 'border-blue-500 text-blue-900' : 'border-red-500 text-red-900'
        )}
      >
        <div className="flex items-center gap-2">
          {isValidTarget ? (
            <>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span>Click a component to connect</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Invalid target - choose another component</span>
            </>
          )}
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <button
          onClick={onCancel}
          className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          ESC to cancel
        </button>
      </div>
    </div>
  );
};

export const QuickConnectOverlay = memo(QuickConnectOverlayComponent);
