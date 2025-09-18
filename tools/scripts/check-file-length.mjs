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

// Development-only files/directories (excluded when --dev flag is used)
const DEV_PATTERNS = [
  'src/dev/',
  '__tests__/',
  '.test.',
  '.spec.',
  '.stories.',
  'mock',
  'fixture'
];

// Whitelist patterns for legitimate exceptions
let WHITELIST_PATTERNS = [];

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n')
    .filter(line => line.trim()) // Remove empty lines
    .filter(line => !line.trim().startsWith('//')); // Remove single-line comments
  return lines.length;
}

function isDevFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  return DEV_PATTERNS.some(pattern => relativePath.includes(pattern));
}

function isWhitelisted(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  return WHITELIST_PATTERNS.some(pattern => {
    if (pattern.includes('*') || pattern.includes('?')) {
      // Simple glob matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
      return regex.test(relativePath);
    }
    return relativePath.includes(pattern);
  });
}

function loadWhitelist(whitelistPath) {
  try {
    if (fs.existsSync(whitelistPath)) {
      const content = fs.readFileSync(whitelistPath, 'utf8');
      const whitelist = JSON.parse(content);
      if (Array.isArray(whitelist.patterns)) {
        WHITELIST_PATTERNS = whitelist.patterns;
        console.log(`Loaded ${WHITELIST_PATTERNS.length} whitelist patterns from ${whitelistPath}`);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not load whitelist from ${whitelistPath}:`, error.message);
  }
}

function scanDirectory(dir, results = [], options = {}) {
  const files = fs.readdirSync(dir);
  const whitelistedFiles = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        scanDirectory(filePath, results, options);
      }
    } else if (EXTENSIONS.includes(path.extname(file))) {
      // Skip dev files if --dev flag is present
      if (options.excludeDev && isDevFile(filePath)) {
        continue;
      }

      const lineCount = countLines(filePath);
      if (lineCount > LINE_LIMIT) {
        const relativePath = path.relative(process.cwd(), filePath);

        // Check if file is whitelisted
        if (isWhitelisted(filePath)) {
          whitelistedFiles.push({
            path: relativePath,
            lines: lineCount,
            excess: lineCount - LINE_LIMIT,
            isDev: isDevFile(filePath)
          });
          continue;
        }

        results.push({
          path: relativePath,
          lines: lineCount,
          excess: lineCount - LINE_LIMIT,
          isDev: isDevFile(filePath)
        });
      }
    }
  }

  // Store whitelisted files for reporting
  if (!options.whitelistedFiles) options.whitelistedFiles = [];
  options.whitelistedFiles.push(...whitelistedFiles);

  return results;
}

function generateReport(violations, options = {}) {
  const prodViolations = violations.filter(v => !v.isDev);
  const devViolations = violations.filter(v => v.isDev);

  if (violations.length === 0) {
    console.log('✅ All files are within the 300 line limit');
    return true;
  }

  console.log('❌ Found files exceeding 300 lines:\n');

  violations.sort((a, b) => b.lines - a.lines);

  violations.forEach(({ path: filePath, lines, excess, isDev }) => {
    const devLabel = isDev ? ' (dev)' : '';
    console.log(`${filePath}${devLabel}:`);
    console.log(`  ${lines} lines (${excess} lines over limit)\n`);
  });

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    violations: violations,
    whitelisted: options.whitelistedFiles || [],
    summary: {
      totalViolations: violations.length,
      prodViolations: prodViolations.length,
      devViolations: devViolations.length,
      whitelistedFiles: (options.whitelistedFiles || []).length,
      maxLines: violations.length > 0 ? Math.max(...violations.map(v => v.lines)) : 0,
      totalExcessLines: violations.reduce((sum, v) => sum + v.excess, 0),
      prodExcessLines: prodViolations.reduce((sum, v) => sum + v.excess, 0),
      excludedDev: options.excludeDev || false
    }
  };

  fs.writeFileSync('file-length-report.json', JSON.stringify(report, null, 2));

  console.log(`\nTotal files over limit: ${violations.length}`);
  if (devViolations.length > 0) {
    console.log(`  Production files: ${prodViolations.length}`);
    console.log(`  Development files: ${devViolations.length}`);
  }
  if (report.summary.whitelistedFiles > 0) {
    console.log(`  Whitelisted files: ${report.summary.whitelistedFiles}`);
  }
  console.log(`Total excess lines: ${report.summary.totalExcessLines}`);
  console.log('\nDetailed report saved to file-length-report.json');

  return false;
}

// Parse command line arguments
const args = process.argv.slice(2);
const excludeDev = args.includes('--dev');
const showHelp = args.includes('--help') || args.includes('-h');
const whitelistFlag = args.find(arg => arg.startsWith('--whitelist='));
const whitelistPath = whitelistFlag ? whitelistFlag.split('=')[1] : null;

if (showHelp) {
  console.log(`
File Length Checker

Usage: node check-file-length.mjs [options]

Options:
  --dev                    Exclude development-only files from the check
  --whitelist=PATH         Load whitelist patterns from JSON file
  --fix                    Placeholder for future auto-splitting functionality
  --help, -h              Show this help message

Examples:
  node check-file-length.mjs                         Check all files
  node check-file-length.mjs --dev                   Check only production files
  node check-file-length.mjs --whitelist=whitelist.json  Use whitelist exceptions

Whitelist format (JSON):
  {
    "patterns": [
      "src/legacy/LargeComponent.tsx",
      "src/vendor/*.ts",
      "**/*.generated.ts"
    ]
  }
  `);
  process.exit(0);
}

// Main execution
try {
  // Load whitelist if specified
  if (whitelistPath) {
    loadWhitelist(whitelistPath);
  }

  const options = { excludeDev };
  const violations = scanDirectory(SRC_DIR, [], options);
  const success = generateReport(violations, options);

  // Handle --fix flag (placeholder for future auto-splitting functionality)
  if (args.includes('--fix')) {
    console.log('\nAuto-fix functionality not yet implemented');
    console.log('Please split large files manually according to the modular extraction guide');
  }

  if (excludeDev && violations.length === 0) {
    console.log('\n(Development files were excluded from this check)');
  }

  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('Error running file length check:', error);
  process.exit(1);
}
