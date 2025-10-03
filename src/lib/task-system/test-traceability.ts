// src/lib/task-system/test-traceability.ts
// Test traceability system linking acceptance criteria to test execution
// Tracks test results and generates traceability reports
// RELEVANT FILES: src/lib/task-system/acceptance-criteria-manager.ts, src/packages/services/storage.ts, config/vite.config.ts

import { acceptanceCriteriaManager } from "./acceptance-criteria-manager";
import type { AcceptanceCriterion } from "./schemas/acceptance-criteria";

/**
 * Test result status
 */
export type TestStatus = "pass" | "fail" | "skip" | "pending";

/**
 * Test result interface
 */
export interface TestResult {
  testPath: string;
  testName: string;
  status: TestStatus;
  duration: number;
  timestamp: string;
  error?: string;
}

/**
 * Traceability link between criterion and test
 */
export interface TraceabilityLink {
  criterionId: string;
  testPath: string;
  testName: string;
  createdAt: string;
}

/**
 * Test traceability manager
 */
export class TestTraceabilityManager {
  private links: Map<string, TraceabilityLink[]> = new Map();
  private testResults: Map<string, TestResult[]> = new Map();

  /**
   * Create bidirectional link between criterion and test
   */
  async linkCriterionToTest(
    criterionId: string,
    testPath: string,
    testName: string,
  ): Promise<void> {
    const link: TraceabilityLink = {
      criterionId,
      testPath,
      testName,
      createdAt: new Date().toISOString(),
    };

    const existing = this.links.get(criterionId) || [];
    existing.push(link);
    this.links.set(criterionId, existing);

    // Also update criterion's testIds
    await acceptanceCriteriaManager.linkToTests(criterionId, [testPath]);
  }

  /**
   * Get all tests verifying a criterion
   */
  getTestsForCriterion(criterionId: string): TraceabilityLink[] {
    return this.links.get(criterionId) || [];
  }

  /**
   * Get criteria verified by a test
   */
  getCriteriaForTest(testPath: string, testName: string): string[] {
    const criteria: string[] = [];

    for (const [criterionId, links] of this.links.entries()) {
      const found = links.find(
        (link) => link.testPath === testPath && link.testName === testName,
      );
      if (found) {
        criteria.push(criterionId);
      }
    }

    return criteria;
  }

  /**
   * Get latest test results for criterion's tests
   */
  getTestResults(criterionId: string): TestResult[] {
    const links = this.getTestsForCriterion(criterionId);
    const results: TestResult[] = [];

    for (const link of links) {
      const testResults = this.testResults.get(link.testPath) || [];
      const matchingResult = testResults.find(
        (r) => r.testName === link.testName,
      );
      if (matchingResult) {
        results.push(matchingResult);
      }
    }

    return results;
  }

  /**
   * Update test results from CI
   */
  updateTestResults(testPath: string, results: TestResult[]): void {
    this.testResults.set(testPath, results);
  }

  /**
   * Generate traceability matrix
   */
  async generateTraceabilityMatrix(taskId: string): Promise<{
    criteria: AcceptanceCriterion[];
    testFiles: string[];
    matrix: boolean[][];
    results: (TestStatus | null)[][];
  }> {
    const criteria = await acceptanceCriteriaManager.loadCriteria(taskId);
    const testFilesSet = new Set<string>();

    // Collect all test files
    for (const criterion of criteria) {
      for (const testId of criterion.testIds) {
        testFilesSet.add(testId);
      }
    }

    const testFiles = Array.from(testFilesSet).sort();

    // Build matrix
    const matrix: boolean[][] = [];
    const results: (TestStatus | null)[][] = [];

    for (const criterion of criteria) {
      const row: boolean[] = [];
      const resultRow: (TestStatus | null)[] = [];

      for (const testFile of testFiles) {
        const hasLink = criterion.testIds.includes(testFile);
        row.push(hasLink);

        if (hasLink) {
          const testResults = this.getTestResults(criterion.id);
          const fileResult = testResults.find((r) => r.testPath === testFile);
          resultRow.push(fileResult?.status ?? null);
        } else {
          resultRow.push(null);
        }
      }

      matrix.push(row);
      results.push(resultRow);
    }

    return { criteria, testFiles, matrix, results };
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport(taskId: string): Promise<{
    totalCriteria: number;
    coveredCriteria: number;
    coveragePercentage: number;
    passingTests: number;
    failingTests: number;
    criteriaByStatus: Record<string, number>;
  }> {
    const criteria = await acceptanceCriteriaManager.loadCriteria(taskId);
    const totalCriteria = criteria.length;
    const coveredCriteria = criteria.filter((c) => c.testIds.length > 0).length;

    let passingTests = 0;
    let failingTests = 0;

    for (const criterion of criteria) {
      const results = this.getTestResults(criterion.id);
      passingTests += results.filter((r) => r.status === "pass").length;
      failingTests += results.filter((r) => r.status === "fail").length;
    }

    const criteriaByStatus = criteria.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalCriteria,
      coveredCriteria,
      coveragePercentage:
        totalCriteria > 0
          ? Math.round((coveredCriteria / totalCriteria) * 100)
          : 0,
      passingTests,
      failingTests,
      criteriaByStatus,
    };
  }

  /**
   * Find tests not linked to any criterion
   */
  async findOrphanedTests(taskId: string): Promise<string[]> {
    const criteria = await acceptanceCriteriaManager.loadCriteria(taskId);
    const linkedTests = new Set<string>();

    for (const criterion of criteria) {
      for (const testId of criterion.testIds) {
        linkedTests.add(testId);
      }
    }

    const allTests = Array.from(this.testResults.keys());
    return allTests.filter((test) => !linkedTests.has(test));
  }

  /**
   * Find criteria without test coverage
   */
  async findUncoveredCriteria(taskId: string): Promise<AcceptanceCriterion[]> {
    return acceptanceCriteriaManager.findUncoveredCriteria(taskId);
  }

  /**
   * Export traceability data to CSV
   */
  async exportToCSV(taskId: string): Promise<string> {
    const { criteria, testFiles, matrix, results } =
      await this.generateTraceabilityMatrix(taskId);

    let csv = "Criterion ID,Title,Type,Priority,Status";
    testFiles.forEach((file) => {
      csv += `,${file}`;
    });
    csv += "\n";

    for (let i = 0; i < criteria.length; i++) {
      const criterion = criteria[i];
      csv += `"${criterion.id}","${criterion.title}","${criterion.type}","${criterion.priority}","${criterion.status}"`;

      for (let j = 0; j < testFiles.length; j++) {
        if (matrix[i][j]) {
          const status = results[i][j] ?? "pending";
          csv += `,${status}`;
        } else {
          csv += ",";
        }
      }
      csv += "\n";
    }

    return csv;
  }
}

// Export singleton instance
export const testTraceabilityManager = new TestTraceabilityManager();
