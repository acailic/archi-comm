// src/stores/canvasOrganizationStore.ts
// Zustand store for canvas organization features (frames, sections, navigation, search)
// WHY: Centralizes state management for world-class organization features separate from main canvas store
// RELEVANT FILES: src/shared/contracts/index.ts, src/lib/canvas/frame-utils.ts, src/stores/canvasStore.ts, src/stores/canvasViewStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CanvasFrame,
  CanvasSection,
  NavigationHistoryEntry,
  SearchResult,
} from '@/shared/contracts';
import type { DesignComponent } from '@/shared/contracts';

interface CanvasOrganizationState {
  // Frames
  frames: CanvasFrame[];
  currentFrameId: string | null;

  // Sections
  sections: CanvasSection[];

  // Navigation
  navigationHistory: NavigationHistoryEntry[];
  currentHistoryIndex: number;

  // Search
  searchIndex: Map<string, SearchResult>;
  lastSearchQuery: string;
  searchResults: SearchResult[];
}

interface CanvasOrganizationActions {
  // Frame actions
  createFrame: (frame: Omit<CanvasFrame, 'id'>) => string;
  updateFrame: (frameId: string, updates: Partial<CanvasFrame>) => void;
  deleteFrame: (frameId: string) => void;
  setCurrentFrame: (frameId: string | null) => void;
  wrapSelectionInFrame: (
    componentIds: string[],
    name: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => string;
  collapseFrame: (frameId: string) => void;
  expandFrame: (frameId: string) => void;
  toggleFrameCollapse: (frameId: string) => void;
  fitFrameToComponents: (frameId: string) => void;

  // Section actions
  createSection: (section: Omit<CanvasSection, 'id'>) => string;
  updateSection: (sectionId: string, updates: Partial<CanvasSection>) => void;
  deleteSection: (sectionId: string) => void;
  assignComponentsToSection: (sectionId: string, componentIds: string[]) => void;

  // Navigation actions
  navigateToFrame: (frameId: string, viewport: { x: number; y: number; zoom: number }) => void;
  navigateBack: () => NavigationHistoryEntry | null;
  navigateForward: () => NavigationHistoryEntry | null;
  addNavigationEntry: (entry: Omit<NavigationHistoryEntry, 'id' | 'timestamp'>) => void;
  clearNavigationHistory: () => void;

  // Search actions
  buildSearchIndex: (items: SearchResult[]) => void;
  searchCanvas: (query: string) => SearchResult[];
  clearSearch: () => void;

  // Utility actions
  reset: () => void;
}

type CanvasOrganizationStore = CanvasOrganizationState & CanvasOrganizationActions;

const initialState: CanvasOrganizationState = {
  frames: [],
  currentFrameId: null,
  sections: [],
  navigationHistory: [],
  currentHistoryIndex: -1,
  searchIndex: new Map(),
  lastSearchQuery: '',
  searchResults: [],
};

export const useCanvasOrganizationStore = create<CanvasOrganizationStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Frame actions
      createFrame: (frameData) => {
        const id = `frame-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newFrame: CanvasFrame = {
          id,
          ...frameData,
        };

        set((state) => ({
          frames: [...state.frames, newFrame],
        }));

        return id;
      },

      updateFrame: (frameId, updates) => {
        set((state) => ({
          frames: state.frames.map((frame) =>
            frame.id === frameId ? { ...frame, ...updates } : frame
          ),
        }));
      },

      deleteFrame: (frameId) => {
        set((state) => ({
          frames: state.frames.filter((frame) => frame.id !== frameId),
          currentFrameId: state.currentFrameId === frameId ? null : state.currentFrameId,
        }));
      },

      setCurrentFrame: (frameId) => {
        set({ currentFrameId: frameId });
      },

      wrapSelectionInFrame: (componentIds, name, bounds) => {
        const id = `frame-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newFrame: CanvasFrame = {
          id,
          name,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          componentIds,
          color: '#3b82f6',
          locked: false,
          collapsed: false,
        };

        set((state) => ({
          frames: [...state.frames, newFrame],
          currentFrameId: id,
        }));

        return id;
      },

      collapseFrame: (frameId) => {
        set((state) => ({
          frames: state.frames.map((frame) =>
            frame.id === frameId ? { ...frame, collapsed: true } : frame
          ),
        }));
      },

      expandFrame: (frameId) => {
        set((state) => ({
          frames: state.frames.map((frame) =>
            frame.id === frameId ? { ...frame, collapsed: false } : frame
          ),
        }));
      },

      toggleFrameCollapse: (frameId) => {
        set((state) => ({
          frames: state.frames.map((frame) =>
            frame.id === frameId ? { ...frame, collapsed: !frame.collapsed } : frame
          ),
        }));
      },

      fitFrameToComponents: (frameId) => {
        const { frames } = get();
        const frame = frames.find((f) => f.id === frameId);
        if (!frame?.componentIds?.length) return;

        // Import the canvas store to get components
        const { useCanvasStore } = require('@/stores/canvasStore');
        const components = useCanvasStore.getState().components as DesignComponent[];

        const frameComponents = components.filter((c: DesignComponent) => frame.componentIds!.includes(c.id));
        if (!frameComponents.length) return;

        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        frameComponents.forEach((component: DesignComponent) => {
          const width = component.width ?? 220;
          const height = component.height ?? 140;
          minX = Math.min(minX, component.x);
          minY = Math.min(minY, component.y);
          maxX = Math.max(maxX, component.x + width);
          maxY = Math.max(maxY, component.y + height);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;

        const padding = 32;
        const newBounds = {
          x: minX - padding,
          y: minY - padding,
          width: maxX - minX + padding * 2,
          height: maxY - minY + padding * 2,
        };

        get().updateFrame(frameId, newBounds);
      },

      // Section actions
      createSection: (sectionData) => {
        const id = `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newSection: CanvasSection = {
          id,
          ...sectionData,
        };

        set((state) => ({
          sections: [...state.sections, newSection],
        }));

        return id;
      },

      updateSection: (sectionId, updates) => {
        set((state) => ({
          sections: state.sections.map((section) =>
            section.id === sectionId ? { ...section, ...updates } : section
          ),
        }));
      },

      deleteSection: (sectionId) => {
        set((state) => ({
          sections: state.sections.filter((section) => section.id !== sectionId),
        }));
      },

      assignComponentsToSection: (sectionId, componentIds) => {
        set((state) => ({
          sections: state.sections.map((section) =>
            section.id === sectionId
              ? { ...section, componentIds: [...new Set([...section.componentIds, ...componentIds])] }
              : section
          ),
        }));
      },

      // Navigation actions
      navigateToFrame: (frameId, viewport) => {
        const { frames, addNavigationEntry } = get();
        const frame = frames.find((f) => f.id === frameId);

        if (frame) {
          addNavigationEntry({
            type: 'frame',
            targetId: frameId,
            viewport,
            label: frame.name,
          });
          set({ currentFrameId: frameId });
        }
      },

      navigateBack: () => {
        const { navigationHistory, currentHistoryIndex } = get();

        if (currentHistoryIndex > 0) {
          const newIndex = currentHistoryIndex - 1;
          const entry = navigationHistory[newIndex];

          set({ currentHistoryIndex: newIndex });
          return entry;
        }

        return null;
      },

      navigateForward: () => {
        const { navigationHistory, currentHistoryIndex } = get();

        if (currentHistoryIndex < navigationHistory.length - 1) {
          const newIndex = currentHistoryIndex + 1;
          const entry = navigationHistory[newIndex];

          set({ currentHistoryIndex: newIndex });
          return entry;
        }

        return null;
      },

      addNavigationEntry: (entryData) => {
        const { navigationHistory, currentHistoryIndex } = get();

        const id = `nav-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const entry: NavigationHistoryEntry = {
          id,
          timestamp: Date.now(),
          ...entryData,
        };

        // Trim history after current index (remove "future" entries when navigating)
        const newHistory = navigationHistory.slice(0, currentHistoryIndex + 1);
        newHistory.push(entry);

        // Keep only last 50 entries
        const trimmedHistory = newHistory.slice(-50);

        set({
          navigationHistory: trimmedHistory,
          currentHistoryIndex: trimmedHistory.length - 1,
        });
      },

      clearNavigationHistory: () => {
        set({
          navigationHistory: [],
          currentHistoryIndex: -1,
        });
      },

      // Search actions
      buildSearchIndex: (items) => {
        const index = new Map<string, SearchResult>();

        items.forEach((item) => {
          index.set(item.id, item);
        });

        set({ searchIndex: index });
      },

      searchCanvas: (query) => {
        const { searchIndex } = get();
        const lowerQuery = query.toLowerCase().trim();

        if (!lowerQuery) {
          set({ searchResults: [], lastSearchQuery: '' });
          return [];
        }

        // Simple fuzzy search
        const results: SearchResult[] = [];

        searchIndex.forEach((item) => {
          const labelMatch = item.label.toLowerCase().includes(lowerQuery);
          const descMatch = item.description?.toLowerCase().includes(lowerQuery) || false;

          if (labelMatch || descMatch) {
            results.push({
              ...item,
              score: labelMatch ? 1.0 : 0.5,
            });
          }
        });

        // Sort by score descending
        results.sort((a, b) => b.score - a.score);

        set({
          searchResults: results.slice(0, 50), // Limit to 50 results
          lastSearchQuery: query,
        });

        return results;
      },

      clearSearch: () => {
        set({
          searchResults: [],
          lastSearchQuery: '',
        });
      },

      // Utility
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'archicomm-canvas-organization',
      partialize: (state) => ({
        frames: state.frames,
        sections: state.sections,
        // Don't persist navigation history and search (transient state)
      }),
    }
  )
);

// Selectors
export const useFrames = () => useCanvasOrganizationStore((state) => state.frames);
export const useCurrentFrame = () => useCanvasOrganizationStore((state) => {
  const frameId = state.currentFrameId;
  return state.frames.find((f) => f.id === frameId);
});
export const useSections = () => useCanvasOrganizationStore((state) => state.sections);
export const useNavigationHistory = () =>
  useCanvasOrganizationStore((state) => state.navigationHistory);
export const useSearchResults = () =>
  useCanvasOrganizationStore((state) => state.searchResults);

// Actions export
export const useCanvasOrganizationActions = () =>
  useCanvasOrganizationStore((state) => ({
    createFrame: state.createFrame,
    updateFrame: state.updateFrame,
    deleteFrame: state.deleteFrame,
    setCurrentFrame: state.setCurrentFrame,
    wrapSelectionInFrame: state.wrapSelectionInFrame,
    collapseFrame: state.collapseFrame,
    expandFrame: state.expandFrame,
    toggleFrameCollapse: state.toggleFrameCollapse,
    createSection: state.createSection,
    updateSection: state.updateSection,
    deleteSection: state.deleteSection,
    assignComponentsToSection: state.assignComponentsToSection,
    navigateToFrame: state.navigateToFrame,
    navigateBack: state.navigateBack,
    navigateForward: state.navigateForward,
    addNavigationEntry: state.addNavigationEntry,
    clearNavigationHistory: state.clearNavigationHistory,
    buildSearchIndex: state.buildSearchIndex,
    searchCanvas: state.searchCanvas,
    clearSearch: state.clearSearch,
    reset: state.reset,
  }));
