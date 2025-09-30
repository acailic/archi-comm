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

## Common Selectors

**Use these verified selectors in your tests:**

### Challenge Selection
```typescript
// Wait for challenge screen
await page.waitForSelector('h1:has-text("Choose Your Challenge")', { state: 'visible' });

// Get challenge button
const button = page.getByRole('button', { name: /start challenge/i }).first();
```

### Canvas Elements
```typescript
// Canvas container
const canvas = page.locator('.react-flow');

// Canvas pane (interactive surface)
const pane = page.locator('.react-flow__pane');

// Canvas viewport
const viewport = page.locator('.react-flow__viewport');
```

### Component Palette
```typescript
// Palette heading
const palette = page.locator('h3:has-text("Component Library")');

// Specific palette item
const serverItem = page.locator('[data-testid="palette-item-server"]');
const databaseItem = page.locator('[data-testid="palette-item-database"]');
```

### React Flow Nodes and Edges
```typescript
// All nodes
const nodes = page.locator('.react-flow__node');

// Selected node
const selectedNode = page.locator('.react-flow__node.selected');

// All edges
const edges = page.locator('.react-flow__edge');
```

## Best Practices

### 1. Always Wait for Elements

Wait for elements to be visible before interacting:

```typescript
// Good - wait for visibility
await page.waitForSelector('.react-flow', { state: 'visible', timeout: 10000 });

// Bad - arbitrary timeout
await page.waitForTimeout(2000);
```

### 2. Use Role-Based Selectors When Possible

More resilient to UI changes:

```typescript
// Good - semantic selector
const button = page.getByRole('button', { name: /start challenge/i });

// Acceptable - when data-testid exists
const item = page.locator('[data-testid="palette-item-server"]');

// Avoid - fragile class-based selectors
const button = page.locator('.btn-primary');
```

### 3. Proper Error Handling

Don't suppress errors with `.catch(() => false)`:

```typescript
// Good - proper error handling
try {
  await element.click({ timeout: 3000 });
} catch (error) {
  console.log(`Click failed: ${error}`);
  throw error;
}

// Bad - hides real errors
await element.click().catch(() => false);
```

### 4. Multi-Step Drag Operations

Use multiple steps for reliable drag-and-drop:

```typescript
// Good - multi-step drag
await page.mouse.move(startX, startY);
await page.mouse.down();
await page.waitForTimeout(100);
await page.mouse.move(endX, endY, { steps: 20 });
await page.waitForTimeout(100);
await page.mouse.up();

// Bad - simple dragTo (unreliable)
await component.dragTo(canvas);
```

### 5. Verify State Changes

Always verify that actions had the expected effect:

```typescript
// After adding component, verify it exists
await page.waitForSelector('.react-flow__node', { state: 'visible' });
const nodeCount = await page.locator('.react-flow__node').count();
expect(nodeCount).toBeGreaterThan(0);
```

### 6. Take Screenshots at Key Steps

Helpful for debugging failed tests:

```typescript
await page.screenshot({
  path: 'e2e/test-results/artifacts/step-name.png',
  fullPage: true
});
```

### 7. Use Descriptive Console Logs

Track test progress and aid debugging:

```typescript
console.log('✓ Canvas loaded successfully');
console.log(`Found ${nodeCount} nodes on canvas`);
console.log('⚠ Palette not found, skipping test');
```

## Debugging Failed Tests

### Running Tests in Debug Mode

```bash
# Run in headed mode to see browser
npm run e2e:headed

# Run specific test
npm run e2e -- -g "should load the application"

# Run with Playwright Inspector
PWDEBUG=1 npm run e2e

# Run with trace recording
npm run e2e -- --trace on
```

### Viewing Test Artifacts

After test execution, check these locations:

```bash
# Screenshots on failure
e2e/test-results/artifacts/*.png

# HTML report
npx playwright show-report e2e/test-results/html-report

# Debug screenshots (taken manually in tests)
e2e/test-results/debug/*.png

# Test results JSON
e2e/test-results/test-results.json
```

### Common Issues and Solutions

**Element not found:**
- Verify selector exists in the actual DOM
- Check if element is rendered conditionally
- Ensure proper wait strategy is used

**Timeout errors:**
- Increase timeout value
- Wait for specific element state instead of arbitrary timeout
- Check if element is actually rendered

**Drag-drop not working:**
- Use multi-step mouse movements (20+ steps)
- Verify bounding boxes are valid
- Ensure source and target elements are both visible

**Canvas not loading:**
- Wait for `.react-flow` element
- Verify React Flow is initialized
- Check console for JavaScript errors

**Challenge not selecting:**
- Use `page.getByRole('button', { name: /start challenge/i })`
- Button text is "Start Challenge" (case-insensitive)
- Wait for button to be visible and enabled before clicking

## Error Handling Pattern

Implement robust error handling in tests:

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
