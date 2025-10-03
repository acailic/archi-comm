import React, { useCallback, useEffect, useState } from "react";
import { shallow } from "zustand/shallow";

import {
  ReactFlowCanvas,
  type ReactFlowCanvasWrapperProps,
} from "@canvas/components/ReactFlowCanvas";
import QuickAddOverlayBase from "../../canvas/QuickAddOverlay";

interface CanvasContentProps {
  canvasProps: ReactFlowCanvasWrapperProps;
}

interface QuickAddShortcutDetail {
  query?: string;
  position?: { x: number; y: number };
  forceOpen?: boolean;
  forceClose?: boolean;
}

interface QuickAddOverlayAddOptions {
  position?: { x: number; y: number };
  keepOpen?: boolean;
}

interface QuickAddOverlayProps {
  active: boolean;
  initialQuery?: string;
  anchorPosition?: { x: number; y: number };
  onAddComponent: (
    componentType: string,
    options?: QuickAddOverlayAddOptions,
  ) => void;
  onRequestClose: () => void;
}

interface CanvasAddComponentDetail {
  componentType: string;
  position?: { x: number; y: number };
  source?: string;
}

const QuickAddOverlay =
  QuickAddOverlayBase as unknown as React.ComponentType<QuickAddOverlayProps>;

export const CanvasContent = React.memo(
  ({ canvasProps }: CanvasContentProps) => {
    const [quickAddActive, setQuickAddActive] = useState(false);
    const [quickAddContext, setQuickAddContext] =
      useState<QuickAddShortcutDetail | null>(null);

    const handleCloseQuickAdd = useCallback(() => {
      setQuickAddActive(false);
      setQuickAddContext(null);
    }, []);

    const handleAddComponent = useCallback(
      (componentType: string, options?: QuickAddOverlayAddOptions) => {
        if (typeof window !== "undefined") {
          const eventDetail: CanvasAddComponentDetail = {
            componentType,
            position: options?.position,
            source: "quick-add-overlay",
          };
          window.dispatchEvent(
            new CustomEvent<CanvasAddComponentDetail>("canvas:add-component", {
              detail: eventDetail,
            }),
          );
        }

        if (!options?.keepOpen) {
          handleCloseQuickAdd();
        }
      },
      [handleCloseQuickAdd],
    );

    useEffect(() => {
      if (typeof window === "undefined") {
        return undefined;
      }

      const handleShortcut: EventListener = (event) => {
        const detail = (
          event as CustomEvent<QuickAddShortcutDetail | undefined>
        ).detail;

        setQuickAddActive((prev) => {
          let next: boolean;

          if (detail?.forceOpen) {
            next = true;
          } else if (detail?.forceClose) {
            next = false;
          } else {
            next = !prev;
          }

          setQuickAddContext(next ? (detail ?? null) : null);

          return next;
        });
      };

      window.addEventListener("shortcut:quick-add-component", handleShortcut);
      return () => {
        window.removeEventListener(
          "shortcut:quick-add-component",
          handleShortcut,
        );
      };
    }, []);

    useEffect(() => {
      if (typeof window === "undefined") {
        return undefined;
      }

      const handleOverlayClose: EventListener = () => {
        handleCloseQuickAdd();
      };

      window.addEventListener("quick-add-overlay:close", handleOverlayClose);
      return () => {
        window.removeEventListener(
          "quick-add-overlay:close",
          handleOverlayClose,
        );
      };
    }, [handleCloseQuickAdd]);

    useEffect(() => {
      if (typeof window === "undefined") {
        return undefined;
      }

      const handleCanvasAddComponent: EventListener = (event) => {
        const detail = (
          event as CustomEvent<CanvasAddComponentDetail | undefined>
        ).detail;
        if (detail?.source === "quick-add-overlay") {
          handleCloseQuickAdd();
        }
      };

      window.addEventListener("canvas:add-component", handleCanvasAddComponent);
      return () => {
        window.removeEventListener(
          "canvas:add-component",
          handleCanvasAddComponent,
        );
      };
    }, [handleCloseQuickAdd]);

    return (
      <>
        <ReactFlowCanvas {...canvasProps} />
        {quickAddActive ? (
          <QuickAddOverlay
            active={quickAddActive}
            initialQuery={quickAddContext?.query}
            anchorPosition={quickAddContext?.position}
            onAddComponent={handleAddComponent}
            onRequestClose={handleCloseQuickAdd}
          />
        ) : null}
      </>
    );
  },
  (prev, next) => shallow(prev.canvasProps, next.canvasProps),
);

CanvasContent.displayName = "CanvasContent";
