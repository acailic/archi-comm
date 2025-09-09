import { invoke } from '@tauri-apps/api/tauri';
import { isTauriEnvironment, DEBUG } from '../lib/environment';
import {
  webProjectManager,
  webFileManager,
  webNotificationManager,
  type WebProject,
} from './web-fallback';

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
/**
 * Project management API with environment-aware fallbacks
 * @description Handles project operations in both Tauri and web environments
 */
export class ProjectAPI {
  /**
   * Create a new project
   * @description Tauri: Creates project in backend, Web: Saves to localStorage
   */
  static async createProject(name: string, description: string): Promise<Project> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'createProject');

      const webProject: WebProject = {
        id: crypto.randomUUID(),
        name,
        data: {
          description,
          status: ProjectStatus.Planning,
          components: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        lastModified: Date.now(),
        version: 1,
      };

      const saved = await webProjectManager.saveProject(webProject);
      if (!saved) {
        throw new Error('Failed to create project in web environment');
      }

      return {
        id: webProject.id,
        name: webProject.name,
        description,
        status: ProjectStatus.Planning,
        components: [],
        created_at: webProject.data.created_at,
        updated_at: webProject.data.updated_at,
      };
    }

    return await invoke('create_project', { name, description });
  }

  /**
   * Get all projects
   * @description Tauri: Retrieves from backend, Web: Retrieves from localStorage
   */
  static async getProjects(): Promise<Project[]> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'getProjects');

      const webProjects = await webProjectManager.getProjects();
      return webProjects.map(wp => ({
        id: wp.id,
        name: wp.name,
        description: wp.data.description || '',
        status: wp.data.status || ProjectStatus.Planning,
        components: wp.data.components || [],
        created_at: wp.data.created_at || new Date(wp.lastModified).toISOString(),
        updated_at: wp.data.updated_at || new Date(wp.lastModified).toISOString(),
      }));
    }

    return await invoke('get_projects');
  }

  /**
   * Get a specific project by ID
   * @description Tauri: Retrieves from backend, Web: Retrieves from localStorage
   */
  static async getProject(projectId: string): Promise<Project | null> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'getProject');

      const webProject = await webProjectManager.getProject(projectId);
      if (!webProject) return null;

      return {
        id: webProject.id,
        name: webProject.name,
        description: webProject.data.description || '',
        status: webProject.data.status || ProjectStatus.Planning,
        components: webProject.data.components || [],
        created_at: webProject.data.created_at || new Date(webProject.lastModified).toISOString(),
        updated_at: webProject.data.updated_at || new Date(webProject.lastModified).toISOString(),
      };
    }

    return await invoke('get_project', { project_id: projectId });
  }

  /**
   * Update project information
   * @description Tauri: Updates in backend, Web: Updates in localStorage
   */
  static async updateProject(
    projectId: string,
    updates: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
    }
  ): Promise<Project | null> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'updateProject');

      const webProject = await webProjectManager.getProject(projectId);
      if (!webProject) return null;

      const updatedProject: WebProject = {
        ...webProject,
        name: updates.name || webProject.name,
        data: {
          ...webProject.data,
          description: updates.description || webProject.data.description,
          status: updates.status || webProject.data.status,
          updated_at: new Date().toISOString(),
        },
        lastModified: Date.now(),
        version: webProject.version + 1,
      };

      const saved = await webProjectManager.saveProject(updatedProject);
      if (!saved) return null;

      return {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.data.description,
        status: updatedProject.data.status,
        components: updatedProject.data.components || [],
        created_at: updatedProject.data.created_at,
        updated_at: updatedProject.data.updated_at,
      };
    }

    return await invoke('update_project', {
      project_id: projectId,
      name: updates.name,
      description: updates.description,
      status: updates.status,
    });
  }

  /**
   * Delete a project
   * @description Tauri: Deletes from backend, Web: Removes from localStorage
   */
  static async deleteProject(projectId: string): Promise<boolean> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'deleteProject');
      return await webProjectManager.deleteProject(projectId);
    }

    return await invoke('delete_project', { project_id: projectId });
  }
}

// Component Management API
/**
 * Component management API with environment-aware fallbacks
 * @description Handles component operations in both Tauri and web environments
 */
export class ComponentAPI {
  /**
   * Add component to project
   * @description Tauri: Adds to backend, Web: Updates localStorage
   */
  static async addComponent(
    projectId: string,
    name: string,
    componentType: ComponentType,
    description: string
  ): Promise<Component | null> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'addComponent');

      const webProject = await webProjectManager.getProject(projectId);
      if (!webProject) return null;

      const newComponent: Component = {
        id: crypto.randomUUID(),
        name,
        component_type: componentType,
        description,
        dependencies: [],
        status: ComponentStatus.NotStarted,
        metadata: {},
      };

      const updatedProject: WebProject = {
        ...webProject,
        data: {
          ...webProject.data,
          components: [...(webProject.data.components || []), newComponent],
          updated_at: new Date().toISOString(),
        },
        lastModified: Date.now(),
        version: webProject.version + 1,
      };

      const saved = await webProjectManager.saveProject(updatedProject);
      return saved ? newComponent : null;
    }

    return await invoke('add_component', {
      project_id: projectId,
      name,
      component_type: componentType,
      description,
    });
  }

  /**
   * Update component information
   * @description Tauri: Updates in backend, Web: Updates in localStorage
   */
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
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'updateComponent');

      const webProject = await webProjectManager.getProject(projectId);
      if (!webProject) return null;

      const components = webProject.data.components || [];
      const componentIndex = components.findIndex(c => c.id === componentId);
      if (componentIndex === -1) return null;

      const updatedComponent = {
        ...components[componentIndex],
        name: updates.name || components[componentIndex].name,
        description: updates.description || components[componentIndex].description,
        status: updates.status || components[componentIndex].status,
        dependencies: updates.dependencies || components[componentIndex].dependencies,
      };

      const updatedComponents = [...components];
      updatedComponents[componentIndex] = updatedComponent;

      const updatedProject: WebProject = {
        ...webProject,
        data: {
          ...webProject.data,
          components: updatedComponents,
          updated_at: new Date().toISOString(),
        },
        lastModified: Date.now(),
        version: webProject.version + 1,
      };

      const saved = await webProjectManager.saveProject(updatedProject);
      return saved ? updatedComponent : null;
    }

    return await invoke('update_component', {
      project_id: projectId,
      component_id: componentId,
      name: updates.name,
      description: updates.description,
      status: updates.status,
      dependencies: updates.dependencies,
    });
  }

  /**
   * Remove component from project
   * @description Tauri: Removes from backend, Web: Updates localStorage
   */
  static async removeComponent(projectId: string, componentId: string): Promise<boolean> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'removeComponent');

      const webProject = await webProjectManager.getProject(projectId);
      if (!webProject) return false;

      const components = webProject.data.components || [];
      const filteredComponents = components.filter(c => c.id !== componentId);

      const updatedProject: WebProject = {
        ...webProject,
        data: {
          ...webProject.data,
          components: filteredComponents,
          updated_at: new Date().toISOString(),
        },
        lastModified: Date.now(),
        version: webProject.version + 1,
      };

      return await webProjectManager.saveProject(updatedProject);
    }

    return await invoke('remove_component', { project_id: projectId, component_id: componentId });
  }
}

// Diagram Management API
/**
 * Diagram management API with environment-aware fallbacks
 * @description Handles diagram operations in both Tauri and web environments
 */
export class DiagramAPI {
  /**
   * Save diagram elements
   * @description Tauri: Saves to backend, Web: Saves to localStorage
   */
  static async saveDiagram(projectId: string, elements: DiagramElement[]): Promise<void> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'saveDiagram');

      const webProject = await webProjectManager.getProject(projectId);
      if (!webProject) throw new Error('Project not found');

      const updatedProject: WebProject = {
        ...webProject,
        data: {
          ...webProject.data,
          diagramElements: elements,
          updated_at: new Date().toISOString(),
        },
        lastModified: Date.now(),
        version: webProject.version + 1,
      };

      const saved = await webProjectManager.saveProject(updatedProject);
      if (!saved) throw new Error('Failed to save diagram');
      return;
    }

    return await invoke('save_diagram', { project_id: projectId, elements });
  }

  /**
   * Load diagram elements
   * @description Tauri: Loads from backend, Web: Loads from localStorage
   */
  static async loadDiagram(projectId: string): Promise<DiagramElement[]> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'loadDiagram');

      const webProject = await webProjectManager.getProject(projectId);
      return webProject?.data.diagramElements || [];
    }

    return await invoke('load_diagram', { project_id: projectId });
  }

  /**
   * Save diagram connections
   * @description Tauri: Saves to backend, Web: Saves to localStorage
   */
  static async saveConnections(projectId: string, connections: Connection[]): Promise<void> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'saveConnections');

      const webProject = await webProjectManager.getProject(projectId);
      if (!webProject) throw new Error('Project not found');

      const updatedProject: WebProject = {
        ...webProject,
        data: {
          ...webProject.data,
          diagramConnections: connections,
          updated_at: new Date().toISOString(),
        },
        lastModified: Date.now(),
        version: webProject.version + 1,
      };

      const saved = await webProjectManager.saveProject(updatedProject);
      if (!saved) throw new Error('Failed to save connections');
      return;
    }

    return await invoke('save_connections', { project_id: projectId, connections });
  }

  /**
   * Load diagram connections
   * @description Tauri: Loads from backend, Web: Loads from localStorage
   */
  static async loadConnections(projectId: string): Promise<Connection[]> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('FILE_OPERATIONS', 'loadConnections');

      const webProject = await webProjectManager.getProject(projectId);
      return webProject?.data.diagramConnections || [];
    }

    return await invoke('load_connections', { project_id: projectId });
  }
}

// Utility API
/**
 * Utility API with environment-aware fallbacks
 * @description Handles utility operations in both Tauri and web environments
 */
export class UtilityAPI {
  /**
   * Get application version
   * @description Tauri: Gets from backend, Web: Gets from package.json or defaults
   */
  static async getAppVersion(): Promise<string> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('SYSTEM_INTEGRATION', 'getAppVersion');
      return import.meta.env.VITE_APP_VERSION || '1.0.0-web';
    }

    return await invoke('get_app_version');
  }

  /**
   * Show file in system folder
   * @description Tauri: Opens system file manager, Web: Shows notification (not supported)
   */
  static async showInFolder(path: string): Promise<void> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('SYSTEM_INTEGRATION', 'showInFolder');

      await webNotificationManager.showNotification({
        title: 'Show in Folder',
        body: `Cannot open folder in web environment: ${path}`,
      });

      console.info('showInFolder called in web environment:', path);
      return;
    }

    return await invoke('show_in_folder', { path });
  }

  /**
   * Export project data
   * @description Tauri: Exports via backend, Web: Exports as download
   */
  static async exportProjectData(projectId: string): Promise<string> {
    if (!isTauriEnvironment()) {
      DEBUG.checkFeature('NATIVE_EXPORT', 'exportProjectData');

      const webProject = await webProjectManager.getProject(projectId);
      if (!webProject) throw new Error('Project not found');

      const exportData = {
        id: webProject.id,
        name: webProject.name,
        data: webProject.data,
        exportedAt: new Date().toISOString(),
        version: webProject.version,
      };

      const exported = await webFileManager.exportJSON(`${webProject.name}-export`, exportData);
      if (!exported) throw new Error('Failed to export project data');

      return JSON.stringify(exportData, null, 2);
    }

    return await invoke('export_project_data', { project_id: projectId });
  }
}

// Error handling wrapper with environment awareness
/**
 * Enhanced Tauri API wrapper with environment checks and error handling
 * @description Provides safe invocation with fallback strategies
 */
export class TauriAPI {
  /**
   * Safely invoke Tauri command with environment awareness
   * @description Only invokes if in Tauri environment, otherwise returns null
   */
  static async safeInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
    if (!isTauriEnvironment()) {
      console.warn(`Tauri command '${command}' called in web environment, returning null`);
      return null;
    }

    const startTime = performance.now();
    try {
      const result = await invoke(command, args);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance(`Tauri.${command}`, duration, { success: true });
      return result;
    } catch (error) {
      console.error(`Tauri command '${command}' failed:`, error);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance(`Tauri.${command}`, duration, { success: false, error });
      return null;
    }
  }

  /**
   * Check if Tauri is available and ready
   */
  static isAvailable(): boolean {
    return isTauriEnvironment();
  }

  /**
   * Get environment information for debugging
   */
  static getEnvironmentInfo(): { isTauri: boolean; hasInvoke: boolean; userAgent: string } {
    return {
      isTauri: isTauriEnvironment(),
      hasInvoke: typeof invoke === 'function',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };
  }
}

// Event listening helpers with environment awareness
/**
 * Setup Tauri event listeners with environment checks
 * @description Only sets up listeners in Tauri environment
 */
export const setupTauriListeners = () => {
  if (!isTauriEnvironment()) {
    console.info('Skipping Tauri listeners setup (web environment)');
    return;
  }

  try {
    const start = performance.now();
    // This can be expanded to listen to Tauri events
    // For example, file system events, window events, etc.
    DEBUG.logPerformance('setupTauriListeners', performance.now() - start);
    console.log('Tauri listeners setup completed');
  } catch (error) {
    console.error('Failed to setup Tauri listeners:', error);
  }
};

/**
 * Initialize Tauri services with proper environment detection
 */
export const initializeTauriServices = async (): Promise<boolean> => {
  if (!isTauriEnvironment()) {
    console.info('Tauri services not available (web environment)');
    return false;
  }

  try {
    setupTauriListeners();

    // Test basic Tauri functionality
    const version = await UtilityAPI.getAppVersion();
    console.info('Tauri services initialized successfully, version:', version);
    return true;
  } catch (error) {
    console.error('Failed to initialize Tauri services:', error);
    return false;
  }
};
