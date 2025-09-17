#!/usr/bin/env node
/* eslint-env node */

import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LINE_LIMIT = 300;
const SRC_DIR = path.join(__dirname, '../../src');

// File extensions to check
const EXTENSIONS = ['.tsx', '.ts'];

// Directories to ignore
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.next', 'coverage'];

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n')
    .filter(line => line.trim()) // Remove empty lines
    .filter(line => !line.trim().startsWith('//')); // Remove single-line comments
  return lines.length;
}

function scanDirectory(dir, results = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        scanDirectory(filePath, results);
      }
    } else if (EXTENSIONS.includes(path.extname(file))) {
      const lineCount = countLines(filePath);
      if (lineCount > LINE_LIMIT) {
        results.push({
          path: path.relative(process.cwd(), filePath),
          lines: lineCount,
          excess: lineCount - LINE_LIMIT
        });
      }
    }
  }

  return results;
}

function generateReport(violations) {
  if (violations.length === 0) {
    console.log('✅ All files are within the 300 line limit');
    return true;
  }

  console.log('❌ Found files exceeding 300 lines:\n');

  violations.sort((a, b) => b.lines - a.lines);

  violations.forEach(({ path: filePath, lines, excess }) => {
    console.log(`${filePath}:`);
    console.log(`  ${lines} lines (${excess} lines over limit)\n`);
  });

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    violations: violations,
    summary: {
      totalViolations: violations.length,
      maxLines: Math.max(...violations.map(v => v.lines)),
      totalExcessLines: violations.reduce((sum, v) => sum + v.excess, 0)
    }
  };

  fs.writeFileSync('file-length-report.json', JSON.stringify(report, null, 2));

  console.log(`\nTotal files over limit: ${violations.length}`);
  console.log(`Total excess lines: ${report.summary.totalExcessLines}`);
  console.log('\nDetailed report saved to file-length-report.json');

  return false;
}

// Main execution
try {
  const violations = scanDirectory(SRC_DIR);
  const success = generateReport(violations);

  // Handle --fix flag (placeholder for future auto-splitting functionality)
  if (process.argv.includes('--fix')) {
    console.log('\nAuto-fix functionality not yet implemented');
    console.log('Please split large files manually according to the modular extraction guide');
  }

  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('Error running file length check:', error);
  process.exit(1);
}
