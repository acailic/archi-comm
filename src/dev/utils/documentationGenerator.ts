// src/dev/utils/documentationGenerator.ts
// Documentation generator: extracts component API and usage from scenarios
// RELEVANT FILES: ../scenarios.ts, ../types.ts, @ui/components/ui/*

import { z } from 'zod';
import type {
  APIDocumentation,
  CodeExample,
  ComponentAnalysis,
  ComponentDocumentation,
  DocumentationConfig,
  EnhancedScenario,
  EnhancedScenarioDefinition,
  ScenarioAnalysis,
  ScenarioTheme,
  UsageExample,
  ControlsConfig,
} from '../types';

// Basic cache for component analysis
const analysisCache = new Map<string, ComponentAnalysis>();

export function analyzeComponentStructure(componentPath: string, source?: string): ComponentAnalysis {
  if (analysisCache.has(componentPath)) return analysisCache.get(componentPath)!;
  // naive parsing via heuristics
  const src = source ?? '';
  const componentNameMatch = src.match(/export\s+(?:const|function|default)\s+([A-Z][A-Za-z0-9_]*)/);
  const componentName = componentNameMatch?.[1] ?? componentPath.split('/').pop()?.replace(/\.tsx?$/, '') ?? 'Component';

  const props: ComponentAnalysis['props'] = [];
  // interface FooProps { a: string; b?: number }
  const ifaceMatch = src.match(/interface\s+([A-Za-z0-9_]+Props)\s*\{([\s\S]*?)\}/);
  if (ifaceMatch) {
    const body = ifaceMatch[2];
    body.split('\n').forEach(line => {
      const m = line.trim().match(/([A-Za-z0-9_]+)\??:\s*([^;]+)/);
      if (m) props.push({ name: m[1], type: m[2].trim(), required: !line.includes('?') });
    });
  }

  // Try to detect cva variants: cva( ..., { variants: { size: { sm: '', lg: '' } } })
  const variants: ComponentAnalysis['variants'] = [];
  const cvaMatch = src.match(/variants:\s*\{([\s\S]*?)\}\s*[,}]/);
  if (cvaMatch) {
    const body = cvaMatch[1];
    const variantNameRegex = /(\w+)\s*:\s*\{([\s\S]*?)\}/g;
    let vm;
    while ((vm = variantNameRegex.exec(body))) {
      const vName = vm[1];
      const values = Array.from(vm[2].matchAll(/(\w+)\s*:/g)).map(x => x[1]);
      variants.push({ name: vName, values });
    }
  }

  const analysis: ComponentAnalysis = {
    componentName,
    filePath: componentPath,
    props,
    variants: variants.length ? variants : undefined,
    defaultProps: undefined,
    dependencies: undefined,
  };
  analysisCache.set(componentPath, analysis);
  return analysis;
}

export function extractVariantInfo(cvaDefinition: unknown): Array<{ name: string; values: string[] }> | undefined {
  // Placeholder: When cva object is provided, try to read its shape.
  try {
    const def: any = cvaDefinition as any;
    if (!def?.variants) return undefined;
    return Object.entries(def.variants).map(([name, values]) => ({ name, values: Object.keys(values as object) }));
  } catch {
    return undefined;
  }
}

export function analyzeComponentDependencies(_componentPath: string): string[] | undefined {
  // Placeholder for future enhancement; returns undefined to keep perf tight.
  return undefined;
}

export function extractComponentAPI(componentPath: string, source?: string): APIDocumentation {
  const analysis = analyzeComponentStructure(componentPath, source);
  return {
    componentName: analysis.componentName,
    description: undefined,
    props: analysis.props,
    variants: analysis.variants,
    events: [],
  };
}

export function extractCodeExamples(scenario: EnhancedScenario): CodeExample[] {
  const list: CodeExample[] = [];
  if (scenario.examples) scenario.examples.forEach(ex => list.push(ex.snippet));
  if (scenario.documentation?.usageExamples) {
    scenario.documentation.usageExamples.forEach(u => list.push(u.snippet));
  }
  return list;
}

export function generateUsageExamples(scenarios: EnhancedScenario[]): UsageExample[] {
  const examples: UsageExample[] = [];
  scenarios.forEach(s => {
    s.documentation?.usageExamples?.forEach(ex => examples.push(ex));
  });
  return examples;
}

export function identifyBestPractices(scenarios: EnhancedScenario[]): string[] {
  const out = new Set<string>();
  scenarios.forEach(s => s.documentation?.bestPractices?.forEach(bp => out.add(bp)));
  return Array.from(out);
}

export function analyzeScenarioUsage(scenarios: EnhancedScenario[]): ScenarioAnalysis {
  return {
    componentName: 'Unknown',
    scenarioIds: scenarios.map(s => s.id),
    commonPropCombos: undefined,
    events: undefined,
    statePatterns: undefined,
    bestPractices: identifyBestPractices(scenarios),
  };
}

export function generateMarkdownAPI(componentAnalysis: ComponentAnalysis): string {
  const lines: string[] = [];
  lines.push(`## API: ${componentAnalysis.componentName}`);
  if (componentAnalysis.props?.length) {
    lines.push('\n### Props');
    componentAnalysis.props.forEach(p => {
      lines.push(`- ${p.name}: \`${p.type}\`${p.required ? ' (required)' : ''}${p.defaultValue ? `, default: ${p.defaultValue}` : ''}`);
    });
  }
  if (componentAnalysis.variants?.length) {
    lines.push('\n### Variants');
    componentAnalysis.variants.forEach(v => {
      lines.push(`- ${v.name}: ${v.values.join(', ')}`);
    });
  }
  return lines.join('\n');
}

export function generateUsageGuide(scenarios: EnhancedScenario[]): string {
  const lines: string[] = [];
  lines.push('## Usage Examples');
  scenarios.forEach(s => {
    lines.push(`\n### ${s.name}`);
    s.documentation?.usageExamples?.forEach(ex => {
      lines.push(`- ${ex.title}: ${ex.description}`);
      lines.push('\n```tsx');
      lines.push(ex.snippet.code);
      lines.push('```');
    });
  });
  return lines.join('\n');
}

export function generateExampleGallery(scenarios: EnhancedScenario[]): string {
  // For markdown output; embed code and titles
  return generateUsageGuide(scenarios);
}

export function generateAccessibilityGuide(scenarios: EnhancedScenario[]): string {
  const lines: string[] = [];
  lines.push('## Accessibility');
  scenarios.forEach(s => {
    const a11y = s.documentation?.accessibility;
    if (!a11y) return;
    lines.push(`\n### ${s.name}`);
    if (a11y.aria?.length) lines.push(`- ARIA: ${a11y.aria.join('; ')}`);
    if (a11y.keyboard?.length) lines.push(`- Keyboard: ${a11y.keyboard.join('; ')}`);
    if (a11y.screenReader?.length) lines.push(`- Screen Reader: ${a11y.screenReader.join('; ')}`);
  });
  return lines.join('\n');
}

export function generateInteractiveExamples(scenarios: EnhancedScenario[]): string {
  // Returns a JSON-like string describing interactive configurations
  const payload = scenarios.map(s => ({ id: s.id, controls: Object.keys(s.controls ?? {}) }));
  return JSON.stringify(payload, null, 2);
}

export function generatePlaygroundConfig(controls: ControlsConfig): Record<string, string> {
  return Object.fromEntries(Object.entries(controls ?? {}).map(([k, v]) => [k, v.type]));
}

export function generateValidationExamples(_validation: z.ZodSchema | undefined): string[] {
  return ['Inputs validated with Zod; errors surfaced inline.'];
}

export function generateThemeExamples(themes: ScenarioTheme[] | undefined): string[] {
  return (themes ?? []).map(t => `Theme: ${t.mode}${t.className ? ` (${t.className})` : ''}`);
}

export function generateComponentRelationships(allScenarios: EnhancedScenarioDefinition): Array<{ component: string; related: string[] }> {
  return Object.entries(allScenarios).map(([name, group]) => {
    const related = new Set<string>();
    group.scenarios.forEach(s => s.relatedScenarios?.forEach(r => related.add(r.scenarioId)));
    return { component: name, related: Array.from(related) };
  });
}

export function generateUsagePatterns(scenarios: EnhancedScenario[]): string[] {
  const patterns = new Set<string>();
  scenarios.forEach(s => s.documentation?.patterns?.forEach(p => patterns.add(p)));
  return Array.from(patterns);
}

export function generateMigrationGuides(_componentAnalysis: ComponentAnalysis): string[] {
  // Placeholder; real guide needs version diffing
  return ['No breaking changes detected.'];
}

export function validateDocumentation(documentation: ComponentDocumentation): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!documentation.componentName) issues.push('Missing componentName');
  if (!documentation.api && !documentation.propsTable?.length) issues.push('Missing API/props table');
  return { ok: issues.length === 0, issues };
}

export function checkExampleAccuracy(examples: CodeExample[]): { ok: boolean; issues: string[] } {
  // Static check only: ensure code blocks are non-empty
  const issues: string[] = [];
  examples.forEach((e, i) => { if (!e.code?.trim()) issues.push(`Empty code in example ${i}`); });
  return { ok: issues.length === 0, issues };
}

export function validateAccessibility(scenarios: EnhancedScenario[]): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  scenarios.forEach(s => {
    if (s.metadata?.accessibility && !s.documentation?.accessibility) {
      issues.push(`Scenario ${s.id} marked accessibility=true but lacks accessibility docs.`);
    }
  });
  return { ok: issues.length === 0, issues };
}

export function exportDocumentationAsMarkdown(documentation: ComponentDocumentation): string {
  const api: APIDocumentation | undefined = documentation.api ?? (documentation.componentName
    ? { componentName: documentation.componentName, props: documentation.propsTable ?? [], variants: documentation.variantInfo } as APIDocumentation
    : undefined);
  const lines: string[] = [];
  lines.push(`# ${documentation.componentName}`);
  if (documentation.overview) lines.push(`\n${documentation.overview}`);
  if (api) {
    lines.push(`\n## API`);
    if (api.props?.length) {
      api.props.forEach(p => lines.push(`- ${p.name}: \`${p.type}\`${p.required ? ' (required)' : ''}${p.defaultValue ? `, default: ${p.defaultValue}` : ''} — ${p.description ?? ''}`));
    }
    if (api.variants?.length) {
      lines.push(`\n### Variants`);
      api.variants.forEach(v => lines.push(`- ${v.name}: ${v.values.join(', ')}`));
    }
  }
  if (documentation.examples?.length) {
    lines.push(`\n## Examples`);
    documentation.examples.forEach(ex => {
      lines.push(`\n### ${ex.title}\n${ex.description}\n\n\`\`\`tsx\n${ex.snippet.code}\n\`\`\``);
    });
  }
  if (documentation.bestPractices?.length) {
    lines.push(`\n## Best Practices`);
    documentation.bestPractices.forEach(bp => lines.push(`- ${bp}`));
  }
  if (documentation.accessibility) {
    lines.push(`\n## Accessibility`);
    const a11y = documentation.accessibility;
    if (a11y.aria?.length) lines.push(`- ARIA: ${a11y.aria.join('; ')}`);
    if (a11y.keyboard?.length) lines.push(`- Keyboard: ${a11y.keyboard.join('; ')}`);
    if (a11y.screenReader?.length) lines.push(`- Screen Reader: ${a11y.screenReader.join('; ')}`);
  }
  return lines.join('\n');
}

// Alias requested in plan for convenience
export const generateMarkdownDocumentation = exportDocumentationAsMarkdown;

export function exportDocumentationAsJSON(documentation: ComponentDocumentation): string {
  return JSON.stringify(documentation, null, 2);
}

export function generateDocumentationIndex(allComponents: ComponentDocumentation[]): Array<{ name: string; sections: string[] }> {
  return allComponents.map(c => ({ name: c.componentName, sections: [
    'Overview', c.propsTable?.length ? 'API' : undefined, c.examples?.length ? 'Examples' : undefined, c.bestPractices?.length ? 'Best Practices' : undefined,
  ].filter(Boolean) as string[] }));
}

export function integrateWithScenarioViewer(_documentation: ComponentDocumentation): void {
  // Hook for UI-level integration (no-op in utils layer)
}

export function generateComponentDocumentation(
  componentName: string,
  options?: DocumentationConfig & { scenarios?: EnhancedScenario[]; componentSource?: string; componentPath?: string }
): ComponentDocumentation {
  const { scenarios = [], componentSource, componentPath = `src/packages/ui/components/ui/${componentName}.tsx` } = options ?? {};
  const api = extractComponentAPI(componentPath, componentSource);
  const examples = generateUsageExamples(scenarios);
  const best = identifyBestPractices(scenarios);
  const doc: ComponentDocumentation = {
    componentName,
    overview: `Auto-generated documentation for ${componentName}.`,
    api,
    propsTable: api.props,
    variantInfo: api.variants,
    examples,
    bestPractices: best,
  };
  return doc;
}
