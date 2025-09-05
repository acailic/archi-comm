import { invoke } from '@tauri-apps/api/tauri';

// Types matching the Rust backend
export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  status: ProjectStatus;
  components: Component[];
}

export enum ProjectStatus {
  Planning = 'Planning',
  InProgress = 'InProgress',
  Review = 'Review',
  Complete = 'Complete',
}

export interface Component {
  id: string;
  name: string;
  component_type: ComponentType;
  description: string;
  dependencies: string[];
  status: ComponentStatus;
  metadata: Record<string, string>;
}

export enum ComponentType {
  Frontend = 'Frontend',
  Backend = 'Backend',
  Database = 'Database',
  Api = 'Api',
  Service = 'Service',
  Integration = 'Integration',
}

export enum ComponentStatus {
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Testing = 'Testing',
  Done = 'Done',
}

export interface DiagramElement {
  id: string;
  element_type: string;
  position: Position;
  properties: Record<string, string>;
}

export interface Position {
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  source_id: string;
  target_id: string;
  connection_type: string;
  properties: Record<string, string>;
}

// Project Management API
export class ProjectAPI {
  static async createProject(name: string, description: string): Promise<Project> {
    return await invoke('create_project', { name, description });
  }

  static async getProjects(): Promise<Project[]> {
    return await invoke('get_projects');
  }

  static async getProject(projectId: string): Promise<Project | null> {
    return await invoke('get_project', { project_id: projectId });
  }

  static async updateProject(
    projectId: string,
    updates: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
    }
  ): Promise<Project | null> {
    return await invoke('update_project', {
      project_id: projectId,
      name: updates.name,
      description: updates.description,
      status: updates.status,
    });
  }

  static async deleteProject(projectId: string): Promise<boolean> {
    return await invoke('delete_project', { project_id: projectId });
  }
}

// Component Management API
export class ComponentAPI {
  static async addComponent(
    projectId: string,
    name: string,
    componentType: ComponentType,
    description: string
  ): Promise<Component | null> {
    return await invoke('add_component', {
      project_id: projectId,
      name,
      component_type: componentType,
      description,
    });
  }

  static async updateComponent(
    projectId: string,
    componentId: string,
    updates: {
      name?: string;
      description?: string;
      status?: ComponentStatus;
      dependencies?: string[];
    }
  ): Promise<Component | null> {
    return await invoke('update_component', {
      project_id: projectId,
      component_id: componentId,
      name: updates.name,
      description: updates.description,
      status: updates.status,
      dependencies: updates.dependencies,
    });
  }

  static async removeComponent(
    projectId: string,
    componentId: string
  ): Promise<boolean> {
    return await invoke('remove_component', { project_id: projectId, component_id: componentId });
  }
}

// Diagram Management API
export class DiagramAPI {
  static async saveDiagram(
    projectId: string,
    elements: DiagramElement[]
  ): Promise<void> {
    return await invoke('save_diagram', { project_id: projectId, elements });
  }

  static async loadDiagram(projectId: string): Promise<DiagramElement[]> {
    return await invoke('load_diagram', { project_id: projectId });
  }

  static async saveConnections(
    projectId: string,
    connections: Connection[]
  ): Promise<void> {
    return await invoke('save_connections', { project_id: projectId, connections });
  }

  static async loadConnections(projectId: string): Promise<Connection[]> {
    return await invoke('load_connections', { project_id: projectId });
  }
}

// Utility API
export class UtilityAPI {
  static async getAppVersion(): Promise<string> {
    return await invoke('get_app_version');
  }

  static async showInFolder(path: string): Promise<void> {
    return await invoke('show_in_folder', { path });
  }

  static async exportProjectData(projectId: string): Promise<string> {
    return await invoke('export_project_data', { project_id: projectId });
  }
}

// Error handling wrapper
export class TauriAPI {
  static async safeInvoke<T>(
    command: string,
    args?: Record<string, unknown>
  ): Promise<T | null> {
    try {
      return await invoke(command, args);
    } catch (error) {
      console.error(`Tauri command '${command}' failed:`, error);
      return null;
    }
  }
}

// Event listening helpers for real-time updates
export const setupTauriListeners = () => {
  // This can be expanded to listen to Tauri events
  // For example, file system events, window events, etc.
  console.log('Tauri listeners setup completed');
};
