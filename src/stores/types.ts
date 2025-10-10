// src/stores/types.ts
// Shared types for canvas stores
// Common type definitions used across canvasViewStore, canvasDataStore, and canvasUIStore
// RELEVANT FILES: canvasViewStore.ts, canvasDataStore.ts, canvasUIStore.ts, shared/contracts.ts

export type CanvasMode =
  | "select"
  | "quick-connect"
  | "pan"
  | "annotation"
  | "draw";

export type PathStyle = "straight" | "curved" | "stepped";

export interface BaseActionOptions {
  source?: string;
  silent?: boolean;
  context?: Record<string, unknown>;
}
