// src/lib/import-export/index.ts
// Main export file for the import/export system
// Provides centralized access to all import/export functionality
// RELEVANT FILES: DesignCanvas.tsx, ImportExportModal.tsx, ImportExportDropdown.tsx

// Core functionality
export { DesignSerializer } from './DesignSerializer';
export { FileValidator } from './FileValidator';

// Types and schemas
export type {
  ExportFormat,
  ImportSource,
  CanvasViewport,
  CanvasConfig,
  DesignAnalytics,
  ChallengeContext,
  ExportMetadata,
  DesignExportData,
  ImportValidationResult,
  ImportConflictType,
  ImportConflict,
  ImportOptions,
  ImportResult,
  ExportOptions,
  FileValidationSchema,
  MigrationStep,
} from './types';

export {
  EXPORT_FORMAT_VERSION,
  DEFAULT_VALIDATION_SCHEMA,
  isDesignExportData,
  isValidFormatVersion,
  createExportMetadata,
  createDesignAnalytics,
} from './types';

// Sample data for testing
export {
  basicDesign,
  complexDesign,
  sampleExportDataV1,
  legacyExportDataV09,
  invalidExportData,
  conflictingExportData,
  testScenarios,
  generateRandomDesign,
  createTestExportData,
} from './sampleDesigns';

// Convenience exports for quick usage
export const ImportExportSystem = {
  DesignSerializer,
  FileValidator,
  EXPORT_FORMAT_VERSION,
  DEFAULT_VALIDATION_SCHEMA,
} as const;