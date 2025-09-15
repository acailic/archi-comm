// src/lib/import-export/DesignSerializer.ts
// Comprehensive design serialization and deserialization utility
// Handles JSON export/import with validation, migration, and conflict resolution
// RELEVANT FILES: types.ts, ImportExportModal.tsx, DesignCanvas.tsx

import type { Challenge, DesignData } from '@/shared/contracts';
import type {
  DesignExportData,
  ImportValidationResult,
  ImportResult,
  ImportOptions,
  ExportOptions,
  ImportConflict,
  CanvasConfig,
  DesignAnalytics,
  ChallengeContext,
  MigrationStep,
} from './types';
import {
  createExportMetadata,
  createDesignAnalytics,
  isDesignExportData,
  isValidFormatVersion,
  EXPORT_FORMAT_VERSION,
  DEFAULT_VALIDATION_SCHEMA,
} from './types';

export class DesignSerializer {
  private sessionStartTime: Date | null = null;

  // Set session timing for analytics
  setSessionStartTime(startTime: Date): void {
    this.sessionStartTime = startTime;
  }

  // Export design to comprehensive JSON format
  async exportDesign(
    designData: DesignData,
    challenge?: Challenge,
    canvasConfig?: CanvasConfig,
    options: ExportOptions = {
      format: 'json',
      includeMetadata: true,
      includeChallenge: true,
      includeAnalytics: true,
      includeCanvas: true,
      compressData: false,
    }
  ): Promise<string> {
    try {
      // Create comprehensive export data
      const exportData: DesignExportData = {
        formatVersion: EXPORT_FORMAT_VERSION,
        metadata: createExportMetadata(designData, {
          author: 'ArchiComm User',
          title: challenge?.title,
          description: challenge?.description,
        }),
        design: this.sanitizeDesignData(designData),
        canvas: canvasConfig || this.createDefaultCanvasConfig(),
        analytics: createDesignAnalytics(
          designData.components,
          designData.connections,
          designData.infoCards || [],
          this.sessionStartTime || new Date(),
          new Date()
        ),
      };

      // Add challenge context if available and requested
      if (options.includeChallenge && challenge) {
        exportData.challenge = this.createChallengeContext(challenge);
      }

      // Remove optional sections based on options
      if (!options.includeAnalytics) {
        delete exportData.analytics;
      }
      if (!options.includeCanvas) {
        delete exportData.canvas;
      }
      if (!options.includeMetadata) {
        exportData.metadata = createExportMetadata(designData);
      }

      // Serialize to JSON
      const jsonString = JSON.stringify(exportData, null, options.compressData ? 0 : 2);

      // Log export statistics
      console.log('Design exported successfully:', {
        size: jsonString.length,
        components: designData.components.length,
        connections: designData.connections.length,
        includeChallenge: !!exportData.challenge,
      });

      return jsonString;
    } catch (error) {
      console.error('Failed to export design:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Import design from JSON with validation and conflict resolution
  async importDesign(
    jsonData: string,
    options: ImportOptions = {
      mode: 'replace',
      handleConflicts: 'auto',
      preserveIds: false,
      preservePositions: true,
      validateComponents: true,
      importCanvas: true,
      importAnalytics: true,
    }
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      errors: [],
      warnings: [],
      conflicts: [],
      statistics: {
        componentsImported: 0,
        connectionsImported: 0,
        infoCardsImported: 0,
        conflictsResolved: 0,
        duplicatesSkipped: 0,
      },
    };

    try {
      // Parse JSON
      let parsedData: any;
      try {
        parsedData = JSON.parse(jsonData);
      } catch (parseError) {
        result.errors.push('Invalid JSON format');
        return result;
      }

      // Validate format
      const validation = this.validateImportData(parsedData);
      if (!validation.isValid) {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
        return result;
      }

      // Migrate data if needed
      if (validation.requiresMigration) {
        parsedData = await this.migrateData(parsedData, validation.formatVersion!);
        result.warnings.push('Data was migrated from an older format version');
      }

      const exportData = parsedData as DesignExportData;

      // Detect conflicts
      if (options.mode === 'merge') {
        const conflicts = this.detectImportConflicts(exportData.design);
        result.conflicts = conflicts;

        if (conflicts.length > 0 && options.handleConflicts === 'prompt') {
          // Return result with conflicts for user resolution
          result.warnings.push(`Found ${conflicts.length} conflicts that require user resolution`);
          return result;
        }
      }

      // Process design data
      let processedDesign = exportData.design;
      if (options.mode === 'merge' || !options.preserveIds) {
        processedDesign = this.resolveConflicts(processedDesign, result.conflicts, options);
      }

      // Apply position adjustments if needed
      if (!options.preservePositions && options.mode === 'append') {
        processedDesign = this.adjustPositions(processedDesign);
      }

      // Validate components if requested
      if (options.validateComponents) {
        const componentValidation = this.validateComponents(processedDesign.components);
        if (componentValidation.errors.length > 0) {
          result.warnings.push(...componentValidation.errors);
        }
      }

      // Set result data
      result.data = processedDesign;

      if (options.importCanvas && exportData.canvas) {
        result.canvas = exportData.canvas;
      }

      if (options.importAnalytics && exportData.analytics) {
        result.analytics = exportData.analytics;
      }

      // Update statistics
      result.statistics.componentsImported = processedDesign.components.length;
      result.statistics.connectionsImported = processedDesign.connections.length;
      result.statistics.infoCardsImported = processedDesign.infoCards?.length || 0;
      result.statistics.conflictsResolved = result.conflicts.length;

      result.success = true;

      console.log('Design imported successfully:', result.statistics);

      return result;
    } catch (error) {
      console.error('Failed to import design:', error);
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  // Validate imported data structure and format
  private validateImportData(data: any): ImportValidationResult {
    const result: ImportValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      isCompatible: false,
      requiresMigration: false,
    };

    // Check if data is an object
    if (!data || typeof data !== 'object') {
      result.errors.push('Invalid data format: expected JSON object');
      return result;
    }

    // Check format version
    if (!data.formatVersion) {
      result.errors.push('Missing format version');
      return result;
    }

    result.formatVersion = data.formatVersion;
    result.isCompatible = isValidFormatVersion(data.formatVersion);

    if (!result.isCompatible) {
      if (this.canMigrate(data.formatVersion)) {
        result.requiresMigration = true;
        result.warnings.push(`Format version ${data.formatVersion} requires migration`);
      } else {
        result.errors.push(`Unsupported format version: ${data.formatVersion}`);
        return result;
      }
    }

    // Validate required fields
    for (const field of DEFAULT_VALIDATION_SCHEMA.requiredFields) {
      if (!data[field]) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate design structure
    if (data.design) {
      if (!Array.isArray(data.design.components)) {
        result.errors.push('Invalid design: components must be an array');
      }
      if (!Array.isArray(data.design.connections)) {
        result.errors.push('Invalid design: connections must be an array');
      }
      if (!data.design.metadata) {
        result.warnings.push('Missing design metadata');
      }
    }

    // Validate metadata structure
    if (data.metadata && (!data.metadata.created || !data.metadata.lastModified)) {
      result.warnings.push('Incomplete metadata information');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  // Detect conflicts when merging designs
  private detectImportConflicts(importedDesign: DesignData): ImportConflict[] {
    const conflicts: ImportConflict[] = [];

    // In a real implementation, this would compare against current design
    // For now, we'll simulate conflict detection

    // Check for component ID conflicts
    const duplicateComponentIds = this.findDuplicateIds(
      importedDesign.components.map(c => c.id)
    );

    for (const id of duplicateComponentIds) {
      conflicts.push({
        type: 'component_id',
        existingId: id,
        importedId: id,
        description: `Component with ID "${id}" already exists`,
        suggestedResolution: 'rename',
      });
    }

    // Check for connection ID conflicts
    const duplicateConnectionIds = this.findDuplicateIds(
      importedDesign.connections.map(c => c.id)
    );

    for (const id of duplicateConnectionIds) {
      conflicts.push({
        type: 'connection_id',
        existingId: id,
        importedId: id,
        description: `Connection with ID "${id}" already exists`,
        suggestedResolution: 'rename',
      });
    }

    return conflicts;
  }

  // Resolve import conflicts based on options
  private resolveConflicts(
    design: DesignData,
    conflicts: ImportConflict[],
    options: ImportOptions
  ): DesignData {
    if (conflicts.length === 0) return design;

    const resolvedDesign = { ...design };

    // Create ID mapping for conflict resolution
    const idMapping = new Map<string, string>();

    for (const conflict of conflicts) {
      if (options.handleConflicts === 'auto' || conflict.suggestedResolution === 'rename') {
        const newId = this.generateUniqueId(conflict.existingId);
        idMapping.set(conflict.existingId, newId);
      }
    }

    // Apply ID remapping to components
    resolvedDesign.components = resolvedDesign.components.map(component => {
      const newId = idMapping.get(component.id);
      return newId ? { ...component, id: newId } : component;
    });

    // Apply ID remapping to connections
    resolvedDesign.connections = resolvedDesign.connections.map(connection => {
      const newId = idMapping.get(connection.id);
      const newFromId = idMapping.get(connection.from);
      const newToId = idMapping.get(connection.to);

      return {
        ...connection,
        id: newId || connection.id,
        from: newFromId || connection.from,
        to: newToId || connection.to,
      };
    });

    return resolvedDesign;
  }

  // Adjust component positions for append mode
  private adjustPositions(design: DesignData): DesignData {
    // Find the rightmost and bottommost positions
    const maxX = Math.max(...design.components.map(c => c.x), 0);
    const maxY = Math.max(...design.components.map(c => c.y), 0);

    const offsetX = maxX + 200; // Add some spacing
    const offsetY = 0; // Keep same Y level

    return {
      ...design,
      components: design.components.map(component => ({
        ...component,
        x: component.x + offsetX,
        y: component.y + offsetY,
      })),
    };
  }

  // Validate component data integrity
  private validateComponents(components: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const component of components) {
      if (!component.id || !component.type) {
        errors.push(`Invalid component: missing ID or type`);
        continue;
      }

      if (typeof component.x !== 'number' || typeof component.y !== 'number') {
        warnings.push(`Component ${component.id}: invalid position coordinates`);
      }

      if (!component.label || component.label.trim() === '') {
        warnings.push(`Component ${component.id}: missing or empty label`);
      }
    }

    return { errors, warnings };
  }

  // Check if data format can be migrated
  private canMigrate(fromVersion: string): boolean {
    // For now, we'll assume all versions can be migrated to current
    return ['0.9', '0.8'].includes(fromVersion);
  }

  // Migrate data from older format versions
  private async migrateData(data: any, fromVersion: string): Promise<DesignExportData> {
    const migrationSteps: MigrationStep[] = [
      {
        fromVersion: '0.9',
        toVersion: '1.0',
        description: 'Add analytics and canvas configuration',
        reversible: false,
        transform: (oldData) => ({
          ...oldData,
          formatVersion: '1.0',
          analytics: createDesignAnalytics(
            oldData.design?.components || [],
            oldData.design?.connections || [],
            oldData.design?.infoCards || []
          ),
          canvas: this.createDefaultCanvasConfig(),
        }),
      },
    ];

    let migratedData = data;

    for (const step of migrationSteps) {
      if (step.fromVersion === fromVersion) {
        migratedData = step.transform(migratedData);
        break;
      }
    }

    return migratedData;
  }

  // Utility functions
  private sanitizeDesignData(design: DesignData): DesignData {
    return {
      ...design,
      components: design.components.map(c => ({
        ...c,
        // Ensure required fields exist
        label: c.label || '',
        properties: c.properties || {},
      })),
      connections: design.connections.map(c => ({
        ...c,
        label: c.label || '',
      })),
      infoCards: design.infoCards || [],
      layers: design.layers || [],
      metadata: {
        ...design.metadata,
        lastModified: new Date().toISOString(),
      },
    };
  }

  private createChallengeContext(challenge: Challenge): ChallengeContext {
    return {
      id: challenge.id,
      title: challenge.title,
      difficulty: challenge.difficulty,
      category: challenge.category,
      estimatedTime: challenge.estimatedTime,
    };
  }

  private createDefaultCanvasConfig(): CanvasConfig {
    return {
      viewport: { x: 0, y: 0, zoom: 1 },
      gridConfig: {
        visible: true,
        spacing: 20,
        snapToGrid: false,
        style: 'dots',
      },
      theme: 'light',
      virtualizationEnabled: false,
    };
  }

  private findDuplicateIds(ids: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const id of ids) {
      if (seen.has(id)) {
        duplicates.add(id);
      }
      seen.add(id);
    }

    return Array.from(duplicates);
  }

  private generateUniqueId(baseId: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${baseId}_imported_${timestamp}_${random}`;
  }

  // File handling utilities
  static async downloadFile(content: string, filename: string, mimeType: string = 'application/json'): Promise<void> {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      throw new Error('Download failed');
    }
  }

  static async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  }

  static validateFileSize(file: File, maxSize: number = DEFAULT_VALIDATION_SCHEMA.maxFileSize): boolean {
    return file.size <= maxSize;
  }

  static validateFileExtension(file: File, allowedExtensions: string[] = DEFAULT_VALIDATION_SCHEMA.allowedExtensions): boolean {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return allowedExtensions.includes(fileExtension);
  }
}