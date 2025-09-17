// src/services/canvas/CanvasService.ts
// Concrete implementation of the canvas service that wraps CanvasOrchestrator functionality
// Provides a clean service interface for canvas operations with state management
// RELEVANT FILES: src/lib/di/ServiceInterfaces.ts, src/services/canvas/CanvasOrchestrator.tsx, src/shared/contracts/index.ts

import type {
  ICanvasService,
  IPersistenceService,
  CanvasState,
} from '@/lib/di/ServiceInterfaces';

import type {
  DesignData,
  DesignComponent,
  Connection,
  ToolType,
} from '@/shared/contracts';

/**
 * Canvas service implementation that provides high-level canvas operations
 * This service acts as a facade over the existing CanvasOrchestrator functionality
 * while providing a clean, testable interface for dependency injection
 */
export class CanvasService implements ICanvasService {
  private state: CanvasState;
  private listeners: Set<(state: CanvasState) => void> = new Set();
  private orchestrator: any | null = null; // Reference to CanvasOrchestratorValue
  private history: DesignData[] = [];
  private historyIndex: number = -1;
  private readonly maxHistorySize = 50;

  constructor(private persistenceService: IPersistenceService) {
    // Initialize with empty state
    this.state = {
      components: [],
      connections: [],
      selectedComponents: [],
      activeTool: 'select',
      layers: [],
      gridConfig: { visible: true, spacing: 20, snapToGrid: false },
      canUndo: false,
      canRedo: false,
      isDirty: false,
      isLoading: false,
    };
  }

  /**
   * Get current canvas state snapshot
   */
  getState(): CanvasState {
    return { ...this.state };
  }

  /**
   * Update internal state and notify listeners
   */
  private setState(newState: Partial<CanvasState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  /**
   * Notify all state change listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: CanvasState) => void): () => void {
    this.listeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Add a new component to the canvas
   */
  async addComponent(component: Omit<DesignComponent, 'id'> & { id?: string }): Promise<string> {
    const id = component.id || this.generateId();
    const newComponent: DesignComponent = {
      ...component,
      id,
      x: component.x ?? 0,
      y: component.y ?? 0,
      label: component.label || component.type,
    };

    // Save current state for undo
    this.saveToHistory();

    // Update state
    const updatedComponents = [...this.state.components, newComponent];
    this.setState({
      components: updatedComponents,
      isDirty: true,
      canUndo: true,
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.addComponent) {
      this.orchestrator.addComponent(component);
    }

    return id;
  }

  /**
   * Update an existing component's properties
   */
  async updateComponent(id: string, patch: Partial<DesignComponent>): Promise<void> {
    const componentIndex = this.state.components.findIndex(c => c.id === id);
    if (componentIndex === -1) {
      throw new Error(`Component with id ${id} not found`);
    }

    // Save current state for undo
    this.saveToHistory();

    // Update component
    const updatedComponents = [...this.state.components];
    updatedComponents[componentIndex] = { ...updatedComponents[componentIndex], ...patch };

    this.setState({
      components: updatedComponents,
      isDirty: true,
      canUndo: true,
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.updateComponent) {
      this.orchestrator.updateComponent(id, patch);
    }
  }

  /**
   * Remove a component and its related connections
   */
  async deleteComponent(id: string): Promise<void> {
    const componentExists = this.state.components.some(c => c.id === id);
    if (!componentExists) {
      throw new Error(`Component with id ${id} not found`);
    }

    // Save current state for undo
    this.saveToHistory();

    // Remove component and related connections
    const updatedComponents = this.state.components.filter(c => c.id !== id);
    const updatedConnections = this.state.connections.filter(
      conn => conn.from !== id && conn.to !== id
    );

    // Update selection if deleted component was selected
    const updatedSelection = this.state.selectedComponents.filter(selectedId => selectedId !== id);

    this.setState({
      components: updatedComponents,
      connections: updatedConnections,
      selectedComponents: updatedSelection,
      isDirty: true,
      canUndo: true,
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.deleteComponent) {
      this.orchestrator.deleteComponent(id);
    }
  }

  /**
   * Move a component to a new position
   */
  async moveComponent(id: string, x: number, y: number): Promise<void> {
    await this.updateComponent(id, { x, y });

    // Delegate to orchestrator if available
    if (this.orchestrator?.moveComponent) {
      this.orchestrator.moveComponent(id, x, y);
    }
  }

  /**
   * Create a duplicate of an existing component
   */
  async duplicateComponent(id: string): Promise<string | null> {
    const component = this.state.components.find(c => c.id === id);
    if (!component) {
      return null;
    }

    const duplicateData = {
      ...component,
      id: undefined, // Let addComponent generate new ID
      x: component.x + 20, // Offset duplicate position
      y: component.y + 20,
      label: `${component.label} (Copy)`,
    };

    const newId = await this.addComponent(duplicateData);

    // Delegate to orchestrator if available
    if (this.orchestrator?.duplicateComponent) {
      this.orchestrator.duplicateComponent(id);
    }

    return newId;
  }

  /**
   * Add a new connection between components
   */
  async addConnection(connection: Omit<Connection, 'id'> & { id?: string }): Promise<string> {
    const id = connection.id || this.generateId();

    // Validate connection
    if (!this.validateConnection(connection.from, connection.to)) {
      throw new Error(`Invalid connection from ${connection.from} to ${connection.to}`);
    }

    const newConnection: Connection = {
      ...connection,
      id,
      label: connection.label || '',
      type: connection.type || 'data',
    };

    // Save current state for undo
    this.saveToHistory();

    // Update state
    const updatedConnections = [...this.state.connections, newConnection];
    this.setState({
      connections: updatedConnections,
      isDirty: true,
      canUndo: true,
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.addConnection) {
      this.orchestrator.addConnection(connection);
    }

    return id;
  }

  /**
   * Update an existing connection's properties
   */
  async updateConnection(id: string, patch: Partial<Connection>): Promise<void> {
    const connectionIndex = this.state.connections.findIndex(c => c.id === id);
    if (connectionIndex === -1) {
      throw new Error(`Connection with id ${id} not found`);
    }

    // Save current state for undo
    this.saveToHistory();

    // Update connection
    const updatedConnections = [...this.state.connections];
    updatedConnections[connectionIndex] = { ...updatedConnections[connectionIndex], ...patch };

    this.setState({
      connections: updatedConnections,
      isDirty: true,
      canUndo: true,
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.updateConnection) {
      this.orchestrator.updateConnection(id, patch);
    }
  }

  /**
   * Remove a connection
   */
  async deleteConnection(id: string): Promise<void> {
    const connectionExists = this.state.connections.some(c => c.id === id);
    if (!connectionExists) {
      throw new Error(`Connection with id ${id} not found`);
    }

    // Save current state for undo
    this.saveToHistory();

    // Remove connection
    const updatedConnections = this.state.connections.filter(c => c.id !== id);

    this.setState({
      connections: updatedConnections,
      isDirty: true,
      canUndo: true,
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.deleteConnection) {
      this.orchestrator.deleteConnection(id);
    }
  }

  /**
   * Validate if a connection can be created between two components
   */
  validateConnection(from: string, to: string): boolean {
    if (from === to) {
      return false; // Self-connections not allowed
    }

    const fromComponent = this.state.components.find(c => c.id === from);
    const toComponent = this.state.components.find(c => c.id === to);

    if (!fromComponent || !toComponent) {
      return false; // Both components must exist
    }

    // Check for existing connection
    const existingConnection = this.state.connections.find(
      conn => (conn.from === from && conn.to === to) || (conn.from === to && conn.to === from)
    );

    return !existingConnection; // Duplicate connections not allowed
  }

  /**
   * Select component(s) on the canvas
   */
  selectComponent(id: string | null, multi = false): void {
    let updatedSelection: string[];

    if (id === null) {
      updatedSelection = [];
    } else if (multi) {
      // Toggle selection in multi-select mode
      if (this.state.selectedComponents.includes(id)) {
        updatedSelection = this.state.selectedComponents.filter(selectedId => selectedId !== id);
      } else {
        updatedSelection = [...this.state.selectedComponents, id];
      }
    } else {
      // Single selection
      updatedSelection = [id];
    }

    this.setState({
      selectedComponents: updatedSelection,
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.selectComponent) {
      this.orchestrator.selectComponent(id, multi);
    }
  }

  /**
   * Clear all component selections
   */
  clearSelection(): void {
    this.setState({
      selectedComponents: [],
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.clearSelection) {
      this.orchestrator.clearSelection();
    }
  }

  /**
   * Get currently selected components
   */
  getSelectedComponents(): DesignComponent[] {
    return this.state.components.filter(component =>
      this.state.selectedComponents.includes(component.id)
    );
  }

  /**
   * Set the active tool for canvas interaction
   */
  setActiveTool(tool: ToolType): void {
    this.setState({
      activeTool: tool,
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.setTool) {
      this.orchestrator.setTool(tool);
    }
  }

  /**
   * Save current state to history for undo functionality
   */
  private saveToHistory(): void {
    const currentState: DesignData = {
      components: this.state.components,
      connections: this.state.connections,
      layers: this.state.layers || [],
      gridConfig: this.state.gridConfig,
      activeTool: this.state.activeTool,
      metadata: { lastModified: new Date().toISOString() },
    };

    // Remove future history if we're not at the end
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    // Add new state to history
    this.history.push(currentState);

    // Limit history size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    this.setState({
      canRedo: false, // Clear redo when new action is performed
    });
  }

  /**
   * Undo the last action
   */
  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const previousState = this.history[this.historyIndex];

      this.setState({
        components: previousState.components,
        connections: previousState.connections,
        layers: previousState.layers || [],
        gridConfig: previousState.gridConfig || this.state.gridConfig,
        activeTool: previousState.activeTool || this.state.activeTool,
        canUndo: this.historyIndex > 0,
        canRedo: true,
        isDirty: true,
      });

      // Delegate to orchestrator if available
      if (this.orchestrator?.undo) {
        this.orchestrator.undo();
      }
    }
  }

  /**
   * Redo the last undone action
   */
  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const nextState = this.history[this.historyIndex];

      this.setState({
        components: nextState.components,
        connections: nextState.connections,
        layers: nextState.layers || [],
        gridConfig: nextState.gridConfig || this.state.gridConfig,
        activeTool: nextState.activeTool || this.state.activeTool,
        canUndo: true,
        canRedo: this.historyIndex < this.history.length - 1,
        isDirty: true,
      });

      // Delegate to orchestrator if available
      if (this.orchestrator?.redo) {
        this.orchestrator.redo();
      }
    }
  }

  /**
   * Check if undo operation is available
   */
  canUndo(): boolean {
    return this.state.canUndo;
  }

  /**
   * Check if redo operation is available
   */
  canRedo(): boolean {
    return this.state.canRedo;
  }

  /**
   * Clear the undo/redo history
   */
  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;

    this.setState({
      canUndo: false,
      canRedo: false,
    });

    // Delegate to orchestrator if available
    if (this.orchestrator?.clearHistory) {
      this.orchestrator.clearHistory();
    }
  }

  /**
   * Export the current design data
   */
  async exportDesign(): Promise<DesignData> {
    const designData: DesignData = {
      schemaVersion: 1,
      components: this.state.components,
      connections: this.state.connections,
      layers: this.state.layers || [],
      gridConfig: this.state.gridConfig,
      activeTool: this.state.activeTool,
      metadata: {
        lastModified: new Date().toISOString(),
        version: '1.0',
      },
    };

    return designData;
  }

  /**
   * Import design data into the canvas
   */
  async importDesign(data: DesignData): Promise<void> {
    // Validate data before importing
    const validation = this.persistenceService.validateData(data);
    if (!validation.isValid) {
      throw new Error(`Invalid design data: ${validation.errors.join(', ')}`);
    }

    // Save current state for undo
    this.saveToHistory();

    // Import data
    this.setState({
      components: data.components || [],
      connections: data.connections || [],
      layers: data.layers || [],
      gridConfig: data.gridConfig || this.state.gridConfig,
      activeTool: data.activeTool || 'select',
      selectedComponents: [], // Clear selection on import
      isDirty: true,
      canUndo: true,
    });

    // Sync with orchestrator if available
    this.syncWithOrchestrator();
  }

  /**
   * Save current design using persistence service
   */
  async saveDesign(): Promise<void> {
    this.setState({ isLoading: true });

    try {
      const designData = await this.exportDesign();
      await this.persistenceService.saveDesign(designData);

      this.setState({
        isDirty: false,
        isLoading: false,
      });
    } catch (error) {
      this.setState({ isLoading: false });
      throw error;
    }
  }

  /**
   * Load design from persistence service
   */
  async loadDesign(projectId?: string): Promise<void> {
    this.setState({ isLoading: true });

    try {
      if (projectId) {
        this.persistenceService.setProjectId(projectId);
      }

      const data = await this.persistenceService.loadDesign(projectId);
      if (data) {
        await this.importDesign(data);
      }

      this.setState({ isLoading: false });
    } catch (error) {
      this.setState({ isLoading: false });
      throw error;
    }
  }

  /**
   * Set orchestrator reference for backward compatibility
   */
  setOrchestrator(orchestrator: any): void {
    this.orchestrator = orchestrator;
    this.syncWithOrchestrator();
  }

  /**
   * Synchronize state with orchestrator
   */
  private syncWithOrchestrator(): void {
    if (this.orchestrator) {
      // Sync state from orchestrator to service
      try {
        if (this.orchestrator.components) {
          this.setState({
            components: [...this.orchestrator.components],
            connections: [...(this.orchestrator.connections || [])],
            activeTool: this.orchestrator.activeTool || 'select',
          });
        }
      } catch (error) {
        console.warn('Failed to sync with orchestrator:', error);
      }
    }
  }

  /**
   * Generate a unique ID for components and connections
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
