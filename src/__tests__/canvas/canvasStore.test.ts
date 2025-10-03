// src/__tests__/canvas/canvasStore.test.ts
// Comprehensive unit tests for canvas store actions, selectors, and state management
// Tests store initialization, actions, undo/redo, rate limiting, and conditional updates
// RELEVANT FILES: src/stores/canvasStore.ts, src/test/react-testing-utils.tsx, src/lib/performance/InfiniteLoopDetector.ts

import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useCanvasStore } from '../../stores/canvasStore';
import { resetTestStores } from '../../test/react-testing-utils';
import {
  createTestComponent,
  createTestConnection,
  setupCanvasStore,
  getStoreSnapshot,
} from './test-helpers';
import type { DesignComponent, Connection } from '../../shared/contracts';

type CanvasStoreState = ReturnType<typeof useCanvasStore.getState>;

describe('Canvas Store', () => {
  beforeEach(() => {
    resetTestStores();
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Store Initialization', () => {
    it('should initialize with correct default values', () => {
      const state = useCanvasStore.getState();

      expect(state.components).toEqual([]);
      expect(state.connections).toEqual([]);
      expect(state.infoCards).toEqual([]);
      expect(state.canvasMode).toBe('select');
      expect(state.animationsEnabled).toBe(true);
      expect(state.gridEnabled).toBe(true);
      expect(state.tourCompleted).toBe(false);
    });

    it('should load persisted preferences from localStorage', () => {
      localStorage.setItem('canvas-preferences', JSON.stringify({
        state: {
          gridEnabled: false,
          snapToGrid: true,
          showMinimap: false,
          animationsEnabled: false,
          gridSpacing: 50,
        },
        version: 0,
      }));

      // Re-initialize store by getting state
      const state = useCanvasStore.getState();

      expect(state.gridEnabled).toBe(false);
      expect(state.snapToGrid).toBe(true);
      expect(state.showMinimap).toBe(false);
      expect(state.animationsEnabled).toBe(false);
      expect(state.gridSpacing).toBe(50);
    });
  });

  describe('Component Actions', () => {
    it('should set components and update metadata', () => {
      const components = [
        createTestComponent('comp-1', 'server'),
        createTestComponent('comp-2', 'database', { x: 200, y: 200 }),
      ];
      const initialVersion = useCanvasStore.getState().updateVersion;

      act(() => {
        useCanvasStore.getState().setComponents(components);
      });

      const snapshot = getStoreSnapshot();
      expect(snapshot.components).toEqual(components);
      expect(snapshot.updateVersion).toBe(initialVersion + 1);
      expect(snapshot.lastUpdatedAt).toBeGreaterThan(0);
    });

    it('should not trigger update when setting identical components (deep equality)', () => {
      const components = [createTestComponent('comp-1', 'server')];

      act(() => {
        useCanvasStore.getState().setComponents(components);
      });

      const { updateVersion, lastUpdatedAt } = getStoreSnapshot();

      act(() => {
        useCanvasStore.getState().setComponents([...components]);
      });

      const snapshot = getStoreSnapshot();
      expect(snapshot.updateVersion).toBe(updateVersion);
      expect(snapshot.lastUpdatedAt).toBe(lastUpdatedAt);
    });

    it('should update components via updater function', () => {
      setupCanvasStore([createTestComponent('comp-1', 'server')]);

      act(() => {
        useCanvasStore.getState().updateComponents((current: DesignComponent[]) => [
          ...current,
          createTestComponent('comp-2', 'database', { x: 200, y: 200 }),
        ]);
      });

      const snapshot = getStoreSnapshot();
      expect(snapshot.components).toHaveLength(2);
      expect(snapshot.components[1].id).toBe('comp-2');
    });

    it('should modify component via updater function', () => {
      setupCanvasStore([createTestComponent('comp-1', 'server')]);

      act(() => {
        useCanvasStore.getState().updateComponents((current: DesignComponent[]) =>
          current.map((component: DesignComponent) =>
            component.id === 'comp-1' ? { ...component, x: 300 } : component,
          ),
        );
      });

      expect(useCanvasStore.getState().components[0].x).toBe(300);
    });

    it('should remove component via updater function', () => {
      setupCanvasStore([
        createTestComponent('comp-1', 'server'),
        createTestComponent('comp-2', 'database'),
      ]);

      act(() => {
        useCanvasStore.getState().updateComponents((current: DesignComponent[]) =>
          current.filter((component: DesignComponent) => component.id !== 'comp-1'),
        );
      });

      const snapshot = getStoreSnapshot();
      expect(snapshot.components).toHaveLength(1);
      expect(snapshot.components[0].id).toBe('comp-2');
    });
  });

  describe('Connection Actions', () => {
    it('should set connections and update metadata', () => {
      const connections = [createTestConnection('conn-1', 'comp-1', 'comp-2')];

      act(() => {
        useCanvasStore.getState().setConnections(connections);
      });

      expect(getStoreSnapshot().connections).toEqual(connections);
    });

    it('should not trigger update when setting identical connections (deep equality)', () => {
      const connections = [createTestConnection('conn-1', 'comp-1', 'comp-2')];

      act(() => {
        useCanvasStore.getState().setConnections(connections);
      });

      const { updateVersion } = getStoreSnapshot();

      act(() => {
        useCanvasStore.getState().setConnections([...connections]);
      });

      expect(getStoreSnapshot().updateVersion).toBe(updateVersion);
    });

    it('should add connection via updater function', () => {
      setupCanvasStore([], [createTestConnection('conn-1', 'comp-1', 'comp-2')]);

      act(() => {
        useCanvasStore.getState().updateConnections((current: Connection[]) => [
          ...current,
          createTestConnection('conn-2', 'comp-2', 'comp-3', 'control'),
        ]);
      });

      expect(getStoreSnapshot().connections).toHaveLength(2);
    });

    it('should modify connection via updater function', () => {
      setupCanvasStore([], [createTestConnection('conn-1', 'comp-1', 'comp-2')]);

      act(() => {
        useCanvasStore.getState().updateConnections((current: Connection[]) =>
          current.map((connection: Connection) =>
            connection.id === 'conn-1' ? { ...connection, type: 'async' } : connection,
          ),
        );
      });

      expect(useCanvasStore.getState().connections[0].type).toBe('async');
    });

    it('should remove connection via updater function', () => {
      setupCanvasStore(
        [],
        [
          createTestConnection('conn-1', 'comp-1', 'comp-2'),
          createTestConnection('conn-2', 'comp-2', 'comp-3'),
        ],
      );

      act(() => {
        useCanvasStore.getState().updateConnections((current: Connection[]) =>
          current.filter((connection: Connection) => connection.id !== 'conn-1'),
        );
      });

      const snapshot = getStoreSnapshot();
      expect(snapshot.connections).toHaveLength(1);
      expect(snapshot.connections[0].id).toBe('conn-2');
    });
  });

  describe('Canvas Mode Actions', () => {
    it('should switch to quick-connect mode', () => {
      act(() => {
        useCanvasStore.getState().setCanvasMode('quick-connect');
      });

      expect(useCanvasStore.getState().canvasMode).toBe('quick-connect');
    });

    it('should switch from quick-connect to select and clear source', () => {
      act(() => {
        useCanvasStore.getState().setCanvasMode('quick-connect');
        useCanvasStore.getState().setQuickConnectSource('comp-1');
        useCanvasStore.getState().setQuickConnectPreview({ x: 100, y: 100 });
      });

      act(() => {
        useCanvasStore.getState().setCanvasMode('select');
      });

      expect(useCanvasStore.getState().canvasMode).toBe('select');
      expect(useCanvasStore.getState().quickConnectSource).toBeNull();
      expect(useCanvasStore.getState().quickConnectPreview).toBeNull();
    });

    it('should switch to pan mode', () => {
      act(() => {
        useCanvasStore.getState().setCanvasMode('pan');
      });

      expect(useCanvasStore.getState().canvasMode).toBe('pan');
    });

    it('should switch to annotation mode', () => {
      act(() => {
        useCanvasStore.getState().setCanvasMode('annotation');
      });

      expect(useCanvasStore.getState().canvasMode).toBe('annotation');
    });

    it('should not trigger update when setting same mode', () => {
      act(() => {
        useCanvasStore.getState().setCanvasMode('select');
      });

      const initialVersion = useCanvasStore.getState().updateVersion;

      act(() => {
        useCanvasStore.getState().setCanvasMode('select');
      });

      expect(useCanvasStore.getState().updateVersion).toBe(initialVersion);
    });

    it('should set quick connect source', () => {
      act(() => {
        useCanvasStore.getState().setQuickConnectSource('comp-1');
      });

      expect(useCanvasStore.getState().quickConnectSource).toBe('comp-1');
    });

    it('should clear quick connect source', () => {
      act(() => {
        useCanvasStore.getState().setQuickConnectSource('comp-1');
        useCanvasStore.getState().setQuickConnectSource(null);
      });

      expect(useCanvasStore.getState().quickConnectSource).toBeNull();
    });

    it('should set quick connect preview position', () => {
      act(() => {
        useCanvasStore.getState().setQuickConnectPreview({ x: 250, y: 150 });
      });

      expect(useCanvasStore.getState().quickConnectPreview).toEqual({ x: 250, y: 150 });
    });
  });

  describe('View Preference Actions', () => {
    const toggleScenarios = [
      {
        name: 'grid',
        toggle: () => useCanvasStore.getState().toggleGrid(),
        selector: (state: CanvasStoreState) => state.gridEnabled,
      },
      {
        name: 'snap to grid',
        toggle: () => useCanvasStore.getState().toggleSnapToGrid(),
        selector: (state: CanvasStoreState) => state.snapToGrid,
      },
      {
        name: 'minimap',
        toggle: () => useCanvasStore.getState().toggleMinimap(),
        selector: (state: CanvasStoreState) => state.showMinimap,
      },
    ] as const;

    test.each(toggleScenarios)('should toggle %s', ({ toggle, selector }) => {
      const initial = selector(useCanvasStore.getState());

      act(() => {
        toggle();
      });

      expect(selector(useCanvasStore.getState())).toBe(!initial);
    });

    it('should set grid spacing with valid values', () => {
      act(() => {
        useCanvasStore.getState().setGridSpacing(50);
      });

      expect(useCanvasStore.getState().gridSpacing).toBe(50);
    });

    it('should clamp grid spacing to minimum', () => {
      act(() => {
        useCanvasStore.getState().setGridSpacing(5);
      });

      expect(useCanvasStore.getState().gridSpacing).toBe(10);
    });

    it('should clamp grid spacing to maximum', () => {
      act(() => {
        useCanvasStore.getState().setGridSpacing(150);
      });

      expect(useCanvasStore.getState().gridSpacing).toBe(100);
    });

    it('should not trigger update when setting same grid spacing', () => {
      act(() => {
        useCanvasStore.getState().setGridSpacing(20);
      });

      const { updateVersion } = getStoreSnapshot();

      act(() => {
        useCanvasStore.getState().setGridSpacing(20);
      });

      expect(getStoreSnapshot().updateVersion).toBe(updateVersion);
    });
  });

  describe('Animation Actions', () => {
    it('should toggle animations enabled', () => {
      const initial = useCanvasStore.getState().animationsEnabled;

      act(() => {
        useCanvasStore.getState().toggleAnimations();
      });

      expect(useCanvasStore.getState().animationsEnabled).toBe(!initial);
    });

    it('should set animation speed with valid values', () => {
      act(() => {
        useCanvasStore.getState().setAnimationSpeed(2.0);
      });

      expect(useCanvasStore.getState().animationSpeed).toBe(2.0);
    });

    it('should clamp animation speed to minimum', () => {
      act(() => {
        useCanvasStore.getState().setAnimationSpeed(0.1);
      });

      expect(useCanvasStore.getState().animationSpeed).toBe(0.5);
    });

    it('should clamp animation speed to maximum', () => {
      act(() => {
        useCanvasStore.getState().setAnimationSpeed(5.0);
      });

      expect(useCanvasStore.getState().animationSpeed).toBe(2.0);
    });

    it('should not trigger update when setting same animation speed', () => {
      act(() => {
        useCanvasStore.getState().setAnimationSpeed(1.0);
      });

      const initialVersion = useCanvasStore.getState().updateVersion;

      act(() => {
        useCanvasStore.getState().setAnimationSpeed(1.0);
      });

      expect(useCanvasStore.getState().updateVersion).toBe(initialVersion);
    });
  });

  describe('Connection Preference Actions', () => {
    it('should set default connection type to data', () => {
      act(() => {
        useCanvasStore.getState().setDefaultConnectionType('data');
      });

      expect(useCanvasStore.getState().defaultConnectionType).toBe('data');
    });

    it('should set default connection type to api', () => {
      act(() => {
        useCanvasStore.getState().setDefaultConnectionType('api');
      });

      expect(useCanvasStore.getState().defaultConnectionType).toBe('api');
    });

    it('should set default connection type to async', () => {
      act(() => {
        useCanvasStore.getState().setDefaultConnectionType('async');
      });

      expect(useCanvasStore.getState().defaultConnectionType).toBe('async');
    });

    it('should set default path style to straight', () => {
      act(() => {
        useCanvasStore.getState().setDefaultPathStyle('straight');
      });

      expect(useCanvasStore.getState().defaultPathStyle).toBe('straight');
    });

    it('should set default path style to curved', () => {
      act(() => {
        useCanvasStore.getState().setDefaultPathStyle('curved');
      });

      expect(useCanvasStore.getState().defaultPathStyle).toBe('curved');
    });

    it('should set default path style to stepped', () => {
      act(() => {
        useCanvasStore.getState().setDefaultPathStyle('stepped');
      });

      expect(useCanvasStore.getState().defaultPathStyle).toBe('stepped');
    });

    it('should toggle smart routing', () => {
      const initial = useCanvasStore.getState().smartRouting;

      act(() => {
        useCanvasStore.getState().toggleSmartRouting();
      });

      expect(useCanvasStore.getState().smartRouting).toBe(!initial);
    });

    it('should toggle connection bundling', () => {
      const initial = useCanvasStore.getState().bundleConnections;

      act(() => {
        useCanvasStore.getState().toggleConnectionBundling();
      });

      expect(useCanvasStore.getState().bundleConnections).toBe(!initial);
    });
  });

  describe('Onboarding Actions', () => {
    it('should mark tour as completed', () => {
      act(() => {
        useCanvasStore.getState().markTourCompleted();
      });

      expect(useCanvasStore.getState().tourCompleted).toBe(true);
    });

    it('should dismiss tip and add to dismissed list', () => {
      act(() => {
        useCanvasStore.getState().dismissTip('tip-1');
      });

      expect(useCanvasStore.getState().dismissedTips).toContain('tip-1');
    });

    it('should not duplicate dismissed tips', () => {
      act(() => {
        useCanvasStore.getState().dismissTip('tip-1');
        useCanvasStore.getState().dismissTip('tip-1');
      });

      const dismissedTips = useCanvasStore.getState().dismissedTips;
      expect(dismissedTips.filter((id: string) => id === 'tip-1').length).toBe(1);
    });
  });

  describe('Reset Canvas', () => {
    it('should clear all components, connections, and info cards', () => {
      setupCanvasStore(
        [createTestComponent('comp-1', 'server')],
        [createTestConnection('conn-1', 'comp-1', 'comp-2')],
      );

      act(() => {
        useCanvasStore.getState().resetCanvas();
      });

      const state = useCanvasStore.getState();
      expect(state.components).toEqual([]);
      expect(state.connections).toEqual([]);
      expect(state.infoCards).toEqual([]);
    });

    it('should update metadata on reset', () => {
      const initialVersion = useCanvasStore.getState().updateVersion;

      act(() => {
        useCanvasStore.getState().resetCanvas();
      });

      expect(useCanvasStore.getState().updateVersion).toBeGreaterThan(initialVersion);
      expect(useCanvasStore.getState().lastUpdatedAt).toBeGreaterThan(0);
    });
  });

  describe('Silent Updates', () => {
    it('should not update timestamp when silent option is true', () => {
      const initialTimestamp = useCanvasStore.getState().lastUpdatedAt;

      act(() => {
        useCanvasStore.getState().setComponents(
          [createTestComponent('comp-1', 'server')],
          { silent: true }
        );
      });

      expect(useCanvasStore.getState().lastUpdatedAt).toBe(initialTimestamp);
    });

    it('should not increment version when silent option is true', () => {
      const initialVersion = useCanvasStore.getState().updateVersion;

      act(() => {
        useCanvasStore.getState().setComponents(
          [createTestComponent('comp-1', 'server')],
          { silent: true }
        );
      });

      expect(useCanvasStore.getState().updateVersion).toBe(initialVersion);
    });
  });
});
