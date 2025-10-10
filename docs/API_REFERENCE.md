````markdown
# ArchiComm API Reference

This document summarizes the public interfaces of major modules, components, hooks, services, and utilities. Refer to the source files for the most accurate signatures and usage details.

Sources:
- Feature Modules: `src/modules/`
- UI Components: `src/packages/ui/`
- Shared Hooks: `src/shared/hooks/`
- Libraries: `src/lib/`
- State Stores: `src/stores/`
- Services: `src/services/`

## Canvas Module API

The canvas module (`src/modules/canvas/`) provides the core drawing and diagramming functionality.

### Canvas Components
- **Canvas**: Main canvas component for architectural diagrams
- **CanvasArea**: Viewport management (zoom/pan) and interaction layer
- **ComponentPalette**: Draggable component library sidebar
- **CanvasToolbar**: Tools, modes, import/export controls

### Canvas State Management
- **canvasStore**: Zustand store for canvas state, components, and connections (`src/stores/canvasStore.ts`)
- **AppStore**: Main application state including user preferences (`src/stores/AppStore.ts`)
- **Component-level state**: Individual canvas components manage their own selection and interaction state

### Drawing System
- **DrawingEngine**: Core rendering system for canvas elements
- **CanvasRenderer**: Optimized rendering with viewport culling
- **InteractionManager**: Handles mouse, touch, and keyboard interactions

## UI Components Library

The UI package (`src/packages/ui/`) provides reusable components across the application.

### Core Components
- **Button**: Primary, secondary, and tertiary button variants
- **Dialog**: Modal dialogs with backdrop and keyboard navigation
- **Toast**: Notification system with different severity levels
- **Input**: Form inputs with validation states
- **Select**: Dropdown selection component
- **Tooltip**: Context-sensitive help tooltips

### Specialized Components  
- **UXRecommendationToast**: Displays UX optimization suggestions
- **AnnotationEditor**: Rich text editor for annotations
- **ComponentIcon**: Renders architecture component icons
- **LoadingSpinner**: Animated loading indicators

### Layout Components
- **Panel**: Resizable sidebar panels
- **Toolbar**: Horizontal tool collections
- **Grid**: Responsive grid system
- **Stack**: Flexible layout containers

Each component follows a consistent API pattern with TypeScript interfaces for props and callbacks.

## User Experience API

### UX Optimizer
- **File**: `src/lib/user-experience/UXOptimizer.ts`  
- **Purpose**: Tracks user behavior and provides personalized recommendations
- **Key Methods**:
  - `trackAction(action)`: Record user interactions
  - `getRecommendations()`: Get personalized UX suggestions
  - `measureSatisfaction()`: Calculate user satisfaction score
  - `optimizeInterface()`: Apply adaptive UI changes

### Workflow Optimizer  
- **File**: `src/lib/user-experience/WorkflowOptimizer.ts`
- **Purpose**: Analyzes workflow patterns and suggests optimizations
- **Key Methods**:
  - `trackAction(type, duration, success, context)`: Record workflow actions
  - `generateRecommendations()`: Get workflow improvement suggestions
  - `getWorkflowPatterns(category?)`: Retrieve detected patterns
  - `getOptimizationSuggestions(patternId?)`: Get specific optimizations

### UX Tracker Hook
- **File**: `src/shared/hooks/common/useUXTracker.ts`
- **Purpose**: Convenient hook for tracking user interactions
- **Methods**:
  - `trackNavigation(screen, previousScreen)`: Track page navigation
  - `trackCanvasAction(actionType, data, success)`: Track canvas interactions
  - `trackDialogAction(actionType, dialogType, data)`: Track dialog usage
  - `trackKeyboardShortcut(shortcut, action, success)`: Track shortcuts
  - `trackPerformance(metric, value, context?)`: Track performance metrics

## Services API

### Platform Services
- **Tauri Service**: Native desktop integration (`src/services/tauri/`)
  - File operations and persistence
  - Native dialogs for import/export
  - System integration features
- **Web Service**: Browser fallback (`src/services/web/`)
  - LocalStorage-based persistence
  - Web API implementations
  - Progressive enhancement

### State Management
- **Canvas Store** (`src/stores/canvasStore.ts`): Canvas state and components
- **App Store** (`src/stores/AppStore.ts`): User preferences, authentication, and main application state
- **Simple App Store** (`src/stores/SimpleAppStore.ts`): Simplified state management utilities

### Logging & Monitoring
- **Logger** (`src/lib/logging/logger.ts`): Structured application logging
- **Error Store** (`src/lib/logging/errorStore.ts`): Error tracking and reporting
- **Performance Monitor** (`src/shared/utils/performanceMonitor.ts`): Performance metrics

## Hooks API

### Canvas Hooks (`src/packages/ui/components/DesignCanvas/hooks/`)
- **useDesignCanvasState**: Main canvas state management and updates
- **useDesignCanvasCallbacks**: Event handlers and user interactions
- **useDesignCanvasPerformance**: Performance monitoring and optimization
- **useCanvasKeyboardNavigation**: Keyboard shortcuts and navigation
- **useDesignCanvasImportExport**: Import/export functionality

### Shared Hooks (`src/shared/hooks/`)
- **useUXTracker**: User experience and interaction tracking
- **useAutoSave**: Automatic saving with debouncing
- **useKeyboardShortcuts**: Global keyboard shortcut handling
- **usePerformanceMonitoring**: Performance metrics collection
- **usePlatform**: Platform detection (Tauri vs web)

### UI Hooks (`src/packages/ui/hooks/`)
- **useDialog**: Dialog state management
- **useToast**: Toast notification system
- **useTheme**: Theme switching and persistence
- **useLocalStorage**: Typed localStorage operations

Typical usage pattern:
```ts
const { trackCanvasAction, trackNavigation } = useUXTracker();
const { save, load, isDesktop } = usePlatform();
```

## Types & Utilities

### Core Types (`src/packages/types/`)
- **Canvas Types**: Component, connection, and diagram interfaces
- **UI Types**: Component props and event handler interfaces  
- **User Types**: User preferences, settings, and authentication
- **API Types**: Service interfaces and data transfer objects

### Utilities (`src/lib/utils/`)
- **Geometry Utils**: Point, rectangle, and transformation calculations
- **Color Utils**: Color manipulation and theme utilities
- **Format Utils**: Data formatting and validation helpers
- **Performance Utils**: Debouncing, throttling, and optimization tools

### Validation (`src/lib/validation/`)
- **Schema Validation**: TypeScript runtime validation
- **Input Sanitization**: User input cleaning and validation
- **Data Integrity**: Diagram and state consistency checks

## Usage Examples

### Canvas Component Usage
```tsx
import { DesignCanvas } from '@/packages/ui/components/DesignCanvas';
import { useDesignCanvasState } from '@/packages/ui/components/DesignCanvas/hooks/useDesignCanvasState';

function ArchitectureDiagram() {
  const { components, connections, addComponent } = useDesignCanvasState();
  
  return (
    <DesignCanvas
      components={components}
      connections={connections}
      onComponentAdd={addComponent}
      readOnly={false}
    />
  );
}
```

### UX Tracking Integration
```tsx
import { useUXTracker } from '@/shared/hooks/common/useUXTracker';

function MyComponent() {
  const { trackCanvasAction, trackDialogAction } = useUXTracker();
  
  const handleSave = () => {
    trackCanvasAction('save-diagram', { diagramId: 'abc123' }, true);
    // save logic...
  };
  
  const handleDialogOpen = () => {
    trackDialogAction('open', 'properties-dialog', { componentId: 'comp1' });
  };
  
  return (
    <div>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleDialogOpen}>Edit Properties</button>
    </div>
  );
}
```

### State Store Usage
```tsx
import { useCanvasStore } from '@/stores/canvasStore';
import { useAnnotationStore } from '@/stores/annotationStore';

function DiagramEditor() {
  const { 
    components, 
    addComponent, 
    removeComponent 
  } = useCanvasStore();
  
  const { 
    annotations, 
    addAnnotation 
  } = useAnnotationStore();
  
  // component implementation...
}
```
