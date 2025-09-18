// src/lib/di/ServiceInterfaces.ts
// Service interfaces that abstract current implementations while maintaining compatibility
// These interfaces define clean contracts for all core application services
// RELEVANT FILES: src/lib/di/Container.ts, src/shared/contracts/index.ts, src/services/canvas/CanvasPersistence.ts, src/packages/audio/audio-manager.ts

import { createToken } from './Container';
import type {
  DesignData,
  DesignComponent,
  Connection,
  ToolType,
  TranscriptionResponse,
  Layer,
  GridConfig,
} from '@/shared/contracts';

// Canvas state interface for service management
export interface CanvasState {
  components: DesignComponent[];
  connections: Connection[];
  selectedComponents: string[];
  activeTool: ToolType;
  layers: Layer[];
  gridConfig: GridConfig;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  isLoading: boolean;
}

// Save options interface
export interface SaveOptions {
  retries?: number;
  validateData?: boolean;
  compress?: boolean;
  backup?: boolean;
}

// Export options interface
export interface ExportOptions {
  pretty?: boolean;
  validate?: boolean;
  quality?: number;
  scale?: number;
  width?: number;
  height?: number;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Backup metadata interface
export interface BackupMetadata {
  timestamp: number;
  size: number;
  checksum: string;
}

// Audio manager options interface
export interface AudioManagerOptions {
  recordingEngine?: string;
  transcriptionEngine?: string;
  realtimeTranscription?: boolean;
  autoSave?: boolean;
}

// Recording options interface
export interface RecordingOptions {
  duration?: number;
  quality?: 'low' | 'medium' | 'high';
  format?: 'wav' | 'mp3' | 'webm';
}

/**
 * Canvas service interface for managing design components and state
 * Provides high-level operations for canvas management with state synchronization
 */
export interface ICanvasService {
  /**
   * Get current canvas state snapshot
   */
  getState(): CanvasState;

  /**
   * Add a new component to the canvas
   * @param component Component data without ID (ID will be auto-generated)
   * @returns Promise resolving to the generated component ID
   */
  addComponent(component: Omit<DesignComponent, 'id'> & { id?: string }): Promise<string>;

  /**
   * Update an existing component's properties
   * @param id Component ID to update
   * @param patch Partial component data to apply
   */
  updateComponent(id: string, patch: Partial<DesignComponent>): Promise<void>;

  /**
   * Remove a component and its related connections
   * @param id Component ID to delete
   */
  deleteComponent(id: string): Promise<void>;

  /**
   * Move a component to a new position
   * @param id Component ID to move
   * @param x New X coordinate
   * @param y New Y coordinate
   */
  moveComponent(id: string, x: number, y: number): Promise<void>;

  /**
   * Create a duplicate of an existing component
   * @param id Component ID to duplicate
   * @returns Promise resolving to new component ID or null if failed
   */
  duplicateComponent(id: string): Promise<string | null>;

  /**
   * Add a new connection between components
   * @param connection Connection data without ID (ID will be auto-generated)
   * @returns Promise resolving to the generated connection ID
   */
  addConnection(connection: Omit<Connection, 'id'> & { id?: string }): Promise<string>;

  /**
   * Update an existing connection's properties
   * @param id Connection ID to update
   * @param patch Partial connection data to apply
   */
  updateConnection(id: string, patch: Partial<Connection>): Promise<void>;

  /**
   * Remove a connection
   * @param id Connection ID to delete
   */
  deleteConnection(id: string): Promise<void>;

  /**
   * Validate if a connection can be created between two components
   * @param from Source component ID
   * @param to Target component ID
   * @returns True if connection is valid
   */
  validateConnection(from: string, to: string): boolean;

  /**
   * Select component(s) on the canvas
   * @param id Component ID to select, or null to clear selection
   * @param multi Whether to add to existing selection (multi-select)
   */
  selectComponent(id: string | null, multi?: boolean): void;

  /**
   * Clear all component selections
   */
  clearSelection(): void;

  /**
   * Get currently selected components
   * @returns Array of selected component objects
   */
  getSelectedComponents(): DesignComponent[];

  /**
   * Set the active tool for canvas interaction
   * @param tool Tool type to activate
   */
  setActiveTool(tool: ToolType): void;

  /**
   * Undo the last action
   */
  undo(): void;

  /**
   * Redo the last undone action
   */
  redo(): void;

  /**
   * Check if undo operation is available
   */
  canUndo(): boolean;

  /**
   * Check if redo operation is available
   */
  canRedo(): boolean;

  /**
   * Clear the undo/redo history
   */
  clearHistory(): void;

  /**
   * Export the current design data
   * @returns Promise resolving to complete design data
   */
  exportDesign(): Promise<DesignData>;

  /**
   * Import design data into the canvas
   * @param data Design data to import
   */
  importDesign(data: DesignData): Promise<void>;

  /**
   * Save current design using persistence service
   */
  saveDesign(): Promise<void>;

  /**
   * Load design from persistence service
   * @param projectId Optional project ID to load
   */
  loadDesign(projectId?: string): Promise<void>;

  /**
   * Subscribe to state changes
   * @param listener Function called when state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: (state: CanvasState) => void): () => void;
}

/**
 * Persistence service interface for data storage and export operations
 * Handles saving, loading, backup, and export functionality
 */
export interface IPersistenceService {
  /**
   * Save design data to storage
   * @param data Design data to save
   * @param options Save configuration options
   */
  saveDesign(data: DesignData, options?: SaveOptions): Promise<void>;

  /**
   * Load design data from storage
   * @param projectId Optional project ID to load
   * @returns Promise resolving to design data or null if not found
   */
  loadDesign(projectId?: string): Promise<DesignData | null>;

  /**
   * Set the project ID context for this service instance
   * @param projectId Project identifier
   */
  setProjectId(projectId: string): void;

  /**
   * Get the current project ID
   * @returns Current project ID or undefined
   */
  getProjectId(): string | undefined;

  /**
   * Export design data as JSON string
   * @param data Design data to export
   * @param options Export formatting options
   * @returns Promise resolving to JSON string
   */
  exportJSON(data: DesignData, options?: ExportOptions): Promise<string>;

  /**
   * Export canvas as PNG image
   * @param element DOM element containing the canvas
   * @param options Image export options
   * @returns Promise resolving to data URL
   */
  exportPNG(element: HTMLElement, options?: ExportOptions): Promise<string>;

  /**
   * Export to file in specified format
   * @param data Design data to export
   * @param format Export format (json or png)
   * @param element DOM element for PNG export
   * @returns Promise resolving to file data
   */
  exportToFile(data: DesignData, format: 'json' | 'png', element?: HTMLElement): Promise<string>;

  /**
   * Create a backup of the current design
   * @param data Design data to backup
   */
  createBackup(data: DesignData): Promise<void>;

  /**
   * Load design from the most recent backup
   * @param projectId Optional project ID
   * @returns Promise resolving to backup data or null
   */
  loadFromBackup(projectId?: string): Promise<DesignData | null>;

  /**
   * Get list of available backups
   * @param projectId Optional project ID filter
   * @returns Promise resolving to backup metadata array
   */
  listBackups(projectId?: string): Promise<BackupMetadata[]>;

  /**
   * Delete a specific backup
   * @param backupId Backup identifier to delete
   */
  deleteBackup(backupId: string): Promise<void>;

  /**
   * Clean up old backups based on retention policy
   */
  cleanupOldBackups(): Promise<void>;

  /**
   * Validate design data integrity
   * @param data Design data to validate
   * @returns Validation result with errors and warnings
   */
  validateData(data: DesignData): ValidationResult;

  /**
   * Validate component array
   * @param components Component array to validate
   * @returns Validation result
   */
  validateComponents(components: DesignComponent[]): ValidationResult;

  /**
   * Validate connection array
   * @param connections Connection array to validate
   * @returns Validation result
   */
  validateConnections(connections: Connection[]): ValidationResult;

  /**
   * Attempt to repair common data issues
   * @param data Design data to repair
   * @returns Repaired design data
   */
  repairData(data: DesignData): DesignData;

  /**
   * Clean up old stored data and optimize storage
   */
  cleanupOldData(): Promise<void>;

  /**
   * Get storage usage statistics
   * @returns Promise resolving to storage usage info
   */
  getStorageUsage(): Promise<{ used: number; available: number }>;

  /**
   * Optimize storage by compressing data
   */
  optimizeStorage(): Promise<void>;

  /**
   * Clear export cache
   */
  clearCache(): void;

  /**
   * Set default save options
   * @param options Default save configuration
   */
  setDefaultSaveOptions(options: Partial<SaveOptions>): void;

  /**
   * Get current default save options
   */
  getDefaultSaveOptions(): SaveOptions;

  /**
   * Configure save retry behavior
   * @param retries Number of retries for failed saves
   */
  setSaveRetries(retries: number): void;

  /**
   * Set compression threshold for large data
   * @param threshold Size threshold in bytes
   */
  setCompressionThreshold(threshold: number): void;
}

/**
 * Audio service interface for recording and transcription operations
 * Handles audio recording, transcription, and engine management
 */
export interface IAudioService {
  /**
   * Initialize the audio service with configuration
   * @param options Audio service configuration
   */
  initialize(options: AudioManagerOptions): Promise<void>;

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean;

  /**
   * Get current service configuration
   */
  getConfiguration(): AudioManagerOptions;

  /**
   * Update service configuration
   * @param options Partial configuration to update
   */
  updateConfiguration(options: Partial<AudioManagerOptions>): Promise<void>;

  /**
   * Start audio recording
   * @param options Recording configuration options
   */
  startRecording(options?: RecordingOptions): Promise<void>;

  /**
   * Stop current recording
   * @returns Promise resolving to audio blob and optional transcript
   */
  stopRecording(): Promise<{ audio: Blob; transcript?: string }>;

  /**
   * Check if currently recording
   */
  isRecording(): boolean;

  /**
   * Pause current recording (if supported)
   */
  pauseRecording(): Promise<void>;

  /**
   * Resume paused recording (if supported)
   */
  resumeRecording(): Promise<void>;

  /**
   * Transcribe audio blob to text
   * @param audio Audio blob to transcribe
   * @param engineName Optional transcription engine
   * @returns Promise resolving to transcription response
   */
  transcribeAudio(audio: Blob, engineName?: string): Promise<TranscriptionResponse>;

  /**
   * Transcribe audio file to text
   * @param file Audio file to transcribe
   * @param engineName Optional transcription engine
   * @returns Promise resolving to transcription response
   */
  transcribeFile(file: File, engineName?: string): Promise<TranscriptionResponse>;

  /**
   * Get available transcription engines
   * @returns Promise resolving to engine name array
   */
  getTranscriptionEngines(): Promise<string[]>;

  /**
   * Set preferred transcription engine
   * @param engineName Engine name to use by default
   */
  setPreferredTranscriptionEngine(engineName: string): void;

  /**
   * Get available recording and transcription engines
   * @returns Promise resolving to engine availability info
   */
  getAvailableEngines(): Promise<{ recording: string[]; transcription: string[] }>;

  /**
   * Get currently active engines
   * @returns Current recording and transcription engine names
   */
  getCurrentEngines(): { recording?: string; transcription?: string };

  /**
   * Test if a specific engine is available
   * @param engineName Engine name to test
   * @param type Engine type (recording or transcription)
   * @returns Promise resolving to availability status
   */
  testEngine(engineName: string, type: 'recording' | 'transcription'): Promise<boolean>;

  /**
   * Re-scan for available engines
   */
  refreshEngines(): Promise<void>;

  /**
   * Register callback for real-time transcription updates
   * @param callback Function called with transcript updates
   */
  onRealtimeTranscript(callback: (text: string, isFinal: boolean) => void): void;

  /**
   * Unregister real-time transcription callback
   * @param callback Function to remove
   */
  offRealtimeTranscript(callback: (text: string, isFinal: boolean) => void): void;

  /**
   * Enable or disable real-time transcription
   * @param enabled Whether real-time transcription should be active
   */
  enableRealtimeTranscription(enabled: boolean): void;

  /**
   * Check if real-time transcription is enabled
   */
  isRealtimeTranscriptionEnabled(): boolean;

  /**
   * Process audio with filters and effects
   * @param audio Audio blob to process
   * @param options Processing configuration
   * @returns Promise resolving to processed audio
   */
  processAudio(audio: Blob, options: any): Promise<Blob>;

  /**
   * Get metadata from audio blob
   * @param audio Audio blob to analyze
   * @returns Promise resolving to audio metadata
   */
  getAudioMetadata(audio: Blob): Promise<{ duration: number; sampleRate: number; channels: number }>;

  /**
   * Convert audio to different format
   * @param audio Audio blob to convert
   * @param format Target format
   * @returns Promise resolving to converted audio
   */
  convertAudioFormat(audio: Blob, format: string): Promise<Blob>;

  /**
   * Normalize audio levels
   * @param audio Audio blob to normalize
   * @returns Promise resolving to normalized audio
   */
  normalizeAudio(audio: Blob): Promise<Blob>;

  /**
   * Start a recording session with identifier
   * @param sessionId Session identifier
   */
  startSession(sessionId: string): void;

  /**
   * End current recording session
   */
  endSession(): void;

  /**
   * Get current session identifier
   */
  getCurrentSession(): string | null;

  /**
   * Get session history
   * @returns Array of session metadata
   */
  getSessionHistory(): Array<{ id: string; timestamp: number; duration: number }>;

  /**
   * Clean up resources and dispose service
   */
  dispose(): Promise<void>;

  /**
   * Clean up temporary files and resources
   */
  cleanup(): Promise<void>;

  /**
   * Reset service to initial state
   */
  reset(): Promise<void>;
}

// Service tokens for dependency injection
export const CANVAS_SERVICE = createToken<ICanvasService>('CanvasService');
export const PERSISTENCE_SERVICE = createToken<IPersistenceService>('PersistenceService');
export const AUDIO_SERVICE = createToken<IAudioService>('AudioService');
