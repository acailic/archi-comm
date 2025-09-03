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

// Hook for project management
export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const projectList = await ProjectAPI.getProjects();
      setProjects(projectList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name: string, description: string) => {
    try {
      const newProject = await ProjectAPI.createProject(name, description);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      return null;
    }
  }, []);

  const updateProject = useCallback(async (
    projectId: string, 
    updates: { name?: string; description?: string; status?: ProjectStatus }
  ) => {
    try {
      const updatedProject = await ProjectAPI.updateProject(projectId, updates);
      if (updatedProject) {
        setProjects(prev => 
          prev.map(p => p.id === projectId ? updatedProject : p)
        );
      }
      return updatedProject;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      return null;
    }
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    try {
      const success = await ProjectAPI.deleteProject(projectId);
      if (success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      return false;
    }
  }, []);

  useEffect(() => {
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
  };
};

// Hook for individual project management
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
      const projectData = await ProjectAPI.getProject(projectId);
      setProject(projectData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
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
      const newComponent = await ComponentAPI.addComponent(projectId, name, componentType, description);
      if (newComponent && project) {
        setProject({
          ...project,
          components: [...project.components, newComponent],
        });
      }
      return newComponent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add component');
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
      const updatedComponent = await ComponentAPI.updateComponent(projectId, componentId, updates);
      if (updatedComponent && project) {
        setProject({
          ...project,
          components: project.components.map(c => 
            c.id === componentId ? updatedComponent : c
          ),
        });
      }
      return updatedComponent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update component');
      return null;
    }
  }, [projectId, project]);

  const removeComponent = useCallback(async (componentId: string) => {
    if (!projectId) return false;

    try {
      const success = await ComponentAPI.removeComponent(projectId, componentId);
      if (success && project) {
        setProject({
          ...project,
          components: project.components.filter(c => c.id !== componentId),
        });
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove component');
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
  };
};

// Hook for diagram management
export const useDiagram = (projectId: string | null) => {
  const [elements, setElements] = useState<DiagramElement[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDiagram = useCallback(async () => {
    if (!projectId) {
      setElements([]);
      setConnections([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [diagramElements, diagramConnections] = await Promise.all([
        DiagramAPI.loadDiagram(projectId),
        DiagramAPI.loadConnections(projectId),
      ]);
      setElements(diagramElements);
      setConnections(diagramConnections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diagram');
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
      await Promise.all([
        DiagramAPI.saveDiagram(projectId, newElements),
        DiagramAPI.saveConnections(projectId, newConnections),
      ]);
      setElements(newElements);
      setConnections(newConnections);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save diagram');
      return false;
    }
  }, [projectId]);

  useEffect(() => {
    loadDiagram();
  }, [loadDiagram]);

  return {
    elements,
    connections,
    loading,
    error,
    saveDiagram,
    loadDiagram,
  };
};

// Hook for utility functions
export const useUtilities = () => {
  const [appVersion, setAppVersion] = useState<string>('');

  const getAppVersion = useCallback(async () => {
    try {
      const version = await UtilityAPI.getAppVersion();
      setAppVersion(version);
    } catch (err) {
      console.error('Failed to get app version:', err);
    }
  }, []);

  const showInFolder = useCallback(async (path: string) => {
    try {
      await UtilityAPI.showInFolder(path);
    } catch (err) {
      console.error('Failed to show in folder:', err);
    }
  }, []);

  const exportProject = useCallback(async (projectId: string) => {
    try {
      return await UtilityAPI.exportProjectData(projectId);
    } catch (err) {
      console.error('Failed to export project:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    getAppVersion();
  }, [getAppVersion]);

  return {
    appVersion,
    showInFolder,
    exportProject,
  };
};