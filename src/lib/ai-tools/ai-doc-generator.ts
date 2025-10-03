// src/lib/ai-tools/ai-doc-generator.ts
// AI-powered documentation generator
// Generates docs from code, acceptance criteria, and architecture
// RELEVANT FILES: src/lib/api/ai.ts, docs, src/lib/task-system/acceptance-criteria-manager.ts

import { acceptanceCriteriaManager } from "../task-system/acceptance-criteria-manager";
import type { AcceptanceCriterion } from "../task-system/schemas/acceptance-criteria";

/**
 * AI documentation generator class
 */
export class AIDocGenerator {
  /**
   * Generate user documentation from acceptance criteria
   */
  async generateFromAcceptanceCriteria(taskId: string): Promise<string> {
    const criteria = await acceptanceCriteriaManager.loadCriteria(taskId);

    const prompt = `Generate user-facing documentation for this feature:

${criteria
  .map(
    (c) => `
Criterion: ${c.title}
Description: ${c.description}
Type: ${c.type}
`,
  )
  .join("\n")}

Create comprehensive documentation including:
- Feature overview
- How to use the feature
- Examples
- Common use cases
- Troubleshooting

Write in clear, user-friendly language.`;

    return await this.callAI(prompt);
  }

  /**
   * Generate API documentation from code
   */
  async generateAPIDoc(filePath: string): Promise<string> {
    const prompt = `Generate API documentation for the code in ${filePath}.

Include:
- Function signatures
- Parameters and return values
- Usage examples
- Error handling
- Notes on behavior

Format as markdown.`;

    return await this.callAI(prompt);
  }

  /**
   * Generate Architecture Decision Record
   */
  async generateADR(decision: string, context: string): Promise<string> {
    const prompt = `Generate an Architecture Decision Record (ADR) for:

Decision: ${decision}
Context: ${context}

Follow the ADR template:
- Title
- Status
- Context
- Decision
- Consequences (positive and negative)
- Alternatives considered

Format as markdown.`;

    return await this.callAI(prompt);
  }

  /**
   * Update changelog with generated entries
   */
  async updateChangelog(changes: string[]): Promise<string> {
    const prompt = `Generate changelog entries for these changes:

${changes.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Format as markdown following Keep a Changelog format:
- Added
- Changed
- Fixed
- Removed

Be concise and user-focused.`;

    return await this.callAI(prompt);
  }

  /**
   * Generate test documentation
   */
  async generateTestDocumentation(testPath: string): Promise<string> {
    const prompt = `Generate documentation for the test file at ${testPath}.

Include:
- Test purpose
- What is being tested
- Test coverage
- How to run the tests
- Expected behavior

Format as markdown.`;

    return await this.callAI(prompt);
  }

  /**
   * Generate troubleshooting guide from common errors
   */
  async generateTroubleshootingGuide(errors: Error[]): Promise<string> {
    const prompt = `Generate a troubleshooting guide for these common errors:

${errors.map((e, i) => `${i + 1}. ${e.message}`).join("\n")}

For each error, provide:
- Symptom description
- Possible causes
- Step-by-step solution
- Prevention tips

Format as markdown.`;

    return await this.callAI(prompt);
  }

  /**
   * Suggest improvements to existing documentation
   */
  async improveDocumentation(docPath: string): Promise<string> {
    const prompt = `Analyze the documentation at ${docPath} and suggest improvements.

Focus on:
- Clarity and completeness
- Missing information
- Better examples
- Structure and organization
- Grammar and style

Return specific suggestions.`;

    return await this.callAI(prompt);
  }

  /**
   * Generate JSDoc comments for code
   */
  async generateJSDoc(code: string): Promise<string> {
    const prompt = `Generate JSDoc comments for this code:

${code}

Include:
- Function/class description
- @param tags with types
- @returns tag
- @throws for errors
- @example if helpful

Return the code with JSDoc added.`;

    return await this.callAI(prompt);
  }

  /**
   * Generate mermaid diagram from description
   */
  async generateMermaidDiagram(
    description: string,
    diagramType: "flowchart" | "sequence" | "class" | "er",
  ): Promise<string> {
    const prompt = `Generate a Mermaid ${diagramType} diagram for:

${description}

Return only the mermaid code, properly formatted.`;

    return await this.callAI(prompt);
  }

  /**
   * Generate complete feature documentation
   */
  async generateFeatureDoc(
    criterion: AcceptanceCriterion,
    implementation?: string,
  ): Promise<string> {
    const prompt = `Generate complete feature documentation for:

Title: ${criterion.title}
Description: ${criterion.description}
Type: ${criterion.type}
${criterion.gherkin ? `\nBehavior:\n${JSON.stringify(criterion.gherkin, null, 2)}` : ""}
${implementation ? `\nImplementation notes:\n${implementation}` : ""}

Create comprehensive documentation with:
1. Overview
2. User guide
3. Technical details
4. Examples
5. API reference (if applicable)
6. Testing information

Format as markdown with proper headings.`;

    return await this.callAI(prompt);
  }

  // Private helper methods

  private async callAI(prompt: string): Promise<string> {
    // In production, use AI service from src/lib/api/ai.ts
    return `# AI-Generated Documentation\n\n${prompt.substring(0, 200)}...`;
  }
}

// Export singleton instance
export const aiDocGenerator = new AIDocGenerator();
