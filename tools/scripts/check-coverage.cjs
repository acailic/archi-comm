#!/usr/bin/env node
// tools/scripts/check-coverage.cjs
// Validates coverage thresholds and acceptance criteria coverage
// Called after test execution to enforce quality gates
// RELEVANT FILES: config/coverage.config.json, tools/reporters/ac-coverage-reporter.js

const fs = require("fs");
const path = require("path");

// Load coverage configuration
const coverageConfig = require("../../config/coverage.config.json");

// Main function
async function checkCoverage() {
  // Dynamic import for ESM-only chalk
  const chalk = (await import("chalk")).default;

  console.log(chalk.bold("\n📊 Checking Coverage Thresholds\n"));

  let hasErrors = false;

  // Check code coverage
  const codeCoverageValid = checkCodeCoverage(chalk);
  if (!codeCoverageValid) {
    hasErrors = true;
  }

  // Check acceptance criteria coverage
  const acCoverageValid = checkAcceptanceCriteriaCoverage(chalk);
  if (!acCoverageValid) {
    hasErrors = true;
  }

  // Final result
  if (hasErrors) {
    console.log(chalk.red("\n❌ Coverage checks failed\n"));
    process.exit(1);
  } else {
    console.log(chalk.green("\n✅ All coverage checks passed\n"));
    process.exit(0);
  }
}

function checkCodeCoverage(chalk) {
  console.log(chalk.bold("Code Coverage:"));

  const coveragePath = path.join(
    process.cwd(),
    "coverage",
    "coverage-summary.json",
  );

  if (!fs.existsSync(coveragePath)) {
    console.log(
      chalk.yellow(
        "  ⚠️  Coverage file not found, skipping code coverage check",
      ),
    );
    return true;
  }

  const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf8"));
  const total = coverage.total;

  const thresholds = coverageConfig.thresholds.global;

  let isValid = true;

  // Check each metric
  const metrics = ["lines", "branches", "functions", "statements"];

  metrics.forEach((metric) => {
    const actual = total[metric].pct;
    const required = thresholds[metric];

    if (actual >= required) {
      console.log(
        chalk.green(`  ✓ ${metric}: ${actual}% (required: ${required}%)`),
      );
    } else {
      console.log(
        chalk.red(`  ✗ ${metric}: ${actual}% (required: ${required}%)`),
      );
      isValid = false;
    }
  });

  return isValid;
}

function checkAcceptanceCriteriaCoverage(chalk) {
  console.log(chalk.bold("\nAcceptance Criteria Coverage:"));

  const acCoveragePath = path.join(
    process.cwd(),
    "coverage",
    "ac-coverage",
    "summary.json",
  );

  if (!fs.existsSync(acCoveragePath)) {
    console.log(
      chalk.yellow(
        "  ⚠️  AC coverage file not found, skipping AC coverage check",
      ),
    );
    return true;
  }

  const acCoverage = JSON.parse(fs.readFileSync(acCoveragePath, "utf8"));

  const required = coverageConfig.acceptanceCriteria.minimumCriterionCoverage;
  const actual = acCoverage.coveragePercentage;

  if (actual >= required) {
    console.log(
      chalk.green(
        `  ✓ Criteria with tests: ${actual}% (required: ${required}%)`,
      ),
    );
  } else {
    console.log(
      chalk.red(`  ✗ Criteria with tests: ${actual}% (required: ${required}%)`),
    );

    if (
      acCoverage.uncoveredCriteria &&
      acCoverage.uncoveredCriteria.length > 0
    ) {
      console.log(chalk.yellow("\n  Uncovered criteria:"));
      acCoverage.uncoveredCriteria.forEach((id) => {
        console.log(chalk.yellow(`    - ${id}`));
      });
    }

    return false;
  }

  // Check for must-have criteria without tests
  if (
    acCoverage.mustHaveWithoutTests &&
    acCoverage.mustHaveWithoutTests.length > 0
  ) {
    console.log(chalk.red("\n  ✗ Must-have criteria without tests:"));
    acCoverage.mustHaveWithoutTests.forEach((id) => {
      console.log(chalk.red(`    - ${id}`));
    });
    return false;
  }

  // Warn about orphaned tests
  if (
    coverageConfig.enforcement.warnOnOrphanedTests &&
    acCoverage.orphanedTests &&
    acCoverage.orphanedTests.length > 0
  ) {
    console.log(chalk.yellow("\n  ⚠️  Tests not linked to any criterion:"));
    acCoverage.orphanedTests.slice(0, 5).forEach((test) => {
      console.log(chalk.yellow(`    - ${test}`));
    });
    if (acCoverage.orphanedTests.length > 5) {
      console.log(
        chalk.yellow(`    ... and ${acCoverage.orphanedTests.length - 5} more`),
      );
    }
  }

  return true;
}

// Run the check
checkCoverage().catch(async (error) => {
  const chalk = (await import("chalk")).default;
  console.error(chalk.red("\n❌ Coverage check failed:"), error);
  process.exit(1);
});
