import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';

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
  
  async listen<T>(event: string, callback: (payload: T) => void) {
    if (!isTauri()) {
      console.warn(`Tauri event listener "${event}" registered outside of Tauri environment`);
      return () => {};
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
};