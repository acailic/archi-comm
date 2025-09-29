import type { CSSProperties } from "react";
import {
  MarkerType,
  type Edge,
  type MarkerType as MarkerTypeType,
  type Node,
  type XYPosition,
} from "@xyflow/react";

import {
  addError as logErrorToStore,
  type ErrorCategory,
} from "../../../lib/logging/errorStore";
import { LRUCache } from "../../../lib/performance/LRUCache";
import type {
  ComponentProperties,
  Connection,
  ConnectionDirection,
  ConnectionType,
  DesignComponent,
  GridConfig,
  VisualStyle,
} from "../../../shared/contracts";
import type { LayoutPositions } from "../contexts/CanvasContext";

const DEFAULT_GRID_SPACING = 20;
const DEFAULT_NODE_TYPE = "design-component";
const DEFAULT_EDGE_TYPE = "smoothstep";
const NODE_CACHE_LIMIT = 1_024;
const EDGE_CACHE_LIMIT = 2_048;
const NODE_POOL_LIMIT = 2_048;
const EDGE_POOL_LIMIT = 4_096;

type DevLogLevel = "error" | "warn" | "info";

interface NodeBounds {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface CanvasNodeData {
  component: DesignComponent;
  componentId: string;
  componentType: DesignComponent["type"];
  label: string;
  description?: string;
  properties?: ComponentProperties;
  propertySnapshot: Record<string, unknown>;
  layerId?: string;
  position: XYPosition;
  selectionState: "selected" | "not-selected";
  metadata?: Record<string, unknown>;
}

export interface EdgeStyleSnapshot {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity?: number;
  className?: string;
}

export interface CanvasEdgeData {
  connection: Connection;
  connectionId: string;
  from: string;
  to: string;
  label: string;
  connectionType: ConnectionType | string;
  direction: ConnectionDirection;
  protocol?: string;
  visualStyle: VisualStyle | undefined;
  selectionState: "selected" | "not-selected";
  metadata?: Record<string, unknown>;
  styleSnapshot: EdgeStyleSnapshot;
}

export type CanvasNode = Node<CanvasNodeData>;
export type CanvasEdge = Edge<CanvasEdgeData>;

export interface DesignComponentToNodeOptions {
  selected?: boolean;
  layoutPositions?: LayoutPositions;
  grid?: Partial<GridConfig>;
  bounds?: NodeBounds;
  metadata?: Record<string, unknown>;
  nodeType?: string;
  allowNegativeCoordinates?: boolean;
  positionOverride?: XYPosition;
}

export interface ComponentsToNodesOptions
  extends Omit<DesignComponentToNodeOptions, "selected" | "positionOverride"> {
  selectedIds?: Iterable<string>;
  nodeTypeMap?: Partial<Record<string, string>>;
  metadataBuilder?: (
    component: DesignComponent
  ) => Record<string, unknown> | undefined;
}

export interface ConnectionToEdgeOptions {
  selected?: boolean;
  knownNodeIds?: Set<string>;
  edgeType?: string;
  edgeTypeMap?: Partial<Record<string, string>>;
  allowCircularConnections?: boolean;
  ignoreMissingEndpoints?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConnectionsToEdgesOptions
  extends Omit<
    ConnectionToEdgeOptions,
    "selected" | "edgeType" | "metadata"
  > {
  selectedIds?: Iterable<string>;
  metadataBuilder?: (
    connection: Connection
  ) => Record<string, unknown> | undefined;
}

interface CachedNodeEntry {
  signature: string;
  node: CanvasNode;
}

interface CachedEdgeEntry {
  signature: string;
  edge: CanvasEdge;
}

interface ConversionMetrics {
  cacheHits: number;
  cacheMisses: number;
  skipped: number;
  totalConversions: number;
  lastDurationMs: number;
}

interface ComponentConversionContext {
  sanitizedComponent: DesignComponent;
  position: XYPosition;
  selected: boolean;
  nodeType: string;
  propertySnapshot: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  metadataHash: string;
}

interface ConnectionConversionContext {
  sanitizedConnection: Connection;
  selected: boolean;
  edgeType: string;
  style: CSSProperties;
  styleSnapshot: EdgeStyleSnapshot;
  animated: boolean;
  markerStart?: CanvasEdge["markerStart"];
  markerEnd?: CanvasEdge["markerEnd"];
  metadata?: Record<string, unknown>;
  metadataHash: string;
}

const nodePool: CanvasNode[] = [];
const edgePool: CanvasEdge[] = [];

const nodeCacheRegistry = new Map<string, CachedNodeEntry>();
const edgeCacheRegistry = new Map<string, CachedEdgeEntry>();

const nodeConversionMetrics: ConversionMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  skipped: 0,
  totalConversions: 0,
  lastDurationMs: 0,
};

const edgeConversionMetrics: ConversionMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  skipped: 0,
  totalConversions: 0,
  lastDurationMs: 0,
};

const componentNodeCache = new LRUCache<string, CachedNodeEntry>(
  NODE_CACHE_LIMIT,
  (_, entry) => {
    nodeCacheRegistry.delete(entry.node.id);
    releaseNode(entry.node);
  }
);

const connectionEdgeCache = new LRUCache<string, CachedEdgeEntry>(
  EDGE_CACHE_LIMIT,
  (_, entry) => {
    edgeCacheRegistry.delete(entry.edge.id);
    releaseEdge(entry.edge);
  }
);

const CONNECTION_TYPE_STYLE: Record<
  ConnectionType,
  { stroke: string; strokeWidth: number; dash?: string; animated?: boolean }
> = {
  data: { stroke: "#1b72f2", strokeWidth: 2 },
  control: { stroke: "#8854d0", strokeWidth: 2.25 },
  sync: { stroke: "#2ecc71", strokeWidth: 2.25 },
  async: { stroke: "#ff9500", strokeWidth: 2, dash: "6 4", animated: true },
};

const VISUAL_STYLE_OVERRIDES: Record<
  VisualStyle,
  Partial<{ stroke: string; dash: string; strokeWidth: number }>
> = {
  default: {},
  ack: { stroke: "#27ae60", dash: "2 4" },
  retry: { stroke: "#e67e22", dash: "8 4" },
  error: { stroke: "#e74c3c", dash: "1 6", strokeWidth: 2.5 },
};

function acquireNode(): CanvasNode {
  const node = nodePool.pop();
  if (node) {
    return node;
  }
  return {
    id: "",
    position: { x: 0, y: 0 },
    data: {} as CanvasNodeData,
    type: DEFAULT_NODE_TYPE,
    selected: false,
    draggable: true,
  };
}

function releaseNode(node: CanvasNode) {
  if (nodePool.length >= NODE_POOL_LIMIT) {
    return;
  }
  node.id = "";
  node.type = DEFAULT_NODE_TYPE;
  node.selected = false;
  node.position.x = 0;
  node.position.y = 0;
  node.data = {} as CanvasNodeData;
  node.positionAbsolute = undefined;
  node.sourcePosition = undefined;
  node.targetPosition = undefined;
  node.dragging = undefined;
  if (nodePool.length < NODE_POOL_LIMIT) {
    nodePool.push(node);
  }
}

function acquireEdge(): CanvasEdge {
  const edge = edgePool.pop();
  if (edge) {
    return edge;
  }
  return {
    id: "",
    source: "",
    target: "",
    data: {} as CanvasEdgeData,
    type: DEFAULT_EDGE_TYPE,
  };
}

function releaseEdge(edge: CanvasEdge) {
  if (edgePool.length >= EDGE_POOL_LIMIT) {
    return;
  }
  edge.id = "";
  edge.source = "";
  edge.target = "";
  edge.label = undefined;
  edge.data = {} as CanvasEdgeData;
  edge.type = DEFAULT_EDGE_TYPE;
  edge.selected = false;
  edge.style = undefined;
  edge.markerStart = undefined;
  edge.markerEnd = undefined;
  edge.animated = false;
  if (edgePool.length < EDGE_POOL_LIMIT) {
    edgePool.push(edge);
  }
}

function getTimestamp(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function inDevelopment(): boolean {
  if (typeof process !== "undefined" && process.env && typeof process.env.NODE_ENV === "string") {
    return process.env.NODE_ENV !== "production";
  }
  if (typeof window !== "undefined") {
    const flag = (window as unknown as { __DEV__?: boolean }).__DEV__;
    if (typeof flag === "boolean") {
      return flag;
    }
  }
  return true;
}

function recordConversionMessage(
  level: DevLogLevel,
  message: string,
  context?: Record<string, unknown>,
  category: ErrorCategory = "performance"
) {
  if (inDevelopment() && typeof console !== "undefined") {
    const payload = { source: "canvasAdapters", ...context };
    if (level === "error") {
      console.error(`[canvasAdapters] ${message}`, payload);
    } else if (level === "warn") {
      console.warn(`[canvasAdapters] ${message}`, payload);
    } else {
      console.info(`[canvasAdapters] ${message}`, payload);
    }
  }
  try {
    logErrorToStore(message, category, {
      additionalData: { source: "canvasAdapters", ...context },
    });
  } catch {
    // Suppress logging failures
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sanitizeCoordinate(
  value: unknown,
  fallback = 0,
  allowNegative = true,
  bounds?: NodeBounds
): number {
  let result = isFiniteNumber(value) ? value : fallback;
  if (!allowNegative && result < 0) {
    result = 0;
  }
  if (bounds) {
    if (isFiniteNumber(bounds.minX) && result < (bounds.minX as number)) {
      result = bounds.minX as number;
    }
    if (isFiniteNumber(bounds.maxX) && result > (bounds.maxX as number)) {
      result = bounds.maxX as number;
    }
  }
  return result;
}

function normalizeGridConfig(grid?: Partial<GridConfig>): GridConfig {
  return {
    visible: grid?.visible ?? false,
    spacing: isFiniteNumber(grid?.spacing) ? (grid?.spacing as number) : DEFAULT_GRID_SPACING,
    snapToGrid: grid?.snapToGrid ?? false,
    color: grid?.color,
  };
}

function snapCoordinate(value: number, spacing: number): number {
  if (!spacing || spacing <= 0) {
    return value;
  }
  return Math.round(value / spacing) * spacing;
}

function toStableString(value: unknown, seen = new WeakSet<object>()): string {
  if (value === null) return "null";
  const valueType = typeof value;
  if (
    valueType === "number" ||
    valueType === "boolean" ||
    valueType === "bigint"
  ) {
    return String(value);
  }
  if (valueType === "string") {
    return JSON.stringify(value);
  }
  if (valueType === "undefined") {
    return "undefined";
  }
  if (valueType === "function") {
    return value ? `fn:${(value as Function).name || "anonymous"}` : "fn:anonymous";
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => toStableString(entry, seen)).join(",")}]`;
  }
  if (valueType === "object" && value) {
    if (seen.has(value as object)) {
      return '"[Circular]"';
    }
    seen.add(value as object);
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const serialized = keys
      .map((key) => `${JSON.stringify(key)}:${toStableString(
        (value as Record<string, unknown>)[key],
        seen
      )}`)
      .join(",");
    seen.delete(value as object);
    return `{${serialized}}`;
  }
  return JSON.stringify(value);
}

function createComponentSignature(
  component: DesignComponent,
  ctx: ComponentConversionContext
): string {
  return [
    component.id,
    component.type,
    component.label,
    component.description ?? "",
    ctx.position.x.toFixed(2),
    ctx.position.y.toFixed(2),
    ctx.selected ? "1" : "0",
    ctx.sanitizedComponent.layerId ?? "",
    toStableString(ctx.sanitizedComponent.properties ?? {}),
    ctx.metadataHash,
  ].join("|");
}

function createConnectionSignature(
  connection: Connection,
  ctx: ConnectionConversionContext
): string {
  return [
    connection.id,
    connection.from,
    connection.to,
    connection.type,
    connection.label,
    connection.protocol ?? "",
    connection.direction ?? "end",
    connection.visualStyle ?? "default",
    ctx.selected ? "1" : "0",
    ctx.edgeType,
    toStableString(ctx.styleSnapshot),
    ctx.metadataHash,
  ].join("|");
}

function toSelectionSet(ids?: Iterable<string> | null): Set<string> {
  if (!ids) {
    return new Set();
  }
  if (ids instanceof Set) {
    return ids;
  }
  const set = new Set<string>();
  for (const id of ids) {
    if (typeof id === "string") {
      set.add(id);
    }
  }
  return set;
}

function derivePropertySnapshot(component: DesignComponent): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  const properties = component.properties;
  if (!properties) return snapshot;

  if ("replicas" in properties && properties.replicas !== undefined) {
    snapshot.replicas = properties.replicas;
  }
  if ("port" in properties && properties.port !== undefined) {
    snapshot.port = properties.port;
  }
  if ("healthCheck" in properties && properties.healthCheck !== undefined) {
    snapshot.healthCheck = properties.healthCheck;
  }
  if ("ttl" in properties && properties.ttl !== undefined) {
    snapshot.ttl = properties.ttl;
  }
  if ("size" in properties && properties.size !== undefined) {
    snapshot.size = properties.size;
  }
  if ("rateLimit" in properties && properties.rateLimit !== undefined) {
    snapshot.rateLimit = properties.rateLimit;
  }
  if ("algorithm" in properties && properties.algorithm !== undefined) {
    snapshot.algorithm = properties.algorithm;
  }

  return snapshot;
}

function validateDesignComponent(component: DesignComponent, index?: number): boolean {
  if (!component || typeof component.id !== "string" || component.id.trim() === "") {
    recordConversionMessage(
      "error",
      "Encountered design component without a valid ID.",
      { component, index }
    );
    return false;
  }
  if (!isFiniteNumber(component.x) || !isFiniteNumber(component.y)) {
    recordConversionMessage(
      "warn",
      "Component position is invalid. Falling back to origin.",
      { componentId: component.id }
    );
  }
  return true;
}

function normalizeComponent(
  component: DesignComponent,
  options: DesignComponentToNodeOptions,
  layoutPositions?: LayoutPositions
): { position: XYPosition; sanitized: DesignComponent } {
  const grid = normalizeGridConfig(options.grid);
  const allowNegative = options.allowNegativeCoordinates ?? true;

  const layoutPosition = options.positionOverride
    ?? (layoutPositions ? layoutPositions[component.id] : undefined);

  let x = sanitizeCoordinate(
    layoutPosition?.x ?? component.x,
    0,
    allowNegative,
    options.bounds
  );
  let y = sanitizeCoordinate(
    layoutPosition?.y ?? component.y,
    0,
    allowNegative,
    options.bounds
  );

  if (grid.snapToGrid) {
    x = snapCoordinate(x, grid.spacing);
    y = snapCoordinate(y, grid.spacing);
  }

  const sanitized: DesignComponent = {
    ...component,
    x,
    y,
    label: component.label ?? component.id,
    type: component.type ?? DEFAULT_NODE_TYPE,
  };

  return {
    position: { x, y },
    sanitized,
  };
}

function validateConnection(
  connection: Connection,
  options?: ConnectionToEdgeOptions
): boolean {
  if (!connection || typeof connection.id !== "string" || connection.id.trim() === "") {
    recordConversionMessage(
      "error",
      "Encountered connection without a valid ID.",
      { connection }
    );
    return false;
  }
  if (!connection.from || !connection.to) {
    recordConversionMessage(
      "error",
      "Connection is missing endpoints.",
      { connectionId: connection.id }
    );
    return false;
  }
  if (!options?.allowCircularConnections && connection.from === connection.to) {
    recordConversionMessage(
      "warn",
      "Circular connection detected. Skipping conversion.",
      { connectionId: connection.id }
    );
    return false;
  }
  return true;
}

function normalizeConnection(
  connection: Connection,
  options: ConnectionToEdgeOptions
): Connection {
  return {
    id: connection.id,
    from: connection.from,
    to: connection.to,
    label: connection.label ?? connection.id,
    type: connection.type ?? "data",
    protocol: connection.protocol,
    direction: connection.direction ?? "end",
    visualStyle: connection.visualStyle ?? "default",
  };
}

function resolveNodeType(
  component: DesignComponent,
  optionType?: string,
  map?: Partial<Record<string, string>>
): string {
  if (optionType) return optionType;
  if (map && map[component.type]) return map[component.type] as string;
  return component.type ?? DEFAULT_NODE_TYPE;
}

function prepareComponentContext(
  component: DesignComponent,
  options: ComponentsToNodesOptions,
  selected: boolean
): ComponentConversionContext {
  const { position, sanitized } = normalizeComponent(component, options, options.layoutPositions);
  const metadata =
    options.metadataBuilder?.(sanitized) ?? options.metadata ?? undefined;
  const metadataHash = toStableString(metadata ?? {});
  const propertySnapshot = derivePropertySnapshot(sanitized);

  return {
    sanitizedComponent: sanitized,
    position,
    selected,
    nodeType: resolveNodeType(sanitized, options.nodeType, options.nodeTypeMap),
    propertySnapshot,
    metadata,
    metadataHash,
  };
}

function buildNodeFromContext(
  ctx: ComponentConversionContext,
  reusable?: CanvasNode
): CanvasNode {
  const node = reusable ?? acquireNode();

  node.id = ctx.sanitizedComponent.id;
  node.type = ctx.nodeType || ctx.sanitizedComponent.type || DEFAULT_NODE_TYPE;
  node.selected = ctx.selected;
  node.position = node.position ?? { x: 0, y: 0 };
  node.position.x = ctx.position.x;
  node.position.y = ctx.position.y;
  node.positionAbsolute = node.positionAbsolute ?? { x: 0, y: 0 };
  node.positionAbsolute.x = ctx.position.x;
  node.positionAbsolute.y = ctx.position.y;

  const componentCopy: DesignComponent = {
    ...ctx.sanitizedComponent,
    x: ctx.position.x,
    y: ctx.position.y,
  };

  if (inDevelopment()) {
    Object.freeze(componentCopy);
  }

  const data: CanvasNodeData = {
    component: componentCopy,
    componentId: componentCopy.id,
    componentType: componentCopy.type,
    label: componentCopy.label,
    description: componentCopy.description,
    properties: componentCopy.properties,
    propertySnapshot: ctx.propertySnapshot,
    layerId: componentCopy.layerId,
    position: { ...ctx.position },
    selectionState: ctx.selected ? "selected" : "not-selected",
    metadata: ctx.metadata,
  };

  node.data = data;
  node.dragging = false;

  return node;
}

function computeEdgePresentation(
  connection: Connection
): {
  style: CSSProperties;
  styleSnapshot: EdgeStyleSnapshot;
  animated: boolean;
} {
  const base = CONNECTION_TYPE_STYLE[connection.type as ConnectionType] ?? {
    stroke: "#7f8c8d",
    strokeWidth: 1.5,
  };
  const visual = connection.visualStyle
    ? VISUAL_STYLE_OVERRIDES[connection.visualStyle] ?? {}
    : {};
  const stroke = visual.stroke ?? base.stroke;
  const strokeWidth = visual.strokeWidth ?? base.strokeWidth;
  const dash = visual.dash ?? base.dash;

  const style: CSSProperties = {
    stroke,
    strokeWidth,
    strokeDasharray: dash,
  };

  const styleSnapshot: EdgeStyleSnapshot = {
    stroke,
    strokeWidth,
    strokeDasharray: dash,
  };

  return {
    style,
    styleSnapshot,
    animated: Boolean(base.animated),
  };
}

function deriveMarkers(
  connection: Connection,
  stroke: string
): {
  markerStart?: CanvasEdge["markerStart"];
  markerEnd?: CanvasEdge["markerEnd"];
} {
  const direction = connection.direction ?? "end";
  const marker: CanvasEdge["markerStart"] = {
    type: MarkerType.ArrowClosed as MarkerTypeType,
    color: stroke,
    width: 18,
    height: 18,
  };
  if (direction === "both") {
    return {
      markerStart: { ...marker },
      markerEnd: { ...marker },
    };
  }
  if (direction === "end") {
    return { markerEnd: { ...marker } };
  }
  return {};
}

function prepareConnectionContext(
  connection: Connection,
  options: ConnectionsToEdgesOptions,
  selected: boolean
): ConnectionConversionContext {
  const sanitized = normalizeConnection(connection, options);
  const edgeType =
    options.edgeTypeMap?.[sanitized.type] ??
    options.edgeTypeMap?.default ??
    DEFAULT_EDGE_TYPE;
  const presentation = computeEdgePresentation(sanitized);
  const metadata =
    options.metadataBuilder?.(sanitized) ?? options.metadata ?? undefined;
  const metadataHash = toStableString(metadata ?? {});
  const markers = deriveMarkers(sanitized, presentation.styleSnapshot.stroke);

  return {
    sanitizedConnection: sanitized,
    selected,
    edgeType,
    style: presentation.style,
    styleSnapshot: presentation.styleSnapshot,
    animated: presentation.animated,
    ...markers,
    metadata,
    metadataHash,
  };
}

function buildEdgeFromContext(
  ctx: ConnectionConversionContext,
  reusable?: CanvasEdge
): CanvasEdge {
  const edge = reusable ?? acquireEdge();

  edge.id = ctx.sanitizedConnection.id;
  edge.source = ctx.sanitizedConnection.from;
  edge.target = ctx.sanitizedConnection.to;
  edge.type = ctx.edgeType;
  edge.label = ctx.sanitizedConnection.label;
  edge.style = ctx.style;
  edge.animated = ctx.animated;
  edge.markerStart = ctx.markerStart;
  edge.markerEnd = ctx.markerEnd;
  edge.selected = ctx.selected;

  const connectionCopy: Connection = {
    ...ctx.sanitizedConnection,
  };
  if (inDevelopment()) {
    Object.freeze(connectionCopy);
  }

  const data: CanvasEdgeData = {
    connection: connectionCopy,
    connectionId: connectionCopy.id,
    from: connectionCopy.from,
    to: connectionCopy.to,
    label: connectionCopy.label,
    connectionType: connectionCopy.type,
    direction: connectionCopy.direction ?? "end",
    protocol: connectionCopy.protocol,
    visualStyle: connectionCopy.visualStyle,
    selectionState: ctx.selected ? "selected" : "not-selected",
    metadata: ctx.metadata,
    styleSnapshot: ctx.styleSnapshot,
  };

  edge.data = data;

  return edge;
}

/**
 * Converts a single DesignComponent into a React Flow node.
 */
export function designComponentToNode(
  component: DesignComponent,
  options: DesignComponentToNodeOptions = {}
): CanvasNode | null {
  if (!validateDesignComponent(component)) {
    return null;
  }

  const context = prepareComponentContext(
    component,
    {
      ...options,
      selectedIds: undefined,
      nodeTypeMap: undefined,
      metadataBuilder: undefined,
    },
    options.selected ?? false
  );
  return buildNodeFromContext(context);
}

/**
 * Converts a single Connection into a React Flow edge.
 */
export function connectionToEdge(
  connection: Connection,
  options: ConnectionToEdgeOptions = {}
): CanvasEdge | null {
  if (!validateConnection(connection, options)) {
    return null;
  }

  if (
    options.knownNodeIds &&
    (!options.ignoreMissingEndpoints &&
      (!options.knownNodeIds.has(connection.from) ||
        !options.knownNodeIds.has(connection.to)))
  ) {
    recordConversionMessage(
      "warn",
      "Skipping connection because one or both endpoints are missing.",
      {
        connectionId: connection.id,
        from: connection.from,
        to: connection.to,
      }
    );
    return null;
  }

  const context = prepareConnectionContext(
    connection,
    {
      ...options,
      selectedIds: undefined,
      metadataBuilder: undefined,
    },
    options.selected ?? false
  );
  return buildEdgeFromContext(context);
}

/**
 * Batch converts DesignComponent array into React Flow nodes with caching.
 */
export function componentsToNodes(
  components: DesignComponent[],
  options: ComponentsToNodesOptions = {}
): CanvasNode[] {
  const start = getTimestamp();
  const selectedSet = toSelectionSet(options.selectedIds);
  const seenIds = new Set<string>();
  const nodes: CanvasNode[] = [];
  let skipped = 0;

  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    if (!validateDesignComponent(component, index)) {
      skipped += 1;
      continue;
    }
    if (seenIds.has(component.id)) {
      recordConversionMessage(
        "warn",
        "Duplicate component ID detected. Skipping subsequent occurrence.",
        { componentId: component.id }
      );
      skipped += 1;
      continue;
    }
    seenIds.add(component.id);

    const selected = selectedSet.has(component.id);
    const context = prepareComponentContext(component, options, selected);
    const signature = createComponentSignature(
      context.sanitizedComponent,
      context
    );

    const cached = componentNodeCache.get(component.id);
    if (cached && cached.signature === signature) {
      nodeConversionMetrics.cacheHits += 1;
      nodes.push(cached.node);
      continue;
    }

    const node = buildNodeFromContext(
      context,
      cached?.signature !== signature ? cached?.node : cached?.node
    );
    const entry: CachedNodeEntry = { signature, node };
    componentNodeCache.set(component.id, entry);
    nodeCacheRegistry.set(component.id, entry);
    nodeConversionMetrics.cacheMisses += 1;
    nodes.push(node);
  }

  nodeConversionMetrics.totalConversions += nodes.length;
  nodeConversionMetrics.skipped += skipped;
  nodeConversionMetrics.lastDurationMs = getTimestamp() - start;

  return nodes;
}

/**
 * Batch converts Connection array into React Flow edges with caching.
 */
export function connectionsToEdges(
  connections: Connection[],
  options: ConnectionsToEdgesOptions = {}
): CanvasEdge[] {
  const start = getTimestamp();
  const selectedSet = toSelectionSet(options.selectedIds);
  const seenIds = new Set<string>();
  const knownNodeIds = options.knownNodeIds;
  const edges: CanvasEdge[] = [];
  let skipped = 0;

  for (let index = 0; index < connections.length; index += 1) {
    const connection = connections[index];
    const connectionOptions: ConnectionToEdgeOptions = {
      ...options,
      selected: selectedSet.has(connection.id),
    };

    if (!validateConnection(connection, connectionOptions)) {
      skipped += 1;
      continue;
    }
    if (seenIds.has(connection.id)) {
      recordConversionMessage(
        "warn",
        "Duplicate connection ID detected. Skipping subsequent occurrence.",
        { connectionId: connection.id }
      );
      skipped += 1;
      continue;
    }
    seenIds.add(connection.id);

    if (
      knownNodeIds &&
      !connectionOptions.ignoreMissingEndpoints &&
      (!knownNodeIds.has(connection.from) || !knownNodeIds.has(connection.to))
    ) {
      recordConversionMessage(
        "warn",
        "Skipping connection due to missing node endpoints.",
        {
          connectionId: connection.id,
          from: connection.from,
          to: connection.to,
        }
      );
      skipped += 1;
      continue;
    }

    const context = prepareConnectionContext(
      connection,
      options,
      connectionOptions.selected ?? false
    );
    const signature = createConnectionSignature(
      context.sanitizedConnection,
      context
    );

    const cached = connectionEdgeCache.get(connection.id);
    if (cached && cached.signature === signature) {
      edgeConversionMetrics.cacheHits += 1;
      edges.push(cached.edge);
      continue;
    }

    const edge = buildEdgeFromContext(
      context,
      cached?.signature !== signature ? cached?.edge : cached?.edge
    );
    const entry: CachedEdgeEntry = { signature, edge };
    connectionEdgeCache.set(connection.id, entry);
    edgeCacheRegistry.set(connection.id, entry);
    edgeConversionMetrics.cacheMisses += 1;
    edges.push(edge);
  }

  edgeConversionMetrics.totalConversions += edges.length;
  edgeConversionMetrics.skipped += skipped;
  edgeConversionMetrics.lastDurationMs = getTimestamp() - start;

  return edges;
}

/**
 * Converts a React Flow node back into a DesignComponent.
 */
export function nodeToDesignComponent(node: CanvasNode): DesignComponent | null {
  if (!node) {
    recordConversionMessage("warn", "Attempted to convert an undefined node.", {});
    return null;
  }
  const data = node.data;
  if (data?.component) {
    return {
      ...data.component,
      x: isFiniteNumber(node.position?.x) ? node.position.x : data.component.x,
      y: isFiniteNumber(node.position?.y) ? node.position.y : data.component.y,
    };
  }

  const fallback: DesignComponent = {
    id: node.id,
    type: (node.type as DesignComponent["type"]) ?? DEFAULT_NODE_TYPE,
    label: data?.label ?? node.id,
    description: data?.description,
    properties: data?.properties,
    x: isFiniteNumber(node.position?.x) ? node.position.x : 0,
    y: isFiniteNumber(node.position?.y) ? node.position.y : 0,
    layerId: data?.layerId,
  };

  return fallback;
}

/**
 * Converts a React Flow edge back into a Connection.
 */
export function edgeToConnection(edge: CanvasEdge): Connection | null {
  if (!edge) {
    recordConversionMessage("warn", "Attempted to convert an undefined edge.", {});
    return null;
  }
  const data = edge.data;
  if (data?.connection) {
    return {
      ...data.connection,
      from: edge.source ?? data.connection.from,
      to: edge.target ?? data.connection.to,
      label: typeof edge.label === "string" ? edge.label : data.connection.label,
    };
  }

  if (!edge.source || !edge.target) {
    recordConversionMessage(
      "error",
      "Edge is missing source or target during conversion.",
      { edgeId: edge.id }
    );
    return null;
  }

  const fallback: Connection = {
    id: edge.id,
    from: edge.source,
    to: edge.target,
    label: typeof edge.label === "string" ? edge.label : edge.id,
    type: (data?.connectionType as ConnectionType) ?? "data",
    protocol: data?.protocol,
    direction: data?.direction ?? "end",
    visualStyle: data?.visualStyle ?? "default",
  };

  return fallback;
}

/**
 * Clears adapter caches and releases pooled resources.
 */
export function clearCanvasAdapterCaches(): void {
  for (const entry of nodeCacheRegistry.values()) {
    releaseNode(entry.node);
  }
  for (const entry of edgeCacheRegistry.values()) {
    releaseEdge(entry.edge);
  }
  nodeCacheRegistry.clear();
  edgeCacheRegistry.clear();
  componentNodeCache.clear();
  connectionEdgeCache.clear();
  nodeConversionMetrics.cacheHits = 0;
  nodeConversionMetrics.cacheMisses = 0;
  nodeConversionMetrics.skipped = 0;
  nodeConversionMetrics.totalConversions = 0;
  nodeConversionMetrics.lastDurationMs = 0;
  edgeConversionMetrics.cacheHits = 0;
  edgeConversionMetrics.cacheMisses = 0;
  edgeConversionMetrics.skipped = 0;
  edgeConversionMetrics.totalConversions = 0;
  edgeConversionMetrics.lastDurationMs = 0;
  nodePool.length = 0;
  edgePool.length = 0;
}

/**
 * Retrieves adapter conversion metrics for performance monitoring.
 */
export function getCanvasAdapterMetrics(): {
  nodes: ConversionMetrics;
  edges: ConversionMetrics;
} {
  return {
    nodes: { ...nodeConversionMetrics },
    edges: { ...edgeConversionMetrics },
  };
}

export type { NodeBounds };