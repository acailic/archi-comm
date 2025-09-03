import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/api/notification';

// Helper function to check if we're running in Tauri
export const isTauri = () => {
  return typeof window !== 'undefined' && window.__TAURI__;
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

// Project management utilities (specific to ArchiComm)
export const projectUtils = {
  async createProject(name: string, path: string): Promise<void> {
    return ipcUtils.invoke('create_project', { name, path });
  },
  
  async openProject(path: string): Promise<any> {
    return ipcUtils.invoke('open_project', { path });
  },
  
  async saveProject(projectData: any): Promise<void> {
    return ipcUtils.invoke('save_project', { data: projectData });
  },
  
  async exportProject(projectData: any, format: string): Promise<void> {
    return ipcUtils.invoke('export_project', { data: projectData, format });
  },
};