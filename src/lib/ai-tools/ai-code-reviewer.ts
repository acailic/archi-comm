// src/lib/ai-tools/ai-code-reviewer.ts
// AI-powered code reviewer for pre-commit review
// Identifies bugs, security issues, and code quality problems
// RELEVANT FILES: src/lib/api/ai.ts, config/eslint.config.js, .husky/pre-commit

import type { AcceptanceCriterion } from "../task-system/schemas/acceptance-criteria";

/**
 * Review severity levels
 */
export type ReviewSeverity = "error" | "warning" | "info";

/**
 * Review category
 */
export type ReviewCategory =
  | "bugs"
  | "security"
  | "performance"
  | "style"
  | "tests"
  | "documentation"
  | "accessibility";

/**
 * Review comment interface
 */
export interface ReviewComment {
  file: string;
  line: number;
  category: ReviewCategory;
  severity: ReviewSeverity;
  message: string;
  suggestion?: string;
  link?: string;
}

/**
 * Review report interface
 */
export interface ReviewReport {
  totalIssues: number;
  errors: number;
  warnings: number;
  infos: number;
  comments: ReviewComment[];
  summary: string;
}

/**
 * AI code reviewer class
 */
export class AICodeReviewer {
  /**
   * Review git staged changes
   */
  async reviewStagedChanges(): Promise<ReviewReport> {
    const diff = await this.getStagedDiff();
    return this.reviewDiff(diff);
  }

  /**
   * Review specific file changes
   */
  async reviewFile(filePath: string, diff: string): Promise<ReviewComment[]> {
    const prompt = this.buildReviewPrompt(filePath, diff);
    const response = await this.callAI(prompt);
    return this.parseReviewResponse(response, filePath);
  }

  /**
   * Check if changes meet acceptance criteria
   */
  async checkAgainstCriteria(
    diff: string,
    criteria: AcceptanceCriterion[],
  ): Promise<ReviewComment[]> {
    const comments: ReviewComment[] = [];

    for (const criterion of criteria) {
      const prompt = `Does this code change satisfy the acceptance criterion?

Criterion: ${criterion.title}
Description: ${criterion.description}

Code changes:
${diff}

Return "yes" or "no" with explanation.`;

      const response = await this.callAI(prompt);

      if (response.toLowerCase().startsWith("no")) {
        comments.push({
          file: "",
          line: 0,
          category: "tests",
          severity: "warning",
          message: `Code may not satisfy criterion: ${criterion.title}`,
          suggestion: response,
        });
      }
    }

    return comments;
  }

  /**
   * Find potential bugs
   */
  async findBugs(code: string): Promise<ReviewComment[]> {
    const prompt = `Analyze this code for potential bugs:

${code}

Look for:
- Logic errors
- Null pointer issues
- Type mismatches
- Off-by-one errors
- Race conditions
- Memory leaks

Return issues as JSON array with: line, message, severity.`;

    const response = await this.callAI(prompt);
    return this.parseJSONResponse(response, "bugs");
  }

  /**
   * Suggest code improvements
   */
  async suggestImprovements(code: string): Promise<ReviewComment[]> {
    const prompt = `Suggest improvements for this code:

${code}

Focus on:
- Code clarity and readability
- Performance optimizations
- Better patterns or practices
- Simplification opportunities

Return suggestions as JSON array.`;

    const response = await this.callAI(prompt);
    return this.parseJSONResponse(response, "style");
  }

  /**
   * Check for security issues
   */
  async checkSecurity(code: string): Promise<ReviewComment[]> {
    const prompt = `Analyze this code for security issues:

${code}

Look for:
- XSS vulnerabilities
- SQL injection risks
- Exposed secrets or API keys
- Insecure dependencies
- CSRF vulnerabilities
- Improper authentication/authorization

Return issues as JSON array.`;

    const response = await this.callAI(prompt);
    return this.parseJSONResponse(response, "security");
  }

  /**
   * Check for performance issues
   */
  async checkPerformance(code: string): Promise<ReviewComment[]> {
    const prompt = `Analyze this code for performance issues:

${code}

Look for:
- Unnecessary re-renders (React)
- Memory leaks
- Inefficient algorithms
- N+1 queries
- Large bundle size impacts
- Blocking operations

Return issues as JSON array.`;

    const response = await this.callAI(prompt);
    return this.parseJSONResponse(response, "performance");
  }

  /**
   * Check for accessibility issues
   */
  async checkAccessibility(code: string): Promise<ReviewComment[]> {
    const prompt = `Analyze this UI code for accessibility issues:

${code}

Look for:
- Missing ARIA labels
- Keyboard navigation issues
- Color contrast problems
- Missing alt text
- Improper heading hierarchy
- Focus management issues

Return issues as JSON array.`;

    const response = await this.callAI(prompt);
    return this.parseJSONResponse(response, "accessibility");
  }

  /**
   * Generate comprehensive review report
   */
  generateReviewReport(comments: ReviewComment[]): ReviewReport {
    const errors = comments.filter((c) => c.severity === "error").length;
    const warnings = comments.filter((c) => c.severity === "warning").length;
    const infos = comments.filter((c) => c.severity === "info").length;

    const summary = this.generateSummary(comments);

    return {
      totalIssues: comments.length,
      errors,
      warnings,
      infos,
      comments,
      summary,
    };
  }

  // Private helper methods

  private async getStagedDiff(): Promise<string> {
    // In production, use simple-git to get staged diff
    return "";
  }

  private async reviewDiff(diff: string): Promise<ReviewReport> {
    const comments: ReviewComment[] = [];

    // Run all checks
    comments.push(...(await this.findBugs(diff)));
    comments.push(...(await this.checkSecurity(diff)));
    comments.push(...(await this.checkPerformance(diff)));
    comments.push(...(await this.suggestImprovements(diff)));

    return this.generateReviewReport(comments);
  }

  private buildReviewPrompt(filePath: string, diff: string): string {
    return `Review this code change:

File: ${filePath}

Changes:
${diff}

Analyze for:
1. Bugs and logic errors
2. Security vulnerabilities
3. Performance issues
4. Code style and best practices
5. Missing tests
6. Documentation gaps

Return issues as JSON array with: line, category, severity, message, suggestion.`;
  }

  private parseReviewResponse(
    response: string,
    filePath: string,
  ): ReviewComment[] {
    try {
      const issues = JSON.parse(response) as Array<{
        line: number;
        category: string;
        severity: string;
        message: string;
        suggestion?: string;
      }>;

      return issues.map((issue) => ({
        file: filePath,
        line: issue.line,
        category: issue.category as ReviewCategory,
        severity: issue.severity as ReviewSeverity,
        message: issue.message,
        suggestion: issue.suggestion,
      }));
    } catch {
      return [];
    }
  }

  private parseJSONResponse(
    response: string,
    category: ReviewCategory,
  ): ReviewComment[] {
    try {
      const issues = JSON.parse(response) as Array<{
        line: number;
        message: string;
        severity?: string;
        file?: string;
      }>;

      return issues.map((issue) => ({
        file: issue.file ?? "",
        line: issue.line,
        category,
        severity: (issue.severity as ReviewSeverity) ?? "warning",
        message: issue.message,
      }));
    } catch {
      return [];
    }
  }

  private generateSummary(comments: ReviewComment[]): string {
    const categoryCount = comments.reduce(
      (acc, c) => {
        acc[c.category] = (acc[c.category] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const parts: string[] = [];

    for (const [category, count] of Object.entries(categoryCount)) {
      parts.push(`${count} ${category}`);
    }

    return `Found ${comments.length} issue(s): ${parts.join(", ")}`;
  }

  private async callAI(prompt: string): Promise<string> {
    // In production, use AI service from src/lib/api/ai.ts
    return "[]";
  }
}

// Export singleton instance
export const aiCodeReviewer = new AICodeReviewer();
