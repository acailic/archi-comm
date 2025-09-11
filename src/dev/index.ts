// src/dev/index.ts
// Main export file for the dev module that provides clean public API
// Exports ScenarioViewer component, development utilities, and scenario system for development use
// RELEVANT FILES: ./ScenarioViewer.tsx, ./DevShortcuts.tsx, ./DevUtilities.tsx, ./types.ts, ./scenarios.ts

// Main ScenarioViewer component - both default and named export for flexibility
export { ScenarioViewer } from './ScenarioViewer';
export { ScenarioViewer as default } from './ScenarioViewer';

// Development utilities and shortcuts
export { useDevShortcuts } from './DevShortcuts';
export { DevUtilities } from './DevUtilities';

// Scenario data and helper functions
export { scenarios, getScenariosForComponent, getAvailableComponents, getScenario } from './scenarios';

// TypeScript types for scenario system
export type { Scenario, ScenarioCategory, ScenarioDefinition } from './types';

// TypeScript types for development utilities
export type { 
  DevShortcutHandlers, 
  DevShortcutCallbacks, 
  UseDevShortcutsOptions, 
  UseDevShortcutsReturn 
} from './DevShortcuts';
export type { DevUtilitiesProps } from './DevUtilities';