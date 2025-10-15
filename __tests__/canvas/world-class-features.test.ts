import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useCanvasOrganizationStore } from '@/stores/canvasOrganizationStore';
import { useCanvasStore } from '@/stores/canvasStore';
import {
  buildSmartRoutes,
  clearRoutingCache,
  getRoutingCacheStats,
  getRoutingPerformanceStats,
} from '@/packages/canvas/utils/smart-routing';
import type { Connection, DesignComponent, DesignData } from '@/shared/contracts';
import { DesignSerializer } from '@/lib/import-export/DesignSerializer';
import { useCanvasSearch } from '@/packages/canvas/hooks/useCanvasSearch';

const resetStores = () => {
  useCanvasOrganizationStore.getState().reset();
  useCanvasStore.setState((state) => {
    state.components = [];
    state.connections = [];
    state.annotations = [];
  });
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
};

describe('canvas organization store', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    resetStores();
  });

  it('handles frame lifecycle and fitFrameToComponents', () => {
    const components: DesignComponent[] = [
      {
        id: 'component-api',
        type: 'service',
        label: 'API Gateway',
        x: 100,
        y: 200,
        width: 180,
        height: 120,
      },
      {
        id: 'component-core',
        type: 'database',
        label: 'Core DB',
        x: 360,
        y: 260,
        width: 200,
        height: 140,
      },
    ];

    useCanvasStore.setState((state) => {
      state.components = components;
    });

    const store = useCanvasOrganizationStore.getState();
    const frameId = store.wrapSelectionInFrame([
      'component-api',
      'component-core',
    ], 'Backend Tier', {
      x: 80,
      y: 180,
      width: 320,
      height: 220,
    });

    let frame = useCanvasOrganizationStore.getState().frames.find((f) => f.id === frameId);
    expect(frame).toBeDefined();
    expect(frame?.collapsed).toBe(false);

    store.collapseFrame(frameId);
    frame = useCanvasOrganizationStore.getState().frames.find((f) => f.id === frameId);
    expect(frame?.collapsed).toBe(true);

    store.expandFrame(frameId);
    frame = useCanvasOrganizationStore.getState().frames.find((f) => f.id === frameId);
    expect(frame?.collapsed).toBe(false);

    store.fitFrameToComponents(frameId);
    frame = useCanvasOrganizationStore.getState().frames.find((f) => f.id === frameId);
    expect(frame).toBeDefined();

    const bounds = components.reduce(
      (acc, component) => {
        const width = component.width ?? 220;
        const height = component.height ?? 140;
        return {
          minX: Math.min(acc.minX, component.x),
          minY: Math.min(acc.minY, component.y),
          maxX: Math.max(acc.maxX, component.x + width),
          maxY: Math.max(acc.maxY, component.y + height),
        };
      },
      { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY },
    );

    const padding = 32;
    expect(frame?.x).toBeCloseTo(bounds.minX - padding, 5);
    expect(frame?.y).toBeCloseTo(bounds.minY - padding, 5);
    expect(frame?.width).toBeCloseTo(bounds.maxX - bounds.minX + padding * 2, 5);
    expect(frame?.height).toBeCloseTo(bounds.maxY - bounds.minY + padding * 2, 5);

    store.deleteFrame(frameId);
    expect(useCanvasOrganizationStore.getState().frames).toHaveLength(0);
  });
});

describe('canvas search hook', () => {
  beforeEach(() => {
    resetStores();
  });

  afterEach(() => {
    resetStores();
  });

  it('returns ordered results and dispatches jump events', async () => {
    const components: DesignComponent[] = [
      {
        id: 'component-search-service',
        type: 'service',
        label: 'Search Service',
        x: 50,
        y: 80,
      },
      {
        id: 'component-payment',
        type: 'queue',
        label: 'Payment Queue',
        x: 180,
        y: 140,
      },
    ];

    const connections: Connection[] = [
      {
        id: 'connection-1',
        from: 'component-search-service',
        to: 'component-payment',
        label: 'Sync job',
        type: 'data',
      },
    ];

    useCanvasStore.setState((state) => {
      state.components = components;
      state.connections = connections;
    });

    const { result } = renderHook(() => useCanvasSearch({ maxResults: 10 }));

    await act(async () => {
      result.current.setQuery('search');
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].id).toBe('component-search-service');

    const listener = vi.fn();
    window.addEventListener('canvas:search:jump-to-result', listener);

    act(() => {
      result.current.jumpToResult(result.current.results[0]);
    });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.result.id).toBe('component-search-service');

    window.removeEventListener('canvas:search:jump-to-result', listener);
  });
});

describe('smart routing utilities', () => {
  beforeEach(() => {
    clearRoutingCache();
  });

  it('caches routes and reports performance stats', async () => {
    const components: DesignComponent[] = [
      {
        id: 'a',
        type: 'service',
        label: 'Service A',
        x: 0,
        y: 0,
        width: 160,
        height: 120,
      },
      {
        id: 'b',
        type: 'database',
        label: 'Database B',
        x: 400,
        y: 0,
        width: 200,
        height: 160,
      },
    ];

    const connection: Connection = {
      id: 'route-1',
      from: 'a',
      to: 'b',
      label: 'writes to',
      type: 'data',
    };

    const firstResult = await buildSmartRoutes([connection], components, {
      enableCaching: true,
    });

    const firstRoute = firstResult.get('route-1');
    expect(firstRoute).toBeDefined();
    expect(firstRoute?.cached).toBeFalsy();

    const cacheStats = getRoutingCacheStats();
    expect(cacheStats.size).toBeGreaterThan(0);

    const perfStats = getRoutingPerformanceStats(firstResult);
    expect(perfStats.totalRoutes).toBe(1);
    expect(perfStats.cachedRoutes).toBe(0);

    const secondResult = await buildSmartRoutes([connection], components, {
      enableCaching: true,
    });

    const cachedRoute = secondResult.get('route-1');
    expect(cachedRoute).toBeDefined();
    expect(cachedRoute?.cached).toBe(true);

    const cachedPerf = getRoutingPerformanceStats(secondResult);
    expect(cachedPerf.cachedRoutes).toBe(1);
    expect(cachedPerf.cacheHitRate).toBeCloseTo(1);
  });
});

describe('design serializer', () => {
  afterEach(() => {
    resetStores();
  });

  it('round-trips frames, sections, and presentation slides', async () => {
    const now = new Date().toISOString();
    const design: DesignData = {
      schemaVersion: 1,
      components: [
        {
          id: 'app-1',
          type: 'service',
          label: 'Frontend',
          x: 0,
          y: 0,
        },
        {
          id: 'db-1',
          type: 'database',
          label: 'User Store',
          x: 320,
          y: 0,
        },
      ],
      connections: [
        {
          id: 'conn-1',
          from: 'app-1',
          to: 'db-1',
          label: 'Reads',
          type: 'data',
        },
      ],
      layers: [
        {
          id: 'layer-base',
          name: 'Base',
          visible: true,
          order: 0,
        },
      ],
      metadata: {
        created: now,
        lastModified: now,
        author: 'Test',
        version: '1.0',
      },
      frames: [
        {
          id: 'frame-1',
          name: 'UI',
          x: 0,
          y: 0,
          width: 400,
          height: 300,
          componentIds: ['app-1'],
        },
      ],
      sections: [
        {
          id: 'section-1',
          name: 'Customer Experience',
          componentIds: ['app-1'],
        },
      ],
      presentationSlides: [
        {
          id: 'slide-1',
          name: 'Overview',
          frameId: 'frame-1',
          viewport: { x: 0, y: 0, zoom: 1 },
          focusedComponentIds: ['app-1'],
          order: 0,
        },
      ],
    };

    const serializer = new DesignSerializer();
    const exported = await serializer.exportDesign(design, undefined, undefined, {
      format: 'json',
      includeMetadata: true,
      includeChallenge: false,
      includeAnalytics: false,
      includeCanvas: true,
      compressData: false,
    });

    const imported = await serializer.importDesign(exported, {
      mode: 'replace',
      handleConflicts: 'auto',
      preserveIds: true,
      preservePositions: true,
      validateComponents: true,
      importCanvas: true,
      importAnalytics: false,
    });

    expect(imported.success).toBe(true);
    expect(imported.data?.frames).toHaveLength(1);
    expect(imported.data?.sections).toHaveLength(1);
    expect(imported.data?.presentationSlides).toHaveLength(1);
    expect(imported.data?.frames?.[0].componentIds).toContain('app-1');
    expect(imported.canvas).toBeDefined();
  });
});
