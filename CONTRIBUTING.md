# Contributing to ArchiComm

Thank you for your interest in contributing to ArchiComm! This guide helps you get set up, verify your environment, and land high‑quality PRs quickly.

## Quick Start Checklist

Follow these steps to verify your setup and run the app locally:

1. System requirements

- Node.js >= 18.0.0 (use `.nvmrc` file: `nvm use`)
- npm >= 9.0.0 (see `package.json` engines)
- Rust toolchain (for Tauri desktop builds)

2. Clone and install

```bash
git clone https://github.com/acailic/archi-comm.git
cd archi-comm
nvm use  # Use Node version from .nvmrc
npm install
```

3. Sanity checks

```bash
npm run type-check
npm run lint
npm run format:check
npm test
```

4. Run locally

- Web preview: `npm run dev`
- Desktop shell: `npm run tauri:dev`

5. Optional checks

- Coverage report: `npm run test:coverage`
- E2E tests: `npm run e2e` (or `npm run e2e:ci` in CI)
- Security audit (CI workflow): `.github/workflows/security.yml`

## Development Environment Setup

ArchiComm includes configuration files to ensure consistent development experience:

- **`.nvmrc`** — Node.js version (use `nvm use` to switch)
- **`.editorconfig`** — Editor settings (indentation, line endings, charset)
- **`.npmrc`** — npm configuration (exact versions, strict mode)
- **VS Code** — Recommended extensions in `.vscode/extensions.json`

When you open the project in VS Code, you'll be prompted to install recommended extensions.

## Commit Message Guidelines

All commits must follow conventional commit format:

```
type(scope): subject

body (optional)

footer (optional)
```

**Allowed types:**

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `style` — Formatting changes (no code logic change)
- `refactor` — Code refactoring
- `perf` — Performance improvements
- `test` — Test changes
- `build` — Build system changes
- `ci` — CI configuration changes
- `chore` — Other changes
- `revert` — Revert a commit

**Examples:**

```bash
feat(canvas): Add node auto-layout algorithm
fix(audio): Resolve recording buffer overflow
docs: Update installation instructions in README
refactor(core): Simplify state management logic
```

**Validation:**

- Commit messages are validated automatically via `commitlint` on commit
- Max header length: 100 characters
- Subject must be sentence case

## Development Workflow

- Branch naming: `feature/…`, `fix/…`, `docs/…`, `chore/…`
- Keep changes focused and small; update docs where helpful
- Write/adjust tests close to changed code (Vitest or Playwright)
- Desktop-specific changes should continue to run in web preview where feasible (use `services/web-fallback`)
- Follow conventional commit format (enforced by commitlint)

## Code Quality Checklist (PRs)

- Types: no `any` unless justified; prefer discriminated unions for actions
- ESLint/Prettier: clean `npm run lint` and `npm run format:check`
- Types compile: `npm run type-check`
- Tests pass locally: `npm test` (and E2E if UI flows changed)
- Coverage: add/extend tests for new core utilities, hooks, and services
- Accessibility: basic keyboard navigation and ARIA where applicable
- Scenarios: documentation completeness and validated interactive controls

## Testing Guidelines

- Unit/Integration (Vitest)
  - Place tests under `src/__tests__` or alongside modules
  - Use `@testing-library/react` for components; avoid implementation coupling
  - Generate coverage: `npm run test:coverage`

- End-to-End (Playwright)
  - Scenarios under `e2e/` with clear user flows
  - Prefer deterministic selectors; avoid brittle timing
  - CI config: `.github/workflows/e2e.yml`

## Scenario Development Guidelines

Use the built-in scenario system to document and validate components interactively.

### Creating Effective Scenarios

- Follow naming: IDs kebab-case; clear human-readable names
- Cover core states: empty, loading, success, error, disabled
- Include responsive and theme variants where applicable
- Add accessibility-focused scenarios (labels, errors, keyboard order)

### Interactive Controls Guidelines

- Choose control types that reflect prop semantics (select/boolean/range)
- Provide sensible `defaultValue` and constraints (min/max/step)
- Validate with Zod where possible; surface helpful messages
- Keep control changes performant; debounce expensive work

### Scenario Documentation Standards

- Add `documentation.summary` and at least one `usageExamples` entry
- List `bestPractices` for UX, performance, and accessibility
- Provide ARIA guidance and keyboard behavior where needed
- Link `relatedScenarios` for quick discovery

### Code Example Guidelines

- Use TypeScript/TSX and keep examples runnable
- Include both basic and advanced patterns when relevant
- Demonstrate error handling and edge cases
- Prefer minimal but realistic examples

### Scenario Quality Checklist

- [ ] Comprehensive state coverage implemented
- [ ] Controls configured with validation and defaults
- [ ] Documentation complete (summary + example)
- [ ] Accessibility checks (labels, focus, announcements)
- [ ] Performance impact reviewed
- [ ] Responsive and cross-browser basics verified

### Scenario Contribution Workflow

- Branch name: `scenarios/<component>-<feature>`
- Include scenario, docs, and any test updates in the PR
- Validate documentation generation locally if modified
- Request review from UI maintainers

### Tools and Automation

- Use the Scenario Viewer (`/dev/scenarios`) to iterate quickly
- Leverage the Documentation Generator utils under `src/dev/utils`
- Consider adding e2e flows when scenarios change user-visible behavior

### Migration and Maintenance

- Keep scenarios in sync with component API changes
- Migrate older scenarios to include `documentation` blocks
- Remove deprecated scenarios in a dedicated PR with a clear rationale

## Debugging Tips

- Web (Vite): open devtools and check console warnings/errors
- Tauri: `npm run tauri:dev` to view Rust logs and frontend together
- Playwright: run `npm run e2e:headed` and use trace viewer when tests fail
- Performance: open `DeveloperDiagnosticsPage` or `PerformanceDashboard` for live metrics

## Performance Considerations

- Keep props stable; memoize expensive selectors and transforms
- Batch state updates; avoid unnecessary re-renders on canvas
- Use virtualization/culling for large diagrams
- Profile with `CanvasPerformanceManager` and verify improvements

## Project Structure

```
src/
├── components/     # React components (Canvas, Toolbars, Panels, etc.)
├── hooks/          # Custom React hooks
├── lib/            # Utilities, performance, contracts, plugins
├── services/       # Tauri and web fallbacks
├── shared/         # Shared utils and types
└── styles/         # Global styles
```

## Code Quality Tools

ArchiComm uses several tools to maintain code quality:

### Formatting & Linting

- **Prettier** — Code formatting: `npm run format` / `npm run format:check`
- **ESLint** — Linting: `npm run lint` / `npm run lint:fix`
- **TypeScript** — Type checking: `npm run type-check`

### Testing

- **Vitest** — Unit tests: `npm test`
- **Playwright** — E2E tests: `npm run e2e`

### Code Quality Analysis

- **Knip** — Unused code detection: `npm run unused:check`
  - Finds unused files, dependencies, and exports
  - Run before submitting PRs to keep the codebase clean
- **Structure Validation** — Repository structure: `npm run validate:structure`
  - Ensures config files are in `config/` directory
  - Validates documentation structure
  - Runs automatically on pre-commit

### Dependency Management

- **npm-check-updates** — Check outdated dependencies: `npm run deps:check`
- **Dependabot** — Automated dependency updates (GitHub PRs)

For detailed tooling documentation, see `docs/TOOLING.md`.

## CI/CD

Workflows under `.github/workflows/`:

- `ci.yml` — type check, lint, unit/integration tests
- `coverage.yml` — coverage reporting
- `e2e.yml` — end-to-end tests
- `security.yml` — dependency/security checks
- `build-tauri.yml` — desktop packaging

## Documentation

- Architecture overview and canvas internals: `docs/ARCHITECTURE.md`
- Component, hooks, and services reference: `docs/API_REFERENCE.md`
- Development tooling guide: `docs/TOOLING.md`
- Security policy: `docs/SECURITY.md`
- API stability: `docs/API_STABILITY.md`
- Maintainers: `docs/MAINTAINERS.md`
- Study practice materials: `src/docs/SystemDesignPractice.md`

**Testing Documentation:**

- E2E test summary: `docs/testing/E2E_TEST_SUMMARY.md`
- Canvas tests: `docs/testing/CANVAS_TESTS.md`

**Development Documentation:**

- Tauri setup: `docs/development/TAURI_SETUP.md`
- ESLint fixes: `docs/development/ESLINT_FIXES.md`

## Getting Help

- Issues: https://github.com/acailic/archi-comm/issues
- Discussions: https://github.com/acailic/archi-comm/discussions

## License

By contributing to ArchiComm, you agree that your contributions will be licensed under the project license (MIT). See `LICENSE`.
