import { toPng } from 'html-to-image';
import type { DesignData } from '@/shared/contracts';
import { isTauriEnvironment } from '@/lib/environment';
import * as TauriClient from '@/lib/api/tauriClient';

interface CacheEntry {
  value: string;
  lastUsed: number;
}

export class CanvasPersistence {
  private exportCache: Map<string, CacheEntry> = new Map();
  private readonly maxCacheSize = 10;
  private readonly projectId?: string;

  constructor(projectId?: string) {
    this.projectId = projectId;
  }

  async saveDesign(data: DesignData, retries = 2): Promise<void> {
    if (this.projectId && isTauriEnvironment()) {
      await TauriClient.saveDesign(this.projectId, data, { retries });
      return;
    }
    try {
      const payload = JSON.stringify(data);
      if (this.projectId) {
        localStorage.setItem(`archicomm-project-${this.projectId}`, payload);
      } else {
        localStorage.setItem('archicomm-canvas-auto', payload);
      }
    } catch (e) {
      // Swallow errors for web localStorage issues
    }
  }

  async loadDesign(): Promise<DesignData | null> {
    if (this.projectId && isTauriEnvironment()) {
      return TauriClient.loadDesign(this.projectId);
    }
    const key = this.projectId ? `archicomm-project-${this.projectId}` : 'archicomm-canvas-auto';
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DesignData;
    } catch {
      return null;
    }
  }

  async exportJSON(data: DesignData): Promise<string> {
    const cacheKey = `json:${(data.components?.length ?? 0)}:${(data.connections?.length ?? 0)}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    const json = JSON.stringify(data, null, 2);
    this.putInCache(cacheKey, json);
    return json;
  }

  async exportPNG(element: HTMLElement): Promise<string> {
    const cacheKey = `png:${element.clientWidth}x${element.clientHeight}:${element.dataset['hash'] ?? ''}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;
    const dataUrl = await toPng(element, { cacheBust: true, pixelRatio: 2 });
    this.putInCache(cacheKey, dataUrl);
    return dataUrl;
  }

  private getFromCache(key: string): string | null {
    const entry = this.exportCache.get(key);
    if (!entry) return null;
    entry.lastUsed = Date.now();
    return entry.value;
  }

  private putInCache(key: string, value: string) {
    if (this.exportCache.size >= this.maxCacheSize) {
      // Evict least recently used
      let lruKey: string | null = null;
      let lruTime = Infinity;
      for (const [k, v] of this.exportCache.entries())
        if (v.lastUsed < lruTime) {
          lruKey = k;
          lruTime = v.lastUsed;
        }
      if (lruKey) this.exportCache.delete(lruKey);
    }
    this.exportCache.set(key, { value, lastUsed: Date.now() });
  }
}

