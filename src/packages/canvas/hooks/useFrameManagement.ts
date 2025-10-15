/**
 * src/packages/canvas/hooks/useFrameManagement.ts
 * Hook for managing canvas frames (Figma-style organizational containers)
 * Provides CRUD operations and frame-component relationships
 * RELEVANT FILES: FrameOverlay.tsx, canvasStore.ts, shared/contracts/index.ts
 */

import { useCallback, useMemo } from 'react';
import { shallow } from 'zustand/shallow';

import type { CanvasFrame, DesignComponent } from '@/shared/contracts';
import { useCanvasOrganizationStore } from '@/stores/canvasOrganizationStore';
import { useCanvasStore, canvasActions } from '@/stores/canvasStore';

const deriveComponentBounds = (
  components: DesignComponent[],
  componentIds: string[],
  padding: number = 32,
): { x: number; y: number; width: number; height: number } | null => {
  if (!componentIds.length) {
    return null;
  }

  const targets = components.filter((component) => componentIds.includes(component.id));
  if (!targets.length) {
    return null;
  }

  const minX = Math.min(...targets.map((component) => component.x));
  const minY = Math.min(...targets.map((component) => component.y));
  const maxX = Math.max(
    ...targets.map((component) => component.x + (component.width ?? 220)),
  );
  const maxY = Math.max(
    ...targets.map((component) => component.y + (component.height ?? 140)),
  );

  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
};

export interface FrameManagementApi {
  frames: CanvasFrame[];
  currentFrameId: string | null;
  selectFrame: (frameId: string | null) => void;
  createFrame: (
    name: string,
    bounds: { x: number; y: number; width: number; height: number },
    componentIds?: string[],
    options?: { color?: string },
  ) => string;
  createFrameFromSelection: (name?: string) => string | null;
  wrapSelection: (name?: string) => string | null;
  deleteFrame: (frameId: string) => void;
  moveFrame: (frameId: string, position: { x: number; y: number }) => void;
  resizeFrame: (
    frameId: string,
    bounds: { x: number; y: number; width: number; height: number },
  ) => void;
  collapseFrame: (frameId: string) => void;
  expandFrame: (frameId: string) => void;
  toggleFrameCollapse: (frameId: string) => void;
  fitFrameToComponents: (frameId: string) => void;
  addComponentsToFrame: (frameId: string, componentIds: string[]) => void;
  removeComponentsFromFrame: (frameId: string, componentIds: string[]) => void;
  getFrameById: (frameId: string) => CanvasFrame | undefined;
}

export const useFrameManagement = (): FrameManagementApi => {
  const {
    frames,
    currentFrameId,
    createFrame: createFrameInStore,
    updateFrame,
    deleteFrame,
    setCurrentFrame,
    wrapSelectionInFrame,
    collapseFrame,
    expandFrame,
    toggleFrameCollapse,
    fitFrameToComponents,
  } = useCanvasOrganizationStore(
    (state) => ({
      frames: state.frames,
      currentFrameId: state.currentFrameId,
      createFrame: state.createFrame,
      updateFrame: state.updateFrame,
      deleteFrame: state.deleteFrame,
      setCurrentFrame: state.setCurrentFrame,
      wrapSelectionInFrame: state.wrapSelectionInFrame,
      collapseFrame: state.collapseFrame,
      expandFrame: state.expandFrame,
      toggleFrameCollapse: state.toggleFrameCollapse,
      fitFrameToComponents: state.fitFrameToComponents,
    }),
    shallow,
  );

  const components = useCanvasStore((state) => state.components);
  const selectedComponentIds = useCanvasStore((state) => state.selectedComponentIds);
  const selectionBox = useCanvasStore((state) => state.selectionBox);

  const getFrameById = useCallback(
    (frameId: string): CanvasFrame | undefined => frames.find((frame) => frame.id === frameId),
    [frames],
  );

  const createFrame = useCallback<FrameManagementApi['createFrame']>(
    (name, bounds, componentIds = [], options) => {
      const id = createFrameInStore({
        name,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        componentIds,
        color: options?.color ?? '#3b82f6',
        locked: false,
        collapsed: false,
      });

      if (componentIds.length) {
        canvasActions.updateComponents((current) =>
          current.map((component) =>
            componentIds.includes(component.id)
              ? { ...component, parentFrameId: id }
              : component,
          ),
        );
      }

      setCurrentFrame(id);
      return id;
    },
    [createFrameInStore, setCurrentFrame],
  );

  const createFrameFromSelection = useCallback<FrameManagementApi['createFrameFromSelection']>(
    (name) => {
      const componentIds = selectedComponentIds;
      const boundsFromComponents = deriveComponentBounds(components, componentIds ?? []);

      const bounds =
        boundsFromComponents ||
        (selectionBox
          ? {
              x: selectionBox.x,
              y: selectionBox.y,
              width: selectionBox.width,
              height: selectionBox.height,
            }
          : null);

      if (!bounds) {
        return null;
      }

      const frameName =
        name || (componentIds.length ? `Frame (${componentIds.length})` : 'Frame');

      if (componentIds.length) {
        return wrapSelectionInFrame(componentIds, frameName, bounds);
      }

      return createFrame(frameName, bounds);
    },
    [components, createFrame, selectedComponentIds, selectionBox, wrapSelectionInFrame],
  );

  const wrapSelection = useCallback<FrameManagementApi['wrapSelection']>(
    (name) => createFrameFromSelection(name),
    [createFrameFromSelection],
  );

  const moveFrame = useCallback<FrameManagementApi['moveFrame']>(
    (frameId, position) => {
      const frame = getFrameById(frameId);
      if (!frame) return;

      const deltaX = position.x - frame.x;
      const deltaY = position.y - frame.y;
      if (!deltaX && !deltaY) return;

      updateFrame(frameId, { x: position.x, y: position.y });

      if (frame.componentIds?.length) {
        const ids = frame.componentIds;
        canvasActions.updateComponents((current) =>
          current.map((component) =>
            ids.includes(component.id)
              ? { ...component, x: component.x + deltaX, y: component.y + deltaY }
              : component,
          ),
        );
      }
    },
    [getFrameById, updateFrame],
  );

  const resizeFrame = useCallback<FrameManagementApi['resizeFrame']>(
    (frameId, bounds) => {
      updateFrame(frameId, bounds);
    },
    [updateFrame],
  );

  const addComponentsToFrame = useCallback<FrameManagementApi['addComponentsToFrame']>(
    (frameId, componentIds) => {
      if (!componentIds.length) return;
      const frame = getFrameById(frameId);
      if (!frame) return;

      const nextComponentIds = Array.from(
        new Set([...(frame.componentIds ?? []), ...componentIds]),
      );

      updateFrame(frameId, { componentIds: nextComponentIds });
      canvasActions.updateComponents((current) =>
        current.map((component) =>
          componentIds.includes(component.id)
            ? { ...component, parentFrameId: frameId }
            : component,
        ),
      );
    },
    [getFrameById, updateFrame],
  );

  const removeComponentsFromFrame = useCallback<FrameManagementApi['removeComponentsFromFrame']>(
    (frameId, componentIds) => {
      if (!componentIds.length) return;
      const frame = getFrameById(frameId);
      if (!frame?.componentIds?.length) return;

      updateFrame(frameId, {
        componentIds: frame.componentIds.filter((id) => !componentIds.includes(id)),
      });

      canvasActions.updateComponents((current) =>
        current.map((component) =>
          componentIds.includes(component.id)
            ? { ...component, parentFrameId: undefined }
            : component,
        ),
      );
    },
    [getFrameById, updateFrame],
  );

  const api = useMemo<FrameManagementApi>(
    () => ({
      frames,
      currentFrameId,
      selectFrame: setCurrentFrame,
      createFrame,
      createFrameFromSelection,
      wrapSelection,
      deleteFrame,
      moveFrame,
      resizeFrame,
      collapseFrame,
      expandFrame,
      toggleFrameCollapse,
      fitFrameToComponents,
      addComponentsToFrame,
      removeComponentsFromFrame,
      getFrameById,
    }),
    [
      frames,
      currentFrameId,
      setCurrentFrame,
      createFrame,
      createFrameFromSelection,
      wrapSelection,
      deleteFrame,
      moveFrame,
      resizeFrame,
      collapseFrame,
      expandFrame,
      toggleFrameCollapse,
      fitFrameToComponents,
      addComponentsToFrame,
      removeComponentsFromFrame,
      getFrameById,
    ],
  );

  return api;
};
