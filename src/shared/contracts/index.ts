/**
 * Centralized type contracts for ArchiComm
 * Replaces scattered any types with strict unions and interfaces.
 */

// Tooling
export type ToolType = 'select' | 'pan' | 'zoom' | 'annotate' | 'connect' | 'erase';

// Component unions
export type ComponentType =
  | 'server'
  | 'database'
  | 'cache'
  | 'api-gateway'
  | 'load-balancer'
  | 'microservice'
  | 'message-queue'
  | 'client'
  | 'monitoring'
  | 'storage'
  | 'edge-computing'
  | 'ai-ml';

// Connection unions
export type ConnectionType = 'data' | 'control' | 'sync' | 'async';
export type ConnectionDirection = 'none' | 'end' | 'both';

// Strict property groups
export interface DatabaseProperties {
  type: 'relational' | 'document' | 'wide-column' | 'graph';
  replicas?: number;
  backup?: boolean;
}

export interface ServiceProperties {
  replicas?: number;
  port?: number;
  healthCheck?: string | boolean;
}

export interface CacheProperties {
  type: 'redis' | 'memcached';
  ttl?: number;
  size?: string;
}

export interface ApiGatewayProperties {
  rateLimit?: string;
  authentication?: boolean;
}

export interface LoadBalancerProperties {
  algorithm?: 'round-robin' | 'least-connections' | 'ip-hash';
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

export interface DesignComponent {
  id: string;
  type: ComponentType | string;
  x: number;
  y: number;
  label: string;
  description?: string;
  properties?: ComponentProperties;
  layerId?: string;
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
  color?: 'yellow' | 'blue' | 'green' | 'red' | 'purple';
  isEditing?: boolean;
}

export interface DesignData {
  schemaVersion?: number;
  components: DesignComponent[];
  connections: Connection[];
  infoCards?: InfoCard[];
  layers: Layer[];
  gridConfig?: GridConfig;
  activeTool?: ToolType;
  metadata: DesignMetadata;
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
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  category: 'system-design' | 'architecture' | 'scaling';
  referenceTranscript?: string;
  keyConcepts?: string[];
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
