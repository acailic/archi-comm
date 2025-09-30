import { useCallback, useContext, useEffect, useMemo, useRef } from "react";

import { AccessibilityContext } from "@ui";

export function useAccessibilityContext() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibilityContext must be used within an AccessibilityProvider"
    );
  }
  return context;
}

export function useAnnouncer() {
  const { announce } = useAccessibilityContext();
  return announce;
}

/**
 * Direct announcer hook that creates its own live region
 * Useful when AccessibilityProvider is not available or for standalone components
 */
export function useDirectAnnouncer() {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);

  // Create and setup the live region on mount
  useEffect(() => {
    if (!liveRegionRef.current) {
      const liveRegion = document.createElement("div");
      liveRegion.setAttribute("role", "status");
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      liveRegion.style.position = "absolute";
      liveRegion.style.left = "-10000px";
      liveRegion.style.width = "1px";
      liveRegion.style.height = "1px";
      liveRegion.style.overflow = "hidden";

      document.body.appendChild(liveRegion);
      liveRegionRef.current = liveRegion;
    }

    // Cleanup on unmount
    return () => {
      if (
        liveRegionRef.current &&
        document.body.contains(liveRegionRef.current)
      ) {
        document.body.removeChild(liveRegionRef.current);
        liveRegionRef.current = null;
      }
    };
  }, []);

  /**
   * Announce a message to screen readers
   * @param message - The message to announce
   * @param priority - The urgency level ('polite' for regular announcements, 'assertive' for urgent)
   */
  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (!liveRegionRef.current || !message.trim()) {
        return;
      }

      // Update the aria-live attribute based on priority
      liveRegionRef.current.setAttribute("aria-live", priority);

      // Clear the message first, then set it after a small delay
      // This ensures screen readers pick up the change even if the same message is announced twice
      liveRegionRef.current.textContent = "";

      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = message;
        }
      }, 10);

      // Reset to polite after assertive announcements
      if (priority === "assertive") {
        setTimeout(() => {
          if (liveRegionRef.current) {
            liveRegionRef.current.setAttribute("aria-live", "polite");
          }
        }, 1000);
      }
    },
    []
  );

  return { announce };
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
