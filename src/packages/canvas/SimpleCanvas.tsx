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
  MiniMap,
  Node,
  NodeTypes,
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
  label: string;
  type: string;
  description?: string;
  color?: string;
  visual: NodeVisualPreset;
}

// Props interface
export interface SimpleCanvasProps {
  components: DesignComponent[];
  connections: AppConnection[];
  selectedComponent?: string | null;
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
  readonly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Simple custom node component with visual presets
const SimpleNode: React.FC<{ data: SimpleNodeData; selected: boolean }> = ({
  data,
  selected,
}) => {
  const visual = data.visual ?? resolveVisualPreset(data.type);
  const Icon = visual.icon;
  const description = data.description
    ? String(data.description)
    : "Drag this onto the canvas and connect it to related systems.";

  return (
    <div
      className={cn(
        "relative w-56 rounded-2xl px-4 py-3 transition-all duration-300 backdrop-blur-sm",
        "border border-white/10",
        visual.backgroundClass,
        visual.borderClass,
        visual.textClass,
        selected ? "scale-[1.02] shadow-lg" : "shadow-md"
      )}
      style={{
        boxShadow: selected
          ? `0 18px 38px -18px ${visual.glowColor}`
          : `0 14px 32px -24px ${visual.glowColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.2em] rounded-full px-2 py-1 shadow-inner",
            "bg-white/5 text-white/80",
            visual.chipClass
          )}
        >
          {data.type}
        </span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl backdrop-blur-lg",
            "border border-white/20 shadow-inner",
            visual.accentClass
          )}
        >
          <Icon className={cn("h-4 w-4", visual.accentIconClass)} />
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="text-sm font-semibold leading-tight">
          {data.label || data.type}
        </p>
        <p className="text-xs text-white/80 leading-snug">
          {description}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wide text-white/70">
        <span className="rounded-full bg-white/10 px-2 py-0.5">
          drag
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">
          drop to connect
        </span>
      </div>
    </div>
  );
};

// Node types
const nodeTypes: NodeTypes = {
  simple: SimpleNode,
};

// Convert app components to React Flow nodes
const convertComponentsToNodes = (
  components: DesignComponent[],
  selectedComponent?: string | null
): Node[] => {
  return components.map((component) => {
    const visual = resolveVisualPreset(String(component.type));

    return {
      id: component.id,
      type: "simple",
      position: { x: component.x, y: component.y },
      data: {
        label: component.label || component.type,
        type: component.type,
        description: component.description,
        visual,
        color: visual.minimapColor,
      } as SimpleNodeData,
      selected: selectedComponent === component.id,
    };
  });
};

// Convert app connections to React Flow edges
const convertConnectionsToEdges = (connections: AppConnection[]): Edge[] => {
  return connections.map((connection) => ({
    id: connection.id,
    source: connection.from,
    target: connection.to,
    label: connection.label,
    type: "default",
    animated: false,
  }));
};

// Convert React Flow edge back to app connection
const convertEdgeToConnection = (edge: Edge | Connection): AppConnection => {
  return {
    id: "id" in edge ? edge.id! : `${edge.source}-${edge.target}`,
    from: edge.source,
    to: edge.target,
    label: "Connection",
    type: "data",
  };
};

// Main canvas component
const SimpleCanvasComponent: React.FC<SimpleCanvasProps> = ({
  components = [],
  connections = [],
  selectedComponent,
  onComponentSelect,
  onComponentMove,
  onComponentDelete,
  onConnectionCreate,
  onConnectionDelete,
  onComponentDrop,
  onCanvasClick,
  readonly = false,
  className = "",
  style,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const lastEdgeClickRef = useRef(0);

  // Convert props to React Flow format
  const initialNodes = useMemo(
    () => convertComponentsToNodes(components, selectedComponent),
    [components, selectedComponent]
  );

  const initialEdges = useMemo(
    () => convertConnectionsToEdges(connections),
    [connections]
  );

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external changes
  React.useEffect(() => {
    setNodes(convertComponentsToNodes(components, selectedComponent));
  }, [components, selectedComponent, setNodes]);

  React.useEffect(() => {
    setEdges(convertConnectionsToEdges(connections));
  }, [connections, setEdges]);

  // Drop functionality for adding components from palette
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: "component",
      drop: (item: { type: DesignComponent["type"] }, monitor) => {
        if (!onComponentDrop || readonly) return;

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
    [onComponentDrop, readonly]
  );

  // Handle node selection
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      if (readonly) return;

      const selectedId = selectedNodes.length > 0 ? selectedNodes[0].id : null;
      onComponentSelect?.(selectedId);
    },
    [onComponentSelect, readonly]
  );

  // Handle node drag stop (position change)
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (readonly) return;

      onComponentMove?.(node.id, node.position.x, node.position.y);
    },
    [onComponentMove, readonly]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      if (readonly) return;

      const newConnection = convertEdgeToConnection(params);
      onConnectionCreate?.(newConnection);

      // Also update local state
      setEdges((eds) => addEdge(params, eds));
    },
    [onConnectionCreate, readonly, setEdges]
  );

  // Handle edge deletion
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (readonly) return;

      // Double-click to delete edge
      const now = Date.now();
      const lastClick = lastEdgeClickRef.current;

      if (now - lastClick < 300) {
        // Double-click within 300ms
        onConnectionDelete?.(edge.id);
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }

      lastEdgeClickRef.current = now;
    },
    [onConnectionDelete, readonly, setEdges]
  );

  // Handle canvas click
  const onPaneClick = useCallback(() => {
    if (readonly) return;

    onCanvasClick?.();
    onComponentSelect?.(null); // Deselect when clicking empty space
  }, [onCanvasClick, onComponentSelect, readonly]);

  // Handle keyboard shortcuts
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (readonly) return;

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
    [nodes, onComponentDelete, readonly]
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

  return (
    <div
      ref={setRefs}
      className={cn(
        "simple-canvas relative overflow-hidden rounded-[24px] border border-slate-800/40 transition-shadow duration-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        isOver && canDrop
          ? "ring-2 ring-primary/40 shadow-[0_35px_120px_-60px_rgba(56,189,248,0.65)]"
          : "shadow-[0_30px_110px_-70px_rgba(15,23,42,0.85)]",
        className
      )}
      style={{
        width: "100%",
        height: "100%",
        backgroundImage:
          "radial-gradient(160% 160% at 0% 0%, rgba(56,189,248,0.18), transparent 58%), radial-gradient(140% 140% at 90% 12%, rgba(168,85,247,0.14), transparent 60%), linear-gradient(135deg, #0f172a 0%, #111827 52%, #0b1120 100%)",
        ...style,
      }}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_35%_25%,rgba(56,189,248,0.18),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_75%_10%,rgba(236,72,153,0.12),transparent_72%)]" />
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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeDragStop={onNodeDragStop}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        nodesDraggable={!readonly}
        nodesConnectable={!readonly}
        elementsSelectable={!readonly}
        panOnDrag={!readonly}
        zoomOnScroll={true}
        zoomOnPinch={true}
        deleteKeyCode={readonly ? null : ["Delete", "Backspace"]}
        multiSelectionKeyCode={readonly ? null : "Meta"}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="rgba(148, 163, 184, 0.35)"
        />

        <Controls
          position="bottom-right"
          showZoom={true}
          showFitView={true}
          showInteractive={!readonly}
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
