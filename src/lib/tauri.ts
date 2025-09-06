import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';
import { writeTextFile, createDir } from '@tauri-apps/api/fs';
import { appDataDir, join } from '@tauri-apps/api/path';

// Helper function to check if we're running in Tauri
export const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI__;
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
  async invoke<T>(command: string, args?: any): Promise<T> {
    if (!isTauri()) {
      console.warn(`Tauri command "${command}" called outside of Tauri environment`);
      return Promise.resolve({} as T);
    }
    return invoke(command, args);
  },
  
  async listen<T>(event: string, callback: (payload: T) => void): Promise<() => Promise<void>> {
    if (!isTauri()) {
      console.warn(`Tauri event listener "${event}" registered outside of Tauri environment`);
      return () => Promise.resolve();
    }
    
    const unlisten = await listen(event, (event) => {
      callback(event.payload as T);
    });
    
    return unlisten;
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
    return ipcUtils.invoke('update_project', { project_id: projectId, name, description, status });
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
    return ipcUtils.invoke('update_component', { 
      project_id: projectId, 
      component_id: componentId, 
      name, 
      description, 
      status, 
      dependencies 
    });
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
function isValidTranscriptionResponse(response: any, maxSegments: number = 10000): response is TranscriptionResponse {
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
  // If segments exceed maximum, truncate instead of rejecting
  if (response.segments.length > maxSegments) {
    console.warn(`Validation Warning: Number of segments (${response.segments.length}) exceeds the limit of ${maxSegments}. Truncating to allowed maximum.`);
    response.segments = response.segments.slice(0, maxSegments);
  }
  
  // Enhanced segment validation with detailed checks
  for (let i = 0; i < response.segments.length; i++) {
    const segment = response.segments[i];
    
    // Verify segment object integrity - ensure each segment is a valid object
    if (typeof segment !== 'object' || segment === null) {
      console.error(`Validation Error: Segment ${i} is not an object.`, segment);
      return false;
    }
    
    // Ensure text is a string - validate the transcribed content exists and is properly typed
    if (typeof segment.text !== 'string') {
      console.error(`Validation Error: Segment ${i} 'text' field is not a string.`, segment);
      return false;
    }
    
    // Validate start time - must be a finite, non-negative number representing seconds
    if (!Number.isFinite(segment.start) || segment.start < 0) {
      console.error(`Validation Error: Segment ${i} 'start' is not a non-negative finite number.`, segment);
      return false;
    }
    
    // Validate end time - must be a finite number and greater than or equal to start time
    if (!Number.isFinite(segment.end) || segment.end < segment.start) {
      console.error(`Validation Error: Segment ${i} 'end' is not a finite number >= start.`, segment);
      return false;
    }
    
    // Confirm segments do not overlap - check temporal ordering to ensure data integrity
    if (i > 0) {
      const prevSegment = response.segments[i - 1];
      if (segment.start < prevSegment.end) {
        console.error(`Validation Error: Segment ${i} overlaps with previous segment.`, { prev: prevSegment, current: segment });
        return false;
      }
    }
  }
  
  return true;
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
    // Check if running in Tauri environment
    if (!isTauri()) {
      // Return typed fallback object for non-Tauri environments
      return {
        text: 'This is a mock transcription for non-Tauri environments.',
        segments: []
      };
    }

    const { onProgress, jobId, timeout, maxSegments = 10000 } = options || {};
    
    // Parameter validation
    if (timeout !== undefined && (!Number.isFinite(timeout) || timeout <= 0)) {
      throw new Error('timeout must be a positive number');
    }
    if (jobId !== undefined && (typeof jobId !== 'string' || jobId.trim() === '')) {
      throw new Error('jobId must be a non-empty string');
    }
    if (!Number.isFinite(maxSegments) || maxSegments <= 0) {
      throw new Error('maxSegments must be a positive number');
    }
    
    let progressUnlisten: (() => void) | null = null;

    try {
      // Set up progress listener if callback is provided
      if (onProgress) {
        progressUnlisten = await ipcUtils.listen<TranscriptionProgressEvent>(
          'transcription-progress',
          (event) => {
            onProgress({ ...event, timestamp: Date.now() });
          }
        );
      }

      const invokeParams: any = { file_path: filePath };
      if (jobId) invokeParams.job_id = jobId;
      if (timeout) invokeParams.timeout = timeout;

      const response = await ipcUtils.invoke('transcribe_audio', invokeParams);
      
      if (!isValidTranscriptionResponse(response, maxSegments)) {
        throw new Error(
          `Invalid transcription response structure received from backend: ${JSON.stringify(response)}`
        );
      }
      
      return response;
    } catch (error) {
      // Preserve original error's stack trace and cause
      const categorizedError = new Error(categorizeTranscriptionError(error));
      Object.assign(categorizedError, { cause: error });
      throw categorizedError;
    } finally {
      // Ensure progress listener is always cleaned up
      if (progressUnlisten) {
        progressUnlisten();
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
