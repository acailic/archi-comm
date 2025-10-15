/**
 * Centralized type contracts for ArchiComm
 * Replaces scattered any types with strict unions and interfaces.
 */

import type { Viewport } from '@xyflow/react';

// Tooling
export type ToolType =
  | "select"
  | "pan"
  | "zoom"
  | "annotate"
  | "connect"
  | "erase"
  | "draw";

// Drawing types
export type StrokePoint = [number, number, number?];

export interface DrawingStroke {
  id: string;
  points: StrokePoint[];
  color: string;
  size: number;
  timestamp: number;
  author?: string;
  visible?: boolean;
  zIndex?: number;
  tool?: DrawingTool;
}

export type DrawingTool = "pen" | "eraser" | "highlighter" | null;

export interface DrawingSettings {
  color: string;
  size: number;
  tool: DrawingTool;
  smoothing: number;
  thinning: number;
  streamline: number;
}

// Component unions
export type ComponentType =
  | "server"
  | "database"
  | "cache"
  | "api-gateway"
  | "load-balancer"
  | "microservice"
  | "message-queue"
  | "producer"
  | "consumer"
  | "broker"
  | "dead-letter-queue"
  | "client"
  | "monitoring"
  | "storage"
  | "edge-computing"
  | "ai-ml";

// Connection unions
export type ConnectionType = "data" | "control" | "sync" | "async";
export type ConnectionDirection = "none" | "end" | "both";
export type VisualStyle = "default" | "ack" | "retry" | "error";

// Strict property groups
export interface DatabaseProperties {
  type: "relational" | "document" | "wide-column" | "graph";
  replicas?: number;
  backup?: boolean;
}

export interface ServiceProperties {
  replicas?: number;
  port?: number;
  healthCheck?: string | boolean;
}

export interface CacheProperties {
  type: "redis" | "memcached";
  ttl?: number;
  size?: string;
}

export interface ApiGatewayProperties {
  rateLimit?: string;
  authentication?: boolean;
}

export interface LoadBalancerProperties {
  algorithm?: "round-robin" | "least-connections" | "ip-hash";
  healthCheck?: boolean;
}

export interface BaseComponentProperties {
  showLabel?: boolean;
}

export type ComponentProperties =
  | (DatabaseProperties & BaseComponentProperties)
  | (ServiceProperties & BaseComponentProperties)
  | (CacheProperties & BaseComponentProperties)
  | (ApiGatewayProperties & BaseComponentProperties)
  | (LoadBalancerProperties & BaseComponentProperties)
  | (Record<string, unknown> & BaseComponentProperties);

export interface ComponentGroup {
  id: string;
  name: string;
  componentIds: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed?: boolean;
  color?: string;
  locked?: boolean;
  description?: string;
}

export interface SelectionState {
  selectedComponentIds: string[];
  selectionBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  lastSelectedId?: string;
}

export interface AlignmentGuide {
  id: string;
  type: "vertical" | "horizontal";
  position: number;
  componentIds: string[];
  visible: boolean;
  /**
   * Optional difference (in pixels) between aligned component centers.
   * Used to convey snapping strength in the UI.
   */
  delta?: number;
}

export interface ComponentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  icon: string;
  component: Omit<DesignComponent, "id" | "x" | "y">;
  popularity?: number;
  lastUsed?: number;
}

export interface DesignComponent {
  id: string;
  type: ComponentType | string;
  x: number;
  y: number;
  label: string;
  description?: string;
  properties?: ComponentProperties;
  layerId?: string;
  typeSpecificProperties?: Record<string, any>;
  groupId?: string; // Reference to parent group
  locked?: boolean; // Prevent accidental moves
  notes?: string; // Inline documentation
  tags?: string[]; // For search/filter
  width?: number; // Component width for alignment/distribution
  height?: number; // Component height for alignment/distribution
}

export interface GridConfig {
  visible: boolean;
  spacing: number;
  snapToGrid: boolean;
  color?: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  type: ConnectionType;
  protocol?: string;
  direction?: ConnectionDirection;
  visualStyle?: VisualStyle;
  /** @deprecated - use `from` instead */
  sourceId?: string;
  /** @deprecated - use `to` instead */
  targetId?: string;
  properties?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  fromHandleId?: string;
  toHandleId?: string;
  fromPortId?: string;
  toPortId?: string;
  /**
   * Precomputed smart routing path in world coordinates, if available.
   */
  smartPath?: { x: number; y: number }[];
  /**
   * Additional routing metadata (algorithm, timestamps, etc.).
   */
  routingMetadata?: {
    algorithm: "orthogonal" | "manhattan" | "direct" | "bezier";
    updatedAt: number;
    collisionsDetected?: number;
  };
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

export interface DesignMetadata {
  created?: string;
  lastModified?: string;
  version?: string;
  author?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface InfoCard {
  id: string;
  x: number;
  y: number;
  content: string;
  color?: "yellow" | "blue" | "green" | "red" | "purple";
  isEditing?: boolean;
}

export interface AnnotationReply {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

export interface AnnotationStyle {
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  opacity?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderStyle?: "solid" | "dashed" | "dotted";
  shadow?: string;
}

export interface Annotation {
  id: string;
  type: "comment" | "note" | "label" | "arrow" | "highlight";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  timestamp: number;
  author?: string;
  resolved?: boolean;
  replies?: AnnotationReply[];
  style?: AnnotationStyle;
  visible?: boolean; // Whether annotation is visible on canvas (default: true)
  zIndex?: number; // Stacking order for overlapping annotations
  color?: string; // Override color from preset
  fontSize?: number; // Text size for note/comment/label types
  borderWidth?: number; // Border thickness
  borderStyle?: "solid" | "dashed" | "dotted"; // Border style
}

// Shared viewport info used by CanvasArea and Minimap
export interface ViewportInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  worldWidth: number;
  worldHeight: number;
}

// Challenge type moved here to avoid importing from App
export interface Challenge {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: number;
  category: "system-design" | "architecture" | "scaling";
  referenceTranscript?: string;
  keyConcepts?: string[];
  tags?: string[];
}

export interface AudioData {
  blob: Blob | null;
  transcript: string;
  duration: number;
  wordCount: number;
  businessValueTags: string[];
  analysisMetrics: {
    clarityScore: number;
    technicalDepth: number;
    businessFocus: number;
  };
}

export interface ReviewResp {
  score: number;
  summary: string;
  strengths: string[];
  risks: string[];
}

// Transcription types for offline speech-to-text functionality
export interface TranscriptionSegment {
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface TranscriptionResponse {
  text: string;
  segments: TranscriptionSegment[];
}

export interface TranscriptionOptions {
  timeout?: number;
  jobId?: string;
  maxSegments?: number;
}

// Transcript comparison types
export interface TranscriptFeedback {
  wordAccuracy: number;
  keyConceptsCovered: number;
  totalKeyConcepts: number;
  lengthDifference: number;
  missingConcepts: string[];
}

// Design validation types
export interface ComponentMatch {
  templateComponent: string;
  userComponent?: string;
  userComponentId?: string;
  userComponentLabel?: string;
  matched: boolean;
  reason?: string;
}

export interface ConnectionMatch {
  expected: string;
  found: boolean;
  reason?: string;
}

export interface ValidationFeedback {
  category: "component" | "connection" | "architecture";
  type: "missing" | "extra" | "incorrect" | "positive";
  message: string;
  suggestion?: string;
}

export interface DesignValidationResult {
  score: number;
  maxScore: number;
  percentage: number;
  componentMatches: ComponentMatch[];
  connectionMatches: ConnectionMatch[];
  feedback: ValidationFeedback[];
  missingComponents: string[];
  extraComponents: string[];
  incorrectConnections: string[];
}

// ========================================
//  World-Class Canvas Features Types
// ========================================

// Canvas Frames for organization (similar to Figma frames)
export interface CanvasFrame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  locked?: boolean;
  collapsed?: boolean;
  parentFrameId?: string; // For nested frames
  zIndex?: number;
  description?: string;
  componentIds?: string[]; // Components within this frame
}

// Canvas Sections for logical grouping
export interface CanvasSection {
  id: string;
  name: string;
  description?: string;
  componentIds: string[];
  frameIds?: string[];
  color?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// Navigation history for breadcrumbs
export interface NavigationHistoryEntry {
  id: string;
  type: "frame" | "component" | "search" | "viewport";
  targetId?: string;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  timestamp: number;
  label: string;
}

// Search results for advanced canvas search
export interface SearchResult {
  id: string;
  type: "component" | "connection" | "annotation" | "frame" | "section";
  label: string;
  description?: string;
  score: number; // Relevance score
  position?: { x: number; y: number };
  metadata?: Record<string, unknown>;
}

// Presentation slides for presentation mode
export interface PresentationSlide {
  id: string;
  name: string;
  frameId?: string; // Reference to frame
  viewport: Viewport;
  focusedComponentIds?: string[];
  duration?: number; // Slide duration in seconds
  transition?: "fade" | "slide" | "zoom" | "none";
  notes?: string; // Speaker notes
  order: number;
}

// AI-generated diagram metadata
export interface AIGeneratedMetadata {
  prompt: string;
  generatedAt: number;
  model?: string;
  confidence?: number;
  suggestionsApplied: string[];
  patternsDetected?: string[];
}

export interface AIAssistantOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TextToDiagramOptions extends AIAssistantOptions {
  includeConnections?: boolean;
  style?: 'auto' | 'flowchart' | 'architecture' | 'sequence';
  complexity?: 'simple' | 'medium' | 'complex';
}

export interface AIDiagramSuggestion {
  components: DesignComponent[];
  connections: Connection[];
  explanation: string;
  confidence: number;
  metadata: AIGeneratedMetadata;
}

export interface AIAssistantResponse {
  success: boolean;
  message: string;
  suggestions?: AIDiagramSuggestion[];
  error?: string;
}

// Smart routing configuration
export interface SmartRoutingConfig {
  algorithm: "orthogonal" | "manhattan" | "bezier" | "a-star";
  avoidOverlaps: boolean;
  smartAnchors: boolean;
  gridSnap: boolean;
}

// Extended DesignData to include world-class features
export interface DesignData {
  schemaVersion?: number;
  components: DesignComponent[];
  connections: Connection[];
  infoCards?: InfoCard[];
  annotations?: Annotation[];
  drawings?: DrawingStroke[];
  layers: Layer[];
  gridConfig?: GridConfig;
  activeTool?: ToolType;
  metadata: DesignMetadata;
  // New world-class features
  frames?: CanvasFrame[];
  sections?: CanvasSection[];
  presentationSlides?: PresentationSlide[];
  aiMetadata?: AIGeneratedMetadata;
  routingConfig?: SmartRoutingConfig;
}

// Canvas AI command contracts
export interface CanvasAIInstructionContext {
  components: DesignComponent[];
  connections: Connection[];
  selectedComponentIds?: string[];
  canvasMetadata?: Record<string, unknown>;
}

export interface CanvasAIInstructionRequest {
  prompt: string;
  context: CanvasAIInstructionContext;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  allowPartial?: boolean;
  mode?: 'diagram' | 'update' | 'analysis';
}

export interface CanvasAIComponentDraft extends Partial<Omit<DesignComponent, 'id'>> {
  id?: string;
}

export interface CanvasAIConnectionDraft extends Partial<Omit<Connection, 'id'>> {
  id?: string;
  from?: string;
  to?: string;
}

export type CanvasAIAction =
  | {
      type: 'add_component';
      component: CanvasAIComponentDraft;
    }
  | {
      type: 'update_component';
      componentId: string;
      patch: CanvasAIComponentDraft;
    }
  | {
      type: 'remove_component';
      componentId: string;
    }
  | {
      type: 'add_connection';
      connection: CanvasAIConnectionDraft;
    }
  | {
      type: 'update_connection';
      connectionId: string;
      patch: CanvasAIConnectionDraft;
    }
  | {
      type: 'remove_connection';
      connectionId: string;
    }
  | {
      type: 'annotate';
      message: string;
      targetComponentId?: string;
    };

export interface CanvasAIInstructionResponse {
  actions: CanvasAIAction[];
  reasoning?: string;
  summary?: string;
  warnings?: string[];
  provider?: string;
  model?: string;
  createdAt?: number;
  rawText?: string;
}
