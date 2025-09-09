import type { DesignComponent, Connection } from '@/shared/contracts';
import { templatesRegistry } from '@/lib/task-system/templates';

export interface TemplateResult {
  components: DesignComponent[];
  connections: Connection[];
}

export class TemplateEngine {
  generateSmartLabel(componentType: string): string {
    const labelMappings: Record<string, string> = {
      'load-balancer': 'Load Balancer',
      'api-gateway': 'API Gateway',
      'microservice': 'Service',
      'message-queue': 'Message Queue',
      'data-warehouse': 'Data Warehouse',
      'stream-processing': 'Stream Processor',
      'edge-computing': 'Edge Node',
      'oauth': 'OAuth Provider',
      'ai-ml': 'ML Model',
    };
    return (
      labelMappings[componentType] ||
      componentType.charAt(0).toUpperCase() + componentType.slice(1).replace('-', ' ')
    );
  }

  getDefaultProperties(componentType: string): Record<string, unknown> {
    const defaults: Record<string, Record<string, unknown>> = {
      'load-balancer': { algorithm: 'round-robin', healthCheck: true },
      database: { type: 'relational', replicas: 1, backup: true },
      cache: { type: 'redis', ttl: 3600, size: '1GB' },
      'api-gateway': { rateLimit: '1000/min', authentication: true },
      microservice: { replicas: 3, healthCheck: '/health', port: 8080 },
      'message-queue': { type: 'kafka', partitions: 3, retention: '7d' },
    };
    return defaults[componentType] || {};
  }

  getSmartPlacement(
    componentType: string,
    position: { x: number; y: number },
    neighbors: DesignComponent[]
  ): { x: number; y: number } {
    const architecturalPatterns: Record<string, { suggestedY: number; alignsWithTypes: string[] }> = {
      'load-balancer': { suggestedY: 100, alignsWithTypes: ['server', 'microservice'] },
      database: { suggestedY: 400, alignsWithTypes: ['server', 'microservice'] },
      cache: { suggestedY: 250, alignsWithTypes: ['database'] },
      'api-gateway': { suggestedY: 50, alignsWithTypes: ['microservice'] },
      client: { suggestedY: 20, alignsWithTypes: ['api-gateway'] },
      monitoring: { suggestedY: 500, alignsWithTypes: [] },
    };
    const pattern = architecturalPatterns[componentType];
    if (!pattern) return position;
    const nearby = neighbors.filter(
      c => pattern.alignsWithTypes.includes(c.type) && Math.abs(c.y - position.y) < 120
    );
    if (nearby.length > 0) {
      return { x: position.x, y: nearby[0].y };
    }
    return { x: position.x, y: pattern.suggestedY };
  }

  applyTemplate(templateName: string): TemplateResult | null {
    const template = templatesRegistry.get(templateName);
    if (!template) return null;
    // Expect template to expose components and connections arrays in registry
    return {
      components: template.components as unknown as DesignComponent[],
      connections: template.connections as unknown as Connection[],
    };
  }
}

