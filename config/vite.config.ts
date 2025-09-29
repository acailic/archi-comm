import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig, splitVendorChunkPlugin } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.resolve(ROOT_DIR, 'src');
const PUBLIC_DIR = path.resolve(ROOT_DIR, 'public');
const INDEX_HTML = path.resolve(ROOT_DIR, 'index.html');
const TEST_SETUP = path.resolve(SRC_DIR, 'test/setup-test.ts');
const COVERAGE_DIR = path.resolve(ROOT_DIR, 'coverage');
const PACKAGES_DIR = path.resolve(SRC_DIR, 'packages');
const ANALYZER_REPORT = path.resolve(ROOT_DIR, 'dist', 'bundle-analysis.html');

const env = typeof process !== 'undefined' && process.env ? process.env : undefined;
const host = env?.TAURI_DEV_HOST;
const isTauriDebug = !!env?.TAURI_DEBUG;
const tauriPlatform = env?.TAURI_PLATFORM;
const shouldAnalyze = env?.ANALYZE_BUNDLE === 'true';

export default defineConfig(({ command, mode }) => {
  const isServe = command === 'serve';
  const isBuild = command === 'build';
  const isDevelopment = isServe || mode === 'development';
  const isProductionBuild = isBuild && mode === 'production';
  const sourcemap = isTauriDebug || isDevelopment;
  const shouldRunAnalyzer = isBuild && shouldAnalyze;

  const plugins = [
    react({
      devTarget: 'esnext',
    }),
    splitVendorChunkPlugin(),
    ...(shouldRunAnalyzer
      ? [
          visualizer({
            filename: ANALYZER_REPORT,
            template: 'treemap',
            brotliSize: true,
            gzipSize: true,
            open: false,
          }),
        ]
      : []),
  ];

  if (isTauriDebug && isServe) {
    console.log('🔧 Vite running in Tauri debug mode');
    console.log(`📡 Host: ${host || 'localhost'}`);
    console.log(`🎯 Platform: ${tauriPlatform || 'unknown'}`);
  }

  return {
    plugins,

    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: [TEST_SETUP],
      css: true,
      exclude: ['**/e2e/**', '**/node_modules/**', '**/dist/**', '**/src-tauri/**'],
      coverage: {
        reporter: ['text', 'lcov', 'json', 'html', 'text-summary'],
        reportsDirectory: COVERAGE_DIR,
        exclude: ['src-tauri/**', 'dist/**', 'e2e/**', '**/*.d.ts', '**/test/**'],
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
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

    root: ROOT_DIR,
    publicDir: PUBLIC_DIR,
    clearScreen: false,

    server: {
      port: 5173,
      strictPort: false,
      host: host || false,
      open: false,
      hmr: {
        protocol: 'ws',
        host: host || 'localhost',
        port: 5174,
        overlay: true,
      },
      watch: {
        ignored: [
          '**/.git/**',
          '**/node_modules/**',
          '**/dist/**',
          '**/target/**',
          '**/.DS_Store',
        ],
        usePolling: false,
      },
    },

    envPrefix: ['VITE_', 'TAURI_'],


    build: {
      target: tauriPlatform === 'windows' ? 'chrome105' : 'safari13',
      minify: isTauriDebug ? false : 'esbuild',
      sourcemap,
      cssCodeSplit: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        input: INDEX_HTML,
        output: {
          manualChunks(id) {
            if (!id) return undefined;

            if (id.includes('/node_modules/react/')) return 'react-vendor';
            if (id.includes('/node_modules/react-dom/')) return 'react-vendor';
            if (id.includes('/node_modules/scheduler/')) return 'react-vendor';
            if (id.includes('/node_modules/@radix-ui/')) return 'ui-vendor';
            if (id.includes('/node_modules/framer-motion')) return 'animation-vendor';
            if (id.includes('/node_modules/@tauri-apps/')) return 'tauri-vendor';

            if (
              id.includes('/node_modules/@xyflow/react') ||
              id.includes('/node_modules/perfect-arrows') ||
              id.includes('/node_modules/elkjs') ||
              id.includes('/node_modules/rbush') ||
              id.includes('/node_modules/html-to-image')
            ) {
              return 'canvas-vendor';
            }

            if (id.includes('/node_modules/recharts')) return 'charts-vendor';


            if (id.includes('/src/lib/config/challenge-config.ts') || id.includes('/src/lib/task-system/')) {
              return 'challenges';
            }

            if (id.includes('/src/packages/ui/')) return 'ui-core';
            if (id.includes('/src/packages/canvas/')) return 'canvas-core';
            if (id.includes('/src/shared/')) return 'shared-core';
            if (id.includes('/src/stores/')) return 'state-core';

            return undefined;
          },
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || [];
            const ext = info[info.length - 1];
            if (/\.(woff|woff2|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
              return 'assets/fonts/[name].[hash][extname]';
            }
            return `assets/${ext}/[name].[hash][extname]`;
          },
          chunkFileNames: 'assets/js/[name].[hash].js',
          entryFileNames: 'assets/js/[name].[hash].js',
        },
        external: () => false,
      },
      reportCompressedSize: false,
      modulePreload: {
        polyfill: false,
      },
    },

    esbuild: {
      drop: isProductionBuild && !isTauriDebug ? ['console', 'debugger'] : [],
      keepNames: isDevelopment || isTauriDebug,
      minifyIdentifiers: isProductionBuild && !isTauriDebug,
      minifySyntax: isProductionBuild && !isTauriDebug,
      pure: isProductionBuild ? ['console.info'] : [],
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      alias: {
        '@': SRC_DIR,
        '@packages': PACKAGES_DIR,
        '@lib': path.resolve(SRC_DIR, 'lib'),
        '@shared': path.resolve(SRC_DIR, 'shared'),
        '@hooks': path.resolve(SRC_DIR, 'shared/hooks'),
        '@stores': path.resolve(SRC_DIR, 'stores'),
        '@core': path.resolve(PACKAGES_DIR, 'core'),
        '@ui': path.resolve(PACKAGES_DIR, 'ui'),
        '@canvas': path.resolve(PACKAGES_DIR, 'canvas'),
        '@audio': path.resolve(PACKAGES_DIR, 'audio'),
        '@services': path.resolve(PACKAGES_DIR, 'services'),
        '@test': path.resolve(SRC_DIR, 'test'),
      },
      dedupe: ['react', 'react-dom'],
    },

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
        '@radix-ui/react-tooltip',
      ],
      exclude: [
        '@tauri-apps/api',
      ],
      force: false,
      esbuildOptions: {
        keepNames: true,
      },
    },

    define: {
      __DEV__: JSON.stringify(isDevelopment),
      __PROD__: JSON.stringify(isProductionBuild),
      __TAURI_DEBUG__: JSON.stringify(isTauriDebug),
    },
  };
});
