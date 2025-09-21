import { useContext, useMemo } from 'react';

import { AccessibilityContext } from '@ui/components/accessibility/AccessibilityProvider';

export function useAccessibilityContext() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibilityContext must be used within an AccessibilityProvider');
  }
  return context;
}

export function useAnnouncer() {
  const { announce } = useAccessibilityContext();
  return announce;
}

export function useFocusManagement() {
  const { focusElement, registerFocusTrap } = useAccessibilityContext();
  return useMemo(
    () => ({
      focusElement,
      registerFocusTrap,
    }),
    [focusElement, registerFocusTrap]
  );
}

export function useKeyboardNavigation() {
  const { registerShortcut } = useAccessibilityContext();
  return useMemo(
    () => ({
      registerShortcut,
    }),
    [registerShortcut]
  );
}
