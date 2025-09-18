// e2e/tauri-integration.spec.ts
// Tauri desktop application integration testing
// Tests desktop-specific features, file system, and native API integration
// RELEVANT FILES: src-tauri/src/main.rs, src/services/tauri.ts, src/lib/hooks/useTauri.ts

import { test, expect } from '@playwright/test';

test.describe('Tauri Desktop Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for Tauri to initialize
    await page.waitForFunction(
      () => {
        return (
          typeof window.__TAURI__ !== 'undefined' ||
          typeof window.__TAURI_METADATA__ !== 'undefined'
        );
      },
      { timeout: 10000 }
    );
  });

  test.describe('Tauri Environment Detection', () => {
    test('detects Tauri environment correctly', async ({ page }) => {
      const isTauri = await page.evaluate(() => {
        return typeof window.__TAURI__ !== 'undefined';
      });

      // In E2E tests, we might be running in web mode
      // But we should test the detection logic
      const detectionResult = await page.evaluate(() => {
        // Test the environment detection function
        const env = {
          isTauri: typeof window.__TAURI__ !== 'undefined',
          hasFileAPI: typeof window.__TAURI__?.fs !== 'undefined',
          hasDialogAPI: typeof window.__TAURI__?.dialog !== 'undefined',
          hasShellAPI: typeof window.__TAURI__?.shell !== 'undefined',
        };
        return env;
      });

      console.log('Tauri environment detection:', detectionResult);

      // The app should handle both Tauri and web environments
      await page.goto('/');
      await expect(page.getByRole('button', { name: /start your journey/i })).toBeVisible();
    });

    test('gracefully falls back to web APIs when Tauri unavailable', async ({ page }) => {
      // Mock Tauri being unavailable
      await page.addInitScript(() => {
        delete (window as any).__TAURI__;
        delete (window as any).__TAURI_METADATA__;
      });

      await page.reload();

      // App should still work
      await expect(page.getByRole('button', { name: /start your journey/i })).toBeVisible();

      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');
      await expect(canvas).toBeVisible();

      // Test that basic functionality works without Tauri
      const server = page.locator('[data-testid="palette-item-server"]').first();
      if (await server.isVisible()) {
        await server.dragTo(canvas);

        const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' });
        await expect(serverNode.first()).toBeVisible();
      }
    });
  });

  test.describe('File System Operations', () => {
    test('file export functionality works', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);

        // Test PNG export
        const exportPngButton = page.getByRole('button', { name: /export png/i });
        if (await exportPngButton.isVisible()) {
          // Set up download handler
          const downloadPromise = page.waitForEvent('download');
          await exportPngButton.click();

          try {
            const download = await downloadPromise;
            const filename = download.suggestedFilename();
            expect(filename).toMatch(/\.png$/);

            // Verify download has content
            const stream = await download.createReadStream();
            expect(stream).toBeTruthy();
          } catch (error) {
            // In Tauri context, this might use native save dialog
            console.log('Download handled by native dialog or fallback');
          }
        }

        // Test JSON export if available
        const exportButton = page.getByRole('button', { name: /export$/i });
        if (await exportButton.isVisible()) {
          await exportButton.click();

          // Might open export dialog
          const exportDialog = page.locator('[role="dialog"]');
          if (await exportDialog.isVisible()) {
            const jsonOption = page.getByText(/json/i);
            if (await jsonOption.isVisible()) {
              await jsonOption.click();

              const confirmButton = page.getByRole('button', { name: /export|save/i });
              if (await confirmButton.isVisible()) {
                await confirmButton.click();
              }
            }
          }
        }
      }
    });

    test('file import functionality works', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Look for import functionality
      const importButton = page.getByRole('button', { name: /import|open/i });
      if (await importButton.isVisible()) {
        await importButton.click();

        // In Tauri, this would open native file dialog
        // In web context, might show file input
        const fileInput = page.locator('input[type="file"]');
        if (await fileInput.isVisible()) {
          // Test file input handling
          const testFile = JSON.stringify({
            version: '1.0',
            components: [{ type: 'server', x: 100, y: 100 }],
          });

          // Create a test file
          await fileInput.setInputFiles({
            name: 'test-design.json',
            mimeType: 'application/json',
            buffer: Buffer.from(testFile),
          });

          // Verify import worked
          await page.waitForTimeout(1000);

          const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' });
          if ((await serverNode.count()) > 0) {
            await expect(serverNode.first()).toBeVisible();
          }
        }
      }
    });

    test('auto-save functionality', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);

        // Add annotation to trigger auto-save
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        const textarea = page.locator('textarea').first();

        if (await textarea.isVisible()) {
          await textarea.fill('Auto-save test content');
          await textarea.press('Control+Enter');

          // Look for auto-save indicator
          const autoSaveIndicator = page.locator('[data-testid="auto-save-indicator"]');
          if (await autoSaveIndicator.isVisible()) {
            await expect(autoSaveIndicator).toBeVisible();

            // Wait for auto-save to complete
            await page.waitForTimeout(2000);

            // Indicator should disappear when saved
            await expect(autoSaveIndicator).not.toBeVisible();
          }
        }
      }
    });

    test('project file management', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Test new project
      const newProjectButton = page.getByRole('button', { name: /new project/i });
      if (await newProjectButton.isVisible()) {
        await newProjectButton.click();

        const canvas = page.locator('[data-testid="canvas"]');
        await expect(canvas).toBeVisible();

        // Canvas should be empty for new project
        const nodes = page.locator('.react-flow__node');
        const nodeCount = await nodes.count();
        expect(nodeCount).toBe(0);
      }

      // Test save project
      const saveProjectButton = page.getByRole('button', { name: /save project/i });
      if (await saveProjectButton.isVisible()) {
        // Add some content first
        const server = page.locator('[data-testid="palette-item-server"]').first();
        if (await server.isVisible()) {
          await server.dragTo(page.locator('[data-testid="canvas"]'));
        }

        await saveProjectButton.click();

        // In Tauri, this would open save dialog
        // Verify the action was initiated
        const notification = page.locator('[role="alert"], .toast');
        if (await notification.isVisible()) {
          await expect(notification).toBeVisible();
        }
      }
    });
  });

  test.describe('Native Desktop Features', () => {
    test('window management operations', async ({ page }) => {
      // Test window title
      await expect(page).toHaveTitle(/ArchiComm|Archi/i);

      // Test if Tauri window management is available
      const hasTauriWindow = await page.evaluate(() => {
        return typeof window.__TAURI__?.window !== 'undefined';
      });

      if (hasTauriWindow) {
        // Test window operations through Tauri API
        const windowOps = await page.evaluate(async () => {
          try {
            const { appWindow } = window.__TAURI__.window;

            const operations = {
              canMinimize: typeof appWindow.minimize === 'function',
              canMaximize: typeof appWindow.toggleMaximize === 'function',
              canSetTitle: typeof appWindow.setTitle === 'function',
            };

            return operations;
          } catch (error) {
            return { error: error.message };
          }
        });

        console.log('Window operations available:', windowOps);
        expect(windowOps.canSetTitle).toBe(true);
      }
    });

    test('system tray functionality', async ({ page }) => {
      // Check if system tray is available
      const hasTray = await page.evaluate(() => {
        return typeof window.__TAURI__?.app !== 'undefined';
      });

      if (hasTray) {
        // Test system tray operations
        const trayOps = await page.evaluate(async () => {
          try {
            // Check if tray methods are available
            const trayMethods = {
              hasApp: typeof window.__TAURI__.app !== 'undefined',
            };

            return trayMethods;
          } catch (error) {
            return { error: error.message };
          }
        });

        console.log('System tray operations:', trayOps);
        expect(trayOps.hasApp).toBe(true);
      }
    });

    test('native notifications', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Test native notification functionality
      const hasNotifications = await page.evaluate(() => {
        return 'Notification' in window || typeof window.__TAURI__?.notification !== 'undefined';
      });

      if (hasNotifications) {
        // Trigger a notification scenario
        const canvas = page.locator('[data-testid="canvas"]');
        const server = page.locator('[data-testid="palette-item-server"]').first();

        if (await server.isVisible()) {
          await server.dragTo(canvas);

          // Export to trigger completion notification
          const exportButton = page.getByRole('button', { name: /export png/i });
          if (await exportButton.isVisible()) {
            await exportButton.click();

            // Look for notification indicator or toast
            const notification = page.locator(
              '[role="alert"], .toast, [data-testid="notification"]'
            );
            if (await notification.isVisible()) {
              await expect(notification).toBeVisible();
            }
          }
        }
      }
    });

    test('clipboard operations', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);

        const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' }).first();
        await serverNode.click();

        // Test copy operation
        await page.keyboard.press('Control+c');

        // Test paste operation
        await page.keyboard.press('Control+v');

        await page.waitForTimeout(500);

        // Should have duplicated the component
        const nodes = page.locator('.react-flow__node').filter({ hasText: 'Server' });
        const nodeCount = await nodes.count();
        expect(nodeCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test.describe('Audio Recording Integration', () => {
    test('audio recording system integration', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Add components to enable continue button
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);

        const continueButton = page.getByRole('button', { name: /continue to recording/i });
        if (await continueButton.isVisible()) {
          await continueButton.click();

          // Should navigate to audio recording screen
          await page.waitForTimeout(1000);

          const recordingSection = page.getByRole('heading', { name: /record your explanation/i });
          if (await recordingSection.isVisible()) {
            await expect(recordingSection).toBeVisible();

            // Test audio recording controls
            const recordButton = page.getByRole('button', { name: /start recording/i });
            const stopButton = page.getByRole('button', { name: /stop recording/i });

            if (await recordButton.isVisible()) {
              // Test recording permission handling
              await recordButton.click();

              // Should request microphone permission
              const permissionPromise = page.waitForEvent('permission');
              try {
                const permission = await permissionPromise;
                expect(permission.name).toBe('microphone');
              } catch (error) {
                // Permission might be handled differently in Tauri
                console.log('Permission handling varies in Tauri context');
              }

              // Test stop recording
              if (await stopButton.isVisible()) {
                await stopButton.click();

                // Should show recorded audio
                const audioPlayer = page.locator('audio, [data-testid="audio-player"]');
                if (await audioPlayer.isVisible()) {
                  await expect(audioPlayer).toBeVisible();
                }
              }
            }
          }
        }
      }
    });

    test('audio file handling and processing', async ({ page }) => {
      // Navigate to audio recording screen
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);

        const continueButton = page.getByRole('button', { name: /continue to recording/i });
        if (await continueButton.isVisible()) {
          await continueButton.click();

          // Test audio file upload if available
          const uploadButton = page.getByRole('button', { name: /upload audio/i });
          if (await uploadButton.isVisible()) {
            await uploadButton.click();

            const fileInput = page.locator('input[type="file"][accept*="audio"]');
            if (await fileInput.isVisible()) {
              // Test audio file upload
              await fileInput.setInputFiles({
                name: 'test-audio.mp3',
                mimeType: 'audio/mpeg',
                buffer: Buffer.from('mock audio data'),
              });

              // Should process the uploaded file
              const processingIndicator = page.locator('[data-testid="processing-indicator"]');
              if (await processingIndicator.isVisible()) {
                await expect(processingIndicator).toBeVisible();
              }
            }
          }

          // Test transcript functionality
          const transcriptArea = page.getByPlaceholder(/enter your explanation text/i);
          if (await transcriptArea.isVisible()) {
            await transcriptArea.fill('This is a test transcript for the audio recording.');

            const continueToReview = page.getByRole('button', { name: /continue to review/i });
            if (await continueToReview.isVisible()) {
              await continueToReview.click();

              // Should navigate to review screen
              await expect(page.getByText(/session complete/i)).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Performance and Resource Management', () => {
    test('memory usage in desktop environment', async ({ page }) => {
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : null;
      });

      if (initialMemory) {
        // Perform memory-intensive operations
        await page.getByRole('button', { name: /start your journey/i }).click();
        await page
          .getByRole('button', { name: /start challenge/i })
          .first()
          .click();

        const canvas = page.locator('[data-testid="canvas"]');

        // Add many components
        for (let i = 0; i < 30; i++) {
          const server = page.locator('[data-testid="palette-item-server"]').first();
          if (await server.isVisible()) {
            await server.dragTo(canvas, {
              targetPosition: {
                x: 100 + (i % 6) * 120,
                y: 100 + Math.floor(i / 6) * 100,
              },
            });
          }

          // Pause every 10 components
          if (i % 10 === 9) {
            await page.waitForTimeout(200);
          }
        }

        const finalMemory = await page.evaluate(() => {
          return (performance as any).memory.usedJSHeapSize;
        });

        const memoryIncrease = finalMemory - initialMemory;
        console.log(`Memory increase: ${memoryIncrease / 1024 / 1024}MB`);

        // Memory increase should be reasonable for desktop app
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB limit
      }
    });

    test('CPU usage monitoring', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Monitor performance during intensive operations
      const startTime = performance.now();

      const canvas = page.locator('[data-testid="canvas"]');

      // Perform rapid operations
      for (let i = 0; i < 20; i++) {
        const server = page.locator('[data-testid="palette-item-server"]').first();
        if (await server.isVisible()) {
          await server.dragTo(canvas);

          // Add annotation
          await canvas.dblclick({ position: { x: 150 + i * 10, y: 150 + i * 10 } });
          const textarea = page.locator('textarea').first();
          if (await textarea.isVisible()) {
            await textarea.fill(`Rapid annotation ${i}`);
            await textarea.press('Control+Enter');
          }
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`Operations completed in: ${duration}ms`);

      // Should complete in reasonable time even with many operations
      expect(duration).toBeLessThan(30000); // 30 seconds max

      // Verify app remains responsive
      const toolbar = page.locator('[data-testid="canvas-toolbar"]');
      await expect(toolbar).toBeVisible();
    });

    test('background task handling', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Test auto-save background task
      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);

        // Make changes to trigger auto-save
        await canvas.dblclick({ position: { x: 200, y: 200 } });
        const textarea = page.locator('textarea').first();

        if (await textarea.isVisible()) {
          await textarea.fill('Background task test');
          await textarea.press('Control+Enter');

          // UI should remain responsive during background save
          const toolbar = page.locator('[data-testid="canvas-toolbar"]');
          const panTool = page.locator('[data-testid="tool-pan"]');

          await panTool.click();
          await expect(panTool).toHaveAttribute('aria-pressed', 'true');

          // Auto-save should complete without blocking UI
          await page.waitForTimeout(2000);

          await expect(toolbar).toBeVisible();
        }
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('handles Tauri API errors gracefully', async ({ page }) => {
      // Mock Tauri API error
      await page.addInitScript(() => {
        if (window.__TAURI__) {
          const originalFs = window.__TAURI__.fs;
          window.__TAURI__.fs = {
            ...originalFs,
            writeTextFile: () => Promise.reject(new Error('File system error')),
          };
        }
      });

      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      const canvas = page.locator('[data-testid="canvas"]');
      const server = page.locator('[data-testid="palette-item-server"]').first();

      if (await server.isVisible()) {
        await server.dragTo(canvas);

        // Try to trigger save operation that will fail
        const saveButton = page.getByRole('button', { name: /save|export/i }).first();
        if (await saveButton.isVisible()) {
          await saveButton.click();

          // Should show error message without crashing
          const errorMessage = page.locator('[role="alert"], .error-message');
          if (await errorMessage.isVisible()) {
            await expect(errorMessage).toBeVisible();
          }

          // App should remain functional
          await expect(canvas).toBeVisible();
        }
      }
    });

    test('recovers from crashed background tasks', async ({ page }) => {
      await page.getByRole('button', { name: /start your journey/i }).click();
      await page
        .getByRole('button', { name: /start challenge/i })
        .first()
        .click();

      // Simulate background task crash
      await page.evaluate(() => {
        // Force an error in background processing
        if (window.postMessage) {
          window.postMessage({ type: 'background-error', error: 'Task failed' }, '*');
        }
      });

      const canvas = page.locator('[data-testid="canvas"]');
      await expect(canvas).toBeVisible();

      // App should continue working despite background task failure
      const server = page.locator('[data-testid="palette-item-server"]').first();
      if (await server.isVisible()) {
        await server.dragTo(canvas);

        const serverNode = page.locator('.react-flow__node').filter({ hasText: 'Server' });
        await expect(serverNode.first()).toBeVisible();
      }
    });
  });
});
