// src/dev/utils/documentationUtils.ts
// Utilities for extracting and formatting scenario documentation and inline help
// RELEVANT FILES: ../types.ts, ../scenarios.ts

import { z } from 'zod';
import type {
  CodeExample,
  ComponentDocumentation,
  ControlsConfig,
  EnhancedScenario,
  ScenarioDocumentation,
  UsageExample,
} from '../types';

// Simple in-memory caches to support performance optimizations
const docCache = new WeakMap<object, ScenarioDocumentation | null>();
const formattedCache = new Map<string, string>();

export function extractScenarioDocumentation(scenario: EnhancedScenario): ScenarioDocumentation | null {
  if (docCache.has(scenario)) return docCache.get(scenario) ?? null;
  const doc = scenario.documentation ?? null;
  docCache.set(scenario, doc);
  return doc;
}

export function formatUsageExample(example: UsageExample): string {
  const key = `${example.title}|${example.snippet.language}|${example.snippet.code.length}`;
  const cached = formattedCache.get(key);
  if (cached) return cached;
  const header = `// ${example.title} (${example.complexity ?? 'beginner'})\n`;
  const desc = example.description ? `// ${example.description}\n` : '';
  const block = `${header}${desc}${example.snippet.code}`;
  formattedCache.set(key, block);
  return block;
}

export function generateComponentSummary(scenarios: EnhancedScenario[]): string {
  const names = new Set<string>();
  scenarios.forEach(s => names.add(s.name));
  return `Includes ${names.size} scenarios: ${Array.from(names).join(', ')}`;
}

export function extractBestPractices(scenarios: EnhancedScenario[]): string[] {
  const practices = new Set<string>();
  scenarios.forEach(s => s.documentation?.bestPractices?.forEach(p => practices.add(p)));
  return Array.from(practices);
}

export function generateInlineHelp(scenario: EnhancedScenario): string {
  const doc = extractScenarioDocumentation(scenario);
  const title = scenario.name;
  const summary = doc?.summary ?? scenario.description;
  const tips = doc?.bestPractices?.slice(0, 3) ?? [];
  const lines = [
    `Scenario: ${title}`,
    summary ? `Summary: ${summary}` : undefined,
    tips.length ? `Tips: ${tips.join(' • ')}` : undefined,
  ].filter(Boolean) as string[];
  return lines.join('\n');
}

export function getControlHelp(control: { label?: string; description?: string } & { type: string }): string {
  return `${control.label ?? 'Control'} (${control.type})${control.description ? ` — ${control.description}` : ''}`;
}

export function generateValidationHelp(schema?: z.ZodSchema): string {
  if (!schema) return 'No validation rules defined.';
  // Provide a generic statement without try/catch to satisfy no-unreachable
  return 'Props are validated using a Zod schema; invalid inputs will surface inline errors.';
}

export function getAccessibilityGuidance(scenario: EnhancedScenario): string[] {
  const a11y = scenario.documentation?.accessibility;
  const out: string[] = [];
  if (a11y?.aria?.length) out.push(`ARIA: ${a11y.aria.join('; ')}`);
  if (a11y?.keyboard?.length) out.push(`Keyboard: ${a11y.keyboard.join('; ')}`);
  if (a11y?.screenReader?.length) out.push(`SR: ${a11y.screenReader.join('; ')}`);
  return out.length ? out : ['No specific accessibility guidance documented.'];
}

export function validateScenarioDocumentation(scenario: EnhancedScenario): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const doc = scenario.documentation;
  if (!doc) return { ok: true, issues };
  if (!doc.summary) issues.push('Missing summary.');
  if (!doc.usageExamples?.length) issues.push('No usage examples.');
  return { ok: issues.length === 0, issues };
}

export function checkDocumentationConsistency(scenarios: EnhancedScenario[]): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  scenarios.forEach(s => {
    if (s.examples && s.documentation?.usageExamples && s.examples.length !== s.documentation.usageExamples.length) {
      issues.push(`Scenario ${s.id}: examples count differs from documentation.`);
    }
  });
  return { ok: issues.length === 0, issues };
}

export function validateCodeExamples(examples: CodeExample[]): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  examples.forEach((ex, idx) => {
    if (!ex.code?.trim()) issues.push(`Example ${idx} has empty code.`);
  });
  return { ok: issues.length === 0, issues };
}

export function checkCrossReferences(scenarios: EnhancedScenario[]): { ok: boolean; issues: string[] } {
  const ids = new Set<string>();
  scenarios.forEach(s => ids.add(s.id));
  const issues: string[] = [];
  scenarios.forEach(s => {
    s.relatedScenarios?.forEach(ref => {
      // Only validate presence within the same group by id if category matches is unknown
      if (!ids.has(ref.scenarioId)) issues.push(`Missing related scenario ${ref.scenarioId} referenced by ${s.id}.`);
    });
  });
  return { ok: issues.length === 0, issues };
}

export function searchScenarioDocumentation(query: string, scenarios: EnhancedScenario[]): EnhancedScenario[] {
  const q = query.toLowerCase();
  return scenarios.filter(s => {
    const doc = s.documentation;
    return (
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (doc?.summary?.toLowerCase().includes(q) ?? false) ||
      (doc?.bestPractices?.some(p => p.toLowerCase().includes(q)) ?? false)
    );
  });
}

export function findRelatedScenarios(scenario: EnhancedScenario, allScenarios: EnhancedScenario[]): EnhancedScenario[] {
  const refs = scenario.relatedScenarios ?? [];
  return allScenarios.filter(s => refs.some(r => r.scenarioId === s.id));
}

export function generateDocumentationIndex(scenarios: EnhancedScenario[]): Array<{ id: string; name: string }> {
  return scenarios.map(s => ({ id: s.id, name: s.name }));
}

export function categorizeDocumentation(scenarios: EnhancedScenario[]): Record<string, EnhancedScenario[]> {
  return scenarios.reduce((acc, s) => {
    const key = s.metadata?.category ?? 'uncategorized';
    acc[key] = acc[key] ?? [];
    acc[key].push(s);
    return acc;
  }, {} as Record<string, EnhancedScenario[]>);
}

export function exportScenarioDocumentation(
  scenarios: EnhancedScenario[],
  format: 'markdown' | 'json' | 'html'
): string {
  if (format === 'json') return JSON.stringify(scenarios, null, 2);
  if (format === 'html') {
    const body = scenarios
      .map(s => `<section><h2>${s.name}</h2><p>${s.documentation?.summary ?? s.description}</p></section>`) 
      .join('\n');
    return `<!doctype html><html><head><meta charset="utf-8"/><title>Scenario Docs</title></head><body>${body}</body></html>`;
  }
  // markdown
  return scenarios
    .map(s => `### ${s.name}\n\n${s.documentation?.summary ?? s.description}\n`)
    .join('\n');
}

export function generateDocumentationSitemap(scenarios: EnhancedScenario[]): Array<{ id: string; title: string }> {
  return scenarios.map(s => ({ id: s.id, title: s.name }));
}

export function integrateWithScenarioViewer(_documentation: ComponentDocumentation): void {
  // Integration hook: no-op placeholder to keep dependencies minimal.
}

export function generatePrintableDocumentation(scenarios: EnhancedScenario[]): string {
  return exportScenarioDocumentation(scenarios, 'markdown');
}

// Playground helpers
export function generatePlaygroundConfig(controls: ControlsConfig | undefined): string[] {
  if (!controls) return [];
  return Object.entries(controls).map(([name, def]) => `${name}: ${def.type}`);
}
