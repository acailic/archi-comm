// e2e/canvas-visibility-debug.spec.ts  
// Debug test to investigate why React Flow container exists but is not visible
// Tests CSS visibility, layout issues, and React Flow rendering
// RELEVANT FILES: src/packages/canvas/components/ReactFlowCanvas.tsx, src/packages/ui/components/DesignCanvas/DesignCanvasCore.tsx

import { test, expect } from '@playwright/test';

test.describe('Canvas Visibility Debug', () => {
  
  test('should investigate React Flow visibility issues', async ({ page }) => {
    console.log('🔍 Investigating React Flow visibility issues...');

    // Navigate and get to design canvas
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Skip welcome
    const skipButton = page.locator('button:has-text("Skip All Tutorials")');
    if (await skipButton.isVisible({ timeout: 3000 })) {
      await skipButton.click();
      await page.waitForTimeout(2000);
    }

    // Select challenge
    const challengeButton = page.locator('button:has-text("Start Challenge")').first();
    if (await challengeButton.isVisible({ timeout: 5000 })) {
      await challengeButton.click();
      await page.waitForTimeout(3000);
    }

    // Step 1: Detailed React Flow investigation
    console.log('📍 Step 1: Detailed React Flow investigation...');
    
    const reactFlowInfo = await page.evaluate(() => {
      const reactFlowElements = document.querySelectorAll('.react-flow');
      
      return Array.from(reactFlowElements).map((element, index) => {
        const htmlElement = element as HTMLElement;
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        return {
          index,
          tagName: element.tagName,
          className: element.className,
          id: element.id,
          boundingRect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom
          },
          offsetDimensions: {
            offsetWidth: htmlElement.offsetWidth,
            offsetHeight: htmlElement.offsetHeight,
            offsetTop: htmlElement.offsetTop,
            offsetLeft: htmlElement.offsetLeft
          },
          visibility: {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            overflow: computedStyle.overflow
          },
          parent: {
            tagName: element.parentElement?.tagName,
            className: element.parentElement?.className,
            id: element.parentElement?.id
          },
          children: Array.from(element.children).map(child => ({
            tagName: child.tagName,
            className: child.className,
            id: child.id
          })),
          isVisible: htmlElement.offsetParent !== null,
          innerText: element.textContent?.substring(0, 100) + '...'
        };
      });
    });

    console.log('   React Flow Elements:');
    reactFlowInfo.forEach((info, index) => {
      console.log(`   Element ${index}:`, JSON.stringify(info, null, 4));
    });

    // Step 2: Check parent containers
    console.log('📍 Step 2: Checking parent containers...');
    
    const containerInfo = await page.evaluate(() => {
      const containers = [
        '.react-flow',
        '[class*="Canvas"]',
        '[class*="DesignCanvas"]',
        '[data-testid*="canvas"]',
        'main',
        '[role="main"]'
      ];
      
      return containers.map(selector => {
        const elements = document.querySelectorAll(selector);
        return {
          selector,
          count: elements.length,
          elements: Array.from(elements).slice(0, 3).map(el => {
            const htmlEl = el as HTMLElement;
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            
            return {
              tagName: el.tagName,
              className: el.className,
              rect: { width: rect.width, height: rect.height, x: rect.x, y: rect.y },
              visible: htmlEl.offsetParent !== null,
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity
            };
          })
        };
      });
    });

    console.log('   Container Analysis:');
    containerInfo.forEach(info => {
      console.log(`   ${info.selector}:`, JSON.stringify(info, null, 2));
    });

    // Step 3: Check if React Flow is loaded and initialized
    console.log('📍 Step 3: Checking React Flow initialization...');
    
    const reactFlowStatus = await page.evaluate(() => {
      // Check for React Flow specific elements
      const reactFlowPane = document.querySelector('.react-flow__pane');
      const reactFlowViewport = document.querySelector('.react-flow__viewport');
      const reactFlowRenderer = document.querySelector('.react-flow__renderer');
      const reactFlowNodes = document.querySelector('.react-flow__nodes');
      const reactFlowEdges = document.querySelector('.react-flow__edges');
      
      return {
        pane: reactFlowPane ? {
          exists: true,
          visible: (reactFlowPane as HTMLElement).offsetParent !== null,
          rect: reactFlowPane.getBoundingClientRect(),
          style: window.getComputedStyle(reactFlowPane)
        } : { exists: false },
        viewport: reactFlowViewport ? {
          exists: true,
          visible: (reactFlowViewport as HTMLElement).offsetParent !== null,
          rect: reactFlowViewport.getBoundingClientRect()
        } : { exists: false },
        renderer: reactFlowRenderer ? {
          exists: true,
          visible: (reactFlowRenderer as HTMLElement).offsetParent !== null
        } : { exists: false },
        nodes: reactFlowNodes ? {
          exists: true,
          visible: (reactFlowNodes as HTMLElement).offsetParent !== null,
          children: reactFlowNodes.children.length
        } : { exists: false },
        edges: reactFlowEdges ? {
          exists: true,
          visible: (reactFlowEdges as HTMLElement).offsetParent !== null
        } : { exists: false }
      };
    });

    console.log('   React Flow Status:', JSON.stringify(reactFlowStatus, null, 2));

    // Step 4: Check CSS issues
    console.log('📍 Step 4: Checking for CSS issues...');
    
    const cssIssues = await page.evaluate(() => {
      const reactFlow = document.querySelector('.react-flow');
      if (!reactFlow) return { error: 'No React Flow element found' };
      
      const htmlElement = reactFlow as HTMLElement;
      const style = window.getComputedStyle(reactFlow);
      const parentStyle = reactFlow.parentElement ? window.getComputedStyle(reactFlow.parentElement) : null;
      
      return {
        element: {
          width: style.width,
          height: style.height,
          minWidth: style.minWidth,
          minHeight: style.minHeight,
          maxWidth: style.maxWidth,
          maxHeight: style.maxHeight,
          position: style.position,
          top: style.top,
          left: style.left,
          transform: style.transform,
          overflow: style.overflow,
          zIndex: style.zIndex
        },
        parent: parentStyle ? {
          width: parentStyle.width,
          height: parentStyle.height,
          overflow: parentStyle.overflow,
          position: parentStyle.position
        } : null,
        computed: {
          offsetWidth: htmlElement.offsetWidth,
          offsetHeight: htmlElement.offsetHeight,
          scrollWidth: htmlElement.scrollWidth,
          scrollHeight: htmlElement.scrollHeight,
          clientWidth: htmlElement.clientWidth,
          clientHeight: htmlElement.clientHeight
        }
      };
    });

    console.log('   CSS Analysis:', JSON.stringify(cssIssues, null, 2));

    // Step 5: Check if it's a layout/positioning issue
    console.log('📍 Step 5: Checking layout positioning...');
    
    // Try scrolling to see if the canvas is off-screen
    await page.evaluate(() => {
      const reactFlow = document.querySelector('.react-flow');
      if (reactFlow) {
        reactFlow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Check if it's visible after scrolling
    const visibleAfterScroll = await page.locator('.react-flow').isVisible();
    console.log(`   Visible after scroll: ${visibleAfterScroll ? 'YES' : 'NO'}`);

    // Step 6: Try to force visibility
    console.log('📍 Step 6: Attempting to force visibility...');
    
    const forceVisibilityResult = await page.evaluate(() => {
      const reactFlow = document.querySelector('.react-flow') as HTMLElement;
      if (!reactFlow) return { error: 'No React Flow element found' };
      
      // Store original styles
      const originalStyles = {
        width: reactFlow.style.width,
        height: reactFlow.style.height,
        display: reactFlow.style.display,
        visibility: reactFlow.style.visibility,
        opacity: reactFlow.style.opacity,
        position: reactFlow.style.position
      };
      
      // Force visibility
      reactFlow.style.display = 'block';
      reactFlow.style.visibility = 'visible';
      reactFlow.style.opacity = '1';
      reactFlow.style.width = '800px';
      reactFlow.style.height = '600px';
      reactFlow.style.position = 'relative';
      reactFlow.style.backgroundColor = 'lightblue'; // Make it obvious
      reactFlow.style.border = '2px solid red';
      
      const rect = reactFlow.getBoundingClientRect();
      
      return {
        success: true,
        originalStyles,
        newRect: rect,
        visible: reactFlow.offsetParent !== null
      };
    });

    console.log('   Force Visibility Result:', JSON.stringify(forceVisibilityResult, null, 2));

    // Take screenshot after forcing visibility
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/visibility-forced.png',
      fullPage: true 
    });

    // Check if now visible
    const finalVisibility = await page.locator('.react-flow').isVisible();
    console.log(`   Final visibility check: ${finalVisibility ? 'YES' : 'NO'}`);

    console.log('🏁 React Flow visibility investigation completed!');
  });

  test('should check if canvas container has proper dimensions', async ({ page }) => {
    console.log('🔍 Checking canvas container dimensions...');

    // Navigate to design canvas
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Skip welcome and select challenge
    const skipButton = page.locator('button:has-text("Skip All Tutorials")');
    if (await skipButton.isVisible({ timeout: 3000 })) {
      await skipButton.click();
      await page.waitForTimeout(2000);
    }

    const challengeButton = page.locator('button:has-text("Start Challenge")').first();
    if (await challengeButton.isVisible({ timeout: 5000 })) {
      await challengeButton.click();
      await page.waitForTimeout(3000);
    }

    // Check dimensions of all potential canvas containers
    const dimensionCheck = await page.evaluate(() => {
      const selectors = [
        '.react-flow',
        '[data-testid="canvas"]',
        '[data-testid="design-canvas"]',
        'main',
        '[role="main"]',
        '.flex-1',
        '[class*="Canvas"]'
      ];
      
      return selectors.map(selector => {
        const element = document.querySelector(selector) as HTMLElement;
        if (!element) return { selector, exists: false };
        
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        
        return {
          selector,
          exists: true,
          dimensions: {
            width: rect.width,
            height: rect.height,
            x: rect.x,
            y: rect.y
          },
          styles: {
            width: style.width,
            height: style.height,
            minWidth: style.minWidth,
            minHeight: style.minHeight,
            flexGrow: style.flexGrow,
            flexShrink: style.flexShrink
          },
          offset: {
            width: element.offsetWidth,
            height: element.offsetHeight
          },
          visible: element.offsetParent !== null
        };
      });
    });

    console.log('   Dimension Analysis:');
    dimensionCheck.forEach(info => {
      console.log(`   ${info.selector}:`, JSON.stringify(info, null, 2));
    });

    // Check viewport size
    const viewportSize = await page.viewportSize();
    console.log(`   Viewport size: ${JSON.stringify(viewportSize)}`);

    // Take screenshot
    await page.screenshot({ 
      path: 'e2e/test-results/artifacts/dimension-check.png',
      fullPage: true 
    });
  });
});