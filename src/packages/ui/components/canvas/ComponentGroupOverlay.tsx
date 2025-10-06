/**
 * src/packages/ui/components/canvas/ComponentGroupOverlay.tsx
 * Renders visual boundaries around grouped components with controls
 * Shows purple dashed border with group name and lock/ungroup buttons
 * RELEVANT FILES: src/stores/canvasStore.ts, src/shared/contracts/index.ts
 */

import { Lock, Ungroup, Unlock } from "lucide-react";
import { memo, useCallback, useMemo } from "react";

import { cx, overlayZIndex } from "@/lib/design/design-system";
import type { ComponentGroup } from "@/shared/contracts";
import { useComponentGroups, useCanvasActions } from "@/stores/canvasStore";

interface ComponentGroupOverlayProps {
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export const ComponentGroupOverlay = memo<ComponentGroupOverlayProps>(
  ({ viewport }) => {
    const groups = useComponentGroups();

    if (groups.length === 0) return null;

    return (
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: overlayZIndex.groups }}>
        {groups.map((group) => (
          <GroupBoundary key={group.id} group={group} viewport={viewport} />
        ))}
      </div>
    );
  },
);

ComponentGroupOverlay.displayName = "ComponentGroupOverlay";

interface GroupBoundaryProps {
  group: ComponentGroup;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

const GroupBoundary = memo<GroupBoundaryProps>(({ group, viewport }) => {
  const actions = useCanvasActions();

  const handleUngroup = useCallback(() => {
    actions.ungroupComponents(group.id);
  }, [group.id, actions]);

  const handleToggleLock = useCallback(() => {
    if (group.locked) {
      actions.unlockComponents(group.componentIds);
    } else {
      actions.lockComponents(group.componentIds);
    }
  }, [group.locked, group.componentIds, actions]);

  // Transform group coordinates to screen coordinates
  const screenX = group.x * viewport.zoom + viewport.x;
  const screenY = group.y * viewport.zoom + viewport.y;
  const screenWidth = group.width * viewport.zoom;
  const screenHeight = group.height * viewport.zoom;
  const style = useMemo(
    () => ({
      left: `${screenX}px`,
      top: `${screenY}px`,
      width: `${screenWidth}px`,
      height: `${screenHeight}px`,
    }),
    [screenX, screenY, screenWidth, screenHeight],
  );

  return (
    <div
      className="absolute"
      style={style}
    >
      {/* Group boundary */}
      <div
        className={cx(
          "absolute inset-0",
          "border-2 border-dashed rounded-lg",
          group.locked ? "border-red-400" : "border-purple-400",
          "bg-purple-500/5",
        )}
      />

      {/* Group header */}
      <div
        className={cx(
          "absolute -top-7 left-0",
          "flex items-center gap-1",
          "px-2 py-1 rounded-t-md",
          "bg-purple-600 text-white text-xs font-medium",
          "pointer-events-auto",
        )}
      >
        <span>{group.name}</span>
        <span className="text-purple-200">({group.componentIds.length})</span>

        {/* Group controls */}
        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={handleToggleLock}
            className="p-0.5 hover:bg-purple-700 rounded transition-colors"
            title={group.locked ? "Unlock group" : "Lock group"}
          >
            {group.locked ? (
              <Lock className="w-3 h-3" />
            ) : (
              <Unlock className="w-3 h-3" />
            )}
          </button>
          <button
            onClick={handleUngroup}
            className="p-0.5 hover:bg-purple-700 rounded transition-colors"
            title="Ungroup components"
          >
            <Ungroup className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
});

GroupBoundary.displayName = "GroupBoundary";
