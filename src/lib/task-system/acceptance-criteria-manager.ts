// src/lib/task-system/acceptance-criteria-manager.ts
// Manager for acceptance criteria operations
// Handles CRUD, validation, Gherkin parsing, and test coverage
// RELEVANT FILES: src/lib/task-system/schemas/acceptance-criteria.ts, src/lib/task-system/TaskPlugin.ts, src/lib/api/tauriClient.ts

import { z } from "zod";

import type {
  AcceptanceCriterion,
  AcceptanceCriterionStatus,
  GherkinScenario,
} from "./schemas/acceptance-criteria";
import {
  GherkinScenarioSchema,
  isValidStatusTransition,
  validateAcceptanceCriteria,
} from "./schemas/acceptance-criteria";

/**
 * Manager class for acceptance criteria operations
 */
export class AcceptanceCriteriaManager {
  private criteria: Map<string, AcceptanceCriterion[]> = new Map();

  /**
   * Load acceptance criteria for a task
   */
  async loadCriteria(taskId: string): Promise<AcceptanceCriterion[]> {
    const cached = this.criteria.get(taskId);
    if (cached) {
      return cached;
    }

    // Load from storage (would use Tauri backend in production)
    try {
      const data = await this.loadFromStorage(taskId);
      this.criteria.set(taskId, data);
      return data;
    } catch (error) {
      console.error(`Failed to load criteria for task ${taskId}:`, error);
      return [];
    }
  }

  /**
   * Validate acceptance criteria against schema
   */
  validateCriteria(criteria: AcceptanceCriterion[]): {
    isValid: boolean;
    errors: z.ZodError | null;
  } {
    try {
      validateAcceptanceCriteria(criteria);
      return { isValid: true, errors: null };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { isValid: false, errors: error };
      }
      throw error;
    }
  }

  /**
   * Link criterion to test files
   */
  async linkToTests(criterionId: string, testPaths: string[]): Promise<void> {
    const criterion = await this.getCriterionById(criterionId);
    if (!criterion) {
      throw new Error(`Criterion ${criterionId} not found`);
    }

    // Validate test paths exist
    const validPaths = await this.validateTestPaths(testPaths);
    criterion.testIds = [...new Set([...criterion.testIds, ...validPaths])];

    await this.saveCriterion(criterion);
  }

  /**
   * Update criterion status with transition validation
   */
  async updateStatus(
    criterionId: string,
    newStatus: AcceptanceCriterionStatus,
  ): Promise<void> {
    const criterion = await this.getCriterionById(criterionId);
    if (!criterion) {
      throw new Error(`Criterion ${criterionId} not found`);
    }

    if (!isValidStatusTransition(criterion.status, newStatus)) {
      throw new Error(
        `Invalid status transition from ${criterion.status} to ${newStatus}`,
      );
    }

    criterion.status = newStatus;
    await this.saveCriterion(criterion);
  }

  /**
   * Generate Gherkin scenario from criterion
   */
  generateGherkin(criterion: AcceptanceCriterion): string {
    if (!criterion.gherkin) {
      return this.generateDefaultGherkin(criterion);
    }

    const { feature, scenario, given, when, then, examples } =
      criterion.gherkin;

    let gherkinText = `Feature: ${feature}\n\n`;
    gherkinText += `  Scenario: ${scenario}\n`;

    given.forEach((step) => {
      gherkinText += `    Given ${step}\n`;
    });

    when.forEach((step) => {
      gherkinText += `    When ${step}\n`;
    });

    then.forEach((step) => {
      gherkinText += `    Then ${step}\n`;
    });

    if (examples && examples.length > 0) {
      gherkinText += "\n    Examples:\n";
      examples.forEach((example, i) => {
        gherkinText += `      # ${example.description || `Example ${i + 1}`}\n`;
        const keys = Object.keys(example.data);
        gherkinText += `      | ${keys.join(" | ")} |\n`;
        gherkinText += `      | ${keys.map((k) => example.data[k]).join(" | ")} |\n`;
      });
    }

    return gherkinText;
  }

  /**
   * Parse Gherkin text into structured format
   */
  parseGherkin(gherkinText: string): GherkinScenario {
    const lines = gherkinText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    let feature = "";
    let scenario = "";
    const given: string[] = [];
    const when: string[] = [];
    const then: string[] = [];

    for (const line of lines) {
      if (line.startsWith("Feature:")) {
        feature = line.replace("Feature:", "").trim();
      } else if (line.startsWith("Scenario:")) {
        scenario = line.replace("Scenario:", "").trim();
      } else if (line.startsWith("Given ")) {
        given.push(line.replace("Given ", "").trim());
      } else if (
        line.startsWith("And ") &&
        given.length > 0 &&
        when.length === 0
      ) {
        given.push(line.replace("And ", "").trim());
      } else if (line.startsWith("When ")) {
        when.push(line.replace("When ", "").trim());
      } else if (
        line.startsWith("And ") &&
        when.length > 0 &&
        then.length === 0
      ) {
        when.push(line.replace("And ", "").trim());
      } else if (line.startsWith("Then ")) {
        then.push(line.replace("Then ", "").trim());
      } else if (line.startsWith("And ") && then.length > 0) {
        then.push(line.replace("And ", "").trim());
      }
    }

    return GherkinScenarioSchema.parse({
      feature,
      scenario,
      given,
      when,
      then,
    });
  }

  /**
   * Get test coverage for task's acceptance criteria
   */
  async getTestCoverage(taskId: string): Promise<{
    total: number;
    covered: number;
    uncovered: string[];
    percentage: number;
  }> {
    const criteria = await this.loadCriteria(taskId);

    const total = criteria.length;
    const covered = criteria.filter((c) => c.testIds.length > 0).length;
    const uncovered = criteria
      .filter((c) => c.testIds.length === 0)
      .map((c) => c.id);

    return {
      total,
      covered,
      uncovered,
      percentage: total > 0 ? Math.round((covered / total) * 100) : 0,
    };
  }

  /**
   * Find criteria without linked tests
   */
  async findUncoveredCriteria(taskId: string): Promise<AcceptanceCriterion[]> {
    const criteria = await this.loadCriteria(taskId);
    return criteria.filter((c) => c.testIds.length === 0);
  }

  /**
   * Export criteria to markdown
   */
  async exportToMarkdown(taskId: string): Promise<string> {
    const criteria = await this.loadCriteria(taskId);

    let markdown = `# Acceptance Criteria for ${taskId}\n\n`;

    for (const criterion of criteria) {
      markdown += `## ${criterion.title}\n\n`;
      markdown += `**ID:** \`${criterion.id}\`  \n`;
      markdown += `**Type:** ${criterion.type}  \n`;
      markdown += `**Priority:** ${criterion.priority}  \n`;
      markdown += `**Status:** ${criterion.status}  \n\n`;
      markdown += `${criterion.description}\n\n`;

      if (criterion.gherkin) {
        markdown += "### Gherkin Scenario\n\n";
        markdown += "```gherkin\n";
        markdown += this.generateGherkin(criterion);
        markdown += "\n```\n\n";
      }

      if (criterion.testIds.length > 0) {
        markdown += "### Linked Tests\n\n";
        criterion.testIds.forEach((testId) => {
          markdown += `- \`${testId}\`\n`;
        });
        markdown += "\n";
      }

      markdown += "---\n\n";
    }

    return markdown;
  }

  /**
   * Export all criteria as .feature files
   */
  async exportToGherkin(taskId: string): Promise<Map<string, string>> {
    const criteria = await this.loadCriteria(taskId);
    const features = new Map<string, string>();

    for (const criterion of criteria) {
      if (criterion.gherkin) {
        const filename = `${criterion.id}.feature`;
        features.set(filename, this.generateGherkin(criterion));
      }
    }

    return features;
  }

  // Private helper methods

  private async getCriterionById(
    criterionId: string,
  ): Promise<AcceptanceCriterion | null> {
    for (const criteria of this.criteria.values()) {
      const found = criteria.find((c) => c.id === criterionId);
      if (found) return found;
    }
    return null;
  }

  private async saveCriterion(criterion: AcceptanceCriterion): Promise<void> {
    // In production, save to Tauri backend
    console.log("Saving criterion:", criterion.id);
  }

  private async loadFromStorage(
    taskId: string,
  ): Promise<AcceptanceCriterion[]> {
    // In production, load from Tauri backend
    return [];
  }

  private async validateTestPaths(paths: string[]): Promise<string[]> {
    // In production, validate paths exist in filesystem
    return paths;
  }

  private generateDefaultGherkin(criterion: AcceptanceCriterion): string {
    return `Feature: ${criterion.title}

  Scenario: ${criterion.title}
    Given the system is ready
    When ${criterion.description}
    Then the requirement should be met
`;
  }
}

// Export singleton instance
export const acceptanceCriteriaManager = new AcceptanceCriteriaManager();
