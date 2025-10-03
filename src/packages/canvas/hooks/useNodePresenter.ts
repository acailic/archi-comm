/**
 * src/features/canvas/hooks/useNodePresenter.ts
 * Custom hook for managing node business logic and state
 * Encapsulates all business logic from CustomNode component following presenter pattern
 * RELEVANT FILES: CustomNode.tsx, CustomNodeView.tsx, useConnectionEditor.ts, component-styles.ts
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import type { MouseEvent, KeyboardEvent } from 'react';
import { getComponentIcon } from '@/lib/design/component-icons';
import {
  getArchitecturalStyling,
  getComponentGradient,
  getComponentVisualState,
  type ComponentVisualState,
} from '../utils/component-styles';
import type { CustomNodeData } from '../types';

export interface UseNodePresenterResult {
  state: {
    isHovered: boolean;
    isEditingLabel: boolean;
    labelDraft: string;
    healthStatus: 'healthy' | 'warning' | 'error';
    visualState: ComponentVisualState;
    isValidConnectionTarget: boolean;
  };
  actions: {
    handleClick: () => void;
    handleMouseEnter: () => void;
    handleMouseLeave: () => void;
    startEdit: (e?: MouseEvent) => void;
    commitEdit: () => void;
    handleKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
    handleLabelInput: (value: string) => void;
    handleStartConnection: (position: 'top' | 'bottom' | 'left' | 'right') => void;
    handleCompleteConnection: () => void;
  };
  computed: {
    visualStateClasses: string;
    architecturalStyling: ReturnType<typeof getArchitecturalStyling>;
    gradient: string;
    iconInfo: ReturnType<typeof getComponentIcon>;
    canConnectTo: (targetType: string) => boolean;
  };
}

// Connection validation rules - defines which component types can connect
const CONNECTION_RULES: Record<string, string[]> = {
  client: ['api-gateway', 'load-balancer', 'cdn', 'web-app'],
  'api-gateway': ['microservice', 'serverless', 'lambda', 'authentication', 'load-balancer'],
  'load-balancer': ['server', 'microservice', 'container'],
  server: ['database', 'cache', 'message-queue', 'storage'],
  microservice: ['database', 'cache', 'message-queue', 'microservice', 'rest-api', 'grpc'],
  database: ['storage', 'cache'],
  cache: ['database'],
  'message-queue': ['microservice', 'serverless', 'consumer', 'producer'],
  // Allow any component to connect if not explicitly defined
  default: ['*'],
};

function canConnect(sourceType: string, targetType: string): boolean {
  const rules = CONNECTION_RULES[sourceType] || CONNECTION_RULES.default;
  return rules.includes('*') || rules.includes(targetType);
}

export function useNodePresenter(
  nodeData: CustomNodeData,
  selected: boolean
): UseNodePresenterResult {
  const {
    component,
    isSelected,
    isMultiSelected = false,
    isConnectionStart,
    healthStatus: healthStatusProp,
    onSelect,
    onStartConnection,
    onCompleteConnection,
    onLabelChange,
    connectionSourceType,
  } = nodeData;

  // State management
  const [isHovered, setIsHovered] = useState(false);
  const healthStatus: 'healthy' | 'warning' | 'error' = healthStatusProp ?? 'healthy';
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(component.label || '');

  // Connection validation - is this node a valid target for the current connection?
  const isValidConnectionTarget = useMemo(() => {
    if (!connectionSourceType) return false;
    return canConnect(connectionSourceType, component.type);
  }, [connectionSourceType, component.type]);

  // Computed values
  const architecturalStyling = useMemo(
    () => getArchitecturalStyling(component.type),
    [component.type]
  );
  const gradient = useMemo(() => getComponentGradient(component.type), [component.type]);
  const iconInfo = useMemo(() => getComponentIcon(component.type), [component.type]);

  // Visual state computation
  const visualState: ComponentVisualState = {
    isHovered,
    isSelected: isSelected || selected,
    isMultiSelected,
    isConnectionStart,
    isDragPreview: false, // React Flow handles dragging internally
  };

  const visualStateClasses = getComponentVisualState(visualState);

  // Action handlers using useCallback for performance
  const handleClick = useCallback(() => {
    onSelect(component.id);
  }, [onSelect, component.id]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const startEdit = useCallback(
    (e?: MouseEvent) => {
      e?.stopPropagation();
      setIsEditingLabel(true);
      setLabelDraft(component.label || '');
    },
    [component.label]
  );

  const commitEdit = useCallback(() => {
    setIsEditingLabel(false);
    const next = labelDraft.trim();
    if (onLabelChange) {
      onLabelChange(component.id, next);
    }
  }, [labelDraft, onLabelChange, component.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditingLabel(false);
        setLabelDraft(component.label || '');
      }
    },
    [commitEdit, component.label]
  );

  const handleLabelInput = useCallback((value: string) => {
    setLabelDraft(value);
  }, []);

  const handleStartConnection = useCallback(
    (position: 'top' | 'bottom' | 'left' | 'right') => {
      onStartConnection(component.id, position);
    },
    [onStartConnection, component.id]
  );

  const handleCompleteConnection = useCallback(() => {
    if (onCompleteConnection && isValidConnectionTarget) {
      onCompleteConnection(component.id);
    }
  }, [onCompleteConnection, component.id, isValidConnectionTarget]);

  // Helper function for checking if connection to target type is valid
  const canConnectTo = useCallback(
    (targetType: string) => canConnect(component.type, targetType),
    [component.type]
  );

  // Effect for label synchronization
  useEffect(() => {
    if (!isEditingLabel) {
      setLabelDraft(component.label || '');
    }
  }, [component.label, isEditingLabel]);

  return useMemo(
    () => ({
      state: {
        isHovered,
        isEditingLabel,
        labelDraft,
        healthStatus,
        visualState,
        isValidConnectionTarget,
      },
      actions: {
        handleClick,
        handleMouseEnter,
        handleMouseLeave,
        startEdit,
        commitEdit,
        handleKeyDown,
        handleLabelInput,
        handleStartConnection,
        handleCompleteConnection,
      },
      computed: {
        visualStateClasses,
        architecturalStyling,
        gradient,
        iconInfo,
        canConnectTo,
      },
    }),
    [
      isHovered,
      isEditingLabel,
      labelDraft,
      healthStatus,
      visualState,
      isValidConnectionTarget,
      handleClick,
      handleMouseEnter,
      handleMouseLeave,
      startEdit,
      commitEdit,
      handleKeyDown,
      handleLabelInput,
      handleStartConnection,
      handleCompleteConnection,
      visualStateClasses,
      architecturalStyling,
      gradient,
      iconInfo,
      canConnectTo,
    ]
  );
}
