import { invoke as tauriInvoke } from '@tauri-apps/api/tauri';
import { listen as tauriListen, Event } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';
import { writeTextFile, createDir } from '@tauri-apps/api/fs';
import { appDataDir, join } from '@tauri-apps/api/path';

// Helper function to check if we're running in Tauri
export const isTauri = () => {
  return typeof window !== 'undefined' && !!window.__TAURI__;
};


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
          console.error(`Failed to unlisten for event "${event}":`, error);
          // Optionally re-throw or handle as needed
          throw error;
        }
      };
    } catch (error) {
      console.error(`Failed to set up listener for event "${event}":`, error);
      throw error;
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

// Data types matching Rust backend
export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  status: 'Planning' | 'InProgress' | 'Review' | 'Complete';
  components: Component[];
}

export interface Component {
  id: string;
  name: string;
  component_type: 'Frontend' | 'Backend' | 'Database' | 'Api' | 'Service' | 'Integration';
  description: string;
  dependencies: string[];
  status: 'NotStarted' | 'InProgress' | 'Testing' | 'Done';
  metadata: Record<string, string>;
}

export interface DiagramElement {
  id: string;
  element_type: string;
  position: { x: number; y: number };
  properties: Record<string, string>;
}

export interface Connection {
  id: string;
  source_id: string;
  target_id: string;
  connection_type: string;
  properties: Record<string, string>;
}

/**
 * Represents a transcription segment with time boundaries
 */
export interface TranscriptionSegment {
  /** The transcribed text content for this segment */
  text: string;
  /** Start time of the segment in seconds */
  start: number;
  /** End time of the segment in seconds */
  end: number;
  /** Optional confidence score (0-1) for this segment (not currently provided by backend) */
  confidence?: number;
  /** Optional speaker identification (not currently provided by backend) */
  speaker?: string;
  /** Optional individual words within the segment (not currently provided by backend) */
  words?: Array<{
    /** The individual word */
    word: string;
    /** Start time of the word in seconds */
    start: number;
    /** End time of the word in seconds */
    end: number;
    /** Optional confidence score for the word */
    confidence?: number;
  }>;
}

/**
 * Complete transcription response containing full text and segmented data
 */
export interface TranscriptionResponse {
  /** Full transcribed text combining all segments */
  text: string;
  /** Array of time-bounded transcription segments */
  segments: TranscriptionSegment[];
}

export interface TranscriptionProgressEvent {
  type: 'progress' | 'partial_result' | 'status';
  progress?: number; // 0-100 percentage
  partialText?: string;
  status?: string;
  timestamp: number;
  jobId?: string; // Job ID to filter events for concurrent transcriptions
}

export type TranscriptionProgressCallback = (event: TranscriptionProgressEvent) => void;

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
    const payload: { project_id: string; name?: string; description?: string; status?: Project['status'] } = { project_id: projectId };
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
      description 
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
    return ipcUtils.invoke('remove_component', { project_id: projectId, component_id: componentId });
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

// Type guard to validate TranscriptionResponse structure
/**
 * Validates a TranscriptionResponse structure.
 * Note: This function sorts a copy of the segments array by start time before checking for overlaps,
 * so the overlap check is always reliable regardless of backend order.
 */
function isValidTranscriptionResponse(response: any): response is TranscriptionResponse {
  if (typeof response !== 'object' || response === null) {
    console.error("Validation Error: Response is not an object.", response);
    return false;
  }
  if (typeof response.text !== 'string') {
    console.error("Validation Error: 'text' field is not a string.", response);
    return false;
  }
  if (!Array.isArray(response.segments)) {
    console.error("Validation Error: 'segments' field is not an array.", response);
    return false;
  }

  // Sort a copy of segments by start time for reliable overlap validation
  const sortedSegments = [...response.segments].sort((a, b) => a.start - b.start);

  // Enhanced segment validation with detailed checks
  for (let i = 0; i < sortedSegments.length; i++) {
    const segment = sortedSegments[i];

    if (typeof segment !== 'object' || segment === null) {
      console.error(`Validation Error: Segment ${i} is not an object.`, segment);
      return false;
    }
    if (typeof segment.text !== 'string') {
      console.error(`Validation Error: Segment ${i} 'text' field is not a string.`, segment);
      return false;
    }

    const start = typeof segment.start === 'string' ? parseFloat(segment.start) : segment.start;
    const end = typeof segment.end === 'string' ? parseFloat(segment.end) : segment.end;

    if (!Number.isFinite(start) || start < 0) {
      console.error(`Validation Error: Segment ${i} 'start' is not a non-negative finite number.`, segment);
      return false;
    }
    if (!Number.isFinite(end) || end < start) {
      console.error(`Validation Error: Segment ${i} 'end' is not a finite number >= start.`, segment);
      return false;
    }

    if (segment.confidence !== undefined && (typeof segment.confidence !== 'number' || segment.confidence < 0 || segment.confidence > 1)) {
      console.error(`Validation Error: Segment ${i} 'confidence' is not a number between 0 and 1.`, segment);
      return false;
    }
    if (segment.words !== undefined && !Array.isArray(segment.words)) {
      console.error(`Validation Error: Segment ${i} 'words' is not an array.`, segment);
      return false;
    }

    if (i > 0) {
      const prevSegment = sortedSegments[i - 1];
      if (start < prevSegment.end) {
        console.warn(`Validation Warning: Segment ${i} overlaps with previous segment.`, { prev: prevSegment, current: segment });
      }
    }
  }

  return true;
}

/**
 * Sanitizes a transcription response, ensuring it conforms to expected constraints.
 * This function does not mutate the original response object.
 * @param response The original transcription response.
 * @param maxSegments The maximum number of segments to allow.
 * @returns A new, sanitized transcription response object.
 */
function sanitizeTranscriptionResponse(response: TranscriptionResponse, maxSegments: number): TranscriptionResponse {
  // Deep clone the segments array and individual segment objects using structuredClone or fallback
  let clonedSegments: TranscriptionSegment[];
  try {
    clonedSegments = structuredClone(response.segments);
  } catch {
    // Fallback for environments without structuredClone support
    clonedSegments = response.segments.map(segment => ({
      text: segment.text,
      start: segment.start,
      end: segment.end,
      confidence: segment.confidence,
      speaker: segment.speaker,
      words: segment.words ? segment.words.map(word => ({
        word: word.word,
        start: word.start,
        end: word.end,
        confidence: word.confidence
      })) : undefined
    }));
  }
  
  const sanitizedResponse = { ...response, segments: clonedSegments };

  if (sanitizedResponse.segments.length > maxSegments) {
    console.warn(`Sanitization: Number of segments (${sanitizedResponse.segments.length}) exceeds the limit of ${maxSegments}. Truncating.`);
    sanitizedResponse.segments = sanitizedResponse.segments.slice(0, maxSegments);
    // Optionally, you could also regenerate the full text from the truncated segments
    // sanitizedResponse.text = sanitizedResponse.segments.map(s => s.text).join(' ').trim();
  }

  return sanitizedResponse;
}

// Helper function to categorize errors from the backend
function categorizeTranscriptionError(error: any): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  if (errorMessage.startsWith('MODEL_ERROR')) {
    return `Model Error: The AI model failed to load. Please check your internet connection and try again. Details: ${errorMessage}`;
  }
  if (errorMessage.startsWith('FFMPEG_ERROR')) {
    return `Audio Conversion Error: Failed to process the audio file. Please ensure your audio format is supported. Details: ${errorMessage}`;
  }
  if (errorMessage.startsWith('FORMAT_ERROR')) {
    return `Invalid Format Error: The audio format is not supported. Please use a standard format like WAV or MP3. Details: ${errorMessage}`;
  }
  if (errorMessage.startsWith('FILE_NOT_FOUND')) {
    return `File Not Found: The audio file could not be found at the specified path. Details: ${errorMessage}`;
  }
  
  return `An unexpected error occurred during transcription: ${errorMessage}`;
}

// Transcription utilities
export const transcriptionUtils = {
  async transcribeAudio(
    filePath: string,
    options?: {
      onProgress?: TranscriptionProgressCallback;
      timeout?: number; // Timeout in milliseconds
      jobId?: string;   // Optional ID for cancellation
      maxSegments?: number; // Maximum allowed segments (default: 10000)
    }
  ): Promise<TranscriptionResponse> {
    if (!isTauri()) {
      return Promise.reject(new Error('transcribeAudio can only be called in a Tauri environment.'));
    }

    const { onProgress, jobId, timeout, maxSegments = 10000 } = options || {};
    
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
      return Promise.reject(new Error('timeout must be a positive number'));
    }
    if (jobId !== undefined && (typeof jobId !== 'string' || jobId.trim() === '')) {
      return Promise.reject(new Error('jobId must be a non-empty string'));
    }
    if (!Number.isFinite(maxSegments) || maxSegments <= 0) {
      return Promise.reject(new Error('maxSegments must be a positive number'));
    }
    
    let progressUnlisten: (() => Promise<void>) | null = null;

    try {
      if (onProgress) {
        progressUnlisten = await ipcUtils.listen<TranscriptionProgressEvent>(
          'transcription-progress',
          (event) => {
            // Only invoke onProgress if jobId matches or if no jobId filtering is needed
            if (!jobId || !event.jobId || event.jobId === jobId) {
              onProgress({ ...event, timestamp: Date.now() });
            }
          }
        );
      }

      const invokeParams: any = { file_path: filePath };
      if (jobId) invokeParams.job_id = jobId;
      if (timeout) invokeParams.timeout = timeout;

      const response = await ipcUtils.invoke('transcribe_audio', invokeParams);
      
      if (!isValidTranscriptionResponse(response)) {
        throw new Error(
          `Invalid transcription response structure received from backend: ${JSON.stringify(response)}`
        );
      }
      
      return sanitizeTranscriptionResponse(response, maxSegments);
    } catch (error) {
      const categorizedError = new Error(categorizeTranscriptionError(error));
      Object.assign(categorizedError, { cause: error });
      throw categorizedError;
    } finally {
      if (progressUnlisten) {
        await progressUnlisten();
        progressUnlisten = null;
      }
    }
  },

  async cancelTranscription(jobId: string): Promise<boolean> {
    if (!isTauri()) {
      console.warn(`cancel_transcription called outside of Tauri environment`);
      return false;
    }
    
    if (!jobId || jobId.trim() === '') {
      throw new Error('jobId is required and cannot be empty');
    }
    
    try {
      await ipcUtils.invoke('cancel_transcription', { job_id: jobId });
      return true;
    } catch (error) {
      console.error('Failed to cancel transcription:', error);
      return false;
    }
  },

  // IPC testing utility
  async testTranscriptionPipeline(testAudioPath: string): Promise<{ success: boolean; data?: TranscriptionResponse; error?: string }> {
    if (!isTauri()) {
      return { success: false, error: 'Not in a Tauri environment.' };
    }
    try {
      const response = await this.transcribeAudio(testAudioPath);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
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
  transcriptionUtils,
  utilUtils,
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
