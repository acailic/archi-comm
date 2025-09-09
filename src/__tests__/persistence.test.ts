import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveDesign, loadDesign } from '../lib/api/tauriClient';
import type { DesignData } from '../shared/contracts';

const sampleDesign: DesignData = {
  schemaVersion: 1,
  components: [
    { id: 'a', type: 'server', x: 10, y: 20, label: 'A' },
    { id: 'b', type: 'database', x: 200, y: 120, label: 'B' },
  ],
  connections: [
    { id: 'c1', from: 'a', to: 'b', label: 'calls', type: 'sync', direction: 'end' },
  ],
  layers: [{ id: 'default', name: 'Default', visible: true, order: 0 }],
  gridConfig: { visible: true, spacing: 20, snapToGrid: false },
  metadata: { created: new Date().toISOString(), lastModified: new Date().toISOString(), version: '1.0' },
};

describe('Persistence round-trip (web)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      store: new Map<string, string>(),
      getItem(key: string) { return (this.store as Map<string, string>).get(key) ?? null; },
      setItem(key: string, value: string) { (this.store as Map<string, string>).set(key, value); },
      removeItem(key: string) { (this.store as Map<string, string>).delete(key); },
      clear() { (this.store as Map<string, string>).clear(); },
      key: (i: number) => null,
      length: 0,
    } as any);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saves and loads design via localStorage', async () => {
    vi.doMock('../lib/environment', () => ({ isTauriEnvironment: () => false }));
    const { saveDesign: save, loadDesign: load } = await import('../lib/api/tauriClient');
    await save('test-project', sampleDesign);
    const loaded = await load('test-project');
    expect(loaded).toBeTruthy();
    expect(loaded?.components.length).toBe(2);
    expect(loaded?.schemaVersion ?? 1).toBe(1);
  });
});

describe('Persistence round-trip (tauri mocked)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('saves and loads design via tauri fs', async () => {
    vi.doMock('../lib/environment', () => ({ isTauriEnvironment: () => true }));
    const writes: Record<string, string> = {};
    vi.doMock('@tauri-apps/api/path', () => ({
      appDataDir: async () => '/tmp',
      join: async (...parts: string[]) => parts.join('/'),
    }));
    vi.doMock('@tauri-apps/api/fs', () => ({
      BaseDirectory: {},
      createDir: async () => {},
      exists: async () => true,
      writeTextFile: async (path: string, data: string) => { writes[path] = data; },
      readTextFile: async (path: string) => writes[path],
      removeFile: async () => {},
    }));

    const { saveDesign: save, loadDesign: load } = await import('../lib/api/tauriClient');
    await save('proj123', sampleDesign);
    const loaded = await load('proj123');
    expect(loaded).toBeTruthy();
    expect(loaded?.components[0].label).toBe('A');
  });
});

