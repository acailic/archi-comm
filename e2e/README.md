# E2E Testing Documentation

# Comprehensive guide for ArchiComm's end-to-end testing infrastructure

# Provides workflows, best practices, and testing strategies for maintainable QA

# RELEVANT FILES: playwright.config.ts, e2e/\*.spec.ts, .github/workflows/e2e-tests.yml

## Overview

ArchiComm's E2E testing infrastructure provides comprehensive coverage for our Tauri-based desktop application. This testing suite ensures quality across browser environments, desktop platforms, and various user workflows.

## Quick Start

### Running Tests Locally

```bash
# Install dependencies
npm ci
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific test suite
npx playwright test visual-regression.spec.ts
npx playwright test responsive-design.spec.ts
npx playwright test tauri-integration.spec.ts

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run tests with specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Test Categories

Our E2E testing is organized into distinct categories:

1. **Happy Flow Testing** - Core user journeys and primary features
2. **Canvas Functionality** - React Flow interactions and visual components
3. **Annotation Editing** - Text annotation creation and modification
4. **Visual Regression** - UI consistency across changes and browsers
5. **Responsive Design** - Multi-viewport and device compatibility
6. **Tauri Integration** - Desktop-specific features and native APIs
7. **Workflow Integration** - End-to-end user journey completion
8. **Performance Testing** - Load handling and resource management
9. **Stress Testing** - High-load scenarios and edge cases
10. **Accessibility Testing** - WCAG compliance and screen reader support

## Test Structure

### Directory Organization

```
e2e/
├── *.spec.ts              # Test specification files
├── utils/
│   ├── test-helpers.ts    # Reusable helper functions
│   └── test-data-manager.ts # Test fixture management
├── test-results/          # Generated test artifacts
└── screenshots/           # Visual regression baselines
```

### Helper Classes

We provide comprehensive helper classes for common operations:

#### CanvasHelpers

```typescript
const helpers = createHelpers(page);

// Navigate to canvas and start testing
await helpers.canvas.navigateToCanvas();

// Add components to canvas
await helpers.canvas.addComponent('server', { x: 100, y: 100 });
await helpers.canvas.addComponent('database', { x: 200, y: 200 });

// Add annotations
await helpers.canvas.addAnnotation('API Gateway', { x: 150, y: 50 });

// Canvas operations
await helpers.canvas.clearCanvas();
await helpers.canvas.zoomIn(2);
await helpers.canvas.panCanvas(50, 50);
```

#### WorkflowHelpers

```typescript
// Complete full user workflow
await helpers.workflow.completeFullWorkflow('simple-web-app');

// Navigate to specific workflow stages
await helpers.workflow.navigateToRecording();
await helpers.workflow.navigateToReview();
```

#### AssertionHelpers

```typescript
// Verify component presence
await helpers.assert.assertComponentExists('Server');
await helpers.assert.assertComponentCount(3);

// Performance assertions
await helpers.assert.assertPerformanceMetric('memory', 50000000);
await helpers.assert.assertPageResponsive();
```

### Test Data Management

Use predefined fixtures for consistent testing:

```typescript
import { testDataManager } from './utils/test-data-manager';

// Apply predefined design fixtures
const design = testDataManager.getFixture('simple-web-app');
await testDataManager.applyDesignToCanvas(page, design);

// Save and restore canvas state
const state = await testDataManager.saveCanvasState(page);
await testDataManager.restoreCanvasState(page, state);
```

## Best Practices

### 1. Test Isolation

Each test should be independent and able to run in any order:

```typescript
test.beforeEach(async ({ page }) => {
  // Clean state for each test
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});
```

### 2. Reliable Selectors

Use data-testid attributes for stable element selection:

```typescript
// Good - stable selector
const canvas = page.locator('[data-testid="canvas"]');

// Avoid - fragile selectors
const canvas = page.locator('.react-flow__renderer');
```

### 3. Wait Strategies

Use appropriate waiting strategies for dynamic content:

```typescript
// Wait for element visibility
await expect(component).toBeVisible();

// Wait for network idle
await page.waitForLoadState('networkidle');

// Wait for specific conditions
await page.waitForFunction(() => document.querySelectorAll('.react-flow__node').length > 0);
```

### 4. Error Handling

Implement robust error handling and debugging:

```typescript
test('canvas operations', async ({ page }) => {
  const helpers = createHelpers(page);

  try {
    await helpers.canvas.navigateToCanvas();
    await helpers.canvas.addComponent('server');
  } catch (error) {
    // Take debug screenshot on failure
    await helpers.debug.takeDebugScreenshot('canvas-error');
    throw error;
  }
});
```

### 5. Performance Testing

Monitor performance during test execution:

```typescript
// Inject performance monitoring
await helpers.mock.injectPerformanceMonitor();

// Perform operations
await helpers.canvas.addComponent('server');

// Analyze performance
const log = await helpers.mock.getPerformanceLog();
expect(log.some(entry => entry.duration > 100)).toBe(false);
```

## Visual Regression Testing

### Screenshot Management

Visual regression tests capture and compare screenshots:

```typescript
test('component visual consistency', async ({ page }) => {
  await helpers.canvas.navigateToCanvas();
  await helpers.canvas.addComponent('server');

  // Capture screenshot for comparison
  await expect(page.locator('[data-testid="canvas"]')).toHaveScreenshot('server-component.png');
});
```

### Baseline Updates

Update visual baselines when UI changes are intentional:

```bash
# Update all screenshots
npx playwright test --update-snapshots

# Update specific test screenshots
npx playwright test visual-regression.spec.ts --update-snapshots
```

## Platform-Specific Testing

### Tauri Desktop Testing

Test desktop-specific features:

```typescript
test('file system operations', async ({ page }) => {
  // Mock Tauri APIs for web testing
  await helpers.mock.mockTauriAPI();

  // Test file save functionality
  const exportButton = page.getByRole('button', { name: /export/i });
  await exportButton.click();

  // Verify native dialog interaction
  // Note: Actual file dialogs are mocked in test environment
});
```

### Cross-Platform Compatibility

Our CI/CD pipeline tests across multiple platforms:

- **Windows** - Windows-specific behaviors and file paths
- **macOS** - Apple silicon compatibility and native integrations
- **Linux** - GTK and Webkit rendering consistency

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:

- **Push to main/develop** - Full test suite execution
- **Pull requests** - Comprehensive validation before merge
- **Scheduled runs** - Daily regression testing at 2 AM UTC

### Test Parallelization

Tests run in parallel across multiple dimensions:

```yaml
strategy:
  matrix:
    browser: [chromium, firefox, webkit]
    test-suite: [happy-flow, canvas-functionality, performance]
```

### Artifact Management

Test artifacts are automatically collected:

- **Test Results** - Detailed execution logs and reports
- **Screenshots** - Visual regression artifacts and failure captures
- **Performance Data** - Benchmark results and metrics
- **Coverage Reports** - Test coverage analysis

## Debugging Failed Tests

### Local Debugging

```bash
# Run specific failing test with debugging
npx playwright test failing-test.spec.ts --debug

# Run with trace recording
npx playwright test --trace on

# Generate HTML report
npx playwright show-report
```

### CI Debugging

When tests fail in CI:

1. **Download Artifacts** - Check uploaded screenshots and logs
2. **Review Console Output** - Examine detailed test execution logs
3. **Compare Screenshots** - Visual diff analysis for regression failures
4. **Performance Analysis** - Check if performance degradation caused failures

## Test Maintenance

### Regular Maintenance Tasks

1. **Update Dependencies** - Keep Playwright and testing tools current
2. **Review Baselines** - Update visual regression baselines for intentional UI changes
3. **Performance Benchmarks** - Adjust performance thresholds as application evolves
4. **Test Data Refresh** - Update fixtures and test scenarios

### Scaling Tests

As the application grows:

1. **Page Object Models** - Extract complex interactions into reusable page objects
2. **Custom Fixtures** - Create specialized test fixtures for complex scenarios
3. **Test Sharding** - Distribute tests across multiple CI runners
4. **Selective Testing** - Run relevant tests based on changed files

## Troubleshooting

### Common Issues

**Tests timing out:**

- Increase timeout values in playwright.config.ts
- Check for network delays or slow operations
- Ensure proper wait conditions

**Flaky visual tests:**

- Disable animations during testing
- Use consistent viewport sizes
- Wait for font loading completion

**Desktop integration failures:**

- Verify Tauri build configuration
- Check native dependency availability
- Validate platform-specific paths

**Performance test instability:**

- Run tests on consistent hardware
- Account for CI environment variations
- Use relative performance measurements

### Getting Help

1. **Check Test Logs** - Detailed execution information in test results
2. **Review Screenshots** - Visual debugging through captured images
3. **Examine Network Activity** - Request/response analysis for API issues
4. **Performance Profiling** - Memory and timing analysis for slow tests

This documentation provides the foundation for maintaining and extending ArchiComm's E2E testing infrastructure. Regular updates ensure our testing strategy evolves with the application.
