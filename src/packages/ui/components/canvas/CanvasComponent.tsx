import React from 'react';
import type { DesignComponent } from '@/shared/contracts';

export type ComponentHealth = 'healthy' | 'warning' | 'error' | 'unknown';

interface CanvasComponentProps {
  component: DesignComponent;
  isSelected?: boolean;
  isConnectionStart?: boolean;
  zoomLevel?: number;
  health?: ComponentHealth;
  connectionCount?: number;
  onSelect?: (id: string) => void;
  onLabelChange?: (id: string, label: string) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onStartConnection?: (id: string) => void;
  onCompleteConnection?: (fromId: string, toId: string) => void;
  readonly?: boolean;
}

/**
 * Minimal, non-interactive canvas component used for preview rendering in ReviewScreen.
 * Focuses on visual summary only; callbacks are accepted but not used.
 */
export const CanvasComponent: React.FC<CanvasComponentProps> = ({
  component,
  isSelected = false,
  zoomLevel = 1,
  health = 'unknown',
  connectionCount = 0,
  onSelect,
  readonly = true,
}) => {
  const baseWidth = component.width ?? 220;
  const baseHeight = component.height ?? 140;
  const width = baseWidth * zoomLevel;
  const height = baseHeight * zoomLevel;
  const x = component.x ?? 0;
  const y = component.y ?? 0;

  const borderColor = isSelected
    ? 'var(--primary)'
    : health === 'healthy'
    ? 'hsl(142 76% 36%)' // green-600
    : health === 'warning'
    ? 'hsl(38 92% 50%)' // amber-500
    : 'hsl(var(--border))';

  const handleClick = () => {
    if (!readonly && onSelect) onSelect(component.id);
  };

  return (
    <div
      style={{
        width,
        height,
        position: 'absolute',
        left: x,
        top: y,
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        background: 'hsl(var(--card))',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        padding: 12 * zoomLevel,
        pointerEvents: readonly ? 'none' : 'auto',
        cursor: readonly ? 'default' : 'pointer',
      }}
      onClick={handleClick}
      role='button'
      aria-label={component.label}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 * zoomLevel }}>
        <span style={{ fontSize: 12 * zoomLevel, color: 'hsl(var(--muted-foreground))' }}>{
          (component.type || 'component').toString()
        }</span>
        <span style={{ fontSize: 12 * zoomLevel, color: 'hsl(var(--muted-foreground))' }}>
          {connectionCount} links
        </span>
      </div>
      <div style={{
        fontSize: 14 * zoomLevel,
        fontWeight: 600,
        marginBottom: 6 * zoomLevel,
        color: 'hsl(var(--foreground))',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {component.label}
      </div>
      {component.description && (
        <div style={{ fontSize: 12 * zoomLevel, color: 'hsl(var(--muted-foreground))' }}>
          {component.description}
        </div>
      )}
    </div>
  );
};

export default CanvasComponent;
