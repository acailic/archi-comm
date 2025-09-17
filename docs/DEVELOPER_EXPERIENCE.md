# Developer Experience Guide

Welcome to the ArchiComm developer experience documentation! This guide covers everything you need to know about the enhanced development environment, tools, and workflows.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [VSCode Integration](#vscode-integration)
- [Performance Monitoring](#performance-monitoring)
- [Community Features](#community-features)
- [Development Workflows](#development-workflows)
- [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Automated Setup

The `dev-setup.js` script automates your initial setup:

```bash
node scripts/dev-setup.js
```

This script:
1. Verifies system requirements (Node.js ≥18.0.0, npm ≥9.0.0)
2. Checks/installs Rust toolchain for Tauri
3. Installs project dependencies
4. Configures Git hooks
5. Sets up IDE integration
6. Establishes performance baselines
7. Runs verification checks

### Manual Setup

If you prefer manual setup:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Git hooks:
   ```bash
   npm run prepare
   ```

3. Install recommended VSCode extensions
4. Run verification:
   ```bash
   npm run verify
   ```

## VSCode Integration

### Workspace Configuration

The `.vscode` directory contains optimized workspace settings:

- `settings.json`: Editor configuration, TypeScript settings, formatting rules
- `extensions.json`: Recommended extensions for development
- `launch.json`: Debugging configurations
- `tasks.json`: Common development tasks

### Recommended Extensions

Essential extensions are automatically suggested when you open the project:

- ESLint + Prettier for code quality
- Tauri + Rust tools for desktop development
- React and TypeScript support
- Testing and debugging tools

### Debugging

Multiple debugging configurations are available:

1. Web Development:
   - `Vite Development`: Debug the web app
   - `Chrome Debugging`: Browser debugging

2. Tauri Development:
   - `Tauri Development`: Full-stack debugging
   - `Rust Backend`: Debug Tauri core

3. Testing:
   - `Vitest: Current File`: Debug current test
   - `Playwright Tests`: Debug E2E tests

## Performance Monitoring

### Development Tools

The `DeveloperDiagnosticsPage` (`src/components/DeveloperDiagnosticsPage.tsx`) provides:

- Real-time performance metrics
- Memory usage monitoring
- Canvas rendering statistics
- Worker thread status

### Automated Benchmarking

Performance benchmarks run automatically on PRs:

1. Canvas rendering performance
2. Memory usage patterns
3. Application startup time
4. Core functionality metrics

### Performance Analysis

The `CanvasPerformanceManager` provides:

- Frame rate monitoring
- Memory leak detection
- Performance optimization suggestions
- Benchmark comparison data

## Community Features

### GitHub Discussions

Two discussion templates are available:

1. **Ideas**
   - Feature suggestions
   - Improvement proposals
   - Technical discussions

2. **Show and Tell**
   - Project showcases
   - Custom implementations
   - Creative use cases

### Contributor Recognition

The project automatically:

- Welcomes first-time contributors
- Recognizes significant contributions
- Highlights community achievements
- Updates contributor lists

## Development Workflows

### Common Tasks

VSCode tasks are configured for:

- Development server: `Start Vite Dev`
- Tauri development: `Start Tauri Dev`
- Testing: `Run Tests`
- Building: `Build for Production`

### Code Quality

Automated checks ensure quality:

1. Type checking: `npm run type-check`
2. Linting: `npm run lint`
3. Formatting: `npm run format:check`
4. Testing: `npm run test:coverage`

### Git Workflow

1. Create a feature branch
2. Make changes
3. Run verification: `npm run verify`
4. Submit PR
5. Address automated checks
6. Get review and merge

## Troubleshooting

### Common Issues

1. **VSCode Extensions**
   - Problem: Missing functionality
   - Solution: Install recommended extensions

2. **Build Failures**
   - Problem: Tauri build errors
   - Solution: Check Rust toolchain

3. **Performance Issues**
   - Problem: Slow development server
   - Solution: Use DeveloperDiagnosticsPage

### Getting Help

1. Check documentation:
   - `docs/ARCHITECTURE.md`
   - `docs/API_REFERENCE.md`

2. Join discussions:
   - GitHub Discussions
   - Community channels

3. Open issues:
   - Use issue templates
   - Provide reproduction steps
