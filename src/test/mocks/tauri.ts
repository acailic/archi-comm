// src/test/mocks/tauri.ts
import { vi } from 'vitest';

// Comment 15, 38
export function createTauriMocks() {
  return {
    convertFileSrc: (src: string, _protocol: string) => src,
    dialog: {
      save: vi.fn().mockResolvedValue('/mock/save/path.json'),
      open: vi.fn().mockResolvedValue(['/mock/open/path.json']),
      message: vi.fn().mockResolvedValue(undefined),
      ask: vi.fn().mockResolvedValue(true),
      confirm: vi.fn().mockResolvedValue(true),
    },
    fs: {
      writeTextFile: vi.fn().mockResolvedValue(undefined),
      readTextFile: vi.fn().mockResolvedValue('{"mock": "data"}'),
      exists: vi.fn().mockResolvedValue(true),
      createDir: vi.fn().mockResolvedValue(undefined),
      removeFile: vi.fn().mockResolvedValue(undefined),
      copyFile: vi.fn().mockResolvedValue(undefined),
    },
    path: {
      join: vi.fn().mockImplementation((...paths: string[]) => paths.join('/')),
      dirname: vi.fn().mockImplementation((path: string) => path.split('/').slice(0, -1).join('/')),
      basename: vi.fn().mockImplementation((path: string) => path.split('/').pop() || ''),
      // Comment 34
      extname: vi.fn().mockImplementation((path: string) => {
        const lastDotIndex = path.lastIndexOf('.');
        if (lastDotIndex <= 0) { // Handles '.bashrc' (index 0) and 'no-ext' (index -1)
          return '';
        }
        return path.substring(lastDotIndex);
      }),
    },
    invoke: vi.fn().mockResolvedValue(undefined),
  };
}
