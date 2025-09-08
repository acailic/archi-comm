import { invoke as tauriInvoke } from '@tauri-apps/api/tauri';
import { listen as tauriListen, Event } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';
import { writeTextFile, createDir } from '@tauri-apps/api/fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import { isTauriEnvironment } from './environment';
// Domain types are centralized in services/tauri
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import type { Project, Component, DiagramElement, Connection } from '../services/tauri';

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
