import type { DesignData } from '@/shared/contracts';

import { ecommercePlatformTemplate, fintechPlatformTemplate, healthcareSystemTemplate, gamingPlatformTemplate } from './industry-templates';
import { microservicesEcosystemTemplate, serverlessArchitectureTemplate, distributedCqrsTemplate, highAvailabilityTemplate, benchmark100Template, benchmark250Template, benchmark500Template } from './scalability-templates';
import { mainframeBridgeTemplate, ftpIntegrationTemplate, legacyDbModernizationTemplate, stranglerFigTemplate, hybridArchitectureTemplate, legacyMonitoringTemplate } from './legacy-templates';

export const industryTemplates = {
  ecommerce: ecommercePlatformTemplate,
  fintech: fintechPlatformTemplate,
  healthcare: healthcareSystemTemplate,
  gaming: gamingPlatformTemplate,
};

export const scalabilityTemplates = {
  microservices: microservicesEcosystemTemplate,
  serverless: serverlessArchitectureTemplate,
  cqrs: distributedCqrsTemplate,
  highAvailability: highAvailabilityTemplate,
};

export const legacyTemplates = {
  mainframeBridge: mainframeBridgeTemplate,
  ftpIntegration: ftpIntegrationTemplate,
  dbModernization: legacyDbModernizationTemplate,
  stranglerFig: stranglerFigTemplate,
  hybrid: hybridArchitectureTemplate,
  legacyMonitoring: legacyMonitoringTemplate,
};

export const benchmarkTemplates = {
  benchmark100: benchmark100Template,
  benchmark250: benchmark250Template,
  benchmark500: benchmark500Template,
};

type Category = 'industry' | 'scalability' | 'legacy' | 'benchmark';

export interface TemplateMetadata {
  name: string;
  category: Category;
  industry?: string;
  complexity: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  componentCount: number;
  connectionCount: number;
  estimatedTime: number; // minutes
  tags: string[];
  description: string;
  prerequisites?: string[];
  learningObjectives?: string[];
}

function extractMetadata(name: string, category: Category, template: DesignData, extra: Partial<TemplateMetadata> = {}): TemplateMetadata {
  return {
    name,
    category,
    complexity: (template.metadata?.complexity as TemplateMetadata['complexity']) || 'intermediate',
    componentCount: (template.metadata?.componentCount as number) || template.components.length,
    connectionCount: (template.metadata?.connectionCount as number) || template.connections.length,
    estimatedTime: (template.metadata?.estimatedTime as number) || 30,
    tags: (template.metadata?.tags as string[]) || [],
    description: (template.metadata?.description as string) || '',
    ...extra,
  };
}

const byCategory: Record<Category, Record<string, DesignData>> = {
  industry: industryTemplates,
  scalability: scalabilityTemplates,
  legacy: legacyTemplates,
  benchmark: benchmarkTemplates,
};

export class TemplateRegistry {
  private static instance: TemplateRegistry;
  private templates: Map<string, { category: Category; data: DesignData; metadata: TemplateMetadata }>; 

  private constructor() {
    this.templates = new Map();

    // Register all templates
    for (const category of Object.keys(byCategory) as Category[]) {
      const group = byCategory[category];
      for (const [name, data] of Object.entries(group)) {
        this.templates.set(`${category}:${name}`, {
          category,
          data,
          metadata: extractMetadata(name, category, data),
        });
      }
    }
  }

  static getInstance(): TemplateRegistry {
    if (!TemplateRegistry.instance) {
      TemplateRegistry.instance = new TemplateRegistry();
    }
    return TemplateRegistry.instance;
  }

  getTemplate(name: string): DesignData | undefined {
    // name can be plain like 'ecommerce' or qualified 'industry:ecommerce'
    if (this.templates.has(name)) return this.templates.get(name)!.data;
    for (const [key, entry] of this.templates.entries()) {
      if (key.endsWith(`:${name}`)) return entry.data;
    }
    return undefined;
  }

  getTemplatesByCategory(category: Category): Record<string, DesignData> {
    return byCategory[category];
  }

  getAllTemplates(): Array<{ name: string; category: Category; data: DesignData }> {
    const result: Array<{ name: string; category: Category; data: DesignData }> = [];
    for (const [key, { category, data }] of this.templates.entries()) {
      result.push({ name: key, category, data });
    }
    return result;
  }

  getTemplateMetadata(name: string): TemplateMetadata | undefined {
    if (this.templates.has(name)) return this.templates.get(name)!.metadata;
    for (const [key, entry] of this.templates.entries()) {
      if (key.endsWith(`:${name}`)) return entry.metadata;
    }
    return undefined;
  }
}

export const templateRegistry = TemplateRegistry.getInstance();

export function validateTemplate(template: DesignData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!template.components || !Array.isArray(template.components)) errors.push('Missing components');
  if (!template.connections || !Array.isArray(template.connections)) errors.push('Missing connections');
  if (!template.layers || !Array.isArray(template.layers)) errors.push('Missing layers');
  if (!template.metadata) errors.push('Missing metadata');

  // Basic component type validation (should match palette types; permissive check here)
  for (const c of template.components) {
    if (!c.type || typeof c.type !== 'string') errors.push(`Invalid component type for ${c.id}`);
  }

  return { valid: errors.length === 0, errors };
}

export {
  ecommercePlatformTemplate,
  fintechPlatformTemplate,
  healthcareSystemTemplate,
  gamingPlatformTemplate,
  microservicesEcosystemTemplate,
  serverlessArchitectureTemplate,
  distributedCqrsTemplate,
  highAvailabilityTemplate,
  mainframeBridgeTemplate,
  ftpIntegrationTemplate,
  legacyDbModernizationTemplate,
  stranglerFigTemplate,
  hybridArchitectureTemplate,
  legacyMonitoringTemplate,
  benchmark100Template,
  benchmark250Template,
  benchmark500Template,
};

