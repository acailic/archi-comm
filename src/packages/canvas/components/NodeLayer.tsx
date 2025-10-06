import React, { useEffect, useMemo } from 'react';
import { Node, useNodesState } from '@xyflow/react';
import { canvasActions, useCanvasStore } from '@/stores/canvasStore';
import { DesignComponent, InfoCard } from '../../../types';
import { useRenderGuard, RenderGuardPresets } from '../../../lib/performance/RenderGuard';
import { InfiniteLoopDetector } from '../../../lib/performance/InfiniteLoopDetector';
import { useCanvasContext } from '../contexts/CanvasContext';

export interface NodeLayerProps {
  components: DesignComponent[];
  infoCards: InfoCard[];
  children?: React.ReactNode;
}

const createEnhancedNodes = (
  components: DesignComponent[],
  layoutPositions: Record<string, { x: number; y: number }>
): Node[] => {
  return components.map(component => ({
    id: component.id,
    type: 'designComponent',
    position: layoutPositions[component.id] || { x: component.x || 0, y: component.y || 0 },
    data: {
      component,
      label: component.name || component.type,
      type: component.type,
      ...component.properties,
    },
    draggable: true,
    selectable: true,
  }));
};

const createInfoCardNodes = (
  infoCards: InfoCard[],
  layoutPositions: Record<string, { x: number; y: number }>
): Node[] => {
  return infoCards.map(infoCard => ({
    id: infoCard.id,
    type: 'infoCard',
    position: layoutPositions[infoCard.id] || { x: infoCard.x || 0, y: infoCard.y || 0 },
    data: {
      infoCard,
      label: infoCard.title || 'Info Card',
      content: infoCard.content,
      title: infoCard.title,
    },
    draggable: true,
    selectable: true,
  }));
};

export const NodeLayer: React.FC<NodeLayerProps> = ({ components, infoCards, children }) => {
  const renderGuard = useRenderGuard('ReactFlowCanvas.NodeLayer', RenderGuardPresets.canvasLayers.NodeLayer);

  const { state, callbacks, updateLayoutPositions } = useCanvasContext();
  const { layoutPositions, selectedItems } = state;
  const { component: componentCallbacks, infoCard: infoCardCallbacks } = callbacks;

  const enhancedNodes = useMemo(() =>
    createEnhancedNodes(components, layoutPositions),
    [components, layoutPositions]
  );

  const infoCardNodes = useMemo(() =>
    createInfoCardNodes(infoCards, layoutPositions),
    [infoCards, layoutPositions]
  );

  const allNodes = useMemo(() =>
    [...enhancedNodes, ...infoCardNodes],
    [enhancedNodes, infoCardNodes]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(allNodes);

  useEffect(() => {
    setNodes(allNodes);
  }, [allNodes, setNodes]);

  useEffect(() => {
    const selectedNodeIds = new Set(selectedItems);
    setNodes(currentNodes =>
      currentNodes.map(node => ({
        ...node,
        selected: selectedNodeIds.has(node.id),
      }))
    );
  }, [selectedItems, setNodes]);

  useEffect(() => {
    const propsData = {
      componentsCount: components.length,
      infoCardsCount: infoCards.length,
      layoutPositionsCount: Object.keys(layoutPositions).length,
      selectedItemsCount: selectedItems.length,
    };

    InfiniteLoopDetector.recordRender('ReactFlowCanvas.NodeLayer', {
      componentName: 'NodeLayer',
      propsHash: JSON.stringify(propsData),
      timestamp: Date.now(),
      renderCount: renderGuard.renderCount,
    });
  }, [
    components.length,
    infoCards.length,
    layoutPositions,
    selectedItems.length,
    renderGuard.renderCount,
  ]);

  const handleNodeDrag = React.useCallback((event: any, node: Node) => {
    canvasActions.updateAlignmentGuides(
      node.id,
      node.position.x,
      node.position.y
    );
  }, []);

  const handleNodeDragStop = React.useCallback((event: any, node: Node) => {
    const isComponent = components.some(comp => comp.id === node.id);
    const isInfoCard = infoCards.some(card => card.id === node.id);

    if (isComponent) {
      componentCallbacks.onComponentPositionChange(node.id, node.position);
    } else if (isInfoCard) {
      const infoCard = infoCards.find(card => card.id === node.id);
      if (infoCard) {
        infoCardCallbacks.onInfoCardUpdate({
          ...infoCard,
          x: node.position.x,
          y: node.position.y,
        });
      }
    }

    updateLayoutPositions({
      ...layoutPositions,
      [node.id]: node.position,
    });

    // Clear alignment guides on drag end
    canvasActions.clearAlignmentGuides();
  }, [
    components,
    infoCards,
    componentCallbacks,
    infoCardCallbacks,
    layoutPositions,
    updateLayoutPositions,
  ]);

  const handleNodeClick = React.useCallback((event: React.MouseEvent, node: Node) => {
    const isComponent = components.some(comp => comp.id === node.id);
    const isInfoCard = infoCards.some(card => card.id === node.id);

    if (isComponent) {
      componentCallbacks.onComponentSelect(node.id);
    } else if (isInfoCard) {
      infoCardCallbacks.onInfoCardSelect(node.id);
    }
  }, [components, infoCards, componentCallbacks, infoCardCallbacks]);

  const handleNodeDoubleClick = React.useCallback((event: React.MouseEvent, node: Node) => {
    const isComponent = components.some(comp => comp.id === node.id);
    if (isComponent) {
      componentCallbacks.onComponentSelect(node.id);
    }
  }, [components, componentCallbacks]);

  const enhancedOnNodesChange = React.useCallback((changes: any[]) => {
    onNodesChange(changes);

    changes.forEach(change => {
      if (change.type === 'position' && change.dragging === false) {
        const node = nodes.find(n => n.id === change.id);
        if (node) {
          handleNodeDragStop(null, { ...node, position: change.position });
        }
      }
    });
  }, [onNodesChange, nodes, handleNodeDragStop]);

  const nodeEventHandlers = useMemo(() => ({
    onNodeClick: handleNodeClick,
    onNodeDoubleClick: handleNodeDoubleClick,
    onNodeDrag: handleNodeDrag,
    onNodeDragStop: handleNodeDragStop,
    onNodesChange: enhancedOnNodesChange,
  }), [handleNodeClick, handleNodeDoubleClick, handleNodeDrag, handleNodeDragStop, enhancedOnNodesChange]);

  if (renderGuard.shouldPause) {
    return (
      <div className="node-layer-paused">
        <p>Node layer paused due to render loop detection</p>
      </div>
    );
  }

  return (
    <div className="node-layer">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            nodes,
            ...nodeEventHandlers,
          });
        }
        return child;
      })}
    </div>
  );
};
