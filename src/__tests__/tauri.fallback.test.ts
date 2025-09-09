import { describe, it, expect, vi, beforeEach } from 'vitest';

// Ensure no Tauri env
declare global {
  interface Window {
    __TAURI__?: any;
  }
}

beforeEach(() => {
  (window as any).__TAURI__ = undefined;
  vi.resetModules();
});

describe('tauri.ts fallback (non-Tauri env)', () => {
  it('window utils do not throw', async () => {
    const mod = await import('../lib/tauri');
    expect(mod.isTauri()).toBeFalsy();
    expect(() => mod.windowUtils.minimize()).not.toThrow();
    expect(() => mod.windowUtils.maximize()).not.toThrow();
    expect(() => mod.windowUtils.close()).not.toThrow();
    expect(() => mod.windowUtils.setTitle('x')).not.toThrow();
  });

  it('ipc.invoke returns empty object and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { ipcUtils } = await import('../lib/tauri');
    const res = await ipcUtils.invoke<any>('some_command');
    expect(res).toEqual({});
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('ipc.listen returns no-op unsubscriber', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { ipcUtils } = await import('../lib/tauri');
    const unlisten = await ipcUtils.listen('evt', () => {});
    expect(typeof unlisten).toBe('function');
    // Calling should not throw
    expect(() => unlisten()).not.toThrow();
    warn.mockRestore();
  });
});
