#!/usr/bin/env node
// scripts/generate-demo-videos.js
// Automated demo video generation and processing script
// Orchestrates the complete demo video creation pipeline from recording to export
// RELEVANT FILES: e2e/demo-scenarios/, playwright.config.ts, package.json, scripts/process-demo-videos.js

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const ENABLE_COLLAB = process.env.ENABLE_COLLAB === 'true';

// Playwright results directory: support PW_OUTPUT_DIR or default to project config
const RESULTS_DIR = process.env.PW_OUTPUT_DIR || 'e2e/test-results/artifacts';

/**
 * Demo video generation configuration
 */
const DEMO_CONFIG = {
  outputDir: 'demo-videos',
  tempDir: 'temp-recordings',
  formats: ['mp4', 'webm'],
  qualities: ['HD', 'FHD', '4K'],
  categories: [
    'architecture-workflows',
    'collaboration-demos',
    'performance-showcases',
    'mobile-interactions',
    'advanced-features',
    'user-journeys'
  ]
};

/**
 * Demo scenarios mapping to their test files and configurations
 */
const DEMO_SCENARIOS = {
  'architecture-workflows': {
    title: 'Architecture Design Workflows',
    description: 'Complete system design demonstrations',
    tests: [
      'complete-system-design.spec.ts'
    ],
    project: 'Demo - Desktop HD',
    duration: 'long',
    priority: 'high'
  },
  'collaboration-demos': {
    title: 'Real-Time Collaboration',
    description: 'Multi-user collaborative design scenarios',
    tests: [
      'realtime-teamwork.spec.ts'
    ],
    project: 'Demo - Desktop HD',
    duration: 'long',
    priority: 'high'
  },
  'performance-showcases': {
    title: 'Performance Demonstrations',
    description: 'Large-scale system performance showcases',
    tests: [
      'large-scale-systems.spec.ts'
    ],
    project: 'Demo - 4K',
    duration: 'medium',
    priority: 'medium'
  },
  'mobile-interactions': {
    title: 'Mobile Touch Interactions',
    description: 'Mobile and tablet interaction demonstrations',
    tests: [
      'touch-and-gestures.spec.ts'
    ],
    project: 'Demo - Mobile',
    duration: 'medium',
    priority: 'medium'
  },
  'advanced-features': {
    title: 'AI and Automation Features',
    description: 'Advanced AI-powered design assistance',
    tests: [
      'ai-and-automation.spec.ts'
    ],
    project: 'Demo - Desktop HD',
    duration: 'medium',
    priority: 'medium'
  },
  'user-journeys': {
    title: 'Complete User Workflows',
    description: 'End-to-end user journey demonstrations',
    tests: [
      'complete-workflows.spec.ts'
    ],
    project: 'Demo - Desktop HD',
    duration: 'long',
    priority: 'high'
  }
};

/**
 * Main demo video generation pipeline
 */
class DemoVideoGenerator {
  constructor() {
    this.startTime = Date.now();
    this.results = {
      success: [],
      failed: [],
      skipped: []
    };

    this.setupDirectories();
  }

  /**
   * Set up output directories
   */
  setupDirectories() {
    const dirs = [
      DEMO_CONFIG.outputDir,
      DEMO_CONFIG.tempDir,
      path.join(DEMO_CONFIG.outputDir, 'processed'),
      path.join(DEMO_CONFIG.outputDir, 'thumbnails'),
      path.join(DEMO_CONFIG.outputDir, 'metadata')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  /**
   * Generate all demo videos
   */
  async generateAllDemos() {
    console.log('🎬 Starting complete demo video generation pipeline...\n');

    // Configure demo environment
    await this.setupDemoEnvironment();

    // Run demo scenarios by category
    for (const [category, config] of Object.entries(DEMO_SCENARIOS)) {
      console.log(`\n📹 Generating ${config.title} demos...`);
      await this.runDemoCategory(category, config);
    }

    // Post-process generated videos
    await this.processGeneratedVideos();

    // Generate thumbnails and metadata
    await this.generateVideoThumbnails();
    await this.generateVideoMetadata();

    // Validate video quality
    await this.validateDemoQuality();

    // Export in multiple formats
    await this.exportMultipleFormats();

    // Generate summary report
    this.generateSummaryReport();
  }

  /**
   * Generate demos for a specific category
   */
  async generateCategoryDemos(category) {
    if (!DEMO_SCENARIOS[category]) {
      console.error(`❌ Unknown demo category: ${category}`);
      process.exit(1);
    }

    console.log(`🎬 Generating ${DEMO_SCENARIOS[category].title} demos...\n`);

    await this.setupDemoEnvironment();
    await this.runDemoCategory(category, DEMO_SCENARIOS[category]);
    await this.processGeneratedVideos();
    this.generateSummaryReport();
  }

  /**
   * Set up demo environment
   */
  async setupDemoEnvironment() {
    console.log('⚙️ Setting up demo environment...');

    // Set environment variables for demo mode
    process.env.DEMO_MODE = 'true';
    process.env.VIDEO_RECORDING = 'true';
    process.env.DEMO_QUALITY = 'high';

    // Ensure Playwright is installed
    try {
      execSync('npx playwright install --with-deps chromium', { stdio: 'pipe' });
      console.log('✅ Playwright browsers ready');
    } catch (error) {
      console.warn('⚠️ Playwright install failed, continuing...');
    }

    // Start web server if not running
    await this.ensureWebServerRunning();

    console.log('✅ Demo environment ready\n');
  }

  /**
   * Ensure web server is running
   */
  async ensureWebServerRunning() {
    try {
      const response = await fetch('http://localhost:5173');
      if (response.ok) {
        console.log('✅ Web server already running');
        return;
      }
    } catch (error) {
      console.log('🚀 Starting web server...');

      // Start web server in background
      const webServer = spawn('npm', ['run', 'web:dev'], {
        stdio: 'pipe',
        detached: true
      });

      // Wait for server to start
      await new Promise((resolve) => {
        setTimeout(resolve, 10000); // Wait 10 seconds
      });

      console.log('✅ Web server started');
    }
  }

  /**
   * Run demo tests for a category
   */
  async runDemoCategory(category, config) {
    // Skip collaboration demos unless explicitly enabled
    if (category === 'collaboration-demos' && !ENABLE_COLLAB) {
      console.log(`⏭️ Skipping ${config.title} (collaboration disabled)`);
      this.results.skipped.push(category);
      return;
    }
    const testDir = `e2e/demo-scenarios/${category}`;

    if (!fs.existsSync(testDir)) {
      console.warn(`⚠️ Test directory not found: ${testDir}`);
      this.results.skipped.push(category);
      return;
    }

    try {
      console.log(`🎥 Recording ${config.title}...`);

      const command = [
        'npx', 'playwright', 'test',
        testDir,
        `--project=${config.project}`,
        '--reporter=list'
      ];

      const result = execSync(command.join(' '), {
        stdio: 'inherit',
        env: {
          ...process.env,
          DEMO_CATEGORY: category,
          DEMO_TITLE: config.title
        }
      });

      console.log(`✅ ${config.title} recorded successfully`);
      this.results.success.push({
        category,
        title: config.title,
        duration: this.estimateDuration(config.duration)
      });

    } catch (error) {
      console.error(`❌ Failed to record ${config.title}:`, error.message);
      this.results.failed.push({
        category,
        title: config.title,
        error: error.message
      });
    }
  }

  /**
   * Process generated video files
   */
  async processGeneratedVideos() {
    console.log('\n🔄 Processing generated videos...');

    try {
      // Find all video files from test results
      const testResultsDir = RESULTS_DIR;
      if (!fs.existsSync(testResultsDir)) {
        console.warn('⚠️ No test results directory found');
        return;
      }

      // Copy and rename videos to organized structure
      this.organizeVideoFiles(testResultsDir);

      // Basic video processing (if additional tools available)
      await this.optimizeVideoFiles();

      console.log('✅ Video processing complete');

    } catch (error) {
      console.error('❌ Video processing failed:', error.message);
    }
  }

  /**
   * Organize video files into structured output
   */
  organizeVideoFiles(sourceDir) {
    // Try to parse Playwright JSON summary to improve mapping
    const summaryPath = path.join('e2e', 'test-results', 'test-results.json');
    const mapping = this.parseTestResultsJson(summaryPath);

    const walkDir = (dir, fileList = []) => {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkDir(filePath, fileList);
        } else if (file.endsWith('.webm') || file.endsWith('.mp4')) {
          fileList.push(filePath);
        }
      });

      return fileList;
    };

    const videoFiles = walkDir(sourceDir);
    console.log(`📁 Found ${videoFiles.length} video files`);

    videoFiles.forEach((videoPath, index) => {
      try {
        // Determine category using JSON mapping if available, else fallback from path
        const category = mapping.get(videoPath)?.category || this.extractCategoryFromPath(videoPath);
        const testTitle = mapping.get(videoPath)?.title;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const extension = path.extname(videoPath);

        const safeTitle = testTitle ? testTitle.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase() : `demo-${index + 1}`;
        const outputName = `${category}-${safeTitle}-${timestamp}${extension}`;
        const outputPath = path.join(DEMO_CONFIG.outputDir, outputName);

        fs.copyFileSync(videoPath, outputPath);
        console.log(`📹 Saved: ${outputName}`);

      } catch (error) {
        console.warn(`⚠️ Failed to process video: ${path.basename(videoPath)}`);
      }
    });
  }

  /**
   * Parse Playwright JSON results to map videos to categories and titles
   */
  parseTestResultsJson(summaryPath) {
    const map = new Map();
    try {
      if (!fs.existsSync(summaryPath)) return map;
      const raw = fs.readFileSync(summaryPath, 'utf-8');
      const json = JSON.parse(raw);

      // Walk suites/tests to collect attachments
      const visit = (suite, parentFile) => {
        if (!suite) return;
        const file = suite.file || parentFile;
        const category = this.extractCategoryFromFile(file);

        if (suite.tests) {
          for (const t of suite.tests) {
            const title = Array.isArray(t.titlePath) ? t.titlePath.join(' ') : t.title || 'demo';
            if (t.results) {
              for (const r of t.results) {
                const atts = r.attachments || [];
                for (const a of atts) {
                  if ((a.name === 'video' || a.contentType?.includes('video')) && a.path) {
                    const abs = path.normalize(a.path);
                    // Normalize comparison for artifacts directory roots
                    const rel = abs.startsWith('.') ? path.resolve(abs) : abs;
                    map.set(rel, { category, title });
                  }
                }
              }
            }
          }
        }

        if (suite.suites) {
          for (const s of suite.suites) visit(s, file);
        }
      };

      if (json.suites) {
        for (const s of json.suites) visit(s, s.file);
      } else if (json.suite) {
        visit(json.suite, json.suite.file);
      }
    } catch (e) {
      console.warn('⚠️ Failed to parse Playwright test-results.json:', e.message);
    }
    return map;
  }

  /**
   * Extract category from video file path
   */
  extractCategoryFromPath(videoPath) {
    for (const category of DEMO_CONFIG.categories) {
      if (videoPath.includes(category)) {
        return category;
      }
    }

    // Fallback to test name or generic
    const fileName = path.basename(videoPath, path.extname(videoPath));
    return fileName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  }

  /**
   * Extract category from source file path (JSON reporter)
   */
  extractCategoryFromFile(filePath) {
    if (!filePath) return 'uncategorized';
    const parts = filePath.split(path.sep);
    const idx = parts.indexOf('demo-scenarios');
    if (idx >= 0 && parts[idx + 1]) {
      return parts[idx + 1];
    }
    return 'uncategorized';
  }

  /**
   * Optimize video files (basic processing)
   */
  async optimizeVideoFiles() {
    // Check if ffmpeg is available for video optimization
    try {
      execSync('ffmpeg -version', { stdio: 'pipe' });
      console.log('🎨 FFmpeg available for video optimization');

      // Basic optimization could be added here
      // For now, just log that optimization is possible

    } catch (error) {
      console.log('ℹ️ FFmpeg not available, skipping video optimization');
    }
  }

  /**
   * Generate video thumbnails
   */
  async generateVideoThumbnails() {
    console.log('\n🖼️ Generating video thumbnails...');

    try {
      const videoFiles = fs.readdirSync(DEMO_CONFIG.outputDir)
        .filter(file => file.endsWith('.webm') || file.endsWith('.mp4'));

      console.log(`📸 Creating thumbnails for ${videoFiles.length} videos`);

      // Placeholder for thumbnail generation
      // In a full implementation, this would extract frames from videos
      videoFiles.forEach(videoFile => {
        const thumbnailName = path.basename(videoFile, path.extname(videoFile)) + '.jpg';
        const thumbnailPath = path.join(DEMO_CONFIG.outputDir, 'thumbnails', thumbnailName);

        // Create placeholder thumbnail info
        const thumbnailInfo = {
          video: videoFile,
          thumbnail: thumbnailName,
          timestamp: '00:00:10', // 10 seconds in
          generated: new Date().toISOString()
        };

        fs.writeFileSync(
          thumbnailPath.replace('.jpg', '.json'),
          JSON.stringify(thumbnailInfo, null, 2)
        );
      });

      console.log('✅ Thumbnail generation complete');

    } catch (error) {
      console.error('❌ Thumbnail generation failed:', error.message);
    }
  }

  /**
   * Generate video metadata
   */
  async generateVideoMetadata() {
    console.log('\n📋 Generating video metadata...');

    try {
      const videoFiles = fs.readdirSync(DEMO_CONFIG.outputDir)
        .filter(file => file.endsWith('.webm') || file.endsWith('.mp4'));

      const metadata = {
        generated: new Date().toISOString(),
        totalVideos: videoFiles.length,
        categories: {},
        videos: []
      };

      videoFiles.forEach(videoFile => {
        const filePath = path.join(DEMO_CONFIG.outputDir, videoFile);
        const stats = fs.statSync(filePath);
        const category = this.extractCategoryFromPath(videoFile);

        const videoMeta = {
          filename: videoFile,
          category: category,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          duration: 'unknown', // Would need video analysis
          format: path.extname(videoFile).slice(1),
          title: DEMO_SCENARIOS[category]?.title || 'Demo Video',
          description: DEMO_SCENARIOS[category]?.description || 'Architecture demonstration'
        };

        metadata.videos.push(videoMeta);

        if (!metadata.categories[category]) {
          metadata.categories[category] = {
            count: 0,
            totalSize: 0,
            title: DEMO_SCENARIOS[category]?.title || category
          };
        }

        metadata.categories[category].count++;
        metadata.categories[category].totalSize += stats.size;
      });

      const metadataPath = path.join(DEMO_CONFIG.outputDir, 'metadata', 'videos.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      console.log('✅ Video metadata generated');

    } catch (error) {
      console.error('❌ Metadata generation failed:', error.message);
    }
  }

  /**
   * Validate demo video quality
   */
  async validateDemoQuality() {
    console.log('\n🔍 Validating demo video quality...');

    try {
      const videoFiles = fs.readdirSync(DEMO_CONFIG.outputDir)
        .filter(file => file.endsWith('.webm') || file.endsWith('.mp4'));

      const validationResults = {
        passed: [],
        warnings: [],
        failed: []
      };

      videoFiles.forEach(videoFile => {
        const filePath = path.join(DEMO_CONFIG.outputDir, videoFile);
        const stats = fs.statSync(filePath);

        // Basic quality checks
        const checks = {
          fileSize: stats.size > 1024 * 1024, // At least 1MB
          fileName: /^[a-zA-Z0-9\-_]+\.(webm|mp4)$/.test(videoFile),
          extension: ['.webm', '.mp4'].includes(path.extname(videoFile))
        };

        if (Object.values(checks).every(Boolean)) {
          validationResults.passed.push(videoFile);
        } else {
          validationResults.warnings.push({
            file: videoFile,
            issues: Object.entries(checks)
              .filter(([_, passed]) => !passed)
              .map(([check, _]) => check)
          });
        }
      });

      console.log(`✅ Quality validation: ${validationResults.passed.length} passed, ${validationResults.warnings.length} warnings`);

      if (validationResults.warnings.length > 0) {
        console.log('\n⚠️ Quality warnings:');
        validationResults.warnings.forEach(warning => {
          console.log(`  ${warning.file}: ${warning.issues.join(', ')}`);
        });
      }

    } catch (error) {
      console.error('❌ Quality validation failed:', error.message);
    }
  }

  /**
   * Export videos in multiple formats
   */
  async exportMultipleFormats() {
    console.log('\n📤 Exporting videos in multiple formats...');

    // For now, just ensure we have the standard formats
    // In a full implementation, this would convert between formats

    const exportInfo = {
      formats: ['webm', 'mp4'],
      qualities: ['HD', 'FHD'],
      note: 'Videos are exported in Playwright default formats'
    };

    const exportPath = path.join(DEMO_CONFIG.outputDir, 'metadata', 'export-info.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportInfo, null, 2));

    console.log('✅ Export information saved');
  }

  /**
   * Generate summary report
   */
  generateSummaryReport() {
    const duration = Date.now() - this.startTime;
    const durationMinutes = Math.round(duration / 60000);

    console.log('\n📊 Demo Video Generation Summary');
    console.log('================================');
    console.log(`⏱️ Duration: ${durationMinutes} minutes`);
    console.log(`✅ Successful: ${this.results.success.length}`);
    console.log(`❌ Failed: ${this.results.failed.length}`);
    console.log(`⏭️ Skipped: ${this.results.skipped.length}`);

    if (this.results.success.length > 0) {
      console.log('\n🎉 Successfully generated demos:');
      this.results.success.forEach(demo => {
        console.log(`  • ${demo.title}`);
      });
    }

    if (this.results.failed.length > 0) {
      console.log('\n🚨 Failed demos:');
      this.results.failed.forEach(demo => {
        console.log(`  • ${demo.title}: ${demo.error}`);
      });
    }

    console.log(`\n📁 Videos saved to: ${path.resolve(DEMO_CONFIG.outputDir)}`);
    console.log('\n🎬 Demo video generation complete!');
  }

  /**
   * Estimate duration category
   */
  estimateDuration(durationType) {
    const durations = {
      'short': '2-3 minutes',
      'medium': '5-7 minutes',
      'long': '8-12 minutes'
    };
    return durations[durationType] || 'unknown';
  }

  /**
   * List available demo scenarios
   */
  listDemoScenarios() {
    console.log('📋 Available Demo Scenarios');
    console.log('===========================\n');

    Object.entries(DEMO_SCENARIOS).forEach(([category, config]) => {
      console.log(`📹 ${config.title}`);
      console.log(`   Category: ${category}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   Duration: ${config.duration}`);
      console.log(`   Project: ${config.project}`);
      console.log(`   Priority: ${config.priority}`);
      console.log(`   Tests: ${config.tests.join(', ')}`);
      console.log('');
    });

    console.log('🎬 Usage Examples:');
    console.log('  npm run demo:generate           # Generate all demos');
    console.log('  npm run demo:architecture        # Architecture workflows only');
    console.log('  npm run demo:collaboration       # Collaboration demos only');
    console.log('  npm run demo:mobile             # Mobile interaction demos');
    console.log('  npm run demo:4k                 # Generate in 4K quality');
  }
}

/**
 * Main execution logic
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  const generator = new DemoVideoGenerator();

  switch (command) {
    case 'all':
      await generator.generateAllDemos();
      break;

    case 'category':
      const category = args[1];
      if (!category) {
        console.error('❌ Please specify a category');
        console.log('Available categories:', Object.keys(DEMO_SCENARIOS).join(', '));
        process.exit(1);
      }
      await generator.generateCategoryDemos(category);
      break;

    case 'list':
      generator.listDemoScenarios();
      break;

    case 'help':
    default:
      console.log('🎬 Demo Video Generator');
      console.log('=======================\n');
      console.log('Commands:');
      console.log('  all               Generate all demo videos');
      console.log('  category <name>   Generate demos for specific category');
      console.log('  list             List available demo scenarios');
      console.log('  help             Show this help message');
      console.log('\nExample:');
      console.log('  node scripts/generate-demo-videos.js all');
      console.log('  node scripts/generate-demo-videos.js category architecture-workflows');
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Demo generation failed:', error);
    process.exit(1);
  });
}

module.exports = { DemoVideoGenerator, DEMO_SCENARIOS, DEMO_CONFIG };
