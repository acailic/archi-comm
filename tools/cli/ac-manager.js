#!/usr/bin/env node
// tools/cli/ac-manager.js
// CLI tool for managing acceptance criteria
// Provides commands for listing, creating, linking, and validating criteria
// RELEVANT FILES: src/lib/task-system/acceptance-criteria-manager.ts, src/lib/ai-tools/ai-test-generator.ts

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

// Helper function to load task data from JSON files
function loadTaskData(taskId) {
  const taskPluginsPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "task-system",
    "plugins",
  );

  // First try direct folder match
  let taskPath = path.join(taskPluginsPath, taskId, "task.json");

  if (fs.existsSync(taskPath)) {
    const taskData = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
    taskData._folderName = taskId;
    return taskData;
  }

  // If not found, scan all directories for matching task ID in JSON
  const dirs = fs.readdirSync(taskPluginsPath);
  for (const dir of dirs) {
    const potentialPath = path.join(taskPluginsPath, dir, "task.json");
    if (fs.existsSync(potentialPath)) {
      const taskData = JSON.parse(fs.readFileSync(potentialPath, "utf-8"));
      if (taskData.id === taskId) {
        taskData._folderName = dir;
        return taskData;
      }
    }
  }

  throw new Error(
    `Task "${taskId}" not found. Available tasks can be found in ${taskPluginsPath}`,
  );
}

// Helper function to save task data
function saveTaskData(taskData) {
  const folderName = taskData._folderName;
  if (!folderName) {
    throw new Error("Task data is missing _folderName property");
  }

  const taskPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "task-system",
    "plugins",
    folderName,
    "task.json",
  );

  // Remove internal property before saving
  const { _folderName, ...dataToSave } = taskData;
  fs.writeFileSync(taskPath, JSON.stringify(dataToSave, null, 2), "utf-8");
}

// Helper function to find criterion by ID
function findCriterionById(taskData, criterionId) {
  return taskData.acceptanceCriteria?.find((c) => c.id === criterionId);
}

program
  .name("ac-manager")
  .description("Acceptance Criteria Management CLI")
  .version("1.0.0");

// List command
program
  .command("list <task-id>")
  .description("List acceptance criteria for a task")
  .action(async (taskId) => {
    const spinner = ora(`Loading criteria for ${taskId}...`).start();

    try {
      const taskData = loadTaskData(taskId);
      const criteria = taskData.acceptanceCriteria || [];

      spinner.succeed(`Found ${criteria.length} criteria`);

      if (criteria.length === 0) {
        console.log(chalk.yellow("No acceptance criteria found"));
        return;
      }

      const table = new Table({
        head: ["ID", "Title", "Type", "Priority", "Status", "Tests"],
        colWidths: [20, 40, 15, 15, 15, 10],
      });

      criteria.forEach((c) => {
        table.push([
          c.id,
          c.title.substring(0, 37) + (c.title.length > 37 ? "..." : ""),
          c.type,
          c.priority,
          getStatusColor(c.status),
          c.testIds?.length || 0,
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      spinner.fail("Failed to load criteria");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Add command
program
  .command("add <task-id>")
  .description("Add new acceptance criterion")
  .option("-t, --title <title>", "Criterion title")
  .option("-d, --description <description>", "Criterion description")
  .option(
    "--type <type>",
    "Type (functional, non-functional, technical, user-experience)",
    "functional",
  )
  .option(
    "--priority <priority>",
    "Priority (must-have, should-have, nice-to-have)",
    "must-have",
  )
  .action(async (taskId, options) => {
    const spinner = ora("Adding criterion...").start();

    try {
      // Validate inputs
      if (!options.title || !options.description) {
        spinner.fail("Title and description are required");
        process.exit(1);
      }

      const taskData = loadTaskData(taskId);
      const criteria = taskData.acceptanceCriteria || [];

      // Generate new criterion ID
      const criterionIndex = criteria.length + 1;
      const criterionId = `${taskId}-ac-${String(criterionIndex).padStart(3, "0")}`;

      // Create new criterion
      const newCriterion = {
        id: criterionId,
        title: options.title,
        description: options.description,
        type: options.type,
        priority: options.priority,
        testIds: [],
        status: "pending",
      };

      // Add to task data
      criteria.push(newCriterion);
      taskData.acceptanceCriteria = criteria;

      // Save updated task data
      saveTaskData(taskData);

      spinner.succeed(
        chalk.green(`Criterion added successfully with ID: ${criterionId}`),
      );
    } catch (error) {
      spinner.fail("Failed to add criterion");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Link command
program
  .command("link <criterion-id> <test-path>")
  .description("Link criterion to test file")
  .action(async (criterionId, testPath) => {
    const spinner = ora(`Linking ${criterionId} to ${testPath}...`).start();

    try {
      // Extract task ID from criterion ID (format: task-id-ac-001)
      const taskId = criterionId.replace(/-ac-\d+$/, "");

      const taskData = loadTaskData(taskId);
      const criterion = findCriterionById(taskData, criterionId);

      if (!criterion) {
        spinner.fail(`Criterion ${criterionId} not found`);
        process.exit(1);
      }

      // Add test path if not already linked
      if (!criterion.testIds) {
        criterion.testIds = [];
      }

      if (!criterion.testIds.includes(testPath)) {
        criterion.testIds.push(testPath);
        saveTaskData(taskData);
        spinner.succeed(chalk.green("Link created successfully"));
      } else {
        spinner.info(chalk.yellow("Test already linked to criterion"));
      }
    } catch (error) {
      spinner.fail("Failed to create link");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Status command
program
  .command("status <criterion-id> <new-status>")
  .description("Update criterion status")
  .action(async (criterionId, newStatus) => {
    const spinner = ora(`Updating status...`).start();

    try {
      // Validate status
      const validStatuses = [
        "pending",
        "in-progress",
        "implemented",
        "verified",
      ];
      if (!validStatuses.includes(newStatus)) {
        spinner.fail(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        );
        process.exit(1);
      }

      // Extract task ID from criterion ID
      const taskId = criterionId.replace(/-ac-\d+$/, "");

      const taskData = loadTaskData(taskId);
      const criterion = findCriterionById(taskData, criterionId);

      if (!criterion) {
        spinner.fail(`Criterion ${criterionId} not found`);
        process.exit(1);
      }

      criterion.status = newStatus;
      saveTaskData(taskData);

      spinner.succeed(chalk.green(`Status updated to ${newStatus}`));
    } catch (error) {
      spinner.fail("Failed to update status");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Validate command
program
  .command("validate [task-id]")
  .description("Validate acceptance criteria")
  .action(async (taskId) => {
    const spinner = ora("Validating criteria...").start();

    try {
      if (!taskId) {
        spinner.fail("Task ID is required");
        process.exit(1);
      }

      const taskData = loadTaskData(taskId);
      const criteria = taskData.acceptanceCriteria || [];
      const errors = [];

      // Validate each criterion
      criteria.forEach((criterion) => {
        if (!criterion.id) {
          errors.push("Missing criterion ID");
        }
        if (!criterion.title) {
          errors.push(`Criterion ${criterion.id}: Missing title`);
        }
        if (!criterion.description) {
          errors.push(`Criterion ${criterion.id}: Missing description`);
        }
        if (
          !["functional", "non-functional", "technical", "user-experience"].includes(
            criterion.type,
          )
        ) {
          errors.push(`Criterion ${criterion.id}: Invalid type "${criterion.type}"`);
        }
        if (
          !["must-have", "should-have", "nice-to-have"].includes(
            criterion.priority,
          )
        ) {
          errors.push(
            `Criterion ${criterion.id}: Invalid priority "${criterion.priority}"`,
          );
        }
        if (
          !["pending", "in-progress", "implemented", "verified"].includes(
            criterion.status,
          )
        ) {
          errors.push(
            `Criterion ${criterion.id}: Invalid status "${criterion.status}"`,
          );
        }
      });

      if (errors.length === 0) {
        spinner.succeed(
          chalk.green(`All ${criteria.length} criteria are valid`),
        );
      } else {
        spinner.fail(chalk.red(`Found ${errors.length} validation error(s)`));
        errors.forEach((err) => {
          console.log(chalk.red(`  ✗ ${err}`));
        });
        process.exit(1);
      }
    } catch (error) {
      spinner.fail("Validation failed");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Coverage command
program
  .command("coverage [task-id]")
  .description("Show test coverage for acceptance criteria")
  .action(async (taskId) => {
    const spinner = ora("Calculating coverage...").start();

    try {
      if (!taskId) {
        spinner.fail("Task ID is required");
        process.exit(1);
      }

      const taskData = loadTaskData(taskId);
      const criteria = taskData.acceptanceCriteria || [];

      const total = criteria.length;
      const covered = criteria.filter(
        (c) => c.testIds && c.testIds.length > 0,
      ).length;
      const uncovered = criteria.filter(
        (c) => !c.testIds || c.testIds.length === 0,
      );
      const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

      spinner.succeed("Coverage calculated");

      console.log("\nTest Coverage Summary:");
      console.log(chalk.bold(`  Total criteria: ${total}`));
      console.log(chalk.green(`  With tests: ${covered}`));
      console.log(chalk.red(`  Without tests: ${total - covered}`));
      console.log(chalk.bold(`  Coverage: ${percentage}%`));

      if (uncovered.length > 0) {
        console.log(
          chalk.yellow(
            "\n⚠️  Criteria without test coverage:",
          ),
        );
        uncovered.forEach((c) => {
          console.log(chalk.yellow(`  - ${c.id}: ${c.title}`));
        });
      }
    } catch (error) {
      spinner.fail("Failed to calculate coverage");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Export command
program
  .command("export <task-id>")
  .description("Export acceptance criteria")
  .option(
    "-f, --format <format>",
    "Export format (markdown, gherkin, json)",
    "markdown",
  )
  .action(async (taskId, options) => {
    const spinner = ora(`Exporting criteria as ${options.format}...`).start();

    try {
      const taskData = loadTaskData(taskId);
      const criteria = taskData.acceptanceCriteria || [];

      if (options.format === "json") {
        const output = JSON.stringify(criteria, null, 2);
        console.log(output);
        spinner.succeed(chalk.green("Export complete"));
      } else if (options.format === "markdown") {
        spinner.succeed(chalk.green("Export complete"));

        console.log(`\n# Acceptance Criteria for ${taskId}\n`);
        criteria.forEach((criterion) => {
          console.log(`## ${criterion.title}\n`);
          console.log(`**ID:** \`${criterion.id}\``);
          console.log(`**Type:** ${criterion.type}`);
          console.log(`**Priority:** ${criterion.priority}`);
          console.log(`**Status:** ${criterion.status}\n`);
          console.log(`${criterion.description}\n`);

          if (criterion.gherkin) {
            console.log("### Gherkin Scenario\n");
            console.log("```gherkin");
            console.log(`Feature: ${criterion.gherkin.feature}`);
            console.log(`  Scenario: ${criterion.gherkin.scenario}`);
            criterion.gherkin.given.forEach((step) => {
              console.log(`    Given ${step}`);
            });
            criterion.gherkin.when.forEach((step) => {
              console.log(`    When ${step}`);
            });
            criterion.gherkin.then.forEach((step) => {
              console.log(`    Then ${step}`);
            });
            console.log("```\n");
          }

          if (criterion.testIds && criterion.testIds.length > 0) {
            console.log("### Linked Tests\n");
            criterion.testIds.forEach((testId) => {
              console.log(`- \`${testId}\``);
            });
            console.log("");
          }

          console.log("---\n");
        });
      } else if (options.format === "gherkin") {
        spinner.succeed(chalk.green("Export complete"));

        criteria.forEach((criterion) => {
          if (criterion.gherkin) {
            console.log(`\n# ${criterion.id}.feature`);
            console.log(`Feature: ${criterion.gherkin.feature}`);
            console.log(`  Scenario: ${criterion.gherkin.scenario}`);
            criterion.gherkin.given.forEach((step) => {
              console.log(`    Given ${step}`);
            });
            criterion.gherkin.when.forEach((step) => {
              console.log(`    When ${step}`);
            });
            criterion.gherkin.then.forEach((step) => {
              console.log(`    Then ${step}`);
            });
            console.log("");
          }
        });
      } else {
        spinner.fail(`Unsupported format: ${options.format}`);
        process.exit(1);
      }
    } catch (error) {
      spinner.fail("Export failed");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Matrix command - generates traceability matrix
program
  .command("matrix [task-id]")
  .description("Generate traceability matrix showing criteria-to-test mappings")
  .option("-f, --format <format>", "Output format (table, csv, json)", "table")
  .action(async (taskId, options) => {
    const spinner = ora("Generating traceability matrix...").start();

    try {
      if (!taskId) {
        spinner.fail("Task ID is required");
        process.exit(1);
      }

      const taskData = loadTaskData(taskId);
      const criteria = taskData.acceptanceCriteria || [];

      spinner.succeed("Matrix generated");

      if (options.format === "table") {
        const table = new Table({
          head: ["Criterion ID", "Title", "Priority", "Test Count", "Status"],
          colWidths: [25, 40, 15, 12, 15],
        });

        criteria.forEach((c) => {
          table.push([
            c.id,
            c.title.substring(0, 37) + (c.title.length > 37 ? "..." : ""),
            c.priority,
            c.testIds?.length || 0,
            getStatusColor(c.status),
          ]);
        });

        console.log("\nTraceability Matrix:");
        console.log(table.toString());

        // Summary
        const totalTests = criteria.reduce(
          (sum, c) => sum + (c.testIds?.length || 0),
          0,
        );
        const covered = criteria.filter((c) => c.testIds?.length > 0).length;
        console.log(
          chalk.bold(
            `\nSummary: ${covered}/${criteria.length} criteria covered, ${totalTests} total test links`,
          ),
        );
      } else if (options.format === "csv") {
        console.log("Criterion ID,Title,Priority,Test Count,Status");
        criteria.forEach((c) => {
          console.log(
            `"${c.id}","${c.title}","${c.priority}",${c.testIds?.length || 0},"${c.status}"`,
          );
        });
      } else if (options.format === "json") {
        const matrix = criteria.map((c) => ({
          criterionId: c.id,
          title: c.title,
          priority: c.priority,
          testCount: c.testIds?.length || 0,
          tests: c.testIds || [],
          status: c.status,
        }));
        console.log(JSON.stringify(matrix, null, 2));
      } else {
        spinner.fail(`Unsupported format: ${options.format}`);
        process.exit(1);
      }
    } catch (error) {
      spinner.fail("Failed to generate matrix");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Report command - generates comprehensive traceability report
program
  .command("report [task-id]")
  .description("Generate comprehensive traceability report")
  .option("-o, --output <file>", "Output file path (optional)")
  .action(async (taskId, options) => {
    const spinner = ora("Generating traceability report...").start();

    try {
      if (!taskId) {
        spinner.fail("Task ID is required");
        process.exit(1);
      }

      const taskData = loadTaskData(taskId);
      const criteria = taskData.acceptanceCriteria || [];

      spinner.succeed("Report generated");

      // Generate report
      const report = [];
      report.push(`# Traceability Report: ${taskId}`);
      report.push(`Generated: ${new Date().toISOString()}\n`);

      // Summary section
      const total = criteria.length;
      const covered = criteria.filter((c) => c.testIds?.length > 0).length;
      const uncovered = total - covered;
      const totalTests = criteria.reduce(
        (sum, c) => sum + (c.testIds?.length || 0),
        0,
      );
      const coverage = total > 0 ? Math.round((covered / total) * 100) : 0;

      report.push("## Summary\n");
      report.push(`- **Total Criteria:** ${total}`);
      report.push(`- **Covered Criteria:** ${covered}`);
      report.push(`- **Uncovered Criteria:** ${uncovered}`);
      report.push(`- **Coverage Percentage:** ${coverage}%`);
      report.push(`- **Total Test Links:** ${totalTests}\n`);

      // Priority breakdown
      report.push("## Breakdown by Priority\n");
      const byPriority = {
        "must-have": { total: 0, covered: 0 },
        "should-have": { total: 0, covered: 0 },
        "nice-to-have": { total: 0, covered: 0 },
      };

      criteria.forEach((c) => {
        if (byPriority[c.priority]) {
          byPriority[c.priority].total++;
          if (c.testIds?.length > 0) {
            byPriority[c.priority].covered++;
          }
        }
      });

      Object.entries(byPriority).forEach(([priority, stats]) => {
        const pct =
          stats.total > 0
            ? Math.round((stats.covered / stats.total) * 100)
            : 0;
        report.push(
          `- **${priority}:** ${stats.covered}/${stats.total} (${pct}%)`,
        );
      });

      // Detailed mapping
      report.push("\n## Detailed Criteria-to-Test Mapping\n");
      criteria.forEach((c) => {
        report.push(`### ${c.id}: ${c.title}\n`);
        report.push(`- **Type:** ${c.type}`);
        report.push(`- **Priority:** ${c.priority}`);
        report.push(`- **Status:** ${c.status}`);
        report.push(`- **Test Coverage:** ${c.testIds?.length || 0} test(s)`);

        if (c.testIds && c.testIds.length > 0) {
          report.push("\n**Linked Tests:**");
          c.testIds.forEach((test) => {
            report.push(`- \`${test}\``);
          });
        } else {
          report.push("\n⚠️ **No tests linked**");
        }
        report.push("");
      });

      // Uncovered criteria section
      const uncoveredCriteria = criteria.filter(
        (c) => !c.testIds || c.testIds.length === 0,
      );
      if (uncoveredCriteria.length > 0) {
        report.push("\n## Uncovered Criteria (Action Required)\n");
        uncoveredCriteria.forEach((c) => {
          report.push(`- **${c.id}** (${c.priority}): ${c.title}`);
        });
      }

      const reportText = report.join("\n");

      // Output to file or console
      if (options.output) {
        fs.writeFileSync(options.output, reportText, "utf-8");
        console.log(chalk.green(`Report saved to ${options.output}`));
      } else {
        console.log("\n" + reportText);
      }
    } catch (error) {
      spinner.fail("Failed to generate report");
      console.error(chalk.red(error.message));
      process.exit(1);
    }
  });

// Helper functions
function getStatusColor(status) {
  const colors = {
    pending: chalk.gray(status),
    "in-progress": chalk.yellow(status),
    implemented: chalk.blue(status),
    verified: chalk.green(status),
  };
  return colors[status] || status;
}

program.parse();
