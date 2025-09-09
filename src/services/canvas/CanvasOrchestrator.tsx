import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type {
  DesignComponent,
  Connection,
  Layer,
  GridConfig,
  ToolType,
  DesignData,
} from '@/shared/contracts';
import { useCanvasTelemetry } from './CanvasTelemetry';
import { CanvasPersistence } from './CanvasPersistence';
import { TemplateEngine } from './TemplateEngine';

export interface CanvasState {
  components: DesignComponent[];
  connections: Connection[];
  layers: Layer[];
  selectedComponentId: string | null;
  selectedComponentIds: string[];
  activeLayerId: string | null;
  activeTool: ToolType;
  gridConfig: GridConfig;
}

export interface CanvasActions {
  addComponent: (component: Omit<DesignComponent, 'id'> & { id?: string }) => string;
  moveComponent: (id: string, x: number, y: number) => void;
  updateComponent: (id: string, patch: Partial<DesignComponent>) => void;
  deleteComponent: (id: string) => void;
  selectComponent: (id: string | null, multi?: boolean) => void;
  clearSelection: () => void;
  addConnection: (conn: Omit<Connection, 'id'> & { id?: string }) => string;
  deleteConnection: (id: string) => void;
  setActiveLayer: (layerId: string | null) => void;
  addLayer: (layer: Omit<Layer, 'order'> & { order?: number }) => void;
  setTool: (tool: ToolType) => void;
  setGridConfig: (cfg: GridConfig) => void;
  applyTemplate: (templateName: string) => void;
  exportJSON: () => Promise<string>;
  exportPNG: (element: HTMLElement) => Promise<string>;
}

export interface CanvasOrchestratorValue extends CanvasState, CanvasActions {}

const CanvasOrchestratorContext = createContext<CanvasOrchestratorValue | null>(null);

export interface CanvasOrchestratorProviderProps {
  initialData: DesignData;
  projectId?: string;
  children: React.ReactNode;
}

export function CanvasOrchestratorProvider({ initialData, projectId, children }: CanvasOrchestratorProviderProps) {
  const [components, setComponents] = useState<DesignComponent[]>(initialData.components || []);
  const [connections, setConnections] = useState<Connection[]>(initialData.connections || []);
  const [layers, setLayers] = useState<Layer[]>(
    initialData.layers?.length ? initialData.layers : [{ id: 'default', name: 'Default Layer', visible: true, order: 0 }]
  );
  const [activeLayerId, setActiveLayerId] = useState<string | null>(layers[0]?.id ?? 'default');
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>(initialData.activeTool || 'select');
  const [gridConfig, setGridConfigState] = useState<GridConfig>(
    initialData.gridConfig || { visible: false, spacing: 20, snapToGrid: false }
  );

  const telemetry = useCanvasTelemetry();
  const persistence = useMemo(() => new CanvasPersistence(projectId), [projectId]);
  const templates = useMemo(() => new TemplateEngine(), []);

  const setGridConfig = useCallback((cfg: GridConfig) => setGridConfigState({ ...cfg }), []);

  const addComponent: CanvasActions['addComponent'] = useCallback(
    comp => {
      const id = comp.id ?? `${comp.type}-${Date.now()}`;
      const withId: DesignComponent = { layerId: activeLayerId || 'default', label: '', ...comp, id } as DesignComponent;
      setComponents(prev => [...prev, withId]);
      telemetry.trackCanvasAction('component-add', { type: withId.type, id });
      return id;
    },
    [activeLayerId, telemetry]
  );

  const moveComponent: CanvasActions['moveComponent'] = useCallback((id, x, y) => {
    setComponents(prev => prev.map(c => (c.id === id ? { ...c, x, y } : c)));
    telemetry.trackCanvasAction('component-move', { id, x, y });
  }, [telemetry]);

  const updateComponent: CanvasActions['updateComponent'] = useCallback((id, patch) => {
    setComponents(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
    telemetry.trackCanvasAction('component-update', { id, patch });
  }, [telemetry]);

  const deleteComponent: CanvasActions['deleteComponent'] = useCallback((id) => {
    setComponents(prev => prev.filter(c => c.id !== id));
    setConnections(prev => prev.filter(conn => conn.from !== id && conn.to !== id));
    telemetry.trackCanvasAction('component-delete', { id });
  }, [telemetry]);

  const selectComponent: CanvasActions['selectComponent'] = useCallback((id, multi) => {
    if (!id) {
      setSelectedComponentId(null);
      setSelectedComponentIds([]);
      return;
    }
    setSelectedComponentId(id);
    setSelectedComponentIds(prev => (multi ? Array.from(new Set([...prev, id])) : [id]));
    telemetry.trackCanvasAction('component-select', { id, multi: !!multi });
  }, [telemetry]);

  const clearSelection: CanvasActions['clearSelection'] = useCallback(() => {
    setSelectedComponentId(null);
    setSelectedComponentIds([]);
  }, []);

  const addConnection: CanvasActions['addConnection'] = useCallback(conn => {
    const id = conn.id ?? `conn-${Date.now()}`;
    const withId: Connection = { label: '', direction: 'end', protocol: undefined, ...conn, id } as Connection;
    setConnections(prev => [...prev, withId]);
    telemetry.trackCanvasAction('connection-add', { id, from: withId.from, to: withId.to, type: withId.type });
    return id;
  }, [telemetry]);

  const deleteConnection: CanvasActions['deleteConnection'] = useCallback((id) => {
    setConnections(prev => prev.filter(c => c.id !== id));
    telemetry.trackCanvasAction('connection-delete', { id });
  }, [telemetry]);

  const setActiveLayer: CanvasActions['setActiveLayer'] = useCallback((layerId) => {
    setActiveLayerId(layerId);
    telemetry.trackCanvasAction('layer-activate', { layerId });
  }, [telemetry]);

  const addLayer: CanvasActions['addLayer'] = useCallback(layer => {
    setLayers(prev => {
      const order = layer.order ?? prev.length;
      return [...prev, { ...layer, order }];
    });
    telemetry.trackCanvasAction('layer-add', { id: layer.id });
  }, [telemetry]);

  const setTool: CanvasActions['setTool'] = useCallback(tool => {
    setActiveTool(tool);
    telemetry.trackCanvasAction('tool-change', { tool });
  }, [telemetry]);

  const applyTemplate: CanvasActions['applyTemplate'] = useCallback((templateName: string) => {
    const result = templates.applyTemplate(templateName);
    if (result) {
      setComponents(prev => [...prev, ...result.components]);
      setConnections(prev => [...prev, ...result.connections]);
      telemetry.trackTemplateUsage(templateName, { addedComponents: result.components.length });
    }
  }, [templates, telemetry]);

  const exportJSON: CanvasActions['exportJSON'] = useCallback(async () => {
    const data: DesignData = {
      components,
      connections,
      layers,
      gridConfig,
      activeTool,
      metadata: { lastModified: new Date().toISOString() },
    };
    return persistence.exportJSON(data);
  }, [components, connections, layers, gridConfig, activeTool, persistence]);

  const exportPNG: CanvasActions['exportPNG'] = useCallback(async (el: HTMLElement) => {
    return persistence.exportPNG(el);
  }, [persistence]);

  const value = useMemo<CanvasOrchestratorValue>(() => ({
    components,
    connections,
    layers,
    selectedComponentId,
    selectedComponentIds,
    activeLayerId,
    activeTool,
    gridConfig,
    addComponent,
    moveComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    clearSelection,
    addConnection,
    deleteConnection,
    setActiveLayer,
    addLayer,
    setTool,
    setGridConfig,
    applyTemplate,
    exportJSON,
    exportPNG,
  }), [
    components,
    connections,
    layers,
    selectedComponentId,
    selectedComponentIds,
    activeLayerId,
    activeTool,
    gridConfig,
    addComponent,
    moveComponent,
    updateComponent,
    deleteComponent,
    selectComponent,
    clearSelection,
    addConnection,
    deleteConnection,
    setActiveLayer,
    addLayer,
    setTool,
    setGridConfig,
    applyTemplate,
    exportJSON,
    exportPNG,
  ]);

  return (
    <CanvasOrchestratorContext.Provider value={value}>{children}</CanvasOrchestratorContext.Provider>
  );
}

export function useCanvas() {
  const ctx = useContext(CanvasOrchestratorContext);
  if (!ctx) throw new Error('useCanvas must be used within CanvasOrchestratorProvider');
  return ctx;
}

