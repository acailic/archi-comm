import { toPng } from 'html-to-image';
import type { DesignData } from '@/shared/contracts';
import { isTauriEnvironment } from '@/lib/config/environment';
import { storage } from '@services/storage';
import * as TauriClient from '@/lib/api/tauriClient';

// Fallback compression utilities if lz-string is not available
const compress = (data: string): string => {
  try {
    // Try to use lz-string if available
    const LZString = (globalThis as any).LZString;
    if (LZString?.compress) {
      return LZString.compress(data);
    }
    
    // Fallback: simple base64 encoding (not compression, but helps with storage)
    return btoa(data);
  } catch {
    return data; // Return original if compression fails
  }
};

const decompress = (data: string): string | null => {
  try {
    // Try lz-string first
    const LZString = (globalThis as any).LZString;
    if (LZString?.decompress) {
      return LZString.decompress(data);
    }
    
    // Fallback: try base64 decode
    try {
      return atob(data);
    } catch {
      return data; // Return as-is if it's not base64
    }
  } catch {
    return null;
  }
};

interface CacheEntry {
  value: string;
  lastUsed: number;
  compressed?: boolean;
}

interface SaveOptions {
  retries?: number;
  validateData?: boolean;
  compress?: boolean;
  backup?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface BackupMetadata {
  timestamp: number;
  size: number;
  checksum: string;
}

export class CanvasPersistence {
  private exportCache: Map<string, CacheEntry> = new Map();
  private readonly maxCacheSize = 20;
  private readonly projectId?: string;
  private backupStore: Map<string, BackupMetadata> = new Map();
  private saveOperations: Map<string, Promise<void>> = new Map();
  private readonly maxBackups = 5;
  private compressionThreshold = 1024 * 50; // 50KB

  constructor(projectId?: string) {
    this.projectId = projectId;
    this.initializeBackupTracking();
  }

  // List available backups for this project from persisted metadata
  public listBackups(): Array<{ key: string; timestamp: number; checksum: string }> {
    try {
      const raw = localStorage.getItem('archicomm-backup-metadata');
      if (!raw) return [];
      const metadataObj = JSON.parse(raw) as Record<string, BackupMetadata>;
      const projectToken = this.projectId || 'default';
      return Object.entries(metadataObj)
        .filter(([key]) => key.includes(projectToken))
        .map(([key, meta]) => ({ key, timestamp: meta.timestamp, checksum: meta.checksum }))
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  // Restore a specific or latest valid backup
  public async restoreFromBackup(timestampOrKey?: number | string): Promise<DesignData | null> {
    try {
      if (timestampOrKey == null) {
        // Fallback to the latest valid backup
        return await this.loadFromBackup();
      }

      const projectToken = this.projectId || 'default';
      let backupKey: string | null = null;

      if (typeof timestampOrKey === 'number') {
        const needle = `archicomm-backup-${projectToken}-${timestampOrKey}`;
        backupKey = needle;
      } else if (typeof timestampOrKey === 'string') {
        backupKey = timestampOrKey;
      }

      if (!backupKey) return null;

      const backupData = localStorage.getItem(backupKey);
      if (!backupData) return null;

      // Verify checksum from metadata when available
      const meta = this.backupStore.get(backupKey);
      if (meta) {
        const checksum = this.calculateChecksum(backupData);
        if (checksum !== meta.checksum) {
          console.warn(`Backup ${backupKey} checksum mismatch, aborting restore`);
          return null;
        }
      }

      const data = JSON.parse(backupData) as DesignData;
      const validation = this.validateDesignData(data);
      if (!validation.isValid) return null;
      return data;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      return null;
    }
  }

  async saveDesign(data: DesignData, options: SaveOptions = {}): Promise<void> {
    const {
      retries = 3,
      validateData = true,
      compress: shouldCompress = true,
      backup = true
    } = options;

    // Prevent concurrent save operations for the same project
    const saveKey = this.projectId || 'default';
    if (this.saveOperations.has(saveKey)) {
      await this.saveOperations.get(saveKey);
    }

    const saveOperation = this.performSave(data, retries, validateData, shouldCompress, backup);
    this.saveOperations.set(saveKey, saveOperation);

    try {
      await saveOperation;
    } finally {
      this.saveOperations.delete(saveKey);
    }
  }

  private async performSave(
    data: DesignData,
    retries: number,
    validateData: boolean,
    shouldCompress: boolean,
    backup: boolean
  ): Promise<void> {
    let lastError: Error | null = null;

    // Validate data before saving
    if (validateData) {
      const validation = this.validateDesignData(data);
      if (!validation.isValid) {
        throw new Error(`Invalid design data: ${validation.errors.join(', ')}`);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Design data validation warnings:', validation.warnings);
      }
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create backup before saving
        if (backup && attempt === 0) {
          await this.createBackup(data);
        }

        if (this.projectId && isTauriEnvironment()) {
          await TauriClient.saveDesign(this.projectId, data, { retries: 0 }); // No nested retries
        } else {
          await this.saveToLocalStorage(data, shouldCompress);
        }
        
        // Save succeeded
        return;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Save attempt ${attempt + 1} failed:`, lastError.message);
        
        if (attempt < retries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    throw new Error(`Failed to save design after ${retries + 1} attempts. Last error: ${lastError?.message}`);
  }

  private async saveToLocalStorage(data: DesignData, shouldCompress: boolean): Promise<void> {
    try {
      let payload = JSON.stringify(data);
      let compressed = false;
      
      // Compress large payloads
      if (shouldCompress && payload.length > this.compressionThreshold) {
        try {
          const compressedPayload = compress(payload);
          if (compressedPayload && compressedPayload.length < payload.length * 0.8) {
            payload = compressedPayload;
            compressed = true;
          }
        } catch (compressionError) {
          console.warn('Compression failed, saving uncompressed:', compressionError);
        }
      }
      
      const saveData = {
        data: payload,
        compressed,
        timestamp: Date.now(),
        version: '1.0'
      };
      
      const key = this.projectId ? `archicomm-project-${this.projectId}` : 'archicomm-canvas-auto';
      await storage.setItem(key, JSON.stringify(saveData));
      
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Try to free up space and retry
        await this.cleanupOldData();
        
        // Retry once without compression
        const payload = JSON.stringify(data);
        const saveData = {
          data: payload,
          compressed: false,
          timestamp: Date.now(),
          version: '1.0'
        };
        
        const key = this.projectId ? `archicomm-project-${this.projectId}` : 'archicomm-canvas-auto';
        await storage.setItem(key, JSON.stringify(saveData));
      } else {
        throw error;
      }
    }
  }

  async loadDesign(): Promise<DesignData | null> {
    try {
      if (this.projectId && isTauriEnvironment()) {
        const data = await TauriClient.loadDesign(this.projectId);
        if (data) {
          const validation = this.validateDesignData(data);
          if (!validation.isValid) {
            console.warn('Loaded data validation failed:', validation.errors);
            // Try to recover from backup
            return await this.loadFromBackup();
          }
        }
        return data;
      }
      
      const key = this.projectId ? `archicomm-project-${this.projectId}` : 'archicomm-canvas-auto';
      const raw = await storage.getItem(key);
      
      if (!raw) {
        // Try to load from backup
        return await this.loadFromBackup();
      }
      
      try {
        // Try to parse as new format with metadata
        const saveData = JSON.parse(raw);
        
        if (typeof saveData === 'object' && saveData.data) {
          // New format with compression support
          let payload = saveData.data;
          
          if (saveData.compressed) {
            try {
              payload = decompress(payload);
              if (!payload) {
                throw new Error('Decompression failed');
              }
            } catch (decompressionError) {
              console.error('Failed to decompress saved data:', decompressionError);
              return await this.loadFromBackup();
            }
          }
          
          const data = JSON.parse(payload) as DesignData;
          
          // Validate loaded data
          const validation = this.validateDesignData(data);
          if (!validation.isValid) {
            console.warn('Loaded data validation failed:', validation.errors);
            return await this.loadFromBackup();
          }
          
          return data;
        } else {
          // Legacy format - direct DesignData
          const data = saveData as DesignData;
          const validation = this.validateDesignData(data);
          
          if (!validation.isValid) {
            console.warn('Legacy data validation failed:', validation.errors);
            return await this.loadFromBackup();
          }
          
          return data;
        }
      } catch (parseError) {
        console.error('Failed to parse saved data:', parseError);
        return await this.loadFromBackup();
      }
    } catch (error) {
      console.error('Failed to load design:', error);
      return null;
    }
  }

  async exportJSON(data: DesignData, options: { pretty?: boolean; validate?: boolean } = {}): Promise<string> {
    const { pretty = true, validate = true } = options;
    
    if (validate) {
      const validation = this.validateDesignData(data);
      if (!validation.isValid) {
        throw new Error(`Cannot export invalid data: ${validation.errors.join(', ')}`);
      }
    }
    
    const cacheKey = `json:${(data.components?.length ?? 0)}:${(data.connections?.length ?? 0)}:${pretty ? 'pretty' : 'compact'}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
      this.putInCache(cacheKey, json);
      return json;
    } catch (error) {
      throw new Error(`Failed to export JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exportPNG(element: HTMLElement, options: { quality?: number; scale?: number; width?: number; height?: number } = {}): Promise<string> {
    const { quality = 1.0, scale = 2, width, height } = options;
    
    if (!element?.clientWidth || !element.clientHeight) {
      throw new Error('Invalid element or element has no dimensions');
    }
    
    const cacheKey = `png:${width || element.clientWidth}x${height || element.clientHeight}:${scale}:${quality}:${element.dataset['hash'] ?? ''}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    
    try {
      const exportOptions: any = {
        cacheBust: true,
        pixelRatio: scale,
        quality
      };
      
      if (width) exportOptions.width = width;
      if (height) exportOptions.height = height;
      
      const dataUrl = await toPng(element, exportOptions);
      
      if (!dataUrl?.startsWith('data:image/')) {
        throw new Error('Invalid image data generated');
      }
      
      this.putInCache(cacheKey, dataUrl, true); // Mark as compressed for large images
      return dataUrl;
      
    } catch (error) {
      throw new Error(`Failed to export PNG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getFromCache(key: string): string | null {
    const entry = this.exportCache.get(key);
    if (!entry) return null;
    
    try {
      entry.lastUsed = Date.now();
      
      if (entry.compressed) {
        const decompressed = decompress(entry.value);
        return decompressed || entry.value; // Fallback to original if decompression fails
      }
      
      return entry.value;
    } catch (error) {
      console.warn('Failed to retrieve cached value:', error);
      this.exportCache.delete(key); // Remove corrupted entry
      return null;
    }
  }

  private putInCache(key: string, value: string, shouldCompress = false) {
    try {
      if (this.exportCache.size >= this.maxCacheSize) {
        this.evictLeastRecentlyUsed();
      }
      
      let finalValue = value;
      let compressed = false;
      
      // Compress large values
      if (shouldCompress && value.length > this.compressionThreshold) {
        try {
          const compressedValue = compress(value);
          if (compressedValue && compressedValue.length < value.length * 0.8) {
            finalValue = compressedValue;
            compressed = true;
          }
        } catch (compressionError) {
          console.warn('Cache compression failed:', compressionError);
        }
      }
      
      this.exportCache.set(key, {
        value: finalValue,
        lastUsed: Date.now(),
        compressed
      });
    } catch (error) {
      console.warn('Failed to cache value:', error);
    }
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;
    
    for (const [k, v] of this.exportCache.entries()) {
      if (v.lastUsed < lruTime) {
        lruKey = k;
        lruTime = v.lastUsed;
      }
    }
    
    if (lruKey) {
      this.exportCache.delete(lruKey);
    }
  }

  private validateDesignData(data: DesignData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check required properties
      if (!data || typeof data !== 'object') {
        errors.push('Data is not a valid object');
        return { isValid: false, errors, warnings };
      }
      
      // Validate components
      if (!Array.isArray(data.components)) {
        errors.push('Components must be an array');
      } else {
        data.components.forEach((component, index) => {
          if (!component.id || typeof component.id !== 'string') {
            errors.push(`Component ${index}: Missing or invalid id`);
          }
          if (!component.type || typeof component.type !== 'string') {
            errors.push(`Component ${index}: Missing or invalid type`);
          }
          if (typeof component.x !== 'number' || typeof component.y !== 'number') {
            errors.push(`Component ${index}: Invalid position coordinates`);
          }
        });
      }
      
      // Validate connections
      if (!Array.isArray(data.connections)) {
        errors.push('Connections must be an array');
      } else {
        data.connections.forEach((connection, index) => {
          if (!connection.id || typeof connection.id !== 'string') {
            errors.push(`Connection ${index}: Missing or invalid id`);
          }
          if (!connection.from || !connection.to) {
            errors.push(`Connection ${index}: Missing from or to reference`);
          }
        });
      }
      
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
      warnings
    };
  }

  private initializeBackupTracking(): void {
    try {
      const backupData = localStorage.getItem('archicomm-backup-metadata');
      if (backupData) {
        const parsed = JSON.parse(backupData);
        this.backupStore = new Map(Object.entries(parsed));
      }
    } catch (error) {
      console.warn('Failed to load backup metadata:', error);
      this.backupStore = new Map();
    }
  }

  private async createBackup(data: DesignData): Promise<void> {
    try {
      const timestamp = Date.now();
      const backupKey = `archicomm-backup-${this.projectId || 'default'}-${timestamp}`;
      const serialized = JSON.stringify(data);
      const checksum = this.calculateChecksum(serialized);
      
      // Store backup
      localStorage.setItem(backupKey, serialized);
      
      // Update metadata
      this.backupStore.set(backupKey, {
        timestamp,
        size: serialized.length,
        checksum
      });
      
      // Clean up old backups
      await this.cleanupOldBackups();
      
      // Save metadata
      this.saveBackupMetadata();
      
    } catch (error) {
      console.warn('Failed to create backup:', error);
    }
  }

  public async loadFromBackup(): Promise<DesignData | null> {
    try {
      const projectBackups = Array.from(this.backupStore.entries())
        .filter(([key]) => key.includes(this.projectId || 'default'))
        .sort(([, a], [, b]) => b.timestamp - a.timestamp);
      
      for (const [backupKey, metadata] of projectBackups) {
        try {
          const backupData = localStorage.getItem(backupKey);
          if (!backupData) continue;
          
          // Verify checksum
          const checksum = this.calculateChecksum(backupData);
          if (checksum !== metadata.checksum) {
            console.warn(`Backup ${backupKey} checksum mismatch, skipping`);
            continue;
          }
          
          const data = JSON.parse(backupData) as DesignData;
          const validation = this.validateDesignData(data);
          
          if (validation.isValid) {
            console.log(`Restored from backup: ${backupKey}`);
            return data;
          }
        } catch (error) {
          console.warn(`Failed to load backup ${backupKey}:`, error);
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load from backup:', error);
      return null;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const projectBackups = Array.from(this.backupStore.entries())
        .filter(([key]) => key.includes(this.projectId || 'default'))
        .sort(([, a], [, b]) => b.timestamp - a.timestamp);
      
      // Keep only the most recent backups
      const toDelete = projectBackups.slice(this.maxBackups);
      
      for (const [backupKey] of toDelete) {
        localStorage.removeItem(backupKey);
        this.backupStore.delete(backupKey);
      }
      
      if (toDelete.length > 0) {
        this.saveBackupMetadata();
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      // Clean up cache
      if (this.exportCache.size > this.maxCacheSize / 2) {
        const oldEntries = Array.from(this.exportCache.entries())
          .sort(([, a], [, b]) => a.lastUsed - b.lastUsed)
          .slice(0, Math.floor(this.exportCache.size / 2));
        
        for (const [key] of oldEntries) {
          this.exportCache.delete(key);
        }
      }
      
      // Clean up very old localStorage entries
      const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
      const keysToDelete: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('archicomm-backup-')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (parsed.timestamp && parsed.timestamp < cutoffTime) {
                keysToDelete.push(key);
              }
            }
          } catch {
            // Invalid backup, mark for deletion
            keysToDelete.push(key);
          }
        }
      }
      
      keysToDelete.forEach(key => {
        localStorage.removeItem(key);
        this.backupStore.delete(key);
      });
      
      if (keysToDelete.length > 0) {
        this.saveBackupMetadata();
      }
    } catch (error) {
      console.warn('Failed to cleanup old data:', error);
    }
  }

  private saveBackupMetadata(): void {
    try {
      const metadata = Object.fromEntries(this.backupStore);
      localStorage.setItem('archicomm-backup-metadata', JSON.stringify(metadata));
    } catch (error) {
      console.warn('Failed to save backup metadata:', error);
    }
  }

  private calculateChecksum(data: string): string {
    // Simple checksum implementation
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
