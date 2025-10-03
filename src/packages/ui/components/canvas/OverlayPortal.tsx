/**
 * File: src/packages/ui/components/canvas/OverlayPortal.tsx
 * Purpose: Portal container for canvas overlays to manage z-index hierarchy
 * Why: Prevents z-index conflicts by rendering overlays at document root
 * Related: QuickConnectOverlay.tsx, CanvasContextualHelp.tsx, ConnectionTemplatePanel.tsx
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface OverlayPortalProps {
  children: ReactNode;
  id?: string;
}

/**
 * Portal component that renders children at document root level
 * Ensures proper z-index stacking and event handling
 */
export function OverlayPortal({ children, id = 'overlay-root' }: OverlayPortalProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Find or create portal container
    let portalContainer = document.getElementById(id);

    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = id;
      portalContainer.style.position = 'fixed';
      portalContainer.style.top = '0';
      portalContainer.style.left = '0';
      portalContainer.style.width = '100%';
      portalContainer.style.height = '100%';
      portalContainer.style.pointerEvents = 'none';
      portalContainer.style.zIndex = 'var(--z-modal)';
      document.body.appendChild(portalContainer);
    }

    setContainer(portalContainer);

    return () => {
      // Only remove if empty
      if (portalContainer && portalContainer.childNodes.length === 0) {
        portalContainer.remove();
      }
    };
  }, [id]);

  if (!container) return null;

  return createPortal(children, container);
}
