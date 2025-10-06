#!/usr/bin/env node
// tools/scripts/generate-demo-screenshots.js
// Automated orchestration for marketing-ready screenshot generation
// Mirrors the demo video pipeline while focusing on static capture workflows
// RELEVANT FILES: e2e/demo-screenshot-capture.spec.ts, config/playwright.config.ts, package.json, demo-screenshots/

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCREENSHOT_CONFIG = {
  outputDir: path.resolve(process.cwd(), 'demo-screenshots'),
  tempDir: path.resolve(process.cwd(), 'demo-screenshots/.tmp'),
  summaryFile: path.resolve(process.cwd(), 'demo-screenshots/metadata/index.json'),
  indexFile: path.resolve(process.cwd(), 'demo-screenshots/index.html'),
  quality: {
    defaultPreset: 'desktop-hd',
    presets: {
      'desktop-hd': { width: 1920, height: 1080 },
      'desktop-4k': { width: 2560, height: 1440 },
      tablet: { width: 1280, height: 834 },
      mobile: { width: 390, height: 844 }
    }
  }
};

const SCREENSHOT_SCENARIOS = {
  'feature-showcase': {
    title: 'Feature Showcase',
    description: 'Component palette, annotation tools, export flows',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: 'Feature showcase marketing captures',
    category: 'feature-showcase',
    emoji: '✨'
  },
  'architecture-examples': {
    title: 'Architecture Examples',
    description: 'E-commerce, microservices, and cloud-native patterns',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: 'Architecture portfolio gallery',
    category: 'architecture-examples',
    emoji: '🏗️'
  },
  'workflow-stages': {
    title: 'Workflow Stages',
    description: 'Milestones from blank canvas to export-ready deliverable',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: 'Workflow stage milestones',
    category: 'workflow-stages',
    emoji: '🧭'
  },
  'responsive-views': {
    title: 'Responsive Views',
    description: 'Desktop, tablet, and mobile viewport captures',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: 'Responsive layout gallery',
    category: 'responsive-views',
    emoji: '📱'
  },
  'ui-states': {
    title: 'UI States & Moments',
    description: 'Interactive overlays, loading states, contextual menus',
    tests: ['demo-screenshot-capture.spec.ts'],
    project: 'Demo - Desktop HD',
    grep: 'Interactive moments gallery',
    category: 'ui-states',
    emoji: '🎛️'
  }
};

class DemoScreenshotGenerator {
  constructor() {
    this.results = { success: [], failed: [], skipped: [] };
    this.startTime = Date.now();

    this.setupDirectories();
  }

  setupDirectories() {
    const directories = [
      SCREENSHOT_CONFIG.outputDir,
      SCREENSHOT_CONFIG.tempDir,
      path.join(SCREENSHOT_CONFIG.outputDir, 'feature-showcase'),
      path.join(SCREENSHOT_CONFIG.outputDir, 'architecture-examples'),
      path.join(SCREENSHOT_CONFIG.outputDir, 'workflow-stages'),
      path.join(SCREENSHOT_CONFIG.outputDir, 'responsive-views'),
      path.join(SCREENSHOT_CONFIG.outputDir, 'metadata')
    ];

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  async generateAllScreenshots() {
    console.log('🖼️  Generating complete screenshot gallery...\n');
    await this.setupDemoEnvironment();

    for (const [category, config] of Object.entries(SCREENSHOT_SCENARIOS)) {
      await this.runScreenshotCategory(category, config);
    }

    await this.organizeScreenshotFiles();
    await this.generateScreenshotMetadata();
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
    await this.organizeScreenshotFiles();
    await this.generateScreenshotMetadata();
    await this.generateSummaryReport();
  }

  async setupDemoEnvironment() {
    process.env.DEMO_MODE = 'true';
    process.env.SCREENSHOT_MODE = 'true';
    process.env.PLAYWRIGHT_VIDEO = 'off';

    const playwrightCli = path.resolve(process.cwd(), 'node_modules/.bin/playwright');
    if (!fs.existsSync(playwrightCli)) {
      console.error('⚠️  Playwright CLI not found. Run `npx playwright install` before generating screenshots.');
    }

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
        `--grep=${config.grep}`
      ];

      await this.spawnCommand('npx', args, {
        DEMO_MODE: 'true',
        SCREENSHOT_MODE: 'true'
      })
        .then(() => {
          console.log(`✅ Completed ${config.title}`);
          this.results.success.push({ category, title: config.title });
        })
        .catch((error) => {
          console.error(`❌ Failed ${config.title}`, error.message);
          this.results.failed.push({ category, title: config.title, error: error.message });
        });
    }
  }

  async organizeScreenshotFiles() {
    const metadataDir = path.join(SCREENSHOT_CONFIG.outputDir, 'metadata');
    if (!fs.existsSync(metadataDir)) {
      return;
    }

    const files = this.walkDirectory(SCREENSHOT_CONFIG.outputDir).filter((file) => file.endsWith('.png'));
    if (files.length === 0) {
      console.log('ℹ️  No screenshots found to organize.');
      return;
    }

    files.forEach((file) => {
      const relative = path.relative(SCREENSHOT_CONFIG.outputDir, file);
      const category = relative.split(path.sep)[0];
      if (!SCREENSHOT_SCENARIOS[category]) {
        console.log(`🗂️  Keeping uncategorized asset at ${relative}`);
      }
    });
  }

  async generateScreenshotMetadata() {
    const metadataDir = path.join(SCREENSHOT_CONFIG.outputDir, 'metadata');
    if (!fs.existsSync(metadataDir)) {
      console.log('ℹ️  Metadata directory missing, skipping aggregation.');
      return;
    }

    const entries = this.walkDirectory(metadataDir).filter((file) => file.endsWith('.json'));
    const summary = entries.map((file) => {
      try {
        const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
        return { ...content, file: path.relative(SCREENSHOT_CONFIG.outputDir, file) };
      } catch (error) {
        console.warn(`⚠️  Failed to parse metadata file ${file}: ${error.message}`);
        return null;
      }
    }).filter(Boolean);

    fs.writeFileSync(SCREENSHOT_CONFIG.summaryFile, JSON.stringify({
      generatedAt: new Date().toISOString(),
      host: os.hostname(),
      totalScreenshots: summary.length,
      summary
    }, null, 2));

    console.log(`🗃️  Wrote metadata summary to ${SCREENSHOT_CONFIG.summaryFile}`);
  }

  async optimizeScreenshots() {
    const candidates = this.walkDirectory(SCREENSHOT_CONFIG.outputDir).filter((file) => file.endsWith('.png'));
    if (candidates.length === 0) return;

    const pngquant = await this.hasBinary('pngquant');
    const optipng = await this.hasBinary('optipng');

    if (!pngquant && !optipng) {
      console.log('ℹ️  No PNG optimization tools detected, skipping compression.');
      return;
    }

    if (pngquant) {
      await Promise.all(
        candidates.map((file) => this.spawnCommand('pngquant', ['--force', '--ext=.png', '--quality=70-95', file]))
      );
      console.log('🪄 Optimized screenshots with pngquant');
    } else if (optipng) {
      await Promise.all(
        candidates.map((file) => this.spawnCommand('optipng', ['-o2', file]))
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

    const thumbnailDir = path.join(SCREENSHOT_CONFIG.outputDir, 'thumbnails');
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    const screenshots = this.walkDirectory(SCREENSHOT_CONFIG.outputDir).filter((file) => file.endsWith('.png'));
    await Promise.all(
      screenshots.map(async (file) => {
        const relative = path.relative(SCREENSHOT_CONFIG.outputDir, file);
        const thumbPath = path.join(thumbnailDir, relative.replace(/\.png$/, '.thumb.png'));
        const thumbDir = path.dirname(thumbPath);
        if (!fs.existsSync(thumbDir)) {
          fs.mkdirSync(thumbDir, { recursive: true });
        }

        await sharp(file).resize({ width: 640 }).toFile(thumbPath);
      })
    );

    console.log('🖼️  Generated thumbnail previews');
  }

  async generateScreenshotIndex() {
    const screenshots = this.walkDirectory(SCREENSHOT_CONFIG.outputDir)
      .filter((file) => file.endsWith('.png'))
      .map((file) => path.relative(SCREENSHOT_CONFIG.outputDir, file))
      .sort();

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>ArchiComm Screenshot Gallery</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 24px; }
    h1 { font-weight: 700; }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; margin-top: 24px; }
    .card { background: rgba(15, 23, 42, 0.6); border-radius: 16px; padding: 16px; box-shadow: 0 12px 32px rgba(15, 23, 42, 0.35); }
    .card img { width: 100%; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.2); }
    .meta { margin-top: 12px; font-size: 14px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>ArchiComm Demo Screenshot Gallery</h1>
  <p>Generated at ${new Date().toLocaleString()}</p>
  <div class="gallery">
    ${screenshots
      .map(
        (file) => `
      <div class="card">
        <img src="./${file}" alt="${file}" loading="lazy" />
        <div class="meta">${file}</div>
      </div>
    `
      )
      .join('\n')}
  </div>
</body>
</html>`;

    fs.writeFileSync(SCREENSHOT_CONFIG.indexFile, html);
    console.log(`🗂️  Generated screenshot index at ${SCREENSHOT_CONFIG.indexFile}`);
  }

  async generateSummaryReport() {
    const pngFiles = this.walkDirectory(SCREENSHOT_CONFIG.outputDir).filter((file) => file.endsWith('.png'));
    const categories = new Map();

    pngFiles.forEach((file) => {
      const relative = path.relative(SCREENSHOT_CONFIG.outputDir, file);
      const category = relative.split(path.sep)[0] || 'uncategorized';
      categories.set(category, (categories.get(category) || 0) + 1);
    });

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

    console.log(`\n⏱️  Completed in ${(Date.now() - this.startTime) / 1000}s`);
  }

  listScreenshotScenarios() {
    console.log('Available screenshot categories:\n');
    Object.entries(SCREENSHOT_SCENARIOS).forEach(([key, config]) => {
      console.log(` ${config.emoji || '📷'}  ${key} — ${config.title} :: ${config.description}`);
    });
  }

  walkDirectory(dir) {
    if (!fs.existsSync(dir)) {
      return [];
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return this.walkDirectory(fullPath);
      }
      return [fullPath];
    });
  }

  async spawnCommand(command, args, extraEnv = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        env: { ...process.env, ...extraEnv }
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

  async hasBinary(binary) {
    return new Promise((resolve) => {
      const which = spawn(process.platform === 'win32' ? 'where' : 'which', [binary]);
      which.on('close', (code) => resolve(code === 0));
      which.on('error', () => resolve(false));
    });
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
    case 'help':
    default:
      console.log(`Demo Screenshot Generator
Usage:
  node tools/scripts/generate-demo-screenshots.js all          # Run complete screenshot pipeline
  node tools/scripts/generate-demo-screenshots.js category <c>  # Run single category (feature-showcase, architecture-examples, ...)
  node tools/scripts/generate-demo-screenshots.js list          # List available categories
  node tools/scripts/generate-demo-screenshots.js help          # Show this help message
`);
      break;
  }
}

main().catch((error) => {
  console.error('Screenshot generation failed:', error);
  process.exit(1);
});
