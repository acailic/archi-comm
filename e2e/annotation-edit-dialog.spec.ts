import { test, expect } from '@playwright/test';

test.describe('Enhanced Annotation Edit Dialog', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the design canvas
    await page.goto('/');
    await page.getByRole('button', { name: /start your journey/i }).click();
    await page.getByRole('button', { name: /start challenge/i }).first().click();
    
    // Add a component to ensure we have canvas content
    const canvas = page.locator('[data-testid="canvas"]');
    const server = page.locator('[data-testid="palette-item-server"]').first();
    await server.dragTo(canvas);
  });

  test('rich text editor loads and displays correctly', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create an annotation by double-clicking
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Wait for the rich text editor to appear
    const richTextEditor = page.locator('.rich-text-editor, [data-testid="rich-text-editor"]').first();
    await expect(richTextEditor).toBeVisible({ timeout: 10000 });
    
    // Verify toolbar buttons are present
    const boldButton = page.locator('button[title*="Bold"], button[aria-label*="bold"]').first();
    const italicButton = page.locator('button[title*="Italic"], button[aria-label*="italic"]').first();
    const bulletListButton = page.locator('button[title*="Bullet"], button[title*="List"]').first();
    
    await expect(boldButton).toBeVisible();
    await expect(italicButton).toBeVisible();
    await expect(bulletListButton).toBeVisible();
  });

  test('rich text formatting buttons work as expected', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation and open dialog
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Wait for editor and type some text
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.fill('This is test text');
    
    // Select all text
    await editor.press('Control+a');
    
    // Click bold button
    const boldButton = page.locator('button[title*="Bold"], button[aria-label*="bold"]').first();
    await boldButton.click();
    
    // Verify bold formatting is applied
    const boldText = editor.locator('strong, b').first();
    await expect(boldText).toBeVisible();
    
    // Test italic button
    const italicButton = page.locator('button[title*="Italic"], button[aria-label*="italic"]').first();
    await italicButton.click();
    
    // Verify italic formatting is applied
    const italicText = editor.locator('em, i').first();
    await expect(italicText).toBeVisible();
  });

  test('keyboard shortcuts work for formatting', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    
    // Type text and apply bold with Ctrl+B
    await editor.fill('Bold text');
    await editor.press('Control+a');
    await editor.press('Control+b');
    
    // Verify bold formatting
    const boldText = editor.locator('strong, b').first();
    await expect(boldText).toBeVisible();
    
    // Test italic with Ctrl+I
    await editor.press('Control+i');
    const italicText = editor.locator('em, i').first();
    await expect(italicText).toBeVisible();
  });

  test('auto-save functionality triggers after content changes', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    
    // Type content to trigger auto-save
    await editor.fill('Auto-save test content');
    
    // Look for auto-save indicator
    const savingIndicator = page.locator('[data-testid="auto-save-indicator"], .saving-indicator');
    const clockIcon = page.locator('svg[data-lucide="clock"], .lucide-clock');
    
    // Wait for auto-save to trigger (should appear within a few seconds)
    await expect(savingIndicator.or(clockIcon)).toBeVisible({ timeout: 5000 });
  });

  test('undo/redo buttons become enabled/disabled appropriately', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    
    // Initially undo should be disabled
    const undoButton = page.locator('button[title*="Undo"], button[aria-label*="undo"]').first();
    const redoButton = page.locator('button[title*="Redo"], button[aria-label*="redo"]').first();
    
    await expect(undoButton).toBeDisabled();
    await expect(redoButton).toBeDisabled();
    
    // Make a change
    await editor.fill('First change');
    
    // Undo should now be enabled
    await expect(undoButton).toBeEnabled();
    
    // Click undo
    await undoButton.click();
    
    // Redo should now be enabled
    await expect(redoButton).toBeEnabled();
  });

  test('keyboard shortcuts work for undo/redo', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    
    // Type content
    await editor.fill('Original content');
    await editor.fill('Modified content');
    
    // Test Ctrl+Z for undo
    await page.keyboard.press('Control+z');
    
    // Should revert to original content
    await expect(editor).toHaveText('Original content');
    
    // Test Ctrl+Y for redo
    await page.keyboard.press('Control+y');
    
    // Should restore modified content
    await expect(editor).toHaveText('Modified content');
  });

  test('enhanced color picker opens and closes correctly', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Look for color picker trigger button
    const colorPickerTrigger = page.locator('[data-testid="color-picker-trigger"], button[aria-label*="color"]').first();
    await expect(colorPickerTrigger).toBeVisible({ timeout: 10000 });
    
    // Click to open color picker
    await colorPickerTrigger.click();
    
    // Verify color picker popover opens
    const colorPickerPopover = page.locator('[role="dialog"], .color-picker-popover').first();
    await expect(colorPickerPopover).toBeVisible();
    
    // Verify preset colors are visible
    const presetColors = page.locator('.preset-colors, [data-testid="preset-colors"]').first();
    await expect(presetColors).toBeVisible();
    
    // Click outside to close
    await canvas.click({ position: { x: 100, y: 100 } });
    await expect(colorPickerPopover).not.toBeVisible();
  });

  test('preset color selection works', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Open color picker
    const colorPickerTrigger = page.locator('[data-testid="color-picker-trigger"], button[aria-label*="color"]').first();
    await colorPickerTrigger.click();
    
    // Select a preset color (red)
    const redColor = page.locator('button[style*="#ef4444"], button[title*="red"]').first();
    await redColor.click();
    
    // Verify the color picker popover closes
    const colorPickerPopover = page.locator('[role="dialog"], .color-picker-popover').first();
    await expect(colorPickerPopover).not.toBeVisible();
    
    // Verify color is applied in preview
    const preview = page.locator('[data-testid="annotation-preview"], .preview').first();
    const previewStyle = await preview.getAttribute('style');
    expect(previewStyle).toContain('#ef4444');
  });

  test('custom color selection using color picker interface', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Open color picker
    const colorPickerTrigger = page.locator('[data-testid="color-picker-trigger"], button[aria-label*="color"]').first();
    await colorPickerTrigger.click();
    
    // Look for the main color picker area
    const colorPicker = page.locator('.react-colorful, [data-testid="color-picker"]').first();
    await expect(colorPicker).toBeVisible();
    
    // Click somewhere on the color picker to select a custom color
    await colorPicker.click({ position: { x: 50, y: 50 } });
    
    // Verify hex input field shows the selected color
    const hexInput = page.locator('input[placeholder*="#"], input[type="text"][maxlength="7"]').first();
    const hexValue = await hexInput.inputValue();
    expect(hexValue).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('style presets are displayed and selectable', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Look for style presets section
    const presetsSection = page.locator('[data-testid="style-presets"], .style-presets').first();
    await expect(presetsSection).toBeVisible({ timeout: 10000 });
    
    // Verify preset buttons are present
    const successPreset = page.getByText('Success').first();
    const warningPreset = page.getByText('Warning').first();
    const errorPreset = page.getByText('Error').first();
    
    await expect(successPreset).toBeVisible();
    await expect(warningPreset).toBeVisible();
    await expect(errorPreset).toBeVisible();
  });

  test('selecting a preset applies all associated style properties', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Select error preset (should be red theme)
    const errorPreset = page.getByText('Error').first();
    await errorPreset.click();
    
    // Verify preview shows error styling
    const preview = page.locator('[data-testid="annotation-preview"], .preview').first();
    const previewStyle = await preview.getAttribute('style');
    
    // Should contain red color scheme
    expect(previewStyle).toContain('#fecaca'); // Error background color
    expect(previewStyle).toContain('bold'); // Error font weight
  });

  test('advanced styling options are collapsible', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Look for advanced options trigger
    const advancedTrigger = page.locator('button:has-text("Advanced"), [data-testid="advanced-options-trigger"]').first();
    await expect(advancedTrigger).toBeVisible({ timeout: 10000 });
    
    // Initially advanced options should be hidden
    const advancedContent = page.locator('[data-testid="advanced-options"], .advanced-options').first();
    await expect(advancedContent).not.toBeVisible();
    
    // Click to expand
    await advancedTrigger.click();
    await expect(advancedContent).toBeVisible();
    
    // Click to collapse
    await advancedTrigger.click();
    await expect(advancedContent).not.toBeVisible();
  });

  test('opacity slider works correctly', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Open advanced options
    const advancedTrigger = page.locator('button:has-text("Advanced"), [data-testid="advanced-options-trigger"]').first();
    await advancedTrigger.click();
    
    // Find opacity slider
    const opacitySlider = page.locator('input[type="range"], [role="slider"]').first();
    await expect(opacitySlider).toBeVisible();
    
    // Change opacity
    await opacitySlider.fill('50');
    
    // Verify preview reflects opacity change
    const preview = page.locator('[data-testid="annotation-preview"], .preview').first();
    const previewStyle = await preview.getAttribute('style');
    expect(previewStyle).toContain('opacity: 0.5');
  });

  test('complete workflow from opening dialog to saving changes', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Fill in content
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.fill('Complete workflow test');
    
    // Apply formatting
    await editor.press('Control+a');
    await editor.press('Control+b'); // Bold
    
    // Change color
    const colorPickerTrigger = page.locator('[data-testid="color-picker-trigger"], button[aria-label*="color"]').first();
    await colorPickerTrigger.click();
    const blueColor = page.locator('button[style*="#3b82f6"], button[title*="blue"]').first();
    await blueColor.click();
    
    // Save changes
    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await saveButton.click();
    
    // Verify annotation exists on canvas with applied formatting
    const annotation = page.getByText('Complete workflow test');
    await expect(annotation).toBeVisible();
  });

  test('error handling and edge cases work correctly', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    // Test empty content handling
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.fill('');
    
    // Should still show preview with sample text
    const preview = page.locator('[data-testid="annotation-preview"], .preview').first();
    await expect(preview).toContainText('Sample');
    
    // Test invalid color input
    const colorPickerTrigger = page.locator('[data-testid="color-picker-trigger"], button[aria-label*="color"]').first();
    await colorPickerTrigger.click();
    
    const hexInput = page.locator('input[placeholder*="#"], input[type="text"][maxlength="7"]').first();
    await hexInput.fill('invalid');
    await hexInput.blur();
    
    // Should reset to valid color
    const hexValue = await hexInput.inputValue();
    expect(hexValue).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  test('backward compatibility with existing annotations', async ({ page }) => {
    const canvas = page.locator('[data-testid="canvas"]');
    
    // Create annotation with plain text (simulating existing annotation)
    await canvas.dblclick({ position: { x: 200, y: 200 } });
    
    const editor = page.locator('.ProseMirror, [contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.fill('Plain text annotation');
    
    // Save and reopen
    const saveButton = page.getByRole('button', { name: /save/i }).first();
    await saveButton.click();
    
    // Click on annotation to reopen
    const annotation = page.getByText('Plain text annotation');
    await annotation.click();
    
    // Should work without issues
    await expect(editor).toBeVisible({ timeout: 10000 });
    await expect(editor).toContainText('Plain text annotation');
  });

});