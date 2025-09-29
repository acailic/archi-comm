import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react';
import type {
  Connection,
  ConnectionType,
  VisualStyle,
} from '../../../shared/contracts';
import { useStableStyleEx } from '../../../shared/hooks/useStableLiterals';
import { componentOptimizer } from '../../../lib/performance/ComponentOptimizer';

const isDev = import.meta.env.DEV;

type EdgePathType = 'bezier' | 'smoothstep' | 'straight';

const connectionTypeColors: Record<ConnectionType, string> = {
  data: '#000000',
  control: '#000000',
  sync: '#000000',
  async: '#000000',
};

const visualStyleOverrides: Partial<Record<VisualStyle, string>> = {
  ack: '#22c55e',
  retry: '#f97316',
  error: '#ef4444',
};

const connectionTypeOptions: ConnectionType[] = [
  'data',
  'control',
  'sync',
  'async',
];

interface PerformanceSamplePayload {
  duration: number;
  propsChanged: string[];
  timestamp: number;
}

export interface OptimizedEdgeData {
  connection: Connection;
  pathType?: EdgePathType;
  theme?: 'serious' | 'playful';
  labelEditable?: boolean;
  animated?: boolean;
  disableContextMenu?: boolean;
  labelFormatter?: (connection: Connection) => string;
  ariaLabel?: string;
  metadata?: Record<string, unknown>;
  onSelect?: (edgeId: string, connection: Connection) => void;
  onEditLabel?: (edgeId: string, nextLabel: string, connection: Connection) => void;
  onDelete?: (edgeId: string, connection: Connection) => void;
  onChangeType?: (edgeId: string, type: ConnectionType, connection: Connection) => void;
  onHoverChange?: (edgeId: string, hovered: boolean, connection: Connection) => void;
  onContextMenu?: (edgeId: string, connection: Connection) => void;
  onAnnouncement?: (message: string, edgeId: string, connection: Connection) => void;
  onPerformanceSample?: (edgeId: string, connection: Connection, sample: PerformanceSamplePayload) => void;
}

type OptimizerSummary = {
  label: string;
  selected: boolean;
  pathType: EdgePathType;
  strokeColor: string;
  dashPattern: string;
  hovered: boolean;
  theme: 'serious' | 'playful';
};

interface ContextMenuState {
  x: number;
  y: number;
}

const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');

const lightenHexColor = (hexColor: string, amount = 0.15): string => {
  if (!hexColor?.startsWith('#') || (hexColor.length !== 7 && hexColor.length !== 4)) {
    return hexColor;
  }

  const hex = hexColor.length === 4
    ? `#${[...hexColor.slice(1)].map((char) => `${char}${char}`).join('')}`
    : hexColor;

  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) + 255 * amount));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) + 255 * amount));
  const b = Math.min(255, Math.round((num & 0xff) + 255 * amount));

  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
};

const computeStrokeColor = (
  connection: Connection,
  theme: 'serious' | 'playful'
): string => {
  const baseColor =
    visualStyleOverrides[connection.visualStyle ?? 'default'] ??
    connectionTypeColors[connection.type] ??
    '#2563eb';

  return theme === 'playful' ? lightenHexColor(baseColor, 0.22) : baseColor;
};

const computeDashPattern = (connection: Connection): string => {
  if (connection.visualStyle === 'error') {
    return '3 6';
  }

  if (connection.visualStyle === 'retry') {
    return '10 6';
  }

  if (connection.visualStyle === 'ack') {
    return '2 2';
  }

  if (connection.type === 'async') {
    return '12 8';
  }

  return '';
};

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const isConnectionEqual = (a?: Connection, b?: Connection): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.id === b.id &&
    a.from === b.from &&
    a.to === b.to &&
    a.label === b.label &&
    a.type === b.type &&
    a.protocol === b.protocol &&
    a.direction === b.direction &&
    a.visualStyle === b.visualStyle
  );
};

const OptimizedEdgeComponent: React.FC<EdgeProps<OptimizedEdgeData>> = (props) => {
  const {
    id,
    data,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
  } = props;

  const {
    connection,
    pathType = 'bezier',
    theme = 'serious',
    labelEditable = true,
    animated = false,
    disableContextMenu = false,
    ariaLabel,
    labelFormatter,
    onSelect,
    onEditLabel,
    onDelete,
    onChangeType,
    onHoverChange,
    onContextMenu,
    onAnnouncement,
    onPerformanceSample,
  } = data ?? {};

  if (
    !connection ||
    !isFiniteNumber(sourceX) ||
    !isFiniteNumber(sourceY) ||
    !isFiniteNumber(targetX) ||
    !isFiniteNumber(targetY)
  ) {
    if (isDev) {
      console.warn(
        '[OptimizedEdge] Incomplete edge data, skipping render',
        { id, connection, sourceX, sourceY, targetX, targetY }
      );
    }
    return null;
  }

  const [edgePath, labelX, labelY] = useMemo(() => {
    try {
      switch (pathType) {
        case 'straight':
          return getStraightPath({
            sourceX,
            sourceY,
            targetX,
            targetY,
          });
        case 'smoothstep':
          return getSmoothStepPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
          });
        case 'bezier':
        default:
          return getBezierPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
          });
      }
    } catch (error) {
      if (isDev) {
        console.error(`[OptimizedEdge] Failed to compute path for edge ${id}`, error);
      }
      return [
        `M${sourceX},${sourceY} ${targetX},${targetY}`,
        (sourceX + targetX) / 2,
        (sourceY + targetY) / 2,
      ] as const;
    }
  }, [
    id,
    pathType,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  ]);

  const sanitizedId = useMemo(() => sanitizeId(id), [id]);
  const markerBaseId = useMemo(
    () => `optimized-edge-${sanitizedId}`,
    [sanitizedId]
  );
  const glowId = `${markerBaseId}-glow`;
  const markerStartId = `${markerBaseId}-marker-start`;
  const markerEndId = `${markerBaseId}-marker-end`;

  const strokeColor = useMemo(
    () => computeStrokeColor(connection, theme),
    [connection, theme]
  );
  const dashPattern = useMemo(
    () => computeDashPattern(connection),
    [connection]
  );
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [labelDraft, setLabelDraft] = useState<string>(connection.label ?? '');
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setLabelDraft(connection.label ?? '');
  }, [connection.label]);

  useEffect(() => {
    if (selected) {
      const message = `Connection ${connection.label || connection.id} selected`;
      setAnnouncement(message);
      onAnnouncement?.(message, id, connection);
    }
  }, [selected, connection, id, onAnnouncement]);

  useEffect(() => {
    if (!contextMenu) {
      setShowTypePicker(false);
      return;
    }

    const handleDocumentClick = () => setContextMenu(null);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleDocumentClick, { once: true });
    window.addEventListener('keydown', handleEscape, { passive: true });

    return () => {
      document.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

  const direction = connection.direction ?? 'end';

  const markerStart = useMemo(() => {
    if (direction === 'both') {
      return `url(#${markerStartId})`;
    }
    return undefined;
  }, [direction, markerStartId]);

  const markerEnd = useMemo(() => {
    if (direction === 'end' || direction === 'both') {
      return `url(#${markerEndId})`;
    }
    return undefined;
  }, [direction, markerEndId]);

  const edgeStyle = useStableStyleEx(
    () => ({
      stroke: strokeColor,
      strokeWidth: selected ? 3.4 : isHovered ? 3 : 2.4,
      opacity: selected || isHovered ? 1 : 0.9,
      filter: selected ? `url(#${glowId})` : undefined,
      strokeDasharray: dashPattern || undefined,
      transition: 'stroke 140ms ease, stroke-width 140ms ease, opacity 140ms ease',
    }),
    [strokeColor, selected, isHovered, glowId, dashPattern]
  );

  const labelWrapperStyle = useStableStyleEx(
    () => ({
      position: 'absolute',
      transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
      pointerEvents: 'auto',
      minWidth: 72,
      maxWidth: 220,
      borderRadius: 8,
      padding: '5px 10px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
      backgroundColor: '#ffffff',
      color: '#000000',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      fontSize: 11,
      lineHeight: 1.4,
      zIndex: selected ? 3 : 2,
      outline: selected
        ? `2px solid ${strokeColor}`
        : isHovered
        ? `1px solid ${strokeColor}44`
        : 'none',
      transition: 'outline 140ms ease, box-shadow 140ms ease',
    }),
    [labelX, labelY, selected, strokeColor, isHovered]
  );

  const labelButtonStyle = useStableStyleEx(
    () => ({
      all: 'unset',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      alignItems: 'flex-start',
      width: '100%',
      textAlign: 'left',
      outline: 'none',
    }),
    []
  );

  const labelInputStyle = useStableStyleEx(
    () => ({
      width: '100%',
      borderRadius: 6,
      border: `1px solid #000000`,
      padding: '4px 6px',
      fontSize: 11,
      fontWeight: 600,
      color: '#000000',
      backgroundColor: '#ffffff',
      boxShadow: '0 0 0 2px rgba(0, 0, 0, 0.08)',
      outline: 'none',
    }),
    [strokeColor]
  );

  const labelPrimaryTextStyle = useStableStyleEx(
    () => ({
      fontWeight: 600,
      letterSpacing: '0.01em',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }),
    []
  );

  const labelSecondaryTextStyle = useStableStyleEx(
    () => ({
      fontSize: 11,
      fontWeight: 500,
      opacity: 0.85,
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
    }),
    []
  );

  const contextMenuStyle = useStableStyleEx(
    () => ({
      position: 'absolute',
      transform: `translate(-50%, -50%) translate(${(contextMenu?.x ?? labelX)}px, ${(contextMenu?.y ?? labelY) + 52}px)`,
      pointerEvents: 'auto',
      display: contextMenu ? 'flex' : 'none',
      flexDirection: 'column',
      gap: 0,
      minWidth: 180,
      borderRadius: 10,
      padding: '6px 0',
      backgroundColor: '#ffffff',
      color: '#000000',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
      zIndex: 1000,
    }),
    [contextMenu?.x, contextMenu?.y, labelX, labelY]
  );

  const contextMenuButtonStyle = useStableStyleEx(
    () => ({
      all: 'unset',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 500,
      transition: 'background-color 120ms ease, color 120ms ease',
    }),
    []
  );

  const srStyle = useStableStyleEx(
    () => ({
      position: 'absolute',
      width: 1,
      height: 1,
      margin: -1,
      padding: 0,
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)',
      whiteSpace: 'nowrap',
      border: 0,
    }),
    []
  );

  const labelText = useMemo(() => {
    if (isEditing) {
      return labelDraft;
    }

    if (labelFormatter) {
      return labelFormatter(connection);
    }

    return connection.label || `${connection.from} → ${connection.to}`;
  }, [isEditing, labelDraft, labelFormatter, connection]);

  const metadataLine = useMemo(() => {
    const segments: string[] = [];

    if (connection.type) {
      segments.push(connection.type.toUpperCase());
    }

    if (connection.protocol) {
      segments.push(connection.protocol.toUpperCase());
    }

    if (connection.visualStyle && connection.visualStyle !== 'default') {
      segments.push(connection.visualStyle.toUpperCase());
    }

    return segments.join(' • ');
  }, [connection.type, connection.protocol, connection.visualStyle]);

  const accessibleDescription =
    ariaLabel ??
    `Connection ${connection.label || connection.id} from ${connection.from} to ${connection.to}, type ${connection.type}`;

  const inputRef = useRef<HTMLInputElement>(null);
  const hasMountedRef = useRef(false);
  const prevSummaryRef = useRef<OptimizerSummary | null>(null);
  const renderStartRef = useRef(0);

  if (isDev) {
    renderStartRef.current = performance.now();
  }

  const optimizerSummary = useMemo<OptimizerSummary>(
    () => ({
      label: connection.label ?? '',
      selected,
      pathType,
      strokeColor,
      dashPattern,
      hovered: isHovered,
      theme,
    }),
    [connection.label, selected, pathType, strokeColor, dashPattern, isHovered, theme]
  );

  useEffect(() => {
    if (!isDev || !connection) {
      return;
    }

    const duration = performance.now() - renderStartRef.current;
    const previous = prevSummaryRef.current;
    const changed: string[] = [];

    if (previous) {
      (Object.keys(previous) as Array<keyof OptimizerSummary>).forEach((key) => {
        if (previous[key] !== optimizerSummary[key]) {
          changed.push(String(key));
        }
      });
    } else {
      changed.push('initial');
    }

    componentOptimizer.recordSample({
      componentId: `OptimizedEdge:${id}`,
      duration,
      timestamp: performance.now(),
      commitType: hasMountedRef.current ? 'update' : 'mount',
      propsChanged: changed,
    });

    onPerformanceSample?.(id, connection, {
      duration,
      propsChanged: changed,
      timestamp: performance.now(),
    });

    prevSummaryRef.current = optimizerSummary;
    hasMountedRef.current = true;
  }, [optimizerSummary, id, connection, onPerformanceSample]);

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isEditing]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleSelect = useCallback(
    (event?: React.SyntheticEvent) => {
      event?.stopPropagation();
      onSelect?.(id, connection);
    },
    [onSelect, id, connection]
  );

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<SVGPathElement> | React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (labelEditable) {
        setIsEditing(true);
        setContextMenu(null);
      } else if (onEditLabel) {
        onEditLabel(id, connection.label ?? '', connection);
      }
    },
    [labelEditable, onEditLabel, id, connection]
  );

  const handleHoverChange = useCallback(
    (hovered: boolean) => {
      setIsHovered(hovered);
      onHoverChange?.(id, hovered, connection);
    },
    [onHoverChange, id, connection]
  );

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      onContextMenu?.(id, connection);

      if (disableContextMenu) {
        return;
      }

      setContextMenu({
        x: labelX,
        y: labelY,
      });
    },
    [onContextMenu, id, connection, disableContextMenu, labelX, labelY]
  );

  const commitLabel = useCallback(
    (nextValue: string, reason: 'submit' | 'cancel') => {
      if (reason === 'cancel') {
        setLabelDraft(connection.label ?? '');
        setIsEditing(false);
        return;
      }

      const trimmed = nextValue.trim();
      setIsEditing(false);

      if (trimmed && trimmed !== connection.label) {
        onEditLabel?.(id, trimmed, connection);
      } else {
        setLabelDraft(connection.label ?? '');
      }
    },
    [connection, id, onEditLabel]
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitLabel(event.currentTarget.value, 'submit');
      } else if (event.key === 'Escape') {
        event.preventDefault();
        commitLabel(event.currentTarget.value, 'cancel');
      }
    },
    [commitLabel]
  );

  const handleKeyboardInteraction = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelect(event);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onDelete?.(id, connection);
      } else if ((event.key === 'E' || event.key === 'e') && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsEditing(true);
      }
    },
    [handleSelect, onDelete, id, connection]
  );

  const handleDelete = useCallback(() => {
    onDelete?.(id, connection);
    closeContextMenu();
  }, [onDelete, id, connection, closeContextMenu]);

  const handleChangeType = useCallback(
    (nextType: ConnectionType) => {
      onChangeType?.(id, nextType, connection);
      closeContextMenu();
    },
    [onChangeType, id, connection, closeContextMenu]
  );

  return (
    <>
      <defs>
        <marker
          id={markerEndId}
          markerWidth="14"
          markerHeight="10"
          refX="10"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={strokeColor}
            opacity={0.92}
          />
        </marker>
        <marker
          id={markerStartId}
          markerWidth="14"
          markerHeight="10"
          refX="4"
          refY="5"
          orient="auto-start-reverse"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 5 L 10 0 L 10 10 z"
            fill={strokeColor}
            opacity={0.9}
          />
        </marker>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        data-edge-id={id}
        aria-label={accessibleDescription}
        role="button"
        tabIndex={-1}
      >
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          markerStart={markerStart}
          style={edgeStyle}
          interactionWidth={26}
          aria-label={accessibleDescription}
          onClick={handleSelect}
          onPointerEnter={() => handleHoverChange(true)}
          onPointerLeave={() => handleHoverChange(false)}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        />
        {animated && (
          <animate
            attributeName="stroke-dashoffset"
            dur="1.2s"
            repeatCount="indefinite"
            from="0"
            to="24"
          />
        )}
      </g>

      <EdgeLabelRenderer>
        <div
          style={labelWrapperStyle}
          data-edge-label-id={id}
          data-theme={theme}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              aria-label={`Edit label for connection ${connection.label ?? connection.id}`}
              style={labelInputStyle}
              defaultValue={labelDraft}
              onBlur={(event) => commitLabel(event.currentTarget.value, 'submit')}
              onKeyDown={handleInputKeyDown}
            />
          ) : (
            <button
              type="button"
              style={labelButtonStyle}
              onClick={handleSelect}
              onDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
              onKeyDown={handleKeyboardInteraction}
              aria-pressed={selected}
              tabIndex={0}
              title={accessibleDescription}
            >
              <span style={labelPrimaryTextStyle}>
                <span>{labelText}</span>
              </span>
              {metadataLine && (
                <span style={labelSecondaryTextStyle}>{metadataLine}</span>
              )}
            </button>
          )}
        </div>
      </EdgeLabelRenderer>

      {contextMenu && (
        <EdgeLabelRenderer>
          <div
            role="menu"
            aria-label={`Connection actions for ${connection.label ?? connection.id}`}
            style={contextMenuStyle}
          >
            <button
              type="button"
              style={contextMenuButtonStyle}
              onClick={() => {
                setIsEditing(true);
                closeContextMenu();
              }}
            >
              Edit label
              <span aria-hidden="true">⌘E</span>
            </button>
            <button
              type="button"
              style={contextMenuButtonStyle}
              onClick={handleDelete}
            >
              Delete connection
              <span aria-hidden="true">⌫</span>
            </button>
            <button
              type="button"
              style={contextMenuButtonStyle}
              onClick={() => setShowTypePicker((prev) => !prev)}
              aria-expanded={showTypePicker}
            >
              Change type
              <span aria-hidden="true">▸</span>
            </button>
            {showTypePicker && (
              <div
                role="group"
                aria-label="Select connection type"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 0',
                }}
              >
                {connectionTypeOptions.map((typeOption) => (
                  <button
                    key={typeOption}
                    type="button"
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      padding: '6px 20px',
                      fontSize: 12,
                      fontWeight: 600,
                      color:
                        typeOption === connection.type
                          ? strokeColor
                          : theme === 'playful'
                          ? '#312e81'
                          : '#cbd5f5',
                    }}
                    onClick={() => handleChangeType(typeOption)}
                  >
                    {typeOption.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}

      <EdgeLabelRenderer>
        <div aria-live="polite" style={srStyle}>
          {announcement}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const areEdgePropsEqual = (
  previous: EdgeProps<OptimizedEdgeData>,
  next: EdgeProps<OptimizedEdgeData>
): boolean => {
  if (previous === next) {
    return true;
  }

  const connectionEqual = isConnectionEqual(
    previous.data?.connection,
    next.data?.connection
  );

  return (
    previous.id === next.id &&
    previous.selected === next.selected &&
    previous.sourceX === next.sourceX &&
    previous.sourceY === next.sourceY &&
    previous.targetX === next.targetX &&
    previous.targetY === next.targetY &&
    previous.sourcePosition === next.sourcePosition &&
    previous.targetPosition === next.targetPosition &&
    connectionEqual &&
    previous.data?.pathType === next.data?.pathType &&
    previous.data?.theme === next.data?.theme &&
    previous.data?.labelEditable === next.data?.labelEditable &&
    previous.data?.disableContextMenu === next.data?.disableContextMenu
  );
};

export const OptimizedEdge = React.memo(OptimizedEdgeComponent, areEdgePropsEqual);
export default OptimizedEdge;