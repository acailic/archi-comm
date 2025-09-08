import { useState, useEffect, useCallback } from 'react';
import { 
  Project, 
  Component, 
  DiagramElement, 
  Connection,
  ProjectAPI, 
  ComponentAPI, 
  DiagramAPI, 
  UtilityAPI,
  ProjectStatus,
  ComponentType,
  ComponentStatus
} from '../services/tauri';
import { isTauriEnvironment, DEBUG, FEATURES } from '../lib/environment';
import { webNotificationManager, initializeWebFallbacks } from '../services/web-fallback';

/**
 * Hook for project management with environment-aware functionality
 * @description Works in both Tauri and web environments with appropriate fallbacks
 */
export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      DEBUG.logPerformance('fetchProjects.start', performance.now());
      const projectList = await ProjectAPI.getProjects();
      DEBUG.logPerformance('fetchProjects.end', performance.now(), { count: projectList.length });
      
      setProjects(projectList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Project Load Error',
          body: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string, description: string) => {
    try {
      setError(null);
      
      DEBUG.logPerformance('createProject.start', performance.now());
      const newProject = await ProjectAPI.createProject(name, description);
      DEBUG.logPerformance('createProject.end', performance.now(), { projectId: newProject.id });
      
      setProjects(prev => [newProject, ...prev]); // Add to beginning for recency
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Project Created',
          body: `Successfully created project: ${name}`,
        });
      }
      
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Project Creation Failed',
          body: errorMessage,
        });
      }
      
      return null;
    }
  }, []);

  const updateProject = useCallback(async (
    projectId: string, 
    updates: { name?: string; description?: string; status?: ProjectStatus }
  ) => {
    try {
      setError(null);
      
      DEBUG.logPerformance('updateProject.start', performance.now());
      const updatedProject = await ProjectAPI.updateProject(projectId, updates);
      DEBUG.logPerformance('updateProject.end', performance.now(), { projectId, updates });
      
      if (updatedProject) {
        setProjects(prev => 
          prev.map(p => p.id === projectId ? updatedProject : p)
        );
        
        if (FEATURES.NOTIFICATIONS && updates.status) {
          await webNotificationManager.showNotification({
            title: 'Project Updated',
            body: `Project status changed to: ${updates.status}`,
          });
        }
      }
      
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Project Update Failed',
          body: errorMessage,
        });
      }
      
      return null;
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      setError(null);
      
      // Find project name for notification
      const project = projects.find(p => p.id === projectId);
      const projectName = project?.name || 'Unknown Project';
      
      DEBUG.logPerformance('deleteProject.start', performance.now());
      const success = await ProjectAPI.deleteProject(projectId);
      DEBUG.logPerformance('deleteProject.end', performance.now(), { projectId, success });
      
      if (success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        if (FEATURES.NOTIFICATIONS) {
          await webNotificationManager.showNotification({
            title: 'Project Deleted',
            body: `Successfully deleted project: ${projectName}`,
          });
        }
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Project Deletion Failed',
          body: errorMessage,
        });
      }
      
      return false;
    }
  }, [projects]);

  useEffect(() => {
    // Initialize web fallbacks if needed
    if (!isTauriEnvironment()) {
      initializeWebFallbacks();
    }
    
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
    // Environment information
    isOnline: isTauriEnvironment(),
    hasFileOperations: FEATURES.FILE_OPERATIONS,
  };
};

/**
 * Hook for individual project management with environment-aware functionality
 * @description Manages single project state with proper error handling and notifications
 */
export const useProject = (projectId: string | null) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      DEBUG.logPerformance('fetchProject.start', performance.now());
      const projectData = await ProjectAPI.getProject(projectId);
      DEBUG.logPerformance('fetchProject.end', performance.now(), { projectId, found: !!projectData });
      
      setProject(projectData);
      
      if (!projectData && FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Project Not Found',
          body: `Project with ID ${projectId} was not found`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Project Load Error',
          body: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const addComponent = useCallback(async (
    name: string,
    componentType: ComponentType,
    description: string
  ) => {
    if (!projectId) return null;

    try {
      setError(null);
      
      DEBUG.logPerformance('addComponent.start', performance.now());
      const newComponent = await ComponentAPI.addComponent(projectId, name, componentType, description);
      DEBUG.logPerformance('addComponent.end', performance.now(), { componentId: newComponent?.id });
      
      if (newComponent && project) {
        setProject({
          ...project,
          components: [...project.components, newComponent],
          updated_at: new Date().toISOString(),
        });
        
        if (FEATURES.NOTIFICATIONS) {
          await webNotificationManager.showNotification({
            title: 'Component Added',
            body: `Added ${componentType} component: ${name}`,
          });
        }
      }
      
      return newComponent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add component';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Component Addition Failed',
          body: errorMessage,
        });
      }
      
      return null;
    }
  }, [projectId, project]);

  const updateComponent = useCallback(async (
    componentId: string,
    updates: {
      name?: string;
      description?: string;
      status?: ComponentStatus;
      dependencies?: string[];
    }
  ) => {
    if (!projectId) return null;

    try {
      setError(null);
      
      DEBUG.logPerformance('updateComponent.start', performance.now());
      const updatedComponent = await ComponentAPI.updateComponent(projectId, componentId, updates);
      DEBUG.logPerformance('updateComponent.end', performance.now(), { componentId, updates });
      
      if (updatedComponent && project) {
        setProject({
          ...project,
          components: project.components.map(c => 
            c.id === componentId ? updatedComponent : c
          ),
          updated_at: new Date().toISOString(),
        });
        
        if (FEATURES.NOTIFICATIONS && updates.status) {
          await webNotificationManager.showNotification({
            title: 'Component Updated',
            body: `${updatedComponent.name} status: ${updates.status}`,
          });
        }
      }
      
      return updatedComponent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update component';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Component Update Failed',
          body: errorMessage,
        });
      }
      
      return null;
    }
  }, [projectId, project]);

  const removeComponent = useCallback(async (componentId: string) => {
    if (!projectId) return false;

    try {
      setError(null);
      
      // Find component name for notification
      const component = project?.components.find(c => c.id === componentId);
      const componentName = component?.name || 'Unknown Component';
      
      DEBUG.logPerformance('removeComponent.start', performance.now());
      const success = await ComponentAPI.removeComponent(projectId, componentId);
      DEBUG.logPerformance('removeComponent.end', performance.now(), { componentId, success });
      
      if (success && project) {
        setProject({
          ...project,
          components: project.components.filter(c => c.id !== componentId),
          updated_at: new Date().toISOString(),
        });
        
        if (FEATURES.NOTIFICATIONS) {
          await webNotificationManager.showNotification({
            title: 'Component Removed',
            body: `Removed component: ${componentName}`,
          });
        }
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove component';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Component Removal Failed',
          body: errorMessage,
        });
      }
      
      return false;
    }
  }, [projectId, project]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    loading,
    error,
    addComponent,
    updateComponent,
    removeComponent,
    refetch: fetchProject,
    // Environment information
    isOnline: isTauriEnvironment(),
    hasFileOperations: FEATURES.FILE_OPERATIONS,
  };
};

/**
 * Hook for diagram management with environment-aware functionality
 * @description Manages diagram state with auto-save and error handling
 */
export const useDiagram = (projectId: string | null) => {
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<number | null>(null);

  const loadDiagram = useCallback(async () => {
    if (!projectId) {
      setElements([]);
      setConnections([]);
      setLoading(false);
      setIsDirty(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      DEBUG.logPerformance('loadDiagram.start', performance.now());
      const [diagramElements, diagramConnections] = await Promise.all([
        DiagramAPI.loadDiagram(projectId),
        DiagramAPI.loadConnections(projectId),
      ]);
      DEBUG.logPerformance('loadDiagram.end', performance.now(), { 
        elementsCount: diagramElements.length, 
        connectionsCount: diagramConnections.length 
      });
      
      setElements(diagramElements);
      setConnections(diagramConnections);
      setIsDirty(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load diagram';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Diagram Load Error',
          body: errorMessage,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const saveDiagram = useCallback(async (
    newElements: DiagramElement[],
    newConnections: Connection[]
  ) => {
    if (!projectId) return false;

    try {
      setError(null);
      
      DEBUG.logPerformance('saveDiagram.start', performance.now());
      await Promise.all([
        DiagramAPI.saveDiagram(projectId, newElements),
        DiagramAPI.saveConnections(projectId, newConnections),
      ]);
      DEBUG.logPerformance('saveDiagram.end', performance.now(), { 
        elementsCount: newElements.length, 
        connectionsCount: newConnections.length 
      });
      
      setElements(newElements);
      setConnections(newConnections);
      setIsDirty(false);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Diagram Saved',
          body: 'Your diagram has been saved successfully',
        });
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save diagram';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Diagram Save Failed',
          body: errorMessage,
        });
      }
      
      return false;
    }
  }, [projectId]);

  // Auto-save functionality
  const scheduleAutoSave = useCallback((elements: DiagramElement[], connections: Connection[]) => {
    if (!FEATURES.AUTO_SAVE || !projectId) return;
    
    setIsDirty(true);
    
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = window.setTimeout(() => {
      saveDiagram(elements, connections);
    }, 5000); // Auto-save after 5 seconds of inactivity
    
    setAutoSaveTimer(timer);
  }, [projectId, autoSaveTimer, saveDiagram]);
  
  // Update elements with auto-save
  const updateElements = useCallback((newElements: DiagramElement[]) => {
    setElements(newElements);
    scheduleAutoSave(newElements, connections);
  }, [connections, scheduleAutoSave]);
  
  // Update connections with auto-save
  const updateConnections = useCallback((newConnections: Connection[]) => {
    setConnections(newConnections);
    scheduleAutoSave(elements, newConnections);
  }, [elements, scheduleAutoSave]);
  
  useEffect(() => {
    loadDiagram();
    
    // Cleanup auto-save timer on unmount
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [loadDiagram, autoSaveTimer]);

  return {
    elements,
    connections,
    loading,
    error,
    isDirty,
    saveDiagram,
    loadDiagram,
    updateElements,
    updateConnections,
    // Environment information
    isOnline: isTauriEnvironment(),
    hasAutoSave: FEATURES.AUTO_SAVE,
  };
};

/**
 * Hook for utility functions with environment-aware functionality
 * @description Provides utility functions with proper fallbacks for web environment
 */
export const useUtilities = () => {
  const [appVersion, setAppVersion] = useState<string>('');
  const [environment, setEnvironment] = useState<string>('');

  const getAppVersion = useCallback(async () => {
    try {
      DEBUG.logPerformance('getAppVersion.start', performance.now());
      const version = await UtilityAPI.getAppVersion();
      DEBUG.logPerformance('getAppVersion.end', performance.now(), { version });
      
      setAppVersion(version);
      setEnvironment(isTauriEnvironment() ? 'Tauri Desktop' : 'Web Browser');
    } catch (err) {
      console.error('Failed to get app version:', err);
      setAppVersion('Unknown');
      setEnvironment(isTauriEnvironment() ? 'Tauri Desktop (Error)' : 'Web Browser');
    }
  }, []);

  const showInFolder = useCallback(async (path: string) => {
    try {
      DEBUG.logPerformance('showInFolder.start', performance.now());
      await UtilityAPI.showInFolder(path);
      DEBUG.logPerformance('showInFolder.end', performance.now(), { path });
    } catch (err) {
      console.error('Failed to show in folder:', err);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Show in Folder',
          body: `Cannot open folder: ${path}`,
        });
      }
    }
  }, []);

  const exportProject = useCallback(async (projectId: string) => {
    try {
      DEBUG.logPerformance('exportProject.start', performance.now());
      const result = await UtilityAPI.exportProjectData(projectId);
      DEBUG.logPerformance('exportProject.end', performance.now(), { projectId, size: result?.length });
      
      if (result && FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Export Complete',
          body: 'Project data has been exported successfully',
        });
      }
      
      return result;
    } catch (err) {
      console.error('Failed to export project:', err);
      
      if (FEATURES.NOTIFICATIONS) {
        await webNotificationManager.showNotification({
          title: 'Export Failed',
          body: 'Failed to export project data',
        });
      }
      
      return null;
    }
  }, []);

  useEffect(() => {
    getAppVersion();
  }, [getAppVersion]);

  return {
    appVersion,
    environment,
    showInFolder,
    exportProject,
    // Environment information
    isOnline: isTauriEnvironment(),
    hasSystemIntegration: FEATURES.SYSTEM_INTEGRATION,
    hasNativeExport: FEATURES.NATIVE_EXPORT,
  };
};