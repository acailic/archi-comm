// src/lib/ai-tools/ai-test-generator.ts
// AI-powered test generator creating tests from acceptance criteria
// Generates Vitest unit tests and Playwright E2E tests
// RELEVANT FILES: src/lib/api/ai.ts, src/lib/task-system/acceptance-criteria-manager.ts, src/__tests__

import type {
  AcceptanceCriterion,
  GherkinScenario,
} from "../task-system/schemas/acceptance-criteria";

/**
 * AI test generator class
 */
export class AITestGenerator {
  /**
   * Generate Vitest unit tests from acceptance criterion
   */
  async generateUnitTests(
    criterion: AcceptanceCriterion,
    componentPath: string,
  ): Promise<string> {
    const prompt = this.buildUnitTestPrompt(criterion, componentPath);
    const generatedCode = await this.callAI(prompt);

    return this.formatUnitTest(generatedCode, criterion);
  }

  /**
   * Generate Playwright E2E tests from Gherkin scenario
   */
  async generateE2ETests(criterion: AcceptanceCriterion): Promise<string> {
    if (!criterion.gherkin) {
      throw new Error(
        "Criterion must have Gherkin scenario for E2E test generation",
      );
    }

    const prompt = this.buildE2ETestPrompt(criterion, criterion.gherkin);
    const generatedCode = await this.callAI(prompt);

    return this.formatE2ETest(generatedCode, criterion);
  }

  /**
   * Convert Gherkin scenario to executable test
   */
  async generateTestFromGherkin(gherkin: GherkinScenario): Promise<string> {
    const prompt = `Convert this Gherkin scenario to a Playwright test:

Feature: ${gherkin.feature}
Scenario: ${gherkin.scenario}

Given:
${gherkin.given.map((s) => `  - ${s}`).join("\n")}

When:
${gherkin.when.map((s) => `  - ${s}`).join("\n")}

Then:
${gherkin.then.map((s) => `  - ${s}`).join("\n")}

Generate a complete Playwright test file with proper imports and assertions.`;

    return await this.callAI(prompt);
  }

  /**
   * Suggest additional test cases using AI
   */
  async suggestTestCases(criterion: AcceptanceCriterion): Promise<string[]> {
    const prompt = `Given this acceptance criterion:
Title: ${criterion.title}
Description: ${criterion.description}
Type: ${criterion.type}

Suggest 5 additional test cases that should be covered, including edge cases and error scenarios.
Return as a JSON array of test case descriptions.`;

    const response = await this.callAI(prompt);

    try {
      return JSON.parse(response) as string[];
    } catch {
      return response.split("\n").filter((line) => line.trim());
    }
  }

  /**
   * Suggest tests to improve coverage
   */
  async improveTestCoverage(
    filePath: string,
    currentCoverage: number,
  ): Promise<string> {
    const prompt = `The file at ${filePath} has ${currentCoverage}% test coverage.
Analyze the file and suggest tests that would improve coverage.
Focus on uncovered lines, branches, and edge cases.`;

    return await this.callAI(prompt);
  }

  /**
   * Generate realistic test data
   */
  async generateMockData(criterion: AcceptanceCriterion): Promise<string> {
    const prompt = `Generate realistic mock data for testing this acceptance criterion:
Title: ${criterion.title}
Description: ${criterion.description}

Return as TypeScript code with proper types.`;

    return await this.callAI(prompt);
  }

  // Private helper methods

  private buildUnitTestPrompt(
    criterion: AcceptanceCriterion,
    componentPath: string,
  ): string {
    return `Generate a Vitest unit test for this acceptance criterion:

ID: ${criterion.id}
Title: ${criterion.title}
Description: ${criterion.description}
Type: ${criterion.type}
Priority: ${criterion.priority}

Component path: ${componentPath}

Requirements:
- Use Vitest and Testing Library
- Include proper setup/teardown
- Test happy path and edge cases
- Use descriptive test names
- Add a comment: // Verifies ${criterion.id}
- Follow project conventions

Generate a complete TypeScript test file.`;
  }

  private buildE2ETestPrompt(
    criterion: AcceptanceCriterion,
    gherkin: GherkinScenario,
  ): string {
    return `Generate a Playwright E2E test from this Gherkin scenario:

Feature: ${gherkin.feature}
Scenario: ${gherkin.scenario}

Given:
${gherkin.given.map((s) => `  ${s}`).join("\n")}

When:
${gherkin.when.map((s) => `  ${s}`).join("\n")}

Then:
${gherkin.then.map((s) => `  ${s}`).join("\n")}

Requirements:
- Use Playwright test framework
- Convert each Given/When/Then to appropriate actions
- Include proper assertions
- Add a comment: // Verifies ${criterion.id}
- Handle async operations properly
- Use page object pattern where appropriate

Generate a complete TypeScript E2E test file.`;
  }

  private formatUnitTest(
    generatedCode: string,
    criterion: AcceptanceCriterion,
  ): string {
    // Remove markdown code blocks if present
    let code = generatedCode
      .replace(/```typescript\n?/g, "")
      .replace(/```\n?/g, "");

    // Ensure AC reference comment is present
    if (!code.includes(`// Verifies ${criterion.id}`)) {
      const lines = code.split("\n");
      const describeIndex = lines.findIndex((l) => l.includes("describe("));
      if (describeIndex !== -1) {
        lines.splice(describeIndex, 0, `// Verifies ${criterion.id}`);
      }
      code = lines.join("\n");
    }

    return code;
  }

  private formatE2ETest(
    generatedCode: string,
    criterion: AcceptanceCriterion,
  ): string {
    let code = generatedCode
      .replace(/```typescript\n?/g, "")
      .replace(/```\n?/g, "");

    if (!code.includes(`// Verifies ${criterion.id}`)) {
      const lines = code.split("\n");
      const testIndex = lines.findIndex((l) => l.includes("test("));
      if (testIndex !== -1) {
        lines.splice(testIndex, 0, `// Verifies ${criterion.id}`);
      }
      code = lines.join("\n");
    }

    return code;
  }

  private async callAI(prompt: string): Promise<string> {
    // In production, use the AI service from src/lib/api/ai.ts
    // For now, return a placeholder
    return `// AI-generated code\n// Prompt: ${prompt.substring(0, 100)}...`;
  }
}

// Export singleton instance
export const aiTestGenerator = new AITestGenerator();
