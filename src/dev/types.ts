// src/dev/types.ts
// TypeScript interfaces and types for the scenario system with enhanced metadata support
// Provides structure for scenario data, ensures type safety, and supports comprehensive UI component testing
// RELEVANT FILES: src/dev/scenarios.ts, src/dev/ScenarioViewer.tsx, src/dev/testData.ts

import { ReactNode } from 'react';
import { z } from 'zod';

/**
 * Component variants that can be tested in scenarios
 * Tracks different visual and behavioral variants of UI components
 */
export type ComponentVariant = 
  | 'default' 
  | 'destructive' 
  | 'outline' 
  | 'secondary' 
  | 'ghost' 
  | 'link'
  | 'warning'
  | 'primary'
  | 'success'
  | 'info';

/**
 * Component states that can be tested in scenarios
 * Covers different interaction and display states
 */
export type ComponentState = 
  | 'default'
  | 'loading'
  | 'disabled'
  | 'error'
  | 'success'
  | 'focused'
  | 'hover'
  | 'pressed'
  | 'selected'
  | 'invalid'
  | 'valid';

/**
 * Responsive breakpoints for testing component behavior
 * Defines screen sizes where component behavior may change
 */
export type ResponsiveBreakpoint = 
  | 'mobile'
  | 'tablet'
  | 'desktop'
  | 'wide'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl';

/**
 * Scenario categories for organizing related scenarios
 * Groups scenarios by functionality, component type, or use case
 */
export type ScenarioCategory = 
  | 'ui-components'
  | 'form-controls'
  | 'navigation'
  | 'data-display'
  | 'feedback'
  | 'layout'
  | 'business-logic'
  | 'edge-cases'
  | 'responsive'
  | 'accessibility'
  | 'performance';

/**
 * Enhanced scenario metadata for better organization and testing
 * Provides additional context and categorization for scenarios
 */
export interface ScenarioMetadata {
  /** Category this scenario belongs to */
  category?: ScenarioCategory;
  /** Component variants covered in this scenario */
  variants?: ComponentVariant[];
  /** Component states tested in this scenario */
  states?: ComponentState[];
  /** Responsive breakpoints this scenario covers */
  responsive?: ResponsiveBreakpoint[];
  /** Tags for filtering and searching scenarios */
  tags?: string[];
  /** Whether this scenario tests accessibility features */
  accessibility?: boolean;
  /** Whether this scenario is performance-critical */
  performance?: boolean;
  /** Dependencies required for this scenario */
  dependencies?: string[];
  /** Mock data references used in this scenario */
  mockData?: string[];
}

/**
 * Individual scenario definition with enhanced metadata
 * Represents a single component state or configuration for testing
 */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  component: () => ReactNode;
  /** Enhanced metadata for better scenario organization */
  metadata?: ScenarioMetadata;
}

/**
 * Category containing multiple scenarios with enhanced organization
 * Groups related scenarios for better organization and navigation
 */
export interface ScenarioGroup {
  id: string;
  name: string;
  scenarios: Scenario[];
  /** Optional description for the scenario group */
  description?: string;
  /** Category this group belongs to */
  category?: ScenarioCategory;
  /** Order priority for display (lower numbers appear first) */
  order?: number;
}

/**
 * Complete scenario definition structure with enhanced organization
 * Maps component names to their available scenarios with metadata support
 */
export interface ScenarioDefinition {
  [componentName: string]: ScenarioGroup;
}

/**
 * Configuration for scenario filtering and searching
 * Defines how scenarios can be filtered and organized in the UI
 */
export interface ScenarioFilter {
  /** Filter by scenario category */
  category?: ScenarioCategory;
  /** Filter by component variants */
  variants?: ComponentVariant[];
  /** Filter by component states */
  states?: ComponentState[];
  /** Filter by responsive breakpoints */
  responsive?: ResponsiveBreakpoint[];
  /** Filter by tags */
  tags?: string[];
  /** Filter by accessibility scenarios only */
  accessibilityOnly?: boolean;
  /** Filter by performance scenarios only */
  performanceOnly?: boolean;
  /** Text search in scenario names and descriptions */
  searchText?: string;
}

/**
 * Scenario execution result for testing and validation
 * Tracks the outcome of scenario rendering and testing
 */
export interface ScenarioResult {
  scenarioId: string;
  componentName: string;
  /** Whether the scenario rendered successfully */
  success: boolean;
  /** Any errors that occurred during rendering */
  error?: string;
  /** Performance metrics if available */
  performance?: {
    renderTime: number;
    memoryUsage?: number;
  };
  /** Accessibility audit results if performed */
  accessibility?: {
    passed: boolean;
    violations: string[];
  };
  /** Timestamp when scenario was executed */
  timestamp: Date;
}

/**
 * Control types for interactive prop adjustment
 * Defines different input control types for component props
 */
export type ControlType = 
  | 'text'
  | 'number' 
  | 'boolean'
  | 'select'
  | 'color'
  | 'range'
  | 'textarea'
  | 'date'
  | 'time'
  | 'email'
  | 'url';

/**
 * Control definition for a specific prop
 * Defines how a prop should be controlled in the interactive system
 */
export interface ControlDefinition {
  type: ControlType;
  label: string;
  description?: string;
  defaultValue?: any;
  options?: Array<{ value: any; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  validation?: z.ZodSchema<any>;
}

/**
 * Controls configuration mapping prop names to their control definitions
 * Maps component prop names to their interactive control configurations
 */
export interface ControlsConfig {
  [propName: string]: ControlDefinition;
}

/**
 * Validation result for prop values
 * Contains validation status and error messages for prop validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  value?: any;
}

/**
 * Theme mode options for the scenario system
 * Supports different theme modes including system preference
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Theme-specific scenario configuration
 * Allows scenarios to have different configurations per theme
 */
export interface ScenarioTheme {
  mode: ThemeMode;
  customProperties?: Record<string, string>;
  className?: string;
}

/**
 * Enhanced scenario definition with interactive controls
 * Extends the basic scenario with interactive control capabilities
 */
export interface EnhancedScenario extends Scenario {
  /** Interactive controls configuration for this scenario */
  controls?: ControlsConfig;
  /** Default props for the component */
  defaultProps?: Record<string, any>;
  /** Zod validation schema for props */
  validation?: z.ZodSchema<any>;
  /** Responsive design scenarios */
  responsive?: ResponsiveBreakpoint[];
  /** Theme-specific configurations */
  themes?: ScenarioTheme[];
  /** Optional documentation block embedded with the scenario */
  documentation?: ScenarioDocumentation;
  /** Multiple usage examples associated with the scenario */
  examples?: UsageExample[];
  /** Related scenarios for cross-referencing */
  relatedScenarios?: Array<{ category: string; scenarioId: string; reason?: string }>;
}

/**
 * Enhanced scenario group with controls support
 * Extends scenario groups to support interactive controls
 */
export interface EnhancedScenarioGroup extends Omit<ScenarioGroup, 'scenarios'> {
  scenarios: EnhancedScenario[];
}

/**
 * Enhanced scenario definition with controls support
 * Maps component names to enhanced scenario groups
 */
export interface EnhancedScenarioDefinition {
  [componentName: string]: EnhancedScenarioGroup;
}

/**
 * Dynamic props state for scenario viewer
 * Tracks user-modified props for each scenario
 */
export interface DynamicPropsState {
  [scenarioId: string]: Record<string, any>;
}

/**
 * Props change event data
 * Contains information about prop changes in the interactive system
 */
export interface PropChangeEvent {
  scenarioId: string;
  propName: string;
  newValue: any;
  oldValue: any;
  isValid: boolean;
  validationErrors?: string[];
}

/**
 * Configuration for the scenario viewer component
 * Controls how scenarios are displayed and interacted with
 */
export interface ScenarioViewerConfig {
  /** Default filter settings */
  defaultFilter?: ScenarioFilter;
  /** Whether to show scenario metadata in the UI */
  showMetadata?: boolean;
  /** Whether to enable scenario search */
  enableSearch?: boolean;
  /** Whether to group scenarios by category */
  groupByCategory?: boolean;
  /** Whether to show performance metrics */
  showPerformance?: boolean;
  /** Whether to run accessibility audits */
  enableAccessibilityAudit?: boolean;
  /** Custom theme for the scenario viewer */
  theme?: ThemeMode;
  /** Whether to enable interactive controls */
  enableControls?: boolean;
  /** Whether to show validation errors inline */
  showValidationErrors?: boolean;
}

/**
 * ---------------------------------------------
 * Documentation & Automated Doc Generation Types
 * ---------------------------------------------
 */

/** Complexity level for examples */
export type ExampleComplexity = 'beginner' | 'intermediate' | 'advanced';

/** Code example representation */
export interface CodeExample {
  id?: string;
  title?: string;
  description?: string;
  /** Code snippet content (TypeScript/TSX preferred) */
  code: string;
  /** Language hint for syntax highlighting */
  language?: 'tsx' | 'ts' | 'jsx' | 'js' | 'css' | 'md' | string;
  /** Optional inline notes or caveats */
  notes?: string[];
}

/** Usage example with context */
export interface UsageExample {
  id?: string;
  title: string;
  description: string;
  complexity?: ExampleComplexity;
  snippet: CodeExample;
}

/** API documentation for a component */
export interface APIDocumentation {
  componentName: string;
  description?: string;
  props: Array<{
    name: string;
    type: string;
    required?: boolean;
    defaultValue?: string;
    description?: string;
  }>;
  variants?: Array<{
    name: string;
    values: string[];
    description?: string;
  }>;
  events?: Array<{
    name: string;
    payload?: string;
    description?: string;
  }>;
}

/** Documentation metadata to enrich scenarios and components */
export interface DocumentationMetadata {
  usageExamples?: UsageExample[];
  api?: APIDocumentation;
  bestPractices?: string[];
  relatedComponents?: string[];
  accessibility?: {
    aria?: string[];
    keyboard?: string[];
    screenReader?: string[];
    notes?: string[];
  };
  performance?: {
    considerations?: string[];
    tips?: string[];
  };
}

/** Scenario-specific documentation */
export interface ScenarioDocumentation extends DocumentationMetadata {
  summary?: string;
  whenToUse?: string[];
  whenNotToUse?: string[];
  patterns?: string[];
}

/** Generated component documentation */
export interface ComponentDocumentation extends DocumentationMetadata {
  componentName: string;
  overview?: string;
  propsTable?: APIDocumentation['props'];
  variantInfo?: APIDocumentation['variants'];
  examples?: UsageExample[];
  usagePatterns?: string[];
}

/** Documentation generator configuration */
export interface DocumentationConfig {
  includePrivate?: boolean;
  output?: 'markdown' | 'json' | 'html';
  maxExamplesPerScenario?: number;
  includeAccessibility?: boolean;
  includePerformance?: boolean;
  cache?: boolean;
}

/** Component file analysis */
export interface ComponentAnalysis {
  componentName: string;
  filePath: string;
  props: Array<{ name: string; type: string; required?: boolean; defaultValue?: string; description?: string }>;
  variants?: Array<{ name: string; values: string[]; description?: string }>;
  defaultProps?: Record<string, string>;
  dependencies?: string[];
}

/** Scenario usage analysis */
export interface ScenarioAnalysis {
  componentName: string;
  scenarioIds: string[];
  commonPropCombos?: Array<{ props: Record<string, any>; occurrences: number }>;
  events?: Array<{ name: string; example?: string }>;
  statePatterns?: string[];
  bestPractices?: string[];
}

/** Documentation generator interface */
export interface DocumentationGenerator {
  generateComponentDocumentation: (componentName: string) => Promise<ComponentDocumentation> | ComponentDocumentation;
}
