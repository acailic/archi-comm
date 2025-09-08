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
import { isTauriEnvironment, isWebEnvironment, DEBUG, FEATURES, CONFIG } from '../lib/environment';
import { webNotificationManager, initializeWebFallbacks, webAutoSave } from '../services/web-fallback';

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
      
      const startTime = performance.now();
      const projectList = await ProjectAPI.getProjects();
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('fetchProjects', duration, { count: projectList.length });
      
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
      
      const startTime = performance.now();
      const newProject = await ProjectAPI.createProject(name, description);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('createProject', duration, { projectId: newProject.id });
      
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
      
      const startTime = performance.now();
      const updatedProject = await ProjectAPI.updateProject(projectId, updates);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('updateProject', duration, { projectId, updates });
      
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
      
      const startTime = performance.now();
      const success = await ProjectAPI.deleteProject(projectId);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('deleteProject', duration, { projectId, success });
      
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
      
      const startTime = performance.now();
      const projectData = await ProjectAPI.getProject(projectId);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('fetchProject', duration, { projectId, found: !!projectData });
      
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
      
      const startTime = performance.now();
      const newComponent = await ComponentAPI.addComponent(projectId, name, componentType, description);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('addComponent', duration, { componentId: newComponent?.id });
      
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
      
      const startTime = performance.now();
      const updatedComponent = await ComponentAPI.updateComponent(projectId, componentId, updates);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('updateComponent', duration, { componentId, updates });
      
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
      
      const startTime = performance.now();
      const success = await ComponentAPI.removeComponent(projectId, componentId);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('removeComponent', duration, { componentId, success });
      
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
      
      if (isWebEnvironment()) {
        const autoSavedData = webAutoSave.load();
        if (autoSavedData && autoSavedData.projectId === projectId) {
          setElements(autoSavedData.elements || []);
          setConnections(autoSavedData.connections || []);
          setIsDirty(false);
          setLoading(false);
          DEBUG.logPerformance('loadDiagram.web.autosave', 0, { success: true });
          return;
        }
      }

      const startTime = performance.now();
      const [diagramElements, diagramConnections] = await Promise.all([
        DiagramAPI.loadDiagram(projectId),
        DiagramAPI.loadConnections(projectId),
      ]);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('loadDiagram', duration, { 
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
      
      const startTime = performance.now();
      await Promise.all([
        DiagramAPI.saveDiagram(projectId, newElements),
        DiagramAPI.saveConnections(projectId, newConnections),
      ]);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('saveDiagram', duration, { 
        elementsCount: newElements.length, 
        connectionsCount: newConnections.length 
      });
      
      setElements(newElements);
      setConnections(newConnections);
      setIsDirty(false);
      // Stop web autosave after explicit save
      if (isWebEnvironment()) {
        webAutoSave.stop();
      }
      
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
  const scheduleAutoSave = useCallback((elementsToSave: DiagramElement[], connectionsToSave: Connection[]) => {
    if (!FEATURES.AUTO_SAVE || !projectId) return;
    
    setIsDirty(true);

    if (isWebEnvironment()) {
      webAutoSave.start(() => ({ projectId, elements: elementsToSave, connections: connectionsToSave }), CONFIG.AUTO_SAVE_INTERVAL);
      return;
    }
    
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    const timer = window.setTimeout(() => {
      saveDiagram(elementsToSave, connectionsToSave);
    }, CONFIG.AUTO_SAVE_INTERVAL);
    
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
      if (isWebEnvironment()) {
        webAutoSave.stop();
      }
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
    clearAutoSave: () => {
      if (isWebEnvironment()) {
        webAutoSave.clear();
      }
    },
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
    const startTime = performance.now();
    try {
      const version = await UtilityAPI.getAppVersion();
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('getAppVersion', duration, { version });
      
      setAppVersion(version);
      setEnvironment(isTauriEnvironment() ? 'Tauri Desktop' : 'Web Browser');
    } catch (err) {
      console.error('Failed to get app version:', err);
      setAppVersion('Unknown');
      setEnvironment(isTauriEnvironment() ? 'Tauri Desktop (Error)' : 'Web Browser');
    }
  }, []);

  const showInFolder = useCallback(async (path: string) => {
    const startTime = performance.now();
    try {
      await UtilityAPI.showInFolder(path);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('showInFolder', duration, { path });
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
    const startTime = performance.now();
    try {
      const result = await UtilityAPI.exportProjectData(projectId);
      const duration = performance.now() - startTime;
      DEBUG.logPerformance('exportProject', duration, { projectId, size: result?.length });
      
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
