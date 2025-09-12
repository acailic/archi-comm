import { invoke as tauriInvoke } from '@tauri-apps/api/tauri';
import { listen as tauriListen, Event } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/api/notification';
import { writeTextFile, writeBinaryFile, createDir, readBinaryFile } from '@tauri-apps/api/fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { Project, Component, DiagramElement, Connection } from '../services/tauri';
import type { TranscriptionResponse, TranscriptionOptions } from '../shared/contracts';
import { isTauriEnvironment } from './environment';
// Domain types are centralized in services/tauri

// Helper function to check if we're running in Tauri
/**
 * Deprecated aliases: use isTauriEnvironment() from ./environment instead.
 * These aliases route to the centralized helper to avoid drift.
 */
export const isTauri = isTauriEnvironment;

// Window management utilities
export const windowUtils = {
  minimize: () => isTauri() && appWindow.minimize(),
  maximize: () => isTauri() && appWindow.toggleMaximize(),
  close: () => isTauri() && appWindow.close(),
  setTitle: (title: string) => isTauri() && appWindow.setTitle(title),
  setResizable: (resizable: boolean) => isTauri() && appWindow.setResizable(resizable),
};

// Notification utilities
export const notificationUtils = {
  async send(title: string, body: string) {
    if (!isTauri()) return;

    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    if (permissionGranted) {
      sendNotification({ title, body });
    }
  },
};

// Helper function for error handling in IPC operations
function handleIpcError(context: string, error: any): never {
  console.error(`Failed to ${context}:`, error);
  throw error;
}

// IPC communication helpers
export const ipcUtils = {
  /**
   * Invoke a Tauri command. Returns a Promise resolving to the result.
   * Throws an error if called outside of a Tauri environment.
   * @template T The expected return type.
   * @param command The Tauri command to invoke.
   * @param args Optional arguments for the command.
   * @returns Promise resolving to the result of the command.
   * @throws Error if called outside of a Tauri environment.
   */
  async invoke<T>(command: string, args?: any): Promise<T> {
    if (!isTauri()) {
      const errorMsg = `Tauri command "${command}" called outside of Tauri environment with args: ${JSON.stringify(args)}`;
      throw new Error(errorMsg);
    }
    return tauriInvoke(command, args);
  },

  /**
   * Listen for a Tauri event. Returns a Promise resolving to an unlisten function.
   * The unlisten function returns a Promise<void> when called.
   * @template T The payload type for the event.
   * @param event The event name to listen for.
   * @param callback The callback to invoke with the event payload.
   * @returns Promise resolving to an unlisten function.
   */
  async listen<T>(event: string, callback: (payload: T) => void): Promise<() => Promise<void>> {
    if (!isTauri()) {
      console.warn(`Tauri event listener "${event}" registered outside of Tauri environment`);
      return async () => {};
    }

    try {
      const unlistenFn = await tauriListen<T>(event, (evt: Event<T>) => {
        callback(evt.payload);
      });

      return async () => {
        try {
          unlistenFn();
        } catch (error) {
          handleIpcError(`unlisten for event "${event}"`, error);
        }
      };
    } catch (error) {
      handleIpcError(`set up listener for event "${event}"`, error);
    }
  },
};

// File system utilities (to be extended based on backend commands)
export const fileUtils = {
  async readFile(path: string): Promise<string> {
    return ipcUtils.invoke('read_file', { path });
  },

  async writeFile(path: string, content: string): Promise<void> {
    return ipcUtils.invoke('write_file', { path, content });
  },

  async selectFile(): Promise<string | null> {
    return ipcUtils.invoke('select_file');
  },

  async selectDirectory(): Promise<string | null> {
    return ipcUtils.invoke('select_directory');
  },
};

// Re-export canonical domain types from services/tauri
// Prefer importing these types from '../services/tauri'
export type { Project, Component, DiagramElement, Connection } from '../services/tauri';

// Project management utilities (matching actual Rust backend commands)
export const projectUtils = {
  async createProject(name: string, description: string): Promise<Project> {
    return ipcUtils.invoke('create_project', { name, description });
  },

  async getProjects(): Promise<Project[]> {
    return ipcUtils.invoke('get_projects');
  },

  async getProject(projectId: string): Promise<Project | null> {
    return ipcUtils.invoke('get_project', { project_id: projectId });
  },

  async updateProject(
    projectId: string,
    name?: string,
    description?: string,
    status?: Project['status']
  ): Promise<Project | null> {
    const payload: {
      project_id: string;
      name?: string;
      description?: string;
      status?: Project['status'];
    } = { project_id: projectId };
    if (name !== undefined) payload.name = name;
    if (description !== undefined) payload.description = description;
    if (status !== undefined) payload.status = status;
    return ipcUtils.invoke('update_project', payload);
  },

  async deleteProject(projectId: string): Promise<boolean> {
    return ipcUtils.invoke('delete_project', { project_id: projectId });
  },

  async exportProjectData(projectId: string): Promise<string> {
    return ipcUtils.invoke('export_project_data', { project_id: projectId });
  },
};

// Component management utilities
export const componentUtils = {
  async addComponent(
    projectId: string,
    name: string,
    componentType: Component['component_type'],
    description: string
  ): Promise<Component | null> {
    return ipcUtils.invoke('add_component', {
      project_id: projectId,
      name,
      component_type: componentType,
      description,
    });
  },

  async updateComponent(
    projectId: string,
    componentId: string,
    name?: string,
    description?: string,
    status?: Component['status'],
    dependencies?: string[]
  ): Promise<Component | null> {
    const payload: {
      project_id: string;
      component_id: string;
      name?: string;
      description?: string;
      status?: Component['status'];
      dependencies?: string[];
    } = { project_id: projectId, component_id: componentId };

    if (name !== undefined) payload.name = name;
    if (description !== undefined) payload.description = description;
    if (status !== undefined) payload.status = status;
    if (dependencies !== undefined) payload.dependencies = dependencies;

    return ipcUtils.invoke('update_component', payload);
  },

  async removeComponent(projectId: string, componentId: string): Promise<boolean> {
    return ipcUtils.invoke('remove_component', {
      project_id: projectId,
      component_id: componentId,
    });
  },
};

// Diagram management utilities
export const diagramUtils = {
  async saveDiagram(projectId: string, elements: DiagramElement[]): Promise<void> {
    return ipcUtils.invoke('save_diagram', { project_id: projectId, elements });
  },

  async loadDiagram(projectId: string): Promise<DiagramElement[]> {
    return ipcUtils.invoke('load_diagram', { project_id: projectId });
  },

  async saveConnections(projectId: string, connections: Connection[]): Promise<void> {
    return ipcUtils.invoke('save_connections', { project_id: projectId, connections });
  },

  async loadConnections(projectId: string): Promise<Connection[]> {
    return ipcUtils.invoke('load_connections', { project_id: projectId });
  },
};

// Utility functions
export const utilUtils = {
  async getAppVersion(): Promise<string> {
    return ipcUtils.invoke('get_app_version');
  },

  async showInFolder(path: string): Promise<void> {
    return ipcUtils.invoke('show_in_folder', { path });
  },

  // Debug function only available in development
  async populateSampleData(): Promise<Project[]> {
    if (process.env.NODE_ENV === 'development') {
      return ipcUtils.invoke('populate_sample_data');
    }
    return [];
  },
};

// Transcription utilities
export const transcriptionUtils = {
  /**
   * Transcribe audio file using offline Whisper model.
   * @param filePath - Path to the audio file to transcribe
   * @param options - Optional transcription parameters
   * @returns Promise resolving to transcription response with text and segments
   */
  async transcribeAudio(
    filePath: string,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResponse> {
    // Parameter validation
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('File path is required and must be a string');
    }

    if (
      options?.timeout !== undefined &&
      (typeof options.timeout !== 'number' || options.timeout <= 0)
    ) {
      throw new Error('Timeout must be a positive number');
    }

    if (
      options?.jobId !== undefined &&
      (typeof options.jobId !== 'string' || options.jobId.trim() === '')
    ) {
      throw new Error('Job ID must be a non-empty string');
    }

    if (
      options?.maxSegments !== undefined &&
      (typeof options.maxSegments !== 'number' || options.maxSegments <= 0)
    ) {
      throw new Error('Max segments must be a positive number');
    }

    // Fallback for non-Tauri environments
    if (!isTauri()) {
      return {
        text: 'Mock transcription text',
        segments: [
          {
            text: 'Mock transcription text',
            start: 0,
            end: 5,
            confidence: 0.95,
          },
        ],
      };
    }

    try {
      const response = await ipcUtils.invoke<TranscriptionResponse>('transcribe_audio', {
        file_path: filePath,
        options: options || {},
      });

      // Validate response structure
      if (!response || typeof response.text !== 'string' || !Array.isArray(response.segments)) {
        throw new Error('Invalid transcription response structure');
      }

      // Apply maxSegments if specified
      if (options?.maxSegments && response.segments.length > options.maxSegments) {
        response.segments = response.segments.slice(0, options.maxSegments);
      }

      return response;
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  },

  /**
   * Cancel ongoing transcription by job ID.
   * @param jobId - ID of the transcription job to cancel
   * @returns Promise resolving to success status
   */
  async cancelTranscription(jobId: string): Promise<boolean> {
    if (!jobId || typeof jobId !== 'string') {
      throw new Error('Job ID is required and must be a string');
    }

    if (!isTauri()) {
      return true; // Mock success for non-Tauri environments
    }

    try {
      return await ipcUtils.invoke<boolean>('cancel_transcription', { job_id: jobId });
    } catch (error) {
      console.error('Failed to cancel transcription:', error);
      return false;
    }
  },

  /**
   * Test transcription pipeline with error handling.
   * @param filePath - Path to the audio file to test
   * @returns Promise resolving to test result object
   */
  async testTranscriptionPipeline(
    filePath: string
  ): Promise<{ success: boolean; error?: string; result?: TranscriptionResponse }> {
    try {
      const result = await this.transcribeAudio(filePath);
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

// Audio utilities
export const audioUtils = {
  /**
   * Get the temporary audio directory path for storing audio files.
   * Creates the directory if it doesn't exist.
   * @returns Promise resolving to the audio temp directory path
   */
  async getAudioTempDir(): Promise<string> {
    if (!isTauri()) {
      throw new Error('Audio utilities require Tauri environment');
    }

    try {
      const base = await appDataDir();
      const dirPath = await join(base, 'archicomm', 'audio-temp');
      await createDir(dirPath, { recursive: true });
      return dirPath;
    } catch (error) {
      console.error('Failed to create audio temp directory:', error);
      throw error;
    }
  },

  /**
   * Save audio blob to temporary file for transcription.
   * Converts blob to binary data and saves to app data directory.
   * @param blob - Audio blob to save
   * @param filename - Optional filename (defaults to timestamp-based name)
   * @returns Promise resolving to the file path
   */
  async saveAudioBlob(blob: Blob, filename?: string): Promise<string> {
    if (!blob) {
      throw new Error('Audio blob is required');
    }

    if (!isTauri()) {
      throw new Error('Audio file saving requires Tauri environment');
    }

    try {
      // Convert blob to binary data
      const arrayBuffer = await blob.arrayBuffer();
      const binaryData = new Uint8Array(arrayBuffer);
      if (!binaryData || binaryData.length === 0) {
        throw new Error('Audio blob is empty');
      }

      // Detect extension from blob.type if possible
      const type = (blob as any)?.type as string | undefined;
      const pickExtension = (mime?: string): string => {
        if (!mime) return 'webm';
        if (mime.includes('webm')) return 'webm';
        if (mime.includes('ogg')) return 'ogg';
        if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
        if (mime.includes('wav')) return 'wav';
        if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
        return 'webm';
      };
      const ext = pickExtension(type);

      // Generate filename if not provided
      const finalFilename = filename || `audio_${Date.now()}.${ext}`;

      // Get temp directory and create file path
      const tempDir = await this.getAudioTempDir();
      const filePath = await join(tempDir, finalFilename);

      // Save binary data to file
      await writeBinaryFile(filePath, binaryData);

      return filePath;
    } catch (error) {
      console.error('Failed to save audio blob:', error);
      throw error;
    }
  },

  /**
   * Clean up temporary audio files (optional utility for housekeeping).
   * @param filePath - Path to the audio file to remove
   * @returns Promise resolving to success status
   */
  async cleanupAudioFile(filePath: string): Promise<boolean> {
    if (!filePath || !isTauri()) {
      return false;
    }

    try {
      // In a full implementation, you would use removeFile from @tauri-apps/api/fs
      // For now, we'll just log the cleanup attempt
      console.log('Audio file cleanup requested for:', filePath);
      return true;
    } catch (error) {
      console.error('Failed to cleanup audio file:', error);
      return false;
    }
  },

  /**
   * Start native audio recording via Tauri backend (CPAL-based).
   * Returns the file path that will be written to while recording.
   */
  async startNativeRecording(): Promise<string> {
    if (!isTauri()) throw new Error('Native recording requires Tauri');
    return ipcUtils.invoke<string>('start_audio_recording');
  },

  /**
   * Stop native audio recording and return the finalized file path.
   */
  async stopNativeRecording(): Promise<string> {
    if (!isTauri()) throw new Error('Native recording requires Tauri');
    return ipcUtils.invoke<string>('stop_audio_recording');
  },

  /**
   * Read a local audio file and return a Blob for playback/transcription.
   */
  async loadAudioBlob(filePath: string): Promise<Blob> {
    if (!isTauri()) throw new Error('Loading local audio requires Tauri');
    const data = await readBinaryFile(filePath);
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mime =
      ext === 'wav'
        ? 'audio/wav'
        : ext === 'ogg'
          ? 'audio/ogg'
          : ext === 'm4a' || ext === 'mp4'
            ? 'audio/mp4'
            : ext === 'mp3'
              ? 'audio/mpeg'
              : 'audio/webm';
    return new Blob([data], { type: mime });
  },
};

// Legacy compatibility exports
export const isTauriApp = isTauri;
export const tauriAPI = {
  isTauri,
  windowUtils,
  notificationUtils,
  ipcUtils,
  fileUtils,
  projectUtils,
  componentUtils,
  diagramUtils,
  utilUtils,
  transcriptionUtils,
  // Convenience methods expected by UI components
  async getAppVersion() {
    return utilUtils.getAppVersion();
  },
  async minimizeWindow() {
    return windowUtils.minimize();
  },
  async maximizeWindow() {
    return windowUtils.maximize();
  },
  async closeWindow() {
    return windowUtils.close();
  },
  async setWindowTitle(title: string) {
    return windowUtils.setTitle(title);
  },
  // Lightweight autosave used by App.tsx; stores JSON under AppData/autosaves
  async saveDesign(data: unknown, key: string) {
    if (!isTauri()) return; // no-op on web
    try {
      const base = await appDataDir();
      const dirPath = await join(base, 'archicomm', 'autosaves');
      await createDir(dirPath, { recursive: true });
      const filePath = await join(dirPath, `${key}.json`);
      await writeTextFile(filePath, JSON.stringify(data, null, 2));
      return filePath;
    } catch (e) {
      console.error('saveDesign failed:', e);
    }
  },
};
