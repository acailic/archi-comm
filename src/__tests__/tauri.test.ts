import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the tauri API modules
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn()
}));

vi.mock('@tauri-apps/api/window', () => ({
  appWindow: {
    minimize: vi.fn(),
    toggleMaximize: vi.fn(),
    close: vi.fn(),
    setTitle: vi.fn(),
    setResizable: vi.fn()
  }
}));

vi.mock('@tauri-apps/api/notification', () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn()
}));

describe('tauri.ts utility functions', () => {
  let mockWindow: any;

  beforeEach(() => {
    // Mock Tauri environment
    mockWindow = {
      __TAURI__: {}
    };
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isTauri', () => {
    it('returns true when in Tauri environment', async () => {
      const { isTauri } = await import('../lib/tauri');
      expect(isTauri()).toBe(true);
    });

    it('returns false when not in Tauri environment', async () => {
      mockWindow.__TAURI__ = undefined;
      const { isTauri } = await import('../lib/tauri');
      expect(isTauri()).toBe(false);
    });
  });

  describe('windowUtils', () => {
    it('minimize calls appWindow.minimize in Tauri environment', async () => {
      const { appWindow } = await import('@tauri-apps/api/window');
      const { windowUtils } = await import('../lib/tauri');
      
      windowUtils.minimize();
      expect(appWindow.minimize).toHaveBeenCalled();
    });

    it('maximize calls appWindow.toggleMaximize in Tauri environment', async () => {
      const { appWindow } = await import('@tauri-apps/api/window');
      const { windowUtils } = await import('../lib/tauri');
      
      windowUtils.maximize();
      expect(appWindow.toggleMaximize).toHaveBeenCalled();
    });

    it('close calls appWindow.close in Tauri environment', async () => {
      const { appWindow } = await import('@tauri-apps/api/window');
      const { windowUtils } = await import('../lib/tauri');
      
      windowUtils.close();
      expect(appWindow.close).toHaveBeenCalled();
    });

    it('setTitle calls appWindow.setTitle with correct argument', async () => {
      const { appWindow } = await import('@tauri-apps/api/window');
      const { windowUtils } = await import('../lib/tauri');
      
      windowUtils.setTitle('Test Title');
      expect(appWindow.setTitle).toHaveBeenCalledWith('Test Title');
    });

    it('setResizable calls appWindow.setResizable with correct argument', async () => {
      const { appWindow } = await import('@tauri-apps/api/window');
      const { windowUtils } = await import('../lib/tauri');
      
      windowUtils.setResizable(false);
      expect(appWindow.setResizable).toHaveBeenCalledWith(false);
    });
  });

  describe('notificationUtils', () => {
    it('sends notification when permission is granted', async () => {
      const { isPermissionGranted, sendNotification } = await import('@tauri-apps/api/notification');
      vi.mocked(isPermissionGranted).mockResolvedValue(true);
      
      const { notificationUtils } = await import('../lib/tauri');
      await notificationUtils.send('Test Title', 'Test Body');
      
      expect(sendNotification).toHaveBeenCalledWith({ 
        title: 'Test Title', 
        body: 'Test Body' 
      });
    });

    it('requests permission when not granted initially', async () => {
      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/api/notification');
      vi.mocked(isPermissionGranted).mockResolvedValue(false);
      vi.mocked(requestPermission).mockResolvedValue('granted');
      
      const { notificationUtils } = await import('../lib/tauri');
      await notificationUtils.send('Test Title', 'Test Body');
      
      expect(requestPermission).toHaveBeenCalled();
      expect(sendNotification).toHaveBeenCalledWith({ 
        title: 'Test Title', 
        body: 'Test Body' 
      });
    });

    it('does not send notification when permission is denied', async () => {
      const { isPermissionGranted, requestPermission, sendNotification } = await import('@tauri-apps/api/notification');
      vi.mocked(isPermissionGranted).mockResolvedValue(false);
      vi.mocked(requestPermission).mockResolvedValue('denied');
      
      const { notificationUtils } = await import('../lib/tauri');
      await notificationUtils.send('Test Title', 'Test Body');
      
      expect(requestPermission).toHaveBeenCalled();
      expect(sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('ipcUtils', () => {
    it('invoke calls tauri invoke with correct arguments', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue({ data: 'test' });
      
      const { ipcUtils } = await import('../lib/tauri');
      const result = await ipcUtils.invoke('test_command', { arg: 'value' });
      
      expect(invoke).toHaveBeenCalledWith('test_command', { arg: 'value' });
      expect(result).toEqual({ data: 'test' });
    });

    it('listen sets up event listener correctly', async () => {
      const mockUnlisten = vi.fn().mockResolvedValue(undefined);
      const { listen } = await import('@tauri-apps/api/event');
      vi.mocked(listen).mockResolvedValue(mockUnlisten);
      
      const callback = vi.fn();
      const { ipcUtils } = await import('../lib/tauri');
      const unlisten = await ipcUtils.listen('test_event', callback);
      
      expect(listen).toHaveBeenCalled();
      expect(unlisten).toBe(mockUnlisten);
      
      // Test that callback is called with payload
      const eventCall = vi.mocked(listen).mock.calls[0][1];
      eventCall({ payload: 'test payload' });
      expect(callback).toHaveBeenCalledWith('test payload');
    });
  });

  describe('fileUtils', () => {
    it('readFile invokes correct command with path', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue('file content');
      
      const { fileUtils } = await import('../lib/tauri');
      const result = await fileUtils.readFile('/test/path');
      
      expect(invoke).toHaveBeenCalledWith('read_file', { path: '/test/path' });
      expect(result).toBe('file content');
    });

    it('writeFile invokes correct command with path and content', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue(undefined);
      
      const { fileUtils } = await import('../lib/tauri');
      await fileUtils.writeFile('/test/path', 'content');
      
      expect(invoke).toHaveBeenCalledWith('write_file', { path: '/test/path', content: 'content' });
    });

    it('selectFile invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue('/selected/file.txt');
      
      const { fileUtils } = await import('../lib/tauri');
      const result = await fileUtils.selectFile();
      
      expect(invoke).toHaveBeenCalledWith('select_file');
      expect(result).toBe('/selected/file.txt');
    });

    it('selectDirectory invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue('/selected/directory');
      
      const { fileUtils } = await import('../lib/tauri');
      const result = await fileUtils.selectDirectory();
      
      expect(invoke).toHaveBeenCalledWith('select_directory');
      expect(result).toBe('/selected/directory');
    });
  });

  describe('projectUtils', () => {
    it('createProject invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockProject = { id: '1', name: 'Test', description: 'Test project' };
      vi.mocked(invoke).mockResolvedValue(mockProject);
      
      const { projectUtils } = await import('../lib/tauri');
      const result = await projectUtils.createProject('Test', 'Test project');
      
      expect(invoke).toHaveBeenCalledWith('create_project', { name: 'Test', description: 'Test project' });
      expect(result).toEqual(mockProject);
    });

    it('getProjects invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockProjects = [{ id: '1', name: 'Test' }];
      vi.mocked(invoke).mockResolvedValue(mockProjects);
      
      const { projectUtils } = await import('../lib/tauri');
      const result = await projectUtils.getProjects();
      
      expect(invoke).toHaveBeenCalledWith('get_projects');
      expect(result).toEqual(mockProjects);
    });

    it('getProject invokes correct command with project ID', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockProject = { id: '1', name: 'Test' };
      vi.mocked(invoke).mockResolvedValue(mockProject);
      
      const { projectUtils } = await import('../lib/tauri');
      const result = await projectUtils.getProject('1');
      
      expect(invoke).toHaveBeenCalledWith('get_project', { project_id: '1' });
      expect(result).toEqual(mockProject);
    });

    it('updateProject invokes correct command with optional parameters', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockProject = { id: '1', name: 'Updated', description: 'Updated project' };
      vi.mocked(invoke).mockResolvedValue(mockProject);
      
      const { projectUtils } = await import('../lib/tauri');
      const result = await projectUtils.updateProject('1', 'Updated', 'Updated project', 'InProgress');
      
      expect(invoke).toHaveBeenCalledWith('update_project', { 
        project_id: '1', 
        name: 'Updated', 
        description: 'Updated project', 
        status: 'InProgress' 
      });
      expect(result).toEqual(mockProject);
    });

    it('deleteProject invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue(true);
      
      const { projectUtils } = await import('../lib/tauri');
      const result = await projectUtils.deleteProject('1');
      
      expect(invoke).toHaveBeenCalledWith('delete_project', { project_id: '1' });
      expect(result).toBe(true);
    });

    it('exportProjectData invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue('exported data');
      
      const { projectUtils } = await import('../lib/tauri');
      const result = await projectUtils.exportProjectData('1');
      
      expect(invoke).toHaveBeenCalledWith('export_project_data', { project_id: '1' });
      expect(result).toBe('exported data');
    });
  });

  describe('componentUtils', () => {
    it('addComponent invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockComponent = { id: '1', name: 'Test Component' };
      vi.mocked(invoke).mockResolvedValue(mockComponent);
      
      const { componentUtils } = await import('../lib/tauri');
      const result = await componentUtils.addComponent('proj1', 'Test Component', 'Frontend', 'Test description');
      
      expect(invoke).toHaveBeenCalledWith('add_component', { 
        project_id: 'proj1', 
        name: 'Test Component', 
        component_type: 'Frontend', 
        description: 'Test description' 
      });
      expect(result).toEqual(mockComponent);
    });

    it('updateComponent invokes correct command with optional parameters', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockComponent = { id: '1', name: 'Updated Component' };
      vi.mocked(invoke).mockResolvedValue(mockComponent);
      
      const { componentUtils } = await import('../lib/tauri');
      const result = await componentUtils.updateComponent('proj1', 'comp1', 'Updated Component', 'Updated description', 'Done', ['dep1']);
      
      expect(invoke).toHaveBeenCalledWith('update_component', { 
        project_id: 'proj1', 
        component_id: 'comp1', 
        name: 'Updated Component', 
        description: 'Updated description', 
        status: 'Done', 
        dependencies: ['dep1'] 
      });
      expect(result).toEqual(mockComponent);
    });

    it('removeComponent invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue(true);
      
      const { componentUtils } = await import('../lib/tauri');
      const result = await componentUtils.removeComponent('proj1', 'comp1');
      
      expect(invoke).toHaveBeenCalledWith('remove_component', { project_id: 'proj1', component_id: 'comp1' });
      expect(result).toBe(true);
    });
  });

  describe('diagramUtils', () => {
    it('saveDiagram invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockElements = [{ id: '1', element_type: 'box', position: { x: 0, y: 0 }, properties: {} }];
      vi.mocked(invoke).mockResolvedValue(undefined);
      
      const { diagramUtils } = await import('../lib/tauri');
      await diagramUtils.saveDiagram('proj1', mockElements);
      
      expect(invoke).toHaveBeenCalledWith('save_diagram', { project_id: 'proj1', elements: mockElements });
    });

    it('loadDiagram invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockElements = [{ id: '1', element_type: 'box', position: { x: 0, y: 0 }, properties: {} }];
      vi.mocked(invoke).mockResolvedValue(mockElements);
      
      const { diagramUtils } = await import('../lib/tauri');
      const result = await diagramUtils.loadDiagram('proj1');
      
      expect(invoke).toHaveBeenCalledWith('load_diagram', { project_id: 'proj1' });
      expect(result).toEqual(mockElements);
    });

    it('saveConnections invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockConnections = [{ id: '1', source_id: 'a', target_id: 'b', connection_type: 'line', properties: {} }];
      vi.mocked(invoke).mockResolvedValue(undefined);
      
      const { diagramUtils } = await import('../lib/tauri');
      await diagramUtils.saveConnections('proj1', mockConnections);
      
      expect(invoke).toHaveBeenCalledWith('save_connections', { project_id: 'proj1', connections: mockConnections });
    });

    it('loadConnections invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockConnections = [{ id: '1', source_id: 'a', target_id: 'b', connection_type: 'line', properties: {} }];
      vi.mocked(invoke).mockResolvedValue(mockConnections);
      
      const { diagramUtils } = await import('../lib/tauri');
      const result = await diagramUtils.loadConnections('proj1');
      
      expect(invoke).toHaveBeenCalledWith('load_connections', { project_id: 'proj1' });
      expect(result).toEqual(mockConnections);
    });
  });

  describe('transcriptionUtils', () => {
    it('transcribeAudio invokes correct command with file path', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockResponse = { text: 'Hello world', segments: [{ text: 'Hello world', start: 0, end: 1 }] };
      vi.mocked(invoke).mockResolvedValue(mockResponse);
      
      const { transcriptionUtils } = await import('../lib/tauri');
      const result = await transcriptionUtils.transcribeAudio('/test/audio.wav');
      
      expect(invoke).toHaveBeenCalledWith('transcribe_audio', { file_path: '/test/audio.wav' });
      expect(result).toEqual(mockResponse);
    });

    it('transcribeAudio handles optional parameters', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockResponse = { text: 'Hello world', segments: [{ text: 'Hello world', start: 0, end: 1 }] };
      vi.mocked(invoke).mockResolvedValue(mockResponse);
      
      const { transcriptionUtils } = await import('../lib/tauri');
      await transcriptionUtils.transcribeAudio('/test/audio.wav', {
        timeout: 30000,
        jobId: 'job123',
        maxSegments: 5000
      });
      
      expect(invoke).toHaveBeenCalledWith('transcribe_audio', { 
        file_path: '/test/audio.wav',
        timeout: 30000,
        job_id: 'job123'
      });
    });

    it('transcribeAudio validates parameters', async () => {
      const { transcriptionUtils } = await import('../lib/tauri');
      
      await expect(transcriptionUtils.transcribeAudio('/test/audio.wav', { timeout: -1 }))
        .rejects.toThrow('timeout must be a positive number');
      
      await expect(transcriptionUtils.transcribeAudio('/test/audio.wav', { jobId: '' }))
        .rejects.toThrow('jobId must be a non-empty string');
      
      await expect(transcriptionUtils.transcribeAudio('/test/audio.wav', { maxSegments: -1 }))
        .rejects.toThrow('maxSegments must be a positive number');
    });

    it('transcribeAudio truncates segments when exceeding maxSegments', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockResponse = {
        text: 'Hello world test',
        segments: [
          { text: 'Hello', start: 0, end: 1 },
          { text: 'world', start: 1, end: 2 },
          { text: 'test', start: 2, end: 3 }
        ]
      };
      vi.mocked(invoke).mockResolvedValue(mockResponse);
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { transcriptionUtils } = await import('../lib/tauri');
      const result = await transcriptionUtils.transcribeAudio('/test/audio.wav', { maxSegments: 2 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Number of segments (3) exceeds the limit of 2. Truncating')
      );
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0]).toEqual({ text: 'Hello', start: 0, end: 1 });
      expect(result.segments[1]).toEqual({ text: 'world', start: 1, end: 2 });
      
      consoleSpy.mockRestore();
    });

    it('transcribeAudio rejects invalid response structure', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const invalidResponse = { invalid: 'response' };
      vi.mocked(invoke).mockResolvedValue(invalidResponse);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { transcriptionUtils } = await import('../lib/tauri');
      await expect(transcriptionUtils.transcribeAudio('/test/audio.wav'))
        .rejects.toThrow('Invalid transcription response structure');
      
      consoleErrorSpy.mockRestore();
    });

    it('transcribeAudio validates segment structure strictly', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockResponse = {
        text: 'Hello world',
        segments: [
          { text: 'Hello', start: 0, end: 1 },
          { text: 'world', start: 0.5, end: 1.5 } // Overlapping segment
        ]
      };
      vi.mocked(invoke).mockResolvedValue(mockResponse);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { transcriptionUtils } = await import('../lib/tauri');
      await expect(transcriptionUtils.transcribeAudio('/test/audio.wav'))
        .rejects.toThrow('Invalid transcription response structure');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('overlaps with previous segment')
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('cancelTranscription invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue(undefined);
      
      const { transcriptionUtils } = await import('../lib/tauri');
      const result = await transcriptionUtils.cancelTranscription('job123');
      
      expect(invoke).toHaveBeenCalledWith('cancel_transcription', { job_id: 'job123' });
      expect(result).toBe(true);
    });

    it('cancelTranscription handles errors gracefully', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockRejectedValue(new Error('Cancellation failed'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { transcriptionUtils } = await import('../lib/tauri');
      const result = await transcriptionUtils.cancelTranscription('job123');
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to cancel transcription:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('testTranscriptionPipeline returns success on valid response', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockResponse = { text: 'Test', segments: [{ text: 'Test', start: 0, end: 1 }] };
      vi.mocked(invoke).mockResolvedValue(mockResponse);
      
      const { transcriptionUtils } = await import('../lib/tauri');
      const result = await transcriptionUtils.testTranscriptionPipeline('/test/audio.wav');
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeUndefined();
    });

    it('testTranscriptionPipeline returns error on failure', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockRejectedValue(new Error('Test error'));
      
      const { transcriptionUtils } = await import('../lib/tauri');
      const result = await transcriptionUtils.testTranscriptionPipeline('/test/audio.wav');
      
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe('Test error');
    });
  });

  describe('utilUtils', () => {
    it('getAppVersion invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue('1.0.0');
      
      const { utilUtils } = await import('../lib/tauri');
      const result = await utilUtils.getAppVersion();
      
      expect(invoke).toHaveBeenCalledWith('get_app_version');
      expect(result).toBe('1.0.0');
    });

    it('showInFolder invokes correct command', async () => {
      const { invoke } = await import('@tauri-apps/api/tauri');
      vi.mocked(invoke).mockResolvedValue(undefined);
      
      const { utilUtils } = await import('../lib/tauri');
      await utilUtils.showInFolder('/test/path');
      
      expect(invoke).toHaveBeenCalledWith('show_in_folder', { path: '/test/path' });
    });

    it('populateSampleData works in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const { invoke } = await import('@tauri-apps/api/tauri');
      const mockProjects = [{ id: '1', name: 'Sample' }];
      vi.mocked(invoke).mockResolvedValue(mockProjects);
      
      const { utilUtils } = await import('../lib/tauri');
      const result = await utilUtils.populateSampleData();
      
      expect(invoke).toHaveBeenCalledWith('populate_sample_data');
      expect(result).toEqual(mockProjects);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('populateSampleData returns empty array in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const { invoke } = await import('@tauri-apps/api/tauri');
      
      const { utilUtils } = await import('../lib/tauri');
      const result = await utilUtils.populateSampleData();
      
      expect(invoke).not.toHaveBeenCalled();
      expect(result).toEqual([]);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Non-Tauri environment fallbacks', () => {
    beforeEach(() => {
      mockWindow.__TAURI__ = undefined;
    });

    it('ipcUtils.invoke returns empty object and warns', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { ipcUtils } = await import('../lib/tauri');
      const result = await ipcUtils.invoke('test_command');
      
      expect(result).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tauri command "test_command" called outside of Tauri environment')
      );
      
      consoleSpy.mockRestore();
    });

    it('ipcUtils.listen returns no-op function and warns', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { ipcUtils } = await import('../lib/tauri');
      const unlisten = await ipcUtils.listen('test_event', () => {});
      
      expect(typeof unlisten).toBe('function');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Tauri event listener "test_event" registered outside of Tauri environment')
      );
      
      // Should not throw when called
      await expect(unlisten()).resolves.toBeUndefined();
      
      consoleSpy.mockRestore();
    });

    it('transcribeAudio returns mock response in non-Tauri environment', async () => {
      const { transcriptionUtils } = await import('../lib/tauri');
      const result = await transcriptionUtils.transcribeAudio('/test/path');
      
      expect(result).toEqual({
        text: 'This is a mock transcription for non-Tauri environments.',
        segments: []
      });
    });

    it('window utils return false in non-Tauri environment', async () => {
      const { windowUtils } = await import('../lib/tauri');
      
      expect(windowUtils.minimize()).toBe(false);
      expect(windowUtils.maximize()).toBe(false);
      expect(windowUtils.close()).toBe(false);
      expect(windowUtils.setTitle('test')).toBe(false);
      expect(windowUtils.setResizable(true)).toBe(false);
    });
  });
});