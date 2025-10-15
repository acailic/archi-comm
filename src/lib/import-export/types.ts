// src/lib/import-export/types.ts
// Comprehensive import/export format schema and validation types
// Provides type-safe JSON serialization for designs with full metadata
// RELEVANT FILES: DesignCanvas.tsx, ImportExportModal.tsx, DesignSerializer.ts

import type { Challenge, DesignData, DesignComponent, Connection, InfoCard } from '@/shared/contracts';

// Export format version for backward compatibility
export const EXPORT_FORMAT_VERSION = '1.0';

// Export format types
export type ExportFormat = 'json' | 'png' | 'svg' | 'pdf';
export type ImportSource = 'file' | 'clipboard' | 'url';

// Canvas viewport information for import/export
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
  width?: number;
  height?: number;
}

// Canvas configuration settings
export interface CanvasConfig {
  viewport?: CanvasViewport;
  gridConfig?: {
    visible: boolean;
    spacing: number;
    snapToGrid: boolean;
    style: 'dots' | 'lines';
  };
  theme?: 'light' | 'dark' | 'auto';
  virtualizationEnabled?: boolean;
  virtualizationBufferZone?: number;
  virtualizationMaxVisible?: number;
}

// Analytics data for tracking design creation
export interface DesignAnalytics {
  componentCount: number;
  connectionCount: number;
  infoCardCount: number;
  timeSpent: number; // in seconds
  sessionStartTime?: string;
  sessionEndTime?: string;
  componentTypes: string[];
  complexity: {
    score: number;
    factors: {
      componentVariety: number;
      connectionDensity: number;
      layerComplexity: number;
    };
  };
  // World-class features
  frameCount?: number;
  sectionCount?: number;
  presentationSlideCount?: number;
  hasAIMetadata?: boolean;
  hasRoutingConfig?: boolean;
}

// Challenge context for exported designs
export interface ChallengeContext {
  id: string;
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  estimatedTime: number;
  tags?: string[];
  version?: string;
}

// Enhanced metadata for exported designs
export interface ExportMetadata {
  created: string;
  lastModified: string;
  exportedAt: string;
  version: string;
  formatVersion: string;
  author?: string;
  title?: string;
  description?: string;
  tags?: string[];
  application: {
    name: string;
    version: string;
    platform: string;
  };
}

// Complete export format schema
export interface DesignExportData {
  formatVersion: string;
  metadata: ExportMetadata;
  challenge?: ChallengeContext;
  design: DesignData;
  canvas: CanvasConfig;
  analytics: DesignAnalytics;
}

// Import validation result
export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  formatVersion?: string;
  isCompatible: boolean;
  requiresMigration: boolean;
  migrationPlan?: string[];
}

// Import conflict types
export type ImportConflictType = 'component_id' | 'connection_id' | 'info_card_id' | 'layer_id';

export interface ImportConflict {
  type: ImportConflictType;
  existingId: string;
  importedId: string;
  description: string;
  suggestedResolution: 'rename' | 'skip' | 'replace' | 'merge';
}

// Import options and settings
export interface ImportOptions {
  mode: 'replace' | 'merge' | 'append';
  handleConflicts: 'auto' | 'prompt' | 'skip';
  preserveIds: boolean;
  preservePositions: boolean;
  validateComponents: boolean;
  importCanvas: boolean;
  importAnalytics: boolean;
}

// Import result with statistics
export interface ImportResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  conflicts: ImportConflict[];
  statistics: {
    componentsImported: number;
    connectionsImported: number;
    infoCardsImported: number;
    conflictsResolved: number;
    duplicatesSkipped: number;
  };
  data?: DesignData;
  canvas?: CanvasConfig;
  analytics?: DesignAnalytics;
}

// Export options for different formats
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  includeChallenge: boolean;
  includeAnalytics: boolean;
  includeCanvas: boolean;
  compressData: boolean;
  filename?: string;
  // Image export specific options
  imageOptions?: {
    width: number;
    height: number;
    quality: number;
    background: string;
    includeGrid: boolean;
  };
  // PDF export specific options
  pdfOptions?: {
    format: 'a4' | 'letter' | 'custom';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
    includeMetadata: boolean;
  };
}

// File validation schema
export interface FileValidationSchema {
  maxFileSize: number; // in bytes
  allowedExtensions: string[];
  requiredFields: string[];
  optionalFields: string[];
  supportedVersions: string[];
}

// Migration plan for format upgrades
export interface MigrationStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  transform: (data: any) => any;
  reversible: boolean;
}

// Default validation schema
export const DEFAULT_VALIDATION_SCHEMA: FileValidationSchema = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedExtensions: ['.json', '.archicomm'],
  requiredFields: ['formatVersion', 'design', 'metadata'],
  optionalFields: ['challenge', 'canvas', 'analytics'],
  supportedVersions: ['1.0'],
};

// Type guards for validation
export function isDesignExportData(obj: any): obj is DesignExportData {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.formatVersion === 'string' &&
    typeof obj.metadata === 'object' &&
    typeof obj.design === 'object' &&
    Array.isArray(obj.design.components) &&
    Array.isArray(obj.design.connections)
  );
}

export function isValidFormatVersion(version: string): boolean {
  const supportedVersions = ['1.0'];
  return supportedVersions.includes(version);
}

// Utility functions for metadata creation
export function createExportMetadata(
  designData: DesignData,
  options: { author?: string; title?: string; description?: string; tags?: string[] } = {}
): ExportMetadata {
  return {
    created: designData.metadata.created || new Date().toISOString(),
    lastModified: designData.metadata.lastModified || new Date().toISOString(),
    exportedAt: new Date().toISOString(),
    version: designData.metadata.version || '1.0',
    formatVersion: EXPORT_FORMAT_VERSION,
    author: options.author || designData.metadata.author,
    title: options.title,
    description: options.description,
    tags: options.tags || designData.metadata.tags,
    application: {
      name: 'ArchiComm',
      version: '1.0.0',
      platform: typeof window !== 'undefined' ? 'web' : 'desktop',
    },
  };
}

export function createDesignAnalytics(
  components: DesignComponent[],
  connections: Connection[],
  infoCards: InfoCard[],
  sessionStartTime?: Date,
  sessionEndTime?: Date,
  designData?: DesignData
): DesignAnalytics {
  const componentTypes = Array.from(new Set(components.map(c => c.type)));
  const timeSpent = sessionStartTime && sessionEndTime
    ? Math.floor((sessionEndTime.getTime() - sessionStartTime.getTime()) / 1000)
    : 0;

  // Calculate complexity score based on various factors
  const componentVariety = componentTypes.length / Math.max(components.length, 1);
  const connectionDensity = connections.length / Math.max(components.length, 1);
  const layerComplexity = infoCards.length / Math.max(components.length, 1);

  const complexityScore = Math.min(
    100,
    Math.round((componentVariety * 30 + connectionDensity * 50 + layerComplexity * 20))
  );

  return {
    componentCount: components.length,
    connectionCount: connections.length,
    infoCardCount: infoCards.length,
    timeSpent,
    sessionStartTime: sessionStartTime?.toISOString(),
    sessionEndTime: sessionEndTime?.toISOString(),
    componentTypes,
    complexity: {
      score: complexityScore,
      factors: {
        componentVariety: Math.round(componentVariety * 100) / 100,
        connectionDensity: Math.round(connectionDensity * 100) / 100,
        layerComplexity: Math.round(layerComplexity * 100) / 100,
      },
    },
    // World-class features analytics
    frameCount: designData?.frames?.length || 0,
    sectionCount: designData?.sections?.length || 0,
    presentationSlideCount: designData?.presentationSlides?.length || 0,
    hasAIMetadata: !!designData?.aiMetadata,
    hasRoutingConfig: !!designData?.routingConfig,
  };
}