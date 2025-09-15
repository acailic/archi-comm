// src/lib/import-export/FileValidator.ts
// Comprehensive file validation and error handling for import/export
// Provides security checks, format validation, and user-friendly error messages
// RELEVANT FILES: DesignSerializer.ts, ImportExportModal.tsx, types.ts

import type {
  FileValidationSchema,
  ImportValidationResult,
  DesignExportData,
} from './types';
import {
  DEFAULT_VALIDATION_SCHEMA,
  isDesignExportData,
  isValidFormatVersion,
} from './types';

export class FileValidator {
  private schema: FileValidationSchema;

  constructor(customSchema?: Partial<FileValidationSchema>) {
    this.schema = {
      ...DEFAULT_VALIDATION_SCHEMA,
      ...customSchema,
    };
  }

  // Validate file before reading
  validateFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check file size
    if (file.size > this.schema.maxFileSize) {
      errors.push(
        `File too large: ${this.formatFileSize(file.size)} (max: ${this.formatFileSize(this.schema.maxFileSize)})`
      );
    }

    // Check file extension
    const extension = this.getFileExtension(file.name);
    if (!this.schema.allowedExtensions.includes(extension)) {
      errors.push(
        `Invalid file type: ${extension} (allowed: ${this.schema.allowedExtensions.join(', ')})`
      );
    }

    // Check for suspicious file names
    if (this.isSuspiciousFileName(file.name)) {
      errors.push('Suspicious file name detected');
    }

    // Basic file name validation
    if (file.name.length === 0 || file.name.trim() === '') {
      errors.push('Invalid file name');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate JSON content structure and security
  async validateJSONContent(content: string): Promise<ImportValidationResult> {
    const result: ImportValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      isCompatible: false,
      requiresMigration: false,
    };

    try {
      // Check content size
      if (content.length === 0) {
        result.errors.push('File is empty');
        return result;
      }

      if (content.length > this.schema.maxFileSize) {
        result.errors.push('File content too large');
        return result;
      }

      // Security: Check for potentially dangerous content
      const securityCheck = this.checkContentSecurity(content);
      if (!securityCheck.safe) {
        result.errors.push(...securityCheck.issues);
        return result;
      }

      // Parse JSON
      let parsedData: any;
      try {
        parsedData = JSON.parse(content);
      } catch (parseError) {
        result.errors.push(
          `Invalid JSON format: ${parseError instanceof Error ? parseError.message : 'Parse error'}`
        );
        return result;
      }

      // Validate data structure
      const structureValidation = this.validateDataStructure(parsedData);
      result.errors.push(...structureValidation.errors);
      result.warnings.push(...structureValidation.warnings);

      if (structureValidation.errors.length === 0) {
        result.isValid = true;

        // Check format version compatibility
        if (parsedData.formatVersion) {
          result.formatVersion = parsedData.formatVersion;
          result.isCompatible = isValidFormatVersion(parsedData.formatVersion);

          if (!result.isCompatible) {
            // Check if migration is possible
            result.requiresMigration = this.canMigrate(parsedData.formatVersion);
            if (result.requiresMigration) {
              result.warnings.push(`Format version ${parsedData.formatVersion} will be migrated to current version`);
            } else {
              result.errors.push(`Unsupported format version: ${parsedData.formatVersion}`);
              result.isValid = false;
            }
          }
        }
      }

      return result;
    } catch (error) {
      result.errors.push(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return result;
    }
  }

  // Check content for security issues
  private checkContentSecurity(content: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for potential script injection
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /function\s*\(/i,
      /setTimeout|setInterval/i,
      /document\.|window\.|location\./i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        issues.push('Potentially malicious content detected');
        break;
      }
    }

    // Check for unusually large strings (potential DoS)
    const maxStringLength = 50000;
    try {
      const parsed = JSON.parse(content);
      if (this.hasLargeStrings(parsed, maxStringLength)) {
        issues.push('File contains unusually large text content');
      }
    } catch {
      // If parsing fails, it will be caught in validateJSONContent
    }

    // Check for excessive nesting (potential DoS)
    const maxDepth = 50;
    if (this.getObjectDepth(content) > maxDepth) {
      issues.push('File has excessive nesting depth');
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }

  // Validate the structure of parsed design data
  private validateDataStructure(data: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if data is an object
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format: expected JSON object');
      return { errors, warnings };
    }

    // Check required fields
    for (const field of this.schema.requiredFields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      } else if (data[field] === null || data[field] === undefined) {
        errors.push(`Required field '${field}' cannot be null or undefined`);
      }
    }

    // Validate design structure if present
    if (data.design) {
      const designValidation = this.validateDesignStructure(data.design);
      errors.push(...designValidation.errors);
      warnings.push(...designValidation.warnings);
    }

    // Validate metadata if present
    if (data.metadata) {
      const metadataValidation = this.validateMetadataStructure(data.metadata);
      warnings.push(...metadataValidation.warnings);
    }

    // Check for additional fields (not errors, but warnings)
    const expectedFields = [...this.schema.requiredFields, ...this.schema.optionalFields];
    for (const key in data) {
      if (!expectedFields.includes(key)) {
        warnings.push(`Unexpected field: ${key}`);
      }
    }

    return { errors, warnings };
  }

  // Validate design object structure
  private validateDesignStructure(design: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!design || typeof design !== 'object') {
      errors.push('Invalid design: expected object');
      return { errors, warnings };
    }

    // Check components array
    if (!Array.isArray(design.components)) {
      errors.push('Invalid design: components must be an array');
    } else {
      const componentValidation = this.validateComponentsArray(design.components);
      errors.push(...componentValidation.errors);
      warnings.push(...componentValidation.warnings);
    }

    // Check connections array
    if (!Array.isArray(design.connections)) {
      errors.push('Invalid design: connections must be an array');
    } else {
      const connectionValidation = this.validateConnectionsArray(design.connections);
      errors.push(...connectionValidation.errors);
      warnings.push(...connectionValidation.warnings);
    }

    // Check optional arrays
    if (design.infoCards && !Array.isArray(design.infoCards)) {
      errors.push('Invalid design: infoCards must be an array if present');
    }

    if (design.layers && !Array.isArray(design.layers)) {
      errors.push('Invalid design: layers must be an array if present');
    }

    // Check metadata
    if (design.metadata && typeof design.metadata !== 'object') {
      errors.push('Invalid design: metadata must be an object if present');
    }

    return { errors, warnings };
  }

  // Validate components array
  private validateComponentsArray(components: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < components.length; i++) {
      const component = components[i];

      if (!component || typeof component !== 'object') {
        errors.push(`Component ${i}: invalid component object`);
        continue;
      }

      // Check required fields
      if (!component.id || typeof component.id !== 'string') {
        errors.push(`Component ${i}: missing or invalid id`);
      } else {
        if (seenIds.has(component.id)) {
          errors.push(`Component ${i}: duplicate id '${component.id}'`);
        }
        seenIds.add(component.id);
      }

      if (!component.type || typeof component.type !== 'string') {
        errors.push(`Component ${i}: missing or invalid type`);
      }

      // Check position coordinates
      if (typeof component.x !== 'number' || typeof component.y !== 'number') {
        errors.push(`Component ${i}: invalid position coordinates`);
      }

      // Check optional fields
      if (component.label !== undefined && typeof component.label !== 'string') {
        warnings.push(`Component ${i}: label should be a string`);
      }

      if (component.properties !== undefined && typeof component.properties !== 'object') {
        warnings.push(`Component ${i}: properties should be an object`);
      }
    }

    return { errors, warnings };
  }

  // Validate connections array
  private validateConnectionsArray(connections: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const seenIds = new Set<string>();

    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];

      if (!connection || typeof connection !== 'object') {
        errors.push(`Connection ${i}: invalid connection object`);
        continue;
      }

      // Check required fields
      if (!connection.id || typeof connection.id !== 'string') {
        errors.push(`Connection ${i}: missing or invalid id`);
      } else {
        if (seenIds.has(connection.id)) {
          errors.push(`Connection ${i}: duplicate id '${connection.id}'`);
        }
        seenIds.add(connection.id);
      }

      if (!connection.from || typeof connection.from !== 'string') {
        errors.push(`Connection ${i}: missing or invalid 'from' field`);
      }

      if (!connection.to || typeof connection.to !== 'string') {
        errors.push(`Connection ${i}: missing or invalid 'to' field`);
      }

      if (!connection.type || typeof connection.type !== 'string') {
        errors.push(`Connection ${i}: missing or invalid type`);
      }

      // Check for self-connections
      if (connection.from === connection.to) {
        warnings.push(`Connection ${i}: self-referencing connection`);
      }
    }

    return { errors, warnings };
  }

  // Validate metadata structure
  private validateMetadataStructure(metadata: any): { warnings: string[] } {
    const warnings: string[] = [];

    if (typeof metadata !== 'object') {
      warnings.push('Metadata should be an object');
      return { warnings };
    }

    // Check timestamp fields
    const timestampFields = ['created', 'lastModified', 'exportedAt'];
    for (const field of timestampFields) {
      if (metadata[field] && typeof metadata[field] === 'string') {
        const date = new Date(metadata[field]);
        if (isNaN(date.getTime())) {
          warnings.push(`Invalid timestamp in metadata.${field}`);
        }
      }
    }

    // Check version field
    if (metadata.version && typeof metadata.version !== 'string') {
      warnings.push('Metadata version should be a string');
    }

    return { warnings };
  }

  // Utility methods
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private isSuspiciousFileName(filename: string): boolean {
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|pif|com)$/i,
      /\$|\{|\}|`/,
      /^\./,
      /\s{10,}/,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(filename));
  }

  private hasLargeStrings(obj: any, maxLength: number): boolean {
    if (typeof obj === 'string') {
      return obj.length > maxLength;
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (this.hasLargeStrings(obj[key], maxLength)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private getObjectDepth(jsonString: string): number {
    let depth = 0;
    let maxDepth = 0;

    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      if (char === '{' || char === '[') {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (char === '}' || char === ']') {
        depth--;
      }
    }

    return maxDepth;
  }

  private canMigrate(fromVersion: string): boolean {
    // Define which versions can be migrated
    const migratableVersions = ['0.9', '0.8', '0.7'];
    return migratableVersions.includes(fromVersion);
  }

  // Create user-friendly error messages
  static createErrorMessage(errors: string[]): string {
    if (errors.length === 0) return '';

    if (errors.length === 1) {
      return `❌ ${errors[0]}`;
    }

    return `❌ Multiple issues found:\n${errors.map(error => `• ${error}`).join('\n')}`;
  }

  static createWarningMessage(warnings: string[]): string {
    if (warnings.length === 0) return '';

    if (warnings.length === 1) {
      return `⚠️ ${warnings[0]}`;
    }

    return `⚠️ Warnings:\n${warnings.map(warning => `• ${warning}`).join('\n')}`;
  }

  // Update schema configuration
  updateSchema(newSchema: Partial<FileValidationSchema>): void {
    this.schema = { ...this.schema, ...newSchema };
  }

  getSchema(): FileValidationSchema {
    return { ...this.schema };
  }
}