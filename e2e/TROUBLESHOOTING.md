# E2E Testing Troubleshooting Guide

# Comprehensive solutions for common testing issues and debugging strategies

# Provides step-by-step resolution for test failures and environment problems

# RELEVANT FILES: e2e/README.md, playwright.config.ts, e2e/utils/test-helpers.ts

## Common Issues and Solutions

### Test Failures

#### Tests Timing Out

**Symptoms:**

- Tests fail with "Test timeout of 30000ms exceeded"
- Hanging on specific operations
- Slow page loading or element interactions

**Solutions:**

1. **Increase timeout values:**

```typescript
// In playwright.config.ts
export default defineConfig({
  timeout: 60 * 1000, // 60 seconds
  expect: {
    timeout: 10 * 1000, // 10 seconds
  },
});

// Or in individual tests
test('slow operation', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes
  // test code
});
```

2. **Improve wait strategies:**

```typescript
// Instead of generic waits
await page.waitForTimeout(5000);

// Use specific conditions
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible();
await page.waitForFunction(() => window.myApp?.initialized);
```

3. **Debug hanging operations:**

```typescript
// Add logging to identify where tests hang
console.log('Starting navigation...');
await page.goto('/');
console.log('Navigation complete');

console.log('Clicking button...');
await button.click();
console.log('Button clicked');
```

#### Flaky Tests

**Symptoms:**

- Tests pass sometimes, fail sometimes
- Different results on different runs
- Race conditions or timing issues

**Solutions:**

1. **Stabilize element interactions:**

```typescript
// Wait for element to be stable
await expect(button).toBeVisible();
await expect(button).toBeEnabled();
await button.click();

// Use retry mechanisms
await test.step('click with retry', async () => {
  for (let i = 0; i < 3; i++) {
    try {
      await button.click();
      break;
    } catch (error) {
      if (i === 2) throw error;
      await page.waitForTimeout(1000);
    }
  }
});
```

2. **Ensure proper test isolation:**

```typescript
test.beforeEach(async ({ page }) => {
  // Clear all storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Reset to clean state
  await page.goto('/');
  await page.waitForLoadState('networkidle');
});
```

3. **Use data-testid for reliable selectors:**

```typescript
// Unreliable - can change with styling
await page.locator('.btn-primary.large').click();

// Reliable - semantic and stable
await page.locator('[data-testid="submit-button"]').click();
```

### Visual Regression Issues

#### Screenshot Differences

**Symptoms:**

- Visual regression tests failing with pixel differences
- Screenshots show unexpected variations
- Cross-browser rendering differences

**Solutions:**

1. **Check for animation interference:**

```typescript
// Disable animations before screenshots
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }
  `,
});
```

2. **Ensure font loading completion:**

```typescript
// Wait for fonts to load
await page.waitForFunction(() => document.fonts.ready);

// Or wait for specific font
await page.waitForFunction(() => document.fonts.check('16px Inter'));
```

3. **Set consistent viewport and scaling:**

```typescript
// In test setup
await page.setViewportSize({ width: 1280, height: 720 });

// Disable device scaling
await page.emulateMedia({ reducedMotion: 'reduce' });
```

4. **Update baseline screenshots:**

```bash
# Update all screenshots
npx playwright test --update-snapshots

# Update specific test
npx playwright test visual-regression.spec.ts --update-snapshots

# Update for specific browser
npx playwright test --update-snapshots --project=chromium
```

### Canvas and React Flow Issues

#### Canvas Not Loading

**Symptoms:**

- Canvas elements not appearing
- React Flow components not rendering
- Blank canvas area

**Solutions:**

1. **Wait for canvas initialization:**

```typescript
// Wait for canvas to be ready
const canvas = page.locator('[data-testid="canvas"]');
await canvas.waitFor({ state: 'visible' });

// Wait for React Flow to initialize
await page.waitForFunction(() => {
  const viewport = document.querySelector('.react-flow__viewport');
  return viewport && viewport.children.length >= 0;
});
```

2. **Check for React Flow dependencies:**

```typescript
// Verify React Flow is loaded
await page.waitForFunction(() => window.ReactFlow !== undefined);

// Check for specific React Flow functionality
await page.waitForFunction(() => {
  const flow = document.querySelector('.react-flow');
  return flow && window.getComputedStyle(flow).display !== 'none';
});
```

3. **Debug canvas state:**

```typescript
// Log canvas state for debugging
const canvasState = await page.evaluate(() => {
  const canvas = document.querySelector('[data-testid="canvas"]');
  return {
    exists: !!canvas,
    visible: canvas ? window.getComputedStyle(canvas).display !== 'none' : false,
    bounds: canvas ? canvas.getBoundingClientRect() : null,
    children: canvas ? canvas.children.length : 0,
  };
});
console.log('Canvas state:', canvasState);
```

#### Drag and Drop Failures

**Symptoms:**

- Components not dragging to canvas
- Drop operations not working
- Elements ending up in wrong positions

**Solutions:**

1. **Use proper drag and drop methods:**

```typescript
// Basic drag and drop
const source = page.locator('[data-testid="palette-item-server"]');
const target = page.locator('[data-testid="canvas"]');
await source.dragTo(target);

// Drag to specific position
await source.dragTo(target, { targetPosition: { x: 100, y: 100 } });

// Multi-step drag operation
await source.hover();
await page.mouse.down();
await target.hover({ position: { x: 100, y: 100 } });
await page.mouse.up();
```

2. **Wait for drag completion:**

```typescript
// Wait for DOM changes after drag
await source.dragTo(target);
await page.waitForTimeout(300); // Allow for rendering
await expect(page.locator('.react-flow__node')).toHaveCount(1);
```

3. **Debug drag positions:**

```typescript
// Log element positions
const sourceBox = await source.boundingBox();
const targetBox = await target.boundingBox();
console.log('Source position:', sourceBox);
console.log('Target position:', targetBox);
```

### Tauri Integration Issues

#### Native API Mocking

**Symptoms:**

- Tauri API calls failing in tests
- File system operations not working
- Native dialogs causing test failures

**Solutions:**

1. **Mock Tauri APIs properly:**

```typescript
// Complete Tauri API mock
await page.addInitScript(() => {
  window.__TAURI__ = {
    fs: {
      writeTextFile: async () => Promise.resolve(),
      readTextFile: async () => Promise.resolve('{"test": "data"}'),
      removeFile: async () => Promise.resolve(),
    },
    dialog: {
      save: async () => Promise.resolve('/mock/path/file.json'),
      open: async () => Promise.resolve(['/mock/path/file.json']),
    },
    shell: {
      open: async () => Promise.resolve(),
    },
    window: {
      appWindow: {
        setTitle: async () => Promise.resolve(),
        minimize: async () => Promise.resolve(),
        maximize: async () => Promise.resolve(),
        close: async () => Promise.resolve(),
      },
    },
  };
});
```

2. **Test Tauri build integration:**

```bash
# Build Tauri app for testing
npm run build:debug

# Run with Tauri environment
TAURI_ENV=test npx playwright test tauri-integration.spec.ts
```

3. **Handle file dialogs:**

```typescript
// Listen for file chooser events
page.on('filechooser', async fileChooser => {
  await fileChooser.setFiles('/path/to/test/file.json');
});

// Trigger file selection
await page.getByRole('button', { name: 'Import' }).click();
```

### Performance Testing Issues

#### Memory Leaks

**Symptoms:**

- Memory usage continuously increasing
- Browser becoming unresponsive
- Performance tests failing

**Solutions:**

1. **Monitor memory usage:**

```typescript
// Track memory before and after operations
const memoryBefore = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize);

// Perform operations
await heavyOperation();

const memoryAfter = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize);

const memoryIncrease = memoryAfter - memoryBefore;
expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
```

2. **Clean up resources:**

```typescript
test.afterEach(async ({ page }) => {
  // Clear heavy objects
  await page.evaluate(() => {
    // Clear any global caches or large objects
    if (window.myApp?.cache) {
      window.myApp.cache.clear();
    }
  });
});
```

3. **Use memory pressure simulation:**

```typescript
// Simulate memory pressure
await page.addInitScript(() => {
  window.memoryBallast = [];
  for (let i = 0; i < 100; i++) {
    window.memoryBallast.push(new Array(1000).fill('test'));
  }
});
```

### CI/CD Issues

#### Tests Failing in CI

**Symptoms:**

- Tests pass locally but fail in CI
- Different behavior in GitHub Actions
- Environment-specific failures

**Solutions:**

1. **Match CI environment locally:**

```bash
# Use exact Node version from CI
nvm use 18

# Install exact dependencies
npm ci

# Run with CI environment variables
CI=true npm run test:e2e
```

2. **Debug CI-specific issues:**

```typescript
// Add CI-specific debugging
if (process.env.CI) {
  console.log('Running in CI environment');
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    CI: process.env.CI,
    GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
  });
}
```

3. **Handle CI timing differences:**

```typescript
// Increase timeouts for CI
const timeout = process.env.CI ? 60000 : 30000;
test.setTimeout(timeout);

// Add CI-specific waits
if (process.env.CI) {
  await page.waitForTimeout(1000); // Extra stability in CI
}
```

#### Artifact Collection Issues

**Symptoms:**

- Screenshots not being uploaded
- Test results missing in artifacts
- Reports not generating

**Solutions:**

1. **Verify artifact paths:**

```yaml
# In GitHub Actions workflow
- name: Upload test results
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: test-results
    path: |
      e2e/test-results/
      playwright-report/
```

2. **Ensure report generation:**

```typescript
// Configure reporter in playwright.config.ts
export default defineConfig({
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
  ],
});
```

3. **Debug artifact creation:**

```bash
# Check if artifacts exist before upload
ls -la e2e/test-results/
ls -la playwright-report/
```

## Debugging Tools and Techniques

### Playwright Debug Mode

```bash
# Run tests in debug mode
npx playwright test --debug

# Debug specific test
npx playwright test failing-test.spec.ts --debug

# Debug with headed browser
npx playwright test --headed --debug
```

### Trace Recording

```bash
# Record traces
npx playwright test --trace on

# View traces
npx playwright show-trace trace.zip
```

### Console Logging

```typescript
// Enable console logging in tests
test.beforeEach(async ({ page }) => {
  page.on('console', msg => {
    console.log(`[PAGE LOG] ${msg.text()}`);
  });
});
```

### Network Monitoring

```typescript
// Monitor network requests
page.on('request', request => {
  console.log(`→ ${request.method()} ${request.url()}`);
});

page.on('response', response => {
  console.log(`← ${response.status()} ${response.url()}`);
});
```

### Element State Inspection

```typescript
// Debug element state
const elementState = await element.evaluate(el => ({
  visible: el.offsetParent !== null,
  bounds: el.getBoundingClientRect(),
  classes: el.className,
  attributes: [...el.attributes].map(a => [a.name, a.value]),
}));
console.log('Element state:', elementState);
```

## Getting Help

### Internal Resources

1. **Test Documentation** - Check e2e/README.md for guidance
2. **Test Helpers** - Review available helpers in test-helpers.ts
3. **Example Tests** - Look at working tests for patterns

### External Resources

1. **Playwright Documentation** - https://playwright.dev/docs
2. **React Flow Testing** - Community examples and patterns
3. **Tauri Testing** - Official testing documentation

### Escalation Process

1. **Check existing issues** - Review known problems in documentation
2. **Reproduce locally** - Isolate the issue from CI environment
3. **Create minimal reproduction** - Simplify to essential failing case
4. **Document findings** - Record symptoms, solutions, and prevention measures

This troubleshooting guide covers the most common issues encountered in ArchiComm's E2E testing. Regular updates ensure it stays current with new challenges and solutions.
