/**
 * ArchiComm Task Plugin System
 * Flexible and modular system for configuring system design tasks
 */

export interface TaskStep {
  id: string;
  title: string;
  description: string;
  type: 'component' | 'connection' | 'decision' | 'documentation' | 'validation';
  required: boolean;
  hints?: string[];
  validation?: {
    rules: ValidationRule[];
    autoCheck: boolean;
  };
}

export interface ValidationRule {
  type: 'component-count' | 'connection-exists' | 'pattern-match' | 'custom';
  condition: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime: number; // in minutes
  tags: string[];
  learningObjectives: string[];
  prerequisites: string[];

  // Task Configuration
  steps: TaskStep[];
  components: ComponentDefinition[];
  constraints: TaskConstraint[];
  evaluation: EvaluationCriteria;

  // Metadata
  author: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentDefinition {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'database' | 'api' | 'service' | 'integration' | 'infrastructure';
  description: string;
  icon: string;
  color: string;
  properties: ComponentProperty[];
  connectionPoints: ConnectionPoint[];
}

export interface ComponentProperty {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect';
  defaultValue?: any;
  options?: { value: any; label: string }[];
  validation?: PropertyValidation;
}

export interface PropertyValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: (value: any) => boolean;
}

export interface ConnectionPoint {
  id: string;
  name: string;
  type: 'input' | 'output' | 'bidirectional';
  protocol?: string;
  description?: string;
}

export interface TaskConstraint {
  id: string;
  type: 'component-limit' | 'connection-rule' | 'pattern-required' | 'custom';
  description: string;
  rule: string;
  enforcement: 'hard' | 'soft' | 'warning';
}

export interface EvaluationCriteria {
  completeness: {
    weight: number;
    criteria: string[];
  };
  correctness: {
    weight: number;
    criteria: string[];
  };
  efficiency: {
    weight: number;
    criteria: string[];
  };
  scalability: {
    weight: number;
    criteria: string[];
  };
  bestPractices: {
    weight: number;
    criteria: string[];
  };
}

export interface TaskPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;

  // Plugin capabilities
  providesComponents: ComponentDefinition[];
  providesTemplates: TaskTemplate[];
  providesValidators: CustomValidator[];

  // Plugin hooks
  onTaskStart?: (task: TaskTemplate) => void;
  onTaskComplete?: (task: TaskTemplate, result: TaskResult) => void;
  onComponentAdd?: (component: ComponentDefinition) => void;
  onValidation?: (task: TaskTemplate, design: DesignData) => ValidationResult;
}

export interface CustomValidator {
  id: string;
  name: string;
  description: string;
  validate: (design: DesignData, context: ValidationContext) => ValidationResult;
}

export interface ValidationContext {
  task: TaskTemplate;
  components: any[];
  connections: any[];
  userInput: any;
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  feedback: ValidationFeedback[];
  suggestions: string[];
}

export interface ValidationFeedback {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  component?: string;
  severity: number; // 1-10
}

export interface TaskResult {
  taskId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  duration: number;

  design: DesignData;
  evaluation: EvaluationResult;
  feedback: ValidationFeedback[];

  metadata: {
    attempts: number;
    hintsUsed: string[];
    validationResults: ValidationResult[];
  };
}

export interface DesignData {
  components: any[];
  connections: any[];
  annotations: any[];
  properties: Record<string, any>;
}

export interface EvaluationResult {
  overallScore: number;
  categoryScores: Record<string, number>;
  achievements: string[];
  improvements: string[];
}

/**
 * Task Plugin Manager
 * Manages loading, registration, and execution of task plugins
 */
export class TaskPluginManager {
  private plugins: Map<string, TaskPlugin> = new Map();
  private templates: Map<string, TaskTemplate> = new Map();
  private components: Map<string, ComponentDefinition> = new Map();
  private validators: Map<string, CustomValidator> = new Map();

  /**
   * Register a new task plugin
   */
  registerPlugin(plugin: TaskPlugin): void {
    this.plugins.set(plugin.id, plugin);

    // Register components
    plugin.providesComponents.forEach(component => {
      this.components.set(component.id, component);
    });

    // Register templates
    plugin.providesTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    // Register validators
    plugin.providesValidators.forEach(validator => {
      this.validators.set(validator.id, validator);
    });
  }

  /**
   * Load task templates from configuration
   */
  loadTemplatesFromConfig(config: TaskSystemConfig): void {
    config.templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Get available task templates by category
   */
  getTemplatesByCategory(category?: string): TaskTemplate[] {
    const templates = Array.from(this.templates.values());
    return category ? templates.filter(t => t.category === category) : templates;
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): TaskTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Validate a design against task requirements
   */
  async validateDesign(taskId: string, design: DesignData): Promise<ValidationResult> {
    const template = this.getTemplate(taskId);
    if (!template) {
      return {
        isValid: false,
        score: 0,
        feedback: [{ type: 'error', message: 'Task template not found', severity: 10 }],
        suggestions: [],
      };
    }

    const context: ValidationContext = {
      task: template,
      components: design.components,
      connections: design.connections,
      userInput: design.properties,
    };

    // Run built-in validation
    const builtInResult = await this.runBuiltInValidation(template, design, context);

    // Run custom validators
    const customResults = await Promise.all(
      template.steps
        .filter(step => step.validation)
        .map(step => this.runStepValidation(step, design, context))
    );

    // Combine results
    return this.combineValidationResults([builtInResult, ...customResults]);
  }

  private async runBuiltInValidation(
    template: TaskTemplate,
    design: DesignData,
    context: ValidationContext
  ): Promise<ValidationResult> {
    const feedback: ValidationFeedback[] = [];
    let score = 100;

    // Check required steps completion
    template.steps
      .filter(step => step.required)
      .forEach(step => {
        if (!this.isStepCompleted(step, design)) {
          feedback.push({
            type: 'error',
            message: `Required step "${step.title}" is not completed`,
            severity: 8,
          });
          score -= 20;
        }
      });

    // Check constraints
    template.constraints.forEach(constraint => {
      if (!this.checkConstraint(constraint, design)) {
        const severity = constraint.enforcement === 'hard' ? 'error' : 'warning';
        feedback.push({
          type: severity as any,
          message: constraint.description,
          severity: constraint.enforcement === 'hard' ? 9 : 5,
        });
        if (constraint.enforcement === 'hard') score -= 15;
      }
    });

    return {
      isValid: feedback.filter(f => f.type === 'error').length === 0,
      score: Math.max(0, score),
      feedback,
      suggestions: this.generateSuggestions(template, design),
    };
  }

  private async runStepValidation(
    step: TaskStep,
    design: DesignData,
    context: ValidationContext
  ): Promise<ValidationResult> {
    if (!step.validation) {
      return { isValid: true, score: 100, feedback: [], suggestions: [] };
    }

    const feedback: ValidationFeedback[] = [];
    let score = 100;

    step.validation.rules.forEach(rule => {
      if (!this.checkValidationRule(rule, design, context)) {
        feedback.push({
          type: rule.severity,
          message: rule.message,
          severity: rule.severity === 'error' ? 8 : rule.severity === 'warning' ? 5 : 3,
        });
        if (rule.severity === 'error') score -= 25;
      }
    });

    return {
      isValid: feedback.filter(f => f.type === 'error').length === 0,
      score: Math.max(0, score),
      feedback,
      suggestions: [],
    };
  }

  private combineValidationResults(results: ValidationResult[]): ValidationResult {
    const allFeedback = results.flatMap(r => r.feedback);
    const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    const isValid = results.every(r => r.isValid);
    const allSuggestions = [...new Set(results.flatMap(r => r.suggestions))];

    return {
      isValid,
      score: averageScore,
      feedback: allFeedback,
      suggestions: allSuggestions,
    };
  }

  private isStepCompleted(step: TaskStep, design: DesignData): boolean {
    // Implementation depends on step type
    switch (step.type) {
      case 'component':
        return design.components.length > 0;
      case 'connection':
        return design.connections.length > 0;
      case 'documentation':
        return design.annotations.length > 0;
      default:
        return true;
    }
  }

  private checkConstraint(constraint: TaskConstraint, design: DesignData): boolean {
    // Implementation depends on constraint type
    switch (constraint.type) {
      case 'component-limit': {
        const limit = parseInt(constraint.rule);
        return design.components.length <= limit;
      }
      case 'connection-rule':
        // Custom connection validation logic
        return true;
      default:
        return true;
    }
  }

  private checkValidationRule(
    rule: ValidationRule,
    design: DesignData,
    context: ValidationContext
  ): boolean {
    switch (rule.type) {
      case 'component-count': {
        const expectedCount = parseInt(rule.condition);
        return design.components.length >= expectedCount;
      }
      case 'connection-exists':
        return design.connections.some(conn => conn.type === rule.condition);
      case 'pattern-match':
        // Check for architectural patterns
        return this.checkArchitecturalPattern(rule.condition, design);
      default:
        return true;
    }
  }

  private checkArchitecturalPattern(pattern: string, design: DesignData): boolean {
    // Implementation for checking common architectural patterns
    // e.g., MVC, microservices, layered architecture, etc.
    return true;
  }

  private generateSuggestions(template: TaskTemplate, design: DesignData): string[] {
    const suggestions: string[] = [];

    // Generate contextual suggestions based on current design state
    if (design.components.length === 0) {
      suggestions.push('Start by adding components from the palette');
    }

    if (design.connections.length === 0 && design.components.length > 1) {
      suggestions.push('Connect your components to show data flow');
    }

    return suggestions;
  }
}

export interface TaskSystemConfig {
  templates: TaskTemplate[];
  globalComponents: ComponentDefinition[];
  defaultValidators: CustomValidator[];
  settings: {
    autoValidation: boolean;
    showHints: boolean;
    enablePlugins: boolean;
  };
}
