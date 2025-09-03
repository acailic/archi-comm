import React, { useState, useEffect } from 'react';
import { useProjects, useUtilities } from '../hooks/useTauri';
import { ProjectStatus, ComponentType } from '../services/tauri';

export const TauriIntegrationExample: React.FC = () => {
  const { projects, loading, error, createProject } = useProjects();
  const { appVersion } = useUtilities();
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  const handleCreateProject = async () => {
    if (newProjectName.trim()) {
      await createProject(newProjectName, newProjectDescription);
      setNewProjectName('');
      setNewProjectDescription('');
    }
  };

  if (loading) {
    return <div className="p-4">Loading projects...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Tauri Integration Demo</h2>
        <p className="text-gray-600">App Version: {appVersion}</p>
      </div>

      {/* Create Project Form */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="Project description"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCreateProject}
            disabled={!newProjectName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Create Project
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Projects ({projects.length})</h3>
        {projects.length === 0 ? (
          <p className="text-gray-500 italic">No projects yet. Create your first project above!</p>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div key={project.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-medium">{project.name}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${ 
                    project.status === ProjectStatus.Complete ? 'bg-green-100 text-green-800' :
                    project.status === ProjectStatus.InProgress ? 'bg-blue-100 text-blue-800' :
                    project.status === ProjectStatus.Review ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{project.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Components: {project.components.length}</span>
                  <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                </div>
                
                {/* Components List */}
                {project.components.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <h5 className="text-sm font-medium mb-2">Components:</h5>
                    <div className="flex flex-wrap gap-2">
                      {project.components.map((component) => (
                        <span
                          key={component.id}
                          className={`px-2 py-1 rounded text-xs ${ 
                            component.component_type === ComponentType.Frontend ? 'bg-purple-100 text-purple-800' :
                            component.component_type === ComponentType.Backend ? 'bg-green-100 text-green-800' :
                            component.component_type === ComponentType.Database ? 'bg-orange-100 text-orange-800' :
                            component.component_type === ComponentType.Api ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {component.name} ({component.component_type})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Actions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Debug Actions</h3>
        <p className="text-sm text-gray-600 mb-4">
          These actions are available in development mode to test the Tauri backend integration.
        </p>
        <button
          onClick={async () => {
            if (window.__TAURI__) {
              try {
                const { invoke } = await import('@tauri-apps/api/tauri');
                await invoke('populate_sample_data');
                // Trigger a refresh by reloading the page or refetching projects
                window.location.reload();
              } catch (err) {
                console.error('Failed to populate sample data:', err);
              }
            } else {
              alert('This feature is only available in the Tauri desktop app');
            }
          }}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
        >
          Populate Sample Data
        </button>
      </div>
    </div>
  );
};