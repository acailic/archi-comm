/**
 * src/lib/validation/advanced-validation-engine.ts
 * Advanced validation engine for world-class canvas design validation
 * Provides real-time validation with pattern detection, performance analysis, security checks, and cost optimization
 * RELEVANT FILES: QuickValidationPanel.tsx, useDesignValidation.ts, design-comparison.ts, shared/contracts/index.ts
 */

import type { DesignData, DesignComponent, Connection } from '@/shared/contracts';

// Validation severity levels
export type ValidationSeverity = 'info' | 'warning' | 'error' | 'critical';

// Validation categories
export type ValidationCategory =
  | 'architecture'
  | 'performance'
  | 'security'
  | 'scalability'
  | 'cost'
  | 'reliability'
  | 'observability';

// Advanced validation result
export interface AdvancedValidationResult {
  overallScore: number;
  categoryScores: Record<ValidationCategory, number>;
  issues: ValidationIssue[];
  patterns: DetectedPattern[];
  suggestions: ValidationSuggestion[];
  performanceMetrics: PerformanceMetrics;
  securityAnalysis: SecurityAnalysis;
  costAnalysis: CostAnalysis;
}

// Individual validation issue
export interface ValidationIssue {
  id: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  title: string;
  description: string;
  componentIds?: string[];
  connectionIds?: string[];
  suggestion?: string;
  fixable: boolean;
  autoFix?: () => Partial<DesignData>;
}

// Detected architectural patterns
export interface DetectedPattern {
  id: string;
  name: string;
  description: string;
  category: 'good-practice' | 'anti-pattern' | 'emerging-pattern';
  confidence: number; // 0-1
  componentIds: string[];
  impact: 'positive' | 'negative' | 'neutral';
}

// Interactive suggestion with fix
export interface ValidationSuggestion {
  id: string;
  title: string;
  description: string;
  category: ValidationCategory;
  priority: 'low' | 'medium' | 'high';
  applyFix: () => Partial<DesignData>;
  estimatedEffort: 'quick' | 'moderate' | 'complex';
}

// Performance metrics
export interface PerformanceMetrics {
  throughput: number; // requests per second
  latency: number; // milliseconds
  bottlenecks: string[];
  scalabilityScore: number; // 0-100
  recommendations: string[];
}

// Security analysis
export interface SecurityAnalysis {
  vulnerabilityCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  exposedComponents: string[];
  missingControls: string[];
  recommendations: string[];
}

// Cost analysis
export interface CostAnalysis {
  estimatedMonthlyCost: number;
  costBreakdown: Record<string, number>;
  optimizationOpportunities: string[];
  savings: number;
}

/**
 * Advanced validation engine class
 */
export class AdvancedValidationEngine {
  private designData: DesignData;

  constructor(designData: DesignData) {
    this.designData = designData;
  }

  /**
   * Run comprehensive validation
   */
  async validate(): Promise<AdvancedValidationResult> {
    const issues = await this.detectIssues();
    const patterns = this.detectPatterns();
    const suggestions = this.generateSuggestions(issues);
    const performanceMetrics = this.analyzePerformance();
    const securityAnalysis = this.analyzeSecurity();
    const costAnalysis = this.analyzeCost();

    const categoryScores = this.calculateCategoryScores(issues);
    const overallScore = this.calculateOverallScore(categoryScores);

    return {
      overallScore,
      categoryScores,
      issues,
      patterns,
      suggestions,
      performanceMetrics,
      securityAnalysis,
      costAnalysis,
    };
  }

  /**
   * Detect all validation issues
   */
  private async detectIssues(): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Architecture issues
    issues.push(...this.detectArchitectureIssues());

    // Performance issues
    issues.push(...this.detectPerformanceIssues());

    // Security issues
    issues.push(...this.detectSecurityIssues());

    // Scalability issues
    issues.push(...this.detectScalabilityIssues());

    // Reliability issues
    issues.push(...this.detectReliabilityIssues());

    // Observability issues
    issues.push(...this.detectObservabilityIssues());

    return issues;
  }

  /**
   * Detect architecture-related issues
   */
  private detectArchitectureIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { components, connections } = this.designData;

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies();
    if (circularDeps.length > 0) {
      issues.push({
        id: 'circular-dependencies',
        category: 'architecture',
        severity: 'error',
        title: 'Circular Dependencies Detected',
        description: `Found circular dependencies between: ${circularDeps.join(', ')}`,
        componentIds: circularDeps,
        suggestion: 'Refactor to break circular dependencies using event-driven patterns or mediator pattern',
        fixable: false,
      });
    }

    // Check for single points of failure
    const spofs = this.detectSinglePointsOfFailure();
    spofs.forEach(spof => {
      issues.push({
        id: `spof-${spof.componentId}`,
        category: 'architecture',
        severity: 'warning',
        title: 'Single Point of Failure',
        description: `${spof.componentLabel} has ${spof.connectionCount} dependencies with no redundancy`,
        componentIds: [spof.componentId],
        suggestion: 'Add redundant instances or load balancers for high availability',
        fixable: true,
        autoFix: () => this.addLoadBalancer(spof.componentId),
      });
    });

    // Check for tight coupling
    const tightCouplings = this.detectTightCoupling();
    tightCouplings.forEach(coupling => {
      issues.push({
        id: `tight-coupling-${coupling.componentId}`,
        category: 'architecture',
        severity: 'warning',
        title: 'Tight Coupling Detected',
        description: `${coupling.componentLabel} has ${coupling.directConnections} direct connections, consider introducing abstraction layers`,
        componentIds: [coupling.componentId],
        suggestion: 'Introduce API gateway or message queue to reduce coupling',
        fixable: true,
        autoFix: () => this.addApiGateway(coupling.componentId),
      });
    });

    // Check for missing error handling
    if (!this.hasErrorHandling()) {
      issues.push({
        id: 'missing-error-handling',
        category: 'architecture',
        severity: 'warning',
        title: 'Missing Error Handling',
        description: 'No circuit breakers or error handling components detected',
        suggestion: 'Add circuit breakers and retry mechanisms for resilience',
        fixable: true,
        autoFix: () => this.addCircuitBreaker(),
      });
    }

    return issues;
  }

  /**
   * Detect performance-related issues
   */
  private detectPerformanceIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { components, connections } = this.designData;

    // Check for N+1 query patterns
    const nPlusOnePatterns = this.detectNPlusOneQueries();
    nPlusOnePatterns.forEach(pattern => {
      issues.push({
        id: `n-plus-one-${pattern.databaseId}`,
        category: 'performance',
        severity: 'warning',
        title: 'Potential N+1 Query Pattern',
        description: `${pattern.databaseLabel} accessed by ${pattern.accessorCount} services without batching`,
        componentIds: [pattern.databaseId],
        suggestion: 'Implement batch queries or caching to reduce database load',
        fixable: true,
        autoFix: () => this.addCacheLayer(pattern.databaseId),
      });
    });

    // Check for missing caching
    const uncachedDatabases = this.detectUncachedDatabases();
    uncachedDatabases.forEach(db => {
      issues.push({
        id: `uncached-db-${db.id}`,
        category: 'performance',
        severity: 'info',
        title: 'Database Without Cache',
        description: `${db.label} has no caching layer, consider adding Redis or similar`,
        componentIds: [db.id],
        suggestion: 'Add caching layer to improve read performance',
        fixable: true,
        autoFix: () => this.addCacheLayer(db.id),
      });
    });

    // Check for synchronous communication bottlenecks
    const syncBottlenecks = this.detectSyncBottlenecks();
    syncBottlenecks.forEach(bottleneck => {
      issues.push({
        id: `sync-bottleneck-${bottleneck.componentId}`,
        category: 'performance',
        severity: 'warning',
        title: 'Synchronous Communication Bottleneck',
        description: `${bottleneck.componentLabel} has ${bottleneck.syncConnections} synchronous connections`,
        componentIds: [bottleneck.componentId],
        suggestion: 'Consider async communication with message queues',
        fixable: true,
        autoFix: () => this.addMessageQueue(bottleneck.componentId),
      });
    });

    return issues;
  }

  /**
   * Detect security-related issues
   */
  private detectSecurityIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const { components, connections } = this.designData;

    // Check for missing authentication
    const exposedApis = this.detectExposedAPIs();
    exposedApis.forEach(api => {
      issues.push({
        id: `exposed-api-${api.id}`,
        category: 'security',
        severity: 'critical',
        title: 'Exposed API Without Authentication',
        description: `${api.label} is directly accessible without authentication controls`,
        componentIds: [api.id],
        suggestion: 'Add authentication middleware or API gateway with auth',
        fixable: true,
        autoFix: () => this.addAuthentication(api.id),
      });
    });

    // Check for data at rest encryption
    const unencryptedData = this.detectUnencryptedData();
    unencryptedData.forEach(data => {
      issues.push({
        id: `unencrypted-data-${data.id}`,
        category: 'security',
        severity: 'high',
        title: 'Unencrypted Data Storage',
        description: `${data.label} stores data without encryption`,
        componentIds: [data.id],
        suggestion: 'Enable encryption at rest for sensitive data',
        fixable: false,
      });
    });

    // Check for missing input validation
    if (!this.hasInputValidation()) {
      issues.push({
        id: 'missing-input-validation',
        category: 'security',
        severity: 'error',
        title: 'Missing Input Validation',
        description: 'No input validation components detected',
        suggestion: 'Add input validation and sanitization layers',
        fixable: true,
        autoFix: () => this.addInputValidation(),
      });
    }

    // Check for insecure communication
    const insecureConnections = this.detectInsecureConnections();
    insecureConnections.forEach(conn => {
      issues.push({
        id: `insecure-connection-${conn.id}`,
        category: 'security',
        severity: 'high',
        title: 'Insecure Communication',
        description: `Connection ${conn.from} → ${conn.to} lacks encryption`,
        connectionIds: [conn.id],
        suggestion: 'Use HTTPS/TLS for all external communications',
        fixable: false,
      });
    });

    return issues;
  }

  /**
   * Detect scalability issues
   */
  private detectScalabilityIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for monolithic components
    const monoliths = this.detectMonolithicComponents();
    monoliths.forEach(monolith => {
      issues.push({
        id: `monolith-${monolith.id}`,
        category: 'scalability',
        severity: 'warning',
        title: 'Monolithic Component',
        description: `${monolith.label} handles multiple responsibilities, consider microservices`,
        componentIds: [monolith.id],
        suggestion: 'Break down into smaller, focused microservices',
        fixable: false,
      });
    });

    // Check for missing load balancers
    const unbalancedServices = this.detectUnbalancedServices();
    unbalancedServices.forEach(service => {
      issues.push({
        id: `unbalanced-${service.id}`,
        category: 'scalability',
        severity: 'info',
        title: 'Service Without Load Balancing',
        description: `${service.label} has no load balancer for scaling`,
        componentIds: [service.id],
        suggestion: 'Add load balancer for horizontal scaling',
        fixable: true,
        autoFix: () => this.addLoadBalancer(service.id),
      });
    });

    return issues;
  }

  /**
   * Detect reliability issues
   */
  private detectReliabilityIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for missing health checks
    const unhealthyServices = this.detectMissingHealthChecks();
    unhealthyServices.forEach(service => {
      issues.push({
        id: `no-health-check-${service.id}`,
        category: 'reliability',
        severity: 'warning',
        title: 'Missing Health Checks',
        description: `${service.label} has no health check endpoints`,
        componentIds: [service.id],
        suggestion: 'Add health check endpoints for monitoring',
        fixable: false,
      });
    });

    // Check for missing circuit breakers
    if (!this.hasCircuitBreakers()) {
      issues.push({
        id: 'missing-circuit-breakers',
        category: 'reliability',
        severity: 'info',
        title: 'Missing Circuit Breakers',
        description: 'No circuit breaker patterns detected for fault tolerance',
        suggestion: 'Implement circuit breakers to prevent cascade failures',
        fixable: true,
        autoFix: () => this.addCircuitBreaker(),
      });
    }

    return issues;
  }

  /**
   * Detect observability issues
   */
  private detectObservabilityIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for missing monitoring
    if (!this.hasMonitoring()) {
      issues.push({
        id: 'missing-monitoring',
        category: 'observability',
        severity: 'info',
        title: 'Missing Monitoring',
        description: 'No monitoring components detected',
        suggestion: 'Add monitoring and logging for observability',
        fixable: true,
        autoFix: () => this.addMonitoring(),
      });
    }

    // Check for missing logging
    if (!this.hasLogging()) {
      issues.push({
        id: 'missing-logging',
        category: 'observability',
        severity: 'info',
        title: 'Missing Centralized Logging',
        description: 'No centralized logging detected',
        suggestion: 'Implement centralized logging for debugging and analysis',
        fixable: false,
      });
    }

    return issues;
  }

  /**
   * Detect architectural patterns
   */
  private detectPatterns(): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const { components, connections } = this.designData;

    // Microservices pattern
    const microservices = components.filter(c => c.type === 'microservice');
    if (microservices.length >= 3) {
      patterns.push({
        id: 'microservices-architecture',
        name: 'Microservices Architecture',
        description: 'System decomposed into small, independent services',
        category: 'good-practice',
        confidence: 0.8,
        componentIds: microservices.map(c => c.id),
        impact: 'positive',
      });
    }

    // Event-driven architecture
    const messageQueues = components.filter(c => c.type === 'message-queue');
    if (messageQueues.length > 0 && connections.some(c => c.type === 'async')) {
      patterns.push({
        id: 'event-driven-architecture',
        name: 'Event-Driven Architecture',
        description: 'Asynchronous communication between components',
        category: 'good-practice',
        confidence: 0.7,
        componentIds: messageQueues.map(c => c.id),
        impact: 'positive',
      });
    }

    // CQRS pattern
    const hasSeparateReadWrite = this.detectCQRS();
    if (hasSeparateReadWrite) {
      patterns.push({
        id: 'cqrs-pattern',
        name: 'CQRS Pattern',
        description: 'Separate read and write models for better performance',
        category: 'good-practice',
        confidence: 0.6,
        componentIds: [], // Would need more sophisticated detection
        impact: 'positive',
      });
    }

    // God object anti-pattern
    const godObjects = this.detectGodObjects();
    godObjects.forEach(god => {
      patterns.push({
        id: `god-object-${god.id}`,
        name: 'God Object Anti-pattern',
        description: 'Component with too many responsibilities',
        category: 'anti-pattern',
        confidence: 0.8,
        componentIds: [god.id],
        impact: 'negative',
      });
    });

    return patterns;
  }

  /**
   * Generate actionable suggestions
   */
  private generateSuggestions(issues: ValidationIssue[]): ValidationSuggestion[] {
    const suggestions: ValidationSuggestion[] = [];

    // Group issues by category and priority
    const highPriorityIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'error');
    const mediumPriorityIssues = issues.filter(i => i.severity === 'warning');
    const lowPriorityIssues = issues.filter(i => i.severity === 'info');

    // Create suggestions from fixable issues
    [...highPriorityIssues, ...mediumPriorityIssues, ...lowPriorityIssues]
      .filter(issue => issue.fixable && issue.autoFix)
      .slice(0, 10) // Limit to top 10
      .forEach(issue => {
        suggestions.push({
          id: `suggestion-${issue.id}`,
          title: issue.title,
          description: issue.suggestion || issue.description,
          category: issue.category,
          priority: issue.severity === 'critical' || issue.severity === 'error' ? 'high' :
                   issue.severity === 'warning' ? 'medium' : 'low',
          applyFix: issue.autoFix!,
          estimatedEffort: 'quick', // Could be more sophisticated
        });
      });

    return suggestions;
  }

  /**
   * Analyze performance metrics
   */
  private analyzePerformance(): PerformanceMetrics {
    const { components, connections } = this.designData;

    // Simple throughput estimation
    const serviceCount = components.filter(c => c.type === 'server' || c.type === 'microservice').length;
    const hasCache = components.some(c => c.type === 'cache');
    const hasLoadBalancer = components.some(c => c.type === 'load-balancer');

    let throughput = serviceCount * 100; // Base throughput per service
    if (hasCache) throughput *= 1.5;
    if (hasLoadBalancer) throughput *= 2;

    // Estimate latency
    let latency = 50; // Base latency
    if (hasCache) latency *= 0.7;
    const asyncConnections = connections.filter(c => c.type === 'async').length;
    if (asyncConnections > 0) latency *= 0.8;

    // Detect bottlenecks
    const bottlenecks: string[] = [];
    const highConnectionComponents = this.getHighConnectionComponents();
    highConnectionComponents.forEach(comp => {
      bottlenecks.push(`${comp.label} (${comp.connections} connections)`);
    });

    // Scalability score
    let scalabilityScore = 50; // Base score
    if (hasLoadBalancer) scalabilityScore += 20;
    if (asyncConnections > 0) scalabilityScore += 15;
    if (hasCache) scalabilityScore += 10;
    if (serviceCount >= 3) scalabilityScore += 10;

    const recommendations: string[] = [];
    if (!hasCache) recommendations.push('Add caching layer for better performance');
    if (!hasLoadBalancer && serviceCount > 2) recommendations.push('Consider load balancing for scalability');
    if (asyncConnections === 0) recommendations.push('Use async communication for better throughput');

    return {
      throughput: Math.round(throughput),
      latency: Math.round(latency),
      bottlenecks,
      scalabilityScore: Math.min(100, scalabilityScore),
      recommendations,
    };
  }

  /**
   * Analyze security posture
   */
  private analyzeSecurity(): SecurityAnalysis {
    const { components, connections } = this.designData;

    const exposedComponents: string[] = [];
    const missingControls: string[] = [];

    // Find exposed APIs
    const apiComponents = components.filter(c => c.type === 'api-gateway' || c.type === 'server');
    apiComponents.forEach(api => {
      const hasAuth = connections.some(conn =>
        conn.to === api.id && components.find(c => c.id === conn.from)?.type === 'server' // Simplified auth check
      );
      if (!hasAuth) {
        exposedComponents.push(api.label);
      }
    });

    // Check for missing controls
    if (!components.some(c => c.type === 'server' && c.label.toLowerCase().includes('auth'))) {
      missingControls.push('Authentication service');
    }
    if (!components.some(c => c.type === 'server' && c.label.toLowerCase().includes('rate'))) {
      missingControls.push('Rate limiting');
    }

    const vulnerabilityCount = exposedComponents.length + missingControls.length;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (vulnerabilityCount >= 3) riskLevel = 'critical';
    else if (vulnerabilityCount >= 2) riskLevel = 'high';
    else if (vulnerabilityCount >= 1) riskLevel = 'medium';

    const recommendations: string[] = [];
    if (exposedComponents.length > 0) {
      recommendations.push('Add authentication to exposed APIs');
    }
    if (missingControls.includes('Authentication service')) {
      recommendations.push('Implement centralized authentication');
    }
    if (missingControls.includes('Rate limiting')) {
      recommendations.push('Add rate limiting to prevent abuse');
    }

    return {
      vulnerabilityCount,
      riskLevel,
      exposedComponents,
      missingControls,
      recommendations,
    };
  }

  /**
   * Analyze cost implications
   */
  private analyzeCost(): CostAnalysis {
    const { components } = this.designData;

    const costBreakdown: Record<string, number> = {};
    let totalCost = 0;

    // Estimate costs for different component types
    components.forEach(comp => {
      let cost = 0;
      switch (comp.type) {
        case 'server':
        case 'microservice':
          cost = 50; // Base server cost
          break;
        case 'database':
          cost = 100; // Database cost
          break;
        case 'cache':
          cost = 30; // Cache cost
          break;
        case 'load-balancer':
          cost = 20; // Load balancer cost
          break;
        case 'storage':
          cost = 40; // Storage cost
          break;
        case 'monitoring':
          cost = 25; // Monitoring cost
          break;
        default:
          cost = 10; // Default cost
      }
      costBreakdown[comp.type] = (costBreakdown[comp.type] || 0) + cost;
      totalCost += cost;
    });

    const optimizationOpportunities: string[] = [];
    const serverCount = components.filter(c => c.type === 'server' || c.type === 'microservice').length;
    const dbCount = components.filter(c => c.type === 'database').length;

    if (serverCount > 3 && !components.some(c => c.type === 'load-balancer')) {
      optimizationOpportunities.push('Consolidate servers with load balancer');
    }
    if (dbCount > 1) {
      optimizationOpportunities.push('Consider database consolidation');
    }
    if (!components.some(c => c.type === 'cache') && components.some(c => c.type === 'database')) {
      optimizationOpportunities.push('Add caching to reduce database costs');
    }

    // Estimate savings from optimizations
    let savings = 0;
    if (optimizationOpportunities.includes('Consolidate servers with load balancer')) {
      savings += serverCount * 10; // 10 per server saved
    }
    if (optimizationOpportunities.includes('Add caching to reduce database costs')) {
      savings += dbCount * 20; // 20 per database saved
    }

    return {
      estimatedMonthlyCost: totalCost,
      costBreakdown,
      optimizationOpportunities,
      savings,
    };
  }

  // Helper methods for issue detection
  private detectCircularDependencies(): string[] {
    // Simplified circular dependency detection
    const { connections } = this.designData;
    const graph: Record<string, string[]> = {};

    // Build adjacency list
    connections.forEach(conn => {
      if (!graph[conn.from]) graph[conn.from] = [];
      graph[conn.from].push(conn.to);
    });

    // Simple cycle detection (basic implementation)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      if (recursionStack.has(node)) return true;
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const neighbors = graph[node] || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) return true;
      }

      recursionStack.delete(node);
      return false;
    };

    for (const node of Object.keys(graph)) {
      if (hasCycle(node)) return [node]; // Return first cycle found
    }

    return [];
  }

  private detectSinglePointsOfFailure(): Array<{componentId: string, componentLabel: string, connectionCount: number}> {
    const { components, connections } = this.designData;
    const connectionCounts = new Map<string, number>();

    connections.forEach(conn => {
      connectionCounts.set(conn.to, (connectionCounts.get(conn.to) || 0) + 1);
    });

    return Array.from(connectionCounts.entries())
      .filter(([, count]) => count >= 4) // Arbitrary threshold
      .map(([componentId, connectionCount]) => ({
        componentId,
        componentLabel: components.find(c => c.id === componentId)?.label || componentId,
        connectionCount,
      }));
  }

  private detectTightCoupling(): Array<{componentId: string, componentLabel: string, directConnections: number}> {
    const { components, connections } = this.designData;
    const connectionCounts = new Map<string, number>();

    connections.forEach(conn => {
      connectionCounts.set(conn.from, (connectionCounts.get(conn.from) || 0) + 1);
    });

    return Array.from(connectionCounts.entries())
      .filter(([, count]) => count >= 5) // Arbitrary threshold
      .map(([componentId, directConnections]) => ({
        componentId,
        componentLabel: components.find(c => c.id === componentId)?.label || componentId,
        directConnections,
      }));
  }

  private hasErrorHandling(): boolean {
    return this.designData.components.some(c =>
      c.type === 'server' && c.label.toLowerCase().includes('circuit')
    );
  }

  private detectNPlusOneQueries(): Array<{databaseId: string, databaseLabel: string, accessorCount: number}> {
    // Simplified detection - databases accessed by multiple services
    const { components, connections } = this.designData;
    const dbConnections = new Map<string, number>();

    connections.forEach(conn => {
      const targetComp = components.find(c => c.id === conn.to);
      if (targetComp?.type === 'database') {
        dbConnections.set(conn.to, (dbConnections.get(conn.to) || 0) + 1);
      }
    });

    return Array.from(dbConnections.entries())
      .filter(([, count]) => count >= 3)
      .map(([databaseId, accessorCount]) => ({
        databaseId,
        databaseLabel: components.find(c => c.id === databaseId)?.label || databaseId,
        accessorCount,
      }));
  }

  private detectUncachedDatabases(): DesignComponent[] {
    const { components, connections } = this.designData;

    return components
      .filter(comp => comp.type === 'database')
      .filter(db => {
        // Check if database has a cache connected
        return !connections.some(conn =>
          (conn.from === db.id || conn.to === db.id) &&
          components.find(c => c.id === (conn.from === db.id ? conn.to : conn.from))?.type === 'cache'
        );
      });
  }

  private detectSyncBottlenecks(): Array<{componentId: string, componentLabel: string, syncConnections: number}> {
    const { components, connections } = this.designData;
    const syncCounts = new Map<string, number>();

    connections.forEach(conn => {
      if (conn.type === 'sync') {
        syncCounts.set(conn.from, (syncCounts.get(conn.from) || 0) + 1);
      }
    });

    return Array.from(syncCounts.entries())
      .filter(([, count]) => count >= 3)
      .map(([componentId, syncConnections]) => ({
        componentId,
        componentLabel: components.find(c => c.id === componentId)?.label || componentId,
        syncConnections,
      }));
  }

  private detectExposedAPIs(): DesignComponent[] {
    return this.designData.components.filter(c =>
      (c.type === 'api-gateway' || c.type === 'server') &&
      !this.designData.connections.some(conn =>
        conn.to === c.id &&
        this.designData.components.find(comp => comp.id === conn.from)?.type === 'server' // Simplified auth check
      )
    );
  }

  private detectUnencryptedData(): DesignComponent[] {
    return this.designData.components.filter(c =>
      c.type === 'database' || c.type === 'storage'
      // In a real implementation, this would check component properties for encryption settings
    );
  }

  private hasInputValidation(): boolean {
    return this.designData.components.some(c =>
      c.type === 'server' && c.label.toLowerCase().includes('validation')
    );
  }

  private detectInsecureConnections(): Connection[] {
    return this.designData.connections.filter(conn =>
      !conn.protocol || !conn.protocol.includes('TLS') && !conn.protocol.includes('HTTPS')
    );
  }

  private detectMonolithicComponents(): DesignComponent[] {
    return this.designData.components.filter(c =>
      (c.type === 'server' || c.type === 'microservice') &&
      c.label.toLowerCase().includes('monolith')
    );
  }

  private detectUnbalancedServices(): DesignComponent[] {
    const { components, connections } = this.designData;

    return components
      .filter(c => c.type === 'server' || c.type === 'microservice')
      .filter(service => {
        // Check if service has load balancer
        return !connections.some(conn =>
          (conn.from === service.id || conn.to === service.id) &&
          components.find(c => c.id === (conn.from === service.id ? conn.to : conn.from))?.type === 'load-balancer'
        );
      });
  }

  private detectMissingHealthChecks(): DesignComponent[] {
    return this.designData.components.filter(c =>
      (c.type === 'server' || c.type === 'microservice') &&
      !(c.properties as any)?.healthCheck
    );
  }

  private hasCircuitBreakers(): boolean {
    return this.designData.components.some(c =>
      c.type === 'server' && c.label.toLowerCase().includes('circuit')
    );
  }

  private hasMonitoring(): boolean {
    return this.designData.components.some(c => c.type === 'monitoring');
  }

  private hasLogging(): boolean {
    return this.designData.components.some(c =>
      c.type === 'server' && c.label.toLowerCase().includes('log')
    );
  }

  private detectCQRS(): boolean {
    // Simplified CQRS detection - separate read/write databases
    const databases = this.designData.components.filter(c => c.type === 'database');
    return databases.length >= 2 && databases.some(db => db.label.toLowerCase().includes('read'));
  }

  private detectGodObjects(): DesignComponent[] {
    const { components, connections } = this.designData;
    const connectionCounts = new Map<string, number>();

    connections.forEach(conn => {
      connectionCounts.set(conn.from, (connectionCounts.get(conn.from) || 0) + 1);
      connectionCounts.set(conn.to, (connectionCounts.get(conn.to) || 0) + 1);
    });

    return components.filter(c =>
      (connectionCounts.get(c.id) || 0) >= 7 // Arbitrary threshold for "god object"
    );
  }

  private getHighConnectionComponents(): Array<{id: string, label: string, connections: number}> {
    const { components, connections } = this.designData;
    const connectionCounts = new Map<string, number>();

    connections.forEach(conn => {
      connectionCounts.set(conn.from, (connectionCounts.get(conn.from) || 0) + 1);
      connectionCounts.set(conn.to, (connectionCounts.get(conn.to) || 0) + 1);
    });

    return Array.from(connectionCounts.entries())
      .filter(([, count]) => count >= 5)
      .map(([id, connections]) => ({
        id,
        label: components.find(c => c.id === id)?.label || id,
        connections,
      }));
  }

  // Auto-fix methods
  private addLoadBalancer(targetComponentId: string): Partial<DesignData> {
    const newComponent: DesignComponent = {
      id: `load-balancer-${Date.now()}`,
      type: 'load-balancer',
      x: 100,
      y: 100,
      label: 'Load Balancer',
    };

    const newConnection: Connection = {
      id: `lb-conn-${Date.now()}`,
      from: newComponent.id,
      to: targetComponentId,
      label: 'Load Balance',
      type: 'sync',
    };

    return {
      components: [newComponent],
      connections: [newConnection],
    };
  }

  private addApiGateway(targetComponentId: string): Partial<DesignData> {
    const newComponent: DesignComponent = {
      id: `api-gateway-${Date.now()}`,
      type: 'api-gateway',
      x: 200,
      y: 100,
      label: 'API Gateway',
    };

    const newConnection: Connection = {
      id: `api-conn-${Date.now()}`,
      from: newComponent.id,
      to: targetComponentId,
      label: 'API Route',
      type: 'sync',
    };

    return {
      components: [newComponent],
      connections: [newConnection],
    };
  }

  private addCircuitBreaker(): Partial<DesignData> {
    const newComponent: DesignComponent = {
      id: `circuit-breaker-${Date.now()}`,
      type: 'server',
      x: 150,
      y: 150,
      label: 'Circuit Breaker',
    };

    return {
      components: [newComponent],
    };
  }

  private addCacheLayer(targetComponentId: string): Partial<DesignData> {
    const newComponent: DesignComponent = {
      id: `cache-${Date.now()}`,
      type: 'cache',
      x: 250,
      y: 100,
      label: 'Redis Cache',
    };

    const newConnection: Connection = {
      id: `cache-conn-${Date.now()}`,
      from: targetComponentId,
      to: newComponent.id,
      label: 'Cache',
      type: 'sync',
    };

    return {
      components: [newComponent],
      connections: [newConnection],
    };
  }

  private addMessageQueue(targetComponentId: string): Partial<DesignData> {
    const newComponent: DesignComponent = {
      id: `queue-${Date.now()}`,
      type: 'message-queue',
      x: 300,
      y: 100,
      label: 'Message Queue',
    };

    const newConnection: Connection = {
      id: `queue-conn-${Date.now()}`,
      from: targetComponentId,
      to: newComponent.id,
      label: 'Async',
      type: 'async',
    };

    return {
      components: [newComponent],
      connections: [newConnection],
    };
  }

  private addAuthentication(targetComponentId: string): Partial<DesignData> {
    const newComponent: DesignComponent = {
      id: `auth-${Date.now()}`,
      type: 'server',
      x: 350,
      y: 100,
      label: 'Auth Service',
    };

    const newConnection: Connection = {
      id: `auth-conn-${Date.now()}`,
      from: newComponent.id,
      to: targetComponentId,
      label: 'Authenticate',
      type: 'sync',
    };

    return {
      components: [newComponent],
      connections: [newConnection],
    };
  }

  private addInputValidation(): Partial<DesignData> {
    const newComponent: DesignComponent = {
      id: `validation-${Date.now()}`,
      type: 'server',
      x: 400,
      y: 100,
      label: 'Input Validation',
    };

    return {
      components: [newComponent],
    };
  }

  private addMonitoring(): Partial<DesignData> {
    const newComponent: DesignComponent = {
      id: `monitoring-${Date.now()}`,
      type: 'monitoring',
      x: 450,
      y: 100,
      label: 'Monitoring',
    };

    return {
      components: [newComponent],
    };
  }

  private calculateCategoryScores(issues: ValidationIssue[]): Record<ValidationCategory, number> {
    const categoryCounts = new Map<ValidationCategory, { total: number, critical: number }>();

    // Initialize all categories
    const categories: ValidationCategory[] = ['architecture', 'performance', 'security', 'scalability', 'cost', 'reliability', 'observability'];
    categories.forEach(cat => categoryCounts.set(cat, { total: 0, critical: 0 }));

    // Count issues by category
    issues.forEach(issue => {
      const current = categoryCounts.get(issue.category)!;
      current.total++;
      if (issue.severity === 'critical' || issue.severity === 'error') {
        current.critical++;
      }
    });

    // Calculate scores (100 - penalty for issues)
    const scores: Record<ValidationCategory, number> = {} as Record<ValidationCategory, number>;
    categoryCounts.forEach((counts, category) => {
      let score = 100;
      score -= counts.critical * 20; // 20 points per critical issue
      score -= Math.min(counts.total - counts.critical, 5) * 5; // 5 points per warning/info, max 25
      scores[category] = Math.max(0, score);
    });

    return scores;
  }

  private calculateOverallScore(categoryScores: Record<ValidationCategory, number>): number {
    const scores = Object.values(categoryScores);
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }
}

/**
 * Singleton instance factory
 */
export const advancedValidationEngine = {
  create: (designData: DesignData) => new AdvancedValidationEngine(designData),
};