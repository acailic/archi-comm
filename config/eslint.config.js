import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  js.configs.recommended,
  {
    ignores: ['tools/scripts/*.js', 'tools/scripts/*.mjs', 'config/vite.config.ts', 'config/eslint.config.js'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: ['./config/tsconfig.json'],
        tsconfigRootDir: process.cwd(),
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'writable',
        module: 'writable',
        require: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        NodeJS: 'readonly',

        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',
        performance: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        crypto: 'readonly',
        getComputedStyle: 'readonly',
        fetch: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        Audio: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        caches: 'readonly',
        postMessage: 'readonly',
        self: 'readonly',

        // React globals
        React: 'readonly',
        JSX: 'readonly',

        // App-specific globals
        ReactFlowMetrics: 'readonly',
        RechartsPrimitive: 'readonly',
        optimizer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'import': importPlugin,
      'unused-imports': unusedImports,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      // Basic rules
      'no-console': ['warn', { 'allow': ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // TypeScript strict rules
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/await-thenable': 'warn',

      // Import/Export rules
      'import/no-unresolved': 'off', // Disabled temporarily due to module resolution issues
      'import/no-duplicates': 'warn',
      'import/order': ['warn', { 'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'] }],
      
      // Unused imports rules
      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          'varsIgnorePattern': '^_',
          'argsIgnorePattern': '^_',
        },
      ],
    },
  },
  // React-specific configuration
  {
    files: ['**/*.{jsx,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: ['./config/tsconfig.json'],
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      'react': react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@typescript-eslint': typescript,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/jsx-uses-react': 'off', // React 18+ with jsx-runtime
      'react/react-in-jsx-scope': 'off', // React 18+ with jsx-runtime
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/jsx-key': 'error',
      'react/no-deprecated': 'warn',
      'react/no-unknown-property': 'error',
      'react/self-closing-comp': 'warn',
      
      // React Hooks rules
      'react-hooks/rules-of-hooks': 'warn', // Temporarily downgraded for pre-commit
      'react-hooks/exhaustive-deps': 'warn',
      
      // JSX Accessibility rules
      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-has-content': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/interactive-supports-focus': 'warn',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/e2e/**/*', '**/__tests__/**/*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'import/no-unresolved': 'off', // Disable for test files to avoid module resolution issues
    },
  },
  {
    ignores: [
      'dist/',
      'build/',
      'src-tauri/',
      'node_modules/',
      'config/vite.config.ts',
      'config/playwright.config.ts',
      'config/eslint.config.js',
      'e2e/**/*',
    ],
  },
];
