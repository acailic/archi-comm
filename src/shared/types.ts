/**
 * src/shared/types.ts
 * Shared TypeScript types used across the application
 * Provides common type definitions for components and features
 * RELEVANT FILES: contracts.ts, CanvasComponent.tsx, CanvasArea.tsx
 */

export interface Point {
  x: number;
  y: number;
}

export interface ConnectionPoint extends Point {
  id?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface Size {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface Rect extends Position, Size {}

export type ComponentType = 
  | 'server' 
  | 'client' 
  | 'database' 
  | 'queue'
  | 'cache'
  | 'load-balancer'
  | 'api-gateway'
  | 'service'
  | 'container'
  | 'storage';

export interface Component {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: Record<string, unknown>;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  label: string;
  type: ConnectionType;
  properties?: Record<string, unknown>;
}

export type ConnectionType = 
  | 'data'
  | 'control'
  | 'sync'
  | 'async';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  order: number;
}

export type GridStyle = 'dots' | 'lines';

export interface ViewportState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface SelectionState {
  selectedComponentIds: string[];
  selectedConnectionIds: string[];
  selectedLayerId: string | null;
}

export interface CanvasState {
  components: Component[];
  connections: Connection[];
  layers: Layer[];
  viewport: ViewportState;
  selection: SelectionState;
  history: {
    past: CanvasState[];
    future: CanvasState[];
  };
}