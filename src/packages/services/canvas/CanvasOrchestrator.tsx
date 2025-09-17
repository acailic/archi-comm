import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { CanvasPersistence } from './CanvasPersistence';
import { useCanvasTelemetry } from './CanvasTelemetry';
import { TemplateEngine } from './TemplateEngine';
import { useService } from '@/lib/di/ServiceProvider';
import { CANVAS_SERVICE, PERSISTENCE_SERVICE } from '@/lib/di/ServiceRegistry';
import type { ICanvasService, IPersistenceService } from '@/lib/di/ServiceInterfaces';
import type {
  Connection,
  DesignComponent,
  DesignData,
  GridConfig,
  Layer,
  ToolType,
} from '@/shared/contracts';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useAutoSave } from '@/hooks/useAutoSave';

// Import adapter functions for React Flow compatibility
// These are used by the canvas components but not directly by the orchestrator

/**
 * Canvas state interface - compatible with both custom SVG and React Flow implementations
 * The orchestrator remains agnostic to the rendering implementation and works with domain objects
 */
export interface CanvasState {
  components: DesignComponent[];
  connections: Connection[];
  layers: Layer[];
  selectedComponentId: string | null;
  selectedComponentIds: string[];
  activeLayerId: string | null;
  activeTool: ToolType;
  gridConfig: GridConfig;
  canUndo: boolean;
  canRedo: boolean;
  lastSavedAt: number | null;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

/**
 * Canvas actions interface - all operations work with domain objects
 * These actions are compatible with both custom SVG and React Flow implementations
 * The canvas components handle the conversion to/from React Flow format internally
 */
export interface CanvasActions {
  addComponent: (component: Omit<DesignComponent, 'id'> & { id?: string }) => string;
  moveComponent: (id: string, x: number, y: number) => void;
  updateComponent: (id: string, patch: Partial<DesignComponent>) => void;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null, multi?: boolean) => void;
  clearSelection: () => void;
  addConnection: (conn: Omit<Connection, 'id'> & { id?: string }) => string;
  updateConnection: (id: string, patch: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  setActiveLayer: (layerId: string | null) => void;
  addLayer: (layer: Omit<Layer, 'order'> & { order?: number }) => void;
  setTool: (tool: ToolType) => void;
  setGridConfig: (cfg: GridConfig) => void;
  applyTemplate: (templateName: string) => void;
  exportJSON: () => Promise<string>;
  exportPNG: (element: HTMLElement) => Promise<string>;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  forceSave: () => void;
  addMultipleComponents: (components: Array<Omit<DesignComponent, 'id'> & { id?: string }>) => string[];
  moveMultipleComponents: (ids: string[], deltaX: number, deltaY: number) => void;
  duplicateComponent: (id: string) => string | null;
  // React Flow specific helpers (optional, for advanced use cases)
  batchUpdateComponents: (updates: Array<{ id: string; patch: Partial<DesignComponent> }>) => void;
  batchUpdateConnections: (updates: Array<{ id: string; patch: Partial<Connection> }>) => void;
}

export interface CanvasOrchestratorValue extends CanvasState, CanvasActions {
  // DI service bridge methods
  getDIServices?: () => { canvas: ICanvasService; persistence: IPersistenceService } | null;
  isDIEnabled?: () => boolean;
}

const CanvasOrchestratorContext = createContext<CanvasOrchestratorValue | null>(null);

export interface CanvasOrchestratorProviderProps {
  initialData: DesignData;
  projectId?: string;
  children: React.ReactNode;
  useDependencyInjection?: boolean;
}

export function CanvasOrchestratorProvider({ initialData, projectId, children, useDependencyInjection = false }: CanvasOrchestratorProviderProps) {
  // Resolve DI services when enabled
  const diEnabled = !!useDependencyInjection;
  const diCanvasService = diEnabled ? (useService(CANVAS_SERVICE) as ICanvasService) : null;
  const diPersistenceService = diEnabled ? (useService(PERSISTENCE_SERVICE) as IPersistenceService) : null;
  // Create the state object for undo/redo management
  const createStateSnapshot = useCallback((data: {
    components: DesignComponent[];
    connections: Connection[];
    layers: Layer[];
    selectedComponentId: string | null;
    selectedComponentIds: string[];
    activeLayerId: string | null;
    activeTool: ToolType;
    gridConfig: GridConfig;
  }) => data, []);

  const initialState = useMemo(() => createStateSnapshot({
    components: initialData.components || [],
    connections: initialData.connections || [],
    layers: initialData.layers?.length ? initialData.layers : [{ id: 'default', name: 'Default Layer', visible: true, order: 0 }],
    selectedComponentId: null,
    selectedComponentIds: [],
    activeLayerId: initialData.layers?.length ? initialData.layers[0].id : 'default',
    activeTool: initialData.activeTool || 'select',
    gridConfig: initialData.gridConfig || { visible: false, spacing: 20, snapToGrid: false }
  }), [initialData, createStateSnapshot]);

  // Undo/Redo functionality
  const {
    state: currentState,
    canUndo,
    canRedo,
    pushState,
    undo: undoState,
    redo: redoState,
    clearHistory
  } = useUndoRedo(initialState, { maxHistorySize: 50, enableGlobalShortcuts: true });

  // Destructure current state
  const {
    components,
    connections,
    layers,
    selectedComponentId,
    selectedComponentIds,
    activeLayerId,
    activeTool,
    gridConfig
  } = currentState;

  // Helper to push new state with validation
  const updateState = useCallback((newState: Partial<typeof currentState>) => {
    const updatedState = { ...currentState, ...newState };
    pushState(updatedState);
  }, [currentState, pushState]);

  const telemetry = useCanvasTelemetry();
  // Base persistence (non-DI) for fallback
  const basePersistence = useMemo(() => new CanvasPersistence(projectId), [projectId]);
  // Select DI persistence when enabled, otherwise use base
  const persistence = useMemo(
    () => (diEnabled && diPersistenceService ? diPersistenceService : basePersistence),
    [diEnabled, diPersistenceService, basePersistence]
  );
  const templates = useMemo(() => new TemplateEngine(), []);

  // Auto-save functionality
  const saveDesignData = useCallback(async (data: typeof currentState) => {
    const designData: DesignData = {
      components: data.components,
      connections: data.connections,
      layers: data.layers,
      gridConfig: data.gridConfig,
      activeTool: data.activeTool,
      metadata: {
        lastModified: new Date().toISOString(),
        created: initialData.metadata?.created || new Date().toISOString(),
        version: '1.0'
      }
    };
    await persistence.saveDesign(designData);
  }, [persistence, initialData.metadata]);

  const { isSaving, forceSave: forceSaveInternal, status: saveStatus, lastSavedAt } = useAutoSave(
    currentState,
    saveDesignData,
    { delay: 2000, enabled: true }
  );

  // Bridge functions for DI service integration
  const getDIServices = useCallback(() => {
    if (diEnabled && diCanvasService && diPersistenceService) {
      return {
        canvas: diCanvasService,
        persistence: diPersistenceService,
      };
    }
    return null;
  }, [diEnabled, diCanvasService, diPersistenceService]);

  const isDIEnabled = useCallback(() => {
    return diEnabled && !!diCanvasService && !!diPersistenceService;
  }, [diEnabled, diCanvasService, diPersistenceService]);

  // Sync orchestrator state with DI services
  const syncWithDIServices = useCallback(() => {
    if (diCanvasService && diEnabled) {
      try {
        // Sync orchestrator state to DI service
        const designData: DesignData = {
          components,
          connections,
          layers,
          gridConfig,
          activeTool,
          metadata: {
            lastModified: new Date().toISOString(),
          },
        };

        // Update DI service state (this is a bridge function)
        if (diCanvasService.importDesign) {
          diCanvasService.importDesign(designData);
        }
      } catch (error) {
        console.warn('Failed to sync with DI services:', error);
      }
    }
  }, [diCanvasService, diEnabled, components, connections, layers, gridConfig, activeTool]);

  // Force save wrapper that works with both DI and direct services
  const forceSave = useCallback(() => {
    forceSaveInternal();
    // Also sync with DI services if enabled
    if (diEnabled) {
      syncWithDIServices();
    }
  }, [forceSaveInternal, diEnabled, syncWithDIServices]);

  // Sync with DI services when state changes
  React.useEffect(() => {
    if (diEnabled) {
      syncWithDIServices();
    }
  }, [diEnabled, syncWithDIServices, currentState]);

  const setGridConfig = useCallback((cfg: GridConfig) => {
    updateState({ gridConfig: { ...cfg } });
    telemetry.trackCanvasAction('grid-config-change', { config: cfg });
  }, [updateState, telemetry]);

  const addComponent: CanvasActions['addComponent'] = useCallback(
    comp => {
      const id = comp.id ?? `${comp.type}-${Date.now()}`;
      const withId: DesignComponent = { layerId: activeLayerId || 'default', label: '', ...comp, id } as DesignComponent;
      updateState({ components: [...components, withId] });
      telemetry.trackCanvasAction('component-add', { type: withId.type, id });
      return id;
    },
    [components, activeLayerId, updateState, telemetry]
  );

  const moveComponent: CanvasActions['moveComponent'] = useCallback((id, x, y) => {
    updateState({
      components: components.map(c => (c.id === id ? { ...c, x, y } : c))
    });
    telemetry.trackCanvasAction('component-move', { id, x, y });
  }, [components, updateState, telemetry]);

  const updateComponent: CanvasActions['updateComponent'] = useCallback((id, patch) => {
    updateState({
      components: components.map(c => (c.id === id ? { ...c, ...patch } : c))
    });
    telemetry.trackCanvasAction('component-update', { id, patch });
  }, [components, updateState, telemetry]);

  const deleteComponent: CanvasActions['deleteComponent'] = useCallback((id) => {
    updateState({
      components: components.filter(c => c.id !== id),
      connections: connections.filter(conn => conn.from !== id && conn.to !== id),
      selectedComponentId: selectedComponentId === id ? null : selectedComponentId,
      selectedComponentIds: selectedComponentIds.filter(sid => sid !== id)
    });
    telemetry.trackCanvasAction('component-delete', { id });
  }, [components, connections, selectedComponentId, selectedComponentIds, updateState, telemetry]);

  const selectComponent: CanvasActions['selectComponent'] = useCallback((id, multi) => {
    if (!id) {
      updateState({ selectedComponentId: null, selectedComponentIds: [] });
      return;
    }
    updateState({
      selectedComponentId: id,
      selectedComponentIds: multi ? Array.from(new Set([...selectedComponentIds, id])) : [id]
    });
    telemetry.trackCanvasAction('component-select', { id, multi: !!multi });
  }, [selectedComponentIds, updateState, telemetry]);

  const clearSelection: CanvasActions['clearSelection'] = useCallback(() => {
    updateState({ selectedComponentId: null, selectedComponentIds: [] });
  }, [updateState]);

  const addConnection: CanvasActions['addConnection'] = useCallback(conn => {
    const id = conn.id ?? `conn-${Date.now()}`;
    const withId: Connection = { label: '', direction: 'end', protocol: undefined, ...conn, id } as Connection;
    updateState({ connections: [...connections, withId] });
    telemetry.trackCanvasAction('connection-add', { id, from: withId.from, to: withId.to, type: withId.type });
    return id;
  }, [connections, updateState, telemetry]);

  const updateConnection: CanvasActions['updateConnection'] = useCallback((id, patch) => {
    updateState({
      connections: connections.map(c => (c.id === id ? { ...c, ...patch } : c))
    });
    telemetry.trackCanvasAction('connection-update', { id, patch });
  }, [connections, updateState, telemetry]);

  const deleteConnection: CanvasActions['deleteConnection'] = useCallback((id) => {
    updateState({ connections: connections.filter(c => c.id !== id) });
    telemetry.trackCanvasAction('connection-delete', { id });
  }, [connections, updateState, telemetry]);

  const setActiveLayer: CanvasActions['setActiveLayer'] = useCallback((layerId) => {
    updateState({ activeLayerId: layerId });
    telemetry.trackCanvasAction('layer-activate', { layerId });
  }, [updateState, telemetry]);

  const addLayer: CanvasActions['addLayer'] = useCallback(layer => {
    const order = layer.order ?? layers.length;
    updateState({ layers: [...layers, { ...layer, order }] });
    telemetry.trackCanvasAction('layer-add', { id: layer.id });
  }, [layers, updateState, telemetry]);

  const setTool: CanvasActions['setTool'] = useCallback(tool => {
    updateState({ activeTool: tool });
    telemetry.trackCanvasAction('tool-change', { tool });
  }, [updateState, telemetry]);

  const applyTemplate: CanvasActions['applyTemplate'] = useCallback((templateName: string) => {
    const result = templates.applyTemplate(templateName);
    if (result) {
      updateState({
        components: [...components, ...result.components],
        connections: [...connections, ...result.connections]
      });
      telemetry.trackTemplateUsage(templateName, { addedComponents: result.components.length });
    }
  }, [templates, components, connections, updateState, telemetry]);

  const exportJSON: CanvasActions['exportJSON'] = useCallback(async () => {
    const data: DesignData = {
      components,
      connections,
      layers,
      gridConfig,
      activeTool,
      metadata: {
        lastModified: new Date().toISOString(),
        created: initialData.metadata?.created || new Date().toISOString(),
        version: '1.0'
      },
    };
    return persistence.exportJSON(data);
  }, [components, connections, layers, gridConfig, activeTool, persistence, initialData.metadata]);

  const exportPNG: CanvasActions['exportPNG'] = useCallback(async (el: HTMLElement) => {
    return persistence.exportPNG(el);
  }, [persistence]);

  // New batch operations for better performance
  const addMultipleComponents: CanvasActions['addMultipleComponents'] = useCallback((comps) => {
    const newComponents = comps.map(comp => {
      const id = comp.id ?? `${comp.type}-${Date.now()}-${Math.random()}`;
      return { layerId: activeLayerId || 'default', label: '', ...comp, id } as DesignComponent;
    });
    updateState({ components: [...components, ...newComponents] });
    telemetry.trackCanvasAction('components-batch-add', { count: newComponents.length });
    return newComponents.map(c => c.id);
  }, [components, activeLayerId, updateState, telemetry]);

  const moveMultipleComponents: CanvasActions['moveMultipleComponents'] = useCallback((ids, deltaX, deltaY) => {
    updateState({
      components: components.map(c =>
        ids.includes(c.id) ? { ...c, x: c.x + deltaX, y: c.y + deltaY } : c
      )
    });
    telemetry.trackCanvasAction('components-batch-move', { count: ids.length, deltaX, deltaY });
  }, [components, updateState, telemetry]);

  const duplicateComponent: CanvasActions['duplicateComponent'] = useCallback((id) => {
    const component = components.find(c => c.id === id);
    if (!component) return null;

    const newId = `${component.type}-${Date.now()}`;
    const duplicated: DesignComponent = {
      ...component,
      id: newId,
      x: component.x + 20,
      y: component.y + 20,
      label: `${component.label} Copy`
    };

    updateState({ components: [...components, duplicated] });
    telemetry.trackCanvasAction('component-duplicate', { originalId: id, newId });
    return newId;
  }, [components, updateState, telemetry]);

  // Batch operations for React Flow performance optimization
  const batchUpdateComponents: CanvasActions['batchUpdateComponents'] = useCallback((updates) => {
    const updatedComponents = components.map(component => {
      const update = updates.find(u => u.id === component.id);
      return update ? { ...component, ...update.patch } : component;
    });
    updateState({ components: updatedComponents });
    telemetry.trackCanvasAction('components-batch-update', { count: updates.length });
  }, [components, updateState, telemetry]);

  const batchUpdateConnections: CanvasActions['batchUpdateConnections'] = useCallback((updates) => {
    const updatedConnections = connections.map(connection => {
      const update = updates.find(u => u.id === connection.id);
      return update ? { ...connection, ...update.patch } : connection;
    });
    updateState({ connections: updatedConnections });
    telemetry.trackCanvasAction('connections-batch-update', { count: updates.length });
  }, [connections, updateState, telemetry]);

  // Undo/Redo actions
  const undo = useCallback(() => {
    undoState();
    telemetry.trackCanvasAction('undo', {});
  }, [undoState, telemetry]);

  const redo = useCallback(() => {
    redoState();
    telemetry.trackCanvasAction('redo', {});
  }, [redoState, telemetry]);

  const value = useMemo<CanvasOrchestratorValue>(() => ({
    components,
    connections,
    layers,
    selectedComponentId,
    selectedComponentIds,
    activeLayerId,
    activeTool,
    gridConfig,
    canUndo,
    canRedo,
    lastSavedAt,
    isSaving,
    saveStatus,
    addComponent,
    moveComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    clearSelection,
    addConnection,
    updateConnection,
    deleteConnection,
    setActiveLayer,
    addLayer,
    setTool,
    setGridConfig,
    applyTemplate,
    exportJSON,
    exportPNG,
    undo,
    redo,
    clearHistory,
    forceSave,
    addMultipleComponents,
    moveMultipleComponents,
    duplicateComponent,
    batchUpdateComponents,
    batchUpdateConnections,
    // DI service bridge methods
    getDIServices,
    isDIEnabled
  }), [
    components,
    connections,
    layers,
    selectedComponentId,
    selectedComponentIds,
    activeLayerId,
    activeTool,
    gridConfig,
    canUndo,
    canRedo,
    lastSavedAt,
    isSaving,
    saveStatus,
    addComponent,
    moveComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    clearSelection,
    addConnection,
    updateConnection,
    deleteConnection,
    setActiveLayer,
    addLayer,
    setTool,
    setGridConfig,
    applyTemplate,
    exportJSON,
    exportPNG,
    undo,
    redo,
    clearHistory,
    forceSave,
    addMultipleComponents,
    moveMultipleComponents,
    duplicateComponent,
    batchUpdateComponents,
    batchUpdateConnections,
    getDIServices,
    isDIEnabled
  ]);

  // Bridge orchestrator to DI canvas service
  React.useEffect(() => {
    if (diEnabled && (diCanvasService as any)?.setOrchestrator) {
      (diCanvasService as any).setOrchestrator(value as any);
    }
  }, [diEnabled, diCanvasService, value]);

  return (
    <CanvasOrchestratorContext.Provider value={value}>{children}</CanvasOrchestratorContext.Provider>
  );
}

export function useCanvas() {
  const ctx = useContext(CanvasOrchestratorContext);
  if (!ctx) throw new Error('useCanvas must be used within CanvasOrchestratorProvider');
  return ctx;
}
