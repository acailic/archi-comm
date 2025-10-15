/**
 * src/lib/ai-tools/canvas-ai-assistant.ts
 * AI-powered assistant for canvas operations and diagram generation
 * Provides text-to-diagram, pattern suggestions, and optimization recommendations
 * RELEVANT FILES: AIAssistantPanel.tsx, template-library.ts, pattern-detection.ts, canvasStore.ts
 */

import type { DesignComponent, Connection } from '@/shared/contracts';
import { getAllTemplates, searchTemplates } from '@/lib/canvas/template-library';
import { detectPatterns, getArchitectureSuggestions } from '@/lib/canvas/pattern-detection';

export interface TextToDiagramRequest {
  prompt: string;
  existingComponents?: DesignComponent[];
  existingConnections?: Connection[];
  style?: 'minimal' | 'detailed' | 'annotated';
}

export interface TextToDiagramResponse {
  components: Omit<DesignComponent, 'id'>[];
  connections: Omit<Connection, 'id'>[];
  confidence: number;
  reasoning?: string;
}

export interface AIAssistantSuggestion {
  type: 'pattern' | 'optimization' | 'template' | 'layout' | 'connection';
  title: string;
  description: string;
  action?: () => void;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Generate diagram from text description using AI
 * TODO: Integrate with actual AI service (OpenAI, Anthropic, etc.)
 */
export const generateDiagramFromText = async (
  request: TextToDiagramRequest
): Promise<TextToDiagramResponse> => {
  const { prompt, existingComponents = [], existingConnections = [] } = request;

  // TODO: Replace with actual AI API call
  // For now, return template-based generation

  // Try to match prompt to existing templates
  const matchedTemplates = searchTemplates(prompt);
  if (matchedTemplates.length > 0) {
    const template = matchedTemplates[0];
    return {
      components: template.components,
      connections: template.connections,
      confidence: 0.7,
      reasoning: `Matched your prompt to the "${template.name}" template`,
    };
  }

  // Fallback: generate simple structure based on keywords
  const components = generateComponentsFromKeywords(prompt);
  const connections = generateBasicConnections(components);

  return {
    components,
    connections,
    confidence: 0.5,
    reasoning: 'Generated basic structure from prompt keywords',
  };
};

/**
 * Analyze current canvas and provide AI suggestions
 */
export const getCanvasAISuggestions = (
  components: DesignComponent[],
  connections: Connection[]
): AIAssistantSuggestion[] => {
  const suggestions: AIAssistantSuggestion[] = [];

  // Detect patterns and suggest improvements
  const detectedPatterns = detectPatterns(components, connections);
  detectedPatterns.forEach(pattern => {
    if (pattern.suggestions) {
      pattern.suggestions.forEach(suggestion => {
        suggestions.push({
          type: 'pattern',
          title: `${pattern.name} Improvement`,
          description: suggestion,
          priority: pattern.confidence > 0.8 ? 'high' : 'medium',
        });
      });
    }
  });

  // Get architecture suggestions
  const archSuggestions = getArchitectureSuggestions(components, connections);
  archSuggestions.forEach(suggestion => {
    suggestions.push({
      type: 'optimization',
      title: 'Architecture Suggestion',
      description: suggestion,
      priority: 'medium',
    });
  });

  // Suggest templates if canvas is empty or small
  if (components.length < 3) {
    suggestions.push({
      type: 'template',
      title: 'Start with a Template',
      description: 'Use a pre-built template to quickly get started',
      priority: 'low',
    });
  }

  // Check for layout issues
  if (hasOverlappingComponents(components)) {
    suggestions.push({
      type: 'layout',
      title: 'Overlapping Components Detected',
      description: 'Some components are overlapping. Consider using auto-layout.',
      priority: 'high',
    });
  }

  // Check for disconnected components
  const disconnected = findDisconnectedComponents(components, connections);
  if (disconnected.length > 0) {
    suggestions.push({
      type: 'connection',
      title: 'Disconnected Components',
      description: `${disconnected.length} components are not connected to the main diagram`,
      priority: 'medium',
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

/**
 * Generate components from prompt keywords
 * Simple keyword matching for now, to be replaced with AI
 */
const generateComponentsFromKeywords = (prompt: string): Omit<DesignComponent, 'id'>[] => {
  const components: Omit<DesignComponent, 'id'>[] = [];
  const lower = prompt.toLowerCase();

  let x = 200;
  let y = 200;
  const spacing = 200;

  // Check for common keywords
  if (lower.includes('api') || lower.includes('gateway')) {
    components.push({
      type: 'api-gateway',
      label: 'API Gateway',
      x,
      y,
      width: 120,
      height: 80,
      metadata: {},
    });
    y += spacing;
  }

  if (lower.includes('service')) {
    const serviceCount = (lower.match(/service/g) || []).length;
    for (let i = 0; i < Math.min(serviceCount, 5); i++) {
      components.push({
        type: 'service',
        label: `Service ${i + 1}`,
        x: x + (i % 3) * spacing,
        y,
        width: 120,
        height: 80,
        metadata: {},
      });
    }
    y += spacing;
  }

  if (lower.includes('database') || lower.includes('db')) {
    components.push({
      type: 'database',
      label: 'Database',
      x,
      y,
      width: 100,
      height: 60,
      metadata: {},
    });
  }

  return components;
};

/**
 * Generate basic connections between components
 */
const generateBasicConnections = (
  components: Omit<DesignComponent, 'id'>[]
): Omit<Connection, 'id'>[] => {
  // TODO: Implement intelligent connection generation
  // For now, return empty array
  return [];
};

/**
 * Check if components are overlapping
 */
const hasOverlappingComponents = (components: DesignComponent[]): boolean => {
  for (let i = 0; i < components.length; i++) {
    for (let j = i + 1; j < components.length; j++) {
      const a = components[i];
      const b = components[j];
      if (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
      ) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Find components not connected to the main graph
 */
const findDisconnectedComponents = (
  components: DesignComponent[],
  connections: Connection[]
): string[] => {
  if (components.length === 0) return [];

  const connected = new Set<string>();
  connections.forEach(conn => {
    connected.add(conn.from);
    connected.add(conn.to);
  });

  return components.filter(c => !connected.has(c.id)).map(c => c.id);
};

/**
 * Optimize canvas layout using force-directed algorithm
 * TODO: Implement actual layout algorithm
 */
export const optimizeCanvasLayout = (
  components: DesignComponent[],
  connections: Connection[]
): { x: number; y: number }[] => {
  // TODO: Implement force-directed layout or hierarchical layout
  // For now, return original positions
  return components.map(c => ({ x: c.x, y: c.y }));
};
