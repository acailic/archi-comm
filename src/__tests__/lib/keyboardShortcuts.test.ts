import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { KeyboardShortcutManager } from '@/lib/shortcuts/KeyboardShortcuts';

describe('KeyboardShortcutManager default shortcuts', () => {
  let manager: KeyboardShortcutManager;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="design-canvas" tabIndex="-1"></div>
      <input id="outside" />
    `;
    manager = new KeyboardShortcutManager();
  });

  afterEach(() => {
    manager.destroy();
    document.body.innerHTML = '';
  });

  it('requires canvas focus for bare-letter shortcuts', () => {
    const handler = vi.fn();
    window.addEventListener('shortcut:tool-select', handler);

    const outside = document.getElementById('outside') as HTMLInputElement;
    outside.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    const canvas = document.getElementById('design-canvas') as HTMLElement;
    canvas.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener('shortcut:tool-select', handler);
  });

  it('supports meta variants alongside ctrl combinations', () => {
    const handler = vi.fn();
    window.addEventListener('shortcut:duplicate', handler);

    const canvas = document.getElementById('design-canvas') as HTMLElement;
    canvas.focus();

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'd', ctrlKey: true, bubbles: true }),
    );

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'd', metaKey: true, bubbles: true }),
    );

    expect(handler).toHaveBeenCalledTimes(2);

    window.removeEventListener('shortcut:duplicate', handler);
  });
});
