import type { EnhancedScenarioDefinition } from '../types';
import { challengeSelectionScenarios } from './challenge-selection.tsx';
import { canvasAreaScenarios } from './canvas-area.tsx';
import { audioRecordingScenarios } from './audio-recording.tsx';
import { uiComponentScenarios } from './ui-components.tsx';
import { architectureDiagramScenarios } from './architecture-diagrams.tsx';

// Runtime validation utilities
function validateScenarioStructure(definition: Record<string, any>): void {
  try {
    const errors: string[] = [];
    const warn = (msg: string) => console.warn(`[scenarios] ${msg}`);
    const err = (msg: string) => errors.push(`[scenarios] ${msg}`);

    Object.entries(definition).forEach(([componentName, group]) => {
      if (!group || typeof group !== 'object') {
        err(`Component "${componentName}" group is not an object.`);
        return;
      }
      if (!group.id || typeof group.id !== 'string') {
        err(`Component "${componentName}" is missing required group.id (string).`);
      }
      if (!group.name || typeof group.name !== 'string') {
        err(`Component "${componentName}" is missing required group.name (string).`);
      }
      if (!Array.isArray(group.scenarios)) {
        err(`Component "${componentName}" must provide group.scenarios (array).`);
        return;
      }
      // Validate scenarios
      const ids = new Set<string>();
      group.scenarios.forEach((scenario: any, idx: number) => {
        const path = `${componentName}.scenarios[${idx}]`;
        if (!scenario || typeof scenario !== 'object') {
          err(`${path} must be an object.`);
          return;
        }
        if (!scenario.id || typeof scenario.id !== 'string') {
          err(`${path} is missing id (string).`);
        } else if (ids.has(scenario.id)) {
          err(`${path} has duplicate id "${scenario.id}" within the same group.`);
        } else {
          ids.add(scenario.id);
        }
        if (!scenario.name || typeof scenario.name !== 'string') {
          err(`${path} is missing name (string).`);
        }
        if (!scenario.description || typeof scenario.description !== 'string') {
          warn(`${path} is missing description (string).`);
        }
        if (typeof scenario.component !== 'function') {
          err(`${path} must provide component: () => ReactNode.`);
        }
      });
    });

    if (errors.length) {
      errors.forEach(e => console.error(e));
    }
  } catch (e) {
    console.error('[scenarios] Unexpected error during structure validation:', e);
  }
}

function verifyControlsDefaultPropsSync(definition: Record<string, any>): void {
  try {
    Object.entries(definition).forEach(([componentName, group]) => {
      if (!group || !Array.isArray(group.scenarios)) return;
      group.scenarios.forEach((scenario: any) => {
        const { controls, defaultProps } = scenario ?? {};
        if (!controls && !defaultProps) return;

        const path = `${componentName}.${scenario?.id ?? 'unknown'}`;
        const controlKeys = controls ? Object.keys(controls) : [];
        const defaultKeys = defaultProps ? Object.keys(defaultProps) : [];

        const extraDefaultKeys = defaultKeys.filter(k => !controlKeys.includes(k));
        if (extraDefaultKeys.length) {
          throw new Error(
            `[scenarios] ${path}: defaultProps has keys not in controls: ${extraDefaultKeys.join(', ')}`
          );
        }

        const missingDefaults = controlKeys.filter(k => !defaultKeys.includes(k));
        if (missingDefaults.length) {
          console.warn(
            `[scenarios] ${path}: controls define keys missing in defaultProps: ${missingDefaults.join(', ')}`
          );
        }

        if (controls && defaultProps) {
          controlKeys.forEach(key => {
            const control = controls[key];
            if (control && 'defaultValue' in control) {
              const controlDefault = (control as any).defaultValue;
              if (typeof controlDefault !== 'undefined') {
                const scenarioDefault = defaultProps[key];
                if (typeof scenarioDefault !== 'undefined' && scenarioDefault !== controlDefault) {
                  console.warn(
                    `[scenarios] ${path}: default value mismatch for "${key}": ` +
                      `controls=${JSON.stringify(controlDefault)} vs defaultProps=${JSON.stringify(scenarioDefault)}`
                  );
                }
              }
            }
          });
        }
      });
    });
  } catch (e) {
    console.error(e);
  }
}

// Combine all scenario modules
export const scenarios: EnhancedScenarioDefinition = {
  ...challengeSelectionScenarios,
  ...canvasAreaScenarios,
  ...audioRecordingScenarios,
  ...uiComponentScenarios,
  ...architectureDiagramScenarios,
};

// Run validations
validateScenarioStructure(scenarios);
verifyControlsDefaultPropsSync(scenarios);

// Precomputed indices and cached lookups
type ScenarioMap = Record<string, any[]>;
type CategoryMap = Record<string, any[]>;
type ScenarioLookupMap = Record<string, Record<string, any>>;

const componentScenariosIndex: ScenarioMap = {};
const scenariosByCategoryIndex: CategoryMap = {};
const interactiveScenariosIndex: any[] = [];
const scenarioLookupByComponent: ScenarioLookupMap = {};

Object.entries(scenarios).forEach(([componentName, group]) => {
  const list = group?.scenarios ?? [];
  componentScenariosIndex[componentName] = list;

  const perComponentLookup: Record<string, any> = {};
  list.forEach(scenario => {
    if (scenario && scenario.id) {
      perComponentLookup[scenario.id] = scenario;
    }

    if (scenario?.controls) {
      interactiveScenariosIndex.push(scenario);
    }

    const category = scenario?.metadata?.category;
    if (category) {
      if (!scenariosByCategoryIndex[category]) scenariosByCategoryIndex[category] = [];
      scenariosByCategoryIndex[category].push(scenario);
    }
  });
  scenarioLookupByComponent[componentName] = perComponentLookup;
});

// Export cached results
export const AVAILABLE_COMPONENTS: string[] = Object.keys(scenarios);
export const COMPONENT_SCENARIOS_INDEX = componentScenariosIndex;
export const SCENARIOS_BY_CATEGORY = scenariosByCategoryIndex;
export const INTERACTIVE_SCENARIOS = interactiveScenariosIndex;
export const SCENARIO_LOOKUP = scenarioLookupByComponent;

// Helper functions
export function getScenariosForComponent(componentName: string): any[] {
  return componentScenariosIndex[componentName] ?? [];
}

export function getEnhancedScenariosForComponent(componentName: string): any[] {
  return componentScenariosIndex[componentName] ?? [];
}

export function getInteractiveScenarios(): any[] {
  return INTERACTIVE_SCENARIOS;
}

export function getScenariosByCategory(category: string): any[] {
  return SCENARIOS_BY_CATEGORY[category] ?? [];
}

export function getAvailableComponents(): string[] {
  return AVAILABLE_COMPONENTS;
}

export function getScenario(componentName: string, scenarioId: string): any | null {
  const found = SCENARIO_LOOKUP[componentName]?.[scenarioId];
  return found ?? null;
}