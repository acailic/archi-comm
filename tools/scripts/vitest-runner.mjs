#!/usr/bin/env node
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { startVitest } from 'vitest/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const srcDir = path.join(projectRoot, 'src');
const publicDir = path.join(projectRoot, 'public');
const indexHtml = path.join(projectRoot, 'index.html');
const testSetup = path.join(srcDir, 'test/setup-test.ts');
const coverageDir = path.join(os.tmpdir(), 'archicomm-vitest-coverage');
const packagesDir = path.join(srcDir, 'packages');

process.chdir(projectRoot);

const rawCliArgs = process.argv.slice(2);
const passthroughArgs = [];
let watchMode = false;
let coverageEnabled = false;

for (const arg of rawCliArgs) {
  if (arg === '--watch') {
    watchMode = true;
    passthroughArgs.push(arg);
  } else if (arg === '--run' || arg === 'run') {
    watchMode = false;
  } else if (arg === '--coverage' || arg.startsWith('--coverage=')) {
    coverageEnabled = true;
  } else {
    passthroughArgs.push(arg);
  }
}

const inlineConfig = {
  root: projectRoot,
  publicDir,
  clearScreen: false,
  server: {
    watch: {
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/target/**',
        '**/.DS_Store',
      ],
    },
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      '@': srcDir,
      '@packages': packagesDir,
      '@lib': path.join(srcDir, 'lib'),
      '@shared': path.join(srcDir, 'shared'),
      '@hooks': path.join(srcDir, 'shared/hooks'),
      '@stores': path.join(srcDir, 'stores'),
      '@core': path.join(packagesDir, 'core'),
      '@ui': path.join(packagesDir, 'ui'),
      '@canvas': path.join(packagesDir, 'canvas'),
      '@audio': path.join(packagesDir, 'audio'),
      '@services': path.join(packagesDir, 'services'),
      '@test': path.join(srcDir, 'test'),
      'web-worker': path.join(projectRoot, 'node_modules/elkjs/lib/elk-worker.js'),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [testSetup],
    css: true,
    exclude: ['**/e2e/**', '**/node_modules/**', '**/dist/**', '**/src-tauri/**'],
    coverage: {
      enabled: coverageEnabled,
      reporter: ['text', 'lcov', 'json', 'html', 'text-summary', 'json-summary'],
      reportsDirectory: coverageDir,
      exclude: ['src-tauri/**', 'dist/**', 'e2e/**', '**/*.d.ts', '**/test/**'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      checkCoverage: true,
      clean: true,
      all: true,
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: indexHtml,
    },
  },
};

const ctx = await startVitest('test', passthroughArgs, { configFile: false, watch: watchMode }, inlineConfig);

if (!ctx) {
  process.exit(1);
}

const exitCode = await ctx.exit();

if (typeof exitCode === 'number') {
  process.exit(exitCode);
}
