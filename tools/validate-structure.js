#!/usr/bin/env node
/**
 * Validates repository structure to ensure configuration, tooling,
 * and source packages follow the expected organization.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const requiredDirectories = [
  'config',
  'tools/scripts',
  'docs',
  'src/packages/core',
  'src/packages/ui',
  'src/packages/canvas',
  'src/packages/audio',
  'src/packages/services'
];

const legacyConfigFiles = [
  '.prettierrc',
  '.releaserc.json',
  'eslint.config.js',
  'playwright.config.ts',
  'tsconfig.json',
  'vite.config.ts',
  'sonar-project.properties'
];

const forbiddenDevelopmentArtifacts = [
  'TODO.md',
  'CLAUDE.md',
  'ideas',
  'dev-notes',
  'brainstorming',
  'scratch',
  'temp-notes',
  'draft-notes',
  'scripts'
];

const deprecatedImportSegments = [
  "@/components/",
  "@components/",
  "@/services/",
  "@/features/canvas",
  "src/components/",
  "src/services/",
  "src/features/canvas",
  "src/lib/audio"
];

const errors = [];

function checkRequiredDirectories() {
  requiredDirectories.forEach((relPath) => {
    const target = path.join(projectRoot, relPath);
    if (!fs.existsSync(target)) {
      errors.push(`Missing required directory: ${relPath}`);
    }
  });
}

function ensureLegacyConfigsRemoved() {
  legacyConfigFiles.forEach((relPath) => {
    const target = path.join(projectRoot, relPath);
    if (fs.existsSync(target)) {
      errors.push(`Legacy config still present at root: ${relPath}`);
    }
  });
}

function ensureDevelopmentArtifactsNotTracked() {
  forbiddenDevelopmentArtifacts.forEach((name) => {
    const target = path.join(projectRoot, name);
    if (fs.existsSync(target)) {
      errors.push(`Development artifact should not exist at repository root: ${name}`);
    }
  });

  try {
    const trackedArtifacts = execSync('git ls-files -- TODO.md CLAUDE.md ideas dev-notes brainstorming scratch', {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .split('\n')
      .filter(Boolean);
    if (trackedArtifacts.length > 0) {
      trackedArtifacts
        .filter((item) => fs.existsSync(path.join(projectRoot, item)))
        .forEach((item) => {
          errors.push(`Development artifact tracked in git: ${item}`);
        });
    }
  } catch (err) {
    // ignore git errors (e.g., outside repo) but continue validation
  }
}

function walkFiles(startDir, matcher) {
  const stack = [startDir];
  const results = [];

  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'docs', 'dist', 'distribution', 'tools', '.husky'].includes(entry.name)) {
          continue;
        }
        stack.push(fullPath);
      } else if (entry.isFile() && matcher(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function ensureImportsUsePackages() {
  const sourceDir = path.join(projectRoot, 'src');
  if (!fs.existsSync(sourceDir)) {
    errors.push('Missing src directory');
    return;
  }

  const files = walkFiles(sourceDir, (filePath) => {
    const ext = path.extname(filePath);
    return ['.ts', '.tsx', '.js', '.jsx'].includes(ext);
  });

  files.forEach((filePath) => {
    const rawContent = fs.readFileSync(filePath, 'utf8');
    const content = rawContent
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, ''); // Remove line comments

    deprecatedImportSegments.forEach((segment) => {
      if (content.includes(segment)) {
        errors.push(`Deprecated import segment \"${segment}\" found in ${path.relative(projectRoot, filePath)}`);
      }
    });
  });
}

function run() {
  checkRequiredDirectories();
  ensureLegacyConfigsRemoved();
  ensureDevelopmentArtifactsNotTracked();
  ensureImportsUsePackages();

  if (errors.length > 0) {
    console.error('\nRepository structure validation failed:\n');
    errors.forEach((message) => console.error(` - ${message}`));
    console.error('\nPlease align the repository with the expected structure before committing.');
    process.exit(1);
  } else {
    console.log('Repository structure looks good.');
  }
}

run();
