/**
 * Web-compatible fallback implementations for Tauri functionality
 * Provides browser-based alternatives for desktop-only features
 */

import { CONFIG } from '@/lib/environment';
import type { DesignData } from '@/shared/contracts';

// Types for web fallback implementations
export interface WebProject {
  id: string;
  name: string;
  data: DesignData;
  lastModified: number;
  version: number;
}

export interface WebFileHandle {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
}

/**
 * Web-based project management using localStorage
 */
export class WebProjectManager {
  private readonly STORAGE_KEY = 'archicomm_projects';
  private readonly MAX_PROJECTS = 50;

  /**
   * Get all projects from localStorage
   */
  async getProjects(): Promise<WebProject[]> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const projects = JSON.parse(stored) as WebProject[];
      return projects.sort((a, b) => b.lastModified - a.lastModified);
    } catch (error) {
      console.error('Failed to load projects from localStorage:', error);
      return [];
    }
  }

  /**
   * Save project to localStorage
   */
  async saveProject(project: Omit<WebProject, 'lastModified' | 'version'>): Promise<boolean> {
    try {
      const projects = await this.getProjects();
      const existingIndex = projects.findIndex(p => p.id === project.id);

      const updatedProject: WebProject = {
        ...project,
        lastModified: Date.now(),
        version: existingIndex >= 0 ? projects[existingIndex].version + 1 : 1,
      };

      if (existingIndex >= 0) {
        projects[existingIndex] = updatedProject;
      } else {
        projects.unshift(updatedProject);

        // Limit number of stored projects
        if (projects.length > this.MAX_PROJECTS) {
          projects.splice(this.MAX_PROJECTS);
        }
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
      return true;
    } catch (error) {
      console.error('Failed to save project to localStorage:', error);
      return false;
    }
  }

  /**
   * Delete project from localStorage
   */
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const projects = await this.getProjects();
      const filtered = projects.filter(p => p.id !== projectId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: string): Promise<WebProject | null> {
    const projects = await this.getProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  /**
   * Clear all projects
   */
  async clearProjects(): Promise<boolean> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to clear projects:', error);
      return false;
    }
  }
}

/**
 * Web-based file operations using File API and downloads
 */
export class WebFileManager {
  /**
   * Save data as a downloadable file
   */
  async saveFile(
    filename: string,
    data: string | Blob,
    type: string = 'text/plain'
  ): Promise<boolean> {
    try {
      const blob = typeof data === 'string' ? new Blob([data], { type }) : data;

      if (blob.size > CONFIG.MAX_FILE_SIZE) {
        throw new Error(`File too large: ${blob.size} bytes (max: ${CONFIG.MAX_FILE_SIZE})`);
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      return false;
    }
  }

  /**
   * Open file picker and read selected file
   */
  async openFile(accept?: string): Promise<{ name: string; content: string; size: number } | null> {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      if (accept) input.accept = accept;

      return new Promise(resolve => {
        input.onchange = async event => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (!file) {
            resolve(null);
            return;
          }

          if (file.size > CONFIG.MAX_FILE_SIZE) {
            console.error(`File too large: ${file.size} bytes (max: ${CONFIG.MAX_FILE_SIZE})`);
            resolve(null);
            return;
          }

          try {
            const content = await file.text();
            resolve({
              name: file.name,
              content,
              size: file.size,
            });
          } catch (error) {
            console.error('Failed to read file:', error);
            resolve(null);
          }
        };

        input.click();
      });
    } catch (error) {
      console.error('Failed to open file picker:', error);
      return null;
    }
  }

  /**
   * Export data as JSON file
   */
  async exportJSON<T>(filename: string, data: T): Promise<boolean> {
    try {
      const json = JSON.stringify(data, null, 2);
      return await this.saveFile(`${filename}.json`, json, 'application/json');
    } catch (error) {
      console.error('Failed to export JSON:', error);
      return false;
    }
  }

  /**
   * Import JSON file
   */
  async importJSON<T = unknown>(): Promise<T | null> {
    try {
      const result = await this.openFile('.json,application/json');
      if (!result) return null;

      return JSON.parse(result.content) as T;
    } catch (error) {
      console.error('Failed to import JSON:', error);
      return null;
    }
  }
}

/**
 * Web-based notification system using browser Notification API
 */
export class WebNotificationManager {
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkPermission();
  }

  /**
   * Check current notification permission
   */
  private checkPermission(): void {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return false;
    }

    if (this.permission === 'granted') return true;

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Show notification
   */
  async showNotification(options: NotificationOptions): Promise<boolean> {
    if (!('Notification' in window) || this.permission !== 'granted') {
      console.warn('Cannot show notification: permission not granted or not supported');
      return false;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
      });

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return true;
    } catch (error) {
      console.error('Failed to show notification:', error);
      return false;
    }
  }

  /**
   * Check if notifications are supported and permitted
   */
  isAvailable(): boolean {
    return 'Notification' in window && this.permission === 'granted';
  }
}

/**
 * Web-based window management stubs
 */
export class WebWindowManager {
  /**
   * Maximize window (no-op in web, just log)
   */
  async maximize(): Promise<boolean> {
    console.info('Window maximize requested (not supported in web environment)');
    return false;
  }

  /**
   * Minimize window (no-op in web, just log)
   */
  async minimize(): Promise<boolean> {
    console.info('Window minimize requested (not supported in web environment)');
    return false;
  }

  /**
   * Close window (attempt to close tab/window)
   */
  async close(): Promise<boolean> {
    try {
      window.close();
      return true;
    } catch (error) {
      console.warn('Cannot programmatically close window in web environment');
      return false;
    }
  }

  /**
   * Set window title
   */
  async setTitle(title: string): Promise<boolean> {
    try {
      document.title = title;
      return true;
    } catch (error) {
      console.error('Failed to set window title:', error);
      return false;
    }
  }

  /**
   * Get window information
   */
  async getInfo(): Promise<{ width: number; height: number; x: number; y: number }> {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      x: window.screenX,
      y: window.screenY,
    };
  }
}

/**
 * localStorage-based auto-save functionality
 */
export class WebAutoSave {
  private readonly STORAGE_KEY = 'archicomm_autosave';
  private saveTimer: number | null = null;
  private lastSaveData: string = '';

  /**
   * Start auto-save with specified interval
   */
  start(getData: () => any, interval: number = CONFIG.AUTO_SAVE_INTERVAL): void {
    this.stop(); // Clear any existing timer

    this.saveTimer = window.setInterval(() => {
      try {
        const data = getData();
        const serialized = JSON.stringify(data);

        // Only save if data has changed
        if (serialized !== this.lastSaveData) {
          localStorage.setItem(this.STORAGE_KEY, serialized);
          this.lastSaveData = serialized;
          console.debug('Auto-saved data to localStorage');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, interval);
  }

  /**
   * Stop auto-save
   */
  stop(): void {
    if (this.saveTimer !== null) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
  }

  /**
   * Load auto-saved data
   */
  load(): any | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load auto-saved data:', error);
      return null;
    }
  }

  /**
   * Clear auto-saved data
   */
  clear(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.lastSaveData = '';
    } catch (error) {
      console.error('Failed to clear auto-saved data:', error);
    }
  }

  /**
   * Check if auto-saved data exists
   */
  hasData(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
}

// Export singleton instances
export const webProjectManager = new WebProjectManager();
export const webFileManager = new WebFileManager();
export const webNotificationManager = new WebNotificationManager();
export const webWindowManager = new WebWindowManager();
export const webAutoSave = new WebAutoSave();

/**
 * Initialize web fallback services
 */
export const initializeWebFallbacks = async (): Promise<void> => {
  try {
    // Request notification permission if supported
    if ('Notification' in window) {
      await webNotificationManager.requestPermission();
    }

    console.info('Web fallback services initialized');
  } catch (error) {
    console.error('Failed to initialize web fallback services:', error);
  }
};
