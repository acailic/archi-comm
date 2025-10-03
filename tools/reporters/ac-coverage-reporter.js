// tools/reporters/ac-coverage-reporter.js
// Custom Vitest reporter for acceptance criteria coverage tracking
// Parses test results and links them to acceptance criteria
// RELEVANT FILES: src/lib/task-system/test-traceability.ts, config/coverage.config.json

const fs = require("fs");
const path = require("path");

/**
 * Custom Vitest reporter for acceptance criteria coverage
 */
class AcceptanceCriteriaReporter {
  constructor() {
    this.results = {
      totalCriteria: 0,
      coveredCriteria: 0,
      uncoveredCriteria: [],
      mustHaveWithoutTests: [],
      orphanedTests: [],
      testResults: {},
    };
  }

  /**
   * Called when Vitest initializes
   */
  onInit(ctx) {
    console.log("\n📋 Acceptance Criteria Coverage Reporter initialized\n");
    this.ctx = ctx;
  }

  /**
   * Called when all tests finish
   */
  async onFinished(files, errors) {
    console.log("📊 Analyzing acceptance criteria coverage...\n");

    // Parse test results
    this.parseTestResults(files);

    // Load acceptance criteria
    await this.loadAcceptanceCriteria();

    // Calculate coverage
    this.calculateCoverage();

    // Generate reports
    this.generateReports();

    // Check thresholds
    this.checkThresholds();
  }

  /**
   * Parse test results from Vitest
   */
  parseTestResults(files) {
    for (const file of files) {
      const filePath = file.filepath;
      const tests = this.extractTests(file);

      for (const test of tests) {
        // Extract AC references from test
        const acRefs = this.extractACReferences(test);

        for (const acRef of acRefs) {
          if (!this.results.testResults[acRef]) {
            this.results.testResults[acRef] = [];
          }

          this.results.testResults[acRef].push({
            testPath: filePath,
            testName: test.name,
            status: test.result?.state || "pending",
            duration: test.result?.duration || 0,
            error: test.result?.errors?.[0]?.message,
          });
        }
      }
    }
  }

  /**
   * Extract tests from file object
   */
  extractTests(file) {
    const tests = [];

    const traverse = (task) => {
      if (task.type === "test") {
        tests.push(task);
      }
      if (task.tasks) {
        for (const child of task.tasks) {
          traverse(child);
        }
      }
    };

    if (file.tasks) {
      for (const task of file.tasks) {
        traverse(task);
      }
    }

    return tests;
  }

  /**
   * Extract AC references from test
   */
  extractACReferences(test) {
    const refs = [];
    const source = test.file?.code || "";

    // Look for comments like: // Verifies ac-url-001
    // or // AC-001
    const patterns = [
      /\/\/ Verifies ([a-zA-Z0-9-]+)/g,
      /\/\/ AC-([a-zA-Z0-9-]+)/g,
    ];

    for (const pattern of patterns) {
      const matches = source.matchAll(pattern);
      for (const match of matches) {
        refs.push(match[1]);
      }
    }

    return refs;
  }

  /**
   * Load acceptance criteria from task files
   */
  async loadAcceptanceCriteria() {
    // In production, this would scan all task.json files
    // For now, return empty array
    return [];
  }

  /**
   * Calculate coverage metrics
   */
  calculateCoverage() {
    // This would calculate actual coverage in production
    this.results.coveragePercentage =
      this.results.totalCriteria > 0
        ? Math.round(
            (this.results.coveredCriteria / this.results.totalCriteria) * 100,
          )
        : 0;
  }

  /**
   * Generate coverage reports
   */
  generateReports() {
    const outputDir = path.join(process.cwd(), "coverage", "ac-coverage");

    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate JSON summary
    const summary = {
      totalCriteria: this.results.totalCriteria,
      coveredCriteria: this.results.coveredCriteria,
      uncoveredCriteria: this.results.uncoveredCriteria,
      coveragePercentage: this.results.coveragePercentage,
      mustHaveWithoutTests: this.results.mustHaveWithoutTests,
      orphanedTests: this.results.orphanedTests,
      generatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(outputDir, "summary.json"),
      JSON.stringify(summary, null, 2),
    );

    // Generate HTML report
    this.generateHTMLReport(outputDir);

    console.log(`\n📄 AC coverage reports generated in ${outputDir}\n`);
  }

  /**
   * Generate HTML coverage report
   */
  generateHTMLReport(outputDir) {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Acceptance Criteria Coverage Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
    .metric { display: inline-block; margin: 10px 20px; }
    .metric-value { font-size: 2em; font-weight: bold; }
    .metric-label { color: #666; }
    .section { margin: 20px 0; }
    .criterion { padding: 10px; border: 1px solid #ddd; margin: 5px 0; }
    .covered { background: #e8f5e9; }
    .uncovered { background: #ffebee; }
    .test { padding: 5px; margin: 5px 0; font-family: monospace; font-size: 0.9em; }
    .pass { color: green; }
    .fail { color: red; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Acceptance Criteria Coverage Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <div class="metrics">
      <div class="metric">
        <div class="metric-value">${this.results.coveragePercentage}%</div>
        <div class="metric-label">Coverage</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.results.coveredCriteria}</div>
        <div class="metric-label">Covered</div>
      </div>
      <div class="metric">
        <div class="metric-value">${this.results.uncoveredCriteria.length}</div>
        <div class="metric-label">Uncovered</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Coverage Status</h2>
    ${
      this.results.coveragePercentage >= 100
        ? '<p style="color: green;">✅ All acceptance criteria have test coverage</p>'
        : '<p style="color: red;">❌ Some criteria lack test coverage</p>'
    }
  </div>

  ${
    this.results.uncoveredCriteria.length > 0
      ? `
    <div class="section">
      <h2>Uncovered Criteria</h2>
      ${this.results.uncoveredCriteria
        .map((id) => `<div class="criterion uncovered">${id}</div>`)
        .join("")}
    </div>
  `
      : ""
  }

  ${
    this.results.mustHaveWithoutTests.length > 0
      ? `
    <div class="section">
      <h2>⚠️ Must-Have Criteria Without Tests</h2>
      ${this.results.mustHaveWithoutTests
        .map((id) => `<div class="criterion uncovered">${id}</div>`)
        .join("")}
    </div>
  `
      : ""
  }
</body>
</html>
    `;

    fs.writeFileSync(path.join(outputDir, "index.html"), html);
  }

  /**
   * Check coverage thresholds
   */
  checkThresholds() {
    const coverageConfig = this.loadCoverageConfig();

    console.log("\n📊 Acceptance Criteria Coverage:\n");
    console.log(`  Total criteria: ${this.results.totalCriteria}`);
    console.log(`  With tests: ${this.results.coveredCriteria}`);
    console.log(`  Coverage: ${this.results.coveragePercentage}%`);

    const required =
      coverageConfig?.acceptanceCriteria?.minimumCriterionCoverage || 100;

    if (this.results.coveragePercentage >= required) {
      console.log(`  ✅ Meets threshold (${required}%)\n`);
    } else {
      console.log(`  ❌ Below threshold (required: ${required}%)\n`);

      if (coverageConfig?.enforcement?.failOnUncoveredCriteria) {
        process.exitCode = 1;
      }
    }

    if (this.results.mustHaveWithoutTests.length > 0) {
      console.log("  ⚠️  Must-have criteria without tests:");
      this.results.mustHaveWithoutTests.forEach((id) => {
        console.log(`     - ${id}`);
      });
      console.log();

      process.exitCode = 1;
    }

    if (
      this.results.orphanedTests.length > 0 &&
      coverageConfig?.enforcement?.warnOnOrphanedTests
    ) {
      console.log("  ⚠️  Tests not linked to criteria:");
      this.results.orphanedTests.slice(0, 5).forEach((test) => {
        console.log(`     - ${test}`);
      });
      if (this.results.orphanedTests.length > 5) {
        console.log(
          `     ... and ${this.results.orphanedTests.length - 5} more`,
        );
      }
      console.log();
    }
  }

  /**
   * Load coverage configuration
   */
  loadCoverageConfig() {
    try {
      const configPath = path.join(
        process.cwd(),
        "config",
        "coverage.config.json",
      );
      if (fs.existsSync(configPath)) {
        return JSON.parse(fs.readFileSync(configPath, "utf8"));
      }
    } catch (error) {
      console.warn("Could not load coverage config:", error.message);
    }
    return null;
  }
}

module.exports = AcceptanceCriteriaReporter;
