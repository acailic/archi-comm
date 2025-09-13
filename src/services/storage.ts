import localforage from 'localforage';

// Centralized IndexedDB-backed storage with safe fallbacks.
// Used to persist larger designs without hitting localStorage quotas.

export const designsStore = localforage.createInstance({
  name: 'archicomm',
  storeName: 'designs',
  description: 'Design persistence for ArchiComm',
});

// Helper API that first tries IndexedDB, then falls back to localStorage.
export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await designsStore.setItem(key, value);
    } catch {
      // Fallback
      localStorage.setItem(key, value);
    }
  },
  async getItem(key: string): Promise<string | null> {
    try {
      const v = await designsStore.getItem<string>(key);
      if (typeof v === 'string') return v;
      return v == null ? null : JSON.stringify(v);
    } catch {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      await designsStore.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  },
};
