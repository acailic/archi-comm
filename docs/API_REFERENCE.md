# ArchiComm API Reference

This document summarizes the public interfaces of major modules, components, hooks, services, and utilities. Refer to the source files for the most accurate signatures and usage details.

Sources:
- Components: `src/components`
- Hooks: `src/hooks`, `src/lib/hooks`
- Services: `src/services`, `src/lib/tauri.ts`
- Tasks & Plugins: `src/lib/task-system`
- Shared types and utilities: `src/shared`, `src/lib`

## Canvas API

### DesignCanvas
- File: `src/components/DesignCanvas.tsx`
- Role: Orchestrates canvas state, tools, selection, and persistence.
- Key responsibilities:
  - Initializes canvas model and performance tracking
  - Coordinates `CanvasArea` and `CanvasComponent` rendering
  - Persists and restores diagrams (via Tauri/web fallback services)
- Typical props:
  - `initialNodes`: array of nodes/components for initial render
  - `initialConnections`: array of edges/links
  - `onChange(diagram)`: callback when diagram changes
  - `readOnly?: boolean`

### CanvasArea
- File: `src/components/CanvasArea.tsx`
- Role: Viewport management (zoom/pan) and interaction layer (selection, hit-testing).
- Typical props:
  - `viewport`: `{ x: number, y: number, zoom: number }`
  - `onViewportChange(viewport)`
  - `onSelectionChange(selection)`
  - `children` (render props or React children)
- Typical methods/events:
  - Mouse and keyboard handlers for pan, zoom, marquee select

### CanvasComponent
- File: `src/components/CanvasComponent.tsx`
- Role: Render a single node/component on the canvas and manage its interactions.
- Typical props:
  - `id: string`
  - `type: string` (e.g., server, db, queue)
  - `label?: string`
  - `position: { x: number; y: number }`
  - `size?: { width: number; height: number }`
  - `selected?: boolean`
  - `onMove?(pos)` / `onResize?(size)` / `onSelect?(id)`

### CanvasAnnotations and Presets
- Files: `src/lib/canvas/CanvasAnnotations.ts`, `src/lib/canvas/annotation-presets.ts`
- Purpose: Annotation rendering and standard presets (SLIs/SLOs, risks, notes).

## Component System

Notable components and their roles:
- `ComponentPalette.tsx` — palette for adding components
- `CanvasToolbar.tsx` — tools, modes, import/export, and hints toggles
- `PropertiesPanel.tsx` — property editor for selected component
- `Minimap.tsx` — overview with viewport indicator
- `PerformanceDashboard.tsx` — live performance metrics
- `DeveloperDiagnosticsPage.tsx` — debugging and diagnostics UI
- `CommandPalette.tsx` — quick actions and navigation
- `ChallengeManager.tsx`, `ChallengeSelection.tsx` — load/select tasks

Each UI component generally exposes standard React props and callbacks; consult the source files for prop shapes.

## Task System API

### TaskPlugin Interface
- File: `src/lib/task-system/TaskPlugin.ts`
- Purpose: Contract for defining a study task/challenge.
- Typical shape:
```ts
export interface TaskPlugin {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  category: string;
  solutionHints?: Array<{ id: string; title: string; content: string; type: string; difficulty: string }>;
  architectureTemplate?: {
    name: string;
    description?: string;
    components: Array<{ type: string; label: string; description?: string }>;
    connections: Array<{ from: string; to: string; label?: string; type?: string; protocol?: string }>;
  };
}
```

### Templates Registry
- File: `src/lib/task-system/templates/index.ts`
- Exposes exported tasks and helpers to register/load templates.

### Example Plugin
- `src/lib/task-system/plugins/url-shortener/task.json`
- Assets under the same folder, e.g., `assets/architecture-diagram.png`

## Services API

### Tauri Integration
- Files: `src/services/tauri.ts`, `src/lib/tauri.ts`, `src-tauri/**`
- Responsibilities:
  - File operations and persistence
  - Native dialogs for import/export
  - Bridging to Rust commands for desktop-only features

### Web Fallback
- File: `src/services/web-fallback.ts`
- Purpose: Provide a subset of Tauri services when running in the browser for preview.

### AI Services
- Files: `src/lib/api/ai.ts`, `src/lib/services/AIConfigService.ts`, `src/lib/types/AIConfig.ts`
- Responsibilities:
  - Configuration management for AI providers
  - Invoking local/remote AI endpoints through Tauri or web bridge

## Hooks API

Custom hooks across `src/hooks` and `src/lib/hooks`:
- `useUndoRedo` — manage undo/redo stacks
- `useAutoSave` — debounce and persist diagram changes
- `usePerformanceMonitoring` — expose live metrics from `CanvasPerformanceManager`
- `useAIConfig` / `useAIReview` — AI provider configuration and review flows
- `useGlobalShortcuts` / `useUXTracker` — keyboard and UX tracking utilities
- `useTauri` — platform detection and bridge wrappers

Typical pattern:
```ts
const { save, load, isTauri } = useTauri();
```

## Utilities & Types

- Contracts and schemas: `src/lib/contracts/schema.ts`, `src/shared/contracts`
- Environment and feature gates: `src/lib/environment.ts`
- Error store and logger: `src/lib/errorStore.ts`, `src/lib/logger.ts`
- Shortcuts and learning system: `src/lib/shortcuts/*`

## Usage Examples

### Rendering a Canvas Component
```tsx
import { CanvasComponent } from '@/components/CanvasComponent';

<CanvasComponent
  id="api-1"
  type="api-gateway"
  label="API"
  position={{ x: 120, y: 80 }}
  selected
  onMove={(pos) => console.log('moved', pos)}
/>;
```

### Loading a Task Template
```ts
import { urlShortener } from '@/lib/task-system/templates';

// apply template to current diagram model...
```

### Persisting via Tauri
```ts
import { saveProject, loadProject } from '@/services/tauri';

await saveProject('my-diagram', diagramModel);
const loaded = await loadProject('my-diagram');
```

