// src/packages/canvas/SimpleCanvas.tsx
// Simplified canvas component consolidating multiple canvas implementations
// Uses React Flow as the primary engine with simplified architecture
// RELEVANT FILES: ReactFlowCanvas.tsx, CanvasArea.tsx, CanvasController.tsx

import {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  NodeTypes,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import React, { useCallback, useMemo, useRef } from "react";
import { useDrop } from "react-dnd";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Brain,
  Database,
  Globe,
  Layers as LayersIcon,
  MessageSquare,
  Monitor,
  Server,
  Shield,
  Users,
} from "lucide-react";

import type {
  Connection as AppConnection,
  DesignComponent,
} from "../../shared/contracts";
import { cn } from "../ui/components/ui/utils";

type NodePresetKey =
  | "compute"
  | "storage"
  | "network"
  | "messaging"
  | "security"
  | "observability"
  | "data"
  | "client"
  | "ai"
  | "default";

interface NodeVisualPreset {
  icon: LucideIcon;
  backgroundClass: string;
  borderClass: string;
  textClass: string;
  accentClass: string;
  accentIconClass: string;
  chipClass: string;
  glowColor: string;
  minimapColor: string;
}

const NODE_VISUAL_PRESETS: Record<NodePresetKey, NodeVisualPreset> = {
  compute: {
    icon: Server,
    backgroundClass:
      "bg-gradient-to-br from-sky-950 via-slate-950 to-slate-900",
    borderClass: "border border-sky-500/40",
    textClass: "text-sky-100",
    accentClass: "bg-sky-500/25 border border-sky-300/30",
    accentIconClass: "text-sky-50",
    chipClass: "bg-sky-500/15 text-sky-200",
    glowColor: "rgba(56, 189, 248, 0.35)",
    minimapColor: "#38bdf8",
  },
  storage: {
    icon: Database,
    backgroundClass:
      "bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900",
    borderClass: "border border-emerald-500/35",
    textClass: "text-emerald-100",
    accentClass: "bg-emerald-500/20 border border-emerald-300/30",
    accentIconClass: "text-emerald-50",
    chipClass: "bg-emerald-500/15 text-emerald-200",
    glowColor: "rgba(16, 185, 129, 0.35)",
    minimapColor: "#10b981",
  },
  network: {
    icon: Globe,
    backgroundClass:
      "bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900",
    borderClass: "border border-indigo-500/30",
    textClass: "text-indigo-100",
    accentClass: "bg-indigo-500/20 border border-indigo-300/30",
    accentIconClass: "text-indigo-50",
    chipClass: "bg-indigo-500/15 text-indigo-200",
    glowColor: "rgba(99, 102, 241, 0.3)",
    minimapColor: "#6366f1",
  },
  messaging: {
    icon: MessageSquare,
    backgroundClass:
      "bg-gradient-to-br from-amber-950 via-amber-900 to-slate-900",
    borderClass: "border border-amber-500/35",
    textClass: "text-amber-100",
    accentClass: "bg-amber-500/20 border border-amber-300/30",
    accentIconClass: "text-amber-50",
    chipClass: "bg-amber-500/15 text-amber-200",
    glowColor: "rgba(245, 158, 11, 0.32)",
    minimapColor: "#f59e0b",
  },
  security: {
    icon: Shield,
    backgroundClass:
      "bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900",
    borderClass: "border border-rose-500/35",
    textClass: "text-rose-100",
    accentClass: "bg-rose-500/20 border border-rose-300/30",
    accentIconClass: "text-rose-50",
    chipClass: "bg-rose-500/15 text-rose-200",
    glowColor: "rgba(244, 63, 94, 0.28)",
    minimapColor: "#f43f5e",
  },
  observability: {
    icon: Monitor,
    backgroundClass:
      "bg-gradient-to-br from-purple-950 via-purple-900 to-slate-900",
    borderClass: "border border-purple-500/35",
    textClass: "text-purple-100",
    accentClass: "bg-purple-500/20 border border-purple-300/30",
    accentIconClass: "text-purple-50",
    chipClass: "bg-purple-500/15 text-purple-200",
    glowColor: "rgba(168, 85, 247, 0.3)",
    minimapColor: "#a855f7",
  },
  data: {
    icon: Activity,
    backgroundClass:
      "bg-gradient-to-br from-cyan-950 via-cyan-900 to-slate-900",
    borderClass: "border border-cyan-500/35",
    textClass: "text-cyan-100",
    accentClass: "bg-cyan-500/20 border border-cyan-300/30",
    accentIconClass: "text-cyan-50",
    chipClass: "bg-cyan-500/15 text-cyan-200",
    glowColor: "rgba(34, 211, 238, 0.32)",
    minimapColor: "#22d3ee",
  },
  client: {
    icon: Users,
    backgroundClass:
      "bg-gradient-to-br from-fuchsia-950 via-fuchsia-900 to-slate-900",
    borderClass: "border border-fuchsia-500/35",
    textClass: "text-fuchsia-100",
    accentClass: "bg-fuchsia-500/20 border border-fuchsia-300/30",
    accentIconClass: "text-fuchsia-50",
    chipClass: "bg-fuchsia-500/15 text-fuchsia-200",
    glowColor: "rgba(217, 70, 239, 0.28)",
    minimapColor: "#d946ef",
  },
  ai: {
    icon: Brain,
    backgroundClass:
      "bg-gradient-to-br from-violet-950 via-violet-900 to-slate-900",
    borderClass: "border border-violet-500/35",
    textClass: "text-violet-100",
    accentClass: "bg-violet-500/20 border border-violet-300/30",
    accentIconClass: "text-violet-50",
    chipClass: "bg-violet-500/15 text-violet-200",
    glowColor: "rgba(139, 92, 246, 0.3)",
    minimapColor: "#8b5cf6",
  },
  default: {
    icon: LayersIcon,
    backgroundClass:
      "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900",
    borderClass: "border border-slate-600/40",
    textClass: "text-slate-100",
    accentClass: "bg-slate-500/20 border border-slate-300/30",
    accentIconClass: "text-slate-50",
    chipClass: "bg-slate-500/15 text-slate-200",
    glowColor: "rgba(148, 163, 184, 0.28)",
    minimapColor: "#94a3b8",
  },
};

const NODE_PRESET_RULES: Array<{ regex: RegExp; preset: NodePresetKey }> = [
  { regex: /(server|microservice|compute|lambda|function|worker|vm|container|docker|kubernetes|edge)/i, preset: "compute" },
  { regex: /(db|database|sql|redis|storage|bucket|warehouse|lake|cache)/i, preset: "storage" },
  { regex: /(api|gateway|cdn|load ?balancer|dns|router|network|proxy|edge)/i, preset: "network" },
  { regex: /(queue|stream|kafka|rabbit|pub|sub|broker|topic|websocket|bus)/i, preset: "messaging" },
  { regex: /(auth|oauth|jwt|security|iam|firewall|shield|guard|lock)/i, preset: "security" },
  { regex: /(monitor|log|metric|alert|telemetry|insight|observability|dashboard)/i, preset: "observability" },
  { regex: /(etl|pipeline|analytics|report|bi|warehouse|lakehouse|data)/i, preset: "data" },
  { regex: /(client|app|frontend|mobile|browser|device|ui|portal)/i, preset: "client" },
  { regex: /(ai|ml|model|inference|llm|vision|nlp|cognitive)/i, preset: "ai" },
];

const resolveVisualPreset = (type: string): NodeVisualPreset => {
  const normalized = type.toLowerCase();
  for (const rule of NODE_PRESET_RULES) {
    if (rule.regex.test(normalized)) {
      return NODE_VISUAL_PRESETS[rule.preset];
    }
  }
  return NODE_VISUAL_PRESETS.default;
};

// Simple node data interface
interface SimpleNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  type: string;
  description?: string;
  color?: string;
  visual: NodeVisualPreset;
  readonly?: boolean;
  isConnectionStart?: boolean;
  isValidTarget?: boolean;
  onConnectionStart?: (id: string) => void;
  onNodeClick?: (id: string) => void;
}

// Props interface
export interface SimpleCanvasProps {
  components: DesignComponent[];
  connections: AppConnection[];
  selectedComponent?: string | null;
  connectionStart?: string | null;
  selectedAnnotationTool?: string | null;
  onConnectionStart?: (id: string) => void;
  onComponentSelect?: (id: string | null) => void;
  onComponentMove?: (id: string, x: number, y: number) => void;
  onComponentDelete?: (id: string) => void;
  onConnectionCreate?: (connection: AppConnection) => void;
  onConnectionDelete?: (id: string) => void;
  onComponentDrop?: (
    componentType: DesignComponent["type"],
    x: number,
    y: number
  ) => void;
  onCanvasClick?: () => void;
  onAnnotationCreate?: (x: number, y: number, type: string) => void;
  onQuickConnectPreviewUpdate?: (position: { x: number; y: number } | null) => void;
  readonly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Simple custom node component with visual presets
const SimpleNode: React.FC<{ data: SimpleNodeData; selected: boolean }> = ({
  data,
  selected,
}) => {
  const isConnectionStart = Boolean(data.isConnectionStart);
  const isValidTarget = Boolean(data.isValidTarget);
  const isReadonly = Boolean(data.readonly);

  const cardClasses = cn(
    "group relative w-56 rounded-lg px-4 py-3 transition-all duration-200 bg-white",
    "border-2 border-gray-800",
    "text-gray-900",
    selected ? "shadow-xl border-black ring-2 ring-gray-300" : "shadow-md",
    isConnectionStart
      ? "ring-2 ring-blue-400 border-blue-500"
      : "",
    isValidTarget
      ? "ring-2 ring-green-400 border-green-500 cursor-pointer"
      : ""
  );

  const handleBaseClasses = cn(
    "pointer-events-auto w-5 h-5 rounded-full border-3 border-gray-900 bg-white",
    "shadow-lg transition-all duration-200",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
    "hover:scale-125 hover:border-blue-600 hover:bg-blue-50 hover:shadow-xl"
  );

  const inactiveHandleClasses = selected || isConnectionStart
    ? "opacity-100"
    : "opacity-80 group-hover:opacity-100";

  const handleDescriptors = [
    {
      id: "target",
      type: "target" as const,
      position: Position.Left,
      style: { left: "-10px" },
      aria: `Connect into ${data.label} from another component`,
      title: "Drop a connection here",
      triggersStart: false,
    },
    {
      id: "target-top",
      type: "target" as const,
      position: Position.Top,
      style: { top: "-10px" },
      aria: `Connect into ${data.label} from above`,
      title: "Accept connection from above",
      triggersStart: false,
    },
    {
      id: "source",
      type: "source" as const,
      position: Position.Right,
      style: { right: "-10px" },
      aria: `Start a connection from ${data.label}`,
      title: "Start connection",
      triggersStart: true,
    },
    {
      id: "source-bottom",
      type: "source" as const,
      position: Position.Bottom,
      style: { bottom: "-10px" },
      aria: `Start a downward connection from ${data.label}`,
      title: "Start connection downward",
      triggersStart: true,
    },
  ];

  const announceLabel = `${data.label || data.type} component${
    selected ? " (selected)" : ""
  }${isReadonly ? " read only" : ""}.`;

  const handleInteraction = (event: React.SyntheticEvent) => {
    if (isReadonly) {
      return;
    }
    event.stopPropagation();
    if (event.type === "keydown") {
      const keyEvent = event as React.KeyboardEvent;
      if (keyEvent.key !== "Enter" && keyEvent.key !== " ") {
        return;
      }
      keyEvent.preventDefault();
    }
    data.onConnectionStart?.(data.id);
  };

  const handleNodeClick = (event: React.MouseEvent) => {
    if (isReadonly || !isValidTarget) {
      return;
    }
    event.stopPropagation();
    data.onNodeClick?.(data.id);
  };

  const visual = data.visual ?? resolveVisualPreset(data.type);
  const Icon = visual.icon;

  return (
    <div
      className={cardClasses}
      data-component-id={data.id}
      role="group"
      aria-label={announceLabel}
      onClick={handleNodeClick}
    >
      <span className="sr-only">
        {announceLabel} Use the connection handles around the node to link it
        to other components.
      </span>

      {/* Simple node content - icon, label and type */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 border-2 border-gray-800 flex items-center justify-center">
          <Icon className="w-5 h-5 text-gray-900" />
        </div>
        <div className="flex-1 space-y-1 min-w-0">
          <p className="text-base font-bold text-gray-900 truncate">
            {data.label || data.type}
          </p>
          <p className="text-xs text-gray-600 uppercase tracking-wide font-medium truncate">
            {data.type}
          </p>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {handleDescriptors.map((handle) => (
          <Handle
            key={handle.id}
            id={handle.id}
            type={handle.type}
            position={handle.position}
            className={cn(
              handleBaseClasses,
              inactiveHandleClasses,
              isReadonly && "hidden"
            )}
            style={handle.style}
            title={handle.title}
            aria-label={handle.aria}
            onMouseDown={(event) => {
              if (!handle.triggersStart) return;
              handleInteraction(event);
            }}
            onKeyDown={(event) => {
              if (!handle.triggersStart) return;
              handleInteraction(event);
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Convert app components to React Flow nodes
interface NodeConversionOptions {
  selectedComponent?: string | null;
  connectionStart?: string | null;
  readonly?: boolean;
  onConnectionStart?: (id: string) => void;
  onNodeClick?: (id: string) => void;
}

const convertComponentsToNodes = (
  components: DesignComponent[],
  options: NodeConversionOptions
): Node[] => {
  const {
    selectedComponent,
    connectionStart,
    readonly,
    onConnectionStart,
    onNodeClick,
  } = options;

  return components.map((component) => {
    const visual = resolveVisualPreset(String(component.type));

    // Mark as valid target if we're in quick-connect mode and this isn't the source
    const isValidTarget = Boolean(
      connectionStart &&
      connectionStart !== component.id
    );

    const data: SimpleNodeData = {
      id: component.id,
      label: component.label || component.type,
      type: component.type,
      description: component.description,
      visual,
      color: visual.minimapColor,
      readonly,
      isConnectionStart: connectionStart === component.id,
      isValidTarget,
      onConnectionStart,
      onNodeClick,
    };

    return {
      id: component.id,
      type: "simple",
      position: { x: component.x, y: component.y },
      data,
      selected: selectedComponent === component.id,
    };
  });
};

// Convert app connections to React Flow edges
const convertConnectionsToEdges = (connections: AppConnection[]): Edge[] => {
  return connections.map((connection) => {
    // Determine arrow configuration based on connection properties
    const markerEnd = connection.properties?.arrowEnd !== false ? {
      type: 'arrowclosed' as const,
      color: '#000000',
      width: 20,
      height: 20,
    } : undefined;

    const markerStart = connection.properties?.arrowStart === true ? {
      type: 'arrowclosed' as const,
      color: '#000000',
      width: 20,
      height: 20,
    } : undefined;

    return {
      id: connection.id,
      source: connection.from,
      target: connection.to,
      label: connection.label,
      type: "default", // Use default for straight lines with arrows
      animated: false,
      style: {
        stroke: '#000000', // Pure black
        strokeWidth: 3,
      },
      markerEnd,
      markerStart,
      // Ensure edges are always visible
      hidden: false,
      zIndex: 1000,
    };
  });
};

// Convert React Flow edge back to app connection
const convertEdgeToConnection = (edge: Edge | Connection): AppConnection => {
  return {
    id: "id" in edge ? edge.id! : `${edge.source}-${edge.target}`,
    from: edge.source,
    to: edge.target,
    label: "Connection",
    type: "data",
    properties: {
      arrowEnd: true,  // Arrow at end by default
      arrowStart: false, // No arrow at start by default
    },
  };
};

// Node types - memoized outside component to prevent re-creation
const nodeTypes: NodeTypes = {
  simple: SimpleNode,
};

// Main canvas component
const SimpleCanvasComponent: React.FC<SimpleCanvasProps> = ({
  components = [],
  connections = [],
  selectedComponent,
  connectionStart,
  selectedAnnotationTool,
  onConnectionStart,
  onComponentSelect,
  onComponentMove,
  onComponentDelete,
  onConnectionCreate,
  onConnectionDelete,
  onComponentDrop,
  onCanvasClick,
  onAnnotationCreate,
  onQuickConnectPreviewUpdate,
  readonly = false,
  className = "",
  style,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const lastEdgeClickRef = useRef(0);
  const reactFlowInstanceRef = useRef<any>(null);

  // Internal state for quick-connect mode
  const [internalConnectionStart, setInternalConnectionStart] = React.useState<string | null>(null);
  const activeConnectionStart = connectionStart ?? internalConnectionStart;

  const readonlyFlag = Boolean(readonly);

  const handleConnectionStart = useCallback(
    (id: string) => {
      if (readonlyFlag) {
        return;
      }

      // If external handler exists, use it; otherwise, use internal state
      if (onConnectionStart) {
        onConnectionStart(id);
      } else {
        setInternalConnectionStart(id);
      }
    },
    [onConnectionStart, readonlyFlag]
  );

  const clearConnectionStart = useCallback(() => {
    if (readonlyFlag) {
      return;
    }

    // Clear both internal and external state
    if (onConnectionStart) {
      onConnectionStart(null as any);
    } else {
      setInternalConnectionStart(null);
    }
  }, [onConnectionStart, readonlyFlag]);

  // Track mouse position for quick-connect preview
  const [mousePosition, setMousePosition] = React.useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!activeConnectionStart || !reactFlowInstanceRef.current || !reactFlowWrapper.current) {
      return;
    }

    const bounds = reactFlowWrapper.current.getBoundingClientRect();
    const flowPosition = reactFlowInstanceRef.current.screenToFlowPosition({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });

    setMousePosition(flowPosition);
    onQuickConnectPreviewUpdate?.(flowPosition);
  }, [activeConnectionStart, onQuickConnectPreviewUpdate]);

  // Handle node click during quick-connect mode to complete the connection
  const handleNodeClick = useCallback(
    (targetId: string) => {
      if (readonlyFlag || !activeConnectionStart) {
        return;
      }

      // Prevent self-connections
      if (activeConnectionStart === targetId) {
        return;
      }

      // Create the connection
      const newConnection: AppConnection = {
        id: `${activeConnectionStart}-${targetId}`,
        from: activeConnectionStart,
        to: targetId,
        label: 'Connection',
        type: 'data',
      };

      // Validate: prevent duplicate connections
      const exists = connections.some(
        conn => conn.from === activeConnectionStart && conn.to === targetId
      );

      if (!exists) {
        onConnectionCreate?.(newConnection);
      }

      // Clear the connection start state
      clearConnectionStart();
    },
    [readonlyFlag, activeConnectionStart, connections, onConnectionCreate, clearConnectionStart]
  );

  // Memoize node options with stable callback references
  const nodeOptions = React.useMemo(
    () => ({
      selectedComponent,
      connectionStart: activeConnectionStart,
      readonly: readonlyFlag,
      onConnectionStart: handleConnectionStart,
      onNodeClick: handleNodeClick,
    }),
    [selectedComponent, activeConnectionStart, readonlyFlag, handleConnectionStart, handleNodeClick]
  );

  // Convert props to React Flow format
  const initialNodes = useMemo(
    () => convertComponentsToNodes(components, nodeOptions),
    [components, nodeOptions]
  );

  const initialEdges = useMemo(
    () => convertConnectionsToEdges(connections),
    [connections]
  );

  // Convert props to React Flow format - simple and direct
  const nodes = React.useMemo(
    () => convertComponentsToNodes(components, nodeOptions),
    [components, nodeOptions]
  );

  const edges = React.useMemo(
    () => {
      const result = convertConnectionsToEdges(connections);
      console.log('[SimpleCanvas] Converting connections to edges:', {
        connections: connections.length,
        edges: result.length,
        edgeDetails: result,
      });
      return result;
    },
    [connections]
  );

  // Use React Flow's built-in state management
  const [reactFlowInstance, setReactFlowInstance] = React.useState<any>(null);

  const onInit = React.useCallback((instance: any) => {
    console.log('[SimpleCanvas] React Flow initialized');
    setReactFlowInstance(instance);
    reactFlowInstanceRef.current = instance;
  }, []);

  // Drop functionality for adding components from palette
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: "component",
      drop: (item: { type: DesignComponent["type"] }, monitor) => {
        if (!onComponentDrop || readonlyFlag) return;

        const clientOffset = monitor.getClientOffset();
        if (!clientOffset || !reactFlowWrapper.current) return;

        const reactFlowBounds =
          reactFlowWrapper.current.getBoundingClientRect();
        const position = {
          x: clientOffset.x - reactFlowBounds.left,
          y: clientOffset.y - reactFlowBounds.top,
        };

        onComponentDrop(item.type, position.x, position.y);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [onComponentDrop, readonlyFlag]
  );

  // Handle node selection
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      if (readonlyFlag) return;

      const selectedId = selectedNodes.length > 0 ? selectedNodes[0].id : null;
      onComponentSelect?.(selectedId);
    },
    [onComponentSelect, readonlyFlag]
  );

  // Handle node position changes
  const onNodesChange = React.useCallback(
    (changes: any[]) => {
      // Only handle position changes, ignore selection and other changes
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          onComponentMove?.(change.id, change.position.x, change.position.y);
        }
      });
    },
    [onComponentMove]
  );

  // Handle edge changes (required for React Flow to render edges properly)
  const onEdgesChange = React.useCallback(
    (changes: any[]) => {
      // Log edge changes for debugging
      console.log('[SimpleCanvas] Edge changes:', changes);
      // We don't need to do anything here since edges are controlled via props
      // But React Flow needs this handler to be present
    },
    []
  );

  // Handle node drag stop (position change) - backup handler
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (readonlyFlag) return;
      onComponentMove?.(node.id, node.position.x, node.position.y);
    },
    [onComponentMove, readonlyFlag]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      if (readonlyFlag) return;

      console.log('[SimpleCanvas] onConnect called with params:', params);

      const newConnection = convertEdgeToConnection(params);
      console.log('[SimpleCanvas] Created new connection:', newConnection);

      // Send to parent - DON'T update local state, let it flow back from props
      onConnectionCreate?.(newConnection);
    },
    [onConnectionCreate, readonlyFlag]
  );

  // Handle edge deletion
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (readonlyFlag) return;

      // Double-click to delete edge
      const now = Date.now();
      const lastClick = lastEdgeClickRef.current;

      if (now - lastClick < 300) {
        // Double-click within 300ms - just notify parent, don't manipulate local state
        onConnectionDelete?.(edge.id);
      }

      lastEdgeClickRef.current = now;
    },
    [onConnectionDelete, readonlyFlag]
  );

  // Handle canvas click
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (readonlyFlag) return;

    // If annotation tool is selected, create annotation at click position
    if (selectedAnnotationTool && onAnnotationCreate && reactFlowInstanceRef.current) {
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      // Get the click position relative to the canvas
      const position = reactFlowInstanceRef.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      onAnnotationCreate(position.x, position.y, selectedAnnotationTool);
      return;
    }

    // Clear connection start if active
    if (activeConnectionStart) {
      clearConnectionStart();
      setMousePosition(null);
      onQuickConnectPreviewUpdate?.(null);
    }

    onCanvasClick?.();
    onComponentSelect?.(null); // Deselect when clicking empty space
  }, [
    onCanvasClick,
    onComponentSelect,
    readonlyFlag,
    activeConnectionStart,
    clearConnectionStart,
    selectedAnnotationTool,
    onAnnotationCreate,
    onQuickConnectPreviewUpdate,
  ]);

  // Handle keyboard shortcuts
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (readonlyFlag) return;

      // Cancel quick-connect mode with Escape
      if (event.key === "Escape" && activeConnectionStart) {
        event.preventDefault();
        clearConnectionStart();
        setMousePosition(null);
        onQuickConnectPreviewUpdate?.(null);
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const selectedNodes = nodes.filter((node) => node.selected);

        if (selectedNodes.length > 0) {
          event.preventDefault();
          selectedNodes.forEach((node) => {
            onComponentDelete?.(node.id);
          });
        }
      }
    },
    [nodes, onComponentDelete, readonlyFlag, activeConnectionStart, clearConnectionStart]
  );

  // Combine refs using callback ref approach
  const setRefs = useCallback(
    (element: HTMLDivElement | null) => {
      // Set both refs to the same element
      if (reactFlowWrapper.current !== element) {
        Object.assign(reactFlowWrapper, { current: element });
      }
      drop(element);
    },
    [drop]
  );

  // Debug log to see what's being rendered
  console.log('[SimpleCanvas] Rendering with:', {
    nodesCount: nodes.length,
    edgesCount: edges.length,
    nodes: nodes.map(n => ({ id: n.id, position: n.position })),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
  });

  return (
    <div
      ref={setRefs}
      className={cn(
        "simple-canvas relative overflow-hidden rounded-lg border-2 border-gray-300 transition-shadow duration-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        isOver && canDrop
          ? "ring-2 ring-blue-500/40 shadow-lg border-blue-500"
          : "shadow-md",
        className
      )}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#ffffff",
        ...style,
      }}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-[24px] border-2 border-primary/40 transition-opacity duration-200",
          isOver && canDrop ? "opacity-100" : "opacity-0"
        )}
      />

      <ReactFlow
        className="relative z-20"
        style={{ backgroundColor: "transparent" }}
        nodes={nodes}
        edges={edges}
        onInit={onInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onMouseMove={handleMouseMove}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          style: { stroke: '#000000', strokeWidth: 3 },
          markerEnd: {
            type: 'arrowclosed',
            color: '#000000',
            width: 20,
            height: 20,
          },
        }}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        nodesDraggable={!readonlyFlag}
        nodesConnectable={!readonlyFlag}
        edgesUpdatable={!readonlyFlag}
        edgesFocusable={!readonlyFlag}
        elementsSelectable={!readonlyFlag}
        panOnDrag={!readonlyFlag}
        zoomOnScroll={true}
        zoomOnPinch={true}
        deleteKeyCode={readonlyFlag ? null : ["Delete", "Backspace"]}
        multiSelectionKeyCode={readonlyFlag ? null : "Meta"}
        proOptions={{ hideAttribution: true }}
        connectionLineStyle={{ stroke: '#000000', strokeWidth: 2 }}
        connectionLineType="default"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="#d1d5db"
        />

        <Controls
          position="bottom-right"
          showZoom={true}
          showFitView={true}
          showInteractive={!readonlyFlag}
        />

        <MiniMap
          position="bottom-left"
          nodeColor={(node) => {
            const data = node.data as SimpleNodeData;
            return data.color ?? data.visual?.minimapColor ?? "#6b7280";
          }}
          nodeBorderRadius={8}
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
};

// Wrapped with ReactFlowProvider
export const SimpleCanvas: React.FC<SimpleCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <SimpleCanvasComponent {...props} />
    </ReactFlowProvider>
  );
};

// Export utility functions
export {
  convertComponentsToNodes,
  convertConnectionsToEdges,
  convertEdgeToConnection,
};

export default SimpleCanvas;
