import React, {
  CSSProperties,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Connection, Handle, NodeProps, Position } from '@xyflow/react';

import type { DesignComponent } from '@/shared/contracts';
import { createCanvasNodeComponent } from '@/shared/utils/hotLeafMemoization';
import { cn, deepEqual, shallowEqual } from '@/packages/core/utils';
import { componentOptimizer } from '@/lib/performance/ComponentOptimizer';
import { errorStore } from '@/lib/logging/errorStore';
import { getComponentIcon } from '@/lib/design/component-icons';

export type NodeHealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export type NodeContextAction = 'duplicate' | 'delete' | 'properties' | 'focus';

export interface NodeStatusMetadata {
  health?: NodeHealthStatus;
  throughput?: string;
  latencyMs?: number;
  errorRate?: number;
  uptime?: string;
  activeAlerts?: number;
  replicas?: number;
  port?: number;
  healthCheck?: string | boolean;
  statusMessage?: string;
  [key: string]: unknown;
}

export interface NodeConnectionState {
  incoming?: number;
  outgoing?: number;
  isConnectable?: boolean;
  activeHandle?: string | null;
  connecting?: boolean;
  lastValidatedHandle?: string | null;
}

export interface NodeInteractionCallbacks {
  onSelect?: (
    nodeId: string,
    meta: { multi: boolean; additive: boolean; source: 'click' | 'keyboard' }
  ) => void;
  onEdit?: (nodeId: string) => void;
  onContextAction?: (nodeId: string, action: NodeContextAction) => void;
  onKeyboardNavigate?: (nodeId: string, direction: 'up' | 'down' | 'left' | 'right') => void;
  onKeyCommand?: (nodeId: string, command: 'delete' | 'duplicate' | 'properties' | 'enter') => void;
  validateConnection?: (payload: {
    nodeId: string;
    handleId: string;
    handleType: 'source' | 'target';
    connection: Connection;
  }) => boolean;
  onConnectionStart?: (nodeId: string, handleId: string, handleType: 'source' | 'target') => void;
  onConnectionEnd?: (
    nodeId: string,
    handleId: string,
    handleType: 'source' | 'target',
    connection?: Connection
  ) => void;
  onHoverChange?: (nodeId: string, hovered: boolean) => void;
  onFocusChange?: (nodeId: string, focused: boolean) => void;
}

export interface OptimizedNodeData {
  component: DesignComponent;
  metadata?: NodeStatusMetadata;
  connectionState?: NodeConnectionState;
  tags?: string[];
  themeOverride?: 'serious' | 'playful' | string;
  descriptionOverride?: string;
  ariaLabel?: string;
  styleOverrides?: CSSProperties;
  className?: string;
  callbacks?: NodeInteractionCallbacks;
  statusMessage?: string;
  badgeIcon?: ReactNode;
  customContent?: ReactNode;
  highlight?: boolean;
  debugLabel?: string;
  disabled?: boolean;
}

const HEALTH_STATUS_LABELS: Record<NodeHealthStatus, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  critical: 'Critical',
  unknown: 'Status unknown',
};

interface ThemePalette {
  background: string;
  border: string;
  accent: string;
  text: string;
  subtleText: string;
  badgeBg: string;
  badgeText: string;
  handle: string;
  handleHover: string;
  handleInactive: string;
  shadow: string;
  shadowActive: string;
  health: Record<NodeHealthStatus, string>;
}

const SERIOUS_THEME: ThemePalette = {
  background: 'var(--canvas-node-bg-serious, #000000)',
  border: 'var(--canvas-node-border-serious, rgba(255, 255, 255, 0.2))',
  accent: 'var(--canvas-node-accent-serious, #3b82f6)',
  text: 'var(--canvas-node-text-serious, #ffffff)',
  subtleText: 'var(--canvas-node-subtle-serious, rgba(255, 255, 255, 0.7))',
  badgeBg: 'var(--canvas-node-badge-bg-serious, rgba(255, 255, 255, 0.1))',
  badgeText: 'var(--canvas-node-badge-text-serious, #ffffff)',
  handle: 'var(--canvas-node-handle-serious, #3b82f6)',
  handleHover: 'var(--canvas-node-handle-hover-serious, #60a5fa)',
  handleInactive: 'var(--canvas-node-handle-inactive-serious, rgba(255, 255, 255, 0.3))',
  shadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  shadowActive: '0 8px 24px rgba(59, 130, 246, 0.4)',
  health: {
    healthy: 'var(--canvas-node-health-healthy, #22c55e)',
    degraded: 'var(--canvas-node-health-degraded, #f97316)',
    critical: 'var(--canvas-node-health-critical, #ef4444)',
    unknown: 'var(--canvas-node-health-unknown, rgba(255, 255, 255, 0.5))',
  },
};

const PLAYFUL_THEME: ThemePalette = {
  background: 'var(--canvas-node-bg-playful, rgba(255, 247, 237, 0.95))',
  border: 'var(--canvas-node-border-playful, rgba(253, 186, 116, 0.7))',
  accent: 'var(--canvas-node-accent-playful, #fb7185)',
  text: 'var(--canvas-node-text-playful, #0f172a)',
  subtleText: 'var(--canvas-node-subtle-playful, rgba(30, 41, 59, 0.72))',
  badgeBg: 'var(--canvas-node-badge-bg-playful, rgba(251, 146, 60, 0.18))',
  badgeText: 'var(--canvas-node-badge-text-playful, #7c2d12)',
  handle: 'var(--canvas-node-handle-playful, #fb7185)',
  handleHover: 'var(--canvas-node-handle-hover-playful, #f43f5e)',
  handleInactive: 'var(--canvas-node-handle-inactive-playful, rgba(99, 102, 241, 0.3))',
  shadow: '0 10px 30px rgba(107, 114, 128, 0.3)',
  shadowActive: '0 16px 36px rgba(236, 72, 153, 0.35)',
  health: {
    healthy: 'var(--canvas-node-health-healthy-playful, #22c55e)',
    degraded: 'var(--canvas-node-health-degraded-playful, #f59e0b)',
    critical: 'var(--canvas-node-health-critical-playful, #f43f5e)',
    unknown: 'var(--canvas-node-health-unknown-playful, rgba(100, 116, 139, 0.7))',
  },
};

const THEME_MAP: Record<'serious' | 'playful', ThemePalette> = {
  serious: SERIOUS_THEME,
  playful: PLAYFUL_THEME,
};

const NODE_HANDLES: Array<{
  key: 'top' | 'right' | 'bottom' | 'left';
  position: Position;
  type: 'source' | 'target';
  label: string;
}> = [
  { key: 'top', position: Position.Top, type: 'target', label: 'Incoming connection (top)' },
  { key: 'right', position: Position.Right, type: 'source', label: 'Outgoing connection (right)' },
  { key: 'bottom', position: Position.Bottom, type: 'source', label: 'Outgoing connection (bottom)' },
  { key: 'left', position: Position.Left, type: 'target', label: 'Incoming connection (left)' },
];

const COMMON_PROPERTY_LABELS: Record<string, string> = {
  replicas: 'Replicas',
  port: 'Port',
  healthCheck: 'Health check',
  rateLimit: 'Rate limit',
  authentication: 'Auth',
  ttl: 'TTL',
  size: 'Capacity',
  backup: 'Backups',
  algorithm: 'Algorithm',
  type: 'Type',
  endpoint: 'Endpoint',
  region: 'Region',
};

type RenderSnapshot = {
  selected: boolean;
  dragging: boolean;
  label: string;
  theme: string;
  health: NodeHealthStatus;
  incoming: number;
  outgoing: number;
  highlight: boolean;
};

function getThemePalette(themeKey?: string): ThemePalette {
  if (!themeKey) {
    return SERIOUS_THEME;
  }

  const lower = themeKey.toLowerCase();
  if (lower === 'serious' || lower === 'playful') {
    return THEME_MAP[lower];
  }

  return {
    ...SERIOUS_THEME,
    background: `var(--canvas-node-bg-${lower}, ${SERIOUS_THEME.background})`,
    border: `var(--canvas-node-border-${lower}, ${SERIOUS_THEME.border})`,
    accent: `var(--canvas-node-accent-${lower}, ${SERIOUS_THEME.accent})`,
  };
}

function formatComponentType(type: string): string {
  if (!type) return 'Component';
  return type
    .split('-')
    .map(part => (part.length ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');
}

function formatValue(value: unknown): string {
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return '';
}

function buildPropertyEntries(
  component: DesignComponent,
  metadata?: NodeStatusMetadata
): Array<{ key: string; label: string; value: string }> {
  const entries: Array<{ key: string; label: string; value: string }> = [];
  const seen = new Set<string>();

  const pushEntry = (key: string, label: string, rawValue: unknown) => {
    if (rawValue === undefined || rawValue === null || rawValue === '') return;
    if (seen.has(key)) return;
    const value = formatValue(rawValue);
    if (!value) return;
    seen.add(key);
    entries.push({ key, label, value });
  };

  const props = component.properties ?? {};
  Object.entries(COMMON_PROPERTY_LABELS).forEach(([key, label]) => {
    if (key === 'type' && props.type === component.type) return;
    if (key in props) {
      pushEntry(key, label, (props as Record<string, unknown>)[key]);
    }
  });

  Object.entries(props).forEach(([key, value]) => {
    if (key === 'showLabel') return;
    if (seen.has(key)) return;
    pushEntry(key, COMMON_PROPERTY_LABELS[key] ?? formatComponentType(key), value);
  });

  if (metadata) {
    pushEntry('throughput', 'Throughput', metadata.throughput);
    pushEntry('latency', 'Latency', metadata.latencyMs ? `${metadata.latencyMs} ms` : undefined);
    pushEntry('errorRate', 'Error rate', metadata.errorRate ? `${metadata.errorRate}%` : undefined);
    pushEntry('uptime', 'Uptime', metadata.uptime);
    pushEntry('alerts', 'Alerts', metadata.activeAlerts);
    pushEntry('statusMessage', 'Status', metadata.statusMessage);
    if (!seen.has('replicas')) pushEntry('replicas', 'Replicas', metadata.replicas);
    if (!seen.has('port')) pushEntry('port', 'Port', metadata.port);
    if (!seen.has('healthCheck')) pushEntry('healthCheck', 'Health check', metadata.healthCheck);
  }

  return entries;
}

function areDesignComponentsEqual(a?: DesignComponent, b?: DesignComponent): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.id === b.id &&
    a.type === b.type &&
    a.label === b.label &&
    a.description === b.description &&
    a.x === b.x &&
    a.y === b.y &&
    a.layerId === b.layerId &&
    deepEqual(a.properties ?? {}, b.properties ?? {})
  );
}

function areMetadataEqual(a?: NodeStatusMetadata, b?: NodeStatusMetadata): boolean {
  if (a === b) return true;
  return deepEqual(a ?? {}, b ?? {});
}

function areConnectionStatesEqual(a?: NodeConnectionState, b?: NodeConnectionState): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.incoming === b.incoming &&
    a.outgoing === b.outgoing &&
    a.isConnectable === b.isConnectable &&
    a.activeHandle === b.activeHandle &&
    a.connecting === b.connecting &&
    a.lastValidatedHandle === b.lastValidatedHandle
  );
}

function areStyleOverridesEqual(a?: CSSProperties, b?: CSSProperties): boolean {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(key => (a as Record<string, unknown>)[key] === (b as Record<string, unknown>)[key]);
}

function arePositionsEqual(
  a: NodeProps<OptimizedNodeData>['position'],
  b: NodeProps<OptimizedNodeData>['position']
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y;
}

const optimizedNodeEquality = (
  prev: NodeProps<OptimizedNodeData>,
  next: NodeProps<OptimizedNodeData>
): boolean => {
  if (prev === next) return true;
  if (prev.id !== next.id) return false;
  if (prev.type !== next.type) return false;
  if (prev.selected !== next.selected) return false;
  if (prev.dragging !== next.dragging) return false;
  if (!arePositionsEqual(prev.position, next.position)) return false;
  if ((prev.width ?? 0) !== (next.width ?? 0)) return false;
  if ((prev.height ?? 0) !== (next.height ?? 0)) return false;
  if (!areStyleOverridesEqual(prev.style, next.style)) return false;

  if (prev.data === next.data) {
    return true;
  }

  if (!prev.data || !next.data) return false;

  if (!areDesignComponentsEqual(prev.data.component, next.data.component)) return false;
  if (!areMetadataEqual(prev.data.metadata, next.data.metadata)) return false;
  if (!areConnectionStatesEqual(prev.data.connectionState, next.data.connectionState)) return false;
  if (prev.data.themeOverride !== next.data.themeOverride) return false;
  if (prev.data.descriptionOverride !== next.data.descriptionOverride) return false;
  if (prev.data.ariaLabel !== next.data.ariaLabel) return false;
  if (prev.data.highlight !== next.data.highlight) return false;
  if (prev.data.disabled !== next.data.disabled) return false;
  if (!areStyleOverridesEqual(prev.data.styleOverrides, next.data.styleOverrides)) return false;
  if (!shallowEqual(prev.data.tags ?? [], next.data.tags ?? [])) return false;
  if (prev.data.statusMessage !== next.data.statusMessage) return false;
  if (prev.data.debugLabel !== next.data.debugLabel) return false;

  return true;
};

interface NodeErrorBoundaryProps {
  nodeId: string;
  componentType?: string;
  children: React.ReactNode;
}

interface NodeErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

class NodeErrorBoundary extends React.Component<NodeErrorBoundaryProps, NodeErrorBoundaryState> {
  state: NodeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): NodeErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    errorStore.addError(error, 'react', {
      componentStack: info.componentStack,
      additionalData: {
        nodeId: this.props.nodeId,
        componentType: this.props.componentType,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-900/30 p-3 text-sm text-red-100 shadow-lg"
        >
          <strong className="block">Node rendering error</strong>
          <span>{this.state.message ?? 'An unexpected error occurred while rendering this node.'}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

const OptimizedNodeInner = React.forwardRef<HTMLDivElement, NodeProps<OptimizedNodeData>>(
  (props, forwardedRef) => {
    const { id, data, selected, dragging, position } = props;
    const component = data?.component;

    if (!component) {
      return (
        <div
          ref={forwardedRef}
          className="rounded-md border border-amber-500/50 bg-amber-900/20 px-3 py-2 text-xs text-amber-100 shadow"
        >
          Missing component data for node {id}
        </div>
      );
    }

    const {
      metadata,
      connectionState,
      tags,
      themeOverride,
      descriptionOverride,
      ariaLabel,
      styleOverrides,
      className,
      callbacks,
      statusMessage,
      badgeIcon,
      customContent,
      highlight,
      debugLabel,
      disabled,
    } = data ?? {};

    const {
      onSelect,
      onEdit,
      onContextAction,
      onKeyboardNavigate,
      onKeyCommand,
      validateConnection: validateConnectionCallback,
      onConnectionStart,
      onConnectionEnd,
      onHoverChange,
      onFocusChange,
    } = callbacks ?? {};

    const componentLabel = component.label || formatComponentType(component.type);
    const effectiveThemeKey = themeOverride ?? 'serious';
    const themePalette = useMemo(() => getThemePalette(effectiveThemeKey), [effectiveThemeKey]);
    const healthStatus: NodeHealthStatus = metadata?.health ?? 'unknown';
    const healthColor = themePalette.health[healthStatus];
    const description = descriptionOverride ?? component.description ?? '';
    const isSelected = Boolean(selected || highlight);
    const isDragging = Boolean(dragging);
    const isDisabled = Boolean(disabled);
    const connectionSummary = {
      incoming: connectionState?.incoming ?? 0,
      outgoing: connectionState?.outgoing ?? 0,
    };

    // Get icon for this component type
    const componentIconInfo = useMemo(() => getComponentIcon(component.type), [component.type]);
    const ComponentIcon = componentIconInfo.icon;

    const labelId = useId();
    const descriptionId = useId();
    const statusId = useId();
    const liveRegionRef = useRef<HTMLDivElement | null>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const renderStartRef = useRef<number>(0);
    const renderCountRef = useRef<number>(0);
    const snapshotRef = useRef<RenderSnapshot | null>(null);

    if (import.meta.env.DEV) {
      renderStartRef.current = performance.now();
    }

    useEffect(() => {
      if (!import.meta.env.DEV) {
        return;
      }

      const duration = performance.now() - renderStartRef.current;
      const previous = snapshotRef.current;
      const snapshot: RenderSnapshot = {
        selected: isSelected,
        dragging: isDragging,
        label: componentLabel,
        theme: effectiveThemeKey,
        health: healthStatus,
        incoming: connectionSummary.incoming,
        outgoing: connectionSummary.outgoing,
        highlight: Boolean(highlight),
      };

      const changed: string[] = [];
      if (previous) {
        if (previous.selected !== snapshot.selected) changed.push('selected');
        if (previous.dragging !== snapshot.dragging) changed.push('dragging');
        if (previous.label !== snapshot.label) changed.push('label');
        if (previous.theme !== snapshot.theme) changed.push('theme');
        if (previous.health !== snapshot.health) changed.push('health');
        if (previous.incoming !== snapshot.incoming) changed.push('incoming');
        if (previous.outgoing !== snapshot.outgoing) changed.push('outgoing');
        if (previous.highlight !== snapshot.highlight) changed.push('highlight');
      } else {
        changed.push('mount');
      }

      snapshotRef.current = snapshot;
      renderCountRef.current += 1;

      try {
        componentOptimizer.recordSample({
          componentId: `OptimizedNode:${id}`,
          duration,
          timestamp: performance.now(),
          commitType: previous ? 'update' : 'mount',
          propsChanged: changed,
        });

        if (renderCountRef.current % 25 === 0) {
          console.debug(`[OptimizedNode] Render count ${renderCountRef.current}`, {
            id,
            label: componentLabel,
            duration: Number(duration.toFixed(2)),
            position,
          });
        }
      } catch (error) {
        errorStore.addError(error as Error, 'performance', {
          additionalData: {
            nodeId: id,
            componentLabel,
            duration,
          },
        });
      }
    }, [
      componentLabel,
      connectionSummary.incoming,
      connectionSummary.outgoing,
      effectiveThemeKey,
      healthStatus,
      highlight,
      id,
      isDragging,
      isSelected,
      position,
    ]);

    useEffect(() => {
      if (!liveRegionRef.current) return;
      const parts: string[] = [componentLabel];
      parts.push(isSelected ? 'selected' : 'not selected');
      parts.push(`health ${HEALTH_STATUS_LABELS[healthStatus]}`);
      parts.push(`${connectionSummary.incoming} incoming, ${connectionSummary.outgoing} outgoing connections`);
      liveRegionRef.current.textContent = parts.join('. ');
    }, [
      componentLabel,
      connectionSummary.incoming,
      connectionSummary.outgoing,
      healthStatus,
      isSelected,
    ]);

    useEffect(() => {
      if (!contextMenu) return;
      const close = () => setContextMenu(null);
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setContextMenu(null);
        }
      };

      window.addEventListener('click', close);
      window.addEventListener('contextmenu', close);
      window.addEventListener('keydown', handleEscape);
      return () => {
        window.removeEventListener('click', close);
        window.removeEventListener('contextmenu', close);
        window.removeEventListener('keydown', handleEscape);
      };
    }, [contextMenu]);

    const properties = useMemo(
      () => buildPropertyEntries(component, metadata),
      [component, metadata]
    );

    const showHandles =
      (isHovered || isSelected || connectionState?.connecting || Boolean(connectionState?.activeHandle)) &&
      !isDisabled;
    const isConnectable = connectionState?.isConnectable ?? true;

    const nodeStyle = useMemo(() => {
      const style: CSSProperties & Record<string, string | number> = {
        '--node-bg': themePalette.background,
        '--node-border': isSelected ? themePalette.accent : themePalette.border,
        '--node-text': themePalette.text,
        '--node-subtle-text': themePalette.subtleText,
        '--node-accent': themePalette.accent,
        '--node-badge-bg': themePalette.badgeBg,
        '--node-badge-text': themePalette.badgeText,
        '--node-handle': themePalette.handle,
        '--node-handle-hover': themePalette.handleHover,
        '--node-health': healthColor,
        '--node-shadow':
          isDragging || isHovered || isFocused || isSelected ? themePalette.shadowActive : themePalette.shadow,
        background: themePalette.background,
        borderColor: isSelected ? themePalette.accent : themePalette.border,
        color: themePalette.text,
        boxShadow:
          isDragging || isHovered || isFocused || isSelected ? themePalette.shadowActive : themePalette.shadow,
        transition: 'box-shadow 140ms ease, transform 140ms ease, border-color 140ms ease',
        transform:
          isDragging ? 'scale(1.02)' : isHovered || isFocused ? 'translateY(-1px)' : 'translateY(0)',
      };

      if (styleOverrides) {
        Object.assign(style, styleOverrides);
      }

      return style;
    }, [
      healthColor,
      isDragging,
      isFocused,
      isHovered,
      isSelected,
      styleOverrides,
      themePalette.accent,
      themePalette.background,
      themePalette.badgeBg,
      themePalette.badgeText,
      themePalette.border,
      themePalette.handle,
      themePalette.handleHover,
      themePalette.health,
      themePalette.shadow,
      themePalette.shadowActive,
      themePalette.subtleText,
      themePalette.text,
    ]);

    const handleSelect = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (isDisabled) return;
        event.preventDefault();
        event.stopPropagation();
        onSelect?.(id, {
          multi: event.shiftKey,
          additive: event.metaKey || event.ctrlKey,
          source: 'click',
        });
      },
      [id, isDisabled, onSelect]
    );

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (isDisabled) return;
        const key = event.key;
        const meta = event.metaKey || event.ctrlKey;
        switch (key) {
          case 'Enter': {
            event.preventDefault();
            onEdit?.(id);
            onKeyCommand?.(id, 'enter');
            break;
          }
          case 'Delete':
          case 'Backspace': {
            event.preventDefault();
            onKeyCommand?.(id, 'delete');
            onContextAction?.(id, 'delete');
            break;
          }
          case 'd':
          case 'D': {
            if (meta) {
              event.preventDefault();
              onKeyCommand?.(id, 'duplicate');
              onContextAction?.(id, 'duplicate');
            }
            break;
          }
          case 'p':
          case 'P': {
            if (meta || event.shiftKey) {
              event.preventDefault();
              onKeyCommand?.(id, 'properties');
              onContextAction?.(id, 'properties');
            }
            break;
          }
          case ' ':
          case 'Spacebar': {
            event.preventDefault();
            onSelect?.(id, {
              multi: event.shiftKey,
              additive: event.metaKey || event.ctrlKey,
              source: 'keyboard',
            });
            break;
          }
          case 'ArrowUp':
          case 'ArrowDown':
          case 'ArrowLeft':
          case 'ArrowRight': {
            event.preventDefault();
            const direction =
              key === 'ArrowUp'
                ? 'up'
                : key === 'ArrowDown'
                ? 'down'
                : key === 'ArrowLeft'
                ? 'left'
                : 'right';
            onKeyboardNavigate?.(id, direction);
            break;
          }
          default:
            break;
        }
      },
      [id, isDisabled, onContextAction, onEdit, onKeyCommand, onKeyboardNavigate, onSelect]
    );

    const handleDoubleClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (isDisabled) return;
        event.stopPropagation();
        onEdit?.(id);
      },
      [id, isDisabled, onEdit]
    );

    const handleContextMenuEvent = useCallback(
      (event: React.MouseEvent<HTMLDivElement>) => {
        if (isDisabled) return;
        event.preventDefault();
        event.stopPropagation();
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
        });
      },
      [isDisabled]
    );

    const handleContextActionSelect = useCallback(
      (action: NodeContextAction) => {
        setContextMenu(null);
        onContextAction?.(id, action);
      },
      [id, onContextAction]
    );

    const handleMouseEnter = useCallback(() => {
      setIsHovered(true);
      onHoverChange?.(id, true);
    }, [id, onHoverChange]);

    const handleMouseLeave = useCallback(() => {
      setIsHovered(false);
      onHoverChange?.(id, false);
    }, [id, onHoverChange]);

    const handleFocus = useCallback(() => {
      setIsFocused(true);
      onFocusChange?.(id, true);
    }, [id, onFocusChange]);

    const handleBlur = useCallback(() => {
      setIsFocused(false);
      onFocusChange?.(id, false);
    }, [id, onFocusChange]);

    const connectionValidator = useCallback(
      (handleId: string, handleType: 'source' | 'target', connection: Connection) => {
        if (!validateConnectionCallback) {
          return true;
        }
        try {
          return validateConnectionCallback({
            nodeId: id,
            handleId,
            handleType,
            connection,
          });
        } catch (error) {
          errorStore.addError(error as Error, 'performance', {
            additionalData: {
              nodeId: id,
              handleId,
              handleType,
              connection,
            },
          });
          return false;
        }
      },
      [id, validateConnectionCallback]
    );

    const handleValidators = useMemo(() => {
      const map: Record<string, (connection: Connection) => boolean> = {};
      NODE_HANDLES.forEach(handle => {
        const handleId = `${id}-${handle.key}`;
        map[handle.key] = (connection: Connection) =>
          connectionValidator(handleId, handle.type, connection);
      });
      return map;
    }, [connectionValidator, id]);

    const handleConnectionInteraction = useCallback(
      (phase: 'start' | 'end', handleId: string, handleType: 'source' | 'target', connection?: Connection) => {
        try {
          if (phase === 'start') {
            onConnectionStart?.(id, handleId, handleType);
          } else {
            onConnectionEnd?.(id, handleId, handleType, connection);
          }
        } catch (error) {
          errorStore.addError(error as Error, 'performance', {
            additionalData: {
              phase,
              nodeId: id,
              handleId,
              handleType,
            },
          });
        }
      },
      [id, onConnectionEnd, onConnectionStart]
    );

    const baseHandleStyle = useMemo<CSSProperties>(
      () => ({
        width: 14,
        height: 14,
        borderRadius: '9999px',
        border: showHandles ? `2px solid ${themePalette.handle}` : `2px solid ${themePalette.handleInactive}`,
        backgroundColor: showHandles ? themePalette.handle : themePalette.handleInactive,
        opacity: showHandles ? 1 : 0,
        transition: 'opacity 120ms ease, background-color 120ms ease, border-color 120ms ease, transform 120ms ease',
        boxShadow: showHandles ? '0 0 0 2px rgba(15, 23, 42, 0.2)' : 'none',
      }),
      [showHandles, themePalette.handle, themePalette.handleInactive]
    );

    const ariaDescribedBy = [
      description ? descriptionId : null,
      statusId,
      statusMessage ? `${statusId}-message` : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <>
        <div
          ref={forwardedRef}
          role="button"
          tabIndex={isDisabled ? -1 : 0}
          aria-pressed={isSelected}
          aria-disabled={isDisabled}
          aria-label={ariaLabel ?? `${componentLabel} node`}
          aria-describedby={ariaDescribedBy || undefined}
          data-node-id={id}
          data-node-type={component.type}
          data-theme={effectiveThemeKey}
          onClick={handleSelect}
          onDoubleClick={handleDoubleClick}
          onKeyDown={handleKeyDown}
          onContextMenu={handleContextMenuEvent}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            'group relative flex min-w-[220px] flex-col gap-3 rounded-2xl border bg-[var(--node-bg)] p-4 text-sm shadow-lg outline-none transition-all',
            'focus-visible:ring-2 focus-visible:ring-[var(--node-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            {
              'ring-2 ring-[var(--node-accent)] ring-offset-2 ring-offset-slate-900': isSelected,
              'cursor-pointer': !isDisabled,
              'opacity-80': isDragging,
              'pointer-events-none opacity-60': isDisabled,
            },
            className
          )}
          style={nodeStyle}
        >
          {/* Icon and Title - prominent display */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
              <ComponentIcon className="w-7 h-7 text-white" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h3 id={labelId} className="text-base font-semibold leading-tight text-[var(--node-text)] truncate">
                {componentLabel}
              </h3>
              <span className="text-[11px] uppercase tracking-wide text-[var(--node-subtle-text)] font-medium">
                {formatComponentType(component.type)}
              </span>
            </div>
            {debugLabel ? (
              <span className="flex-shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-white/50">
                {debugLabel}
              </span>
            ) : null}
          </div>

          {/* Description */}
          {description ? (
            <p id={descriptionId} className="text-xs leading-relaxed text-[var(--node-subtle-text)] line-clamp-2">
              {description}
            </p>
          ) : null}

          {/* Status Message */}
          {statusMessage || metadata?.statusMessage ? (
            <p
              id={`${statusId}-message`}
              className="rounded-md bg-[var(--node-badge-bg)] px-2 py-1.5 text-xs text-[var(--node-badge-text)]"
            >
              {statusMessage ?? metadata?.statusMessage}
            </p>
          ) : null}

          {/* Connection Summary - clean and minimal */}
          <div className="flex items-center gap-4 text-xs border-t border-white/10 pt-2">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white/40" aria-hidden="true" />
              <span className="text-[var(--node-subtle-text)]">In:</span>
              <span className="font-semibold text-white">{connectionSummary.incoming}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-white/40" aria-hidden="true" />
              <span className="text-[var(--node-subtle-text)]">Out:</span>
              <span className="font-semibold text-white">{connectionSummary.outgoing}</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: healthColor }} aria-hidden="true" />
              <span id={statusId} className="text-[10px] uppercase tracking-wide text-[var(--node-subtle-text)]">
                {HEALTH_STATUS_LABELS[healthStatus]}
              </span>
            </div>
          </div>

          {properties.length > 0 ? (
            <ul className="flex flex-col gap-1 text-[11px] border-t border-white/10 pt-2">
              {properties.slice(0, 3).map(property => (
                <li
                  key={property.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-[var(--node-subtle-text)]">{property.label}:</span>
                  <span className="font-medium text-white">{property.value}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 text-[10px] border-t border-white/10 pt-2">
              {tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded bg-white/10 text-[var(--node-subtle-text)] uppercase tracking-wide"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {customContent ? <div className="mt-1">{customContent}</div> : null}

          {NODE_HANDLES.map(handle => {
            const handleId = `${id}-${handle.key}`;
            const validator = handleValidators[handle.key];
            return (
              <Handle
                key={handle.key}
                id={handleId}
                type={handle.type}
                position={handle.position}
                isConnectable={!isDisabled && isConnectable}
                isValidConnection={validator}
                style={baseHandleStyle}
                className="!m-0 !border-0"
                onMouseDown={() => handleConnectionInteraction('start', handleId, handle.type)}
                onMouseUp={() => handleConnectionInteraction('end', handleId, handle.type)}
                aria-label={handle.label}
              />
            );
          })}

          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-[var(--node-handle)]/20 transition-opacity duration-150',
              showHandles ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>

        {contextMenu ? (
          <div
            role="menu"
            aria-label={`${componentLabel} actions`}
            className="fixed z-[9999] min-w-[160px] rounded-lg border border-slate-700/70 bg-slate-900/95 p-1 text-sm text-slate-100 shadow-xl backdrop-blur"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={event => event.stopPropagation()}
            onContextMenu={event => event.preventDefault()}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-slate-700/60 focus:bg-slate-700/60 focus:outline-none"
              onClick={() => handleContextActionSelect('duplicate')}
            >
              Duplicate
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-slate-700/60 focus:bg-slate-700/60 focus:outline-none"
              onClick={() => handleContextActionSelect('properties')}
            >
              Properties
            </button>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-red-300 hover:bg-red-500/20 focus:bg-red-500/20 focus:outline-none"
              onClick={() => handleContextActionSelect('delete')}
            >
              Delete
            </button>
          </div>
        ) : null}

        <div ref={liveRegionRef} className="sr-only" aria-live="polite" aria-atomic="true" />
      </>
    );
  }
);
OptimizedNodeInner.displayName = 'OptimizedNodeInner';

const MemoizedOptimizedNode = createCanvasNodeComponent(OptimizedNodeInner, {
  displayName: 'OptimizedNode',
  equalityFn: optimizedNodeEquality,
  positionSensitive: true,
  styleSensitive: true,
  interactionSensitive: true,
  frequencyThreshold: 15,
});

const OptimizedNode = (props: NodeProps<OptimizedNodeData>) => (
  <NodeErrorBoundary nodeId={props.id} componentType={props.data?.component?.type}>
    <MemoizedOptimizedNode {...props} />
  </NodeErrorBoundary>
);

export { OptimizedNode };
export default OptimizedNode;