#!/usr/bin/env node
// tools/scripts/generate-demo-screenshots.js
// Automated orchestration for marketing-ready screenshot generation
// Mirrors the demo video pipeline while focusing on static capture workflows
// RELEVANT FILES: e2e/demo-screenshot-capture.spec.ts, config/playwright.config.ts, package.json, demo-screenshots/

const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const SCREENSHOT_CONFIG = {
  outputDir: path.resolve(process.cwd(), 'demo-screenshots'),
  runsDir: path.resolve(process.cwd(), 'demo-screenshots', 'runs'),
  latestDir: path.resolve(process.cwd(), 'demo-screenshots', 'latest'),
  metadataDir: path.resolve(process.cwd(), 'demo-screenshots', 'metadata'),
  summaryFile: path.resolve(process.cwd(), 'demo-screenshots', 'metadata', 'index.json'),
  errorsFile: path.resolve(process.cwd(), 'demo-screenshots', 'metadata', 'errors.json'),
  indexFile: path.resolve(process.cwd(), 'demo-screenshots', 'index.html'),
  thumbnailsDir: 'thumbnails',
};

const SCREENSHOT_SCENARIOS = {
  'feature-showcase': {
    title: 'Feature Showcase',
    description: 'Component palette, annotation tools, export flows',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: '@screenshots:feature-showcase',
    category: 'feature-showcase',
    emoji: '✨',
  },
  'architecture-examples': {
    title: 'Architecture Examples',
    description: 'E-commerce, microservices, and cloud-native patterns',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: '@screenshots:architecture-examples',
    category: 'architecture-examples',
    emoji: '🏗️',
  },
  'workflow-stages': {
    title: 'Workflow Stages',
    description: 'Milestones from blank canvas to export-ready deliverable',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: '@screenshots:workflow-stages',
    category: 'workflow-stages',
    emoji: '🧭',
  },
  'responsive-views': {
    title: 'Responsive Views',
    description: 'Desktop, tablet, and mobile viewport captures',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: '@screenshots:responsive-views',
    category: 'responsive-views',
    emoji: '📱',
  },
  'ui-states': {
    title: 'UI States & Moments',
    description: 'Interactive overlays, loading states, contextual menus',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: '@screenshots:ui-states',
    category: 'ui-states',
    emoji: '🎛️',
  },
};

const REQUIRED_METADATA_FIELDS = [
  'name',
  'category',
  'scenario',
  'step',
  'relativePath',
  'absolutePath',
  'capturedAt',
  'runId',
];

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeForHtmlPath(relativePath) {
  return encodeURI(relativePath.split(path.sep).join('/'));
}

class DemoScreenshotGenerator {
  constructor() {
    this.results = { success: [], failed: [], skipped: [] };
    this.startTime = Date.now();
    this.runId = process.env.SCREENSHOT_RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');
    process.env.SCREENSHOT_RUN_ID = this.runId;
    this.currentRunDir = path.join(SCREENSHOT_CONFIG.runsDir, this.runId);
    this.directoriesReady = this.setupDirectories();
  }

  async setupDirectories() {
    const directories = [
      SCREENSHOT_CONFIG.outputDir,
      SCREENSHOT_CONFIG.runsDir,
      SCREENSHOT_CONFIG.metadataDir,
      this.currentRunDir,
      path.join(this.currentRunDir, 'metadata'),
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async pathExists(targetPath) {
    try {
      await fs.access(targetPath);
      return true;
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async prepare() {
    await this.directoriesReady;
    await this.ensurePlaywrightCli();
    console.log('✅ Demo screenshot folders are ready.');
  }

  async ensurePlaywrightCli() {
    const cliName = process.platform === 'win32' ? 'playwright.cmd' : 'playwright';
    const localCli = path.resolve(process.cwd(), 'node_modules', '.bin', cliName);
    const hasLocalCli = await this.pathExists(localCli);

    if (!hasLocalCli) {
      console.error('⚠️  Playwright CLI not found. Run `npx playwright install` before generating screenshots.');
      return;
    }

    const available = await this.commandAvailable(localCli, ['--version'], {
      shell: process.platform === 'win32',
    });

    if (!available) {
      console.error('⚠️  Failed to execute Playwright CLI. Run `npx playwright install` to finish setup.');
    }
  }

  async generateAllScreenshots() {
    console.log('🖼️  Generating complete screenshot gallery...\n');
    await this.setupDemoEnvironment();

    for (const [category, config] of Object.entries(SCREENSHOT_SCENARIOS)) {
      await this.runScreenshotCategory(category, config);
    }

    await this.finalizeArtifacts();
  }

  async finalizeArtifacts() {
    await this.organizeScreenshotFiles();
    await this.generateScreenshotMetadata();
    await this.updateLatestSnapshot();
    await this.optimizeScreenshots();
    await this.generateThumbnails();
    await this.generateScreenshotIndex();
    await this.generateSummaryReport();
  }

  async generateCategoryScreenshots(category) {
    const config = SCREENSHOT_SCENARIOS[category];
    if (!config) {
      console.error(`❌ Unknown screenshot category: ${category}`);
      return;
    }

    await this.setupDemoEnvironment();
    await this.runScreenshotCategory(category, config);
    await this.finalizeArtifacts();
  }

  async setupDemoEnvironment() {
    await this.directoriesReady;
    process.env.DEMO_MODE = 'true';
    process.env.SCREENSHOT_MODE = 'true';
    process.env.PLAYWRIGHT_VIDEO = 'off';

    await this.ensurePlaywrightCli();

    console.log('🌐 Using Playwright webServer configuration defined in config/playwright.config.ts');
  }

  async runScreenshotCategory(category, config) {
    console.log(`\n${config.emoji || '📷'}  Running screenshot scenario: ${config.title}`);

    for (const testFile of config.tests) {
      const args = [
        'playwright',
        'test',
        path.join('e2e', testFile),
        `--project=${config.project}`,
        `--grep=${config.grep}`,
      ];

      try {
        await this.spawnCommand('npx', args, {
          env: {
            DEMO_MODE: 'true',
            SCREENSHOT_MODE: 'true',
            SCREENSHOT_RUN_ID: this.runId,
          },
        });
        console.log(`✅ Completed ${config.title}`);
        this.results.success.push({ category, title: config.title });
      } catch (error) {
        console.error(`❌ Failed ${config.title}`, error.message);
        this.results.failed.push({ category, title: config.title, error: error.message });
      }
    }
  }

  async organizeScreenshotFiles() {
    const pngFiles = (await this.walkDirectory(this.currentRunDir)).filter((file) => file.endsWith('.png'));

    if (pngFiles.length === 0) {
      console.log('ℹ️  No screenshots found to organize.');
      return;
    }

    for (const file of pngFiles) {
      const relative = path.relative(this.currentRunDir, file);
      const [category] = relative.split(path.sep);
      if (!SCREENSHOT_SCENARIOS[category]) {
        console.log(`🗂️  Keeping uncategorized asset at ${path.join('runs', this.runId, relative)}`);
      }
    }
  }

  async generateScreenshotMetadata() {
    const metadataRoot = path.join(this.currentRunDir, 'metadata');
    if (!(await this.pathExists(metadataRoot))) {
      console.log('ℹ️  Metadata directory missing, skipping aggregation.');
      return;
    }

    const metadataFiles = (await this.walkDirectory(metadataRoot)).filter((file) => file.endsWith('.json'));
    const summary = [];
    const errors = [];

    for (const file of metadataFiles) {
      const relativeFile = path.relative(SCREENSHOT_CONFIG.outputDir, file);
      try {
        const raw = await fs.readFile(file, 'utf8');
        const data = JSON.parse(raw);
        const { valid, messages } = this.validateMetadata(data);

        if (!valid) {
          const reason = messages.join('; ');
          errors.push({ file: relativeFile, reason });
          this.results.skipped.push({ file: relativeFile, reason });
          continue;
        }

        summary.push({ ...data, file: relativeFile });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        errors.push({ file: relativeFile, reason });
        this.results.skipped.push({ file: relativeFile, reason });
      }
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      host: os.hostname(),
      runId: this.runId,
      totalScreenshots: summary.length,
      summary,
    };

    const runSummaryFile = path.join(metadataRoot, 'index.json');
    await fs.writeFile(runSummaryFile, JSON.stringify(payload, null, 2), 'utf8');

    await fs.mkdir(SCREENSHOT_CONFIG.metadataDir, { recursive: true });
    await fs.writeFile(SCREENSHOT_CONFIG.summaryFile, JSON.stringify(payload, null, 2), 'utf8');
    await fs.writeFile(
      SCREENSHOT_CONFIG.errorsFile,
      JSON.stringify({ runId: this.runId, errors }, null, 2),
      'utf8'
    );

    if (errors.length > 0) {
      console.warn(`⚠️  Metadata issues detected for ${errors.length} file(s). Inspect ${SCREENSHOT_CONFIG.errorsFile}`);
    }
  }

  validateMetadata(data) {
    const messages = [];
    if (!data || typeof data !== 'object') {
      messages.push('metadata is not an object');
      return { valid: false, messages };
    }

    for (const field of REQUIRED_METADATA_FIELDS) {
      if (!(field in data)) {
        messages.push(`missing field: ${field}`);
        continue;
      }

      if (typeof data[field] !== 'string' || data[field].trim() === '') {
        messages.push(`invalid value for ${field}`);
      }
    }

    if (data.runId && data.runId !== this.runId) {
      messages.push(`runId mismatch (expected ${this.runId}, received ${data.runId})`);
    }

    return { valid: messages.length === 0, messages };
  }

  async updateLatestSnapshot() {
    const parentDir = path.dirname(SCREENSHOT_CONFIG.latestDir);
    await fs.mkdir(parentDir, { recursive: true });
    await fs.rm(SCREENSHOT_CONFIG.latestDir, { recursive: true, force: true });
    await fs.cp(this.currentRunDir, SCREENSHOT_CONFIG.latestDir, { recursive: true });

    console.log(
      `📦 Copied run artifacts to ${path.relative(process.cwd(), SCREENSHOT_CONFIG.latestDir)}`
    );
  }

  async optimizeScreenshots() {
    const files = (await this.walkDirectory(this.currentRunDir)).filter((file) => file.endsWith('.png'));
    if (files.length === 0) return;

    const shell = process.platform === 'win32';
    const pngquantAvailable = await this.commandAvailable('pngquant', ['--version'], { shell });
    const optipngAvailable = await this.commandAvailable('optipng', ['-v'], { shell });

    if (!pngquantAvailable && !optipngAvailable) {
      console.log('ℹ️  No PNG optimization tools detected, skipping compression.');
      return;
    }

    if (pngquantAvailable) {
      await Promise.all(
        files.map((file) =>
          this.spawnCommand('pngquant', ['--force', '--ext=.png', '--quality=70-95', file], {
            stdio: 'ignore',
            shell,
          })
        )
      );
      console.log('🪄 Optimized screenshots with pngquant');
    } else if (optipngAvailable) {
      await Promise.all(
        files.map((file) =>
          this.spawnCommand('optipng', ['-o2', file], {
            stdio: 'ignore',
            shell,
          })
        )
      );
      console.log('🪄 Optimized screenshots with optipng');
    }
  }

  async generateThumbnails() {
    let sharp;
    try {
      sharp = require('sharp');
    } catch (error) {
      console.log('ℹ️  Sharp not installed, skipping thumbnail generation.');
      return;
    }

    const thumbnailRoot = path.join(this.currentRunDir, SCREENSHOT_CONFIG.thumbnailsDir);
    await fs.mkdir(thumbnailRoot, { recursive: true });

    const screenshots = (await this.walkDirectory(this.currentRunDir)).filter((file) => file.endsWith('.png'));

    await Promise.all(
      screenshots.map(async (file) => {
        const relative = path.relative(this.currentRunDir, file);
        const thumbPath = path.join(thumbnailRoot, relative.replace(/\.png$/, '.thumb.png'));
        await fs.mkdir(path.dirname(thumbPath), { recursive: true });
        await sharp(file).resize({ width: 640 }).toFile(thumbPath);
      })
    );

    console.log('🖼️  Generated thumbnail previews');
  }

  async generateScreenshotIndex() {
    const screenshots = (await this.walkDirectory(this.currentRunDir))
      .filter((file) => file.endsWith('.png'))
      .map((file) => path.relative(SCREENSHOT_CONFIG.outputDir, file))
      .sort();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ArchiComm Screenshot Gallery</title>
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self';" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
    h1 { font-weight: 700; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; margin-top: 24px; }
    .card { background: rgba(15, 23, 42, 0.6); border-radius: 16px; padding: 16px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.35); }
    .card img { width: 100%; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2); }
    .meta { margin-top: 12px; font-size: 14px; color: #94a3b8; word-break: break-word; }
  </style>
</head>
<body>
  <h1>ArchiComm Demo Screenshot Gallery</h1>
  <p>Generated at ${escapeHtml(new Date().toLocaleString())}</p>
  <div class="gallery">
    ${screenshots
      .map((file) => {
        const safeSrc = normalizeForHtmlPath(`./${file}`);
        const safeAlt = escapeHtml(file);
        return `
      <div class="card">
        <img src="${safeSrc}" alt="${safeAlt}" loading="lazy" />
        <div class="meta">${safeAlt}</div>
      </div>`;
      })
      .join('\n')}
  </div>
</body>
</html>`;

    await fs.writeFile(SCREENSHOT_CONFIG.indexFile, html, 'utf8');
    console.log(`🗂️  Generated screenshot index at ${SCREENSHOT_CONFIG.indexFile}`);
  }

  async generateSummaryReport() {
    const pngFiles = (await this.walkDirectory(this.currentRunDir)).filter((file) => file.endsWith('.png'));
    const categories = new Map();

    for (const file of pngFiles) {
      const relative = path.relative(this.currentRunDir, file);
      const [category = 'uncategorized'] = relative.split(path.sep);
      categories.set(category, (categories.get(category) || 0) + 1);
    }

    console.log('\n📊 Screenshot Generation Summary');
    console.log(`   • Total screenshots: ${pngFiles.length}`);
    for (const [category, count] of categories.entries()) {
      console.log(`   • ${category}: ${count}`);
    }

    if (this.results.failed.length > 0) {
      console.log('\n⚠️  Failed categories:');
      this.results.failed.forEach((entry) => {
        console.log(`   • ${entry.title} (${entry.category}): ${entry.error}`);
      });
    }

    if (this.results.skipped.length > 0) {
      console.log('\n⚠️  Skipped metadata entries:');
      this.results.skipped.forEach((entry) => {
        console.log(`   • ${entry.file}: ${entry.reason}`);
      });
    }

    console.log(`\n⏱️  Completed in ${(Date.now() - this.startTime) / 1000}s`);
  }

  listScreenshotScenarios() {
    console.log('Available screenshot categories:\n');
    Object.entries(SCREENSHOT_SCENARIOS).forEach(([key, config]) => {
      console.log(` ${config.emoji || '📷'}  ${key} — ${config.title} :: ${config.description}`);
    });
  }

  async walkDirectory(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            return this.walkDirectory(fullPath);
          }
          return [fullPath];
        })
      );
      return files.flat();
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async spawnCommand(command, args, options = {}) {
    const { env = {}, cwd = process.cwd(), stdio = 'inherit', shell = false } = options;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        stdio,
        shell,
        env: { ...process.env, ...env },
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
        }
      });

      child.on('error', (error) => reject(error));
    });
  }

  async commandAvailable(command, args = [], options = {}) {
    try {
      await this.spawnCommand(command, args, { ...options, stdio: options.stdio ?? 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}

async function main() {
  const generator = new DemoScreenshotGenerator();
  const [command, arg] = process.argv.slice(2);

  switch (command) {
    case 'all':
    case undefined:
      await generator.generateAllScreenshots();
      break;
    case 'category':
      if (!arg) {
        console.error('Please provide a category name. Example: category feature-showcase');
        process.exit(1);
      }
      await generator.generateCategoryScreenshots(arg);
      break;
    case 'list':
      generator.listScreenshotScenarios();
      break;
    case 'prepare':
      await generator.prepare();
      break;
    case 'help':
    default:
      console.log(`Demo Screenshot Generator
Usage:
  node tools/scripts/generate-demo-screenshots.js all          # Run complete screenshot pipeline
  node tools/scripts/generate-demo-screenshots.js category <c>  # Run single category (feature-showcase, architecture-examples, ...)
  node tools/scripts/generate-demo-screenshots.js list          # List available categories
  node tools/scripts/generate-demo-screenshots.js prepare       # Verify environment prerequisites
  node tools/scripts/generate-demo-screenshots.js help          # Show this help message
`);
      break;
  }
}

main().catch((error) => {
  console.error('Screenshot generation failed:', error);
  process.exit(1);
});
