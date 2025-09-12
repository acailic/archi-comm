import { vi } from 'vitest';

const mockTauri = {
  invoke: vi.fn((command: string) => {
    switch (command) {
      case 'get_app_version':
        return Promise.resolve('1.0.0');
      case 'get_projects':
        return Promise.resolve([
          {
            id: '1',
            name: 'Test Project',
            path: '/test/path',
            lastOpened: new Date().toISOString(),
          },
        ]);
      case 'select_file':
        return Promise.resolve('/selected/file.txt');
      case 'select_directory':
        return Promise.resolve('/selected/directory');
      case 'transcribe_audio':
        return Promise.resolve({
          text: 'Test transcription',
          segments: [
            {
              text: 'Test transcription',
              start: 0,
              end: 1,
              confidence: 0.9,
            },
          ],
        });
      case 'test_transcription_pipeline':
        return Promise.resolve({
          success: true,
          message: 'Pipeline test successful',
        });
      default:
        return Promise.resolve({});
    }
  }),
  listen: vi.fn().mockResolvedValue(() => {}),
};

vi.mock('@tauri-apps/api', () => ({
  invoke: mockTauri.invoke,
  event: {
    listen: mockTauri.listen,
  },
  window: {
    getCurrent: () => ({
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
    }),
  },
}));

vi.mock('../lib/tauri', () => ({
  ...vi.importActual('../lib/tauri'),
  isTauri: () => true,
}));

export { mockTauri };
