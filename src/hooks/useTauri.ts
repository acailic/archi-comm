import { useState, useEffect, useCallback, useRef } from 'react';
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
 
// Helper to always log durations safely from finally blocks
const logDuration = (
  action: string,
  startTime: number,
  meta?: Record<string, unknown>
) => {
  try {
    const duration = performance.now() - startTime;
    DEBUG.logPerformance(action, duration, meta || {});
  } catch {
    // Silently ignore logging issues
  }
};
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
    const startTime = performance.now();
    try {
      setLoading(true);
      setError(null);
      const projectList = await ProjectAPI.getProjects();
      setProjects(Array.isArray(projectList) ? projectList : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch projects';
      setError(errorMessage);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Project Load Error',
            body: errorMessage,
          })
          .catch(() => {});
      }
    } finally {
      setLoading(false);
      // Safe duration logging
      logDuration('fetchProjects', startTime, {
        count: Array.isArray(projects) ? projects.length : 0,
      });
    }
  }, []);

  const createProject = useCallback(async (name: string, description: string) => {
    const startTime = performance.now();
    try {
      setError(null);
      const newProject = await ProjectAPI.createProject(name, description);
      setProjects(prev => [newProject, ...prev]); // Add to beginning for recency
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Project Created',
            body: `Successfully created project: ${name}`,
          })
          .catch(() => {});
      }
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project';
      setError(errorMessage);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Project Creation Failed',
            body: errorMessage,
          })
          .catch(() => {});
      }
      return null;
    } finally {
      logDuration('createProject', startTime, {});
    }
  }, []);

  const updateProject = useCallback(async (
    projectId: string, 
    updates: { name?: string; description?: string; status?: ProjectStatus }
  ) => {
    const startTime = performance.now();
    try {
      setError(null);
      const updatedProject = await ProjectAPI.updateProject(projectId, updates);
      if (updatedProject) {
        setProjects(prev => 
          prev.map(p => (p?.id === projectId ? updatedProject : p))
        );
        if (FEATURES.NOTIFICATIONS && updates.status) {
          webNotificationManager
            .showNotification({
              title: 'Project Updated',
              body: `Project status changed to: ${updates.status}`,
            })
            .catch(() => {});
        }
      }
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMessage);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Project Update Failed',
            body: errorMessage,
          })
          .catch(() => {});
      }
      return null;
    } finally {
      logDuration('updateProject', startTime, { projectId, updates });
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    const startTime = performance.now();
    try {
      setError(null);
      
      // Find project name for notification
      const project = (projects || []).find(p => p?.id === projectId);
      const projectName = project?.name || 'Unknown Project';
      const success = await ProjectAPI.deleteProject(projectId);
      
      if (success) {
        setProjects(prev => prev.filter(p => p?.id !== projectId));
        if (FEATURES.NOTIFICATIONS) {
          webNotificationManager
            .showNotification({
              title: 'Project Deleted',
              body: `Successfully deleted project: ${projectName}`,
            })
            .catch(() => {});
        }
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Project Deletion Failed',
            body: errorMessage,
          })
          .catch(() => {});
      }
      return false;
    } finally {
      logDuration('deleteProject', startTime, { projectId });
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
    const startTime = performance.now();
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const projectData = await ProjectAPI.getProject(projectId);
      setProject(projectData);
      
      if (!projectData && FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Project Not Found',
            body: `Project with ID ${projectId} was not found`,
          })
          .catch(() => {});
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch project';
      setError(errorMessage);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Project Load Error',
            body: errorMessage,
          })
          .catch(() => {});
      }
    } finally {
      setLoading(false);
      logDuration('fetchProject', startTime, { projectId, found: !!project });
    }
  }, [projectId]);

  const addComponent = useCallback(async (
    name: string,
    componentType: ComponentType,
    description: string
  ) => {
    const startTime = performance.now();
    if (!projectId) return null;

    try {
      setError(null);
      const newComponent = await ComponentAPI.addComponent(projectId, name, componentType, description);
      if (newComponent && project) {
        setProject({
          ...project,
          components: [...(project.components || []), newComponent],
          updated_at: new Date().toISOString(),
        });
        if (FEATURES.NOTIFICATIONS) {
          webNotificationManager
            .showNotification({
              title: 'Component Added',
              body: `Added ${componentType} component: ${name}`,
            })
            .catch(() => {});
        }
      }
      return newComponent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add component';
      setError(errorMessage);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Component Addition Failed',
            body: errorMessage,
          })
          .catch(() => {});
      }
      return null;
    } finally {
      logDuration('addComponent', startTime, { componentType, projectId });
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
    const startTime = performance.now();
    if (!projectId) return null;

    try {
      setError(null);
      const updatedComponent = await ComponentAPI.updateComponent(projectId, componentId, updates);
      if (updatedComponent && project) {
        setProject({
          ...project,
          components: (project.components || []).map(c => 
            (c?.id === componentId) ? updatedComponent : c
          ),
          updated_at: new Date().toISOString(),
        });
        if (FEATURES.NOTIFICATIONS && updates.status) {
          webNotificationManager
            .showNotification({
              title: 'Component Updated',
              body: `${updatedComponent.name} status: ${updates.status}`,
            })
            .catch(() => {});
        }
      }
      return updatedComponent;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update component';
      setError(errorMessage);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Component Update Failed',
            body: errorMessage,
          })
          .catch(() => {});
      }
      return null;
    } finally {
      logDuration('updateComponent', startTime, { componentId, projectId });
    }
  }, [projectId, project]);

  const removeComponent = useCallback(async (componentId: string) => {
    const startTime = performance.now();
    if (!projectId) return false;

    try {
      setError(null);
      
      // Find component name for notification
      const component = (project?.components || []).find(c => c?.id === componentId);
      const componentName = component?.name || 'Unknown Component';
      
      const success = await ComponentAPI.removeComponent(projectId, componentId);
      
      if (success && project) {
        setProject({
          ...project,
          components: (project.components || []).filter(c => c?.id !== componentId),
          updated_at: new Date().toISOString(),
        });
        if (FEATURES.NOTIFICATIONS) {
          webNotificationManager
            .showNotification({
              title: 'Component Removed',
              body: `Removed component: ${componentName}`,
            })
            .catch(() => {});
        }
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove component';
      setError(errorMessage);
      
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Component Removal Failed',
            body: errorMessage,
          })
          .catch(() => {});
      }
      
      return false;
    } finally {
      logDuration('removeComponent', startTime, { componentId, projectId });
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
  const autoSaveTimerRef = useRef<number | null>(null);

  const loadDiagram = useCallback(async () => {
    const startTime = performance.now();
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
          setElements(Array.isArray(autoSavedData.elements) ? autoSavedData.elements : []);
          setConnections(Array.isArray(autoSavedData.connections) ? autoSavedData.connections : []);
          setIsDirty(false);
          setLoading(false);
          DEBUG.logPerformance('loadDiagram.web.autosave', 0, { success: true });
          return;
        }
      }

      const [diagramElements, diagramConnections] = await Promise.all([
        DiagramAPI.loadDiagram(projectId),
        DiagramAPI.loadConnections(projectId),
      ]);
      
      setElements(Array.isArray(diagramElements) ? diagramElements : []);
      setConnections(Array.isArray(diagramConnections) ? diagramConnections : []);
      setIsDirty(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load diagram';
      setError(errorMessage);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Diagram Load Error',
            body: errorMessage,
          })
          .catch(() => {});
      }
    } finally {
      setLoading(false);
      logDuration('loadDiagram', startTime, {
        elementsCount: Array.isArray(elements) ? elements.length : 0,
        connectionsCount: Array.isArray(connections) ? connections.length : 0,
      });
    }
  }, [projectId]);

  const saveDiagram = useCallback(async (
    newElements: DiagramElement[],
    newConnections: Connection[]
  ) => {
    const startTime = performance.now();
    if (!projectId) return false;

    try {
      setError(null);
      await Promise.all([
        DiagramAPI.saveDiagram(projectId, newElements),
        DiagramAPI.saveConnections(projectId, newConnections),
      ]);
      setElements(newElements);
      setConnections(newConnections);
      setIsDirty(false);
      // Stop web autosave after explicit save
      if (isWebEnvironment()) {
        webAutoSave.stop();
      }
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Diagram Saved',
            body: 'Your diagram has been saved successfully',
          })
          .catch(() => {});
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save diagram';
      setError(errorMessage);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Diagram Save Failed',
            body: errorMessage,
          })
          .catch(() => {});
      }
      return false;
    } finally {
      logDuration('saveDiagram', startTime, {
        elementsCount: Array.isArray(newElements) ? newElements.length : 0,
        connectionsCount: Array.isArray(newConnections) ? newConnections.length : 0,
      });
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
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    const timer = window.setTimeout(() => {
      saveDiagram(elementsToSave, connectionsToSave);
    }, CONFIG.AUTO_SAVE_INTERVAL);
    
    autoSaveTimerRef.current = timer;
  }, [projectId, saveDiagram]);
  
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
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [loadDiagram]);

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
      setAppVersion(version);
      setEnvironment(isTauriEnvironment() ? 'Tauri Desktop' : 'Web Browser');
    } catch (err) {
      console.error('Failed to get app version:', err);
      setAppVersion('Unknown');
      setEnvironment(isTauriEnvironment() ? 'Tauri Desktop (Error)' : 'Web Browser');
    } finally {
      logDuration('getAppVersion', startTime, {});
    }
  }, []);

  const showInFolder = useCallback(async (path: string) => {
    const startTime = performance.now();
    try {
      await UtilityAPI.showInFolder(path);
    } catch (err) {
      console.error('Failed to show in folder:', err);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Show in Folder',
            body: `Cannot open folder: ${path}`,
          })
          .catch(() => {});
      }
    } finally {
      logDuration('showInFolder', startTime, { path });
    }
  }, []);

  const exportProject = useCallback(async (projectId: string) => {
    const startTime = performance.now();
    try {
      const result = await UtilityAPI.exportProjectData(projectId);
      if (result && FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Export Complete',
            body: 'Project data has been exported successfully',
          })
          .catch(() => {});
      }
      
      return result;
    } catch (err) {
      console.error('Failed to export project:', err);
      if (FEATURES.NOTIFICATIONS) {
        webNotificationManager
          .showNotification({
            title: 'Export Failed',
            body: 'Failed to export project data',
          })
          .catch(() => {});
      }
      return null;
    } finally {
      logDuration('exportProject', startTime, { projectId });
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
