# Claude Code Configuration

This document contains configuration and commands for Claude Code to understand the project structure and development workflow.

## Project Overview
ArchiComm is a desktop architecture communication platform built with Tauri, React, TypeScript, and Vite.

## Development Commands

### Code Quality
- **Type check**: `npm run type-check`
- **Lint**: `npm run lint`
- **Lint fix**: `npm run lint:fix`
- **Format**: `npm run format`
- **Format check**: `npm run format:check`

### Testing
- **Run tests**: `npm test`
- **Test with coverage**: `npm run test:coverage`
- **E2E tests**: `npm run e2e`

### Development
- **Start development**: `npm run dev` or `npm start`
- **Build web**: `npm run web:build`
- **Build Tauri**: `npm run build`

### Maintenance
- **Clean**: `npm run clean`
- **Clean all**: `npm run clean:all`

## Pre-commit Hooks
The project uses Husky and lint-staged to run quality checks before commits:
- ESLint with auto-fix
- Prettier formatting
- TypeScript type checking

## CI/CD
GitHub Actions workflows:
- **CI**: Runs on push/PR to main - linting, testing, type checking
- **Build Tauri**: Builds desktop apps for release

## Code Quality Tools
- **ESLint**: Configured for TypeScript, React, accessibility
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict mode enabled with additional checks
- **Husky**: Git hooks for quality gates
- **lint-staged**: Pre-commit file processing