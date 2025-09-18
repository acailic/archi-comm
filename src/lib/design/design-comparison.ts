/**
 * src/lib/design/design-comparison.ts
 * Design comparison utility for validating user solutions against challenge templates
 * This file provides functions to compare user designs with example solutions and generate scores
 * RELEVANT FILES: src/shared/contracts/index.ts, src/lib/config/challenge-config.ts, src/shared/hooks/validation/useDesignValidation.ts, src/packages/ui/components/pages/ReviewScreen.tsx
 */

import type { ArchitectureTemplate, TemplateComponent, TemplateConnection } from '../config/challenge-config';
import type {
  DesignData,
  DesignValidationResult,
  ComponentMatch,
  ConnectionMatch,
  ValidationFeedback
} from '@/shared/contracts';

// Scoring constants
const SCORE_COMPONENT_MATCH = 10;
const SCORE_CONNECTION_MATCH = 5;
const SCORE_MISSING_COMPONENT = -5;

/**
 * Main function to compare user design with challenge template
 */
export function compareDesigns(
  userDesign: DesignData,
  template: ArchitectureTemplate
): DesignValidationResult {
  // Handle edge cases
  if (!userDesign || !template) {
    return createEmptyValidationResult();
  }

  if (!userDesign.components || !template.components) {
    return createEmptyValidationResult();
  }

  // Match components between user design and template
  const componentMatches = matchComponents(userDesign.components, template.components);

  // Match connections
  const connectionMatches = matchConnections(
    userDesign.connections || [],
    template.connections || [],
    componentMatches
  );

  // Calculate score
  const { score, maxScore } = calculateScore(componentMatches, connectionMatches);

  // Generate feedback
  const feedback = generateFeedback(componentMatches, connectionMatches);

  // Extract missing and extra components
  const missingComponents = componentMatches
    .filter(match => !match.matched)
    .map(match => match.templateComponent);

  const extraComponents = userDesign.components
    .filter(comp => !componentMatches.some(match =>
      match.userComponentId === comp.id || match.userComponentLabel === comp.label
    ))
    .map(comp => comp.label);

  const incorrectConnections = connectionMatches
    .filter(match => !match.found)
    .map(match => match.expected);

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return {
    score,
    maxScore,
    percentage,
    componentMatches,
    connectionMatches,
    feedback,
    missingComponents,
    extraComponents,
    incorrectConnections
  };
}

/**
 * Match components between user design and template
 */
function matchComponents(
  userComponents: DesignData['components'],
  templateComponents: TemplateComponent[]
): ComponentMatch[] {
  const matches: ComponentMatch[] = [];
  const usedUserComponents = new Set<string>(); // Track already matched user components

  for (const templateComp of templateComponents) {
    const userComp = findMatchingUserComponent(userComponents, templateComp, usedUserComponents);

    if (userComp) {
      usedUserComponents.add(userComp.id); // Mark this user component as used
      matches.push({
        templateComponent: templateComp.label,
        userComponent: userComp.id,
        userComponentId: userComp.id,
        userComponentLabel: userComp.label,
        matched: true,
        reason: 'Component found with matching type and label'
      });
    } else {
      matches.push({
        templateComponent: templateComp.label,
        matched: false,
        reason: `Missing component: ${templateComp.type} (${templateComp.label})`
      });
    }
  }

  return matches;
}

/**
 * Find matching user component for a template component
 */
function findMatchingUserComponent(
  userComponents: DesignData['components'],
  templateComponent: TemplateComponent,
  usedUserComponents: Set<string>
) {
  // First try exact label match (case insensitive)
  let match = userComponents.find(comp =>
    !usedUserComponents.has(comp.id) &&
    normalizeString(comp.label) === normalizeString(templateComponent.label)
  );

  if (match) return match;

  // Then try type match with similar label
  match = userComponents.find(comp =>
    !usedUserComponents.has(comp.id) &&
    normalizeComponentType(comp.type) === normalizeComponentType(templateComponent.type) &&
    areLabelsRelated(comp.label, templateComponent.label)
  );

  if (match) return match;

  // Finally try just type match if no better option
  return userComponents.find(comp =>
    !usedUserComponents.has(comp.id) &&
    normalizeComponentType(comp.type) === normalizeComponentType(templateComponent.type)
  );
}

/**
 * Match connections between user design and template
 */
function matchConnections(
  userConnections: DesignData['connections'],
  templateConnections: TemplateConnection[],
  componentMatches: ComponentMatch[]
): ConnectionMatch[] {
  const matches: ConnectionMatch[] = [];

  for (const templateConn of templateConnections) {
    const expectedConnection = `${templateConn.from} → ${templateConn.to}`;

    // Find if this connection exists in user design
    const found = userConnections.some(userConn =>
      isConnectionMatch(userConn, templateConn, componentMatches)
    );

    matches.push({
      expected: expectedConnection,
      found,
      reason: found
        ? 'Connection found'
        : `Missing connection between ${templateConn.from} and ${templateConn.to}`
    });
  }

  return matches;
}

/**
 * Check if user connection matches template connection
 */
function isConnectionMatch(
  userConnection: DesignData['connections'][0],
  templateConnection: TemplateConnection,
  componentMatches: ComponentMatch[]
) {
  // Map template component labels to user component IDs
  const fromMatch = componentMatches.find(match =>
    match.templateComponent === templateConnection.from && match.matched
  );
  const toMatch = componentMatches.find(match =>
    match.templateComponent === templateConnection.to && match.matched
  );

  if (!fromMatch || !toMatch) return false;

  // Check if user has connection between these components
  // Check both ID and label for more robust matching
  return (
    (userConnection.from === fromMatch.userComponentId && userConnection.to === toMatch.userComponentId) ||
    (userConnection.to === fromMatch.userComponentId && userConnection.from === toMatch.userComponentId) ||
    (userConnection.from === fromMatch.userComponentLabel && userConnection.to === toMatch.userComponentLabel) ||
    (userConnection.to === fromMatch.userComponentLabel && userConnection.from === toMatch.userComponentLabel) ||
    (userConnection.from === fromMatch.userComponent && userConnection.to === toMatch.userComponent) ||
    (userConnection.to === fromMatch.userComponent && userConnection.from === toMatch.userComponent)
  );
}

/**
 * Calculate total score and max possible score
 */
function calculateScore(
  componentMatches: ComponentMatch[],
  connectionMatches: ConnectionMatch[]
): { score: number; maxScore: number } {
  let score = 0;

  // Score for matched components
  const matchedComponents = componentMatches.filter(match => match.matched).length;
  score += matchedComponents * SCORE_COMPONENT_MATCH;

  // Penalty for missing components
  const missingComponents = componentMatches.filter(match => !match.matched).length;
  score += missingComponents * SCORE_MISSING_COMPONENT;

  // Score for matched connections
  const matchedConnections = connectionMatches.filter(match => match.found).length;
  score += matchedConnections * SCORE_CONNECTION_MATCH;

  // Calculate max possible score (all components and connections matched)
  const maxScore =
    (componentMatches.length * SCORE_COMPONENT_MATCH) +
    (connectionMatches.length * SCORE_CONNECTION_MATCH);

  return { score: Math.max(0, score), maxScore };
}

/**
 * Generate detailed feedback messages
 */
function generateFeedback(
  componentMatches: ComponentMatch[],
  connectionMatches: ConnectionMatch[]
): ValidationFeedback[] {
  const feedback: ValidationFeedback[] = [];

  // Component feedback
  const missingComponents = componentMatches.filter(match => !match.matched);
  for (const missing of missingComponents) {
    feedback.push({
      category: 'component',
      type: 'missing',
      message: `Missing component: ${missing.templateComponent}`,
      suggestion: `Consider adding a ${missing.templateComponent} component to your design`
    });
  }

  // Connection feedback
  const missingConnections = connectionMatches.filter(match => !match.found);
  for (const missing of missingConnections) {
    feedback.push({
      category: 'connection',
      type: 'missing',
      message: `Missing connection: ${missing.expected}`,
      suggestion: 'Review the data flow between these components'
    });
  }

  // Add positive feedback if doing well
  const componentScore = componentMatches.filter(match => match.matched).length;
  const totalComponents = componentMatches.length;

  if (componentScore / totalComponents > 0.8) {
    feedback.unshift({
      category: 'architecture',
      type: 'positive',
      message: 'Great job! Your component selection is mostly correct',
      suggestion: 'Focus on refining the connections between components'
    });
  }

  return feedback;
}

/**
 * Utility functions
 */
function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/[-_\s]/g, '');
}

function normalizeComponentType(type: string): string {
  // Handle common variations
  const typeMap: Record<string, string> = {
    'server': 'server',
    'service': 'server',
    'microservice': 'server',
    'database': 'database',
    'db': 'database',
    'cache': 'cache',
    'redis': 'cache',
    'memcached': 'cache',
    'api-gateway': 'api-gateway',
    'gateway': 'api-gateway',
    'load-balancer': 'load-balancer',
    'loadbalancer': 'load-balancer',
    'lb': 'load-balancer'
  };

  const normalized = normalizeString(type);
  return typeMap[normalized] || normalized;
}

function areLabelsRelated(userLabel: string, templateLabel: string): boolean {
  const userNorm = normalizeString(userLabel);
  const templateNorm = normalizeString(templateLabel);

  // Check if one contains the other
  return userNorm.includes(templateNorm) || templateNorm.includes(userNorm);
}

/**
 * Create empty validation result for edge cases
 */
function createEmptyValidationResult(): DesignValidationResult {
  return {
    score: 0,
    maxScore: 0,
    percentage: 0,
    componentMatches: [],
    connectionMatches: [],
    feedback: [{
      category: 'architecture',
      type: 'missing',
      message: 'No template available for comparison',
      suggestion: 'Complete your design and try again'
    }],
    missingComponents: [],
    extraComponents: [],
    incorrectConnections: []
  };
}
