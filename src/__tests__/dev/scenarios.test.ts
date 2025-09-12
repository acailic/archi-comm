import { describe, it, expect } from 'vitest';
import {
  scenarios,
  getScenariosForComponent,
  getEnhancedScenariosForComponent,
  getInteractiveScenarios,
  getScenariosByCategory,
  getAvailableComponents,
  getScenario,
} from '../../dev/scenarios';

describe('dev/scenarios helper functions', () => {
  it('getAvailableComponents returns known component groups', () => {
    const components = getAvailableComponents();
    expect(Array.isArray(components)).toBe(true);
    expect(components.length).toBeGreaterThan(0);
    // a few representative groups
    expect(components).toContain('Button Components');
    expect(components).toContain('Card Components');
    expect(components).toContain('Input Components');
  });

  it('getScenariosForComponent returns scenarios for existing component group', () => {
    const list = getScenariosForComponent('Button Components');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some(s => s.id === 'button-playground')).toBe(true);
  });

  it('getScenariosForComponent returns empty array for unknown component group', () => {
    const list = getScenariosForComponent('Does Not Exist');
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(0);
  });

  it('getEnhancedScenariosForComponent mirrors getScenariosForComponent', () => {
    const a = getScenariosForComponent('Input Components');
    const b = getEnhancedScenariosForComponent('Input Components');
    expect(Array.isArray(b)).toBe(true);
    expect(b.length).toEqual(a.length);
    expect(b.map(s => s.id)).toEqual(a.map(s => s.id));
  });

  it('getInteractiveScenarios returns only scenarios with controls', () => {
    const interactive = getInteractiveScenarios();
    expect(Array.isArray(interactive)).toBe(true);
    expect(interactive.length).toBeGreaterThan(0);
    // Every returned scenario should have a controls object
    for (const s of interactive) {
      expect(typeof s.controls).toBe('object');
      expect(s.controls).not.toBeNull();
    }
  });

  it('getScenariosByCategory filters by metadata.category', () => {
    const ui = getScenariosByCategory('ui-components');
    expect(Array.isArray(ui)).toBe(true);
    expect(ui.length).toBeGreaterThan(0);
    // All results should be in the specified category
    for (const s of ui) {
      expect(s?.metadata?.category).toBe('ui-components');
    }
    // Sanity check a known scenario lives in this category
    expect(ui.some(s => s.id === 'button-variants' || s.id === 'button-playground')).toBe(true);
  });

  it('getScenario returns a single scenario by id and group', () => {
    const s = getScenario('Button Components', 'button-playground');
    expect(s).toBeTruthy();
    expect(s?.name).toBe('Button Playground');
  });

  it('getScenario returns null when not found', () => {
    const s = getScenario('Button Components', 'nope');
    expect(s).toBeNull();
  });

  it('exports scenarios definition object', () => {
    expect(scenarios && typeof scenarios === 'object').toBe(true);
    // Spot check a couple of groups exist
    expect(scenarios['Button Components']).toBeDefined();
    expect(scenarios['Input Components']).toBeDefined();
  });
});
