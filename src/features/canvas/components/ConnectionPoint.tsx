/**
 * src/features/canvas/components/ConnectionPoint.tsx
 * Component for rendering connection points on canvas components
 * Handles drag interactions for creating connections between components
 * RELEVANT FILES: CanvasComponent.tsx, DesignSystem.ts, connection-paths.ts
 */

import { designSystem } from '@/lib/design-system';
import { cn } from '@/lib/utils';
import { useDrag } from 'react-dnd';

export interface ConnectionPointProps {
  position: 'top' | 'bottom' | 'left' | 'right';
  componentId: string;
  onStartConnection: (id: string, position: 'top' | 'bottom' | 'left' | 'right') => void;
  isVisible?: boolean;
  isActive?: boolean;
}

export function ConnectionPoint({
  position,
  componentId,
  onStartConnection,
  isVisible = false,
  isActive = false
}: ConnectionPointProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'connection-point',
    item: { fromId: componentId, fromPosition: position },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const positionClasses = {
    top: '-top-1 left-1/2 -translate-x-1/2',
    bottom: '-bottom-1 left-1/2 -translate-x-1/2',
    left: '-left-1 top-1/2 -translate-y-1/2',
    right: '-right-1 top-1/2 -translate-y-1/2',
  };

  return (
    <div
      ref={drag}
      className={cn(
        'absolute w-3 h-3 rounded-full cursor-crosshair transition-all duration-200',
        positionClasses[position],
        isVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        isDragging && designSystem.animations.pulse,
        isActive && designSystem.animations.glow
      )}
      onMouseDown={e => {
        e.stopPropagation();
        onStartConnection(componentId, position);
      }}
    >
      <div
        className={cn(
          'w-full h-full rounded-full bg-primary',
          'shadow-[0_0_0_2px_rgba(255,255,255,0.6)_inset]',
          'ring-2 ring-primary/20',
          'transition-transform duration-200',
          'group-hover:scale-110',
          isActive && 'scale-110 ring-primary/40'
        )}
      />
    </div>
  );
}
