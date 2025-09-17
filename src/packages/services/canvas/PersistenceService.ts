// src/services/canvas/PersistenceService.ts
// Concrete implementation of the persistence service wrapping CanvasPersistence functionality
// Provides a clean service interface for data persistence, export, and backup operations
// RELEVANT FILES: src/lib/di/ServiceInterfaces.ts, src/services/canvas/CanvasPersistence.ts, src/shared/contracts/index.ts

import { CanvasPersistence } from './CanvasPersistence';
import type {
  IPersistenceService,
  SaveOptions,
  ExportOptions,
  ValidationResult,
  BackupMetadata,
} from '@/lib/di/ServiceInterfaces';
import type { DesignData, DesignComponent, Connection } from '@/shared/contracts';

/**
 * Persistence service implementation that wraps the existing CanvasPersistence class
 * This service provides a clean interface for dependency injection while preserving
 * all existing functionality and behavior of the CanvasPersistence system
 */
export class PersistenceService implements IPersistenceService {
  private persistence: CanvasPersistence;
  private projectId?: string;
  private defaultOptions: SaveOptions = {
    retries: 3,
    validateData: true,
    compress: true,
    backup: true,
  };

  constructor(projectId?: string) {
    this.projectId = projectId;
    this.persistence = new CanvasPersistence(projectId);
  }

  /**
   * Save design data to storage
   */
  async saveDesign(data: DesignData, options?: SaveOptions): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Convert service options to CanvasPersistence format
    const persistenceOptions = {
      retries: mergedOptions.retries || 3,
      validateData: mergedOptions.validateData !== false,
      compress: mergedOptions.compress !== false,
      backup: mergedOptions.backup !== false,
    };

    return this.persistence.saveDesign(data, persistenceOptions);
  }

  /**
   * Load design data from storage
   */
  async loadDesign(projectId?: string): Promise<DesignData | null> {
    if (projectId && projectId !== this.projectId) {
      // Create new persistence instance for different project
      const tempPersistence = new CanvasPersistence(projectId);
      return tempPersistence.loadDesign();
    }

    return this.persistence.loadDesign();
  }

  /**
   * Set the project ID context for this service instance
   */
  setProjectId(projectId: string): void {
    if (projectId !== this.projectId) {
      this.projectId = projectId;
      // Create new persistence instance with updated project ID
      this.persistence = new CanvasPersistence(projectId);
    }
  }

  /**
   * Get the current project ID
   */
  getProjectId(): string | undefined {
    return this.projectId;
  }

  /**
   * Export design data as JSON string
   */
  async exportJSON(data: DesignData, options?: ExportOptions): Promise<string> {
    const exportOptions = {
      pretty: options?.pretty ?? true,
      validate: options?.validate ?? true,
    };

    return this.persistence.exportJSON(data, exportOptions);
  }

  /**
   * Export canvas as PNG image
   */
  async exportPNG(element: HTMLElement, options?: ExportOptions): Promise<string> {
    const exportOptions = {
      quality: options?.quality ?? 1.0,
      scale: options?.scale ?? 2,
      width: options?.width,
      height: options?.height,
    };

    return this.persistence.exportPNG(element, exportOptions);
  }

  /**
   * Export to file in specified format
   */
  async exportToFile(data: DesignData, format: 'json' | 'png', element?: HTMLElement): Promise<string> {
    if (format === 'json') {
      return this.exportJSON(data);
    } else if (format === 'png' && element) {
      return this.exportPNG(element);
    } else {
      throw new Error(`Invalid export format: ${format} or missing element for PNG export`);
    }
  }

  /**
   * Create a backup of the current design
   */
  async createBackup(data: DesignData): Promise<void> {
    // CanvasPersistence handles backup creation internally during save operations
    // For explicit backup creation, we can save with backup option enabled
    await this.persistence.saveDesign(data, {
      backup: true,
      validateData: true,
    });
  }

  /**
   * Load design from the most recent backup
   */
  async loadFromBackup(projectId?: string): Promise<DesignData | null> {
    if (projectId && projectId !== this.projectId) {
      // Create temporary persistence instance for different project
      const tempPersistence = new CanvasPersistence(projectId);
      // CanvasPersistence automatically falls back to backup when normal load fails
      return tempPersistence.loadDesign();
    }

    // CanvasPersistence automatically tries backup loading when normal load fails
    return this.persistence.loadDesign();
  }

  /**
   * Get list of available backups
   */
  async listBackups(projectId?: string): Promise<BackupMetadata[]> {
    const targetProjectId = projectId || this.projectId || 'default';
    const backups: BackupMetadata[] = [];

    try {
      // Parse backup metadata from localStorage
      const backupMetadataStr = localStorage.getItem('archicomm-backup-metadata');
      if (!backupMetadataStr) {
        return backups;
      }

      const allBackups = JSON.parse(backupMetadataStr);

      // Filter backups for the specified project
      Object.entries(allBackups).forEach(([key, metadata]) => {
        if (key.includes(targetProjectId)) {
          backups.push(metadata as BackupMetadata);
        }
      });

      // Sort by timestamp (newest first)
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.warn('Failed to list backups:', error);
      return backups;
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      // Remove from localStorage
      localStorage.removeItem(backupId);

      // Update backup metadata
      const backupMetadataStr = localStorage.getItem('archicomm-backup-metadata');
      if (backupMetadataStr) {
        const metadata = JSON.parse(backupMetadataStr);
        delete metadata[backupId];
        localStorage.setItem('archicomm-backup-metadata', JSON.stringify(metadata));
      }
    } catch (error) {
      console.warn(`Failed to delete backup ${backupId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up old backups based on retention policy
   */
  async cleanupOldBackups(): Promise<void> {
    // CanvasPersistence handles backup cleanup internally
    // We can trigger cleanup by calling the private method through a save operation
    try {
      // Create a minimal save operation to trigger cleanup
      const dummyData: DesignData = {
        components: [],
        connections: [],
        layers: [],
        metadata: { lastModified: new Date().toISOString() },
      };

      // This will trigger internal cleanup logic
      await this.persistence.saveDesign(dummyData, { backup: false });
    } catch (error) {
      console.warn('Failed to trigger backup cleanup:', error);
    }
  }

  /**
   * Validate design data integrity
   */
  validateData(data: DesignData): ValidationResult {
    // CanvasPersistence has a private validateDesignData method
    // We need to access it through a public interface or recreate the logic
    return this.validateDesignDataInternal(data);
  }

  /**
   * Validate component array
   */
  validateComponents(components: DesignComponent[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(components)) {
      errors.push('Components must be an array');
      return { isValid: false, errors, warnings };
    }

    components.forEach((component, index) => {
      if (!component.id || typeof component.id !== 'string') {
        errors.push(`Component ${index}: Missing or invalid id`);
      }
      if (!component.type || typeof component.type !== 'string') {
        errors.push(`Component ${index}: Missing or invalid type`);
      }
      if (typeof component.x !== 'number' || typeof component.y !== 'number') {
        errors.push(`Component ${index}: Invalid position coordinates`);
      }
      if (!component.label || typeof component.label !== 'string') {
        warnings.push(`Component ${index}: Missing label`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Validate connection array
   */
  validateConnections(connections: Connection[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(connections)) {
      errors.push('Connections must be an array');
      return { isValid: false, errors, warnings };
    }

    connections.forEach((connection, index) => {
      if (!connection.id || typeof connection.id !== 'string') {
        errors.push(`Connection ${index}: Missing or invalid id`);
      }
      if (!connection.from || !connection.to) {
        errors.push(`Connection ${index}: Missing from or to reference`);
      }
      if (connection.from === connection.to) {
        warnings.push(`Connection ${index}: Self-connection detected`);
      }
    });

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Attempt to repair common data issues
   */
  repairData(data: DesignData): DesignData {
    const repaired: DesignData = { ...data };

    // Ensure required arrays exist
    repaired.components = repaired.components || [];
    repaired.connections = repaired.connections || [];
    repaired.layers = repaired.layers || [];

    // Ensure metadata exists
    repaired.metadata = repaired.metadata || {};

    // Repair components
    repaired.components = repaired.components.map((component, index) => ({
      ...component,
      id: component.id || `component-${index}-${Date.now()}`,
      type: component.type || 'server',
      x: typeof component.x === 'number' ? component.x : 0,
      y: typeof component.y === 'number' ? component.y : 0,
      label: component.label || component.type || 'Unknown',
    }));

    // Repair connections and remove invalid ones
    const componentIds = new Set(repaired.components.map(c => c.id));
    repaired.connections = repaired.connections
      .filter(conn => componentIds.has(conn.from) && componentIds.has(conn.to))
      .map((connection, index) => ({
        ...connection,
        id: connection.id || `connection-${index}-${Date.now()}`,
        label: connection.label || '',
        type: connection.type || 'data',
      }));

    // Ensure default layer exists
    if (repaired.layers.length === 0) {
      repaired.layers.push({
        id: 'default',
        name: 'Default Layer',
        visible: true,
        order: 0,
      });
    }

    return repaired;
  }

  /**
   * Clean up old stored data and optimize storage
   */
  async cleanupOldData(): Promise<void> {
    // Delegate to CanvasPersistence internal cleanup
    try {
      // Access private cleanup method by triggering it through a save operation
      const currentData = await this.loadDesign();
      if (currentData) {
        await this.persistence.saveDesign(currentData, { backup: false });
      }
    } catch (error) {
      console.warn('Failed to cleanup old data:', error);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageUsage(): Promise<{ used: number; available: number }> {
    try {
      let used = 0;

      // Calculate usage from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('archicomm-')) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // Estimate available storage (localStorage typically has 5-10MB limit)
      const estimated = 5 * 1024 * 1024; // 5MB estimate
      const available = Math.max(0, estimated - used);

      return { used, available };
    } catch (error) {
      console.warn('Failed to calculate storage usage:', error);
      return { used: 0, available: 0 };
    }
  }

  /**
   * Optimize storage by compressing data
   */
  async optimizeStorage(): Promise<void> {
    try {
      const currentData = await this.loadDesign();
      if (currentData) {
        // Re-save with compression enabled to optimize storage
        await this.persistence.saveDesign(currentData, {
          compress: true,
          validateData: true,
          backup: false,
        });
      }
    } catch (error) {
      console.warn('Failed to optimize storage:', error);
    }
  }

  /**
   * Clear export cache
   */
  clearCache(): void {
    // CanvasPersistence manages its own cache internally
    // We can create a new instance to effectively clear the cache
    this.persistence = new CanvasPersistence(this.projectId);
  }

  /**
   * Set default save options
   */
  setDefaultSaveOptions(options: Partial<SaveOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Get current default save options
   */
  getDefaultSaveOptions(): SaveOptions {
    return { ...this.defaultOptions };
  }

  /**
   * Configure save retry behavior
   */
  setSaveRetries(retries: number): void {
    this.defaultOptions.retries = Math.max(0, Math.min(10, retries));
  }

  /**
   * Set compression threshold for large data
   */
  setCompressionThreshold(threshold: number): void {
    // CanvasPersistence manages compression internally
    // We store this for potential future use
    this.defaultOptions.compress = threshold > 0;
  }

  /**
   * Internal validation method that mirrors CanvasPersistence logic
   */
  private validateDesignDataInternal(data: DesignData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check required properties
      if (!data || typeof data !== 'object') {
        errors.push('Data is not a valid object');
        return { isValid: false, errors, warnings };
      }

      // Validate components
      const componentValidation = this.validateComponents(data.components || []);
      errors.push(...componentValidation.errors);
      warnings.push(...componentValidation.warnings);

      // Validate connections
      const connectionValidation = this.validateConnections(data.connections || []);
      errors.push(...connectionValidation.errors);
      warnings.push(...connectionValidation.warnings);

      // Validate layers
      if (!Array.isArray(data.layers)) {
        warnings.push('Layers array is missing, using default');
      }

      // Check for orphaned connections
      if (data.components && data.connections) {
        const componentIds = new Set(data.components.map(c => c.id));
        data.connections.forEach((connection, index) => {
          if (!componentIds.has(connection.from)) {
            warnings.push(`Connection ${index}: References non-existent component '${connection.from}'`);
          }
          if (!componentIds.has(connection.to)) {
            warnings.push(`Connection ${index}: References non-existent component '${connection.to}'`);
          }
        });
      }
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}