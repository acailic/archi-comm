import { useState, useEffect, useCallback } from 'react';
import { isTauri, ipcUtils, windowUtils, notificationUtils } from '../tauri';

// Hook to check if app is running in Tauri
export const useIsTauri = () => {
  const [isRunningInTauri, setIsRunningInTauri] = useState(false);

  useEffect(() => {
    setIsRunningInTauri(isTauri());
  }, []);

  return isRunningInTauri;
};

// Hook for window management
export const useWindow = () => {
  const isRunningInTauri = useIsTauri();

  const minimize = useCallback(() => {
    if (isRunningInTauri) {
      windowUtils.minimize();
    }
  }, [isRunningInTauri]);

  const maximize = useCallback(() => {
    if (isRunningInTauri) {
      windowUtils.maximize();
    }
  }, [isRunningInTauri]);

  const close = useCallback(() => {
    if (isRunningInTauri) {
      windowUtils.close();
    }
  }, [isRunningInTauri]);

  const setTitle = useCallback(
    (title: string) => {
      if (isRunningInTauri) {
        windowUtils.setTitle(title);
      } else {
        document.title = title;
      }
    },
    [isRunningInTauri]
  );

  return {
    minimize,
    maximize,
    close,
    setTitle,
    isRunningInTauri,
  };
};

// Hook for IPC communication
export const useIPC = () => {
  const invoke = useCallback(async <T>(command: string, args?: any): Promise<T> => {
    return ipcUtils.invoke<T>(command, args);
  }, []);

  const listen = useCallback(async <T>(event: string, callback: (payload: T) => void) => {
    return ipcUtils.listen<T>(event, callback);
  }, []);

  return { invoke, listen };
};

// Hook for notifications
export const useNotification = () => {
  const sendNotification = useCallback(async (title: string, body: string) => {
    await notificationUtils.send(title, body);
  }, []);

  return { sendNotification };
};

// Hook for managing application state with Tauri events
export const useTauriState = <T>(initialState: T, eventName?: string) => {
  const [state, setState] = useState<T>(initialState);
  const { listen } = useIPC();

  useEffect(() => {
    if (!eventName) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      unlisten = await listen<T>(eventName, payload => {
        setState(payload);
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [eventName, listen]);

  return [state, setState] as const;
};

// Hook for file operations
export const useFile = () => {
  const { invoke } = useIPC();

  const selectFile = useCallback(async (): Promise<string | null> => {
    return invoke<string | null>('select_file');
  }, [invoke]);

  const selectDirectory = useCallback(async (): Promise<string | null> => {
    return invoke<string | null>('select_directory');
  }, [invoke]);

  const readFile = useCallback(
    async (path: string): Promise<string> => {
      return invoke<string>('read_file', { path });
    },
    [invoke]
  );

  const writeFile = useCallback(
    async (path: string, content: string): Promise<void> => {
      return invoke<void>('write_file', { path, content });
    },
    [invoke]
  );

  return {
    selectFile,
    selectDirectory,
    readFile,
    writeFile,
  };
};

// Hook for project management
export const useProject = () => {
  const { invoke } = useIPC();

  const createProject = useCallback(
    async (name: string, path: string): Promise<void> => {
      return invoke<void>('create_project', { name, path });
    },
    [invoke]
  );

  const openProject = useCallback(
    async (path: string): Promise<any> => {
      return invoke<any>('open_project', { path });
    },
    [invoke]
  );

  const saveProject = useCallback(
    async (projectData: any): Promise<void> => {
      return invoke<void>('save_project', { data: projectData });
    },
    [invoke]
  );

  const exportProject = useCallback(
    async (projectData: any, format: string): Promise<void> => {
      return invoke<void>('export_project', { data: projectData, format });
    },
    [invoke]
  );

  return {
    createProject,
    openProject,
    saveProject,
    exportProject,
  };
};
