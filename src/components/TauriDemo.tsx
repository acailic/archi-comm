import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { useIsTauri, useWindow, useNotification, useFile, useProject } from '../lib/hooks/useTauri';
import { Badge } from './ui/badge';
import { Folder, File, Save, Download, Bell } from 'lucide-react';

export const TauriDemo = () => {
  const isTauriApp = useIsTauri();
  const { setTitle } = useWindow();
  const { sendNotification } = useNotification();
  const { selectFile, selectDirectory, readFile, writeFile } = useFile();
  const { createProject, saveProject } = useProject();
  
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedDirectory, setSelectedDirectory] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');

  const handleSelectFile = async () => {
    try {
      const file = await selectFile();
      if (file) {
        setSelectedFile(file);
        const content = await readFile(file);
        setFileContent(content);
        await sendNotification('File Selected', `Successfully loaded: ${file}`);
      }
    } catch (error) {
      console.error('Failed to select file:', error);
      await sendNotification('Error', 'Failed to select file');
    }
  };

  const handleSelectDirectory = async () => {
    try {
      const directory = await selectDirectory();
      if (directory) {
        setSelectedDirectory(directory);
        await sendNotification('Directory Selected', `Selected: ${directory}`);
      }
    } catch (error) {
      console.error('Failed to select directory:', error);
    }
  };

  const handleSaveFile = async () => {
    if (!selectedFile) {
      await sendNotification('Error', 'No file selected');
      return;
    }

    try {
      await writeFile(selectedFile, fileContent);
      await sendNotification('Success', 'File saved successfully');
    } catch (error) {
      console.error('Failed to save file:', error);
      await sendNotification('Error', 'Failed to save file');
    }
  };

  const handleCreateProject = async () => {
    if (!projectName || !selectedDirectory) {
      await sendNotification('Error', 'Please enter project name and select directory');
      return;
    }

    try {
      await createProject(projectName, selectedDirectory);
      await sendNotification('Success', `Project "${projectName}" created successfully`);
      setProjectName('');
    } catch (error) {
      console.error('Failed to create project:', error);
      await sendNotification('Error', 'Failed to create project');
    }
  };

  const handleSetTitle = () => {
    setTitle(`ArchiComm - ${new Date().toLocaleTimeString()}`);
  };

  if (!isTauriApp) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tauri Integration Demo</CardTitle>
          <CardDescription>
            This component demonstrates Tauri features, but you're running in a web browser.
            <Badge variant="secondary" className="ml-2">Web Mode</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            To see Tauri features in action, run this app as a desktop application using <code>npm run tauri:dev</code>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Tauri Integration Demo</CardTitle>
          <CardDescription>
            This component demonstrates various Tauri features integrated with React.
            <Badge variant="default" className="ml-2">Desktop Mode</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Window Controls */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Window Controls</h3>
            <Button onClick={handleSetTitle} variant="outline">
              Update Window Title
            </Button>
          </div>

          {/* File Operations */}
          <div>
            <h3 className="text-lg font-semibold mb-2">File Operations</h3>
            <div className="flex gap-2 mb-2">
              <Button onClick={handleSelectFile} variant="outline">
                <File className="w-4 h-4 mr-2" />
                Select File
              </Button>
              <Button onClick={handleSelectDirectory} variant="outline">
                <Folder className="w-4 h-4 mr-2" />
                Select Directory
              </Button>
            </div>

            {selectedFile && (
              <div className="mb-2">
                <p className="text-sm text-muted-foreground mb-1">Selected file:</p>
                <code className="text-xs bg-muted p-1 rounded">{selectedFile}</code>
              </div>
            )}

            {selectedDirectory && (
              <div className="mb-2">
                <p className="text-sm text-muted-foreground mb-1">Selected directory:</p>
                <code className="text-xs bg-muted p-1 rounded">{selectedDirectory}</code>
              </div>
            )}

            {selectedFile && (
              <div className="mb-2">
                <textarea
                  className="w-full h-32 p-2 border rounded text-sm"
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  placeholder="File content will appear here..."
                />
                <Button onClick={handleSaveFile} className="mt-2">
                  <Save className="w-4 h-4 mr-2" />
                  Save File
                </Button>
              </div>
            )}
          </div>

          {/* Project Management */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Project Management</h3>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCreateProject}>
                <Download className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>

          {/* Notifications */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Notifications</h3>
            <Button
              onClick={() => sendNotification('Test Notification', 'This is a test notification from ArchiComm!')}
              variant="outline"
            >
              <Bell className="w-4 h-4 mr-2" />
              Send Test Notification
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};