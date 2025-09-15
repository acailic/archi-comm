import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

// Safe environment variable access
const host = (typeof process !== 'undefined' && process.env) ? process.env.TAURI_DEV_HOST : undefined;
const isTauriDebug = (typeof process !== 'undefined' && process.env) ? !!process.env.TAURI_DEBUG : false;
const tauriPlatform = (typeof process !== 'undefined' && process.env) ? process.env.TAURI_PLATFORM : undefined;

export default defineConfig({
  plugins: [
    react({
      // Optimize React refresh for development
      // fastRefresh is deprecated in recent versions
      // Reduce bundle size by excluding development helpers in production
      devTarget: 'esnext',
      // Enable SWC optimizations (use default React JSX runtime)
      // Note: Removing Emotion jsxImportSource avoids requiring '@emotion/react'
    })
  ],

  // Simplified test configuration
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup-test.ts'],
    css: true,
    exclude: ['**/e2e/**', '**/node_modules/**', '**/dist/**', '**/src-tauri/**'],
    // Reduced coverage thresholds for faster testing
    coverage: {
      reporter: ['text', 'lcov', 'json', 'html', 'text-summary'],
      reportsDirectory: './coverage',
      exclude: ['src-tauri/**', 'dist/**', 'e2e/**', '**/*.d.ts', '**/test/**'],
      lines: 70,
      functions: 60,
      branches: 55,
      statements: 70,
      clean: true,
      all: true
    },
    // Faster test execution
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },

  // Root directory and index.html location
  root: '.',
  publicDir: 'public',

  // Simplified development configuration
  clearScreen: false,

  server: {
    port: 5173,
    strictPort: false, // Allow fallback ports for flexibility
    host: host || false,
    open: false, // Don't auto-open browser
    hmr: {
      protocol: 'ws',
      host: host || 'localhost',
      port: 5174,
      overlay: true
    },
    watch: {
      // Streamlined ignore patterns
      ignored: [
        '**/.git/**',
        '**/node_modules/**',
        '**/dist/**',
        '**/target/**',
        '**/.DS_Store'
      ],
      // Optimize file watching
      usePolling: false
    }
  },

  // Environment variable configuration
  envPrefix: ['VITE_', 'TAURI_'],

  // Web Worker configuration
  worker: {
    format: 'es',
    // In Vite 6, worker.plugins must be a function returning an array
    plugins: () => [
      react({
        devTarget: 'esnext'
      })
    ]
  },

  build: {
    // Optimized build configuration
    target: tauriPlatform === 'windows' ? 'chrome105' : 'safari13',
    minify: isTauriDebug ? false : 'esbuild',
    sourcemap: isTauriDebug,
    cssCodeSplit: true,
    // treeshake: true, // deprecated in newer Vite versions
    // Optimize chunk splitting
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: 'index.html',
      output: {
        // Fine-grained chunk strategy for better caching and smaller app chunks
        manualChunks(id) {
          if (!id) return undefined;
          // Core vendors
          if (id.includes('/node_modules/react/')) return 'react-vendor';
          if (id.includes('/node_modules/react-dom/')) return 'react-vendor';
          if (id.includes('/node_modules/@radix-ui/')) return 'ui-vendor';
          if (id.includes('/node_modules/framer-motion')) return 'animation-vendor';
          if (id.includes('/node_modules/@tauri-apps/')) return 'tauri-vendor';

          // Canvas and graph libs
          if (
            id.includes('/node_modules/@xyflow/react') ||
            id.includes('/node_modules/perfect-arrows') ||
            id.includes('/node_modules/elkjs') ||
            id.includes('/node_modules/rbush') ||
            id.includes('/node_modules/html-to-image')
          ) {
            return 'canvas-vendor';
          }

          // Charts and visuals
          if (id.includes('/node_modules/recharts')) return 'charts-vendor';

          // Audio / ML heavy deps
          if (
            id.includes('/node_modules/recordrtc') ||
            id.includes('/node_modules/web-audio-api') ||
            id.includes('/node_modules/microphone-stream') ||
            id.includes('/node_modules/audiobuffer-to-wav') ||
            id.includes('/node_modules/lamejs')
          ) {
            return 'audio-vendor';
          }
          if (
            id.includes('/node_modules/@xenova/transformers') ||
            id.includes('/node_modules/@huggingface/transformers')
          ) {
            return 'ml-vendor';
          }

          // Group challenge and template data into a separate chunk
          if (id.includes('/src/lib/challenge-config.ts') || id.includes('/src/lib/task-system/')) {
            return 'challenges';
          }

          return undefined;
        },
        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return 'assets/fonts/[name].[hash][extname]';
          }
          return `assets/${ext}/[name].[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js'
      },
      // Optimize external dependencies
      external: () => {
        // Keep critical dependencies bundled for reliability
        return false;
      }
    },
    // Improve build performance
    reportCompressedSize: false,
    // Optimize for modern browsers
    modulePreload: {
      polyfill: false
    }
  },
  esbuild: {
    // Conditional optimization based on debug mode
    drop: isTauriDebug ? [] : ['console', 'debugger'],
    // Optimize for development speed
    keepNames: isTauriDebug,
    minifyIdentifiers: !isTauriDebug,
    minifySyntax: !isTauriDebug
  },

  resolve: {
    // Streamlined file extensions
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: {
      // Essential path aliases only
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@services': path.resolve(__dirname, './src/services'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
    // Optimize dependency resolution
    dedupe: ['react', 'react-dom'],
  },

  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dnd',
      'react-dnd-html5-backend',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tooltip'
    ],
    exclude: [
      '@tauri-apps/api' // Let Tauri handle its own loading
    ],
    // Force pre-bundling
    force: false
  }
});

// Additional environment-specific configuration
if (isTauriDebug) {
  console.log('🔧 Vite running in Tauri debug mode');
  console.log(`📡 Host: ${host || 'localhost'}`);
  console.log(`🎯 Platform: ${tauriPlatform || 'unknown'}`);
}
